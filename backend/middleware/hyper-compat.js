/**
 * HyperExpress Compatibility Wrappers
 * Important: HyperExpress middleware must NOT call next()
 * Async middleware should return a promise and NOT call next()
 */

/**
 * Mongo Sanitize wrapper for HyperExpress
 * Direct async middleware without next() callback
 */
function mongoSanitizeWrapper(options = {}) {
  const mongoSanitize = require('./mongo-sanitize')

  return async (request, response) => {
    // Sanitize the request in place
    if (request.body && typeof request.body === 'object') {
      request.body = mongoSanitize.sanitize(request.body, options)
    }

    if (request.params && typeof request.params === 'object') {
      request.params = mongoSanitize.sanitize(request.params, options)
    }

    // Don't call next() - just return the promise
    // This allows HyperExpress to continue the middleware chain
  }
}

/**
 * Rate limit wrapper for HyperExpress
 * Uses custom rate limiter directly
 */
function rateLimitWrapper(options = {}) {
  const rateLimit = require('./rate-limit')
  return rateLimit(options)
}

module.exports = {
  mongoSanitizeWrapper,
  rateLimitWrapper
}
