const winston = require('winston')
require('winston-daily-rotate-file')
require('dotenv').config()

const buildLogFilename = (botId, level) =>
  `${process.env.BOT_LOG_DIR || 'logs'}/${botId}/${level}-%DATE%.log`

const createLogger = (botId) => {
  const transports = [
    new winston.transports.Console({ format: winston.format.cli() })
  ]

  if ((process.env.BOT_LOG_TO_FILE || 'FALSE').toUpperCase() === 'TRUE')
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: buildLogFilename(botId, 'error'),
        level: 'error',
        frequency: '1d',
        datePattern: 'YYYY-MM-DD',
        maxFiles: `${process.env.BOT_LOG_FILES_RETENTION_DAYS || '30'}d`
      }),
      new winston.transports.DailyRotateFile({
        filename: buildLogFilename(botId, 'info'),
        level: 'info',
        frequency: '1d',
        datePattern: 'YYYY-MM-DD',
        maxFiles: `${process.env.BOT_LOG_FILES_RETENTION_DAYS || '30'}d`
      })
    )

  const logger = winston.createLogger({
    level: process.env.BOT_LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple(),
      winston.format.printf((info) => {
        const { message } = info
        return message.replace(/\u001b\[\d+m/g, '')
      })
    ),
    transports
  })
  logger.info = logger.info.bind(logger)
  logger.warn = logger.warn.bind(logger)
  logger.error = logger.error.bind(logger)
  logger.debug = logger.debug.bind(logger)
  return logger
}

class BotLogger {
  /**
   * @param botId {String} The bot id
   */
  constructor(botId) {
    this.botId = botId
    this.logPath = process.env.BOT_LOG_DIR || 'logs'
    this.start()
  }

  start() {
    this.logger = createLogger(this.botId)
  }

  debug(message) {
    return this.logger.log('debug', message)
  }

  info(message) {
    return this.logger.log('info', message)
  }

  warn(message) {
    return this.logger.log('warn', message)
  }

  error(message) {
    return this.logger.log('error', message)
  }

  terminate() {
    // Close all transports to prevent memory leaks
    if (this.logger) {
      this.logger.transports.forEach((transport) => {
        try {
          if (transport.close) {
            transport.close()
          }
          this.logger.remove(transport)
        } catch (error) {
          console.error(`Error closing transport: ${error.message}`)
        }
      })

      // Close the logger itself
      if (this.logger.close) {
        this.logger.close()
      }

      this.logger = null
    }
  }
}

module.exports = BotLogger
