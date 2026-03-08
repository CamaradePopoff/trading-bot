require('colors')
const logger = require('../../../logger')

function jsRound(num) {
  return Math.round(1e15 * num) / 1e15
}

function botLog(botId, message, customLogger = console) {
  const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
  if (customLogger) customLogger.info(`${now} - ${botId} - ${message}`)
}

function notImplemented(functionName) {
  const error = new Error(
    `Crypto.com adapter: ${functionName} is not implemented yet`
  )
  logger.error(error.message)
  throw error
}

async function getTickers() {
  return {}
}

async function getCurrentPrice() {
  return 0
}

async function placeOrder() {
  return notImplemented('placeOrder')
}

async function getTradingPairs() {
  return []
}

async function getTradingPairFee() {
  return {
    takerFeeRate: 0,
    platformTokenDiscount: false
  }
}

async function getUserVipLevel() {
  return 0
}

async function getMinimumSize() {
  return 0
}

async function getAccountBalances() {
  return []
}

async function getCryptoBalance() {
  return 0
}

async function buyCrypto() {
  return notImplemented('buyCrypto')
}

async function sellCrypto() {
  return notImplemented('sellCrypto')
}

async function getNews() {
  return []
}

module.exports = {
  jsRound,
  getTickers,
  getCurrentPrice,
  placeOrder,
  getTradingPairs,
  getTradingPairFee,
  getUserVipLevel,
  getMinimumSize,
  getAccountBalances,
  getCryptoBalance,
  buyCrypto,
  sellCrypto,
  botLog,
  getNews
}
