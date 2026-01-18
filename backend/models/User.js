const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Telegram users
    telegramId: { type: String, unique: true, sparse: true },
    balance: { type: Number, default: 50 },
    status: { type: String, default: 'active' },
    isAdmin: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
