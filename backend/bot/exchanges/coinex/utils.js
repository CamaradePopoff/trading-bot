require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.coinex.com'
const exchangeApiPrefix = '/v2'
const COINEX_SPOT_FEE_RATE = 0.002

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function createSignature(secretKey, preparedString) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(preparedString)
    .digest('hex')
}

function parseNumeric(value, fallback = 0) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getSymbolParts(symbol) {
  const knownQuotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']
  const upper = (symbol || '').toUpperCase()
  const quote = knownQuotes.find((q) => upper.endsWith(q)) || 'USDT'
  const base = upper.replace(new RegExp(`${quote}$`), '')
  return { base, quote }
}

async function getExchangeApiKeys(user) {
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )

  return {
    accessId: userService.decodeData(exchange.apiKey).decodedData,
    secretKey: userService.decodeData(exchange.apiSecret).decodedData
  }
}

async function makeRequest(
  user,
  endpoint,
  method = 'GET',
  params = {},
  requiresAuth = true
) {
  try {
    const normalizedMethod = method.toUpperCase()
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }

    let requestPath = `${exchangeApiPrefix}${endpoint}`
    let url = `${exchangeBaseURL}${requestPath}`
    let body = null

    if (normalizedMethod === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString()
      requestPath = `${exchangeApiPrefix}${endpoint}?${queryString}`
      url = `${exchangeBaseURL}${requestPath}`
    } else if (normalizedMethod !== 'GET' && Object.keys(params).length > 0) {
      body = JSON.stringify(params)
    }

    if (requiresAuth) {
      const { accessId, secretKey } = await getExchangeApiKeys(user)
      const timestamp = Date.now().toString()
      const preparedString = `${normalizedMethod}${requestPath}${body || ''}${timestamp}`
      const signature = createSignature(secretKey, preparedString)

      headers['X-COINEX-KEY'] = accessId
      headers['X-COINEX-SIGN'] = signature
      headers['X-COINEX-TIMESTAMP'] = timestamp
    } else {
      // URL/body already set above for public requests
    }

    const response = await fetch(url, {
      method: normalizedMethod,
      headers,
      body
    })
    console.log(
      `CoinEX ${normalizedMethod} ${endpoint} - Status: ${response.status}`
    )

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      const error = new Error(
        `CoinEX response parse error: HTTP ${response.status}`
      )
      error.statusCode = response.status
      throw error
    }

    if (!response.ok) {
      const message = data?.message || response.statusText
      const error = new Error(`HTTP ${response.status}: ${message}`)
      error.statusCode = response.status
      error.apiError = data
      throw error
    }

    if (data?.code && data.code !== 0) {
      const message =
        data.code === 11003
          ? `${data.message}. Verify you entered CoinEX Access ID (not label/name) in API Key field.`
          : data.message
      const error = new Error(`CoinEX API Error ${data.code}: ${message}`)
      error.apiError = data
      error.errorCode = data.code
      throw error
    }

    return data
  } catch (error) {
    logger.error(`Error making CoinEX request: ${error.message || error}`)
    throw error
  }
}

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

async function getCurrentPrice(user, symbol) {
  try {
    const response = await makeRequest(
      user,
      '/spot/ticker',
      'GET',
      { market: symbol },
      false
    )

    const ticker = response?.data?.[0]
    return ticker ? parseNumeric(ticker.last, null) : null
  } catch (error) {
    logger.error(
      `Error fetching current CoinEX price for ${symbol}: ${error.message}`
    )
    return null
  }
}

async function getTradingPairs(user) {
  try {
    const response = await makeRequest(user, '/spot/market', 'GET', {}, false)

    return (response?.data || [])
      .filter(
        (pair) =>
          pair.market.endsWith('USDT') &&
          pair.status === 'online' &&
          pair.is_api_trading_available !== false
      )
      .map((pair) => ({
        symbol: pair.market,
        baseCurrency: pair.base_ccy,
        quoteCurrency: pair.quote_ccy,
        baseMinSize: parseNumeric(pair.min_amount),
        baseIncrement:
          pair.base_ccy_precision !== undefined
            ? 10 ** -pair.base_ccy_precision
            : 0
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  } catch (error) {
    logger.error(`Error fetching CoinEX trading pairs: ${error.message}`)
    return []
  }
}

async function getTradingPairFee(user, symbol) {
  const feeRate = await getUserVipLevel(user)
  return {
    takerFeeRate: feeRate,
    kcsDeductFee: false
  }
}

async function getUserVipLevel(user) {
  return COINEX_SPOT_FEE_RATE
}

async function getAccountBalances(user) {
  try {
    const response = await makeRequest(
      user,
      '/assets/spot/balance',
      'GET',
      {},
      true
    )

    return (response?.data || [])
      .map((item) => ({
        currency: item.ccy?.toUpperCase(),
        available: parseNumeric(item.available)
      }))
      .filter((item) => item.available > 0)
  } catch (error) {
    logger.error(`Error fetching CoinEX account balances: ${error.message}`)
    return []
  }
}

async function getCryptoBalance(user, asset) {
  const balances = await getAccountBalances(user)
  const balance = balances.find(
    (b) => b.currency.toUpperCase() === asset.toUpperCase()
  )
  return balance ? parseNumeric(balance.available) : 0
}

async function getMinimumSize(user, symbol) {
  try {
    const response = await makeRequest(
      user,
      '/spot/market',
      'GET',
      { market: symbol },
      false
    )

    const marketInfo = response?.data?.[0]
    return marketInfo ? parseNumeric(marketInfo.min_amount, 0) : 0
  } catch (error) {
    logger.error(
      `Error fetching CoinEX minimum size for ${symbol}: ${error.message}`
    )
    return 0
  }
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
  const normalizedSide = side.toLowerCase()
  const normalizedType = type === 'limit' ? 'limit' : 'market'
  const { base, quote } = getSymbolParts(symbol)

  const params = {
    market: symbol,
    market_type: 'SPOT',
    type: normalizedType,
    side: normalizedSide
  }

  if (normalizedType === 'limit') {
    params.price = price?.toString()
    params.amount = quantity?.toString()
  } else {
    if (quoteOrderQty !== null && quoteOrderQty !== undefined) {
      params.ccy = quote
      params.amount = quoteOrderQty.toString()
    } else {
      params.ccy = base
      params.amount = quantity?.toString()
    }
  }

  Object.keys(params).forEach(
    (key) =>
      (params[key] === undefined || params[key] === null) && delete params[key]
  )

  try {
    const orderResponse = await makeRequest(
      user,
      '/spot/order',
      'POST',
      params,
      true
    )

    const orderId = orderResponse?.data?.order_id
    if (!orderId) {
      throw new Error('Invalid CoinEX order response: missing order id')
    }

    // Fetch order details to get fill information
    const detailsResponse = await makeRequest(
      user,
      '/spot/order-status',
      'GET',
      { market: symbol, order_id: orderId },
      true
    )

    const details = detailsResponse?.data
    if (!details) {
      throw new Error('Unable to fetch CoinEX order details')
    }

    const dealSize = parseNumeric(details.filled_amount || 0)
    const dealFunds = parseNumeric(details.filled_value || 0)
    const quoteFee = parseNumeric(details.quote_fee || 0)
    const baseFee = parseNumeric(details.base_fee || 0)
    const avgPrice = dealSize > 0 ? dealFunds / dealSize : 0
    const fee = quoteFee > 0 ? quoteFee : baseFee * avgPrice

    return {
      dealFunds: dealFunds.toString(),
      dealSize: dealSize.toString(),
      fee: fee.toString()
    }
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      errorMessage: error.message,
      errorCode: error.errorCode,
      apiError: error.apiError
    }
    const msg = `Error placing ${side} order for ${symbol}: ${JSON.stringify(errorInfo)}`
    logger.error(msg)
    throw new Error(msg, { cause: error })
  }
}

async function buyCrypto(user, symbol, amount = null) {
  const minQty = await getMinimumSize(user, symbol)
  const quantity = amount || minQty
  return placeOrder(user, symbol, 'buy', 'market', null, quantity)
}

async function sellCrypto(user, symbol, amount = null) {
  const minQty = await getMinimumSize(user, symbol)
  const quantity = amount || minQty
  return placeOrder(user, symbol, 'sell', 'market', null, quantity)
}

async function getTickers(user) {
  try {
    const response = await makeRequest(user, '/spot/ticker', 'GET', {}, false)

    return (response?.data || [])
      .filter((ticker) => ticker.market.endsWith('USDT'))
      .map((ticker) => ({
        symbol: ticker.market,
        symbolName: ticker.market,
        buy: parseNumeric(ticker.last),
        sell: parseNumeric(ticker.last),
        changeRate:
          parseNumeric(ticker.open) > 0
            ? (parseNumeric(ticker.last) - parseNumeric(ticker.open)) /
              parseNumeric(ticker.open)
            : 0,
        changePrice: parseNumeric(ticker.last) - parseNumeric(ticker.open),
        high: parseNumeric(ticker.high),
        low: parseNumeric(ticker.low),
        vol: parseNumeric(ticker.volume),
        volValue: parseNumeric(ticker.value),
        last: parseNumeric(ticker.last),
        averagePrice: parseNumeric(ticker.open),
        takerFeeRate: COINEX_SPOT_FEE_RATE,
        takerCoefficient: 1,
        makerFeeRate: COINEX_SPOT_FEE_RATE,
        makerCoefficient: 1
      }))
      .sort((a, b) => b.volValue - a.volValue)
  } catch (error) {
    logger.error(`Error fetching CoinEX tickers: ${error.message}`)
    return []
  }
}

async function getNews(user, lang = 'en') {
  logger.info('CoinEX news endpoint not available, returning empty array')
  return []
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
  getAccountBalances,
  getCryptoBalance,
  buyCrypto,
  sellCrypto,
  botLog,
  getNews
}
