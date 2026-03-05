const bcrypt = require('bcrypt')
const User = require('../models/user')
const Exchange = require('../models/exchange')
const Bot = require('../models/bot')
const DailyProfit = require('../models/daily-profit')
const CryptoProfit = require('../models/crypto-profit')
const TotalProfit = require('../models/total-profit')
const { exchanges } = require('../auth/enums')
const { encrypt, decrypt, isEncrypted } = require('./encryption-service')
const saltRounds = 10

module.exports = function (io, logger) {
  const getById = async (userId) => await User.findById(userId).exec()

  const register = async (reqBody) => {
    const username = decodeData(reqBody.username).decodedData
    const password = decodeData(reqBody.password).decodedData
    if (username.length > 16 || username.length < 4) {
      return { status: 400, message: 'ERROR_INVALID_USERNAME' }
    } else {
      let sameUsers = await User.find({}, 'username').lean()
      sameUsers = sameUsers.filter(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      )
      if (sameUsers.length)
        return { status: 400, message: 'ERROR_USERNAME_ALREADY_EXISTS' }
      // manage the password encryption

      const hash = await bcrypt.hash(password, saltRounds)
      const user = new User({
        createdAt: new Date().toISOString(),
        username,
        password: hash,
        permissions: ['user'],
        exchangeApiKeys: reqBody.exchangeApiKeys // keep it encoded for storage
      })
      await user.save()
      return { status: 200, message: 'SUCCESS_REGISTRATION' }
    }
  }

  const decodeData = (data) => {
    // console.log(data)
    let decodedData = null
    try {
      decodedData = decodeURIComponent(escape(atob(data)))
      decodedData = decodedData.substring(4)
      const noiseLength = parseInt(decodedData.substring(0, 2))
      decodedData = decodedData.substring(2 + noiseLength)
      decodedData = decodeURIComponent(escape(atob(decodedData)))
      // console.log(decodedData)
      decodedData = JSON.parse(decodedData)
      return { data, decodedData, success: true }
    } catch (e) {
      console.log('Invalid data: ', e)
      return { data, decodedData, success: false, error: e }
    }
  }

  const update = async (userId, update) => {
    let user = await User.findById(userId).exec()
    user = Object.assign(user, update)
    if (update.password)
      user.password = await bcrypt.hash(update.password, saltRounds)
    return await user.save()
  }

  const updateTotalProfit = async (userId, newProfit, isSimulation) => {
    let p = await TotalProfit.findOne({
      userId,
      exchange: process.env.BOT_EXCHANGE
    }).exec()
    if (!p) {
      p = new TotalProfit({
        userId,
        exchange: process.env.BOT_EXCHANGE,
        profit: isSimulation ? 0 : newProfit,
        profitSimulated: isSimulation ? newProfit : 0
      })
    } else {
      p.profit += isSimulation ? 0 : newProfit
      p.profitSimulated += isSimulation ? newProfit : 0
    }
    return await p.save()
  }

  const updateDailyProfit = async (
    userId,
    exchange,
    symbol,
    newProfit,
    isSimulation
  ) => {
    const date = new Date().toISOString().split('T')[0]
    let dailyProfit = await DailyProfit.findOne({
      userId,
      exchange,
      symbol,
      date
    }).exec()
    if (!dailyProfit) {
      dailyProfit = new DailyProfit({
        date,
        userId,
        exchange,
        symbol,
        profit: 0,
        profitSimulated: 0
      })
    }
    if (isSimulation) {
      dailyProfit.profitSimulated += newProfit
    } else {
      dailyProfit.profit += newProfit
    }
    return await dailyProfit.save()
  }

  const getDailyProfitsForPeriod = async (
    userId,
    exchange,
    type = 'profit' /* or profitSimulated */,
    period = 'week'
  ) => {
    let dateFrom = new Date()
    const dateTo = new Date().toISOString().split('T')[0]
    switch (period) {
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7)
        dateFrom = dateFrom.toISOString().split('T')[0]
        break
      case 'month':
        dateFrom.setDate(dateFrom.getDate() - 30)
        dateFrom = dateFrom.toISOString().split('T')[0]
        break
      case 'year':
        dateFrom.setDate(dateFrom.getDate() - 365)
        dateFrom = dateFrom.toISOString().split('T')[0]
        break
      default:
        return []
    }
    const query = {
      userId,
      [type]: { $ne: 0 },
      date: {
        $gte: dateFrom,
        $lte: dateTo
      }
    }
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
    let profits = await DailyProfit.find(query).lean()
    profits = profits.map((p) => ({ ...p, profit: p[type] }))
    const seriesMap = new Map()
    const dates = [...new Set(profits.map((p) => p.date))].sort((a, b) => a - b) // Get sorted unique dates
    const dateIndex = new Map(dates.map((date, index) => [date, index])) // Map dates to index
    profits.forEach(({ date, symbol, profit }) => {
      const cur = symbol.replace(/-?USD(T|C)?$/, '')
      if (!seriesMap.has(cur)) {
        seriesMap.set(cur, Array(dates.length).fill(null))
      }
      seriesMap.get(cur)[dateIndex.get(date)] = profit
    })
    return {
      dates,
      series: Array.from(seriesMap, ([name, values]) => ({ name, values }))
    }
  }

  const deleteSimulatedProfits = async (userId, exchange) => {
    await CryptoProfit.deleteMany({ userId, exchange, simulation: true }).exec()
    await TotalProfit.updateOne(
      { userId, exchange },
      { $set: { profitSimulated: 0 } }
    ).exec()
    const profits = await DailyProfit.deleteMany({
      userId,
      exchange,
      profitSimulated: { $ne: 0 }
    }).exec()
    return profits
  }

  const updateFavorites = async (userId, exchangeName, favorites) => {
    let exchange = await Exchange.findOne({ userId, name: exchangeName }).exec()
    if (!exchange) {
      return []
    }
    exchange.favorites = favorites
    exchange = await exchange.save()
    return exchange.favorites
  }

  const getExchanges = async (userId) => {
    const exchanges = await Exchange.find({ userId }).lean()

    // Decrypt API keys before returning (they remain encoded for frontend)
    const decryptedExchanges = exchanges.map((ex) => {
      try {
        return {
          ...ex,
          apiKey:
            ex.apiKey && isEncrypted(ex.apiKey)
              ? decrypt(ex.apiKey) // Decrypt but keep encoded
              : ex.apiKey,
          apiSecret:
            ex.apiSecret && isEncrypted(ex.apiSecret)
              ? decrypt(ex.apiSecret) // Decrypt but keep encoded
              : ex.apiSecret,
          apiPassphrase:
            ex.apiPassphrase && isEncrypted(ex.apiPassphrase)
              ? decrypt(ex.apiPassphrase) // Decrypt but keep encoded
              : ex.apiPassphrase
        }
      } catch (error) {
        console.error(
          `Failed to decrypt exchange ${ex.name} for user ${userId}:`,
          error.message
        )
        // Return with masked values if decryption fails
        return {
          ...ex,
          apiKey: '***DECRYPTION_ERROR***',
          apiSecret: '***DECRYPTION_ERROR***',
          apiPassphrase: ex.apiPassphrase ? '***DECRYPTION_ERROR***' : undefined
        }
      }
    })

    return decryptedExchanges.sort((a, b) => a.name.localeCompare(b.name))
  }

  const saveExchange = async (userId, exchange) => {
    if (!exchanges.includes(exchange.name)) return false
    let ex = await Exchange.findOne({ userId, name: exchange.name }).exec()

    // Encrypt API keys before saving (they come encoded from frontend)
    // We encrypt the encoded values for security at rest
    const encryptedApiKey = exchange.apiKey
      ? encrypt(exchange.apiKey) // Encrypt the encoded key
      : undefined
    const encryptedApiSecret = exchange.apiSecret
      ? encrypt(exchange.apiSecret) // Encrypt the encoded secret
      : undefined
    const encryptedApiPassphrase = exchange.apiPassphrase
      ? encrypt(exchange.apiPassphrase) // Encrypt the encoded passphrase
      : undefined

    if (ex) {
      ex.apiKey = encryptedApiKey
      ex.apiSecret = encryptedApiSecret
      ex.apiPassphrase = encryptedApiPassphrase
    } else {
      ex = new Exchange({
        createdAt: new Date().toISOString(),
        userId,
        name: exchange.name,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        apiPassphrase: encryptedApiPassphrase
      })
    }
    return await ex.save()
  }

  const deleteExchange = async (userId, exchangeId) => {
    const exchange = await Exchange.findOneAndDelete({
      userId,
      _id: exchangeId
    }).exec()
    if (!exchange) return false
    return exchange
  }

  const getExchangeByName = async (userId, exchangeName) => {
    const exchanges = await Exchange.find({ userId }).lean()
    const exchange = exchanges.find(
      (ex) => ex.name.toLowerCase() === exchangeName.toLowerCase()
    )

    if (!exchange) return null

    // Decrypt API keys before returning (they remain encoded for bot usage)
    try {
      return {
        ...exchange,
        apiKey:
          exchange.apiKey && isEncrypted(exchange.apiKey)
            ? decrypt(exchange.apiKey) // Decrypt but keep encoded
            : exchange.apiKey,
        apiSecret:
          exchange.apiSecret && isEncrypted(exchange.apiSecret)
            ? decrypt(exchange.apiSecret) // Decrypt but keep encoded
            : exchange.apiSecret,
        apiPassphrase:
          exchange.apiPassphrase && isEncrypted(exchange.apiPassphrase)
            ? decrypt(exchange.apiPassphrase) // Decrypt but keep encoded
            : exchange.apiPassphrase
      }
    } catch (error) {
      console.error(
        `Failed to decrypt exchange ${exchangeName} for user ${userId}:`,
        error.message
      )
      throw new Error('Failed to decrypt exchange credentials', {
        cause: error
      })
    }
  }

  const getAllUsersWithDetails = async () => {
    const users = await User.find({}, '-password -kucoinApiKeys -__v').lean()
    // Get exchanges for each user (without sensitive data) - only those with API keys defined
    const userIds = users.map((u) => u._id)
    const exchanges = await Exchange.find(
      {
        userId: { $in: userIds },
        apiKey: { $exists: true, $ne: null },
        apiSecret: { $exists: true, $ne: null }
      },
      '-apiKey -apiSecret -apiPassphrase -__v'
    ).lean()
    // console.log(exchanges)

    // Get bots for each user
    const bots = await Bot.find(
      { userId: { $in: userIds } },
      'userId config.exchange config.simulation'
    ).lean()
    // console.log(bots)

    // Get profits for all users
    const totalProfits = await TotalProfit.find(
      { userId: { $in: userIds } },
      'userId exchange profit profitSimulated'
    ).lean()

    const cryptoProfits = await CryptoProfit.find(
      { userId: { $in: userIds } },
      'userId exchange symbol amount simulation'
    ).lean()

    // Get unique crypto symbols to fetch prices (excluding USDT/USD which are direct profits)
    const cryptoSymbols = new Set()
    cryptoProfits.forEach((cp) => {
      const symbol = cp.symbol?.toUpperCase()
      if (symbol && symbol !== 'USDT' && symbol !== 'USD') {
        // Add as trading pair (e.g., BTC/USDT)
        cryptoSymbols.add(`${symbol}`)
      }
    })

    // Fetch current prices for all crypto symbols
    const { getPrices } = require('../bot/all-prices')(io, logger)
    let currentPrices = {}
    if (cryptoSymbols.size > 0 && users.length > 0) {
      try {
        // Use first user with exchanges for price fetching
        const userWithExchange = users.find((u) =>
          exchanges.some((ex) => ex.userId.toString() === u._id.toString())
        )
        if (userWithExchange) {
          currentPrices = await getPrices(
            userWithExchange,
            Array.from(cryptoSymbols)
          )
        }
      } catch (error) {
        console.error('Error fetching crypto prices:', error)
      }
    }

    // Map exchanges and bot counts to users
    const usersWithExchanges = users.map((user) => {
      const userExchanges = exchanges.filter(
        (ex) => ex.userId.toString() === user._id.toString()
      )
      const userBots = bots.filter(
        (bot) => bot.userId.toString() === user._id.toString()
      )

      // Calculate bot counts per exchange
      const exchangesWithBots = userExchanges.map((exchange) => {
        const exchangeBots = userBots.filter(
          (bot) =>
            bot.config.exchange.toLowerCase() === exchange.name.toLowerCase()
        )
        const normalBots = exchangeBots.filter(
          (bot) => !bot.config.simulation
        ).length
        const simulationBots = exchangeBots.filter(
          (bot) => bot.config.simulation
        ).length

        return {
          ...exchange,
          botCount: {
            normal: normalBots,
            simulation: simulationBots
          }
        }
      })

      // Aggregate profits by exchange and simulation type
      const userProfits = []
      const userTotalProfits = totalProfits.filter(
        (p) => p.userId.toString() === user._id.toString()
      )
      const userCryptoProfits = cryptoProfits.filter(
        (p) => p.userId.toString() === user._id.toString()
      )

      // Group by exchange
      const profitsByExchange = {}

      // USD profits from TotalProfit records
      userTotalProfits.forEach((tp) => {
        const key = tp.exchange
        if (!profitsByExchange[key]) {
          profitsByExchange[key] = {
            real: { usd: 0, usdt: 0 },
            simulated: { usd: 0, usdt: 0 }
          }
        }
        profitsByExchange[key].real.usd += tp.profit || 0
        profitsByExchange[key].simulated.usd += tp.profitSimulated || 0
      })

      // Crypto profits from CryptoProfit records (converted to USD)
      userCryptoProfits.forEach((cp) => {
        const key = cp.exchange
        if (!profitsByExchange[key]) {
          profitsByExchange[key] = {
            real: { usd: 0, usdt: 0 },
            simulated: { usd: 0, usdt: 0 }
          }
        }

        const symbol = cp.symbol?.toUpperCase()
        const amount = cp.amount || 0

        // Only process actual crypto (not USDT/USD which are already in TotalProfit)
        if (symbol && symbol !== 'USDT' && symbol !== 'USD') {
          // Crypto profit - convert to USD using current price
          const currentPrice = currentPrices[symbol]?.price || 0
          const usdValue = amount * currentPrice

          if (cp.simulation) {
            profitsByExchange[key].simulated.usdt += usdValue
          } else {
            profitsByExchange[key].real.usdt += usdValue
          }
        }
      })

      // Convert to array format
      Object.keys(profitsByExchange).forEach((exchange) => {
        userProfits.push({
          exchange,
          simulation: false,
          usd: profitsByExchange[exchange].real.usd,
          usdt: profitsByExchange[exchange].real.usdt
        })
        userProfits.push({
          exchange,
          simulation: true,
          usd: profitsByExchange[exchange].simulated.usd,
          usdt: profitsByExchange[exchange].simulated.usdt
        })
      })

      return {
        ...user,
        exchanges: exchangesWithBots,
        profits: userProfits
      }
    })

    return usersWithExchanges
  }

  return {
    getById,
    register,
    decodeData,
    update,
    updateTotalProfit,
    updateDailyProfit,
    getDailyProfitsForPeriod,
    deleteSimulatedProfits,
    updateFavorites,
    getExchanges,
    saveExchange,
    deleteExchange,
    getExchangeByName,
    getAllUsersWithDetails
  }
}
