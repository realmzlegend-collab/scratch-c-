const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'fashion', 'home', 'vehicles', 'services', 'books', 'others']
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    condition: {
        type: String,
        required: true,
        enum: ['new', 'used', 'used-good', 'used-fair', 'refurbished']
    },
    location: {
        type: String,
        required: true
    },
    whatsappNumber: {
        type: String,
        required: true
    },
    images: [{
        type: String,
        required: true
    }],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'sold', 'pending', 'expired'],
        default: 'active'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    saves: [{
        userId: mongoose.Schema.Types.ObjectId,
        savedAt: Date
    }],
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
marketplaceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Marketplace', marketplaceSchema);