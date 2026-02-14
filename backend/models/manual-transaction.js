const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    createdAt: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    fee: { type: Number, required: true },
    received: { type: Number }, // (USDx) for a selling
    paid: { type: Number } // (USDx) for a purchase
  },
  {
    collection: 'manual-transaction',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('ManualTransaction', schema)
