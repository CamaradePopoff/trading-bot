const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    exchange: { type: String, default: 'kucoin' },
    profit: { type: Number, default: 0 },
    profitSimulated: { type: Number, default: 0 }
  },
  {
    collection: 'total-profits',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('TotalProfit', schema)
