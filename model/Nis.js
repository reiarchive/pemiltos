const mongoose = require('mongoose');


const { Schema, model } = mongoose;

const nisSchema = new Schema({
  nis: { type: Number, unique: true},
  nama: String
});

module.exports = model('Nis',nisSchema)