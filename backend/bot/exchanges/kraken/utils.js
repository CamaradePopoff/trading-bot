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
    const sha256Hash = crypto.createHash('sha256').update(encoded).digest()

    // Step 2: Concatenate endpoint + sha256Hash as binary string
    const message = endpoint + sha256Hash.toString('binary')

    // Step 3: HMAC-SHA512(secret, message)
    const secretBuffer = Buffer.from(apiSecret, 'base64')

    const hmac = crypto.createHmac('sha512', secretBuffer)
    hmac.update(message, 'binary')
    const signature = hmac.digest('base64')

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
      const exchange = await userService.getExchangeByName(
        user._id,
        exchangeName
      )

      if (!exchange || !exchange.apiKey || !exchange.apiSecret) {
        const error = new Error(
          'Kraken API keys not configured. Please add your API keys in the Account page.'
        )
        logger.error(error.message)
        throw error
      }

      const decodedKeyResult = userService.decodeData(exchange.apiKey)
      const apiKey = decodedKeyResult.decodedData
      const apiSecret = userService.decodeData(exchange.apiSecret).decodedData

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
      body = new URLSearchParams(params).toString()
      const signature = createSignature(apiSecret, endpoint, body, nonce)
      headers['API-Sign'] = signature
      headers['API-Key'] = apiKey
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    // logger.info(`=== Kraken Request Debug ===`)
    // logger.info(`Method: ${method}`)
    // logger.info(`URL: ${url}`)
    // logger.info(
    //   `Headers: ${JSON.stringify(
    //     {
    //       'Content-Type': headers['Content-Type'],
    //       'API-Key': headers['API-Key']?.substring(0, 10) + '...',
    //       'API-Sign': headers['API-Sign']?.substring(0, 20) + '...'
    //     },
    //     null,
    //     2
    //   )}`
    // )
    // logger.info(`Body: ${body}`)
    // logger.info(`Response Status: ${response.status}`)
    // logger.info(`=== End Debug ===`)

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
        // Filter for USD pairs (not USDC/USDT, only pure USD)
        return upper.endsWith('USD') && !upper.includes('SETTLED')
      })
      .map(([key, pairInfo]) => {
        // Extract base asset (everything before USD)
        const baseAsset = key.replace(/USD$/, '')
        const lotDecimals = parseInt(pairInfo.lot_decimals, 10)
        const pairDecimals = parseInt(pairInfo.pair_decimals, 10)
        const tickSize = parseFloat(pairInfo.tick_size)
        const baseIncrement =
          jsRound(Number.isInteger(lotDecimals) && lotDecimals >= 0
            ? Math.pow(10, -lotDecimals)
            : parseFloat(pairInfo.ordermin) || 0.0001)
        const priceIncrement = jsRound(
          Number.isFinite(tickSize) && tickSize > 0
            ? tickSize
            : Number.isInteger(pairDecimals) && pairDecimals >= 0
              ? Math.pow(10, -pairDecimals)
              : 0.0001
        )

        return {
          symbol: key,
          baseAsset: baseAsset,
          quoteAsset: 'USD',
          // Kraken uses 'ordermin' for minimum order size
          baseMinSize: parseFloat(pairInfo.ordermin) || 0.0001,
          // Increment is 10^-lot_decimals
          baseIncrement,
          // Price increment uses tick_size when present, otherwise 10^-pair_decimals
          priceIncrement
        }
      })
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
      .replace(/USDT/, 'USD') // Kraken uses USD, not USDT
      .toUpperCase()

    // Kraken fee calculation:
    // - No platform token discounts (unlike Binance BNB, KuCoin KCS, etc.)
    // - Fees are based purely on 30-day volume tier
    // - VIP levels (0-6) provide progressive fee reductions based on volume
    // - TradeVolume endpoint returns current user fees including volume tier
    const result = await makeRequest(
      user,
      '/0/private/TradeVolume',
      'POST',
      { pair: krakenPair },
      false
    )

    if (!result || !result.fees) {
      logger.warn(`No fee data found for ${symbol}, using default 0.26%`)
      return {
        takerFeeRate: 0.0026,
        platformTokenDiscount: false // Kraken doesn't offer fee discounts for holding platform tokens
      }
    }

    // Kraken returns fees in format:
    // {
    //   "fees": { "ACUUSD": { "fee": "0.4000", ... } },     // taker fees
    //   "fees_maker": { "ACUUSD": { "fee": "0.2300", ... } } // maker fees
    // }
    // Fee values are percentages as strings (e.g., "0.4000" = 0.4%)

    if (result.fees[krakenPair]) {
      const takerFeePercent = parseFloat(result.fees[krakenPair].fee)
      const takerFee = takerFeePercent / 100 // Convert percentage to decimal

      return {
        takerFeeRate: takerFee > 0 ? takerFee : 0.0026,
        platformTokenDiscount: false // Kraken doesn't offer fee discounts for holding platform tokens
      }
    }

    logger.warn(
      `Trading pair ${krakenPair} not found in fees, using default 0.26%`
    )
    return {
      takerFeeRate: 0.0026, // Default Kraken fee (0.26% taker for base tier)
      platformTokenDiscount: false
    }
  } catch (error) {
    logger.error(`getTradingPairFee error: ${error.message}`)
    return {
      takerFeeRate: 0.0026,
      platformTokenDiscount: false
    }
  }
}

async function getMinimumSize(user, symbol) {
  try {
    // Convert symbol to Kraken pair format (e.g., BTC-USD -> XBTUSD)
    const krakenPair = symbol
      .replace('-', '')
      .replace(/^BTC/, 'XBT') // Kraken uses XBT for Bitcoin
      .replace(/USDT/, 'USD') // Kraken uses USD, not USDT
      .toUpperCase()

    const result = await makeRequest(
      user,
      '/0/public/AssetPairs',
      'GET',
      { pair: krakenPair },
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

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
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
