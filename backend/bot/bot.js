require('dotenv').config()
require('colors')
const {
  jsRound,
  getTradingPairs,
  getMinimumSize,
  placeOrder,
  getCryptoBalance,
  botLog
} = require('./utils')
const { getPrices } = require('./all-prices')(null, console)
const BotLogger = require('./bot-logger')

class MemoryBot {
  constructor(id, user, config = null, io = null, logger = console) {
    this.id = id
    this.user = user
    this.config = config
    this.io = io
    this.logger = new BotLogger(id)
    if (!this.config.exchangeAsset) this.config.exchangeAsset = 'USDT' // KuCoin legacy
    this.cryptoName = this.config.symbol.replace(
      new RegExp(`-?${this.getExchangeAsset()}$`),
      ''
    )
    this.minimumSize = 0
    this.exchangeFee = 0.001 // default for legacy
    // Operation locking to prevent concurrent operations on same bot
    this.operationQueue = Promise.resolve()
    // Bot state:
    this.cycles = 0
    this.freePositions = config.maxPositions
    this.lastHighestPrice = 0
    this.totalProfit = 0
    this.totalProfitCrypto = 0
    this.totalTransactions = 0
    this.stopBuyingOnDrop = false
    this.stopBuyingOnRebuy = false
    this.positionBoost = 0
    this.usdtBoost = 0
    this.currentPrice = null
    this.currentThresholdIndex = 0
    this.soldEmergency = false
    this.activeEmergencyPositions = 0
    this.lastSoldPrice = 0
    // Bot status:
    this.started = false
    this.paused = false
    // Purchases cache for performance:
    this.purchasesCache = null
    this.cacheLastUpdate = null
    // Associated services:
    this.botService = require('../services/bot-service')(io, logger)
    this.transactionService = require('../services/transaction-service')(
      io,
      logger
    )
    this.userService = require('../services/user-service')(io, logger)
  }

  getExchangeAsset() {
    return this.config.exchangeAsset || 'USDT' // KuCoin legacy
  }

  getCurrentThreshold() {
    // Support both legacy single threshold and new threshold array
    if (
      this.config.priceDropThresholds &&
      Array.isArray(this.config.priceDropThresholds) &&
      this.config.priceDropThresholds.length > 0
    ) {
      const index = Math.min(
        this.currentThresholdIndex,
        this.config.priceDropThresholds.length - 1
      )
      return this.config.priceDropThresholds[index]
    }
    // Legacy: use single priceDropThreshold
    return this.config.priceDropThreshold
  }

  purgeLogs() {
    this.logger.terminate()
  }

  log(msg) {
    botLog(
      `${this.user.username} - ${this.id} - Cycle ${this.cycles} (${this.config.symbol})`,
      msg,
      this.logger
    )
  }

  getId() {
    return this.id
  }

  getSymbol() {
    return this.config.symbol
  }

  getUserId() {
    return this.user._id
  }

  hasStarted() {
    return this.started
  }

  isPaused() {
    return this.paused
  }

  logFreePositions() {
    // const positions = this.freePositions
    // const extra = this.positionBoost
    //   ? ` (including a boost of ${this.positionBoost} position${this.positionBoost > 1 ? 's' : ''})`
    //   : ''
    // this.log(
    //   `🅿️  There ${Math.abs(positions) > 1 ? 'are' : 'is'} ${positions} free position${Math.abs(positions) > 1 ? 's' : ''}${extra}`
    // )
  }

  roundToCurrencyDigits(num, method = Math.round) {
    if (num === 0) return 0
    const str = (
      this.config.symbolIncrement || /* legacy */ this.minimumSize
    ).toString()
    if (str.indexOf('.') === -1 && str.indexOf('1e') === -1) {
      // No decimal part
      return method(num)
    }
    const digits = Number(
      str.startsWith('1e')
        ? str.replace(/1e(-)?/, '')
        : str.split('.')[1].length
    )
    const result = method(10 ** digits * num) / 10 ** digits
    // this.log(`roundToCurrencyDigits, ${num}, ${str}, ${digits}, ${result}`)
    return result
  }

  setExchangeApiKeys({ apiKey, apiSecret, apiPassphrase }) {
    this.user.exchange = { apiKey, apiSecret, apiPassphrase }
    this.log(
      `⚙️  Exchange API keys have just been updated for ${process.env.BOT_EXCHANGE}.`
    )
  }

  async setConfig(config, updateDb = true) {
    const oldMaxPositions = this.config.maxPositions
    const diffPositions = config.maxPositions - oldMaxPositions
    this.freePositions += diffPositions
    this.logFreePositions()
    this.config = config
    this.setPositionBoost()
    this.setUsdBoost()
    if (updateDb)
      return await this.botService.updateBotData(this.id, {
        freePositions: this.freePositions,
        positionBoost: this.positionBoost,
        usdtBoost: this.usdtBoost,
        config
      })
  }

  async killOnePosition() {
    this.freePositions++
    await this.botService.updateBotData(this.id, {
      freePositions: this.freePositions
    })
  }

  async setState(botState, updateDb = true) {
    this.freePositions = botState.freePositions
    this.lastHighestPrice = botState.lastHighestPrice
    this.lastSoldPrice = botState.lastSoldPrice || 0
    this.totalProfit = botState.totalProfit
    this.totalProfitCrypto = botState.totalProfitCrypto || 0
    this.totalTransactions = botState.totalTransactions
    this.cycles = botState.cycles
    this.stopBuyingOnDrop = botState.stopBuyingOnDrop || false
    this.stopBuyingOnRebuy = botState.stopBuyingOnRebuy || false
    this.positionBoost = botState.positionBoost || 0
    this.usdtBoost = botState.usdtBoost
    this.currentThresholdIndex = botState.currentThresholdIndex || 0
    this.soldEmergency = false
    if (updateDb) await this.botService.updateBotData(this.id, botState)
    this.log(`⚙️  Bot state restored: ${JSON.stringify(botState)}`.magenta)
  }

  async setStatus(hasStarted, isPaused, updateDb = true) {
    this.started = hasStarted
    this.paused = isPaused
    if (updateDb)
      await this.botService.updateBotData(this.id, { hasStarted, isPaused })
    this.log(
      `⚙️  Bot status restored: ${JSON.stringify({ hasStarted, isPaused })}`
        .magenta
    )
  }

  async setMinimumSize() {
    try {
      // legacy
      // Fetch the minimum purchase size for the selected symbol
      const minimumSize = await getMinimumSize(this.user, this.config.symbol)
      if (!minimumSize) {
        this.log(
          `❌ [ERROR] Failed to fetch minimum size for ${this.config.symbol}. Exiting.`
        )
        return false
      }
      this.minimumSize = minimumSize
      this.config.symbolMinSize = minimumSize
      return true
    } catch (error) {
      this.log(`❌ [ERROR] Failed to fetch minimum size: ${error.message}`)
      this.log(`❌ This is likely due to invalid exchange API keys.`)
      return false
    }
  }

  async checkConfig() {
    try {
      // Fetch available trading pairs
      const tradingPairs = await getTradingPairs(this.user)
      if (!tradingPairs || tradingPairs.length === 0) {
        this.log(
          '❌ No trading pairs available. Check your API keys and permissions.'
        )
        return false
      }

      // Validate the selected trading pair
      if (!tradingPairs.find((p) => p.symbol === this.config.symbol)) {
        this.log(
          `❌ Selected trading pair (${this.config.symbol}) is not available. Please update your configuration.`
        )
        return false
      }
      return true
    } catch (error) {
      this.log(`❌ [ERROR] Failed to check bot configuration: ${error.message}`)
      this.log(
        `❌ This is likely due to invalid exchange API keys. Please verify your credentials.`
      )
      return false
    }
  }

  async queueOperation(operation) {
    // Queue operations to prevent concurrent modifications to bot state
    // This ensures that pause, resume, buy, sell etc. happen sequentially
    return new Promise((resolve, reject) => {
      this.operationQueue = this.operationQueue.then(
        async () => {
          try {
            const result = await operation()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  async shouldAvoidRebuyingInExistingPositionArea(sellingPrice) {
    // Get current unsold purchases for this bot
    const purchases = await this.transactionService.getBotPurchases(
      this.id,
      true,
      this
    )

    // If there are no unsold purchases left, always rebuy (return false = don't avoid rebuying)
    // This ensures the bot keeps earning after selling the last position
    if (purchases.length === 0) {
      return false
    }

    if (purchases.length < this.config.positionsToRebuy) {
      // Not enough purchases to form a position cluster
      return false
    }

    // Sort purchases by price (highest first)
    const sortedPurchases = purchases.sort((a, b) => b.price - a.price)

    // Take the top N purchases where N = positionsToRebuy
    const topPositions = sortedPurchases.slice(0, this.config.positionsToRebuy)

    // Get min and max prices of this position cluster
    const maxPositionPrice = topPositions[0].price
    const minPositionPrice = topPositions[topPositions.length - 1].price

    // Get the current threshold
    const currentThreshold = this.getCurrentThreshold()

    // Calculate the lower bound: min - threshold
    const lowerBound = minPositionPrice * (1 - currentThreshold / 100)

    // Calculate the upper bound: max(maxPositionPrice + profitMargin, maxWorkingPrice)
    const sellTargetPrice =
      maxPositionPrice * (1 + this.config.profitMargin / 100)
    const upperBound = Math.max(
      sellTargetPrice,
      this.config.maxWorkingPrice || 0
    )

    // Check if selling price is within [lowerBound, upperBound]
    // If yes, we already have positions in this area, so avoid rebuying
    const hasPositionsInArea =
      sellingPrice >= lowerBound && sellingPrice <= upperBound

    // if (hasPositionsInArea) {
    // this.log(
    //   `⚠️ Selling at ${sellingPrice} is within existing position area [${jsRound(lowerBound)}, ${jsRound(upperBound)}]. Not rebuying to preserve funds.`
    //     .yellow
    // )
    // }

    return hasPositionsInArea
  }

  async sellNow(
    purchaseOrId,
    updateHighestPrice = true,
    isForced = false,
    isObject = true
  ) {
    if (!this.currentPrice) {
      this.log('❌ [ERROR] No current price available. Cannot sell.')
      return { sold: false }
    }
    let purchase = purchaseOrId
    if (!isObject)
      purchase = await this.transactionService.getPurchaseById(purchaseOrId)
    if (purchase) {
      // Check if purchase is already sold to prevent duplicate selling records
      if (purchase.isSold) {
        this.logger.warn(
          `⚠️ Cannot sell purchase ${purchase._id}: already marked as sold.`
        )
        return { sold: false }
      }
      if (!isForced && purchase.isPaused) {
        // should never happen
        this.logger.error(
          `❌ Could not automatically sell a paused purchase ${purchaseOrId}. Nothing was sold.`
        )
        return { sold: false }
      }

      // Always compute cryptoToSell first - default to selling everything
      let cryptoToSell = this.roundToCurrencyDigits(purchase.amount, Math.floor)

      if (this.config.convertProfitToCrypto) {
        // When keeping profit as crypto, calculate how much crypto to sell to recover original investment
        // Formula: We want to recover (purchase.paid + purchase.fee) in USDT after selling fees
        // Net received after fee = cryptoToSell * currentPrice * (1 - fee)
        // Therefore: cryptoToSell = targetUSDT / (currentPrice * (1 - fee))
        const fee = this.config.fee ? this.config.fee / 100 : this.exchangeFee
        const targetUSDT = 0.01 + (purchase.paid + purchase.fee) * (1 + fee) // What we want to recover expenses

        // Calculate crypto needed for both simulation and real trades
        cryptoToSell = this.roundToCurrencyDigits(
          targetUSDT / this.currentPrice,
          Math.ceil
        )

        // Store the USDT amount to send to exchange API
        // The API parameter specifies the EXACT amount we want to receive in USDT
        this.usdtToRecoverOnSell = Math.ceil(targetUSDT * 1000) / 1000 // round to 4 decimals
        console.log(
          ' Will try to recover USDT:',
          this.usdtToRecoverOnSell,
          'by selling approx:',
          cryptoToSell,
          this.cryptoName
        )
      } else {
        // Normal mode: selling all crypto, calculate expected USDT to receive
        this.usdtToRecoverOnSell =
          Math.ceil(cryptoToSell * this.currentPrice * 1000) / 1000
      }
      if (cryptoToSell > purchase.amount) cryptoToSell = purchase.amount // in case of forced selling with lower crypto price

      // Check if enough balance available
      const cryptoBalance = await getCryptoBalance(
        this.user,
        purchase.currency.replace(
          new RegExp(`-?${this.getExchangeAsset()}$`),
          ''
        )
      )
      if (
        cryptoToSell &&
        cryptoToSell > cryptoBalance &&
        !this.config.simulation
      ) {
        const availabilityRatio = cryptoBalance / cryptoToSell

        if (this.config.convertProfitToCrypto) {
          // In convertProfitToCrypto mode, only sell if we have 100% of calculated amount
          // This ensures we recover the exact investment target
          this.log(
            `⚠️  Cannot sell - insufficient balance. Need ${jsRound(cryptoToSell)} ${this.cryptoName} but only have ${jsRound(cryptoBalance)} (${jsRound(availabilityRatio * 100)}%). Skipping sell.`
          )
          return { sold: false }
        } else {
          // Normal mode: At least 90% available required
          if (availabilityRatio < 0.9) {
            this.log(
              `⚠️  Cannot sell - insufficient balance. Need ${jsRound(cryptoToSell)} ${this.cryptoName} but only have ${jsRound(cryptoBalance)} (${jsRound(availabilityRatio * 100)}%). Skipping sell and pausing bot.`
            )
            this.pause()
            return { sold: false }
          }
          // At least 80% available, adjust to sell what's available
          cryptoToSell = this.roundToCurrencyDigits(cryptoBalance, Math.floor)
          this.log(
            `⚠️  Balance is lower than expected. Selling available amount: ${cryptoToSell}`
          )
        }
      }

      // Recalculate expected USDT recovery based on actual crypto to sell
      if (cryptoToSell > 0) {
        if (this.config.convertProfitToCrypto) {
          // Update the amount we expect to recover based on actual crypto to sell
          this.usdtToRecoverOnSell =
            Math.ceil(cryptoToSell * this.currentPrice * 1000) / 1000 // round to 4 decimals
          // console.log(
          //   ' Adjusted recovery target USDT:',
          //   this.usdtToRecoverOnSell,
          //   'from crypto:',
          //   jsRound(cryptoToSell)
          // )
        } else {
          // Normal mode: recalculate based on adjusted crypto amount
          this.usdtToRecoverOnSell =
            Math.ceil(cryptoToSell * this.currentPrice * 1000) / 1000
        }
      }

      // Check minimum order value (1 USD minimum)
      if (this.usdtToRecoverOnSell < 1) {
        this.log(
          `⚠️  Order value ${this.usdtToRecoverOnSell} ${this.getExchangeAsset()} is below minimum (1 ${this.getExchangeAsset()}). Skipping sell.`
        )
        return { sold: false }
      }

      // this.log('💲 Placing a sell order...'.red)
      let order = null
      if (this.config.simulation) {
        const fee = this.config.fee ? this.config.fee / 100 : this.exchangeFee // legacy
        order = {
          dealFunds: `${this.usdtToRecoverOnSell}`,
          fee: `${this.usdtToRecoverOnSell * fee}`,
          dealSize: `${cryptoToSell}`
        }
      } else {
        try {
          // For convertProfitToCrypto mode, use quote amount parameter to specify exact USDT to receive
          // Different exchanges support this differently:
          // - KuCoin: 'funds' parameter
          // - Binance: 'quoteOrderQty' parameter
          // - MEXC: 'quoteAmount' parameter (falls back to quantity if not supported)
          const useFundsMode =
            this.config.convertProfitToCrypto && this.usdtToRecoverOnSell

          if (useFundsMode) {
            order = await placeOrder(
              this.user,
              this.config.symbol,
              'sell',
              'market',
              null,
              null, // quantity
              this.usdtToRecoverOnSell // funds/quoteOrderQty/quoteAmount
            )
            this.log(
              `🔄 Placed SELL order for ${this.config.symbol} at price ${this.currentPrice}: ${JSON.stringify(order)}`
            )
          } else {
            order = await placeOrder(
              this.user,
              this.config.symbol,
              'sell',
              'market',
              null,
              cryptoToSell // quantity
            )
          }
        } catch (error) {
          this.log(`❌ [ERROR] ${error.message || error}`.red)
          return { sold: false, errorMessage: error.message || error }
        }
      }
      if (order) {
        // console.log(order)
        const received = parseFloat(order.dealFunds)
        const fee = parseFloat(order.fee)
        const amount = parseFloat(order.dealSize)

        // Validate order data
        if (isNaN(received) || isNaN(fee) || isNaN(amount)) {
          this.log(
            `❌ [ERROR] Invalid order data: received=${received}, fee=${fee}, amount=${amount}, order=${JSON.stringify(order)}`
              .red
          )
          return {
            sold: false,
            errorMessage: 'Invalid order data received from exchange'
          }
        }

        const paid = purchase.paid
          ? purchase.paid + purchase.fee
          : jsRound(purchase.amount * purchase.price) // legacy
        const price = jsRound(received / amount)
        const usdProfit = jsRound(received - fee - paid)
        this.log(
          `💲 Sold ${amount} ${this.cryptoName} at ${price} ${this.getExchangeAsset()} (total: ${received} ${this.getExchangeAsset()} - fee ${fee} ${this.getExchangeAsset()}) for a profit of ${usdProfit} ${this.getExchangeAsset()}.`
            .red
        )
        this.transactionService.saveSelling(purchase, {
          // Do not await
          createdAt: new Date().toISOString(),
          userId: this.user._id,
          botId: this.id,
          currency: this.config.symbol,
          amount,
          price,
          fee,
          buyPrice: purchase.price,
          profit: usdProfit,
          profitMargin: purchase.profitMargin,
          isForced,
          isEmergency: purchase.isEmergency || false,
          profitAsCrypto: this.config.convertProfitToCrypto
            ? purchase.amount - amount
            : 0,
          associatedPurchase: purchase._id
        })
        if (this.config.convertProfitToCrypto) {
          const cryptoProfit = jsRound(purchase.amount - amount)
          if (cryptoProfit > 0) {
            this.log(
              `🔄 Keeping the ${this.getExchangeAsset()} profit as ${jsRound(cryptoProfit)} ${this.cryptoName}`
            )
            this.totalProfitCrypto += cryptoProfit
            // persist the crypto gained:
            this.transactionService.saveCryptoProfit({
              // Do not await
              date: new Date().toISOString(),
              userId: this.user._id,
              exchange: this.config.exchange,
              symbol: this.config.symbol,
              amount: purchase.amount - amount,
              simulation: this.config.simulation
            })
          } else {
            this.log(`🔄 ${this.cryptoName} profit is ${usdProfit}.`)
          }
        } else {
          // persist the USD gained:
          this.transactionService.saveCryptoProfit({
            // Do not await
            date: new Date().toISOString(),
            userId: this.user._id,
            exchange: this.config.exchange,
            symbol: this.getExchangeAsset(),
            amount: usdProfit,
            simulation: this.config.simulation
          })
        }
        // Update the user's daily profit:
        await this.userService.updateDailyProfit(
          this.user._id,
          this.config.exchange,
          this.config.symbol,
          usdProfit,
          this.config.simulation
        )
        // Update the user's total profit:
        await this.userService.updateTotalProfit(
          this.user._id,
          usdProfit,
          this.config.simulation
        )
        if (updateHighestPrice) this.lastHighestPrice = this.currentPrice
        this.freePositions++
        if (!isForced) {
          // Move back one threshold when selling (never below 0)
          if (this.currentThresholdIndex > 0) {
            this.currentThresholdIndex--
          }
        }
        this.totalTransactions++
        this.totalProfit += usdProfit
        this.setPositionBoost()
        this.setUsdBoost()
        const maxPositions = Math.max(
          this.config.maxPositions,
          this.config.reuseProfitToMaxPositions || 0
        )
        if (this.freePositions > maxPositions) this.freePositions = maxPositions
        this.logFreePositions()

        const wasEmergency = purchase.isEmergency || false
        if (wasEmergency) {
          this.activeEmergencyPositions--
        }
        // Invalidate cache after sell
        this.purchasesCache = null
        return { sold: true, wasEmergency }
      } else {
        this.logger.error(
          `❌ Could not place sell order of ${cryptoToSell} ${this.cryptoName} at ${this.currentPrice} ${this.getExchangeAsset()} (total: ${this.usdtToRecoverOnSell} ${this.getExchangeAsset()})`
        )
        return { sold: false }
      }
    } else {
      this.logger.error(
        `❌ Could not find purchase ${purchaseOrId}. Nothing was sold.`
      )
      return { sold: false }
    }
  }

  async buyNow(
    isForced = false,
    soldOne = false,
    usd = null,
    isEmergency = false
  ) {
    if (!this.currentPrice) return false
    const cryptoBalance = await getCryptoBalance(
      this.user,
      this.getExchangeAsset()
    )
    // console.log('buyNow - cryptoBalance', this.getExchangeAsset(), cryptoBalance)
    const cryptoQuantity = this.roundToCurrencyDigits(
      ((usd || this.config.maxInvestment / this.config.maxPositions) +
        (this.usdtBoost || 0)) /
        this.currentPrice
    )
    const usdToSpend = jsRound(cryptoQuantity * this.currentPrice)
    // console.log('buyNow - usdToSpend', usdToSpend)
    if (!this.config.simulation && usdToSpend > cryptoBalance) {
      return {
        errorMessage: `Insufficient ${this.getExchangeAsset()} balance to buy ${cryptoQuantity} ${this.cryptoName} (need ${usdToSpend} ${this.getExchangeAsset()}, have ${cryptoBalance} ${this.getExchangeAsset()})`
      }
    }
    // this.log('💲 Placing a buy order...'.green)
    let order = null
    if (this.config.simulation) {
      const fee = this.config.fee ? this.config.fee / 100 : this.exchangeFee // legacy
      order = {
        dealFunds: `${usdToSpend}`,
        fee: `${usdToSpend * fee}`,
        dealSize: `${cryptoQuantity}`
      }
    } else {
      try {
        order = await placeOrder(
          this.user,
          this.config.symbol,
          'buy',
          'market',
          null,
          cryptoQuantity
        )
      } catch (error) {
        this.log(`❌ [ERROR] ${error.message || error}`.red)
        return { errorMessage: error.message || error }
      }
    }
    // console.log(order)
    if (order) {
      const paid = parseFloat(order.dealFunds)
      const fee = parseFloat(order.fee)
      const amount = parseFloat(order.dealSize)
      const price = jsRound(paid / amount)
      const sellFee = this.config.fee ? this.config.fee / 100 : this.exchangeFee // legacy
      // Calculate target price accounting for buy and sell fees
      // paid + fee is the total cost (with commission already deducted from received amount)
      // We need to achieve a profit after both buy and sell fees
      const targetPrice = jsRound(
        ((paid + fee) * (1 + sellFee) * (1 + this.config.profitMargin / 100)) /
          amount
      )
      this.log(
        `💲 Bought ${amount} ${this.cryptoName} at ${price} ${this.getExchangeAsset()} (total: ${paid} ${this.getExchangeAsset()} + fee ${jsRound(fee)} ${this.getExchangeAsset()}).`[
          isEmergency ? 'yellow' : 'green'
        ]
      )
      await this.transactionService.savePurchase({
        // Await to ensure purchase is persisted before continuing
        createdAt: new Date().toISOString(),
        userId: this.user._id,
        botId: this.id,
        currency: this.config.symbol,
        amount,
        price,
        paid,
        fee,
        profitMargin: this.config.profitMargin / 100,
        targetPrice,
        isForced,
        isEmergency
      })
      this.lastHighestPrice = this.currentPrice
      this.freePositions-- // Let it be negative in case of forced purchase
      // Track emergency positions
      if (isEmergency) {
        this.activeEmergencyPositions++
      }
      // Move to next threshold when buying (unless forced, first purchase, or rebuy after sell)
      if (!isForced && !soldOne && this.totalTransactions > 0) {
        this.currentThresholdIndex++
      }
      this.totalTransactions++
      this.logFreePositions()
      // Invalidate cache after purchase
      this.purchasesCache = null
    } else {
      this.logger.error(
        `❌ Could not place buy order of ${cryptoQuantity} ${this.cryptoName} at ${this.currentPrice} ${this.getExchangeAsset()} (total: ${jsRound(usdToSpend)} ${this.getExchangeAsset()})`
      )
    }
  }

  async sellMultiple(purchases, updateHighestPrice = true, isForced = false) {
    let sold = false
    let soldEmergency = false
    let lastSoldPrice = 0
    await Promise.all(
      purchases.map(async (purchase) => {
        const result = await this.sellNow(
          purchase,
          updateHighestPrice,
          isForced
        )
        sold = sold || result.sold
        soldEmergency = soldEmergency || result.wasEmergency
        if (result.sold) {
          lastSoldPrice = purchase.price
        }
        return result
      })
    )
    if (sold) {
      this.lastSoldPrice = lastSoldPrice
    }
    return { sold, soldEmergency }
  }

  async sellAllPositive() {
    const purchasesToSell =
      await this.transactionService.getBotPurchasesWithProfit(
        this.id,
        this.currentPrice,
        this.exchangeFee,
        false,
        null
      )
    // console.log('purchasesToSell', purchasesToSell)
    if (purchasesToSell.length > 0) {
      this.log(
        `💲 Manually selling ${purchasesToSell.length} positive positions...`
          .red
      )
      // NOTE: do not update this.lastHighestPrice here
      return await this.sellMultiple(purchasesToSell, false, true)
    }
    return false
  }

  async pause() {
    return this.queueOperation(async () => {
      this.paused = true
      await this.botService.updateBotData(this.id, { isPaused: true })
      this.log('⏸️  Bot paused.'.yellow.inverse)
    })
  }

  async resume() {
    return this.queueOperation(async () => {
      this.paused = false
      await this.botService.updateBotData(this.id, { isPaused: false })
      this.log('▶️  Bot resumed.'.green.inverse)
    })
  }

  async stopBuyingOnDropPositions() {
    return this.queueOperation(async () => {
      this.stopBuyingOnDrop = true
      const saved = await this.botService.updateBotData(this.id, {
        stopBuyingOnDrop: true
      })
      this.log('🛑 [CONFIG] Buying on drop stopped.'.green.inverse)
      return saved
    })
  }

  async goBuyingOnDropPositions() {
    return this.queueOperation(async () => {
      this.stopBuyingOnDrop = false
      const saved = await this.botService.updateBotData(this.id, {
        stopBuyingOnDrop: false
      })
      this.log('✅ [CONFIG] Buying on drop resumed.'.green.inverse)
      return saved
    })
  }

  async stopBuyingOnRebuyPositions() {
    return this.queueOperation(async () => {
      this.stopBuyingOnRebuy = true
      const saved = await this.botService.updateBotData(this.id, {
        stopBuyingOnRebuy: true
      })
      this.log('🛑 [CONFIG] Buying on rebuy stopped.'.green.inverse)
      return saved
    })
  }

  async goBuyingOnRebuyPositions() {
    return this.queueOperation(async () => {
      this.stopBuyingOnRebuy = false
      const saved = await this.botService.updateBotData(this.id, {
        stopBuyingOnRebuy: false
      })
      this.log('✅ [CONFIG] Buying on rebuy resumed.'.green.inverse)
      return saved
    })
  }

  async stopCryptoConvert() {
    return this.queueOperation(async () => {
      this.config.convertProfitToCrypto = false
      const saved = await this.botService.updateBotData(this.id, {
        config: this.config
      })
      this.log(
        `🔄 [CONFIG] Conversion of ${this.getExchangeAsset()} profit into cryptocurrency is now OFF.`
      )
      return saved
    })
  }

  async goCryptoConvert() {
    return this.queueOperation(async () => {
      this.config.convertProfitToCrypto = true
      const saved = await this.botService.updateBotData(this.id, {
        config: this.config
      })
      this.log(
        `🔄 [CONFIG] Conversion of ${this.getExchangeAsset()} profit into cryptocurrency is now ON.`
      )
      return saved
    })
  }

  setPositionBoost() {
    const oldPositionBoost = this.positionBoost || 0
    const positionPrice = this.config.maxInvestment / this.config.maxPositions
    const boost =
      this.config.reuseProfitToMaxPositions > 0 &&
      this.totalProfit > positionPrice
        ? Math.floor(this.totalProfit / positionPrice)
        : 0
    this.positionBoost =
      boost > this.config.reuseProfitToMaxPositions
        ? this.config.reuseProfitToMaxPositions
        : boost
    const diff = this.positionBoost - oldPositionBoost
    this.freePositions += diff
    // if (this.freePositions < 0) this.freePositions = 0
    if (diff !== 0) this.logFreePositions()
  }

  setUsdBoost() {
    if (
      this.config.reuseProfitToMaxPositions &&
      this.positionBoost <
        this.config.reuseProfitToMaxPositions - this.config.maxPositions
    ) {
      // We are still in the phase where we are adding positions
      this.usdtBoost = 0
      return
    }
    // Else, we have all positions added and now we are raising the position price
    const positionPrice = this.config.maxInvestment / this.config.maxPositions
    const availableProfit =
      this.totalProfit - (this.positionBoost || 0) * positionPrice
    this.usdtBoost =
      this.config.reuseProfit && availableProfit > 0
        ? Math.floor((100 * availableProfit) / this.config.maxPositions) / 100
        : 0
  }

  async stopProfitReuse() {
    return this.queueOperation(async () => {
      this.config.reuseProfit = false
      this.setUsdBoost()
      const saved = await this.botService.updateBotData(this.id, {
        config: this.config,
        usdtBoost: this.usdtBoost
      })
      this.log(
        `🔄 [CONFIG] ${this.getExchangeAsset()} profit reuse: ${this.usdtBoost} ${this.getExchangeAsset()}`
      )
      return saved
    })
  }

  async goProfitReuse() {
    return this.queueOperation(async () => {
      this.config.reuseProfit = true
      this.setUsdBoost()
      const saved = await this.botService.updateBotData(this.id, {
        config: this.config,
        usdtBoost: this.usdtBoost
      })
      this.log(
        `🔄 [CONFIG] ${this.getExchangeAsset()} profit reuse: ${this.usdtBoost} ${this.getExchangeAsset()}`
      )
      return saved
    })
  }

  async start(isFreshStart = true) {
    try {
      if (!this.config.symbolMinSize) {
        const minimumSizeSet = await this.setMinimumSize() // legacy
        if (!minimumSizeSet) {
          this.log(`❌ [ERROR] Failed to set minimum size. Bot will not start.`)
          this.started = false
          return
        }
      }
      if (isFreshStart) {
        if (!this.user) {
          this.log('❌ [ERROR] No user is defined. Exiting.')
          return
        }

        console.log('')
        this.log(
          ` 👾 Starting trading bot ${this.id}${this.config.simulation ? ' in SIMULATION mode (no transactions)' : ''} \n`
            .green.inverse
        )
        await this.botService.updateBotData(this.id, { hasStarted: true })
        this.log(`⏳ [CONFIG] Bot interval: ${this.config.botInterval}s`.yellow)
        this.log(
          `💲 [CONFIG] Selected trading pair: ${this.config.symbol}`.yellow
        )
        this.log(
          `💲 [CONFIG] Trading pair market fee: ${this.config.fee}%`.yellow
        )
        this.log(
          `💲 [CONFIG] Trading pair minimum buy size: ${this.config.symbolMinSize || this.minimumSize}`
            .yellow
        ) // legacy
        this.log(
          `💲 [CONFIG] Trading pair increment: ${this.config.symbolIncrement}`
            .yellow
        )
        this.log(
          `💲 [CONFIG] Total investment: ${this.config.maxInvestment} ${this.getExchangeAsset()}`
            .yellow
        )
        this.log(
          `💲 [CONFIG] Maximum number of positions: ${this.config.maxPositions}`
            .yellow
        )
        this.log(
          `💲 [CONFIG] Maximum price per position: ${Math.round((100 * this.config.maxInvestment) / this.config.maxPositions) / 100}`
            .yellow
        )
        if (
          this.config.priceDropThresholds &&
          Array.isArray(this.config.priceDropThresholds)
        ) {
          this.log(
            `📉 [CONFIG] Price drop thresholds: [${this.config.priceDropThresholds.join(', ')}]%`
              .yellow
          )
        } else {
          this.log(
            `📉 [CONFIG] Price drop threshold: ${this.config.priceDropThreshold}%`
              .yellow
          )
        }
        this.log(
          `📈 [CONFIG] Profit margin: ${this.config.profitMargin}%`.yellow
        )
        this.log(
          `📉 [CONFIG] Minimum buy price: ${this.config.minWorkingPrice}`.yellow
        )
        this.log(
          `📈 [CONFIG] Maximum buy price: ${this.config.maxWorkingPrice}`.yellow
        )
        this.log(
          `🔄 [CONFIG] Conversion of ${this.getExchangeAsset()} profit back to cryptocurrency: ${this.config.convertProfitToCrypto ? 'ON' : 'OFF'}`
            .yellow
        )
        this.log(
          `🔄 [CONFIG] Reuse ${this.getExchangeAsset()} profit until new max. positions: ${this.config.reuseProfitToMaxPositions || 'OFF'}`
            .yellow
        )
        this.log(
          `🔄 [CONFIG] Reuse ${this.getExchangeAsset()} profit to raise position price: ${this.config.reuseProfit ? 'ON' : 'OFF'}`
            .yellow
        )
        if (this.config.reuseProfit)
          this.log(
            `🔄 [CONFIG] ${this.getExchangeAsset()} profit reuse: ${this.usdtBoost} ${this.getExchangeAsset()}`
              .yellow
          )

        const isConfigOK = await this.checkConfig()
        if (!isConfigOK) {
          this.log(
            `❌ [ERROR] Bot configuration check failed. Bot will not start.`
          )
          this.started = false
          await this.botService.updateBotData(this.id, { hasStarted: false })
          return
        }
      }

      while (true) {
        try {
          if (!this.started) this.started = true
          // Start a new bot cycle
          // this.log(`⚙️  Bot cycle #${this.cycles + 1}`.magenta)

          // Fetch the current price (always, even when paused)
          this.currentPrice = (
            await getPrices(this.user, [this.config.symbol])
          )[this.config.symbol].price

          if (!this.currentPrice) {
            this.log(
              '⚠️  [ERROR] Unable to fetch the current price. Retrying...'
            )
            await new Promise((resolve) =>
              setTimeout(resolve, this.config.botInterval * 1000)
            )
            this.currentPrice = (
              await getPrices(this.user, [this.config.symbol])
            )[this.config.symbol].price
          }

          // If still unable to fetch price after retry, stop the bot
          if (!this.currentPrice) {
            this.log(
              '❌ [ERROR] Unable to fetch the current price after retry. Stopping bot.'
                .red
            )
            this.started = false
            await this.botService.updateBotData(this.id, {
              hasStarted: false
            })
            return
          }

          // this.log(`💲 Current ${this.config.symbol} price: ${this.currentPrice}`)

          // Collect state changes for batch update
          const stateChanges = {}
          let needsUpdate = false

          // Skip trading operations if paused, but continue updating cycles and price
          if (!this.paused) {
            // Check if there is something to sell (skip if no transactions exist):
            let soldOne = false
            if (this.totalTransactions > 0) {
              const purchasesToSell =
                await this.transactionService.getBotPurchasesAboveTargetPrice(
                  this.id,
                  this.currentPrice,
                  true, // use cache
                  this // pass bot instance
                )

              if (purchasesToSell.length > 0) {
                // Sell condition:
                // - At least one purchase has its by price that has reached or exceeded the target profit margin
                const sellResult = await this.sellMultiple(purchasesToSell)
                soldOne = sellResult.sold
                this.soldEmergency = sellResult.soldEmergency

                // Queue state changes for batch update
                if (soldOne) {
                  stateChanges.freePositions = this.freePositions
                  stateChanges.lastHighestPrice = this.lastHighestPrice
                  stateChanges.lastSoldPrice = this.lastSoldPrice
                  stateChanges.totalProfit = this.totalProfit
                  stateChanges.totalProfitCrypto = this.totalProfitCrypto || 0
                  stateChanges.totalTransactions = this.totalTransactions
                  stateChanges.activeEmergencyPositions =
                    this.activeEmergencyPositions
                  needsUpdate = true
                }
              }
            }

            // Check if there is something to buy:
            const currentThreshold = this.getCurrentThreshold()
            const hasDropped =
              this.lastHighestPrice &&
              this.currentPrice <=
                this.lastHighestPrice * (1 - currentThreshold / 100)

            // Check emergency position criteria
            const emergencyPositionUnlocked =
              this.freePositions <= 0 &&
              this.config.emergencyUnlockThreshold &&
              this.config.emergencyUnlockThreshold > 0 &&
              this.lastHighestPrice &&
              this.currentPrice <=
                this.lastHighestPrice *
                  (1 - this.config.emergencyUnlockThreshold / 100)

            // Check if we should rebuy after selling
            let shouldRebuy = false
            if (soldOne) {
              // Check if we're not in an area where we already have positions
              const inPositionArea =
                await this.shouldAvoidRebuyingInExistingPositionArea(
                  this.lastSoldPrice
                )
              shouldRebuy = !inPositionArea
            }

            // Check if current price is in an area where we already have positions
            let shouldAvoidBuyingInPositionArea = false
            if (hasDropped && !soldOne) {
              // When price drops but we haven't sold, check if current price is in an existing position area
              shouldAvoidBuyingInPositionArea =
                await this.shouldAvoidRebuyingInExistingPositionArea(
                  this.currentPrice
                )
            }

            // Check appropriate stop flag based on buying scenario
            const shouldStopBuying = shouldRebuy
              ? this.stopBuyingOnRebuy
              : this.stopBuyingOnDrop

            if (
              (this.cycles === 0 ||
                (hasDropped && !shouldAvoidBuyingInPositionArea) ||
                shouldRebuy) &&
              this.freePositions > 0 &&
              !shouldStopBuying &&
              this.currentPrice >= (this.config.minWorkingPrice || -Infinity) &&
              this.currentPrice <= (this.config.maxWorkingPrice || Infinity)
            ) {
              // Buy condition:
              // - The bot has just started
              //     OR the price has dropped by the configured threshold from last sold price (and not in an existing position area)
              //     OR we just sold a position and the sell price is NOT in an existing position area
              // - AND there is still at least a free position to buy
              // - AND we are not stopping buying
              // - AND the current price is above the minimum working price (if defined)
              // - AND the current price is below the maximum working price (if defined)
              if (this.cycles === 0) {
                this.log('🚀 Bot just started')
              }
              await this.buyNow(false, soldOne, null, false)
              this.soldEmergency = false
            } else if (
              shouldRebuy &&
              this.stopBuyingOnRebuy &&
              this.freePositions > 0
            ) {
              // When stopBuyingOnRebuy is enabled and we skip the rebuy,
              // still update lastHighestPrice to current price so the next
              // drop threshold is calculated correctly from the current level
              this.lastHighestPrice = this.currentPrice
              this.soldEmergency = false
            } else if (
              (emergencyPositionUnlocked || this.soldEmergency) &&
              !this.stopBuyingOnDrop &&
              this.currentPrice >= (this.config.minWorkingPrice || -Infinity) &&
              this.currentPrice <= (this.config.maxWorkingPrice || Infinity)
            ) {
              // Emergency position buy condition:
              // - No free positions left AND emergency threshold reached
              //     OR we just sold an emergency position (rebuy it regardless of price)
              // - We are not stopping buying
              // - The current price is within working range (if defined)
              // - We haven't reached the emergency position limit
              const maxEmergencyPositions =
                this.config.emergencyUnlockPositions || 1
              if (this.activeEmergencyPositions < maxEmergencyPositions) {
                if (!this.soldEmergency) {
                  this.log(
                    `🚨 Emergency position unlocked! Price dropped ${this.config.emergencyUnlockThreshold}% from last purchase price (${this.lastHighestPrice}) [${this.activeEmergencyPositions + 1}/${maxEmergencyPositions}]`
                  )
                } else {
                  this.log(
                    `🔄 Rebuying emergency position after sell [${this.activeEmergencyPositions + 1}/${maxEmergencyPositions}]`
                  )
                }
                await this.buyNow(false, false, null, true)
                this.soldEmergency = false
              } else {
                // this.log(
                //   `⚠️ Emergency position limit reached (${maxEmergencyPositions}). Cannot buy more emergency positions.`
                //     .yellow
                // )
                this.soldEmergency = false
              }
            } else {
              this.soldEmergency = false
            }
          }

          // Update the cycles counter
          this.cycles++

          // Add common state changes
          stateChanges.cycles = this.cycles
          stateChanges.freePositions = this.freePositions
          stateChanges.lastHighestPrice = this.lastHighestPrice
          stateChanges.lastSoldPrice = this.lastSoldPrice
          stateChanges.totalProfit = this.totalProfit
          stateChanges.totalProfitCrypto = this.totalProfitCrypto || 0
          stateChanges.totalTransactions = this.totalTransactions
          stateChanges.stopBuyingOnDrop = this.stopBuyingOnDrop
          stateChanges.stopBuyingOnRebuy = this.stopBuyingOnRebuy
          stateChanges.currentPrice = this.currentPrice
          stateChanges.positionBoost = this.positionBoost
          stateChanges.usdtBoost = this.usdtBoost
          stateChanges.currentThresholdIndex = this.currentThresholdIndex
          stateChanges.activeEmergencyPositions = this.activeEmergencyPositions
          needsUpdate = true

          // Perform single batch update with all accumulated changes
          if (needsUpdate) {
            await this.botService.updateBotData(this.id, stateChanges)
          }
        } catch (cycleError) {
          // Log cycle error but continue the loop
          const errorMsg =
            cycleError && cycleError.message
              ? cycleError.message
              : String(cycleError)
          this.log(`❌ [ERROR] Error in bot cycle: ${errorMsg}`.red)
          if (cycleError && cycleError.stack) {
            this.log(`📝 [STACK] ${cycleError.stack}`.red)
          }
        }

        // Wait before the next price check - Always happens after cycle completes
        // This ensures cycles never overlap
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.botInterval * 1000)
        )
      }
    } catch (error) {
      const errorMsg = error && error.message ? error.message : String(error)
      this.log(`❌ [ERROR] Bot crashed: ${errorMsg}`.red)
      if (error && error.stack) {
        this.log(`📝 [STACK] ${error.stack}`.red)
      }
    }
  }
}

module.exports = MemoryBot
