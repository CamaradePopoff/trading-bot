const mongoose = require('mongoose')
const Schema = mongoose.Schema

const { exchanges } = require('../auth/enums')

const schema = new Schema(
  {
    createdAt: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, enum: exchanges },
    apiKey: { type: String },
    apiSecret: { type: String },
    apiPassphrase: { type: String },
    favorites: [{ type: String }]
  },
  {
    collection: 'exchanges',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('Exchange', schema)
