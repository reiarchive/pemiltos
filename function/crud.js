const mongoose = require('mongoose');
const User = require('../model/User');
const Nis = require('../model/Nis');

mongoose.set("strictQuery", false);
mongoose.connect('mongodb://127.0.0.1/dbVoting');

async function addUser(data) {
    var userPemiltos = new User({
        number: data['number'],
        nis: data['nis'],
        whatsapp_name: data['whatsapp_name'],
        name: data['name'],
    });

    return userPemiltos.save()
    .then(userPemiltos => true)
    .catch(err => false)

}

async function searchUser(number) {
    
    const result = await User.findOne({ number: number });
    if (result) {
        return result
    } else {
        return false
    }

}

async function searchNis(nis) {
    
    const result = await Nis.findOne({ nis: nis });
    if (result) {
        return result
    } else {
        return false
    }

}


module.exports = { searchUser, addUser, searchNis }

