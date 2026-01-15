const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: ''
    },
    balance: {
        type: Number,
        default: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    tasksCompleted: [{
        taskId: String,
        amount: Number,
        date: Date
    }],
    readingHistory: [{
        bookId: mongoose.Schema.Types.ObjectId,
        lastPage: Number,
        lastRead: Date
    }],
    wishlist: [{
        bookId: mongoose.Schema.Types.ObjectId,
        addedAt: Date
    }],
    marketplaceListings: [{
        listingId: mongoose.Schema.Types.ObjectId
    }],
    settings: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);