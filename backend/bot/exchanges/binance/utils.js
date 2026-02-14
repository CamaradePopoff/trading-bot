require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)

const exchangeBaseURL = 'https://api.binance.com'

function createSignature(apiSecret, params) {
  const query = new URLSearchParams(params).toString()
  return crypto.createHmac('sha256', apiSecret).update(query).digest('hex')
}

async function makeRequest(
  user,
  endpoint,
  method,
  params = {},
  useProxy = false
) {
  try {
    const exchange = await userService.getExchangeByName(
      user._id,
      process.env.BOT_EXCHANGE
    )
    const exchangeApiKeys = {
      apiKey: userService.decodeData(exchange.apiKey).decodedData,
      apiSecret: userService.decodeData(exchange.apiSecret).decodedData
    }

    const timestamp = Date.now()
    params.timestamp = timestamp

    const signature = createSignature(exchangeApiKeys.apiSecret, params)
    params.signature = signature

    const headers = {
      'X-MBX-APIKEY': exchangeApiKeys.apiKey,
      'Content-Type': 'application/json',
      cache: 'no-store',
      pragma: 'no-cache',
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.binance.com'
    }

    const url = `${exchangeBaseURL}${endpoint}?${new URLSearchParams(params)}`

    const response = await fetch(url, { method, headers })
    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.msg || data?.message || response.statusText
      logger.error(`HTTP Error ${response.status}: ${errorMsg}`)
      // throw new Error(`HTTP Error ${response.status}: ${errorMsg}`)
    }

    return data
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    logger.error(`Error making request: ${errorMsg}`)
  }
}

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

async function getCurrentPrice(user, symbol) {
  const endpoint = '/api/v3/ticker/price'
  const response = await fetch(`${exchangeBaseURL}${endpoint}?symbol=${symbol}`)
  const data = await response.json()
  return data && data.price ? parseFloat(data.price) : null
}

async function placeOrder(
  user,
  symbol,
  side,
  type,
  price,
  quantity,
  quoteOrderQty = null
) {
  const endpoint = '/api/v3/order'
  const params = {
    symbol,
    side: side.toUpperCase(),
    type: type.toUpperCase(),
    ...(quoteOrderQty !== null &&
    type.toUpperCase() === 'MARKET' &&
    side.toUpperCase() === 'SELL'
      ? { quoteOrderQty: quoteOrderQty.toString() }
      : { quantity: quantity.toString() }),
    ...(type === 'LIMIT' && {
      price: price.toString(),
      timeInForce: 'GTC'
    })
  }
  let response
  try {
    response = await makeRequest(user, endpoint, 'POST', params)
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      errorMessage: error.message,
      errorCode: error.details?.code,
      apiError: error.details?.apiError
    }
    const msg = `Error placing ${side} order for ${symbol}: ${JSON.stringify(
      errorInfo
    )}`
    logger.error(msg)
    const err = new Error(msg)
    throw err
  }
  if (!response || !response.fills) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      errorMessage: 'Invalid response from exchange',
      response
    }
    const msg = `Invalid order response for ${symbol}: ${JSON.stringify(errorInfo)}`
    logger.error(msg)
    const err = new Error(msg)
    throw err
  }
  // console.log(`Order response for ${side} ${symbol}:`, response)

  // Calculate commission in quote asset (USDC/USDT)
  // For BUY orders: commission is in base asset (crypto), convert to quote
  // For SELL orders: commission is already in quote asset
  const totalCommission = response.fills.reduce((total, fill) => {
    const commission = parseFloat(fill.commission)
    const fillPrice = parseFloat(fill.price)

    // If commission asset is the quote currency (USDx), use it directly
    // Otherwise (commission in base asset for BUY), convert to quote
    if (/^USD/.test(fill.commissionAsset)) {
      return total + commission
    } else {
      // Commission is in crypto, convert to quote currency
      return total + commission * fillPrice
    }
  }, 0)

  // Validate response has required fields
  if (!response.cummulativeQuoteQty || !response.executedQty) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      errorMessage: 'Missing required fields in order response',
      response
    }
    const msg = `Invalid order response for ${symbol}: ${JSON.stringify(errorInfo)}`
    logger.error(msg)
    const err = new Error(msg)
    throw err
  }

  return {
    dealFunds: response.cummulativeQuoteQty,
    dealSize: response.executedQty,
    fee: totalCommission
  }
}

async function getTradingPairFee(user, symbol) {
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )
  const exchangeApiKeys = {
    apiKey: userService.decodeData(exchange.apiKey).decodedData,
    apiSecret: userService.decodeData(exchange.apiSecret).decodedData
  }

  const endpoint = '/sapi/v1/asset/tradeFee'
  const timestamp = Date.now()
  const query = `timestamp=${timestamp}&symbol=${symbol}`

  const signature = crypto
    .createHmac('sha256', exchangeApiKeys.apiSecret)
    .update(query)
    .digest('hex')

  const url = `${exchangeBaseURL}${endpoint}?${query}&signature=${signature}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': exchangeApiKeys.apiKey
    }
  })

  const data = await response.json()
  return {
    takerFeeRate: parseFloat(data[0].takerCommission),
    kcsDeductFee: false // Binance doesn't have KCS-like fee deduction
  }
}

async function getUserVipLevel(user) {
  // Get user account details to determine VIP level
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )
  const exchangeApiKeys = {
    apiKey: userService.decodeData(exchange.apiKey).decodedData,
    apiSecret: userService.decodeData(exchange.apiSecret).decodedData
  }

  const endpoint = '/api/v3/account'
  const timestamp = Date.now()
  const query = `timestamp=${timestamp}`

  const signature = crypto
    .createHmac('sha256', exchangeApiKeys.apiSecret)
    .update(query)
    .digest('hex')

  const url = `${exchangeBaseURL}${endpoint}?${query}&signature=${signature}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': exchangeApiKeys.apiKey
      }
    })

    const data = await response.json()

    // Binance VIP fee schedule (as decimals):
    // VIP 0: 0.1% (0.001)
    // VIP 1: 0.09% (0.0009)
    // VIP 2: 0.08% (0.0008)
    // VIP 3: 0.07% (0.0007)
    // VIP 4: 0.06% (0.0006)
    // VIP 5: 0.05% (0.0005)
    // VIP 6: 0.04% (0.0004)
    // VIP 7: 0.03% (0.0003)
    // VIP 8+: 0.02% (0.0002)
    const vipLevel = data.vipLevel || 0
    const vipFeeMap = {
      0: 0.001,
      1: 0.0009,
      2: 0.0008,
      3: 0.0007,
      4: 0.0006,
      5: 0.0005,
      6: 0.0004,
      7: 0.0003
    }

    const fee = vipFeeMap[vipLevel] || 0.0002
    // logger.info(`Binance VIP level ${vipLevel} detected, using fee: ${fee}`)
    return fee
  } catch (error) {
    logger.error('Error fetching Binance VIP level:', error.message)
    // Default to VIP 0 fee if unable to fetch
    return 0.001
  }
}

async function getAccountBalances(user) {
  const endpoint = '/api/v3/account'
  const response = await makeRequest(user, endpoint, 'GET')
  return response.balances.map((b) => ({
    currency: b.asset,
    available: parseFloat(b.free)
  }))
}

async function getCryptoBalance(user, asset) {
  const balances = await getAccountBalances(user)
  const assetBalance = balances.find(
    (b) => b.currency.toUpperCase() === asset.toUpperCase()
  )
  return assetBalance ? parseFloat(assetBalance.available) : 0
}

async function getMinimumSize(user, symbol) {
  try {
    const info = await fetch(
      `${exchangeBaseURL}/api/v3/exchangeInfo?symbol=${symbol}`
    )
    const data = await info.json()

    if (!data.symbols || data.symbols.length === 0) {
      logger.error(`No symbol info found for ${symbol}`)
      return null
    }

    const symbolInfo = data.symbols[0]
    const lotSizeFilter = symbolInfo.filters.find(
      (f) => f.filterType === 'LOT_SIZE'
    )
    const notionalFilter = symbolInfo.filters.find(
      (f) => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL'
    )

    const result = {
      minQty: lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null,
      stepSize: lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null,
      minNotional: notionalFilter
        ? parseFloat(notionalFilter.minNotional || notionalFilter.notional)
        : 10 // Default 10 USDC
    }

    logger.info(
      `Symbol ${symbol} limits: minQty=${result.minQty}, stepSize=${result.stepSize}, minNotional=${result.minNotional}`
    )
    return result.minQty
  } catch (error) {
    logger.error(`Error fetching minimum size for ${symbol}:`, error.message)
    return null
  }
}

async function getSymbolFilters(user, symbol) {
  try {
    const info = await fetch(
      `${exchangeBaseURL}/api/v3/exchangeInfo?symbol=${symbol}`
    )
    const data = await info.json()

    if (!data.symbols || data.symbols.length === 0) {
      throw new Error(`No symbol info found for ${symbol}`)
    }

    const symbolInfo = data.symbols[0]
    const lotSizeFilter = symbolInfo.filters.find(
      (f) => f.filterType === 'LOT_SIZE'
    )
    const notionalFilter = symbolInfo.filters.find(
      (f) => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL'
    )

    return {
      minQty: lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null,
      maxQty: lotSizeFilter ? parseFloat(lotSizeFilter.maxQty) : null,
      stepSize: lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null,
      minNotional: notionalFilter
        ? parseFloat(notionalFilter.minNotional || notionalFilter.notional)
        : 10
    }
  } catch (error) {
    logger.error(`Error fetching symbol filters for ${symbol}:`, error.message)
    throw error
  }
}

async function getTradingPairs(user) {
  const endpoint = '/api/v3/exchangeInfo'
  const response = await fetch(`${exchangeBaseURL}${endpoint}`)
  const data = await response.json()
  if (!data.symbols) return []

  return data.symbols
    .filter((pair) => pair.status === 'TRADING' && pair.quoteAsset === 'USDC')
    .map((pair) => {
      const lotSize = pair.filters.find((f) => f.filterType === 'LOT_SIZE')
      return {
        symbol: pair.symbol,
        baseAsset: pair.baseAsset,
        quoteAsset: pair.quoteAsset,
        baseMinSize: parseFloat(lotSize.minQty),
        baseIncrement: parseFloat(lotSize.stepSize)
      }
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
}

async function buyCrypto(user, symbol, amount = null) {
  const filters = await getSymbolFilters(user, symbol)
  const currentPrice = await getCurrentPrice(user, symbol)

  let quantity = amount || filters.minQty

  // Check if order meets minimum notional requirement
  const notionalValue = quantity * currentPrice
  if (notionalValue < filters.minNotional) {
    // Adjust quantity to meet minimum notional, rounded up to stepSize
    const minQtyForNotional = filters.minNotional / currentPrice
    const steps = Math.ceil(minQtyForNotional / filters.stepSize)
    quantity = steps * filters.stepSize
    logger.info(
      `Adjusted quantity from ${amount || filters.minQty} to ${quantity} to meet min notional ${filters.minNotional} USDC (price: ${currentPrice})`
    )
  }

  const order = await placeOrder(user, symbol, 'BUY', 'MARKET', null, quantity)
  logger.info(`✅ Bought ${quantity} ${symbol} for ${user.username}`)
  return order
}

async function sellCrypto(user, symbol, amount = null) {
  const filters = await getSymbolFilters(user, symbol)
  const currentPrice = await getCurrentPrice(user, symbol)

  const quantity = amount || filters.minQty

  // Check if order meets minimum notional requirement
  const notionalValue = quantity * currentPrice
  if (notionalValue < filters.minNotional) {
    throw new Error(
      `Order value ${notionalValue.toFixed(2)} USDC is below minimum ${filters.minNotional} USDC. Increase quantity to at least ${(filters.minNotional / currentPrice).toFixed(8)} ${symbol.replace('USDC', '')}`
    )
  }

  const order = await placeOrder(user, symbol, 'SELL', 'MARKET', null, quantity)
  logger.info(`✅ Sold ${quantity} ${symbol} for ${user.username}`)
  return order
}

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

async function getTickers(user) {
  const endpoint = '/api/v3/ticker/24hr'
  const response = await fetch(`${exchangeBaseURL}${endpoint}`)
  const data = await response.json()
  if (!Array.isArray(data)) return []

  // Filter for USDC pairs and map to KuCoin-compatible format
  const tickers = data
    .filter((ticker) => ticker.symbol.endsWith('USDC'))
    .map((ticker) => ({
      symbol: ticker.symbol,
      symbolName: ticker.symbol,
      buy: parseFloat(ticker.bidPrice || 0),
      sell: parseFloat(ticker.askPrice || 0),
      changeRate: parseFloat(ticker.priceChangePercent || 0) / 100,
      changePrice: parseFloat(ticker.priceChange || 0),
      high: parseFloat(ticker.highPrice || 0),
      low: parseFloat(ticker.lowPrice || 0),
      vol: parseFloat(ticker.volume || 0),
      volValue: parseFloat(ticker.quoteVolume || 0),
      last: parseFloat(ticker.lastPrice || 0),
      averagePrice: parseFloat(ticker.weightedAvgPrice || 0),
      takerFeeRate: 0.001, // Binance default taker fee
      takerCoefficient: 1,
      makerFeeRate: 0.001, // Binance default maker fee
      makerCoefficient: 1
    }))
    .sort((a, b) => b.volValue - a.volValue)

  return tickers
}

async function getNews(user, lang = 'en') {
  // Binance doesn't require authentication for announcements
  const newsBaseURL = 'https://www.binance.com'
  try {
    const endpoint = `/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=50`
    const url = `${newsBaseURL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      logger.error(`Binance news API error: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.data || !data.data.catalogs) return []

    const articles = data.data.catalogs[0]?.articles || []

    // Map to KuCoin-compatible format
    return articles
      .map((article) => ({
        annTitle: article.title,
        annType: 'latest-announcements',
        cTime: article.releaseDate,
        annUrl: `https://www.binance.com/en/support/announcement/${article.code}`
      }))
      .sort((a, b) => new Date(b.cTime) - new Date(a.cTime))
  } catch (error) {
    logger.error('Error fetching Binance news:', error.message)
    return []
  }
}

module.exports = {
  jsRound,
  getTickers,
  getCurrentPrice,
  placeOrder,
  getTradingPairs,
  getTradingPairFee,
  getUserVipLevel,
  getMinimumSize,
  getSymbolFilters,
  getAccountBalances,
  getCryptoBalance,
  buyCrypto,
  sellCrypto,
  botLog,
  getNews
}
