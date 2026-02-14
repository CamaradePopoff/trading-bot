/**
 * Simple Rate Limiter for HyperExpress
 * In-memory implementation compatible with HyperExpress middleware
 */

/**
 * Create a rate limiting middleware for HyperExpress
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 * 60 * 1000 = 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 5)
 * @param {string} options.message - Message to send when limit exceeded
 * @param {string} options.statusCode - HTTP status code to use (default: 429)
 * @returns {Function} HyperExpress middleware function
 */
function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 5,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    keyGenerator = (req) => req.ip || req.socket?.remoteAddress || 'unknown'
  } = options

  // Store for tracking request counts: { key: { count, resetTime } }
  const store = new Map()

  /**
   * Clean up expired entries
   */
  const cleanup = () => {
    const now = Date.now()
    for (const [key, data] of store.entries()) {
      if (data.resetTime <= now) {
        store.delete(key)
      }
    }
  }

  // Run cleanup every 60 seconds
  setInterval(cleanup, 60000)

  /**
   * Middleware function compatible with HyperExpress
   */
  return async (request, response) => {
    const key = keyGenerator(request)
    const now = Date.now()

    // Get or create entry for this key
    if (!store.has(key)) {
      store.set(key, {
        count: 0,
        resetTime: now + windowMs
      })
    }

    const entry = store.get(key)

    // Reset if window has expired
    if (entry.resetTime <= now) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }

    // Increment counter
    entry.count++

    // Set rate limit info headers
    request.rateLimit = {
      limit: max,
      current: entry.count,
      remaining: Math.max(0, max - entry.count)
    }

    // Check if limit exceeded
    if (entry.count > max) {
      const resetTime = entry.resetTime
      const retryAfter = Math.ceil((resetTime - now) / 1000)

      response.header('Retry-After', retryAfter.toString())
      response.header('X-RateLimit-Limit', max.toString())
      response.header('X-RateLimit-Remaining', '0')
      response.header('X-RateLimit-Reset', (resetTime / 1000).toString())

      return response.status(statusCode).json({
        message: typeof message === 'object' ? message : { message }
      })
    }

    // Add rate limit headers
    response.header('X-RateLimit-Limit', max.toString())
    response.header(
      'X-RateLimit-Remaining',
      request.rateLimit.remaining.toString()
    )
    response.header('X-RateLimit-Reset', (entry.resetTime / 1000).toString())
  }
}

module.exports = rateLimit
