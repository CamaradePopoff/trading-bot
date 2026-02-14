module.exports = function (logger = console) {
  const onlyForAdmin = (req, res, callback) => {
    if (req.user.permissions.indexOf('admin') !== -1) {
      callback(req, res)
    } else {
      logger.warn(
        'Illegal ADMIN %s access attempt to %s by %s ',
        req.method,
        req.originalUrl,
        req.user.username
      )
      return res.status(403).json({ message: 'ERROR_FORBIDDEN' })
    }
  }
  const onlyForUser = (req, res, callback) => {
    if (req.user.permissions.indexOf('user') !== -1) {
      callback(req, res)
    } else {
      logger.warn(
        'Illegal USER %s access attempt to %s by %s ',
        req.method,
        req.originalUrl,
        req.user.username
      )
      return res.status(403).json({ message: 'ERROR_FORBIDDEN' })
    }
  }

  const onlyForUserOrAdmin = (req, res, callback) => {
    if (
      req.user.permissions.indexOf('user') !== -1 ||
      req.user.permissions.indexOf('admin') !== -1
    ) {
      callback(req, res)
    } else {
      logger.warn(
        'Illegal USER or ADMIN %s access attempt to %s by %s ',
        req.method,
        req.originalUrl,
        req.user.username
      )
      return res.status(403).json({ message: 'ERROR_FORBIDDEN' })
    }
  }

  return {
    // permissions:
    onlyForAdmin,
    onlyForUser,
    onlyForUserOrAdmin
  }
}
