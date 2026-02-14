import Api from './api'

function getLogs() {
  return Api.sendRequestGET('app/logs')
}

function getBotLogs(botId) {
  return Api.sendRequestGET(`bots/${botId}/logs`)
}

function getServerIp() {
  return Api.sendRequestGET('app/server-ip')
}

export default {
  getLogs,
  getBotLogs,
  getServerIp
}
