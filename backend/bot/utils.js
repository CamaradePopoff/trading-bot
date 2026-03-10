require('dotenv').config()
const binance = require('./exchanges/binance/utils')
const kucoin = require('./exchanges/kucoin/utils')
const mexc = require('./exchanges/mexc/utils')
const okx = require('./exchanges/okx/utils')
const coinex = require('./exchanges/coinex/utils')
const kraken = require('./exchanges/kraken/utils')
// const cryptocom = require('./exchanges/crypto.com/utils')
// const coinbase = require('./exchanges/coinbase/utils')

console.log(`Loading code for exchange: ${process.env.BOT_EXCHANGE}`)
module.exports = {
  binance,
  kucoin,
  mexc,
  okx,
  coinex,
  kraken
  // coinbase,
  // 'crypto.com': cryptocom
}[process.env.BOT_EXCHANGE]
