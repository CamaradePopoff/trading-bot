/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 * This is a lightweight alternative to csurf package
 */

const crypto = require('crypto')

/**
 * Generate a CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens from cookie and header/body
 */
function csrfProtection(options = {}) {
  const {
    cookieName = 'XSRF-TOKEN',
    headerName = 'X-XSRF-TOKEN',
    bodyField = '_csrf',
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS']
  } = options

  return (req, res) => {
    // Skip for safe methods
    if (ignoreMethods.includes(req.method)) {
      // Do NOT call next() - HyperExpress continues automatically
      return
    }

    // Get token from cookie
    const cookieToken = req.cookies && req.cookies[cookieName]

    // Get token from header or body
    const headerToken = req.headers[headerName.toLowerCase()]
    const bodyToken = req.body && req.body[bodyField]
    const requestToken = headerToken || bodyToken

    // Validate tokens match
    if (!cookieToken || !requestToken || cookieToken !== requestToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing CSRF token'
      })
    }

    // Do NOT call next() - HyperExpress continues automatically
  }
}

/**
 * Middleware to set CSRF token in cookie
 * Should be used on all routes that need CSRF protection
 * HyperExpress: No next() call
 */
function setCsrfToken(options = {}) {
  const {
    cookieName = 'XSRF-TOKEN',
    cookieOptions = {
      httpOnly: false, // Must be false so client JavaScript can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    }
  } = options

  return (req, res) => {
    // Generate new token if not present
    if (!req.cookies || !req.cookies[cookieName]) {
      const token = generateToken()
      res.cookie(cookieName, token, cookieOptions)
      req.csrfToken = token
    } else {
      req.csrfToken = req.cookies[cookieName]
    }

    // Make token available in res.locals for templates
    res.locals.csrfToken = req.csrfToken

    // Do NOT call next() - HyperExpress continues automatically
  }
}

/**
 * Helper to get CSRF token for API responses
 */
function getCsrfToken(req) {
  return req.csrfToken || null
}

module.exports = {
  csrfProtection,
  setCsrfToken,
  getCsrfToken,
  generateToken
}
