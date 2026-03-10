require('colors')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const logger = require('../../../logger')
const userService = require('../../../services/user-service')(null, logger)
require('dotenv').config()

const exchangeBaseURL = 'https://api.exchange.coinbase.com'
const cdpBaseURL = 'https://api.coinbase.com'
const COINBASE_SPOT_FEE_RATE = 0.006

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function parseNumeric(value, fallback = 0) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function tryParseJson(raw) {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizePrivateKeyPem(value) {
  if (!value) return value

  let pem = String(value).trim()

  // Handle quoted JSON strings that embed the full PEM.
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1)
  }

  // Convert escaped newlines from copied JSON into real lines.
  // Handle both single-escaped (\n) and double-escaped (\\n) variants.
  pem = pem
    .replace(/\\\\r\\\\n/g, '\n')
    .replace(/\\\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim()

  return pem
}

function getSymbolParts(symbol) {
  const knownQuotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']
  const normalized = String(symbol || '')
    .replace('/', '-')
    .toUpperCase()
  if (normalized.includes('-')) {
    const [base, quote] = normalized.split('-')
    return { base, quote, productId: `${base}-${quote}` }
  }

  const quote = knownQuotes.find((q) => normalized.endsWith(q)) || 'USDC'
  const base = normalized.replace(new RegExp(`${quote}$`), '')
  return { base, quote, productId: `${base}-${quote}` }
}

async function getExchangeApiKeys(user) {
  const exchange = await userService.getExchangeByName(
    user._id,
    process.env.BOT_EXCHANGE
  )

  if (!exchange || !exchange.apiKey || !exchange.apiSecret) {
    throw new Error('Coinbase API keys are not configured')
  }

  let apiKey = userService.decodeData(exchange.apiKey).decodedData
  let apiSecret = userService.decodeData(exchange.apiSecret).decodedData
  const apiPassphrase = exchange.apiPassphrase
    ? userService.decodeData(exchange.apiPassphrase).decodedData
    : null

  // Support users pasting the entire CDP JSON object in either field.
  const parsedKeyJson = tryParseJson(String(apiKey || ''))
  const parsedSecretJson = tryParseJson(String(apiSecret || ''))
  const parsedJson = parsedKeyJson || parsedSecretJson
  if (parsedJson?.name && parsedJson?.privateKey) {
    apiKey = parsedJson.name
    apiSecret = parsedJson.privateKey
  }

  apiSecret = normalizePrivateKeyPem(apiSecret)

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Coinbase credentials are incomplete. API key and secret are required.'
    )
  }

  const isCdpKey =
    String(apiKey).startsWith('organizations/') ||
    /BEGIN (EC )?PRIVATE KEY/.test(String(apiSecret))

  if (isCdpKey && !/BEGIN (EC )?PRIVATE KEY/.test(String(apiSecret))) {
    throw new Error(
      'Invalid CDP private key format. Paste the full PEM private key including BEGIN/END lines.'
    )
  }

  if (!isCdpKey && !apiPassphrase) {
    throw new Error(
      'Coinbase Exchange credentials require passphrase. For CDP credentials, use key name (organizations/.../apiKeys/...) as API key and private key PEM as API secret.'
    )
  }

  return {
    apiKey,
    apiSecret,
    apiPassphrase,
    authMode: isCdpKey ? 'cdp' : 'exchange'
  }
}

function createCdpJwt(apiKey, privateKey, method, requestPath) {
  const now = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')

  return jwt.sign(
    {
      iss: 'cdp',
      sub: apiKey,
      nbf: now,
      exp: now + 120,
      uri: `${String(method || 'GET').toUpperCase()} api.coinbase.com${requestPath}`
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        kid: apiKey,
        nonce
      }
    }
  )
}

function createSignature(apiSecret, timestamp, method, requestPath, body = '') {
  const payload = `${timestamp}${method}${requestPath}${body}`
  const secret = Buffer.from(apiSecret, 'base64')
  return crypto.createHmac('sha256', secret).update(payload).digest('base64')
}

async function makeRequest(
  user,
  endpoint,
  method = 'GET',
  params = {},
  requiresAuth = true,
  options = {}
) {
  const normalizedMethod = method.toUpperCase()
  const endpointPath = endpoint
  let requestPath = endpoint
  const baseURL = options.baseURL || exchangeBaseURL
  let url = `${baseURL}${endpoint}`
  let body = ''

  if (normalizedMethod === 'GET' && Object.keys(params).length > 0) {
    const query = new URLSearchParams(params).toString()
    requestPath = `${endpoint}?${query}`
    url = `${baseURL}${requestPath}`
  } else if (normalizedMethod !== 'GET' && Object.keys(params).length > 0) {
    body = JSON.stringify(params)
  }

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  }

  if (requiresAuth) {
    const { apiKey, apiSecret, apiPassphrase, authMode } =
      await getExchangeApiKeys(user)

    if (authMode === 'cdp') {
      const token = createCdpJwt(
        apiKey,
        apiSecret,
        normalizedMethod,
        endpointPath
      )
      headers.Authorization = `Bearer ${token}`
    } else {
      const timestamp = (Date.now() / 1000).toString()
      const signature = createSignature(
        apiSecret,
        timestamp,
        normalizedMethod,
        requestPath,
        body
      )

      headers['CB-ACCESS-KEY'] = apiKey
      headers['CB-ACCESS-SIGN'] = signature
      headers['CB-ACCESS-TIMESTAMP'] = timestamp
      headers['CB-ACCESS-PASSPHRASE'] = apiPassphrase
    }
  }

  const response = await fetch(url, {
    method: normalizedMethod,
    headers,
    body: body || null
  })

  let data
  try {
    data = await response.json()
  } catch (error) {
    let raw = ''
    try {
      raw = await response.text()
    } catch {
      // Ignore body read errors and keep fallback parse message.
    }

    const preview = String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220)

    const parseError = new Error(
      `Coinbase response parse error (HTTP ${response.status})${preview ? `: ${preview}` : ''}`
    )
    parseError.statusCode = response.status
    throw parseError
  }

  if (!response.ok) {
    const message = data?.message || response.statusText
    const requestError = new Error(`HTTP ${response.status}: ${message}`)
    requestError.statusCode = response.status
    requestError.apiError = data
    throw requestError
  }

  return data
}

function botLog(botId, message, logger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (logger) logger.info(`${now} - ${botId} - ${message}`)
}

async function getCurrentPrice(user, symbol) {
  try {
    const { productId } = getSymbolParts(symbol)
    const data = await makeRequest(
      user,
      `/products/${productId}/ticker`,
      'GET',
      {},
      false
    )
    return data?.price ? parseNumeric(data.price, null) : null
  } catch (error) {
    logger.error(
      `Error fetching Coinbase current price for ${symbol}: ${error.message}`
    )
    return null
  }
}

async function getTradingPairs(user) {
  try {
    const products = await makeRequest(user, '/products', 'GET', {}, false)

    return (products || [])
      .filter(
        (pair) =>
          pair?.status === 'online' &&
          pair?.quote_currency === 'USDC' &&
          !pair?.trading_disabled
      )
      .map((pair) => ({
        symbol: pair.id,
        baseCurrency: pair.base_currency,
        quoteCurrency: pair.quote_currency,
        baseMinSize: parseNumeric(pair.base_min_size, 0),
        baseIncrement: parseNumeric(pair.base_increment, 0)
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  } catch (error) {
    logger.error(`Error fetching Coinbase trading pairs: ${error.message}`)
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
  return COINBASE_SPOT_FEE_RATE
}

async function getAccountBalances(user) {
  try {
    const credentials = await getExchangeApiKeys(user)

    if (credentials.authMode === 'cdp') {
      const response = await makeRequest(
        user,
        '/api/v3/brokerage/accounts',
        'GET',
        { limit: 250 },
        true,
        { baseURL: cdpBaseURL }
      )

      return (response?.accounts || [])
        .map((account) => ({
          currency: account.currency,
          available: parseNumeric(account.available_balance?.value)
        }))
        .filter((item) => item.available > 0)
    }

    const accounts = await makeRequest(user, '/accounts', 'GET', {}, true)
    return (accounts || [])
      .map((account) => ({
        currency: account.currency,
        available: parseNumeric(account.available)
      }))
      .filter((item) => item.available > 0)
  } catch (error) {
    logger.error(`Error fetching Coinbase account balances: ${error.message}`)
    return []
  }
}

async function getCryptoBalance(user, asset) {
  const balances = await getAccountBalances(user)
  const balance = balances.find(
    (b) => b.currency.toUpperCase() === String(asset || '').toUpperCase()
  )
  return balance ? parseNumeric(balance.available) : 0
}

async function getMinimumSize(user, symbol) {
  try {
    const { productId } = getSymbolParts(symbol)
    const product = await makeRequest(
      user,
      `/products/${productId}`,
      'GET',
      {},
      false
    )
    return parseNumeric(product?.base_min_size, 0)
  } catch (error) {
    logger.error(
      `Error fetching Coinbase minimum size for ${symbol}: ${error.message}`
    )
    return 0
  }
}

async function getOrderDetails(user, orderId) {
  const credentials = await getExchangeApiKeys(user)
  if (credentials.authMode === 'cdp') {
    throw new Error(
      'CDP credentials are detected. Order detail endpoint is not migrated to Coinbase Advanced Trade yet.'
    )
  }
  return makeRequest(user, `/orders/${orderId}`, 'GET', {}, true)
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
  const credentials = await getExchangeApiKeys(user)
  if (credentials.authMode === 'cdp') {
    throw new Error(
      'CDP credentials are detected. Trading endpoints are not migrated to Coinbase Advanced Trade yet; balances work, but order placement is disabled for CDP mode.'
    )
  }

  const { base, productId } = getSymbolParts(symbol)
  const normalizedSide = String(side || '').toLowerCase()
  const normalizedType =
    String(type || '').toLowerCase() === 'limit' ? 'limit' : 'market'

  const params = {
    product_id: productId,
    side: normalizedSide,
    type: normalizedType
  }

  if (normalizedType === 'limit') {
    params.price = String(price)
    params.size = String(quantity)
    params.time_in_force = 'GTC'
  } else if (normalizedSide === 'sell') {
    if (quoteOrderQty !== null && quoteOrderQty !== undefined) {
      const currentPrice = await getCurrentPrice(user, productId)
      const estimatedSize =
        currentPrice && currentPrice > 0
          ? parseNumeric(quoteOrderQty) / currentPrice
          : parseNumeric(quantity)
      params.size = String(Math.max(estimatedSize, 0))
    } else {
      params.size = String(quantity)
    }
  } else {
    params.size = String(quantity)
  }

  Object.keys(params).forEach(
    (key) =>
      (params[key] === undefined ||
        params[key] === null ||
        params[key] === 'NaN') &&
      delete params[key]
  )

  try {
    const orderResponse = await makeRequest(
      user,
      '/orders',
      'POST',
      params,
      true
    )
    const orderId = orderResponse?.id

    if (!orderId) {
      throw new Error('Invalid Coinbase order response: missing order id')
    }

    // Coinbase may take a short moment before reporting fills.
    let details = null
    for (let i = 0; i < 5; i++) {
      details = await getOrderDetails(user, orderId)
      const settled = details?.settled
      const executedValue = parseNumeric(details?.executed_value)
      if (settled || executedValue > 0) break
      await new Promise((resolve) => setTimeout(resolve, (i + 1) * 250))
    }

    const dealSize = parseNumeric(details?.filled_size)
    const dealFunds = parseNumeric(details?.executed_value)
    const fee = parseNumeric(details?.fill_fees)

    if (dealSize <= 0 || dealFunds <= 0) {
      throw new Error('Order was created but has no filled amount yet')
    }

    return {
      dealFunds: dealFunds.toString(),
      dealSize: dealSize.toString(),
      fee: fee.toString(),
      baseCurrency: base
    }
  } catch (error) {
    const errorInfo = {
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      errorMessage: error.message,
      errorCode: error.statusCode,
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
    const pairs = await getTradingPairs(user)
    if (!pairs || pairs.length === 0) return []

    const maxTickers = 75
    const subset = pairs.slice(0, maxTickers)

    const tickers = await Promise.all(
      subset.map(async (pair) => {
        try {
          const [ticker, stats] = await Promise.all([
            makeRequest(
              user,
              `/products/${pair.symbol}/ticker`,
              'GET',
              {},
              false
            ),
            makeRequest(
              user,
              `/products/${pair.symbol}/stats`,
              'GET',
              {},
              false
            )
          ])

          const last = parseNumeric(ticker?.price)
          const bid = parseNumeric(ticker?.bid, last)
          const ask = parseNumeric(ticker?.ask, last)
          const open = parseNumeric(stats?.open, last)
          const high = parseNumeric(stats?.high, last)
          const low = parseNumeric(stats?.low, last)
          const volume = parseNumeric(stats?.volume)
          const changePrice = last - open
          const changeRate = open > 0 ? changePrice / open : 0

          return {
            symbol: pair.symbol,
            symbolName: pair.symbol,
            buy: bid,
            sell: ask,
            changeRate,
            changePrice,
            high,
            low,
            vol: volume,
            volValue: volume * last,
            last,
            averagePrice: open,
            takerFeeRate: COINBASE_SPOT_FEE_RATE,
            takerCoefficient: 1,
            makerFeeRate: COINBASE_SPOT_FEE_RATE,
            makerCoefficient: 1
          }
        } catch (error) {
          return null
        }
      })
    )

    return tickers.filter(Boolean).sort((a, b) => b.volValue - a.volValue)
  } catch (error) {
    logger.error(`Error fetching Coinbase tickers: ${error.message}`)
    return []
  }
}

async function getNews(user, lang = 'en') {
  logger.info('Coinbase news endpoint not available, returning empty array')
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
