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

function getCandles(symbol, type = '3m', startAt = null, endAt = null) {
  const params = new URLSearchParams({ type })
  if (startAt) params.append('startAt', startAt)
  if (endAt) params.append('endAt', endAt)
  return Api.sendRequestGET(`ccy/${symbol}/candles?${params.toString()}`)
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
  getCandles,
  getBatchPrices,
  getCurrentPrices,
  getTradingPairs,
  getNews,
  getVipFee,
  buyCrypto,
  sellCrypto
}
