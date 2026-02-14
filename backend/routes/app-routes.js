const HyperExpress = require('hyper-express')

module.exports = function (io, logger) {
  const router = new HyperExpress.Router()

  const { onlyForAdmin } = require('../auth/permissions')(logger)
  const appService = require('../services/app-service')(io, logger)

  router.get('/logs', async (req, res) => {
    onlyForAdmin(req, res, async (req, res) => {
      res.status(200).json(await appService.getLogs('./logs'))
    })
  })

  router.get('/server-ip', async (req, res) => {
    try {
      const ip = await appService.getServerIp()
      res.status(200).json({ ip })
    } catch (error) {
      logger.error('Error getting server IP:', error)
      res.status(500).json({ error: 'Failed to get server IP' })
    }
  })

  return router
}
