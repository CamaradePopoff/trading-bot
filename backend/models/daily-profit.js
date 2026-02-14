const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    exchange: { type: String, default: 'kucoin' },
    symbol: { type: String, required: true },
    profit: { type: Number, default: 0 },
    profitSimulated: { type: Number, default: 0 }
  },
  {
    collection: 'daily-profits',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('DailyProfit', schema)
