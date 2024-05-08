const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: { type: Number, required: true, unique: true },
    nickname: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    premium: { type: Boolean, required: true, default: false },
    admin: { type: Boolean, required: true, default: false }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
