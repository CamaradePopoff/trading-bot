const HyperExpress = require('hyper-express')
const {
  getTickers,
  getTradingPairs,
  getTradingPairFee,
  getCurrentPrice,
  getCandles,
  getNews,
  buyCrypto,
  sellCrypto,
  jsRound,
  getUserVipLevel
} = require('../bot/utils')
const ManualTransaction = require('../models/manual-transaction')

module.exports = function (io, logger) {
  const botService = require('../services/bot-service')(io, logger)
  const router = new HyperExpress.Router()

  router.get('/tickers', async (req, res) => {
    const pairs = await getTickers(req.user)
    res.status(200).json(pairs)
  })

  router.get('/:symbol/fees', async (req, res) => {
    const feeInfo = await getTradingPairFee(req.user, req.params.symbol)
    res.status(200).json(feeInfo.takerFeeRate)
  })

  router.get('/vip-level', async (req, res) => {
    const fee = await getUserVipLevel(req.user)
    res.status(200).json({ vipFee: fee })
  })

  router.get('/:symbol/price', async (req, res) => {
    const price = await getCurrentPrice(req.user, req.params.symbol)
    res.status(200).json(price)
  })

  router.get('/:symbol/candles', async (req, res) => {
    const { type, startAt, endAt } = req.query
    const candles = await getCandles(
      req.user,
      req.params.symbol,
      type || '3m',
      startAt ? parseInt(startAt) : null,
      endAt ? parseInt(endAt) : null
    )
    res.status(200).json(candles)
  })

  router.post('/prices/batch', async (req, res) => {
    const { symbols } = req.body

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols must be an array' })
    }

    if (symbols.length === 0) {
      return res.status(200).json({})
    }

    if (symbols.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 symbols per request' })
    }

    try {
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const price = await getCurrentPrice(req.user, symbol)
          return { symbol, price }
        } catch (error) {
          logger.error(`Error fetching price for ${symbol}:`, error)
          return { symbol, price: null, error: error.message }
        }
      })

      const results = await Promise.all(pricePromises)

      // Convert array to object for easier lookup
      // Strip exchange asset suffix from keys (e.g., BTC-USDT -> BTC)
      const pricesMap = results.reduce((acc, { symbol, price, error }) => {
        const currency = symbol.replace(/-?USD(T|C)$/, '')
        acc[currency] = error ? { error } : price
        return acc
      }, {})

      res.status(200).json(pricesMap)
    } catch (error) {
      logger.error('Batch price fetch error:', error)
      res.status(500).json({ error: 'Failed to fetch prices' })
    }
  })

  router.get('/prices', async (req, res) => {
    const prices = await botService.getCurrentPrices(req.user)
    res.status(200).json(prices)
  })

  router.get('/pairs', async (req, res) => {
    const pairs = await getTradingPairs(req.user)
    res.status(200).json(pairs)
  })

  router.get('/news/:lang', async (req, res) => {
    if (getNews) {
      const { lang } = req.params
      const news = await getNews(req.user, lang)
      res.status(200).json(news)
    } else {
      res.status(200).json([])
    }
  })

  router.post('/buy-crypto', async (req, res) => {
    const { symbol, amount } = req.body
    const order = await buyCrypto(req.user, symbol, amount)
    if (order) {
      const paid = parseFloat(order.dealFunds)
      const amt = parseFloat(order.dealSize)
      const transaction = new ManualTransaction({
        createdAt: new Date().toISOString(),
        userId: req.user._id,
        currency: symbol,
        amount: amt,
        price: jsRound(paid / amt),
        fee: parseFloat(order.fee),
        paid
      })
      res.status(200).json(await transaction.save())
    } else {
      res
        .status(500)
        .json({ error: `Error placing ${symbol} buy order of ${amount}` })
    }
  })

  router.post('/sell-crypto', async (req, res) => {
    const { symbol, amount } = req.body
    const order = await sellCrypto(req.user, symbol, amount)
    if (order) {
      const received = parseFloat(order.dealFunds)
      const transaction = new ManualTransaction({
        createdAt: new Date().toISOString(),
        userId: req.user._id,
        currency: symbol,
        amount,
        price: jsRound(received / amount),
        fee: parseFloat(order.fee),
        received
      })
      res.status(200).json(await transaction.save())
    } else {
      res
        .status(500)
        .json({ error: `Error placing ${symbol} sell order of ${amount}` })
    }
  })

  return router
}
