/**
 * Simple JWT Authentication Middleware
 * Replaces Passport.js with a lightweight JWT implementation
 */

const jwt = require('jsonwebtoken')
const User = require('../models/user')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION'

/**
 * Extract JWT token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return null
  }

  // Support "Bearer <token>" format
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]
  }

  // Support plain token
  return authHeader
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to req.user
 * HyperExpress-compatible: Returns promise, does NOT call next()
 */
async function authenticate(req, res) {
  try {
    const token = extractToken(req)

    if (!token) {
      return res
        .status(401)
        .json({ message: 'No authentication token provided' })
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    })

    // Fetch user from database
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    // Attach user to request
    req.user = user
    // Do NOT call next() - HyperExpress continues automatically
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' })
    }
    return res.status(500).json({ message: 'Authentication error' })
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration (default: '1h')
 * @returns {string} JWT token
 */
function generateToken(user, expiresIn = '1h') {
  const payload = {
    id: user._id || user.id,
    username: user.username,
    permissions: user.permissions
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

module.exports = {
  authenticate,
  generateToken,
  extractToken
}
