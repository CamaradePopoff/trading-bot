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
    associatedSelling: { type: mongoose.Schema.Types.ObjectId, ref: 'Selling' },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    paid: { type: Number }, // TODO required
    fee: { type: Number }, // TODO required
    profitMargin: { type: Number, required: true },
    targetPrice: { type: Number, required: true },
    isForced: { type: Boolean, default: false },
    isEmergency: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    isSold: { type: Boolean, default: false }
  },
  {
    collection: 'purchases',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

// Indexes for query optimization
schema.index({ botId: 1, isSold: 1, isPaused: 1 }) // For getBotPurchases
schema.index({ botId: 1, isSold: 1, isPaused: 1, targetPrice: 1 }) // For getBotPurchasesAboveTargetPrice
schema.index({ userId: 1, isSold: 1 }) // For getTotalInvestment
schema.index({ botId: 1, createdAt: -1 }) // For transaction lists

module.exports = mongoose.model('Purchase', schema)
