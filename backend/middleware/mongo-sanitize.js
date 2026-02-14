/**
 * MongoDB Sanitization Middleware for Express 5
 * Compatible with Express 5's read-only req.query
 *
 * This middleware prevents MongoDB operator injection by removing/replacing
 * prohibited characters ($, .) from user input in req.body and req.params.
 * Note: req.query sanitization is handled by the query parser configuration.
 */

/**
 * Recursively sanitize an object by removing keys with $ or .
 * @param {*} payload - The object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {*} Sanitized object
 */
function sanitize(payload, options = {}) {
  const { replaceWith = null, allowDots = false } = options

  if (payload === null || typeof payload !== 'object') {
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitize(item, options))
  }

  const result = {}

  for (const [key, value] of Object.entries(payload)) {
    let sanitizedKey = key

    // Check for prohibited characters
    const hasDollar = key.includes('$')
    const hasDot = !allowDots && key.includes('.')

    if (hasDollar || hasDot) {
      if (replaceWith !== null) {
        // Replace prohibited characters
        sanitizedKey = key.replace(/\$/g, replaceWith)
        if (!allowDots) {
          sanitizedKey = sanitizedKey.replace(/\./g, replaceWith)
        }
      } else {
        // Skip this key entirely
        continue
      }
    }

    // Recursively sanitize nested objects
    result[sanitizedKey] = sanitize(value, options)
  }

  return result
}

/**
 * Express middleware for MongoDB sanitization
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function mongoSanitizeMiddleware(options = {}) {
  return (req, res) => {
    // Sanitize req.body (mutable)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body, options)
    }

    // Sanitize req.params (mutable)
    if (req.params && typeof req.params === 'object') {
      // Create new object to avoid prototype issues
      const sanitizedParams = sanitize(req.params, options)
      // Replace params object entirely to avoid prototype pollution
      req.params = sanitizedParams
    }

    // Note: req.query is read-only in Express 5
    // Query sanitization should be handled by configuring the query parser
    // or by using a custom query string parser

    // Do NOT call next() - HyperExpress continues automatically
  }
}

/**
 * Check if an object has prohibited characters
 * @param {*} payload - The object to check
 * @param {boolean} allowDots - Whether to allow dots
 * @returns {boolean} True if prohibited characters found
 */
function has(payload, allowDots = false) {
  if (payload === null || typeof payload !== 'object') {
    return false
  }

  if (Array.isArray(payload)) {
    return payload.some((item) => has(item, allowDots))
  }

  for (const [key, value] of Object.entries(payload)) {
    const hasDollar = key.includes('$')
    const hasDot = !allowDots && key.includes('.')

    if (hasDollar || hasDot) {
      return true
    }

    if (has(value, allowDots)) {
      return true
    }
  }

  return false
}

module.exports = mongoSanitizeMiddleware
module.exports.sanitize = sanitize
module.exports.has = has
