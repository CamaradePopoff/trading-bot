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
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
    associatedPurchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      unique: true,
      required: true
    },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    fee: { type: Number }, // TODO required
    buyPrice: { type: Number, required: true },
    profitMargin: { type: Number }, // TODO required
    profit: { type: Number, required: true },
    isForced: { type: Boolean, default: false },
    isEmergency: { type: Boolean, default: false },
    profitAsCrypto: { type: Number }
  },
  {
    collection: 'sellings',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('Selling', schema)
