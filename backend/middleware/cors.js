/**
 * CORS Middleware for HyperExpress
 * HyperExpress-compatible implementation that doesn't use next()
 */

// const logger = require('../logger')

/**
 * Simple CORS middleware for HyperExpress
 * @param {Object} options - CORS options
 * @returns {Function} HyperExpress middleware
 */
function corsMiddleware(options = {}) {
  const {
    origin = '*',
    credentials = false,
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    maxAge = 86400
  } = options

  return async (request, response) => {
    const requestOrigin = request.headers.origin

    // Set CORS headers
    if (origin === '*') {
      // Never allow wildcard with credentials (security risk)
      if (!credentials) {
        response.header('Access-Control-Allow-Origin', '*')
      } else {
        // If credentials are required but origin is wildcard, fall back to reflecting the request origin
        // This is less secure but allows the request to proceed
        // logger.warn('CORS: Wildcard origin with credentials is not recommended. Reflecting request origin.')
        if (requestOrigin) {
          response.header('Access-Control-Allow-Origin', requestOrigin)
        }
      }
    } else if (typeof origin === 'string') {
      response.header('Access-Control-Allow-Origin', origin)
    } else if (Array.isArray(origin) && origin.includes(requestOrigin)) {
      response.header('Access-Control-Allow-Origin', requestOrigin)
    } else if (!origin && requestOrigin) {
      // If no origin specified, reflect the request origin
      response.header('Access-Control-Allow-Origin', requestOrigin)
    }

    if (credentials) {
      response.header('Access-Control-Allow-Credentials', 'true')
    }

    response.header('Access-Control-Allow-Methods', methods.join(', '))
    response.header('Access-Control-Allow-Headers', allowedHeaders.join(', '))
    response.header('Access-Control-Max-Age', maxAge.toString())

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return response.status(200).send()
    }

    // Do NOT call next() - HyperExpress continues automatically
  }
}

module.exports = corsMiddleware
