import { defineStore } from 'pinia'
import userService from '@services/user.service'
import botService from '@services/bot.service'
import transactionService from '@services/transaction.service'
import currencyService from '@services/currency.service'
import websocketService from '@services/websocket.service'
import { playSound } from './soundManager'

const miniChartCacheKey = 'kubot:miniChartCache'

const loadMiniChartCache = () => {
  try {
    const raw = localStorage.getItem(miniChartCacheKey)
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    console.warn('Failed to load mini chart cache:', err)
    return {}
  }
}

export const useMainStore = defineStore('main', {
  state: () => ({
    exchanges: {
      Binance: {
        name: 'Binance',
        url: 'https://www.binance.com/$LANG/my/wallet/account/main',
        tradingAsset: 'USDC',
        tokenAsset: 'BNB',
        tokenPair: 'BNBUSDC',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: false,
        favorites: []
      },
      /* Bitget: {
        name: 'Bitget',
        url: '???',
        tradingAsset: 'USDT',
        tokenAsset: '???',
        tokenPair: '???USDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: true,
        favorites: []
      }, */
      /* Coinbase: {
        name: 'Coinbase',
        url: '???',
        tradingAsset: 'USDT',
        tokenAsset: '???',
        tokenPair: '???USDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: true,
        favorites: []
      }, */
      Kraken: {
        name: 'Kraken',
        url: 'https://www.kraken.com/en-us/features/crypto-trading',
        tradingAsset: 'USD',
        tokenAsset: 'XBT',
        tokenPair: 'XBTUSD',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: false,
        favorites: []
      },
      KuCoin: {
        name: 'KuCoin',
        url: 'https://www.kucoin.com/$LANG/assets',
        tradingAsset: 'USDT',
        tokenAsset: 'KCS',
        tokenPair: 'KCS-USDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: false,
        favorites: []
      },
      MEXC: {
        name: 'MEXC',
        url: 'https://www.mexc.com/assets/spot',
        tradingAsset: 'USDT',
        tokenAsset: 'MX',
        tokenPair: 'MXUSDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: false,
        favorites: []
      },
      OKX: {
        name: 'OKX',
        url: 'https://www.okx.com/$LANG/balance',
        tradingAsset: 'USDT',
        tokenAsset: 'OKB',
        tokenPair: 'OKB-USDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: true,
        favorites: []
      },
      CoinEX: {
        name: 'CoinEX',
        url: 'https://www.coinex.com/account/balance',
        tradingAsset: 'USDT',
        tokenAsset: 'CET',
        tokenPair: 'CETUSDT',
        id: null,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        disabled: false,
        favorites: []
      }
    },
    exchange: null,
    kucoinFee: 0.001, // legacy
    vipFee: null, // Current VIP fee rate for MEXC
    user: null,
    token: null,
    lang: navigator.language.substring(0, 2),
    balances: null,
    transactions: {}, // { botId: transactions }
    playSounds: true,
    cryptoProfits: null,
    totalInvestment: 0,
    showRunningBotsOnly: false,

    tableDisplay: false,
    showAllCharts: false,
    menuDrawer: true,
    transactionsDrawer: true,
    news: [],
    currentPrices: {},
    miniChartCache: loadMiniChartCache(),
    btcDrawer: false,
    btcChartHeight: parseInt(localStorage.getItem('btcChartHeight')) || 350,
    bots: [],
    selectedTradingPair: null,
    botFilter: null,
    adminMode: false,
    isGloballyPaused: false,
    isGloballyStoppingBuying: false,
    isGloballyStoppingBuyingOnDrop: false,
    isGloballyStoppingBuyingOnRebuy: false,
    snackbar: { show: false, color: 'primary', text: '' },
    wsConnected: false
  }),

  getters: {
    isAdmin: (state) => state.user && state.user.permissions.includes('admin'),
    isUser: (state) => state.user && state.user.permissions.includes('user'),
    symbolPrice: (state) => (symbol) => state.currentPrices[symbol]?.price || 0,
    jsRound: () => (n) => {
      if (isNaN(n)) return n
      const exp = n.toExponential().split('e')[1]
      const fact = exp >= 2 ? Math.min(2, exp + 2) : exp >= 0 ? 4 : 2 - exp
      const rnd = 10 ** fact
      return (Math.round(rnd * n) / rnd)
        .toFixed(fact)
        .toString()
        .replace(/(\.\d*?[1-9])0+$/g, '$1')
        .replace(/\.0+$/g, '')
        .replace(/\.$/, '')
    },
    usdtRound: () => (n) => (Math.round(100 * n) / 100).toFixed(2),
    shortDate: () => (date) => {
      const day = new Date(date).toLocaleDateString()
      const today = new Date().toLocaleDateString()
      if (day === today) return new Date(date).toLocaleTimeString()
      return day.replace(/\/20\d{2}$/, '')
    },
    formatDate:
      () =>
      (t, date, hideTime = false) => {
        if (!date) return null
        const day = new Date(date).toLocaleDateString()
        const time = hideTime ? '' : new Date(date).toLocaleTimeString()
        const today = new Date().toLocaleDateString()
        if (day === today)
          return hideTime
            ? t('common.today')
            : t('common.today') + ' ' + t('common.at') + ` ${time}`
        return hideTime ? day : day + ' ' + t('common.at') + ' ' + time
      },
    enc: () => (data) => {
      const b = btoa
      const u = unescape
      const e = encodeURIComponent
      const noiseLength = Math.ceil(Math.random() * (20 - 10)) + 10
      const noise1 = Math.random()
        .toString(36)
        .replace(/[^a-zA-Z0-9]+/g, '')
        .substring(0, 4)
      const noise2 = `${Math.random().toString(36)}${Math.random().toString(
        36
      )}`
        .replace(/[^a-zA-Z0-9]+/g, '')
        .substring(0, noiseLength)
      return b(
        u(e(`${noise1}${noiseLength}${noise2}${b(u(e(JSON.stringify(data))))}`))
      )
    },
    decodeData: () => (data) => {
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
    },
    usdBalance: (state) => {
      if (!state.balances) return 0
      const balance = state.balances.find((b) => b.currency === state.exchangeAsset)
      return balance ? balance.available : 0
    },
    botSymbols: (state) => [
      ...new Set(state.bots.map((bot) => bot.config.symbol.replace(/-?USD(T|C)$/,'')))
    ],
    openExchanges: (state) => Object.fromEntries(Object.entries(state.exchanges)
      .filter(([key, value]) => key && !value.disabled)
      .sort((a, b) => a[1].name.localeCompare(b[1].name))),
    isAuthenticated: (state) => !!state.user && !!state.token,
    exchangeByName: (state) => (name) => {
      return Object.values(state.exchanges).find((e) => e.name.toLowerCase() === name.toLowerCase())
    },
    exchangeUrl: (state) => {
      const exchange = state.exchangeByName(state.exchange)
      if (exchange && exchange.url) {
        return exchange.url.replace('$LANG', state.lang)
      }
      return null
    },
    exchangeAsset: (state) => {
      const exchange = state.exchangeByName(state.exchange)
      return exchange ? exchange.tradingAsset : 'USDT'
    },
    exchangeToken: (state) => {
      const exchange = state.exchangeByName(state.exchange)
      return exchange ? exchange.tokenAsset : '???'
    },
    exchangeTokenPair: (state) => {
      const exchange = state.exchangeByName(state.exchange)
      return exchange ? exchange.tokenPair : '???-USDT'
    },
    isVipFeeExchange: (state) => {
      return !['kucoin'].includes(state.exchange?.toLowerCase())
    },
    botTransactions: (state) => (botId) => {
      if (!state.transactions[botId]) return []
      return state.transactions[botId]
    },
    allTransactions: (state) =>
      state.bots
        .map((bot) => state.transactions[bot._id] || [])
        .flat()
        .filter((tr) => !tr.isSold)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    // Get next selling transaction with profit calculation
    nextSellingWithProfit: (state) => (bot) => {
      const transactions = state.transactions[bot._id] || []
      const unsoldUnpaused = transactions.filter(t => t.targetPrice && !t.isSold && !t.isPaused)
      if (unsoldUnpaused.length === 0) return null
      
      const next = unsoldUnpaused.sort((a, b) => a.targetPrice - b.targetPrice)[0]
      
      // Calculate profit
      const profit = next.paid
        ? bot.currentPrice * next.amount * (1 - bot.config.fee / 100) - (next.paid + next.fee)
        : (bot.currentPrice - next.price) * next.amount // legacy
      
      return { ...next, profit }
    }
  },

  actions: {
    async login(user, password) {
      return userService
        .login(user, password)
        .then((response) => {
          if (response.user) {
            localStorage.setItem('exchange', this.exchange.toLowerCase())
            localStorage.setItem('token', response.token)
            localStorage.setItem('user', JSON.stringify(response.user))
            this.token = response.token
            this.user = response.user
            return response
          }
          return null
        })
        .then(async (response) => {
          document.location.href = '/home'
          await this.getUserData()
          await this.getBots()
          await this.connectWebSocket()
          return response
        })
        .catch((error) => {
          console.log(error)
        })
    },
    updateUser(user) {
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    async getUserData() {
      if (!this.exchange) return
      await this.getExchanges()
      await this.getBalances()
      await this.getTotalProfits()
      await this.getCryptoProfits()
    },
    logout() {
      console.log('Logging out')
      this.disconnectWebSocket()
      this.user = null
      this.token = null
      this.balances = null
      this.transactions = {}
      this.playSounds = true
      this.news = []
      this.currentPrices = {}
      this.bots = []
      this.totalInvestment = 0
      this.showRunningBotsOnly = false

      this.tableDisplay = false
      this.menuDrawer = true
      this.transactionsDrawer = true
      this.cryptoProfits = null
      this.selectedTradingPair = null
      this.botFilter = null
      this.adminMode = false
      // Keep miniChartCache - it persists across users and sessions
      this.btcDrawer= false
      // Save exchange and miniChartCache before clearing localStorage
      const savedExchange = this.exchange
      const savedMiniChartCache = JSON.stringify(this.miniChartCache)
      localStorage.clear()
      localStorage.setItem('exchange', savedExchange)
      localStorage.setItem(miniChartCacheKey, savedMiniChartCache)
      document.location.href = '/'
    },
    async getExchanges() {
      return userService.getExchanges().then((data) => {
        data.forEach((exchange) => {
          if (this.exchanges[exchange.name]) {
            this.exchanges[exchange.name].id = exchange._id
            this.exchanges[exchange.name].apiKey = this.decodeData(exchange.apiKey).decodedData
            this.exchanges[exchange.name].apiSecret = this.decodeData(exchange.apiSecret).decodedData
            this.exchanges[exchange.name].apiPassphrase = this.decodeData(exchange.apiPassphrase).decodedData
            this.exchanges[exchange.name].favorites = exchange.favorites
          }
        })
        return this.exchanges
      })
    },
    async getBotTransactions(botId) {
      console.log('Getting transactions for bot', botId)
      const bot = this.bots.find((b) => b._id === botId)
      if (bot && bot.isPaused && this.transactions[botId])
        return this.transactions[botId]
      const newTransactions = await botService.getTransactions(botId)
      const oldTransactions = (this.transactions[botId] || []).map((t) => ({
        ...t
      }))
      this.transactions[botId] = newTransactions
      if (this.playSounds) {
        if (oldTransactions.length === 0) return newTransactions
        // find the new sales that were not in the old transactions
        const newSellings = newTransactions.filter((newTransaction) => {
          return (
            !newTransaction.targetPrice &&
            !oldTransactions.some(
              (oldTransaction) => oldTransaction._id === newTransaction._id
            )
          )
        })
        if (newSellings.length > 0) {
          for (const p of newSellings) {
            p && playSound('sell', p.isSimulation)
          }
        }
        // find the new purchases that were not in the old transactions
        const newPurchases = newTransactions.filter((newTransaction) => {
          return (
            newTransaction.targetPrice &&
            !oldTransactions.some(
              (oldTransaction) => oldTransaction._id === newTransaction._id
            )
          )
        })
        if (newPurchases.length > 0) {
          for (const p of newPurchases) {
            p && playSound('buy', p.isSimulation)
          }
        }
      }
      return newTransactions
    },
    async getBalances() {
      return userService.getBalances().then((bal) => {
        this.balances = bal.filter((b) => b.available > 0)
        return this.balances
      })
    },
    async getTotalProfits() {
      userService
        .getTotalProfits()
        .then(({ totalProfit, totalProfitSimulated }) => {
          this.user.totalProfit = totalProfit
          this.user.totalProfitSimulated = totalProfitSimulated
        })
    },
    async getCryptoProfits() {
      this.cryptoProfits = await transactionService.getCryptoProfits()
    },
    async getNews() {
      return currencyService.getNews(this.lang).then((data) => {
        this.news = data
        return data
      })
    },
    async getVipFee() {
      return currencyService.getVipFee().then((data) => {
        this.vipFee = data.vipFee
        return data
      })
    },
    async getBots() {
      return botService.getBots().then((data) => {
        data.forEach((bot) => {
          const existingBot = this.bots.find(b => b._id === bot._id)
          if (!existingBot || existingBot.totalTransactions !== bot.totalTransactions) {
            this.getBotTransactions(bot._id)
          }
        })
        this.bots = data.sort((a, b) => (a.config.label || a.config.symbol).toLowerCase().localeCompare((b.config.label || b.config.symbol).toLowerCase()))
        return data
      })
    },
    highlightBotSymbols(text) {
      let result = text
      for (const symbol of this.botSymbols) {
        const regex = new RegExp(`\\b${symbol}\\b`, 'g')
        result = result.replace(
          regex,
          (match) => `<span class="text-primary">${match}</span>`
        )
      }
      return result
    },
    async getTotalInvestment() {
      return transactionService.getTotalInvestment().then((data) => {
        this.totalInvestment = data
        return data
      })
    },
    async pauseFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.pauseAllBots(botIds)
        console.log('Filtered bots paused:', result)
        return result
      } catch (error) {
        console.error('Failed to pause filtered bots:', error)
        throw error
      }
    },
    async resumeFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.resumeAllBots(botIds)
        console.log('Filtered bots resumed:', result)
        return result
      } catch (error) {
        console.error('Failed to resume filtered bots:', error)
        throw error
      }
    },
    async stopBuyingFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.stopBuyingAllBots(botIds)
        console.log('Filtered bots buying stopped:', result)
        return result
      } catch (error) {
        console.error('Failed to stop buying filtered bots:', error)
        throw error
      }
    },
    async goBuyingFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.goBuyingAllBots(botIds)
        console.log('Filtered bots buying resumed:', result)
        return result
      } catch (error) {
        console.error('Failed to resume buying filtered bots:', error)
        throw error
      }
    },
    async stopBuyingOnDropFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.stopBuyingOnDropAllBots(botIds)
        console.log('Filtered bots buying on drop stopped:', result)
        return result
      } catch (error) {
        console.error('Failed to stop buying on drop for filtered bots:', error)
        throw error
      }
    },
    async goBuyingOnDropFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.goBuyingOnDropAllBots(botIds)
        console.log('Filtered bots buying on drop resumed:', result)
        return result
      } catch (error) {
        console.error('Failed to resume buying on drop for filtered bots:', error)
        throw error
      }
    },
    async stopBuyingOnRebuyFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.stopBuyingOnRebuyAllBots(botIds)
        console.log('Filtered bots buying on rebuy stopped:', result)
        return result
      } catch (error) {
        console.error('Failed to stop buying on rebuy for filtered bots:', error)
        throw error
      }
    },
    async goBuyingOnRebuyFilteredBots(bots) {
      try {
        const botIds = bots.map(bot => bot._id)
        const result = await botService.goBuyingOnRebuyAllBots(botIds)
        console.log('Filtered bots buying on rebuy resumed:', result)
        return result
      } catch (error) {
        console.error('Failed to resume buying on rebuy for filtered bots:', error)
        throw error
      }
    },
    updateGlobalPauseState() {
      if (this.bots.length === 0) {
        this.isGloballyPaused = false
        return
      }
      // Get only started bots
      const startedBots = this.bots.filter(bot => bot.hasStarted)
      if (startedBots.length === 0) {
        this.isGloballyPaused = false
        return
      }
      // Check if all started bots have the same pause state
      const allPaused = startedBots.every(bot => bot.isPaused)
      const allResumed = startedBots.every(bot => !bot.isPaused)
      // Only set isGloballyPaused if all bots are in the same state
      if (allPaused) {
        this.isGloballyPaused = true
      } else if (allResumed) {
        this.isGloballyPaused = false
      }
    },
    updateFilteredGlobalStoppingBuyingState(filteredBots) {
      if (filteredBots.length === 0) {
        this.isGloballyStoppingBuying = false
        this.isGloballyStoppingBuyingOnDrop = false
        this.isGloballyStoppingBuyingOnRebuy = false
        return
      }
      // Check if all filtered bots have both stopBuyingOnDrop and stopBuyingOnRebuy = true
      const allStopped = filteredBots.every(bot => bot.stopBuyingOnDrop && bot.stopBuyingOnRebuy)
      const allResumed = filteredBots.every(bot => !bot.stopBuyingOnDrop && !bot.stopBuyingOnRebuy)
      // Only set isGloballyStoppingBuying if all bots are in the same state
      if (allStopped) {
        this.isGloballyStoppingBuying = true
      } else if (allResumed) {
        this.isGloballyStoppingBuying = false
      }
      
      // Check individual flags
      const allStoppedOnDrop = filteredBots.every(bot => bot.stopBuyingOnDrop)
      const allResumedOnDrop = filteredBots.every(bot => !bot.stopBuyingOnDrop)
      if (allStoppedOnDrop) {
        this.isGloballyStoppingBuyingOnDrop = true
      } else if (allResumedOnDrop) {
        this.isGloballyStoppingBuyingOnDrop = false
      }
      
      const allStoppedOnRebuy = filteredBots.every(bot => bot.stopBuyingOnRebuy)
      const allResumedOnRebuy = filteredBots.every(bot => !bot.stopBuyingOnRebuy)
      if (allStoppedOnRebuy) {
        this.isGloballyStoppingBuyingOnRebuy = true
      } else if (allResumedOnRebuy) {
        this.isGloballyStoppingBuyingOnRebuy = false
      }
    },
    updateFilteredGlobalPauseState(filteredBots) {
      if (filteredBots.length === 0) {
        this.isGloballyPaused = false
        return
      }
      // Get only started bots from filtered list
      const startedBots = filteredBots.filter(bot => bot.hasStarted)
      if (startedBots.length === 0) {
        this.isGloballyPaused = false
        return
      }
      // Check if all started bots have the same pause state
      const allPaused = startedBots.every(bot => bot.isPaused)
      const allResumed = startedBots.every(bot => !bot.isPaused)
      // Only set isGloballyPaused if all bots are in the same state
      if (allPaused) {
        this.isGloballyPaused = true
      } else if (allResumed) {
        this.isGloballyPaused = false
      }
    },
    async connectWebSocket() {
      console.log('connectWebSocket called - exchange:', this.exchange, 'token:', !!this.token)
      if (!this.exchange || !this.token) {
        console.log('Cannot connect WebSocket: missing exchange or token')
        return
      }

      console.log('Attempting to connect WebSocket...')
      try {
        await websocketService.connect(this.exchange)
        console.log('WebSocket service connected successfully')
        this.wsConnected = true

        // Set up event listeners
        websocketService.on('connected', () => {
          console.log('WebSocket connected')
          this.wsConnected = true
        })

        websocketService.on('disconnected', () => {
          console.log('WebSocket disconnected')
          this.wsConnected = false
        })

        websocketService.on('message', (data) => {
          this.handleWebSocketMessage(data)
        })

        websocketService.on('error', (error) => {
          console.error('WebSocket error:', error)
        })

      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        this.wsConnected = false
      }
    },
    disconnectWebSocket() {
      websocketService.disconnect()
      this.wsConnected = false
    },
    handleWebSocketMessage(data) {
      // console.log('Received WebSocket message:', data)
      
      // Handle different message types
      switch (data.type) {
        case 'bot_update':
          // Update a specific bot
          if (data.bot) {
            const index = this.bots.findIndex(b => b._id === data.bot._id)
            if (index !== -1) {
              this.bots[index] = { ...this.bots[index], ...data.bot }
            }
          }
          break
        
        case 'transaction_update':
          // Update transactions for a bot
          if (data.botId && data.transactions) {
            this.transactions[data.botId] = data.transactions
          }
          break
        
        case 'price_update':
          // Update current prices
          // console.log('Received price update via WebSocket:', Object.keys(data.prices || {}).length, 'prices')
          if (data.prices) {
            this.currentPrices = { ...this.currentPrices, ...data.prices }
          }
          break
        
        case 'balance_update':
          // Refresh balances
          this.getBalances()
          break

        default:
          console.log('Unknown message type:', data.type)
      }
    }
  }
})
