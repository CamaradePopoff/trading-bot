const HyperExpress = require('hyper-express')
const MemoryBot = require('../bot/bot')
const { validateBotConfig } = require('../middleware/validation')

module.exports = function (io, logger) {
  const router = new HyperExpress.Router()

  const { onlyForAdmin } = require('../auth/permissions')(logger)
  const botService = require('../services/bot-service')(io, logger)
  const appService = require('../services/app-service')(io, logger)
  const { getBot, addBot, removeBot } = require('../bot/all-bots')(io, logger)

  router.post('/', validateBotConfig, async (req, res) => {
    const config = req.body
    const dbBot = await botService.createBot(req.user, config)
    const bot = new MemoryBot(
      dbBot._id.toString(),
      req.user,
      dbBot.config,
      io,
      logger
    )
    addBot(bot)
    res.status(200).json(dbBot)
  })

  router.get('/', async (req, res) => {
    res.status(200).json(await botService.getAllUserBots(req.user._id))
  })

  router.get('/admin/:userId/:exchange', onlyForAdmin, async (req, res) => {
    const { userId, exchange } = req.params
    const bots = await botService.getBotsByUserAndExchange(userId, exchange)
    res.status(200).json(bots)
  })

  router.get('/export/:exchange', async (req, res) => {
    const { exchange } = req.params
    const configs = await botService.exportBotConfigs(req.user._id, exchange)
    res.status(200).json(configs)
  })

  router.post('/export/:exchange', async (req, res) => {
    const { exchange } = req.params
    const { botIds } = req.body
    const configs = await botService.exportBotConfigs(
      req.user._id,
      exchange,
      botIds
    )
    res.status(200).json(configs)
  })

  router.post('/import/:exchange', async (req, res) => {
    const { exchange } = req.params
    const { configs } = req.body
    const results = await botService.importBotConfigs(
      req.user,
      exchange,
      configs
    )
    res.status(200).json(results)
  })

  router.get('/:id', async (req, res) => {
    const id = req.params.id
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    res.status(200).json(dbBot)
  })

  router.post('/:id/start', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    if (!dbBot.hasStarted) {
      await bot.start() // Await to ensure bot is fully initialized before responding
      dbBot.hasStarted = true
      dbBot.isPaused = false
      dbBot = await dbBot.save()
      res.status(200).json(dbBot)
    } else {
      res.status(400).json({ message: 'Bot has already been started' })
    }
  })

  router.post('/:id/pause', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    if (bot.hasStarted()) {
      await bot.pause()
      dbBot.isPaused = true
      dbBot = await dbBot.save()
      res.status(200).json(dbBot)
    } else {
      res
        .status(400)
        .json({ message: 'Bot has not been started yet, cannot pause' })
    }
  })

  router.post('/:id/resume', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    if (bot.hasStarted()) {
      if (bot.isPaused()) {
        await bot.resume()
        dbBot.isPaused = false
        dbBot = await dbBot.save()
        res.status(200).json(dbBot)
      } else {
        res.status(400).json({ message: 'Bot is not paused, cannot resume' })
      }
    } else {
      res
        .status(400)
        .json({ message: 'Bot has not been started yet, cannot resume' })
    }
  })

  router.post('/:id/stop', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    if (bot.hasStarted()) {
      await bot.pause()
      dbBot.hasStarted = false
      dbBot.isPaused = false
      dbBot = await dbBot.save()
      res.status(200).json(dbBot)
    } else {
      res
        .status(400)
        .json({ message: 'Bot has not been started yet, cannot stop' })
    }
  })

  router.post('/pause-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { paused: 0, failed: 0, errors: [], failedBotIds: [] }

      // If botIds provided, filter to only those; otherwise apply to all
      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && bot.hasStarted() && !bot.isPaused()) {
            await bot.pause()
            // Fetch the actual Mongoose document to save changes
            const dbBot = await botService.getBotById(leanBot._id.toString())
            if (dbBot) {
              dbBot.isPaused = true
              await dbBot.save()
              results.paused++
            }
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(`Failed to pause bot ${leanBot._id}:`, error)
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to pause all bots', error: error.message })
    }
  })

  router.post('/resume-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { resumed: 0, failed: 0, errors: [], failedBotIds: [] }

      // If botIds provided, filter to only those; otherwise apply to all
      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && bot.hasStarted() && bot.isPaused()) {
            await bot.resume()
            // Fetch the actual Mongoose document to save changes
            const dbBot = await botService.getBotById(leanBot._id.toString())
            if (dbBot) {
              dbBot.isPaused = false
              await dbBot.save()
              results.resumed++
            }
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(`Failed to resume bot ${leanBot._id}:`, error)
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to resume all bots', error: error.message })
    }
  })

  router.post('/stop-buy-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { stopped: 0, failed: 0, errors: [], failedBotIds: [] }

      // If botIds provided, filter to only those; otherwise apply to all
      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && (!bot.stopBuyingOnDrop || !bot.stopBuyingOnRebuy)) {
            await bot.stopBuyingOnDropPositions()
            await bot.stopBuyingOnRebuyPositions()
            results.stopped++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(`Failed to stop buying for bot ${leanBot._id}:`, error)
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to stop buying all bots',
        error: error.message
      })
    }
  })

  router.post('/go-buy-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { resumed: 0, failed: 0, errors: [], failedBotIds: [] }

      // If botIds provided, filter to only those; otherwise apply to all
      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && (bot.stopBuyingOnDrop || bot.stopBuyingOnRebuy)) {
            await bot.goBuyingOnDropPositions()
            await bot.goBuyingOnRebuyPositions()
            results.resumed++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(`Failed to resume buying for bot ${leanBot._id}:`, error)
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to resume buying all bots',
        error: error.message
      })
    }
  })

  router.post('/stop-buy-on-drop-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { stopped: 0, failed: 0, errors: [], failedBotIds: [] }

      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && !bot.stopBuyingOnDrop) {
            await bot.stopBuyingOnDropPositions()
            results.stopped++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(
            `Failed to stop buying on drop for bot ${leanBot._id}:`,
            error
          )
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to stop buying on drop for all bots',
        error: error.message
      })
    }
  })

  router.post('/go-buy-on-drop-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { resumed: 0, failed: 0, errors: [], failedBotIds: [] }

      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && bot.stopBuyingOnDrop) {
            await bot.goBuyingOnDropPositions()
            results.resumed++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(
            `Failed to resume buying on drop for bot ${leanBot._id}:`,
            error
          )
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to resume buying on drop for all bots',
        error: error.message
      })
    }
  })

  router.post('/stop-buy-on-rebuy-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { stopped: 0, failed: 0, errors: [], failedBotIds: [] }

      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && !bot.stopBuyingOnRebuy) {
            await bot.stopBuyingOnRebuyPositions()
            results.stopped++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(
            `Failed to stop buying on rebuy for bot ${leanBot._id}:`,
            error
          )
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to stop buying on rebuy for all bots',
        error: error.message
      })
    }
  })

  router.post('/go-buy-on-rebuy-all', async (req, res) => {
    try {
      const { botIds } = req.body
      const userBots = await botService.getAllUserBots(req.user._id)
      const results = { resumed: 0, failed: 0, errors: [], failedBotIds: [] }

      const botsToProcess =
        botIds && botIds.length > 0
          ? userBots.filter((bot) => botIds.includes(bot._id.toString()))
          : userBots

      for (const leanBot of botsToProcess) {
        try {
          const bot = getBot(leanBot._id.toString())
          if (bot && bot.stopBuyingOnRebuy) {
            await bot.goBuyingOnRebuyPositions()
            results.resumed++
          }
        } catch (error) {
          results.failed++
          results.failedBotIds.push(leanBot._id.toString())
          results.errors.push({
            botId: leanBot._id,
            botName: leanBot.config.label || leanBot.config.symbol,
            error: error.message
          })
          logger.error(
            `Failed to resume buying on rebuy for bot ${leanBot._id}:`,
            error
          )
        }
      }

      res.status(results.failed > 0 ? 207 : 200).json(results)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to resume buying on rebuy for all bots',
        error: error.message
      })
    }
  })

  router.post('/:id/stop-buy', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    // For backward compatibility, stop both types of buying
    await bot.stopBuyingOnDropPositions()
    dbBot = await bot.stopBuyingOnRebuyPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/go-buy', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    // For backward compatibility, resume both types of buying
    await bot.goBuyingOnDropPositions()
    dbBot = await bot.goBuyingOnRebuyPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/stop-buy-on-drop', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.stopBuyingOnDropPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/go-buy-on-drop', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.goBuyingOnDropPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/stop-buy-on-rebuy', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.stopBuyingOnRebuyPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/go-buy-on-rebuy', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.goBuyingOnRebuyPositions()
    res.status(200).json(dbBot)
  })

  router.post('/:id/stop-crypto-convert', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.stopCryptoConvert()
    res.status(200).json(dbBot)
  })

  router.post('/:id/go-crypto-convert', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.goCryptoConvert()
    res.status(200).json(dbBot)
  })

  router.post('/:id/stop-profit-reuse', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.stopProfitReuse()
    res.status(200).json(dbBot)
  })

  router.post('/:id/go-profit-reuse', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.goProfitReuse()
    res.status(200).json(dbBot)
  })

  router.get('/:id/transactions', async (req, res) => {
    const id = req.params.id
    if (id === 'undefined') {
      return res.status(400).json({ message: 'Bot id is required' })
    }
    const transactions = await botService.getBotTransactions(req.user, id)
    res.status(200).json(transactions)
  })

  router.post('/:id/sell-all-positive', async (req, res) => {
    const id = req.params.id
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    await bot.sellAllPositive()
    const transactions = await botService.getBotTransactions(req.user, id)
    res.status(200).json(transactions)
  })

  router.post('/:id/sell-now/:pid', async (req, res) => {
    const { id, pid } = req.params
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    const result = await bot.sellNow(pid, true, true, false)
    if (!result || result.sold === false) {
      // If error details are present, return them
      if (result && result.errorMessage) {
        return res.status(400).json({ error: result.errorMessage })
      }
      return res.status(400).json({ error: 'Bad sell request' })
    }
    res.status(200).json({ message: 'Sell order placed' })
  })

  router.post('/:id/buy-now', async (req, res) => {
    const id = req.params.id
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    const result = await bot.buyNow(true, false)
    if (result === false || (result && result.errorMessage)) {
      return res.status(400).json({
        error:
          result && result.errorMessage
            ? result.errorMessage
            : 'Buy order failed'
      })
    }
    res.status(200).json({ message: 'Buy order placed' })
  })

  router.post('/:id/buy-now/:usd', async (req, res) => {
    const id = req.params.id
    const usd = parseFloat(req.params.usd)
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    const result = await bot.buyNow(true, false, usd)
    if (result === false || (result && result.errorMessage)) {
      return res.status(400).json({
        error:
          result && result.errorMessage
            ? result.errorMessage
            : 'Buy order failed'
      })
    }
    res.status(200).json({ message: 'Buy order placed' })
  })

  router.put('/:id/config', async (req, res) => {
    const id = req.params.id
    let dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(dbBot._id.toString())
    dbBot = await bot.setConfig(req.body, true)
    res.status(200).json(dbBot)
  })

  router.delete('/:id', async (req, res) => {
    const id = req.params.id
    const dbBot = await botService.getBotById(id)
    if (!dbBot) {
      return res.status(404).json({ message: `Bot ${id} not found` })
    }
    const bot = getBot(id)
    await bot.pause()
    bot.purgeLogs()
    removeBot(id)
    await botService.deleteBot(id)
    res.status(200).json({ message: `Bot ${id} deleted` })
  })

  router.get('/:id/logs', async (req, res) => {
    onlyForAdmin(req, res, async (req, res) => {
      const id = req.params.id
      res
        .status(200)
        .json(await appService.getLogs(`./logs/${id}`, req.user, id))
    })
  })

  return router
}
