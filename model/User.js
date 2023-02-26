const mongoose = require('mongoose');


const { Schema, model } = mongoose;

const userSchema = new Schema({
  number: { type: Number, unique: true },
  nis: { type: Number, unique: true },
  whatsapp_name: String,
  name: String,
  firstChat: {
    type: Date,
    default: Date.now
  }
});

module.exports = model('User', userSchema)
