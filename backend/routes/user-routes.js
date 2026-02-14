const HyperExpress = require('hyper-express')
const TotalProfit = require('../models/total-profit')
const { getAccountBalances } = require('../bot/utils')
const {
  validateUserUpdate,
  validateExchangeCredentials,
  validateObjectId
} = require('../middleware/validation')

module.exports = function (io, logger) {
  const router = new HyperExpress.Router()

  const userService = require('../services/user-service')(io, logger)
  const { getBots } = require('../bot/all-bots')(io, logger)

  router.get('/', async (req, res) => {
    const users = await userService.getAllUsersWithDetails()
    res.status(200).json(users)
  })

  router.get('/balances', async (req, res) => {
    const balances = await getAccountBalances(req.user)
    res.status(200).json(balances)
  })

  router.get('/me', (req, res) => {
    const user = req.user.toObject()
    delete user.password
    delete user.__v
    res.status(200).json(user)
  })

  router.put('/me', validateUserUpdate, async (req, res) => {
    const user = await userService.update(req.user._id, req.body)
    delete user.password
    delete user.__v
    delete user.exchange
    res.status(200).json(user)
  })

  router.get('/me/total-profits', async (req, res) => {
    const p = await TotalProfit.findOne({
      userId: req.user._id,
      exchange: process.env.BOT_EXCHANGE
    }).exec()
    if (!p) {
      return res.status(200).json({ totalProfit: 0, totalProfitSimulated: 0 })
    }
    res
      .status(200)
      .json({ totalProfit: p.profit, totalProfitSimulated: p.profitSimulated })
  })

  router.get('/me/daily-profits/:period', async (req, res) => {
    const { period } = req.params
    const dailyProfits = await userService.getDailyProfitsForPeriod(
      req.user._id,
      process.env.BOT_EXCHANGE,
      'profit',
      period
    )
    res.status(200).json(dailyProfits)
  })

  router.get('/me/daily-profits-simul/:period', async (req, res) => {
    const { period } = req.params
    const dailyProfits = await userService.getDailyProfitsForPeriod(
      req.user._id,
      process.env.BOT_EXCHANGE,
      'profitSimulated',
      period
    )
    res.status(200).json(dailyProfits)
  })

  router.delete('/me/simulated-profits', async (req, res) => {
    const profits = await userService.deleteSimulatedProfits(
      req.user._id,
      process.env.BOT_EXCHANGE
    )
    await userService.update(req.user._id, {
      totalProfitSimulated: 0
    })
    res.status(200).json(profits)
  })

  router.put('/me/favorites', async (req, res) => {
    const { exchangeName, favorites } = req.body
    const favs = await userService.updateFavorites(
      req.user._id,
      exchangeName,
      favorites
    )
    res.status(200).json(favs)
  })

  router.get('/me/exchanges', async (req, res) => {
    const exchanges = await userService.getExchanges(req.user._id)
    res.status(200).json(exchanges)
  })

  router.post(
    '/me/exchanges',
    validateExchangeCredentials,
    async (req, res) => {
      const { exchange } = req.body
      const newExchange = await userService.saveExchange(req.user._id, exchange)
      if (!newExchange) {
        return res
          .status(400)
          .json({ error: `Exchange ${exchange.name} is not allowed.` })
      }
      const bots = getBots()
      bots.forEach((bot) => {
        bot.setExchangeApiKeys(newExchange)
      })
      res.status(200).json(newExchange)
    }
  )

  router.delete(
    '/me/exchanges/:exchangeId',
    validateObjectId('exchangeId'),
    async (req, res) => {
      const { exchangeId } = req.params
      const deletedExchange = await userService.deleteExchange(
        req.user._id,
        exchangeId
      )
      if (!deletedExchange) {
        return res
          .status(400)
          .json({ error: `Exchange ${exchangeId} not found` })
      }
      res.status(200).json(deletedExchange)
    }
  )

  return router
}
