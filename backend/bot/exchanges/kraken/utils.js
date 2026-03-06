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

// Helper function to create a signature for Kraken API
function createSignature(apiSecret, endpoint, body, nonce) {
  // Kraken signature: HMAC-SHA512 of (URI path + SHA256(nonce + POST data))
  // Reference: https://docs.kraken.com/rest/#section/Authentication/Headers-and-Signature
  try {
    // Step 1: SHA256(nonce + POST_data)
    const encoded = nonce + body
    logger.info(`Kraken Signature - Encoded (nonce + body): ${encoded}`)

    const sha256Hash = crypto.createHash('sha256').update(encoded).digest()

    logger.info(
      `Kraken Signature - SHA256 Hash (hex): ${sha256Hash.toString('hex')}`
    )

    // Step 2: Concatenate endpoint + sha256Hash as binary string
    const message = endpoint + sha256Hash.toString('binary')

    logger.info(
      `Kraken Signature - Message (first 100 chars): ${Buffer.from(message, 'binary').toString('hex').substring(0, 100)}...`
    )

    // Step 3: HMAC-SHA512(secret, message)
    const secretBuffer = Buffer.from(apiSecret, 'base64')
    logger.info(`Kraken Signature - Secret length: ${secretBuffer.length}`)

    const hmac = crypto.createHmac('sha512', secretBuffer)
    hmac.update(message, 'binary')
    const signature = hmac.digest('base64')

    logger.info(`Kraken Signature - Final Signature: ${signature}`)

    return signature
  } catch (error) {
    logger.error(`Error creating Kraken signature: ${error.message}`)
    logger.error(error.stack)
    throw error
  }
}

// Helper function to make API requests
async function makeRequest(
  user,
  endpoint,
  method = 'POST',
  params = {},
  isPublic = false,
  exchangeName = 'Kraken'
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
      // Private requests - use the specified exchangeName (default: Kraken)
      logger.info(`Looking for exchange: ${exchangeName}`)
      const exchange = await userService.getExchangeByName(
        user._id,
        exchangeName
      )

      logger.info(`Exchange found: ${exchange ? 'YES' : 'NO'}`)
      if (exchange) {
        logger.info(`Exchange has apiKey: ${exchange.apiKey ? 'YES' : 'NO'}`)
        logger.info(
          `Exchange has apiSecret: ${exchange.apiSecret ? 'YES' : 'NO'}`
        )
      }

      if (!exchange || !exchange.apiKey || !exchange.apiSecret) {
        const error = new Error(
          'Kraken API keys not configured. Please add your API keys in the Account page.'
        )
        logger.error(error.message)
        throw error
      }

      logger.info(
        `Attempting to decode apiKey: ${exchange.apiKey.substring(0, 20)}...`
      )
      const decodedKeyResult = userService.decodeData(exchange.apiKey)
      logger.info(
        `Decode result: ${JSON.stringify({ hasDecodedData: !!decodedKeyResult.decodedData, type: typeof decodedKeyResult.decodedData })}`
      )

      const apiKey = decodedKeyResult.decodedData
      const apiSecret = userService.decodeData(exchange.apiSecret).decodedData

      logger.info(
        `apiKey value: ${apiKey ? apiKey.substring(0, 10) + '...' : 'UNDEFINED'}`
      )
      logger.info(
        `apiSecret value: ${apiSecret ? 'EXISTS (length: ' + apiSecret.length + ')' : 'UNDEFINED'}`
      )

      if (!apiKey || !apiSecret) {
        const error = new Error(
          'Failed to decode Kraken API keys. Please verify your API key and secret are correctly saved.'
        )
        logger.error(error.message)
        throw error
      }

      // Kraken requires nonce as an always increasing unsigned 64-bit integer
      // Using milliseconds since epoch ensures it's always increasing
      const nonce = Date.now().toString()
      params.nonce = nonce

      // Log params before converting to body
      logger.info(`Kraken Params: ${JSON.stringify(params)}`)

      body = new URLSearchParams(params).toString()

      logger.info(`Kraken ${endpoint} - Body: ${body}`)
      logger.info(`Kraken ${endpoint} - Nonce value: ${nonce}`)

      const signature = createSignature(apiSecret, endpoint, body, nonce)

      headers['API-Sign'] = signature
      headers['API-Key'] = apiKey
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    logger.info(`=== Kraken Request Debug ===`)
    logger.info(`Method: ${method}`)
    logger.info(`URL: ${url}`)
    logger.info(
      `Headers: ${JSON.stringify(
        {
          'Content-Type': headers['Content-Type'],
          'API-Key': headers['API-Key']?.substring(0, 10) + '...',
          'API-Sign': headers['API-Sign']?.substring(0, 20) + '...'
        },
        null,
        2
      )}`
    )
    logger.info(`Body: ${body}`)
    logger.info(`Response Status: ${response.status}`)
    logger.info(`=== End Debug ===`)

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
      const errorMsg = data.error ? data.error.join(', ') : 'Unknown error'

      // Provide more helpful error messages for common issues
      if (errorMsg.includes('EAPI:Invalid key')) {
        const helpMsg =
          'Kraken API authentication failed. Please verify: 1) API keys are saved in Account page, 2) API key has required permissions (Query Funds, Query Orders, Create Orders), 3) API key is enabled in Kraken settings'
        logger.error(helpMsg)
        logger.error(
          `API Key starts with: ${headers['API-Key']?.substring(0, 10)}...`
        )
      }

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
    const krakenPairs = pairs.map((p) =>
      p
        .replace('-', '')
        .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
        .replace(/USDT/, 'USDC') // Kraken uses USDC, not USDT
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
    // Convert symbol to Kraken pair format (e.g., BTC-USDC -> XBTUSDC)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USDC') // Kraken uses USDC, not USDT
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
        // Filter for USDC pairs
        return upper.includes('USDC') && !upper.includes('SETTLED')
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
    // Convert symbol to Kraken pair format if needed (e.g., BTC-USDC -> XBTUSDC)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USDC') // Kraken uses USDC, not USDT
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
    // Convert symbol to Kraken pair format (e.g., BTC-USDC -> XBTUSDC)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USDC') // Kraken uses USDC, not USDT
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
    if (!result) return []

    const balances = {}

    // Process Kraken balance response
    // Kraken returns assets in format like "USDC", "EUR.HOLD", "XBTC", "ZEUR" etc.
    for (const [key, value] of Object.entries(result)) {
      const amount = parseNumeric(value)

      // Determine if this is a held balance
      const isHeld = key.includes('.HOLD')

      // Extract base asset name
      // Remove prefix X (crypto) or Z (fiat) and suffix .HOLD if present
      let symbol = key
        .replace(/\.HOLD$/, '') // Remove .HOLD suffix
        .replace(/^X/, '') // Remove X prefix (crypto)
        .replace(/^Z/, '') // Remove Z prefix (fiat)
        .toUpperCase()

      // Initialize symbol entry if it doesn't exist
      if (!balances[symbol]) {
        balances[symbol] = {
          currency: symbol,
          available: 0,
          held: 0,
          total: 0
        }
      }

      // Add amount to appropriate balance type
      if (isHeld) {
        balances[symbol].held += amount
      } else {
        balances[symbol].available += amount
      }

      balances[symbol].total =
        balances[symbol].available + balances[symbol].held
    }

    // Convert to array format expected by frontend
    // Only include currencies with available balance > 0
    const balancesArray = Object.values(balances)
      .filter((b) => b.available > 0)
      .map((b) => ({
        currency: b.currency,
        available: b.available
      }))

    logger.info(
      `getAccountBalances - Formatted balances: ${JSON.stringify(balancesArray)}`
    )
    return balancesArray
  } catch (error) {
    logger.error(`getAccountBalances error: ${error.message}`)
    return []
  }
}

async function getCryptoBalance(user, symbol) {
  try {
    // Remove -USDT suffix if present
    const asset = symbol.replace(/-?USD(T|C)?$/, '').toUpperCase()

    const balances = await getAccountBalances(user)
    // balances is now an array, find the matching currency
    const balance = balances.find((b) => b.currency === asset)
    return balance?.available || 0
  } catch (error) {
    logger.error(`getCryptoBalance error for ${symbol}: ${error.message}`)
    return 0
  }
}

async function placeOrder(user, symbol, side, orderType, price, amount) {
  try {
    // Convert symbol to Kraken pair format (e.g., BTC-USDC -> XBTUSDC)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USDC') // Kraken uses USDC, not USDT
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
