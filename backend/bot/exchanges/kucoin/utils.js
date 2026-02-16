require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.kucoin.com'

// ---------------- Private functions ----------------

// Function to fetch KuCoin's server time and calculate the offset
async function syncServerTime() {
  try {
    const response = await fetch(`${exchangeBaseURL}/api/v1/timestamp`, {
      method: 'GET'
    })

    let data
    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        logger.error(
          `Failed to sync server time: Non-JSON response (HTTP ${response.status})`
        )
        return 0
      }
    } catch (parseError) {
      logger.error(`Failed to sync server time: Invalid JSON response`)
      return 0
    }

    if (response.ok && data) {
      const serverTimeOffset = data.data - Date.now()
      // logger.info(`Server time offset synced: ${serverTimeOffset} ms`)
      return serverTimeOffset
    } else {
      const errorMsg = data?.msg || data?.message || 'Unknown error'
      logger.error(
        `Failed to sync server time: HTTP ${response.status} - ${errorMsg}`
      )
      return 0
    }
  } catch (error) {
    logger.error(`Error syncing server time: ${error.message}`)
    return 0
  }
}

// Helper function to create a signature
function createSignature(apiSecret, endpoint, method, params, timestamp) {
  const strForSign =
    timestamp + method + endpoint + (params ? JSON.stringify(params) : '')
  return crypto
    .createHmac('sha256', apiSecret)
    .update(strForSign)
    .digest('base64')
}

// Helper function to make API requests
async function makeRequest(
  user,
  endpoint,
  method,
  params = null,
  useProxy = false
) {
  try {
    const serverTimeOffset = await syncServerTime()
    const timestamp = (Date.now() + serverTimeOffset).toString()
    const exchange = await userService.getExchangeByName(
      user._id,
      process.env.BOT_EXCHANGE
    )
    const exchangeApiKeys = {
      apiKey: userService.decodeData(exchange.apiKey).decodedData,
      apiSecret: userService.decodeData(exchange.apiSecret).decodedData,
      apiPassphrase: userService.decodeData(exchange.apiPassphrase).decodedData
    }
    const signature = createSignature(
      exchangeApiKeys.apiSecret,
      endpoint,
      method,
      params,
      timestamp
    )

    const headers = {
      'KC-API-KEY': exchangeApiKeys.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': crypto
        .createHmac('sha256', exchangeApiKeys.apiSecret)
        .update(exchangeApiKeys.apiPassphrase)
        .digest('base64'),
      // config.apiPassphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json',
      cache: 'no-store',
      pragma: 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // mimic a browser
      Referer: 'https://www.kucoin.com'
    }
    const url = `${exchangeBaseURL}${endpoint}`
    let response
    if (useProxy) {
      response = await fetch(`${process.env.PROXY_URI}/kucoin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Caller': 'KuBot'
        },
        body: JSON.stringify({ url, method, headers, params })
      })
    } else {
      response = await fetch(url, {
        method,
        headers,
        body: params ? JSON.stringify(params) : null
      })
    }
    if (!response.ok) {
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        fullError: `HTTP ${response.status}: ${response.statusText}`
      }

      // Try to parse as JSON, but handle HTML responses gracefully
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          errorDetails.code = errorData.code
          errorDetails.message = errorData.msg || errorData.message
          errorDetails.apiError = errorData
          errorDetails.fullError = `HTTP ${response.status}: ${errorData.msg || errorData.message || response.statusText}`
        } else {
          // For non-JSON responses (HTML error pages, etc.)
          const errorText = await response.text()
          errorDetails.message = errorText.substring(0, 200) // Truncate long HTML
          errorDetails.fullError = `HTTP ${response.status}: ${response.statusText} (Non-JSON response)`
        }
      } catch (parseError) {
        errorDetails.message = 'Failed to parse error response'
        errorDetails.fullError = `HTTP ${response.status}: ${response.statusText} (Parse error)`
      }

      const error = new Error(errorDetails.fullError)
      error.details = errorDetails
      throw error
    }
    return await response.json()
  } catch (error) {
    const details = error.details || {
      message: error.message,
      fullError: error.message
    }
    logger.error(
      `Error making request: ${details.fullError || details.message}`
    )
    throw error
  }
}

async function getOrder(user, orderId) {
  const endpoint = `/api/v1/orders/${orderId}`
  const maxRetries = 5
  let result
  let retries = 0
  let response = await makeRequest(user, endpoint, 'GET')
  if (response && response.data) {
    result = response.data
  }
  if (result) return result
  while (!result && retries < maxRetries) {
    retries++
    await new Promise((resolve) => setTimeout(resolve, retries * 1000)) // wait longer with each retry
    logger.warn(
      `⚠️ Could not fetch order ${orderId} for user ${user.username}: ${JSON.stringify(response)}, retry #${retries}...`
    )
    response = await makeRequest(user, endpoint, 'GET')
    if (response && response.data) {
      result = response.data
      if (result) return result
    }
  }
  logger.error(
    `❌ Could not fetch order ${orderId} for user ${user.username}: ${JSON.stringify(response)} after ${retries} retries.`
  )
  return null
}

// ---------------- Public functions ----------------

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

// Get the current price of a symbol
async function getCurrentPrice(user, symbol) {
  const endpoint = `/api/v1/market/orderbook/level1?symbol=${symbol}`
  const response = await makeRequest(user, endpoint, 'GET')
  if (response && response.data) {
    return parseFloat(response.data.price)
  }
  return null
}

// Get historical candles/klines for a symbol
// type: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 1w (standardized format)
async function getCandles(
  user,
  symbol,
  type = '3m',
  startAt = null,
  endAt = null
) {
  // Convert standard interval format to KuCoin format
  const intervalMap = {
    '1m': '1min',
    '3m': '3min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '1hour',
    '2h': '2hour',
    '4h': '4hour',
    '6h': '6hour',
    '8h': '8hour',
    '12h': '12hour',
    '1d': '1day',
    '1w': '1week'
  }
  const kucoinInterval = intervalMap[type] || type

  // KuCoin API: GET /api/v1/market/candles
  // Returns: [[time, open, close, high, low, volume, turnover], ...]
  const params = new URLSearchParams({ symbol, type: kucoinInterval })
  if (startAt) params.append('startAt', startAt)
  if (endAt) params.append('endAt', endAt)

  const endpoint = `/api/v1/market/candles?${params.toString()}`

  try {
    const response = await makeRequest(user, endpoint, 'GET')
    if (response && response.data) {
      // Convert to standard OHLC format
      return response.data.map((candle) => ({
        time: parseInt(candle[0]), // Unix timestamp
        open: parseFloat(candle[1]),
        close: parseFloat(candle[2]),
        high: parseFloat(candle[3]),
        low: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        turnover: parseFloat(candle[6])
      }))
    }
    return []
  } catch (error) {
    logger.error(`Error fetching candles for ${symbol}: ${error.message}`)
    return []
  }
}

// Place an order (buy/sell)
// For sell orders with convertProfitToCrypto, use funds parameter to specify USDT amount
async function placeOrder(user, symbol, side, type, price, size, funds = null) {
  const endpoint = '/api/v1/orders'
  const params = {
    clientOid: crypto.randomUUID(),
    side, // buy or sell
    symbol, // e.g., BTC-USDT
    type, // limit or market
    price: type === 'limit' ? price : undefined, // price for limit orders
    size: size || undefined, // amount to trade (base currency)
    funds: funds || undefined // amount in quote currency (for market sells to receive exact amount)
  }
  // Remove undefined values
  Object.keys(params).forEach(
    (key) => params[key] === undefined && delete params[key]
  )

  // console.log('placeOrder', params)
  let response
  try {
    response = await makeRequest(user, endpoint, 'POST', params)
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      size,
      funds,
      errorMessage: error.message,
      errorCode: error.details?.code,
      apiError: error.details?.apiError
    }
    logger.error(
      `Error placing order for ${symbol}:`,
      JSON.stringify(errorInfo)
    )
    const err = new Error(`Failed to place ${side} order for ${symbol}`)
    err.orderDetails = errorInfo
    throw err
  }
  // console.log('response', response)

  if (response && response.data?.orderId) {
    // logger.info(
    //   `${symbol} ${side} order placed of ${size} for ${user.username} : ${JSON.stringify(response.data)}`
    // )
    const order = await getOrder(user, response.data.orderId)
    // logger.info(
    //   `${symbol} ${side} order response for ${user.username} : ${JSON.stringify(order)}`
    // )

    // Validate order data
    if (!order || !order.dealFunds || !order.dealSize) {
      const errorInfo = {
        symbol,
        side,
        type,
        size,
        funds,
        errorMessage: 'Missing required fields in order response',
        order
      }
      const msg = `Invalid order data for ${symbol}: ${JSON.stringify(errorInfo)}`
      logger.error(msg)
      throw new Error(msg)
    }

    return order
  }

  const errorInfo = {
    symbol,
    side,
    type,
    size,
    errorMessage: 'Invalid response from exchange',
    response
  }
  const msg = `Invalid order response for ${symbol}: ${JSON.stringify(errorInfo)}`
  logger.error(msg)
  const err = new Error(msg)
  throw err
}

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

// Fetch the minimum trade size for the selected symbol
async function getMinimumSize(user, symbol) {
  const endpoint = '/api/v1/symbols'
  const response = await makeRequest(user, endpoint, 'GET')
  if (response && response.data) {
    const symbolInfo = response.data.find((pair) => pair.symbol === symbol)
    return symbolInfo ? parseFloat(symbolInfo.baseMinSize) : null
  }
  return null
}

// Get available trading pairs
async function getTradingPairs(user) {
  const endpoint = '/api/v1/symbols'
  const response = await makeRequest(user, endpoint, 'GET')
  if (!response || !response.data) return []
  const pairs = response.data
    .filter((pair) => pair.enableTrading)
    .map(({ symbol, baseMinSize, baseIncrement }) => ({
      symbol,
      baseMinSize,
      baseIncrement
    }))
    .filter((pair) => pair.symbol.endsWith('-USDT'))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
  return pairs
}

async function getTradingPairFee(user, symbol) {
  const endpoint = `/api/v1/trade-fees?symbols=${symbol}`
  try {
    const response = await makeRequest(user, endpoint, 'GET')
    const feeData = response.data[0] // Assuming first result
    if (!feeData) {
      logger.warn(`No fee data found for ${symbol}`)
      return { takerFeeRate: 0.001, kcsDeductFee: false }
    }
    // KuCoin returns takerFeeRate and whether KCS deduction is enabled
    return {
      takerFeeRate: parseFloat(feeData.takerFeeRate),
      kcsDeductFee:
        feeData.kcsDeductFee === true || feeData.kcsDeductFee === 'true'
    }
  } catch (error) {
    logger.error('Error fetching trading pair fees:', error.message)
    return { takerFeeRate: 0.001, kcsDeductFee: false }
  }
}

// Check if user has KCS balance available
async function getKcsBalance(user) {
  const balances = await getAccountBalances(user)
  const kcsBalance = balances.find(
    (b) =>
      b.type === 'trade' && b.currency && b.currency.toLowerCase() === 'kcs'
  )
  if (kcsBalance) {
    return parseFloat(kcsBalance.available)
  }
  return 0
}

// Calculate actual fee considering KCS deduction
// If KCS is used for fee deduction, the USDT amount received is NOT reduced by the fee
async function calculateActualFeeImpact(user, symbol, usdAmount) {
  try {
    const feeInfo = await getTradingPairFee(user, symbol)
    const kcsBalance = await getKcsBalance(user)

    // If KCS deduction is enabled AND user has KCS, fee doesn't impact USDT
    if (feeInfo.kcsDeductFee && kcsBalance > 0) {
      return {
        usdtImpact: 0, // USDT received is not reduced
        feeRate: feeInfo.takerFeeRate,
        paidInKcs: true,
        kcsNeeded: (usdAmount * feeInfo.takerFeeRate) / 1, // Rough estimate, actual depends on KCS price
        kcsAvailable: kcsBalance
      }
    } else {
      // Fee is deducted from USDT
      return {
        usdtImpact: usdAmount * feeInfo.takerFeeRate,
        feeRate: feeInfo.takerFeeRate,
        paidInKcs: false,
        kcsNeeded: 0,
        kcsAvailable: kcsBalance
      }
    }
  } catch (error) {
    logger.error('Error calculating fee impact:', error.message)
    return {
      usdtImpact: usdAmount * 0.001,
      feeRate: 0.001,
      paidInKcs: false,
      kcsNeeded: 0,
      kcsAvailable: 0
    }
  }
}

// Get the tickers
async function getTickers(user) {
  const endpoint = '/api/v1/market/allTickers'
  const response = await makeRequest(user, endpoint, 'GET')
  if (!response || !response.data || !response.data.ticker) return []
  const tickers = response.data.ticker
    .filter((ticker) => ticker.symbol.endsWith('-USDT'))
    .sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue))
  return tickers
}

// Get the account balances
async function getAccountBalances(user) {
  const endpoint = '/api/v1/accounts'
  try {
    const res = await makeRequest(user, endpoint, 'GET')
    return res.data.filter((b) => b.type === 'trade')
  } catch (error) {
    const errorMessage =
      error.details?.fullError || error.message || 'Unknown error'
    logger.error(`Error fetching account balances: ${errorMessage}`)
    throw error
  }
}

async function getCryptoBalance(user, symbol) {
  // console.log('getCryptoBalance', user, symbol)
  const balances = await getAccountBalances(user)
  // console.log(balances.slice(0, 5))
  const bal = balances.find(
    (b) =>
      b.type === 'trade' &&
      b.currency &&
      b.currency.toLowerCase() ===
        symbol.replace(/([^-]+)-?USD(T|C)$/, '$1').toLowerCase()
  )
  // console.log('getCryptoBalance', symbol, bal)
  if (bal) {
    return parseFloat(bal.available)
  }
  return 0
}

async function getNews(user, lang = 'en') {
  // Map short language codes to KuCoin format
  const kucoinLangMap = {
    en: 'en_US',
    es: 'es_ES',
    fr: 'fr_FR'
  }
  const kucoinLang = kucoinLangMap[lang] || 'en_US'

  async function _getNextPage(endpoint, currentPage = 1, output = []) {
    const url = `${endpoint}&currentPage=${currentPage}`
    try {
      const result = await makeRequest(user, url, 'GET', null, true)
      let enrichedOutput = output.concat(result.data.items)
      if (enrichedOutput.length < result.data.totalNum) {
        enrichedOutput = await _getNextPage(
          endpoint,
          currentPage + 1,
          enrichedOutput
        )
      }
      return enrichedOutput
    } catch (e) {
      logger.error(`_getNextPage ${url} - Error: ${e.message}`)
      return []
    }
  }

  const endpoint = `/api/v3/announcements?lang=${kucoinLang}&annType=latest-announcements&pageSize=100&t=${Date.now()}`
  try {
    const result = await _getNextPage(endpoint)
    return result.sort(
      (a, b) =>
        new Date(b.cTime) - new Date(a.cTime) ||
        a.annTitle.localeCompare(b.annTitle)
    )
  } catch (error) {
    logger.error('Error fetching KuCoin news:', error.message)
    return []
  }
}

async function buyCrypto(user, symbol, amount = null) {
  const crypto = amount || (await getMinimumSize(user, symbol))
  if (!crypto) return null
  const order = await placeOrder(user, symbol, 'buy', 'market', null, crypto)
  if (order) {
    const paid = parseFloat(order.dealFunds)
    const fee = parseFloat(order.fee)
    const amt = parseFloat(order.dealSize)
    const price = jsRound(paid / amt)
    logger.info(
      `💲 Bought ${amt} ${symbol.replace(/([^-]+)-?USD(T|C)$/, '$1')} at ${price} USDT (total: ${paid} USDT + fee ${jsRound(fee)} USDT).`
    )
    return order
  }
  return null
}

async function sellCrypto(user, symbol, amount = null) {
  const crypto = amount || (await getMinimumSize(user, symbol))
  const order = await placeOrder(user, symbol, 'sell', 'market', null, crypto)
  if (order) {
    const received = parseFloat(order.dealFunds)
    const fee = parseFloat(order.fee)
    const amt = parseFloat(order.dealSize)
    const price = jsRound(received / amt)
    logger.info(
      `💲 Sold ${amt} ${symbol.replace(/([^-]+)-?USD(T|C)$/, '$1')} at ${price} USDT (total: ${received} USDT - fee ${fee} USDT).`
    )
    return order
  }
  return null
}

module.exports = {
  jsRound,
  getTickers,
  getCurrentPrice,
  getCandles,
  placeOrder,
  getTradingPairs,
  getTradingPairFee,
  getMinimumSize,
  getAccountBalances,
  getCryptoBalance,
  getKcsBalance,
  calculateActualFeeImpact,
  getNews,
  buyCrypto,
  sellCrypto,
  botLog
}
