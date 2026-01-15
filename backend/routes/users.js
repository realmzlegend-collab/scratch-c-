const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: ''
    },
    fullName: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    location: {
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
    totalWithdrawn: {
        type: Number,
        default: 0
    },
    offerwallEarnings: {
        type: Number,
        default: 0
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    donationEarnings: {
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
        lastChapter: Number,
        lastRead: Date
    }],
    wishlist: [{
        bookId: mongoose.Schema.Types.ObjectId,
        addedAt: Date
    }],
    marketplaceListings: [{
        listingId: mongoose.Schema.Types.ObjectId
    }],
    votedMovies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cinema'
    }],
    referrals: [{
        userId: mongoose.Schema.Types.ObjectId,
        joinedAt: Date,
        earnedForYou: Number
    }],
    activeReferrals: {
        type: Number,
        default: 0
    },
    withdrawals: [{
        amount: Number,
        method: String,
        details: Object,
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        transactionId: String,
        requestedAt: Date,
        processedAt: Date
    }],
    settings: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        profileVisibility: {
            type: String,
            enum: ['public', 'private', 'friends'],
            default: 'public'
        },
        twoFactorAuth: {
            type: Boolean,
            default: false
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
    isAdmin: {
        type: Boolean,
        default: false
    },
    donationsMade: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);
