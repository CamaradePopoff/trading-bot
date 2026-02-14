import Api from './api'

function setPurchaseMargin(id, margin, fee) {
  return Api.sendRequestPOST(`transactions/${id}/set-margin/${margin}/${fee}`)
}

function getCryptoProfits() {
  const timezoneOffset = new Date().getTimezoneOffset()
  return Api.sendRequestGET(`transactions/crypto-profits?timezoneOffset=${timezoneOffset}`)
}

function deleteCryptoProfitHistory(symbol, simulation) {
  return Api.sendRequestDELETE(
    `transactions/crypto-profits${simulation ? '-simulated' : ''}/${symbol}`
  )
}

function getManualTransactions(symbol) {
  return Api.sendRequestGET(`transactions/${symbol}/manual`)
}

function getBatchManualTransactions(symbols) {
  return Api.sendRequestPOST('transactions/manual/batch', { symbols })
}

function pausePurchase(id) {
  return Api.sendRequestPOST(`transactions/${id}/pause`)
}

function unpausePurchase(id) {
  return Api.sendRequestPOST(`transactions/${id}/unpause`)
}

function getTotalInvestment() {
  return Api.sendRequestGET('transactions/total-investment')
}

function killPurchase(id) {
  return Api.sendRequestPOST(`transactions/${id}/kill`)
}

export default {
  setPurchaseMargin,
  getCryptoProfits,
  deleteCryptoProfitHistory,
  getManualTransactions,
  getBatchManualTransactions,
  pausePurchase,
  unpausePurchase,
  getTotalInvestment,
  killPurchase
}
