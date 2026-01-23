const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['earning', 'purchase', 'transfer', 'withdrawal', 'deposit', 'refund', 'bonus', 'penalty'],
        required: true
    },
    subType: {
        type: String,
        enum: ['reading', 'video', 'task', 'referral', 'marketplace', 'cinema', 'book_sale', 'subscription', 'ad_revenue']
    },
    amount: {
        type: Number,
        required: true
    },
    balanceBefore: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    reference: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
        default: 'completed'
    },
    metadata: {
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book'
        },
        movieId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie'
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item'
        },
        taskId: String,
        offerId: String,
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        receiverUsername: String,
        paymentMethod: String,
        transactionId: String,
        platformFee: Number,
        tax: Number,
        currency: {
            type: String,
            default: 'NGN'
        }
    },
    platformFee: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    },
    ipAddress: String,
    userAgent: String,
    location: {
        country: String,
        city: String,
        region: String
    },
    notes: String,
    processedAt: Date,
    completedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate reference before saving
transactionSchema.pre('save', function(next) {
    if (!this.reference) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        this.reference = `TXN-${timestamp}-${random}`;
    }
    
    // Calculate net amount (amount - platformFee)
    this.netAmount = this.amount - (this.platformFee || 0);
    
    next();
});

// Indexes for better query performance
transactionSchema.index({ user: 1 });
transactionSchema.index({ username: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true, sparse: true });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ amount: -1 });
transactionSchema.index({ 'metadata.receiverId': 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
    return `₦${this.amount.toLocaleString()}`;
});

// Virtual for isCredit
transactionSchema.virtual('isCredit').get(function() {
    return ['earning', 'deposit', 'refund', 'bonus', 'transfer'].includes(this.type);
});

// Virtual for isDebit
transactionSchema.virtual('isDebit').get(function() {
    return ['purchase', 'withdrawal', 'penalty'].includes(this.type);
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
