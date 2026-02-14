import Api from './api'

function getTopPairs() {
  return Api.sendRequestGET('ccy/tickers')
}

function getSymbolFees(symbol) {
  return Api.sendRequestGET(`ccy/${symbol}/fees`)
}

function getSymbolPrice(symbol) {
  return Api.sendRequestGET(`ccy/${symbol}/price`)
}

function getBatchPrices(symbols) {
  return Api.sendRequestPOST('ccy/prices/batch', { symbols })
}

function getCurrentPrices() {
  return Api.sendRequestGET('ccy/prices')
}

function getTradingPairs() {
  return Api.sendRequestGET('ccy/pairs')
}

function getNews(lang) {
  return Api.sendRequestGET(`ccy/news/${lang}`)
}

function getVipFee() {
  return Api.sendRequestGET('ccy/vip-level')
}

function buyCrypto(symbol, amount) {
  return Api.sendRequestPOST('ccy/buy-crypto', { symbol, amount })
}

function sellCrypto(symbol, amount) {
  return Api.sendRequestPOST('ccy/sell-crypto', { symbol, amount })
}

export default {
  getTopPairs,
  getSymbolFees,
  getSymbolPrice,
  getBatchPrices,
  getCurrentPrices,
  getTradingPairs,
  getNews,
  getVipFee,
  buyCrypto,
  sellCrypto
}
