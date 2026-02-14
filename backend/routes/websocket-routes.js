const jwt = require('jsonwebtoken')

module.exports = function (io, logger) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
  const connectedClients = new Set()
  let priceIntervalId = null

  // Start price broadcast interval when first client connects
  const startPriceBroadcast = () => {
    if (priceIntervalId) return // Already running

    console.log('Starting price broadcast interval...')
    const botService = require('../services/bot-service')(io, logger)

    priceIntervalId = setInterval(async () => {
      // console.log(
      //   `Price broadcast tick - ${connectedClients.size} clients connected`
      // )
      if (connectedClients.size === 0) return

      // Group clients by user to avoid duplicate price fetches
      const userClients = new Map()
      for (const ws of connectedClients) {
        if (!userClients.has(ws.user._id)) {
          userClients.set(ws.user._id, [])
        }
        userClients.get(ws.user._id).push(ws)
      }

      // Fetch and send prices for each user
      for (const [userId, clients] of userClients) {
        try {
          const prices = await botService.getCurrentPrices(clients[0].user)
          // logger.info(
          //   `Broadcasting ${Object.keys(prices).length} prices to ${clients.length} client(s) for user ${userId}`
          // )
          const message = JSON.stringify({ type: 'price_update', prices })

          // Broadcast to all connected clients for this user
          clients.forEach((ws) => {
            // console.log('WebSocket closed status:', ws.closed)
            if (!ws.closed) {
              ws.send(message)
              // console.log('Message sent')
            } else {
              // console.log('WebSocket is closed, skipping')
            }
          })
        } catch (error) {
          logger.error(`Error fetching prices for user ${userId}:`, error)
        }
      }
    }, 3000) // Every 3 seconds

    logger.info('Started WebSocket price broadcast interval')
  }

  // Stop price broadcast when no clients are connected
  const stopPriceBroadcast = () => {
    if (priceIntervalId && connectedClients.size === 0) {
      clearInterval(priceIntervalId)
      priceIntervalId = null
      logger.info('Stopped WebSocket price broadcast interval')
    }
  }

  return {
    handleUpgrade: (req, ws) => {
      // logger.info('WebSocket connection attempt received')

      // Extract token from query string or headers
      const token =
        req.query?.token || req.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        // logger.warn('WebSocket connection attempt without token')
        ws.close(4001, 'Authentication required')
        return
      }

      // logger.info('WebSocket token found, verifying...')

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET, {
          algorithms: ['HS256']
        })
        ws.user = decoded // Attach user info to WebSocket connection

        // JWT uses 'id' but code expects '_id', so add both
        ws.user._id = decoded.id

        // Add to connected clients and start price broadcast
        connectedClients.add(ws)
        startPriceBroadcast()

        logger.info(
          `WebSocket connected: user ${decoded.id} (${connectedClients.size} total clients)`
        )

        // Set up message handler
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString())
            handleMessage(ws, data)
          } catch (error) {
            logger.error('WebSocket message parse error:', error)
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
              })
            )
          }
        })

        // Handle disconnection
        ws.on('close', () => {
          connectedClients.delete(ws)
          logger.info(
            `WebSocket disconnected: user ${decoded._id} (${connectedClients.size} remaining clients)`
          )
          stopPriceBroadcast()
        })

        // Handle errors
        ws.on('error', (error) => {
          logger.error('WebSocket error:', error)
        })

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'connected',
            message: 'WebSocket connection established',
            exchange: process.env.BOT_EXCHANGE
          })
        )
      } catch (error) {
        // const errorMsg = error?.message || String(error)
        // logger.warn(`Invalid WebSocket token: ${errorMsg}`)
        ws.close(4001, 'Invalid token')
      }
    }
  }

  function handleMessage(ws, data) {
    const { type, payload } = data

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break

      case 'subscribe':
        // Handle subscription to specific events
        logger.info(`User ${ws.user._id} subscribed to ${payload?.channel}`)
        ws.send(
          JSON.stringify({ type: 'subscribed', channel: payload?.channel })
        )
        break

      case 'unsubscribe':
        // Handle unsubscription
        logger.info(`User ${ws.user._id} unsubscribed from ${payload?.channel}`)
        ws.send(
          JSON.stringify({ type: 'unsubscribed', channel: payload?.channel })
        )
        break

      default:
        ws.send(
          JSON.stringify({ type: 'error', message: 'Unknown message type' })
        )
    }
  }
}
