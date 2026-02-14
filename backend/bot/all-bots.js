const bots = []

module.exports = function (io, logger) {
  return {
    addBot(bot) {
      bots.push(bot)
      logger.info(`Bot ${bot.getId()} added to bot list`)
    },

    getBots() {
      return bots
    },

    getBot(botId) {
      return bots.find((bot) => bot.getId() === botId)
    },

    removeBot(botId) {
      const index = bots.findIndex((bot) => bot.getId() === botId)
      if (index !== -1) {
        bots.splice(index, 1)
        logger.info(`Bot ${botId} removed from bot list`)
      }
    },

    listBots() {
      return bots.map((bot) => ({
        id: bot.getId(),
        symbol: bot.getSymbol(),
        userId: bot.getUserId(),
        hasStarted: bot.hasStarted(),
        isPaused: bot.isPaused()
      }))
    }
  }
}
