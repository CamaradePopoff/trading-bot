const fs = require('fs')
const https = require('https')

module.exports = function (io, logger) {
  const getLogs = async (logPath, user = null, botId = null) => {
    const files = fs
      .readdirSync(logPath)
      .filter((f) => f.endsWith('.log'))
      .sort()
      .reverse()
    const logs = { error: {}, info: {} }
    for (const file of files) {
      if (fs.statSync(`${logPath}/${file}`).size > 0) {
        const log = fs.readFileSync(`${logPath}/${file}`, 'utf8')
        const date = file
          .split('.')[0]
          .replace('error-', '')
          .replace('info-', '')
        const key = file.includes('error') ? 'error' : 'info'
        logs[key][date] = log.split('\n').filter((l) => l.trim() !== '')
        if (user) {
          logs[key][date] = logs[key][date].map((l) =>
            l.replace(` - ${user.username}`, '')
          )
        }
        if (botId) {
          logs[key][date] = logs[key][date].map((l) =>
            l.replace(` - ${botId}`, '').replace(/ \(.+-USD(T|C)?\)/, '')
          )
        }
      }
    }
    return logs
  }

  const getServerIp = async () => {
    return new Promise((resolve, reject) => {
      https
        .get('https://api.ipify.org?format=json', (resp) => {
          let data = ''
          resp.on('data', (chunk) => {
            data += chunk
          })
          resp.on('end', () => {
            try {
              const json = JSON.parse(data)
              resolve(json.ip)
            } catch (e) {
              reject(e)
            }
          })
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  }

  return {
    getLogs,
    getServerIp
  }
}
