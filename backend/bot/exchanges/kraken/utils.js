require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.kraken.com'

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function parseNumeric(value, fallback = 0) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Helper function to create a signature
function createSignature(apiSecret, endpoint, params, nonce) {
  const message =
    endpoint +
    crypto
      .createHash('sha256')
      .update(nonce + JSON.stringify(params))
      .digest()
  return crypto
    .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
    .update(message)
    .digest('base64')
}

// Helper function to make API requests
async function makeRequest(
  user,
  endpoint,
  method = 'POST',
  params = {},
  isPublic = false
) {
  try {
    let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0'
    }

    let url = `${exchangeBaseURL}${endpoint}`
    let body = null

    if (isPublic) {
      // Public requests
      if (method === 'GET' && Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString()
        url = `${exchangeBaseURL}${endpoint}?${queryString}`
      } else if (method !== 'GET' && Object.keys(params).length > 0) {
        body = new URLSearchParams(params).toString()
      }
    } else {
      // Private requests
      const exchange = await userService.getExchangeByName(
        user._id,
        process.env.BOT_EXCHANGE
      )
      const apiKey = userService.decodeData(exchange.apiKey).decodedData
      const apiSecret = userService.decodeData(exchange.apiSecret).decodedData

      const nonce = Date.now().toString()
      params.nonce = nonce

      body = new URLSearchParams(params).toString()
      const signature = createSignature(apiSecret, endpoint, params, nonce)

      headers['API-Sign'] = signature
      headers['API-Key'] = apiKey
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    console.log(`Kraken ${method} ${endpoint} - Status: ${response.status}`)

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      const error = new Error(
        `Kraken response parse error: HTTP ${response.status}`
      )
      logger.error(error.message)
      throw error
    }

    if (!response.ok || (data.error && data.error.length > 0)) {
      const errorMsg = data.error ? data.error[0] : 'Unknown error'
      const error = new Error(`Kraken API error: ${errorMsg}`)
      logger.error(error.message)
      throw error
    }

    return data.result
  } catch (error) {
    logger.error(`Error making request to Kraken ${endpoint}: ${error.message}`)
    throw error
  }
}

async function getTickers(user, pairs = []) {
  try {
    if (!pairs || pairs.length === 0) return {}
    // Convert all pairs to Kraken format
    const krakenPairs = pairs.map(
      (p) =>
        p
          .replace('-', '')
          .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
          .replace(/USDT/, 'USD') // Kraken uses USD, not USDT
          .toUpperCase()
    )
    const pairString = krakenPairs.join(',')
    const result = await makeRequest(
      user,
      '/0/public/Ticker',
      'GET',
      { pair: pairString },
      true
    )
    return result || {}
  } catch (error) {
    logger.error(`getTickers error: ${error.message}`)
    return {}
  }
}

async function getCurrentPrice(user, symbol) {
  try {
    // Convert symbol to Kraken pair format (e.g., BTC-USD -> XBTUSD)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USD') // Kraken uses USD, not USDT
      .toUpperCase()

    const result = await makeRequest(
      user,
      '/0/public/Ticker',
      'GET',
      { pair: krakenPair },
      true
    )

    if (result && result[krakenPair]) {
      const price = parseFloat(result[krakenPair].c[0])
      return price > 0 ? price : 0
    }
    return 0
  } catch (error) {
    logger.error(`getCurrentPrice error for ${symbol}: ${error.message}`)
    return 0
  }
}

async function getTradingPairs(user, assetPair) {
  try {
    const result = await makeRequest(
      user,
      '/0/public/AssetPairs',
      'GET',
      {},
      true
    )

    if (!result) return []

    const pairs = Object.entries(result)
      .filter(([key]) => {
        const upper = key.toUpperCase()
        // Filter for USDT/USD pairs
        return upper.includes('USD') && !upper.includes('SETTLED')
      })
      .map(([key]) => ({
        symbol: key,
        name: key
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))

    return pairs
  } catch (error) {
    logger.error(`getTradingPairs error: ${error.message}`)
    return []
  }
}

async function getTradingPairFee(user, symbol) {
  try {
    // Convert symbol to Kraken pair format if needed (e.g., BTC-USD -> XBTUSD)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .toUpperCase()

    const result = await makeRequest(
      user,
      '/0/private/TradeVolume',
      'POST',
      {},
      false
    )

    if (!result || !result.fees) {
      logger.warn(`No fee data found for ${symbol}, using default 0.26%`)
      return 0.0026
    }

    // Kraken returns fees as an object with pair names as keys
    // Each pair has maker and taker fees
    if (result.fees[krakenPair]) {
      const pairFees = result.fees[krakenPair]
      // Use taker fee (typically higher than maker fee)
      const takerFee = parseFloat(pairFees[1]) / 100 // Convert from percentage to decimal
      return takerFee > 0 ? takerFee : 0.0026
    }

    return 0.0026 // Default Kraken fee
  } catch (error) {
    logger.error(`getTradingPairFee error: ${error.message}`)
    return 0.0026
  }
}

async function getMinimumSize(user, symbol) {
  try {
    // Convert symbol to Kraken pair format (e.g., BTC-USD -> XBTUSD)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .toUpperCase()

    const result = await makeRequest(
      user,
      '/0/public/AssetPairs',
      'GET',
      {},
      true
    )

    if (!result || !result[krakenPair]) {
      logger.warn(`Trading pair ${krakenPair} not found, using default minimum`)
      return 0.0001
    }

    const pair = result[krakenPair]
    // Kraken returns ordermin as the minimum order value for the pair
    const minSize = parseFloat(pair.ordermin) || 0.0001
    return minSize
  } catch (error) {
    logger.error(`getMinimumSize error for ${symbol}: ${error.message}`)
    return 0.0001
  }
}

async function getAccountBalances(user) {
  try {
    const result = await makeRequest(
      user,
      '/0/private/Balance',
      'POST',
      {},
      false
    )

    if (!result) return {}

    const balances = {}
    for (const [key, value] of Object.entries(result)) {
      const amount = parseNumeric(value)
      if (amount > 0) {
        // Map Kraken asset codes to standard format (X prefix = crypto, Z prefix = fiat)
        let symbol = key.replace(/^[XZ]/, '')
        balances[symbol] = {
          currency: symbol,
          available: amount,
          held: 0,
          total: amount
        }
      }
    }
    return balances
  } catch (error) {
    logger.error(`getAccountBalances error: ${error.message}`)
    return {}
  }
}

async function getCryptoBalance(user, symbol) {
  try {
    // Remove -USDT suffix if present
    const asset = symbol.replace(/-?USD(T|C)?$/, '')
    // Map to Kraken format (add X prefix for crypto)
    const krakenSymbol = `X${asset}`

    const balances = await getAccountBalances(user)
    return balances[asset]?.available || 0
  } catch (error) {
    logger.error(`getCryptoBalance error for ${symbol}: ${error.message}`)
    return 0
  }
}

async function placeOrder(user, symbol, side, orderType, price, amount) {
  try {
    // Convert symbol to Kraken pair format (e.g., BTC-USD -> XBTUSD)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USD') // Kraken uses USD, not USDT
      .toUpperCase()

    const params = {
      pair: krakenPair,
      type: side === 'buy' ? 'buy' : 'sell',
      ordertype: orderType === 'market' ? 'market' : 'limit',
      volume: amount.toString()
    }

    if (price && orderType !== 'market') {
      params.price = price.toString()
    }

    const result = await makeRequest(
      user,
      '/0/private/AddOrder',
      'POST',
      params,
      false
    )

    if (result && result.txid && result.txid.length > 0) {
      return {
        id: result.txid[0],
        symbol: symbol,
        side,
        price: price || 0,
        amount,
        dealSize: amount,
        dealFunds: (price || 0) * amount,
        fee: (price || 0) * amount * 0.0026 // Default fee
      }
    }
    return null
  } catch (error) {
    logger.error(`placeOrder error: ${error.message}`)
    return null
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
      `💲 Bought ${amt} ${symbol.replace(/([^-]+)-?USD(T|C)?$/, '$1')} at ${price} USDT (total: ${paid} USDT - fee ${fee} USDT).`
    )
    return order
  }
  return null
}

async function sellCrypto(user, symbol, amount) {
  const order = await placeOrder(user, symbol, 'sell', 'market', null, amount)
  if (order) {
    const received = parseFloat(order.dealFunds)
    const fee = parseFloat(order.fee)
    const amt = parseFloat(order.dealSize)
    const price = jsRound(received / amt)
    logger.info(
      `💲 Sold ${amt} ${symbol.replace(/([^-]+)-?USD(T|C)?$/, '$1')} at ${price} USDT (total: ${received} USDT - fee ${fee} USDT).`
    )
    return order
  }
  return null
}

async function botLog(user, botId, message) {
  // Kraken doesn't have a dedicated logging API
  logger.info(message)
}

async function getNews(user, lang = 'en') {
  logger.info('Kraken news endpoint not available, returning empty array')
  return []
}

module.exports = {
  jsRound,
  getTickers,
  getCurrentPrice,
  placeOrder,
  getTradingPairs,
  getTradingPairFee,
  getMinimumSize,
  getAccountBalances,
  getCryptoBalance,
  buyCrypto,
  sellCrypto,
  botLog,
  getNews
}
