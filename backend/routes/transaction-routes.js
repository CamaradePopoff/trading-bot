const HyperExpress = require('hyper-express')

module.exports = function (io, logger) {
  const router = new HyperExpress.Router()

  const transationService = require('../services/transaction-service')(
    io,
    logger
  )

  router.post('/:id/set-margin/:margin/:fee', async (req, res) => {
    const { id, margin, fee } = req.params
    const updatedTransaction = await transationService.setNewMargin(
      id,
      parseFloat(margin),
      parseFloat(fee)
    )
    res.status(200).json(updatedTransaction)
  })

  router.get('/crypto-profits', async (req, res) => {
    const timezoneOffset = parseInt(req.query.timezoneOffset) || 0
    const profits = await transationService.getCryptoProfits(
      req.user._id,
      process.env.BOT_EXCHANGE,
      timezoneOffset
    )
    res.status(200).json(profits)
  })

  router.delete('/crypto-profits-simulated/:symbol', async (req, res) => {
    const { symbol } = req.params
    await transationService.deleteCryptoProfitHistory(
      req.user._id,
      process.env.BOT_EXCHANGE,
      symbol,
      true
    )
    res.status(200).json({
      message: `Simulated crypto profit history deleted for ${symbol}`
    })
  })

  router.delete('/crypto-profits/:symbol', async (req, res) => {
    const { symbol } = req.params
    await transationService.deleteCryptoProfitHistory(
      req.user._id,
      process.env.BOT_EXCHANGE,
      symbol,
      false
    )
    res
      .status(200)
      .json({ message: `Crypto profit history deleted for ${symbol}` })
  })

  router.get('/:symbol/manual', async (req, res) => {
    const { symbol } = req.params
    const transactions = await transationService.getManualTransactions(
      symbol,
      req.user._id
    )
    res.status(200).json(transactions)
  })

  router.post('/manual/batch', async (req, res) => {
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
      const transactionPromises = symbols.map(async (symbol) => {
        try {
          const transactions = await transationService.getManualTransactions(
            symbol,
            req.user._id
          )
          return { symbol, transactions }
        } catch (error) {
          logger.error(`Error fetching transactions for ${symbol}:`, error)
          return { symbol, transactions: [], error: error.message }
        }
      })

      const results = await Promise.all(transactionPromises)

      // Convert array to object for easier lookup
      // Strip exchange asset suffix from keys (e.g., BTC-USDT -> BTC)
      const transactionsMap = results.reduce(
        (acc, { symbol, transactions, error }) => {
          const currency = symbol.replace(/-?USD(T|C)?$/, '')
          acc[currency] = error ? [] : transactions
          return acc
        },
        {}
      )

      res.status(200).json(transactionsMap)
    } catch (error) {
      logger.error('Batch transaction fetch error:', error)
      res.status(500).json({ error: 'Failed to fetch transactions' })
    }
  })

  router.post('/:id/pause', async (req, res) => {
    const { id } = req.params
    const transaction = await transationService.pausePurchase(req.user, id)
    res.status(200).json(transaction)
  })

  router.post('/:id/unpause', async (req, res) => {
    const { id } = req.params
    const transaction = await transationService.unpausePurchase(req.user, id)
    res.status(200).json(transaction)
  })

  router.post('/:id/kill', async (req, res) => {
    const { id } = req.params
    const transaction = await transationService.killPurchase(req.user, id)
    res.status(200).json(transaction)
  })

  router.get('/total-investment', async (req, res) => {
    const totalInvestment = await transationService.getTotalInvestment(
      req.user._id
    )
    res.status(200).json(totalInvestment)
  })

  return router
}
