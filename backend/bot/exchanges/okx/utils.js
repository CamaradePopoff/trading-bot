require('colors')
const crypto = require('crypto')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

// For EEA users, please change your API request domain name to eea.okx.com instead of www.okx.com
// For US users, please change your API request domain name to us.okx.com instead of www.okx.com
const exchangeBaseURL = 'https://eea.okx.com'
const OKX_SPOT_FEE_RATE = 0.001

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function createSignature(apiSecret, timestamp, method, requestPath, body = '') {
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`
  return crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64')
}

function parseNumeric(value, fallback = 0) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getQuoteAssetFromSymbol(symbol) {
  if (!symbol) return ''
  if (symbol.includes('-')) {
    const parts = symbol.split('-')
    return parts[parts.length - 1].toUpperCase()
  }
  const knownQuotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']
  const upper = symbol.toUpperCase()
  return knownQuotes.find((q) => upper.endsWith(q)) || ''
}

function normalizeInstId(symbol) {
  const upper = String(symbol || '').toUpperCase()
  if (!upper) return upper

  if (upper.includes('-')) {
    const [base] = upper.split('-')
    return `${base}-USDT`
  }

  return `${upper}-USDT`
}

async function getExchangeApiKeys(user) {
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )

  if (!exchange) {
    throw new Error(
      'OKX API keys not configured. Please add your API key, secret and passphrase in Account settings.'
    )
  }

  const apiKey = userService.decodeData(exchange.apiKey).decodedData?.trim()
  const apiSecret = userService.decodeData(exchange.apiSecret).decodedData?.trim()
  const apiPassphrase = userService
    .decodeData(exchange.apiPassphrase)
    .decodedData?.trim()

  if (!apiKey || !apiSecret || !apiPassphrase) {
    throw new Error(
      'Incomplete OKX credentials. Please ensure API key, secret, and passphrase are all set correctly.'
    )
  }

  return {
    apiKey,
    apiSecret,
    apiPassphrase
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

    let requestPath = endpoint
    let body = ''

    if (normalizedMethod === 'GET' && Object.keys(params).length > 0) {
      const sanitizedParams = Object.entries(params || {}).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = String(value)
          }
          return acc
        },
        {}
      )
      const queryString = new URLSearchParams(sanitizedParams).toString()
      requestPath = `${endpoint}?${queryString}`
    }

    if (normalizedMethod !== 'GET') {
      body =
        params && Object.keys(params).length > 0 ? JSON.stringify(params) : ''
    }

    if (requiresAuth) {
      const { apiKey, apiSecret, apiPassphrase } =
        await getExchangeApiKeys(user)
      const timestamp = new Date().toISOString()
      const signature = createSignature(
        apiSecret,
        timestamp,
        normalizedMethod,
        requestPath,
        body
      )

      headers['OK-ACCESS-KEY'] = apiKey
      headers['OK-ACCESS-SIGN'] = signature
      headers['OK-ACCESS-TIMESTAMP'] = timestamp
      headers['OK-ACCESS-PASSPHRASE'] = apiPassphrase

      if (
        process.env.OKX_ENABLE_ACCESS_PROJECT === '1' &&
        process.env.OKX_ACCESS_PROJECT
      ) {
        headers['OK-ACCESS-PROJECT'] = process.env.OKX_ACCESS_PROJECT
      }
    }

    const executeRequest = async (baseURL) => {
      const requestHeaders = { ...headers }

      const response = await fetch(`${baseURL}${requestPath}`, {
        method: normalizedMethod,
        headers: requestHeaders,
        body: normalizedMethod === 'GET' || body === '' ? undefined : body
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const error = new Error(
          `OKX response parse error: HTTP ${response.status}`
        )
        error.statusCode = response.status
        throw error
      }

      return { response, data }
    }

    let { response, data } = await executeRequest(exchangeBaseURL)

    if (!response.ok) {
      const message = data?.msg || data?.message || response.statusText
      const error = new Error(`HTTP ${response.status}: ${message}`)
      error.statusCode = response.status
      error.apiError = data
      error.requestMeta = {
        endpoint,
        method: normalizedMethod,
        usedProjectHeader: Boolean(process.env.OKX_ACCESS_PROJECT)
      }

      if (
        response.status === 401 &&
        String(message).toLowerCase().includes("api key doesn't exist")
      ) {
        logger.error(
          'OKX auth hint: verify API key IP whitelist (must include this server public IP), and key permissions (Read/Trade as needed).'
        )
      }

      throw error
    }

    if (data?.code && data.code !== '0') {
      const error = new Error(`OKX API Error ${data.code}: ${data.msg}`)
      error.apiError = data
      error.errorCode = data.code
      error.requestMeta = {
        endpoint,
        method: normalizedMethod,
        usedProjectHeader: Boolean(process.env.OKX_ACCESS_PROJECT)
      }
      throw error
    }

    return data
  } catch (error) {
    const extra = {
      statusCode: error?.statusCode,
      errorCode: error?.errorCode,
      apiMessage: error?.apiError?.msg || error?.apiError?.message,
      endpoint: error?.requestMeta?.endpoint,
      method: error?.requestMeta?.method,
      usedProjectHeader: error?.requestMeta?.usedProjectHeader
    }
    logger.error(
      `Error making OKX request: ${error.message || error} | ${JSON.stringify(extra)}`
    )
    throw error
  }
}

async function getOrderFills(user, instId, ordId) {
  const maxRetries = 5
  const normalizedInstId = normalizeInstId(instId)

  for (let retry = 0; retry < maxRetries; retry++) {
    const fillsResponse = await makeRequest(
      user,
      '/api/v5/trade/fills',
      'GET',
      { instId: normalizedInstId, ordId },
      true
    )

    const fills = fillsResponse?.data || []
    if (fills.length > 0) {
      return fills
    }

    await new Promise((resolve) => setTimeout(resolve, (retry + 1) * 400))
  }

  return []
}

function aggregateOrderFromFills(symbol, fills) {
  const quoteAsset = getQuoteAssetFromSymbol(symbol)

  const totals = fills.reduce(
    (acc, fill) => {
      const fillSize = parseNumeric(fill.fillSz)
      const fillPrice = parseNumeric(fill.fillPx)
      const fee = Math.abs(parseNumeric(fill.fee))
      const feeAsset = (fill.feeCcy || '').toUpperCase()

      acc.dealSize += fillSize
      acc.dealFunds += fillSize * fillPrice

      if (feeAsset && feeAsset === quoteAsset) {
        acc.fee += fee
      } else {
        acc.fee += fee * fillPrice
      }

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

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

async function getCurrentPrice(user, symbol) {
  try {
    const normalizedSymbol = String(symbol || '').toUpperCase()
    if (/^USD(C|T)?$/.test(normalizedSymbol)) {
      return 1
    }

    const normalizedInstId = normalizeInstId(symbol)
    const response = await makeRequest(
      user,
      '/api/v5/market/ticker',
      'GET',
      { instId: normalizedInstId },
      false
    )

    const ticker = response?.data?.[0]
    return ticker ? parseNumeric(ticker.last, null) : null
  } catch (error) {
    logger.error(
      `Error fetching current OKX price for ${symbol}: ${error.message}`
    )
    return null
  }
}

async function getTradingPairs(user) {
  try {
    const response = await makeRequest(
      user,
      '/api/v5/public/instruments',
      'GET',
      { instType: 'SPOT' },
      false
    )

    return (response?.data || [])
      .filter((pair) => pair.state === 'live' && pair.quoteCcy === 'USDT')
      .map((pair) => ({
        symbol: pair.instId,
        baseCurrency: pair.baseCcy,
        quoteCurrency: pair.quoteCcy,
        baseMinSize: parseNumeric(pair.minSz),
        baseIncrement: parseNumeric(pair.lotSz || pair.tickSz)
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  } catch (error) {
    logger.error(`Error fetching OKX trading pairs: ${error.message}`)
    return []
  }
}

async function getTradingPairFee(user, symbol) {
  const feeRate = await getUserVipLevel(user)
  return {
    takerFeeRate: feeRate,
    okbDeductFee: false
  }
}

async function getUserVipLevel(user) {
  return OKX_SPOT_FEE_RATE
}

async function getAccountBalances(user) {
  try {
    const response = await makeRequest(
      user,
      '/api/v5/account/balance',
      'GET',
      {},
      true
    )

    const details = response?.data?.[0]?.details || []

    return details
      .map((item) => ({
        currency: item.ccy,
        available: parseNumeric(item.availBal || item.cashBal)
      }))
      .filter((item) => item.available > 0)
  } catch (error) {
    logger.error(`Error fetching OKX account balances: ${error.message}`)
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
    const normalizedInstId = normalizeInstId(symbol)
    const response = await makeRequest(
      user,
      '/api/v5/public/instruments',
      'GET',
      { instType: 'SPOT', instId: normalizedInstId },
      false
    )

    const instrument = response?.data?.[0]
    return instrument ? parseNumeric(instrument.minSz, 0) : 0
  } catch (error) {
    logger.error(
      `Error fetching OKX minimum size for ${symbol}: ${error.message}`
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
  const normalizedType = type.toLowerCase()
  const normalizedInstId = normalizeInstId(symbol)

  const params = {
    instId: normalizedInstId,
    tdMode: 'cash',
    side: normalizedSide,
    ordType: normalizedType
  }

  if (normalizedType === 'limit') {
    params.px = price?.toString()
    params.sz = quantity?.toString()
  } else {
    const isBuy = normalizedSide === 'buy'
    const useQuoteAmount = quoteOrderQty !== null && quoteOrderQty !== undefined

    if (useQuoteAmount) {
      params.sz = quoteOrderQty.toString()
      params.tgtCcy = 'quote_ccy'
    } else {
      params.sz = quantity?.toString()
      params.tgtCcy = isBuy ? 'base_ccy' : 'base_ccy'
    }
  }

  Object.keys(params).forEach(
    (key) =>
      (params[key] === undefined || params[key] === null) && delete params[key]
  )

  try {
    const orderResponse = await makeRequest(
      user,
      '/api/v5/trade/order',
      'POST',
      params,
      true
    )

    const order = orderResponse?.data?.[0]
    if (!order?.ordId) {
      throw new Error('Invalid OKX order response: missing ordId')
    }

    const fills = await getOrderFills(user, normalizedInstId, order.ordId)

    if (fills.length > 0) {
      return aggregateOrderFromFills(symbol, fills)
    }

    const detailsResponse = await makeRequest(
      user,
      '/api/v5/trade/order',
      'GET',
      { instId: normalizedInstId, ordId: order.ordId },
      true
    )

    const details = detailsResponse?.data?.[0]
    if (!details) {
      throw new Error('Unable to fetch OKX order details')
    }

    const dealSize = parseNumeric(details.accFillSz)
    const avgPrice = parseNumeric(details.avgPx)
    const fee = Math.abs(parseNumeric(details.fee))
    const feeCcy = (details.feeCcy || '').toUpperCase()
    const quoteAsset = getQuoteAssetFromSymbol(symbol)

    const feeInQuote = feeCcy === quoteAsset ? fee : fee * avgPrice

    return {
      dealFunds: (dealSize * avgPrice).toString(),
      dealSize: dealSize.toString(),
      fee: feeInQuote.toString()
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
    const response = await makeRequest(
      user,
      '/api/v5/market/tickers',
      'GET',
      { instType: 'SPOT' },
      false
    )

    return (response?.data || [])
      .filter((ticker) => ticker.instId.endsWith('-USDT'))
      .map((ticker) => ({
        symbol: ticker.instId,
        symbolName: ticker.instId,
        buy: parseNumeric(ticker.bidPx),
        sell: parseNumeric(ticker.askPx),
        changeRate: parseNumeric(ticker.change24h),
        changePrice: 0,
        high: parseNumeric(ticker.high24h),
        low: parseNumeric(ticker.low24h),
        vol: parseNumeric(ticker.vol24h),
        volValue: parseNumeric(ticker.volCcy24h),
        last: parseNumeric(ticker.last),
        averagePrice: parseNumeric(ticker.open24h)
          ? parseNumeric(ticker.open24h)
          : parseNumeric(ticker.last),
        takerFeeRate: OKX_SPOT_FEE_RATE,
        takerCoefficient: 1,
        makerFeeRate: OKX_SPOT_FEE_RATE,
        makerCoefficient: 1
      }))
      .sort((a, b) => b.volValue - a.volValue)
  } catch (error) {
    logger.error(`Error fetching OKX tickers: ${error.message}`)
    return []
  }
}

async function getNews(user, lang = 'en') {
  logger.info('OKX news endpoint not available, returning empty array')
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
