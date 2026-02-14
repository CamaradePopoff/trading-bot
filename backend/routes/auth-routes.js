const HyperExpress = require('hyper-express')
const bcrypt = require('bcrypt')
const { generateToken } = require('../middleware/jwt-auth')

const User = require('../models/user')

module.exports = function (io, logger) {
  const router = new HyperExpress.Router()

  // const userService = require('../services/user-service')(io, logger)

  /* router.post('/register', async (req, res) => {
    try {
      const result = await userService.register(req.body)
      return res.status(result.status).json({ message: result.message })
    } catch (errr) {
      logger.error(errr)
      return res.status(500).json({ message: 'ERROR_REGISTER' })
    }
  }) */

  router.post('/login', async function (req, res) {
    logger.info('Authentication attempt for %s', req.body?.username)

    try {
      const { username, password } = req.body || {}

      // Escape special regex characters to prevent ReDoS
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Find user (case-insensitive)
      const user = await User.findOne({
        username: new RegExp(`^${escapedUsername}$`, 'i')
      }).exec()

      if (!user) {
        logger.warn('Authentication failure for %s (no such user)', username)
        return res
          .status(400)
          .json({ message: 'ERROR_INCORRECT_USERNAME_OR_PASSWORD' })
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        logger.warn('Authentication failure for %s (wrong password)', username)
        return res
          .status(400)
          .json({ message: 'ERROR_INCORRECT_USERNAME_OR_PASSWORD' })
      }

      // Update last connection
      user.lastConnection = new Date().toISOString()
      await user.save()

      // Generate JWT token
      const token = generateToken(user, '1h')

      // Return user and token (exclude sensitive fields)
      logger.info('Authentication success for %s', user.username)
      const { password: _, __v, ...userData } = user.toJSON()

      return res.status(200).json({ user: userData, token })
    } catch (error) {
      logger.error(error)
      return res.status(500).json({ message: 'ERROR_LOGIN_USER' })
    }
  })

  return router
}
