const { createLogger, format, transports } = require('winston')
require('winston-daily-rotate-file')
require('dotenv').config()

const loggerPrintf = (info) => {
  const { timestamp, level, message, ...args } = info
  const ts = timestamp.slice(0, 19).replace('T', ' ')
  return `${ts} [${level.toUpperCase()}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`
}

const retentionDays = process.env.APP_LOG_FILES_RETENTION_DAYS || '15'

const winstonLogger = createLogger({
  level: 'debug',
  format: format.combine(format.splat(), format.simple(), format.align()),
  transports: [
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxsize: 50 * 1024 * 1024, // 50 MB per file
      maxFiles: retentionDays + 'd', // e.g., '30d'
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.simple(),
        format.printf(loggerPrintf)
      ),
      auditFile: 'logs/.error-audit.json'
    }),
    new transports.DailyRotateFile({
      filename: 'logs/info-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxsize: 50 * 1024 * 1024, // 50 MB per file
      maxFiles: retentionDays + 'd', // e.g., '30d'
      level: 'debug',
      format: format.combine(
        format.timestamp(),
        format.simple(),
        format.printf(loggerPrintf)
      ),
      auditFile: 'logs/.info-audit.json'
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  )
}

winstonLogger.stream = {
  write: function (message /* encoding */) {
    winstonLogger.info(message)
  }
}

module.exports = winstonLogger
