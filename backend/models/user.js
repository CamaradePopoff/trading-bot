const mongoose = require('mongoose')
const Schema = mongoose.Schema

const { permissions } = require('../auth/enums')

const schema = new Schema(
  {
    createdAt: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    permissions: [{ type: String, required: true, enum: permissions }],
    lastConnection: { type: String }
  },
  {
    collection: 'users',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
)

module.exports = mongoose.model('User', schema)
