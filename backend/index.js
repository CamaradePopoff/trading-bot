const HyperExpress = require('hyper-express')
// const morgan = require('morgan')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const { mongoSanitizeWrapper } = require('./middleware/hyper-compat')
const io = null
const logger = require('./logger')
const appService = require('./services/app-service')(io, logger)
const botService = require('./services/bot-service')(io, logger)
const websocketHandler = require('./routes/websocket-routes')(io, logger)
// const databaseMaintenanceService = require('./services/database-maintenance-service')(io, logger)
require('dotenv').config()

if (!process.env.BOT_EXCHANGE) {
  console.error('BOT_EXCHANGE environment variable is not set.')
  process.exit(1)
}

if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET not set! Using default (INSECURE for production)')
}

console.log(`Running bot on exchange: ${process.env.BOT_EXCHANGE}`)

const appRouter = require('./routes/app-routes')(io, logger)
const authRouter = require('./routes/auth-routes')(io, logger)
const userRouter = require('./routes/user-routes')(io, logger)
const ccyRouter = require('./routes/currency-routes')(io, logger)
const botRouter = require('./routes/bot-routes')(io, logger)
const transactionRouter = require('./routes/transaction-routes')(io, logger)

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/trade-bot'

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}

mongoose.Promise = global.Promise
mongoose.set('strictQuery', false)
mongoose.connect(MONGODB_URI, mongoOptions).then(() => {
  console.log('Database connected.')

  const app = new HyperExpress.Server()
  const port = process.env.PORT || 3000

  // Security middleware
  // Note: x-powered-by is disabled by default in HyperExpress

  // CORS configuration
  const corsMiddleware = require('./middleware/cors')
  app.use(
    corsMiddleware({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    })
  )

  // Body parsing is built into HyperExpress and enabled by default
  // JSON and URL-encoded bodies are automatically parsed

  // MongoDB query sanitization
  const sanitizeMiddleware = mongoSanitizeWrapper()
  app.use(sanitizeMiddleware)

  // if (MONGODB_URI.includes('//localhost:')) app.use(morgan('dev')) // automatically log incoming requests in local
  // Static files - HyperExpress uses different API
  // app.use(express.static('public'))

  // JWT authentication middleware
  const { authenticate } = require('./middleware/jwt-auth')

  // Body parser middleware
  const bodyParser = require('./middleware/body-parser')
  app.use(bodyParser())

  // Express compatibility adapter
  const expressAdapter = require('./middleware/express-adapter')
  app.use(expressAdapter())

  // Rate limiting - use custom HyperExpress-compatible rate limiter
  const rateLimit = require('./middleware/rate-limit')
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { message: 'Too many login attempts, please try again later' },
    statusCode: 429,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown'
  })

  app.get('/', (req, res) => {
    res.send('Hello from Kubot!')
  })

  app.get(`/${process.env.BOT_EXCHANGE}/`, (req, res) => {
    res.send(`Hello from Kubot on ${process.env.BOT_EXCHANGE}!`)
  })

  // Public routes with rate limiting
  app.use(`/${process.env.BOT_EXCHANGE}/auth`, authLimiter)
  app.use(`/${process.env.BOT_EXCHANGE}/auth`, authRouter)

  // Protected routes (apply authentication middleware before router)
  app.use(`/${process.env.BOT_EXCHANGE}/app`, authenticate)
  app.use(`/${process.env.BOT_EXCHANGE}/app`, appRouter)

  app.use(`/${process.env.BOT_EXCHANGE}/ccy`, authenticate)
  app.use(`/${process.env.BOT_EXCHANGE}/ccy`, ccyRouter)

  app.use(`/${process.env.BOT_EXCHANGE}/users`, authenticate)
  app.use(`/${process.env.BOT_EXCHANGE}/users`, userRouter)

  app.use(`/${process.env.BOT_EXCHANGE}/bots`, authenticate)
  app.use(`/${process.env.BOT_EXCHANGE}/bots`, botRouter)

  app.use(`/${process.env.BOT_EXCHANGE}/transactions`, authenticate)
  app.use(`/${process.env.BOT_EXCHANGE}/transactions`, transactionRouter)

  // WebSocket upgrade handler - authenticates and passes context
  console.log(
    `Registering WebSocket upgrade route: /${process.env.BOT_EXCHANGE}/ws`
  )
  app.upgrade(`/${process.env.BOT_EXCHANGE}/ws`, (request, response) => {
    // console.log('WebSocket upgrade request received')

    // Get token from query parameters
    const token = request.query_parameters.token
    // console.log('Token from query_parameters:', token ? 'present' : 'missing')

    // Upgrade with context that will be accessible in ws handler
    response.upgrade({
      token
    })
  })

  // WebSocket route - receives authenticated connections
  console.log(`Registering WebSocket route: /${process.env.BOT_EXCHANGE}/ws`)
  app.ws(`/${process.env.BOT_EXCHANGE}/ws`, (ws) => {
    // console.log('WebSocket connection handler called')

    // Access token from context
    const token = ws.context.token

    const req = {
      query: { token },
      headers: {}
    }
    // console.log('Token from ws.context:', token ? 'present' : 'missing')

    websocketHandler.handleUpgrade(req, ws)
  })

  // Global error handler
  app.set_error_handler((req, res, error) => {
    // Log full error server-side
    console.error({
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id
    })

    // Send sanitized error to client
    const isDevelopment = process.env.NODE_ENV === 'development'

    res.status(error.status || 500).json({
      message: isDevelopment ? error.message : 'An error occurred',
      ...(isDevelopment && { stack: error.stack })
    })
  })

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
    appService
      .getServerIp()
      .then((ip) => console.log('Server IP:', ip))
      .catch(() => {})

    setInterval(
      () => {
        const mem = Object.fromEntries(
          Object.entries(process.memoryUsage()).map(([k, v]) => [
            k,
            Math.round((v / 1024 / 1024) * 100) / 100
          ])
        )
        logger.info(`Memory usage in Mb: ${JSON.stringify(mem)}`)
      },
      1000 * 60 * 60
    ) // every hour

    botService.purgeOldTransactions()
    botService.updateCryptoProperties()
    schedule.scheduleJob({ minute: 0 }, function () {
      // At every new hour
      botService.purgeOldTransactions()
      botService.updateCryptoProperties()
      // databaseMaintenanceService.runMaintenanceTasks()
    })

    botService.purgeOldLogs()
    schedule.scheduleJob({ hour: 0 }, function () {
      // At every new day
      botService.purgeOldLogs()
    })

    // Database backup at midnight UTC
    const { backupDatabase } = require('./scripts/backup-database')
    schedule.scheduleJob({ hour: 0, minute: 0, tz: 'UTC' }, async function () {
      try {
        await backupDatabase()
      } catch (error) {
        logger.error('Database backup failed:', error)
      }
    })

    botService.restoreMemoryBots()
  })
})
