// MEXC API equivalent implementation of KuCoin wrapper

require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.mexc.com'

// ---------------- Private functions ----------------

function createSignature(secret, queryString) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// Helper function to make API requests
async function makeRequest(
  user,
  endpoint,
  method = 'GET',
  params = {},
  requiresAuth = true
) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }

    let fullUrl = `${exchangeBaseURL}${endpoint}`

    if (requiresAuth) {
      const exchange = await userService.getExchangeByName(
        user._id,
        process.env.BOT_EXCHANGE
      )
      const apiKey = userService.decodeData(exchange.apiKey).decodedData
      const apiSecret = userService.decodeData(exchange.apiSecret).decodedData

      const timestamp = Date.now()
      const queryParams = { ...params, timestamp }
      const queryString = new URLSearchParams(queryParams).toString()
      const signature = createSignature(apiSecret, queryString)

      headers['X-MEXC-APIKEY'] = apiKey
      fullUrl = `${fullUrl}?${queryString}&signature=${signature}`
    } else {
      // For public endpoints, just add params without signature
      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString()
        fullUrl = `${fullUrl}?${queryString}`
      }
    }

    // console.log(`MEXC API request: ${method} ${fullUrl}`)
    const response = await fetch(fullUrl, { method, headers })

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          errorMsg += `: ${errorData.msg || errorData.message || response.statusText}`
        } else {
          const errorText = await response.text()
          errorMsg += `: ${errorText.substring(0, 100)}`
        }
      } catch (e) {
        errorMsg += `: ${response.statusText}`
      }
      const error = new Error(errorMsg)
      error.statusCode = response.status
      throw error
    }

    const data = await response.json()
    return data
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    logger.error(`Error making MEXC request: ${errorMsg}`)
    throw error
  }
}

// ---------------- Public functions ----------------

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

async function getAccountBalances(user) {
  const endpoint = '/api/v3/account'
  try {
    const res = await makeRequest(user, endpoint, 'GET', {}, true)
    // console.log('MEXC account response:', JSON.stringify(res).substring(0, 500))

    if (!res) {
      logger.error('MEXC account endpoint returned null/undefined')
      return []
    }

    // MEXC returns balances as an array directly or in a balances field
    const balances = Array.isArray(res)
      ? res
      : res.balances || res.data?.balances || []

    if (!Array.isArray(balances)) {
      logger.error('MEXC balances is not an array:', typeof balances)
      return []
    }

    return balances
      .filter((b) => {
        // Filter for spot wallet and non-zero balances
        const isSpot =
          b.accountType === 'SPOT' || b.type === 'SPOT' || !b.accountType
        const hasBalance =
          (parseFloat(b.free) || 0) > 0 || (parseFloat(b.locked) || 0) > 0
        return isSpot && hasBalance && b.asset
      })
      .map((b) => ({
        currency: b.asset,
        available: parseFloat(b.free) || 0
      }))
  } catch (error) {
    logger.error('Error fetching balances:', error.message)
    return []
  }
}

async function getCryptoBalance(user, symbol) {
  const balances = await getAccountBalances(user)
  const bal = balances.find(
    (b) => b.currency.toLowerCase() === symbol.toLowerCase()
  )
  return bal ? parseFloat(bal.available) : 0
}

async function getCurrentPrice(user, symbol) {
  const endpoint = '/api/v3/ticker/price'
  const params = { symbol }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    return response && response.price ? parseFloat(response.price) : null
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    logger.error(`Error fetching price for ${symbol}: ${errorMsg}`)
    return null
  }
}

// Get historical candles/klines for a symbol
// interval: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 1w (standardized format)
async function getCandles(
  user,
  symbol,
  interval = '3m',
  startTime = null,
  endTime = null
) {
  // MEXC uses the same format as Binance, no conversion needed
  // MEXC API: GET /api/v3/klines (similar to Binance)
  const params = { symbol, interval, limit: 100 }
  if (startTime) params.startTime = startTime * 1000 // MEXC uses milliseconds
  if (endTime) params.endTime = endTime * 1000

  const endpoint = '/api/v3/klines'

  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)

    if (response && Array.isArray(response)) {
      // Convert to standard OHLC format
      return response.map((candle) => ({
        time: Math.floor(candle[0] / 1000), // Convert to seconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }))
    }
    return []
  } catch (error) {
    logger.error(`Error fetching candles for ${symbol}: ${error.message}`)
    return []
  }
}

async function getMinimumSize(user, symbol) {
  const endpoint = '/api/v3/exchangeInfo'
  const params = { symbol }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    if (!response || !response.symbols || response.symbols.length === 0)
      return null

    const symbolInfo = response.symbols[0]
    const lotSizeFilter = symbolInfo.filters.find(
      (f) => f.filterType === 'LOT_SIZE'
    )
    return lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    logger.error(`Error fetching min size for ${symbol}: ${errorMsg}`)
    return null
  }
}

// Get available trading pairs
async function getTradingPairs(user) {
  const endpoint = '/api/v3/exchangeInfo'
  try {
    const response = await makeRequest(user, endpoint, 'GET', {}, false)
    if (!response || !response.symbols) return []

    const pairs = response.symbols
      .filter((pair) => pair.status === '1' && pair.quoteAsset === 'USDT')
      .map((pair) => {
        // MEXC uses different precision fields than other exchanges
        const baseIncrement = pair.baseSizePrecision
          ? 1 / Math.pow(10, parseInt(pair.baseSizePrecision))
          : 0.00001
        // For min size, we use a default or extract from filters if available
        const baseMinSize = 0.00001 // MEXC doesn't seem to provide explicit minQty

        return {
          symbol: pair.symbol, // e.g. BTCUSDT
          baseAsset: pair.baseAsset, // e.g. BTC
          quoteAsset: pair.quoteAsset, // e.g. USDT
          baseMinSize,
          baseIncrement
        }
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol))

    return pairs
  } catch (error) {
    logger.error('Error fetching trading pairs:', error.message)
    return []
  }
}

async function getUserVipLevel(user) {
  // Get user VIP level from MEXC account info
  // MEXC API doesn't expose VIP level directly, so we'll fetch it via account endpoint
  // and derive from trading statistics if available
  const endpoint = '/api/v3/account'
  try {
    const response = await makeRequest(user, endpoint, 'GET', {}, true)

    // MEXC returns VIP info in account details
    // Default VIP level 0 (standard user) has 0.2% maker/taker fee
    // VIP 1-8 have progressively lower fees
    const vipLevel = response.vipLevel || 0

    // MEXC VIP fee schedule (as decimals):
    // VIP 0: 0.2% (0.002)
    // VIP 1: 0.18% (0.0018)
    // VIP 2: 0.16% (0.0016)
    // VIP 3: 0.14% (0.0014)
    // VIP 4: 0.12% (0.0012)
    // VIP 5: 0.1% (0.001)
    // VIP 6: 0.08% (0.0008)
    // VIP 7: 0.06% (0.0006)
    // VIP 8: 0.04% (0.0004)
    const vipFeeMap = {
      0: 0.002,
      1: 0.0018,
      2: 0.0016,
      3: 0.0014,
      4: 0.0012,
      5: 0.001,
      6: 0.0008,
      7: 0.0006,
      8: 0.0004
    }

    const fee = vipFeeMap[vipLevel] || 0.002
    logger.info(`MEXC VIP level ${vipLevel} detected, using fee: ${fee}`)
    return fee
  } catch (error) {
    logger.error('Error fetching VIP level:', error.message)
    // Default to VIP 0 fee if unable to fetch
    return 0.002
  }
}

async function getTradingPairFee(user, symbol) {
  // Get the current VIP fee rate
  const feeRate = await getUserVipLevel(user)
  return {
    takerFeeRate: feeRate,
    kcsDeductFee: false // MEXC doesn't have KCS-like fee deduction
  }
}

async function getTickers(user) {
  const endpoint = '/api/v3/ticker/24hr'
  try {
    const response = await makeRequest(user, endpoint, 'GET', {}, false)
    if (!Array.isArray(response)) return []

    return response
      .filter((ticker) => ticker.symbol.endsWith('USDT'))
      .map((ticker) => ({
        symbol: ticker.symbol,
        symbolName: ticker.symbol,
        buy: parseFloat(ticker.bidPrice || ticker.lastPrice || 0),
        sell: parseFloat(ticker.askPrice || ticker.lastPrice || 0),
        last: parseFloat(ticker.lastPrice || 0),
        changeRate: parseFloat(ticker.priceChangePercent || 0) / 100,
        changePrice: parseFloat(ticker.priceChange || 0),
        high: parseFloat(ticker.highPrice || 0),
        low: parseFloat(ticker.lowPrice || 0),
        vol: parseFloat(ticker.volume || 0),
        volValue: parseFloat(ticker.quoteVolume || 0),
        averagePrice: parseFloat(ticker.weightedAvgPrice || 0),
        takerFeeRate: 0.002, // MEXC default taker fee
        takerCoefficient: 1,
        makerFeeRate: 0.002, // MEXC default maker fee
        makerCoefficient: 1
      }))
  } catch (error) {
    logger.error('Error fetching tickers:', error.message)
    return []
  }
}

async function placeOrder(
  user,
  symbol,
  side,
  type,
  price = null,
  quantity = null,
  quoteAmount = null
) {
  const endpoint = '/api/v3/order'
  const params = {
    symbol,
    side: side.toUpperCase(),
    type: type.toUpperCase()
  }

  if (type.toLowerCase() === 'market') {
    if (quoteAmount !== null && side.toUpperCase() === 'SELL') {
      // For sell market orders, use quoteAmount if provided
      params.quoteOrderQty = quoteAmount
    } else if (quantity) {
      params.quantity = quantity
    }
  } else if (type.toLowerCase() === 'limit') {
    params.price = price
    params.quantity = quantity
    params.timeInForce = 'GTC'
  }

  try {
    const response = await makeRequest(user, endpoint, 'POST', params, true)

    // Get order details to return in KuCoin-compatible format
    const orderId = response.orderId
    const orderDetails = await getOrderDetails(user, symbol, orderId)

    // Validate order details
    if (!orderDetails.cummulativeQuoteQty || !orderDetails.executedQty) {
      const errorInfo = {
        symbol,
        side,
        type,
        quantity,
        quoteAmount,
        errorMessage: 'Missing required fields in order details',
        orderDetails
      }
      const msg = `Invalid order details for ${symbol}: ${JSON.stringify(errorInfo)}`
      logger.error(msg)
      throw new Error(msg)
    }

    return {
      orderId: orderDetails.orderId,
      dealFunds: orderDetails.cummulativeQuoteQty,
      dealSize: orderDetails.executedQty,
      fee: '0', // MEXC doesn't return fee directly, would need separate call
      price: orderDetails.price
    }
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteAmount,
      errorMessage: error.message,
      errorCode: error.details?.code,
      apiError: error.details?.apiError
    }
    const msg = `Invalid order response for ${symbol}: ${JSON.stringify(errorInfo)}`
    logger.error(msg)
    const err = new Error(msg)
    throw err
  }
}

async function getOrderDetails(user, symbol, orderId) {
  const endpoint = '/api/v3/order'
  const params = { symbol, orderId }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, true)
    return response
  } catch (error) {
    logger.error(`Error fetching order details for ${symbol}:`, error.message)
    throw error
  }
}

async function buyCrypto(user, symbol, amount = null) {
  const qty = amount || (await getMinimumSize(user, symbol))
  if (!qty) return null
  const order = await placeOrder(user, symbol, 'buy', 'market', qty)
  logger.info(`✅ Bought ${qty} ${symbol} for user ${user.username}`)
  return order
}

async function sellCrypto(user, symbol, amount = null) {
  const qty = amount || (await getMinimumSize(user, symbol))
  const order = await placeOrder(user, symbol, 'sell', 'market', qty)
  logger.info(`✅ Sold ${qty} ${symbol} for user ${user.username}`)
  return order
}

async function getNews(user, lang = 'en') {
  // MEXC doesn't have a public news API, return empty array
  // Users can access news directly from MEXC website
  logger.info('MEXC news endpoint not available, returning empty array')
  return []
}

module.exports = {
  jsRound,
  botLog,
  getAccountBalances,
  getTradingPairs,
  getCryptoBalance,
  getCurrentPrice,
  getCandles,
  getMinimumSize,
  placeOrder,
  buyCrypto,
  sellCrypto,
  getTradingPairFee,
  getUserVipLevel,
  getTickers,
  getNews
}
