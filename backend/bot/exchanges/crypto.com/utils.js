require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL =
  process.env.CRYPTOCOM_BASE_URL || 'https://api.crypto.com'
const CRYPTOCOM_SPOT_FEE_RATE = 0.001

function getPublicApiUrl(methodPath) {
  const normalizedBase = String(exchangeBaseURL).replace(/\/+$/, '')
  const normalizedPath = String(methodPath || '').replace(/^\/+/, '')

  if (normalizedBase.endsWith('/exchange/v1')) {
    return `${normalizedBase}/${normalizedPath}`
  }

  return `${normalizedBase}/exchange/v1/${normalizedPath}`
}

function getV2ApiUrl(methodPath) {
  const normalizedBase = String(exchangeBaseURL).replace(/\/+$/, '')
  const normalizedPath = String(methodPath || '').replace(/^\/+/, '')

  if (normalizedBase.endsWith('/v2')) {
    return `${normalizedBase}/${normalizedPath}`
  }

  return `${normalizedBase}/v2/${normalizedPath}`
}

function isBadRequest404(statusCode, apiError) {
  const apiCode = String(apiError?.code || '')
  const apiMsg = String(apiError?.msg || apiError?.message || '').toUpperCase()
  if (apiCode === '10004') return true
  return Number(statusCode) === 404 && apiMsg.includes('BAD_REQUEST')
}

function parseNumeric(value, fallback = 0) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getQuoteAssetFromSymbol(symbol) {
  if (!symbol) return ''
  const upper = String(symbol).toUpperCase()

  if (upper.includes('_')) {
    const parts = upper.split('_')
    return parts[parts.length - 1]
  }

  if (upper.includes('-')) {
    const parts = upper.split('-')
    return parts[parts.length - 1]
  }

  const knownQuotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']
  return knownQuotes.find((q) => upper.endsWith(q)) || ''
}

function normalizeInstrumentName(symbol) {
  const upper = String(symbol || '').toUpperCase()
  if (!upper) return upper

  if (upper.includes('_')) return upper
  if (upper.includes('-')) return upper.replace('-', '_')

  const knownQuotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']
  const quote = knownQuotes.find((q) => upper.endsWith(q))
  if (!quote) return upper

  const base = upper.slice(0, -quote.length)
  return `${base}_${quote}`
}

function paramsToString(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => paramsToString(item)).join('')
  }

  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .map((key) => `${key}${paramsToString(value[key])}`)
      .join('')
  }

  return String(value)
}

function createSignature(apiSecret, payload) {
  return crypto.createHmac('sha256', apiSecret).update(payload).digest('hex')
}

async function getExchangeApiKeys(user) {
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )

  if (!exchange) {
    throw new Error(
      'Crypto.com API keys not configured. Please add your API key and secret in Account settings.'
    )
  }

  const apiKey = userService.decodeData(exchange.apiKey).decodedData?.trim()
  const apiSecret = userService
    .decodeData(exchange.apiSecret)
    .decodedData?.trim()

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Incomplete Crypto.com credentials. Please ensure API key and secret are set correctly.'
    )
  }

  return { apiKey, apiSecret }
}

async function makeRequest(
  user,
  methodPath,
  params = {},
  requiresAuth = false,
  httpMethod = 'GET'
) {
  try {
    const normalizedHttpMethod = httpMethod.toUpperCase()
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }

    const isPublicMethod = String(methodPath || '').startsWith('public/')
    const isOrderMethod = [
      'private/create-order',
      'private/get-order-detail'
    ].includes(String(methodPath || ''))
    const candidateUrls = isPublicMethod
      ? [getPublicApiUrl(methodPath)]
      : isOrderMethod
        ? [getPublicApiUrl(methodPath), getV2ApiUrl(methodPath)]
        : [getV2ApiUrl(methodPath), getPublicApiUrl(methodPath)]

    const { apiKey, apiSecret } = requiresAuth
      ? await getExchangeApiKeys(user)
      : { apiKey: null, apiSecret: null }

    let response
    let data
    let lastError

    for (const url of candidateUrls) {
      try {
        if (requiresAuth) {
          const id = Date.now()
          const nonce = Date.now()
          const payload =
            methodPath +
            String(id) +
            apiKey +
            paramsToString(params || {}) +
            String(nonce)

          const requestBody = {
            id,
            method: methodPath,
            api_key: apiKey,
            params,
            nonce,
            sig: createSignature(apiSecret, payload)
          }

          response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          })
        } else {
          let fullUrl = url
          if (
            normalizedHttpMethod === 'GET' &&
            Object.keys(params).length > 0
          ) {
            fullUrl = `${url}?${new URLSearchParams(params).toString()}`
          }

          response = await fetch(fullUrl, {
            method: normalizedHttpMethod,
            headers
          })
        }

        try {
          data = await response.json()
        } catch {
          const error = new Error(
            `Crypto.com response parse error: HTTP ${response.status}`
          )
          error.statusCode = response.status
          throw error
        }

        if (!response.ok) {
          const msg = data?.message || data?.msg || response.statusText
          const error = new Error(`HTTP ${response.status}: ${msg}`)
          error.statusCode = response.status
          error.apiError = data
          if (isBadRequest404(error.statusCode, error.apiError)) {
            lastError = error
            continue
          }
          throw error
        }

        if (Number(data?.code) !== 0) {
          const error = new Error(
            `Crypto.com API Error ${data?.code}: ${data?.message || data?.msg || 'Unknown error'}`
          )
          error.errorCode = data?.code
          error.apiError = data
          if (isBadRequest404(error?.statusCode, error?.apiError)) {
            lastError = error
            continue
          }
          throw error
        }

        return data
      } catch (error) {
        if (isBadRequest404(error?.statusCode, error?.apiError)) {
          lastError = error
          continue
        }
        throw error
      }
    }

    if (lastError) {
      throw lastError
    }
  } catch (error) {
    logger.error(`Error making Crypto.com request: ${error.message || error}`)
    throw error
  }
}

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function botLog(botId, message, customLogger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (customLogger) customLogger.info(`${now} - ${botId} - ${message}`)
}

async function getTickers(user) {
  try {
    const response = await makeRequest(user, 'public/get-tickers', {}, false)
    const rows = response?.result?.data || []

    return rows
      .filter((ticker) => String(ticker.i || '').endsWith('_USD'))
      .map((ticker) => ({
        symbol: ticker.i,
        symbolName: ticker.i,
        buy: parseNumeric(ticker.b),
        sell: parseNumeric(ticker.a),
        changeRate: parseNumeric(ticker.c),
        changePrice: 0,
        high: parseNumeric(ticker.h),
        low: parseNumeric(ticker.l),
        vol: parseNumeric(ticker.v),
        volValue: parseNumeric(ticker.vv),
        last: parseNumeric(ticker.a) || parseNumeric(ticker.b),
        averagePrice: parseNumeric(ticker.k) || parseNumeric(ticker.a),
        takerFeeRate: CRYPTOCOM_SPOT_FEE_RATE,
        takerCoefficient: 1,
        makerFeeRate: CRYPTOCOM_SPOT_FEE_RATE,
        makerCoefficient: 1
      }))
      .sort((a, b) => b.volValue - a.volValue)
  } catch (error) {
    logger.error(`Error fetching Crypto.com tickers: ${error.message}`)
    return []
  }
}

async function getCurrentPrice(user, symbol) {
  try {
    const normalizedSymbol = String(symbol || '').toUpperCase()
    if (/^USD(C|T)?$/.test(normalizedSymbol)) {
      return 1
    }

    const instrumentName = normalizeInstrumentName(symbol)
    const response = await makeRequest(user, 'public/get-tickers', {}, false)

    const ticker = (response?.result?.data || []).find(
      (item) => String(item.i || '').toUpperCase() === instrumentName
    )
    return ticker
      ? parseNumeric(ticker.a, null) || parseNumeric(ticker.b, null)
      : null
  } catch (error) {
    logger.error(
      `Error fetching current Crypto.com price for ${symbol}: ${error.message}`
    )
    return null
  }
}

async function getOrderDetail(user, orderId, instrumentName) {
  const response = await makeRequest(
    user,
    'private/get-order-detail',
    {
      order_id: orderId,
      instrument_name: instrumentName
    },
    true,
    'POST'
  )

  return response?.result?.data || {}
}

function aggregateOrder(order, symbol) {
  const trades = order?.trades || []
  const quoteAsset = getQuoteAssetFromSymbol(symbol)

  if (trades.length > 0) {
    const totals = trades.reduce(
      (acc, trade) => {
        const price = parseNumeric(trade.traded_price)
        const size = parseNumeric(trade.traded_quantity)
        const fee = Math.abs(parseNumeric(trade.fee))
        const feeAsset = String(
          trade.fee_instrument_name || trade.fee_currency || ''
        ).toUpperCase()

        acc.dealFunds += price * size
        acc.dealSize += size
        acc.fee += feeAsset === quoteAsset ? fee : fee * price
        return acc
      },
      { dealFunds: 0, dealSize: 0, fee: 0 }
    )

    return {
      dealFunds: totals.dealFunds.toString(),
      dealSize: totals.dealSize.toString(),
      fee: totals.fee.toString()
    }
  }

  const executedQty = parseNumeric(order?.cumulative_quantity)
  const avgPrice = parseNumeric(order?.avg_price)
  const fee = Math.abs(parseNumeric(order?.fee))
  const feeAsset = String(order?.fee_instrument_name || '').toUpperCase()

  return {
    dealFunds: (executedQty * avgPrice).toString(),
    dealSize: executedQty.toString(),
    fee: (feeAsset === quoteAsset ? fee : fee * avgPrice).toString()
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
  try {
    const normalizedSide = String(side || '').toUpperCase()
    const normalizedType = String(type || '').toUpperCase()
    const instrumentName = normalizeInstrumentName(symbol)

    const params = {
      instrument_name: instrumentName,
      side: normalizedSide,
      type: normalizedType,
      quantity:
        quoteOrderQty !== null && quoteOrderQty !== undefined
          ? String(quoteOrderQty)
          : String(quantity)
    }

    if (normalizedType === 'LIMIT') {
      params.price = String(price)
    }

    const orderResponse = await makeRequest(
      user,
      'private/create-order',
      params,
      true,
      'POST'
    )

    const orderId = orderResponse?.result?.order_id
    if (!orderId) {
      throw new Error('Invalid Crypto.com order response: missing order_id')
    }

    const maxRetries = 5
    for (let i = 0; i < maxRetries; i++) {
      const order = await getOrderDetail(user, orderId, instrumentName)
      const status = String(order?.status || '').toUpperCase()

      if (
        ['FILLED', 'CLOSED', 'PARTIALLY_FILLED', 'PARTIALLY_CANCELED'].includes(
          status
        )
      ) {
        return aggregateOrder(order, symbol)
      }

      await new Promise((resolve) => setTimeout(resolve, (i + 1) * 400))
    }

    const lastOrder = await getOrderDetail(user, orderId, instrumentName)
    return aggregateOrder(lastOrder, symbol)
  } catch (error) {
    if (String(error?.apiError?.code) === '40101') {
      logger.error(
        'Crypto.com auth hint: use Exchange API key/secret (not App key), enable Trade permission, and verify API key IP whitelist includes this server IP.'
      )
    }

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

async function getTradingPairs(user) {
  try {
    const response = await makeRequest(
      user,
      'public/get-instruments',
      {},
      false
    )

    return (response?.result?.data || [])
      .filter(
        (pair) =>
          pair?.tradable === true &&
          String(pair.inst_type || '').toUpperCase() === 'CCY_PAIR' &&
          ['USD', 'USDT', 'USDC'].includes(
            String(pair.quote_ccy || '').toUpperCase()
          )
      )
      .map((pair) => ({
        symbol: pair.symbol,
        baseCurrency: pair.base_ccy,
        quoteCurrency: pair.quote_ccy,
        baseMinSize: parseNumeric(pair.qty_tick_size),
        baseIncrement: parseNumeric(pair.qty_tick_size)
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  } catch (error) {
    logger.error(`Error fetching Crypto.com trading pairs: ${error.message}`)
    return []
  }
}

async function getTradingPairFee(user, _symbol) {
  return {
    takerFeeRate: await getUserVipLevel(user),
    platformTokenDiscount: false
  }
}

async function getUserVipLevel(user) {
  // Prefer fee endpoint when available; fallback to conservative static fee.
  try {
    const response = await makeRequest(
      user,
      'private/get-account-summary',
      {},
      true,
      'POST'
    )

    const feeRate = parseNumeric(
      response?.result?.fee_rate || response?.result?.spot_taker_fee_rate,
      CRYPTOCOM_SPOT_FEE_RATE
    )

    return feeRate > 0 ? feeRate : CRYPTOCOM_SPOT_FEE_RATE
  } catch {
    return CRYPTOCOM_SPOT_FEE_RATE
  }
}

async function getMinimumSize(user, symbol) {
  try {
    const instrumentName = normalizeInstrumentName(symbol)
    const response = await makeRequest(
      user,
      'public/get-instruments',
      {},
      false
    )

    const instrument = (response?.result?.data || []).find(
      (item) => String(item.symbol || '').toUpperCase() === instrumentName
    )
    return instrument ? parseNumeric(instrument.qty_tick_size, 0) : 0
  } catch (error) {
    logger.error(
      `Error fetching Crypto.com minimum size for ${symbol}: ${error.message}`
    )
    return 0
  }
}

async function getAccountBalances(user) {
  try {
    const response = await makeRequest(
      user,
      'private/get-account-summary',
      {},
      true,
      'POST'
    )

    const accounts = response?.result?.accounts || []
    return accounts
      .map((item) => ({
        currency: item.currency,
        available: parseNumeric(item.available || item.balance)
      }))
      .filter((item) => item.available > 0)
  } catch (error) {
    logger.error(`Error fetching Crypto.com account balances: ${error.message}`)
    return []
  }
}

async function getCryptoBalance(user, asset) {
  const balances = await getAccountBalances(user)
  const balance = balances.find(
    (b) => String(b.currency).toUpperCase() === String(asset).toUpperCase()
  )
  return balance ? parseNumeric(balance.available) : 0
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

async function getNews(user, lang = 'en') {
  void user
  void lang
  logger.info('Crypto.com news endpoint not available, returning empty array')
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
