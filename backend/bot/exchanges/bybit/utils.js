// ByBit API implementation

require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.bybit.com'

// ---------------- Private functions ----------------

function createSignature(
  apiKey,
  apiSecret,
  params,
  timestamp,
  recvWindow = '5000'
) {
  const paramString = timestamp + apiKey + recvWindow + params
  return crypto
    .createHmac('sha256', apiSecret)
    .update(paramString)
    .digest('hex')
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
    let body = null

    if (requiresAuth) {
      const exchange = await userService.getExchangeByName(
        user._id,
        process.env.BOT_EXCHANGE
      )
      const apiKey = userService.decodeData(exchange.apiKey).decodedData
      const apiSecret = userService.decodeData(exchange.apiSecret).decodedData

      const timestamp = Date.now().toString()
      const recvWindow = '5000'

      let paramString = ''
      if (method === 'POST') {
        paramString = JSON.stringify(params)
        body = paramString
      } else {
        paramString = new URLSearchParams(params).toString()
        if (paramString) {
          fullUrl = `${fullUrl}?${paramString}`
        }
      }

      const signature = createSignature(
        apiKey,
        apiSecret,
        paramString,
        timestamp,
        recvWindow
      )

      headers['X-BAPI-API-KEY'] = apiKey
      headers['X-BAPI-TIMESTAMP'] = timestamp
      headers['X-BAPI-SIGN'] = signature
      headers['X-BAPI-RECV-WINDOW'] = recvWindow
    } else {
      // For public endpoints, just add params without signature
      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString()
        fullUrl = `${fullUrl}?${queryString}`
      }
    }

    const response = await fetch(fullUrl, { method, headers, body })

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          errorMsg += `: ${errorData.retMsg || errorData.message || response.statusText}`
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

    // ByBit returns data in a specific format
    if (data.retCode !== 0) {
      throw new Error(`ByBit API Error ${data.retCode}: ${data.retMsg}`)
    }

    return data.result
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    logger.error(`Error making ByBit request: ${errorMsg}`)
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
  const endpoint = '/v5/account/wallet-balance'
  try {
    const res = await makeRequest(
      user,
      endpoint,
      'GET',
      { accountType: 'SPOT' },
      true
    )

    if (!res || !res.list || res.list.length === 0) {
      logger.error('ByBit account endpoint returned no data')
      return []
    }

    const account = res.list[0]
    const coins = account.coin || []

    return coins
      .filter((coin) => {
        const hasBalance = (parseFloat(coin.free) || 0) > 0
        return hasBalance
      })
      .map((coin) => ({
        currency: coin.coin,
        available: parseFloat(coin.free) || 0
      }))
  } catch (error) {
    logger.error('Error fetching ByBit balances:', error.message)
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
  const endpoint = '/v5/market/tickers'
  const params = { category: 'spot', symbol }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    if (response && response.list && response.list[0]) {
      return parseFloat(response.list[0].lastPrice)
    }
    return null
  } catch (error) {
    logger.error(`Error fetching current price for ${symbol}:`, error.message)
    return null
  }
}

async function getMinimumSize(user, symbol) {
  const endpoint = '/v5/market/instruments-info'
  const params = { category: 'spot', symbol }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    if (response && response.list && response.list[0]) {
      const instrument = response.list[0]
      const lotSizeFilter = instrument.lotSizeFilter
      return parseFloat(lotSizeFilter.minOrderQty) || 0
    }
    return 0
  } catch (error) {
    logger.error(`Error fetching minimum size for ${symbol}:`, error.message)
    return 0
  }
}

async function getTradingPairs(user) {
  const endpoint = '/v5/market/instruments-info'
  const params = { category: 'spot' }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    if (!response || !response.list) {
      return []
    }

    return response.list
      .filter((pair) => pair.status === 'Trading')
      .map((pair) => ({
        symbol: pair.symbol,
        baseCurrency: pair.baseCoin,
        quoteCurrency: pair.quoteCoin
      }))
  } catch (error) {
    logger.error('Error fetching trading pairs:', error.message)
    return []
  }
}

async function getUserVipLevel(user) {
  // ByBit has VIP levels but requires checking account info
  // For now, return a default structure
  try {
    const endpoint = '/v5/user/query-api'
    const response = await makeRequest(user, endpoint, 'GET', {}, true)

    // Return default fee structure
    // Standard spot trading fee is 0.1% for both maker and taker
    return {
      vipLevel: response?.vipLevel || 0,
      makerFeeRate: 0.001, // 0.1%
      takerFeeRate: 0.001 // 0.1%
    }
  } catch (error) {
    logger.error('Error fetching VIP level:', error.message)
    return {
      vipLevel: 0,
      makerFeeRate: 0.001,
      takerFeeRate: 0.001
    }
  }
}

async function getTradingPairFee(user, symbol) {
  const vipInfo = await getUserVipLevel(user)
  return vipInfo.takerFeeRate || 0.001
}

async function getTickers(user) {
  const endpoint = '/v5/market/tickers'
  const params = { category: 'spot' }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, false)
    if (!response || !response.list) {
      return []
    }

    return response.list
      .filter((ticker) => ticker.symbol.endsWith('USDT'))
      .map((ticker) => ({
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        priceChangePercent: parseFloat(ticker.price24hPcnt) * 100,
        volume: parseFloat(ticker.volume24h)
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
  price,
  quantity,
  quoteOrderQty = null
) {
  const endpoint = '/v5/order/create'
  const params = {
    category: 'spot',
    symbol,
    side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(), // Buy or Sell
    orderType: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(), // Market or Limit
    qty: quantity ? quantity.toString() : undefined,
    marketUnit:
      quoteOrderQty && type.toUpperCase() === 'MARKET'
        ? 'quoteCoin'
        : 'baseCoin'
  }

  // For market orders with quote quantity (e.g., buying with USDT)
  if (
    quoteOrderQty &&
    type.toUpperCase() === 'MARKET' &&
    side.toUpperCase() === 'BUY'
  ) {
    params.qty = quoteOrderQty.toString()
  }

  // For limit orders, add price and time in force
  if (type.toUpperCase() === 'LIMIT' && price) {
    params.price = price.toString()
    params.timeInForce = 'GTC'
  }

  try {
    const response = await makeRequest(user, endpoint, 'POST', params, true)

    if (!response || !response.orderId) {
      const errorInfo = {
        symbol,
        side,
        type,
        quantity,
        quoteOrderQty,
        errorMessage: 'Invalid response from exchange',
        response
      }
      const msg = `Invalid order response for ${symbol}: ${JSON.stringify(errorInfo)}`
      logger.error(msg)
      throw new Error(msg)
    }

    // Get order details to calculate fees
    const orderDetails = await getOrderDetails(user, symbol, response.orderId)

    if (!orderDetails) {
      logger.error('Failed to fetch order details')
      return response
    }

    // Calculate average price and total commission
    const executedQty = parseFloat(orderDetails.cumExecQty) || 0
    const executedValue = parseFloat(orderDetails.cumExecValue) || 0
    const avgPrice = executedQty > 0 ? executedValue / executedQty : 0
    const totalCommission = parseFloat(orderDetails.cumExecFee) || 0

    return {
      orderId: response.orderId,
      symbol,
      side,
      type,
      executedQty,
      avgPrice,
      totalCommission,
      commissionAsset: orderDetails.feeCurrency || 'USDT',
      status: orderDetails.orderStatus
    }
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      errorMessage: error.message
    }
    const msg = `Error placing ${side} order for ${symbol}: ${JSON.stringify(errorInfo)}`
    logger.error(msg)
    throw new Error(msg, { cause: error })
  }
}

async function getOrderDetails(user, symbol, orderId) {
  const endpoint = '/v5/order/realtime'
  const params = {
    category: 'spot',
    symbol,
    orderId
  }
  try {
    const response = await makeRequest(user, endpoint, 'GET', params, true)
    if (response && response.list && response.list[0]) {
      return response.list[0]
    }
    return null
  } catch (error) {
    logger.error(`Error fetching order details for ${orderId}:`, error.message)
    return null
  }
}

async function buyCrypto(user, symbol, amount = null) {
  const usdAmount = amount || (await getMinimumSize(user, symbol)) * 1.1
  const order = await placeOrder(
    user,
    symbol,
    'buy',
    'market',
    null,
    null,
    usdAmount
  )
  if (order) {
    logger.info(
      `💵 Bought ${order.executedQty} ${symbol.replace(/USD(T|C)$/, '')} at ${order.avgPrice} USDT (total: ${usdAmount} USDT - fee ${order.totalCommission} USDT).`
    )
  }
  return order
}

async function sellCrypto(user, symbol, amount = null) {
  const crypto = amount || (await getMinimumSize(user, symbol))
  const order = await placeOrder(user, symbol, 'sell', 'market', null, crypto)
  if (order) {
    const received = order.executedQty * order.avgPrice
    const fee = order.totalCommission
    logger.info(
      `💲 Sold ${order.executedQty} ${symbol.replace(/USD(T|C)$/, '')} at ${order.avgPrice} USDT (total: ${received.toFixed(2)} USDT - fee ${fee} USDT).`
    )
    return order
  }
  return null
}

async function getNews(user, lang = 'en') {
  // ByBit doesn't have a public news API, return empty array
  // Users can access news directly from ByBit website
  logger.info('ByBit news endpoint not available, returning empty array')
  return []
}

module.exports = {
  jsRound,
  botLog,
  getAccountBalances,
  getTradingPairs,
  getCryptoBalance,
  getCurrentPrice,
  getMinimumSize,
  placeOrder,
  buyCrypto,
  sellCrypto,
  getTradingPairFee,
  getUserVipLevel,
  getTickers,
  getNews,
  getOrderDetails
}
