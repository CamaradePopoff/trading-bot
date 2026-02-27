require('dotenv').config()
const binance = require('./exchanges/binance/utils')
const bybit = require('./exchanges/bybit/utils')
const kucoin = require('./exchanges/kucoin/utils')
const mexc = require('./exchanges/mexc/utils')

console.log(`Loading code for exchange: ${process.env.BOT_EXCHANGE}`)
module.exports = {
  binance,
  bybit,
  kucoin,
  mexc
  // kraken
}[process.env.BOT_EXCHANGE]
