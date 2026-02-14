const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    createdAt: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    config: {
      exchange: { type: String, default: 'kucoin' },
      exchangeAsset: { type: String, default: 'USDT' },
      label: { type: String },
      botInterval: { type: Number, required: true },
      symbol: { type: String, required: true },
      symbolMinSize: { type: Number }, // TODO required: true
      symbolIncrement: { type: Number }, // TODO required: true
      fee: { type: Number }, // TODO required: true
      priceDropThreshold: { type: Number },
      priceDropThresholds: { type: [Number] },
      emergencyUnlockThreshold: { type: Number },
      emergencyUnlockPositions: { type: Number, default: 1 },
      profitMargin: { type: Number, required: true },
      maxPositions: { type: Number, required: true },
      positionsToRebuy: { type: Number, default: 1 },
      maxInvestment: { type: Number, required: true },
      minWorkingPrice: { type: Number },
      maxWorkingPrice: { type: Number },
      convertProfitToCrypto: { type: Boolean, default: false },
      reuseProfitToMaxPositions: { type: Number },
      reuseProfit: { type: Boolean, default: false },
      simulation: { type: Boolean, required: true }
    },
    stopBuying: { type: Boolean, default: false },
    openingPrice: { type: Number, required: true },
    currentPrice: { type: Number },
    hasStarted: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    cycles: { type: Number, default: 0 },
    freePositions: { type: Number, default: 0 },
    lastHighestPrice: { type: Number, default: 0 },
    lastSoldPrice: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalProfitCrypto: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    positionBoost: { type: Number, default: 0 },
    usdtBoost: { type: Number, default: 0 },
    currentThresholdIndex: { type: Number, default: 0 },
    activeEmergencyPositions: { type: Number, default: 0 }
  },
  {
    collection: 'bots',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('Bot', schema)
