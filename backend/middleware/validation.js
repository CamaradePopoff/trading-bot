/**
 * Input Validation Middleware
 * Uses express-validator to validate and sanitize user inputs
 */

const { body, param, query, validationResult } = require('express-validator')

/**
 * Middleware to handle validation errors
 * HyperExpress: Route handler, no next() call
 */
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    })
  }
  // Do NOT call next() - HyperExpress continues automatically
}

/**
 * Wraps validation rules for HyperExpress
 * Express-validator middleware needs special handling because:
 * 1. Express-validator chains are designed for Express which uses next() callbacks
 * 2. HyperExpress doesn't support next() in async middleware
 * 3. We need to wrap the entire validation flow
 */
function wrapValidation(rules) {
  return async (req, res) => {
    // Run all validation rules in sequence
    // Each rule from express-validator chain is a middleware function
    for (const rule of rules) {
      // Create a promise-based execution for each rule
      await new Promise((resolve, reject) => {
        // Mock next() that resolves the promise
        rule(req, res, (err) => {
          // If error passed to next(), reject the promise
          if (err) {
            return reject(err)
          }
          // express-validator stores validation errors in req, not passed to next
          resolve()
        })
      })
    }

    // Check for validation errors after all rules run
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      })
    }
    // Do NOT call next() - HyperExpress continues automatically
  }
}

/**
 * Bot configuration validation rules
 */
const validateBotConfig = [
  body('botInterval')
    .optional()
    .isInt({ min: 3, max: 60 })
    .withMessage('Bot interval must be between 3 and 60 seconds'),

  body('maxInvestment')
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Max investment must be between 0.01 and 1,000,000'),

  body('maxPositions')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max positions must be between 1 and 100'),

  body('priceDropThreshold')
    .optional()
    .isFloat({ min: 0.01, max: 99 })
    .withMessage('Price drop threshold must be between 0.01% and 99%'),

  body('profitMargin')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Profit margin must be between 0.01% and 100%'),

  body('stopLoss')
    .optional()
    .isFloat({ min: 1, max: 99 })
    .withMessage('Stop loss must be between 1% and 99%'),

  body('trailingStop')
    .optional()
    .isBoolean()
    .withMessage('Trailing stop must be a boolean'),

  body('trailingStopPercent')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Trailing stop percent must be between 0.1% and 50%'),

  body('orderType')
    .optional()
    .isIn(['market', 'limit'])
    .withMessage('Order type must be either "market" or "limit"'),

  body('simulation')
    .optional()
    .isBoolean()
    .withMessage('Simulation must be a boolean'),

  body('active').optional().isBoolean().withMessage('Active must be a boolean'),

  body('symbol')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9-]+$/)
    .withMessage(
      'Symbol must be 3-20 uppercase alphanumeric characters with hyphens'
    ),

  body('exchange')
    .optional()
    .trim()
    .isIn([
      'binance',
      'bitget',
      'bybit',
      'coinbase',
      'kraken',
      'kucoin',
      'mexc',
      'okx'
    ])
    .withMessage('Invalid exchange'),

  handleValidationErrors
]

/**
 * User registration validation rules
 */
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 4, max: 16 })
    .withMessage('Username must be between 4 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  handleValidationErrors
]

/**
 * User update validation rules
 */
const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 4, max: 16 })
    .withMessage('Username must be between 4 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),

  body('password')
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  handleValidationErrors
]

/**
 * Exchange API credentials validation
 * Payload structure: { exchange: { name, apiKey, apiSecret, apiPassphrase } }
 */
const validateExchangeCredentials = [
  body('exchange.name')
    .trim()
    .isIn(['Binance', 'ByBit', 'KuCoin', 'MEXC'])
    .withMessage('Invalid exchange name'),

  body('exchange.apiKey')
    .trim()
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('API key must be between 10 and 2000 characters'),

  body('exchange.apiSecret')
    .trim()
    .notEmpty()
    .withMessage('API secret is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('API secret must be between 10 and 2000 characters'),

  body('exchange.apiPassphrase')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('API passphrase must be less than 2000 characters'),

  handleValidationErrors
]

/**
 * MongoDB ObjectId validation
 * Internal function - returns array of validators
 */
const createObjectIdValidator = (paramName = 'id') => [
  param(paramName)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid ID format'),

  handleValidationErrors
]

/**
 * Transaction validation
 */
const validateTransaction = [
  body('amount')
    .isFloat({ min: 0.00000001, max: 1000000 })
    .withMessage('Amount must be between 0.00000001 and 1,000,000'),

  body('price')
    .optional()
    .isFloat({ min: 0.00000001 })
    .withMessage('Price must be a positive number'),

  body('symbol')
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9-]+$/)
    .withMessage(
      'Symbol must be 3-20 uppercase alphanumeric characters with hyphens'
    ),

  body('type')
    .isIn(['buy', 'sell'])
    .withMessage('Transaction type must be either "buy" or "sell"'),

  handleValidationErrors
]

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be between 1 and 10,000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
]

/**
 * Sanitize string input to prevent XSS
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value

  // Remove any HTML tags
  return (
    value
      .replace(/<[^>]*>/g, '')
      // Remove any script-like content
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Limit length
      .substring(0, 1000)
  )
}

module.exports = {
  validateBotConfig: wrapValidation(
    validateBotConfig.filter((item) => item !== handleValidationErrors)
  ),
  validateRegistration: wrapValidation(
    validateRegistration.filter((item) => item !== handleValidationErrors)
  ),
  validateUserUpdate: wrapValidation(
    validateUserUpdate.filter((item) => item !== handleValidationErrors)
  ),
  validateExchangeCredentials: wrapValidation(
    validateExchangeCredentials.filter(
      (item) => item !== handleValidationErrors
    )
  ),
  validateObjectId: (paramName = 'id') => {
    const rules = createObjectIdValidator(paramName).filter(
      (item) => item !== handleValidationErrors
    )
    return wrapValidation(rules)
  },
  validateTransaction: wrapValidation(
    validateTransaction.filter((item) => item !== handleValidationErrors)
  ),
  validatePagination: wrapValidation(
    validatePagination.filter((item) => item !== handleValidationErrors)
  ),
  handleValidationErrors,
  sanitizeString
}
