const fs = require('fs')
const Bot = require('../models/bot')
const Purchase = require('../models/purchase')
const Selling = require('../models/selling')
const MemoryBot = require('../bot/bot')
const { getCurrentPrice, getTradingPairs } = require('../bot/utils')
const User = require('../models/user')
require('dotenv').config()

module.exports = function (io, logger) {
  const { addBot, getBots, listBots, removeBot } = require('../bot/all-bots')(
    io,
    logger
  )
  const { getPrices, cleanPrices } = require('../bot/all-prices')(io, logger)
  const { jsRound } = require('../bot/utils')

  const getAllUserBots = async (userId) => {
    return await Bot.find(
      { userId, 'config.exchange': process.env.BOT_EXCHANGE },
      '-__v'
    ).lean()
  }

  const getBotsByUserAndExchange = async (userId, exchange) => {
    const bots = await Bot.find(
      { userId, 'config.exchange': exchange },
      '-__v'
    ).lean()

    // Add next selling transaction with profit for each bot
    for (const bot of bots) {
      const purchases = await Purchase.find({
        botId: bot._id,
        targetPrice: { $exists: true },
        isSold: false,
        isPaused: false
      })
        .sort({ targetPrice: 1 })
        .limit(1)
        .lean()

      if (purchases.length > 0) {
        const next = purchases[0]
        // Calculate profit
        const profit = next.paid
          ? bot.currentPrice * next.amount * (1 - bot.config.fee / 100) -
            (next.paid + next.fee)
          : (bot.currentPrice - next.price) * next.amount // legacy

        bot.nextSellingTransaction = { ...next, profit }
      } else {
        bot.nextSellingTransaction = null
      }
    }

    return bots
  }

  const getCurrentPrices = async (user) => {
    const userBots = listBots().filter((bot) => bot.userId.equals(user._id))
    const symbols = userBots.map((bot) => bot.symbol)
    return await getPrices(user, symbols)
  }

  const getAllBots = async () => {
    return await Bot.find({
      'config.exchange': process.env.BOT_EXCHANGE
    }).lean()
  }

  const restoreMemoryBots = async () => {
    const memoryBots = getBots() // Get actual bot objects, not just metadata
    const dbBots = await getAllBots()
    if (dbBots.length === 0) {
      logger.info(
        `No bots found in database for exchange ${process.env.BOT_EXCHANGE}.`
      )
      return
    }
    logger.info(`Currently ${memoryBots.length} bots in memory`)
    for (const dbBot of dbBots) {
      try {
        logger.info(
          `Found bot ${dbBot._id.toString()} (${dbBot.config.exchange}) in database for user ${dbBot.userId} ${dbBot.hasStarted ? '[STARTED]' : ''} ${dbBot.isPaused ? '[PAUSED]' : ''}`
        )
        const user = await User.findById(dbBot.userId).exec()
        // Check if bot already exists in memory using actual bot objects
        const botInMemory = memoryBots.find(
          (b) => b.getId() === dbBot._id.toString()
        )
        if (botInMemory) {
          logger.warn(
            `⚠️  Bot ${dbBot._id.toString()} is already in memory! Skipping restoration to prevent duplicate.`
          )
          // Safety check: if bot was supposed to start but is already running, ensure it's in correct state
          if (dbBot.hasStarted && !botInMemory.hasStarted()) {
            logger.info(
              `  Starting already-loaded bot ${dbBot._id.toString()}...`
            )
            botInMemory.start().catch((err) => {
              logger.error(
                `Failed to start already-loaded bot ${dbBot._id.toString()}: ${err.message}`
              )
            })
          }
          if (dbBot.isPaused && !botInMemory.isPaused()) {
            logger.info(
              `  Pausing already-loaded bot ${dbBot._id.toString()}...`
            )
            botInMemory.pause().catch((err) => {
              logger.error(
                `Failed to pause already-loaded bot ${dbBot._id.toString()}: ${err.message}`
              )
            })
          }
          continue
        }
        logger.info(
          `Bot ${dbBot._id.toString()} (${dbBot.config.exchange}) not found in memory, restoring...`
        )
        const newBot = new MemoryBot(
          dbBot._id.toString(),
          user,
          dbBot.config,
          io,
          logger
        )
        newBot.setState(
          {
            cycles: dbBot.cycles,
            freePositions: dbBot.freePositions,
            lastHighestPrice: dbBot.lastHighestPrice,
            totalProfit: dbBot.totalProfit,
            totalProfitCrypto: dbBot.totalProfitCrypto,
            totalTransactions: dbBot.totalTransactions,
            stopBuying: dbBot.stopBuying,
            positionBoost: dbBot.positionBoost,
            usdtBoost: dbBot.usdtBoost,
            currentPrice: dbBot.currentPrice,
            currentThresholdIndex: dbBot.currentThresholdIndex,
            activeEmergencyPositions: dbBot.activeEmergencyPositions,
            lastSoldPrice: dbBot.lastSoldPrice
          },
          false
        )
        newBot.setStatus(dbBot.hasStarted, dbBot.isPaused, false)
        newBot.logFreePositions()
        addBot(newBot)
        if (dbBot.hasStarted) {
          newBot.start()
        }
        if (dbBot.isPaused) newBot.pause()
      } catch (error) {
        logger.error(
          `Error restoring bot ${dbBot._id.toString()}: ${error.message}`
        )
        // Continue with next bot instead of crashing
      }
    }
  }

  const createBot = async (user, config) => {
    const dbBot = new Bot({
      createdAt: new Date().toISOString(),
      userId: user._id,
      config
    })
    dbBot.freePositions = config.maxPositions
    dbBot.openingPrice = await getCurrentPrice(user, config.symbol)
    return await dbBot.save()
  }

  const getBotListByUserId = async (userId) => {
    const items = await Bot.find(
      { userId, 'config.exchange': ' process.env.BOT_EXCHANGE' },
      '-__v'
    ).lean()
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  const getBotById = async (botId) => {
    try {
      return await Bot.findById(botId, '-__v').exec()
    } catch (e) {
      return null
    }
  }

  const getBotTransactions = async (user, botId) => {
    try {
      const dbBot = await Bot.findById(botId, '-__v').exec()
      const currentPrice = await getCurrentPrice(user, dbBot.config.symbol)
      const purchases = await Purchase.find({ botId }, '-__v').lean()
      const sellings = await Selling.find({ botId }, '-__v').lean()
      return [...purchases, ...sellings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((transaction) => ({
          ...transaction,
          isSimulation: dbBot.config.simulation,
          total: jsRound(transaction.price * transaction.amount),
          profit:
            transaction.targetPrice && !transaction.isSold && currentPrice
              ? transaction.paid
                ? jsRound(
                    currentPrice *
                      transaction.amount *
                      (1 - dbBot.config.fee / 100) -
                      (transaction.paid + transaction.fee)
                  )
                : jsRound(
                    // legacy
                    (currentPrice - transaction.price) * transaction.amount
                  )
              : transaction.profit
        }))
    } catch (e) {
      logger.error(`Error getting transactions for bot ${botId}: ${e.message}`)
      return null
    }
  }

  const updateBotData = async (botId, update) => {
    const dbBot = await Bot.findById(botId).exec()
    if (!dbBot) return null
    return await Bot.findByIdAndUpdate(botId, update, { new: true }).exec()
  }

  const deleteBot = async (botId) => {
    logger.info(`Deleting bot ${botId}`)
    let dbBot = await Bot.findById(botId).exec()
    if (!dbBot) return null
    logger.info(`Deleting all transactions for bot ${botId}`)
    await Purchase.deleteMany({ botId }).exec()
    await Selling.deleteMany({ botId }).exec()
    dbBot = await Bot.deleteMany({ _id: botId })
    removeBot(botId)
    cleanPrices()
    return dbBot
  }

  const purgeOldTransactions = async () => {
    // Keep only the last 100 transactions of each bot but always keep unsold ones
    const transactionsToKeep = 100
    const purchases = await Purchase.find({}, '-__v').lean()
    const sellings = await Selling.find({}, '-__v').lean()
    const allTransactions = [
      ...purchases.filter((p) => p.isSold),
      ...sellings
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    // Group transactions by bot:
    const transactionsByBot = {}
    for (const t of allTransactions) {
      if (!transactionsByBot[t.botId]) transactionsByBot[t.botId] = []
      transactionsByBot[t.botId].push(t)
    }
    // Purge old transactions for each bot:
    for (const [, transactions] of Object.entries(transactionsByBot)) {
      const toDelete = transactions.slice(transactionsToKeep)
      if (toDelete.length === 0) continue
      // logger.info(
      //   `Purging ${toDelete.length} old transactions for bot ${botId}`
      // )
      for (const transaction of toDelete) {
        if (transaction.targetPrice) {
          await Purchase.deleteOne({ _id: transaction._id }).exec()
        } else {
          await Selling.deleteOne({ _id: transaction._id }).exec()
        }
      }
    }
  }

  const purgeOldLogs = async () => {
    // purge log files of bots that do not exist anymore
    const dbBots = await getAllBots()
    const botIds = dbBots.map((b) => b._id.toString())

    // Create logs directory if it doesn't exist
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true })
      return
    }

    const fsItems = fs.readdirSync('./logs')
    for (const item of fsItems) {
      const itemPath = `./logs/${item}`
      if (fs.lstatSync(itemPath).isDirectory()) {
        if (!botIds.includes(item)) {
          logger.info(`Purging logs of bot ${item}`)
          fs.rmSync(itemPath, { recursive: true })
        }
      }
    }
  }

  const updateCryptoProperties = async () => {
    // Update the configurations of all bots
    const dbBots = await Bot.find({
      'config.exchange': process.env.BOT_EXCHANGE
    }).exec()
    let pairs = null
    const bots = getBots()
    for (const dbBot of dbBots) {
      if (!pairs) {
        // get trading pairs only once from the exchange platform
        const user = await User.findById(dbBot.userId).exec()
        pairs = await getTradingPairs(user) // symbol, baseMinSize, baseIncrement
      }
      const pair = pairs.find((p) => p.symbol === dbBot.config.symbol)
      if (!pair) {
        logger.error(
          `Trading pair ${dbBot.config.symbol} not found for bot ${dbBot._id}`
        )
      } else {
        let updated = false
        const oldSymbolMinSize = dbBot.config.symbolMinSize
        const oldSymbolIncrement = dbBot.config.symbolIncrement
        if (oldSymbolMinSize !== pair.baseMinSize * 1) {
          dbBot.config.symbolMinSize = pair.baseMinSize * 1
          logger.info(
            `Updating bot ${dbBot._id} (${dbBot.config.symbol}) with new symbolMinSize: ${pair.baseMinSize} (was ${oldSymbolMinSize})`
          )
          updated = true
        }
        if (oldSymbolIncrement !== pair.baseIncrement * 1) {
          dbBot.config.symbolIncrement = pair.baseIncrement * 1
          logger.info(
            `Updating bot ${dbBot._id} (${dbBot.config.symbol}) with new symbolIncrement: ${pair.baseIncrement} (was ${oldSymbolIncrement})`
          )
          updated = true
        }
        if (updated) {
          await dbBot.save()
          logger.info(
            `Updating in-memory bot ${dbBot._id} (${dbBot.config.symbol}) with new properties`
          )
          bots
            .find((b) => b.id === dbBot._id.toString())
            ?.setConfig(dbBot.config, false)
        }
      }
    }
  }

  const cleanPricesCache = () => {
    cleanPrices()
    logger.info('Cleaned prices cache')
  }

  const exportBotConfigs = async (userId, exchange, botIds = null) => {
    const query = {
      userId,
      'config.exchange': { $regex: new RegExp(`^${exchange}$`, 'i') }
    }

    // If specific bot IDs are provided, filter by them
    if (botIds && botIds.length > 0) {
      query._id = { $in: botIds }
    }

    const bots = await Bot.find(query, '-__v').lean()
    logger.info(
      `Exporting ${bots.length} bot configs for user ${userId} and exchange ${exchange}`
    )
    return bots.map((bot) => ({
      exchange: bot.config.exchange,
      label: bot.config.label,
      symbol: bot.config.symbol,
      botInterval: bot.config.botInterval,
      fee: bot.config.fee,
      symbolMinSize: bot.config.symbolMinSize,
      symbolIncrement: bot.config.symbolIncrement,
      priceDropThreshold: bot.config.priceDropThreshold,
      priceDropThresholds: bot.config.priceDropThresholds,
      profitMargin: bot.config.profitMargin,
      maxPositions: bot.config.maxPositions,
      positionsToRebuy: bot.config.positionsToRebuy,
      maxInvestment: bot.config.maxInvestment,
      minWorkingPrice: bot.config.minWorkingPrice,
      maxWorkingPrice: bot.config.maxWorkingPrice,
      convertProfitToCrypto: bot.config.convertProfitToCrypto,
      reuseProfitToMaxPositions: bot.config.reuseProfitToMaxPositions,
      reuseProfit: bot.config.reuseProfit,
      simulation: bot.config.simulation
    }))
  }

  const importBotConfigs = async (user, exchange, configs) => {
    const results = []

    // Validate that all configs match the selected exchange
    const invalidExchange = configs.find(
      (config) =>
        config.exchange &&
        config.exchange.toLowerCase() !== exchange.toLowerCase()
    )
    if (invalidExchange) {
      throw new Error(
        `Config mismatch: Expected exchange "${exchange}" but found "${invalidExchange.exchange}".`
      )
    }

    for (const config of configs) {
      try {
        let finalLabel = config.label

        // Check if a bot with the same label already exists
        if (finalLabel) {
          const existingBots = await Bot.find(
            {
              userId: user._id,
              'config.label': {
                $regex: new RegExp(
                  `^${finalLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\d+)?$`
                )
              }
            },
            'config.label'
          ).lean()

          if (existingBots.length > 0) {
            // Extract existing numbers
            const existingNumbers = existingBots
              .map((bot) => {
                const match = bot.config.label.match(
                  new RegExp(
                    `^${finalLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`
                  )
                )
                return match
                  ? parseInt(match[1])
                  : bot.config.label === finalLabel
                    ? 1
                    : 0
              })
              .filter((num) => num > 0)

            // Find next available number
            const nextNumber =
              existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2
            finalLabel = `${finalLabel} ${nextNumber}`
          }
        }

        const fullConfig = {
          ...config,
          label: finalLabel,
          exchange: config.exchange || exchange,
          exchangeAsset: process.env.EXCHANGE_ASSET || 'USDT'
        }
        const dbBot = await createBot(user, fullConfig)
        const bot = new MemoryBot(
          dbBot._id.toString(),
          user,
          dbBot.config,
          io,
          logger
        )
        addBot(bot)
        results.push({ success: true, config: config.label || config.symbol })
      } catch (error) {
        results.push({
          success: false,
          config: config.label || config.symbol,
          error: error.message
        })
      }
    }
    return results
  }

  return {
    getCurrentPrices,
    getAllUserBots,
    getBotsByUserAndExchange,
    getAllBots,
    restoreMemoryBots,
    createBot,
    getBotListByUserId,
    getBotById,
    getBotTransactions,
    updateBotData,
    deleteBot,
    purgeOldTransactions,
    purgeOldLogs,
    updateCryptoProperties,
    cleanPricesCache,
    exportBotConfigs,
    importBotConfigs
  }
}
