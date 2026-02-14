const { getCurrentPrice } = require('./utils')
const { log } = require('winston')

const prices = {} // symbol: { price, lastUpdate }

function filterObjectByKeys(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.includes(key))
  )
}

const updateDelay = 3000 // 3 seconds

module.exports = function (io, logger) {
  const { listBots } = require('./all-bots')(io, logger)
  return {
    getAllPrices() {
      return prices
    },

    async getPrices(user, symbols = []) {
      await Promise.all(
        symbols.map(async (symbol) => {
          if (!prices[symbol]) {
            prices[symbol] = {
              price: await getCurrentPrice(user, symbol),
              lastUpdate: Date.now()
            }
            // console.log(`Price initialized for ${symbol}: ${prices[symbol].price}`)
          } else {
            if (Date.now() - prices[symbol].lastUpdate > updateDelay) {
              prices[symbol] = {
                price: await getCurrentPrice(user, symbol),
                lastUpdate: Date.now()
              }
              // console.log(`Price updated for ${symbol}: ${prices[symbol].price}`)
            }
          }
          return prices[symbol]
        })
      )
      const result = filterObjectByKeys(prices, symbols)
      return result
    },

    async updatePrices(user) {
      await Promise.all(
        Object.keys(prices).map(async (symbol) => {
          if (Date.now() - prices[symbol].lastUpdate > updateDelay) {
            prices[symbol] = {
              price: await getCurrentPrice(user, symbol),
              lastUpdate: Date.now()
            }
            log.info(`Price updated for ${symbol}: ${prices[symbol].price}`)
          }
        })
      )
    },

    async cleanPrices() {
      // Remove outdated symbols (typically after deleting a bot)
      const symbols = listBots().map((bot) => bot.symbol)
      Object.keys(prices).forEach((symbol) => {
        if (!symbols.includes(symbol)) delete prices[symbol]
      })
      // logger.info(`Current symbols: ${Object.keys(prices).join(', ')}`)
    }
  }
}
