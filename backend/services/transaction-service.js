const Bot = require('../models/bot')
const Purchase = require('../models/purchase')
const Selling = require('../models/selling')
const CryptoProfit = require('../models/crypto-profit')
const ManualTransaction = require('../models/manual-transaction')
const { jsRound, getCurrentPrice } = require('../bot/utils')
require('dotenv').config()

module.exports = function (io, logger) {
  const { getBot } = require('../bot/all-bots')(io, logger)
  const savePurchase = async (purchase) => {
    return await new Purchase(purchase).save()
  }

  const saveSelling = async (purchase, selling) => {
    const newSelling = await new Selling(selling).save()
    await setPurchaseToSold(
      // Await to prevent race condition where same purchase gets multiple selling records
      purchase._id,
      newSelling._id
    )
    return newSelling
  }

  const getPurchases = async (userId) => {
    const items = await Purchase.find({ userId }, '-__v').lean()
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  const getSellings = async (userId) => {
    const items = await Selling.find({ userId }, '-__v').lean()
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  const getPurchaseById = async (purchaseId) => {
    return await Purchase.findById(purchaseId, '-__v').exec()
  }

  const getSellingById = async (sellingId) => {
    return await Selling.findById(sellingId, '-__v').exec()
  }

  const getTransactions = async (userId) => {
    const purchases = await getPurchases(userId)
    const sellings = await getSellings(userId)
    // sort all by date:
    return [...purchases, ...sellings].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  }

  const getBotPurchases = async (botId, useCache = false, bot = null) => {
    // Use cache if available and requested
    if (useCache && bot && bot.purchasesCache && bot.cacheLastUpdate) {
      const cacheAge = Date.now() - bot.cacheLastUpdate
      if (cacheAge < 5000) {
        // Cache valid for 5 seconds
        return bot.purchasesCache
      }
    }

    const purchases = await Purchase.find(
      { botId, isSold: false, isPaused: { $ne: true } },
      'targetPrice amount price paid fee isPaused isSold isEmergency profitMargin createdAt currency'
    ).lean()

    // Update cache if bot instance provided
    if (bot) {
      bot.purchasesCache = purchases
      bot.cacheLastUpdate = Date.now()
    }

    return purchases
  }

  const getBotPurchasesAboveTargetPrice = async (
    botId,
    price,
    useCache = false,
    bot = null
  ) => {
    // Use cache if available
    if (useCache && bot && bot.purchasesCache && bot.cacheLastUpdate) {
      const cacheAge = Date.now() - bot.cacheLastUpdate
      if (cacheAge < 5000) {
        return bot.purchasesCache.filter((p) => p.targetPrice <= price)
      }
    }

    return await Purchase.find(
      {
        botId,
        isSold: false,
        isPaused: { $ne: true },
        targetPrice: { $lte: price }
      },
      'targetPrice amount price paid fee isPaused isSold isEmergency profitMargin createdAt currency _id'
    ).lean()
  }

  const getBotPurchasesAbovePrice = async (botId, price) => {
    return await Purchase.find(
      { botId, isSold: false, isPaused: { $ne: true }, price: { $gt: price } },
      '-__v'
    ).lean()
  }

  const getBotPurchasesWithProfit = async (
    botId,
    price,
    kucoinFee,
    useCache = false,
    bot = null
  ) => {
    const dbBot = await Bot.findById(botId, 'config.fee').lean()
    const fee = dbBot.config.fee ? dbBot.config.fee / 100 : kucoinFee // legacy

    let purchases
    if (useCache && bot && bot.purchasesCache && bot.cacheLastUpdate) {
      const cacheAge = Date.now() - bot.cacheLastUpdate
      if (cacheAge < 5000) {
        purchases = bot.purchasesCache
      } else {
        purchases = await Purchase.find(
          { botId, isSold: false, isPaused: { $ne: true } },
          'amount price paid fee _id isEmergency profitMargin'
        ).lean()
      }
    } else {
      purchases = await Purchase.find(
        { botId, isSold: false, isPaused: { $ne: true } },
        'amount price paid fee _id isEmergency profitMargin'
      ).lean()
    }

    const toSell = purchases.filter((p) => {
      const totalPaid = p.paid ? p.paid + p.fee : p.amount * p.price // legacy
      const profit = price * p.amount * (1 - fee) - totalPaid
      return profit >= 0
    })
    return toSell
  }

  const setPurchaseToSold = async (purchaseId, sellingId) => {
    const purchase = await Purchase.findById(purchaseId).exec()
    if (!purchase) {
      throw new Error('Purchase not found')
    }
    purchase.isSold = true
    purchase.associatedSelling = sellingId
    await purchase.save()
  }

  const setNewMargin = async (purchaseId, margin, fee) => {
    const purchase = await Purchase.findById(purchaseId).exec()
    if (!purchase) return null
    purchase.profitMargin = margin
    const paid = purchase.paid
      ? purchase.paid + purchase.fee
      : purchase.amount * purchase.price // legacy
    purchase.targetPrice = jsRound(
      (paid * (1 + fee) * (1 + margin)) / purchase.amount
    )
    return await purchase.save()
  }

  const saveCryptoProfit = async (profit) => {
    return await new CryptoProfit(profit).save()
  }

  const getCryptoProfits = async (
    userId,
    exchange = null,
    timezoneOffset = 0
  ) => {
    const query = { userId }
    if (exchange) {
      // For kucoin, include legacy data where exchange is null or undefined
      if (exchange.toLowerCase() === 'kucoin') {
        query.$or = [
          { exchange },
          { exchange: null },
          { exchange: { $exists: false } }
        ]
      } else {
        query.exchange = exchange
      }
    }
    let profits = await CryptoProfit.find(query, '-__v').lean()
    profits = profits.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    const symbols = [...new Set(profits.map((p) => p.symbol))]
    const currentPrices = {}
    for (const symbol of symbols) {
      currentPrices[symbol] = await getCurrentPrice({ _id: userId }, symbol)
    }
    const totalCryptoProfit = profits
      .filter((p) => !p.simulation)
      .reduce((acc, cur) => acc + cur.amount * currentPrices[cur.symbol], 0)
    const totalCryptoProfitSiumlated = profits
      .filter((p) => p.simulation)
      .reduce((acc, cur) => acc + cur.amount * currentPrices[cur.symbol], 0)

    const sumsFn = (simul) =>
      profits
        .filter((p) => (simul ? p.simulation : !p.simulation))
        .reduce((acc, cur) => {
          if (!acc[cur.symbol]) acc[cur.symbol] = 0
          acc[cur.symbol] += cur.amount
          return acc
        }, {})

    const totalFn = (sums) =>
      Object.entries(sums).reduce(
        (acc, [k, v]) => acc + v * (k.startsWith('USD') ? 1 : currentPrices[k]),
        0
      )

    const profitsByCryptoFn = (simul) =>
      profits
        .filter((p) => (simul ? p.simulation : !p.simulation))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .reduce((acc, cur) => {
          if (!acc[cur.symbol]) acc[cur.symbol] = {}
          if (!acc.TOTAL) acc.TOTAL = {}
          const localDate = new Date(
            new Date(cur.date).getTime() - timezoneOffset * 60000
          )
          const dateKey = localDate.toISOString().split('T')[0]
          if (!acc[cur.symbol][dateKey]) {
            acc[cur.symbol][dateKey] = {
              totalAmount: 0,
              usd: 0,
              transactions: []
            }
          }
          if (!acc.TOTAL[dateKey]) {
            acc.TOTAL[dateKey] = { totalAmount: 0, usd: 0, transactions: [] }
          }
          if (!(cur.symbol === 'TOTAL' || cur.symbol.startsWith('USD'))) {
            acc[cur.symbol][dateKey].totalAmount += cur.amount
          }
          acc[cur.symbol][dateKey].usd += cur.symbol.startsWith('USD')
            ? cur.amount
            : cur.amount * currentPrices[cur.symbol]
          acc.TOTAL[dateKey].usd += cur.symbol.startsWith('USD')
            ? cur.amount
            : cur.amount * currentPrices[cur.symbol]
          acc[cur.symbol][dateKey].transactions.push(cur)
          acc.TOTAL[dateKey].transactions.push(cur)
          return acc
        }, {})

    const sums = sumsFn(false)
    const sumsSimulation = sumsFn(true)
    const total = totalFn(sums)
    const totalSimulation = totalFn(sumsSimulation)

    return {
      total: {
        real: totalCryptoProfit,
        simulation: totalCryptoProfitSiumlated
      },
      sumsByCrypto: {
        real: { TOTAL: total, ...sums },
        simulation: { TOTAL: totalSimulation, ...sumsSimulation }
      },
      profitsByCrypto: {
        real: profitsByCryptoFn(false),
        simulation: profitsByCryptoFn(true)
      }
    }
  }

  const deleteCryptoProfitHistory = async (
    userId,
    exchange,
    symbol,
    simulation
  ) => {
    const query = { userId, symbol, simulation }
    // For kucoin, include legacy data where exchange is null or undefined
    if (exchange.toLowerCase() === 'kucoin') {
      query.$or = [
        { exchange },
        { exchange: null },
        { exchange: { $exists: false } }
      ]
    } else {
      query.exchange = exchange
    }
    await CryptoProfit.deleteMany(query)
  }

  const getManualTransactions = async (symbol, userId) => {
    const transactions = await ManualTransaction.find(
      { currency: symbol, userId },
      '-__v'
    ).lean()
    return transactions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  }

  const pausePurchase = async (user, purchaseId) => {
    const purchase = await Purchase.findById(purchaseId).exec()
    if (!purchase) {
      throw new Error('Purchase not found')
    }
    purchase.isPaused = true
    await purchase.save()
    logger.info(`${user.username} paused purchase ${purchaseId}`)
    return purchase
  }

  const unpausePurchase = async (user, purchaseId) => {
    const purchase = await Purchase.findById(purchaseId).exec()
    if (!purchase) {
      throw new Error('Purchase not found')
    }
    purchase.isPaused = false
    await purchase.save()
    logger.info(`${user.username} unpaused purchase ${purchaseId}`)
    return purchase
  }

  const killPurchase = async (user, purchaseId) => {
    const purchase = await Purchase.findById(purchaseId).exec()
    if (!purchase) {
      throw new Error(`Purchase ${purchaseId} not found.`)
    }
    if (purchase.userId.toString() !== user._id.toString()) {
      throw new Error(
        `Purchase ${purchaseId} cannot be killed by user ${user._id}.`
      )
    }
    if (purchase.isSold) {
      throw new Error(
        `Purchase ${purchaseId} cannot be killed by user ${user._id}.`
      )
    }
    const bot = getBot(purchase.botId.toString())
    const p = await Purchase.findByIdAndDelete(purchaseId)
    if (bot) await bot.killOnePosition()
    return p
  }

  const getTotalInvestment = async (userId) => {
    const purchases = await Purchase.find(
      { userId, isSold: false },
      '-__v'
    ).lean()
    const targetBotIds = (
      await Bot.find(
        {
          userId,
          'config.simulation': false,
          'config.exchange': process.env.BOT_EXCHANGE
        },
        '_id config'
      ).lean()
    ).map((b) => b._id.toString())
    const totalInvestment = purchases.reduce((acc, purchase) => {
      if (targetBotIds.includes(purchase.botId.toString())) {
        const paid = purchase.paid
          ? purchase.paid + purchase.fee
          : purchase.amount * purchase.price // legacy
        return acc + paid
      }
      return acc
    }, 0)
    return totalInvestment
  }

  return {
    savePurchase,
    saveSelling,
    getPurchases,
    getSellings,
    getTransactions,
    killPurchase,
    getBotPurchases,
    getBotPurchasesAboveTargetPrice,
    getBotPurchasesAbovePrice,
    getBotPurchasesWithProfit,
    setPurchaseToSold,
    getPurchaseById,
    getSellingById,
    setNewMargin,
    saveCryptoProfit,
    getCryptoProfits,
    deleteCryptoProfitHistory,
    getManualTransactions,
    pausePurchase,
    unpausePurchase,
    getTotalInvestment
  }
}
