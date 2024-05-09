const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    uid: { type: Number, required: true, unique: true },
    nickname: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    premium: { type: Boolean, required: true, default: false },
    admin: { type: Boolean, required: true, default: false },
    buddies: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Storing references using _id
});

const User = mongoose.model('User', userSchema);

module.exports = User;
