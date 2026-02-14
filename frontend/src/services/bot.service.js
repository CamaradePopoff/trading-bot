import Api from './api'

function createBot(config) {
  return Api.sendRequestPOST('bots', config)
}

function getBots() {
  return Api.sendRequestGET('bots')
}

function getBotById(id) {
  return Api.sendRequestGET(`bots/${id}`)
}

function getTransactions(id) {
  return Api.sendRequestGET(`bots/${id}/transactions`)
}

function startBot(id) {
  return Api.sendRequestPOST(`bots/${id}/start`)
}

function pauseBot(id) {
  return Api.sendRequestPOST(`bots/${id}/pause`)
}

function resumeBot(id) {
  return Api.sendRequestPOST(`bots/${id}/resume`)
}

function stopBot(id) {
  return Api.sendRequestPOST(`bots/${id}/stop`)
}

function sellAllPositive(id) {
  return Api.sendRequestPOST(`bots/${id}/sell-all-positive`)
}

function deleteBot(id) {
  return Api.sendRequestDELETE(`bots/${id}`)
}

async function sellNow(id, purchaseId) {
  const res = await Api.sendRequestPOST(`bots/${id}/sell-now/${purchaseId}`)
  if (res && res.error) throw new Error(res.error)
  return res
}

async function buyNow(id, usd = null) {
  const res = usd
    ? await Api.sendRequestPOST(`bots/${id}/buy-now/${usd}`)
    : await Api.sendRequestPOST(`bots/${id}/buy-now`)
  if (res && res.error) throw new Error(res.error)
  return res
}

function updateConfig(id, config) {
  return Api.sendRequestPUT(`bots/${id}/config`, config)
}

function toggleStopBuying(id, toggle) {
  return Api.sendRequestPOST(`bots/${id}/${toggle ? 'stop' : 'go'}-buy`)
}

function toggleStopBuyingOnDrop(id, toggle) {
  return Api.sendRequestPOST(`bots/${id}/${toggle ? 'stop' : 'go'}-buy-on-drop`)
}

function toggleStopBuyingOnRebuy(id, toggle) {
  return Api.sendRequestPOST(`bots/${id}/${toggle ? 'stop' : 'go'}-buy-on-rebuy`)
}

function toggleCryptoConvert(id, toggle) {
  return Api.sendRequestPOST(
    `bots/${id}/${toggle ? 'stop' : 'go'}-crypto-convert`
  )
}

function toggleProfitReuse(id, toggle) {
  return Api.sendRequestPOST(
    `bots/${id}/${toggle ? 'stop' : 'go'}-profit-reuse`
  )
}

function getLogs(id) {
  return Api.sendRequestGET(`bots/${id}/logs`)
}

function exportBotConfigs(exchange, botIds = null) {
  if (botIds && botIds.length > 0) {
    return Api.sendRequestPOST(`bots/export/${exchange}`, { botIds })
  }
  return Api.sendRequestGET(`bots/export/${exchange}`)
}

function importBotConfigs(exchange, configs) {
  return Api.sendRequestPOST(`bots/import/${exchange}`, { configs })
}

function pauseAllBots(botIds) {
  return Api.sendRequestPOST('bots/pause-all', { botIds })
}

function resumeAllBots(botIds) {
  return Api.sendRequestPOST('bots/resume-all', { botIds })
}

function stopBuyingAllBots(botIds) {
  return Api.sendRequestPOST('bots/stop-buy-all', { botIds })
}

function goBuyingAllBots(botIds) {
  return Api.sendRequestPOST('bots/go-buy-all', { botIds })
}

function stopBuyingOnDropAllBots(botIds) {
  return Api.sendRequestPOST('bots/stop-buy-on-drop-all', { botIds })
}

function goBuyingOnDropAllBots(botIds) {
  return Api.sendRequestPOST('bots/go-buy-on-drop-all', { botIds })
}

function stopBuyingOnRebuyAllBots(botIds) {
  return Api.sendRequestPOST('bots/stop-buy-on-rebuy-all', { botIds })
}

function goBuyingOnRebuyAllBots(botIds) {
  return Api.sendRequestPOST('bots/go-buy-on-rebuy-all', { botIds })
}

function getAdminBots(userId, exchange) {
  return Api.sendRequestGET(`bots/admin/${userId}/${exchange}`)
}

export default {
  createBot,
  getBots,
  getBotById,
  getTransactions,
  startBot,
  pauseBot,
  resumeBot,
  pauseAllBots,
  resumeAllBots,
  stopBuyingAllBots,
  goBuyingAllBots,
  stopBuyingOnDropAllBots,
  goBuyingOnDropAllBots,
  stopBuyingOnRebuyAllBots,
  goBuyingOnRebuyAllBots,
  sellAllPositive,
  stopBot,
  deleteBot,
  sellNow,
  buyNow,
  updateConfig,
  toggleStopBuying,
  toggleStopBuyingOnDrop,
  toggleStopBuyingOnRebuy,
  toggleCryptoConvert,
  toggleProfitReuse,
  getLogs,
  exportBotConfigs,
  importBotConfigs,
  getAdminBots
}
