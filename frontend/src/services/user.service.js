import Api from './api'

function register(user) {
  return Api.sendRequestPOST('auth/register', user)
}

function login(username, password) {
  return Api.sendRequestPOST('auth/login', { username, password })
}

function getBalances() {
  return Api.sendRequestGET('users/balances')
}

function getMe() {
  return Api.sendRequestGET('users/me')
}

function saveMe(user) {
  return Api.sendRequestPUT('users/me', user)
}

function getTotalProfits() {
  return Api.sendRequestGET('users/me/total-profits')
}

function getDailyProfits(period = 'week') {
  return Api.sendRequestGET(`users/me/daily-profits/${period}`)
}

function getDailyProfitsSimulated(period = 'week') {
  return Api.sendRequestGET(`users/me/daily-profits-simul/${period}`)
}

function deleteSimulatedProfits() {
  return Api.sendRequestDELETE('users/me/simulated-profits')
}

function updateFavorites(exchangeName, favorites) {
  return Api.sendRequestPUT('users/me/favorites', { exchangeName, favorites })
}

function getExchanges() {
  return Api.sendRequestGET('users/me/exchanges')
}

function saveExchange(exchange) {
  return Api.sendRequestPOST('users/me/exchanges', { exchange })
}

function deleteExchange(exchangeId) {
  return Api.sendRequestDELETE(`users/me/exchanges/${exchangeId}`)
}

function getAllUsers() {
  return Api.sendRequestGET('users')
}

export default {
  register,
  login,
  getBalances,
  getMe,
  saveMe,
  getTotalProfits,
  getDailyProfits,
  getDailyProfitsSimulated,
  deleteSimulatedProfits,
  updateFavorites,
  getExchanges,
  saveExchange,
  deleteExchange,
  getAllUsers
}
