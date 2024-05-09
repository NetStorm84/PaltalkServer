const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    uid: { type: Number, required: true, unique: true },
    nickname: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    premium: { type: Boolean, required: true, default: false },
    color: { type: String, required: true, default: '000000000' },
    admin: { type: Boolean, required: true, default: false },
    buddies: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
