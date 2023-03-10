const mongoose = require('mongoose');


const { Schema, model } = mongoose;

const userSchema = new Schema({
  number: { 
    type: Number, 
    unique: true 
  },
  nis: { 
    type: Number
  },
  whatsapp_name: String,
  name: String,
  firstRegister: {
    type: Date,
    default: Date.now
  }
});

module.exports = model('User', userSchema)
