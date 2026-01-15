const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// SAFETY CHECK: This allows the model to be re-used without crashing the server
module.exports = mongoose.models.User || mongoose.model('User', userSchema);