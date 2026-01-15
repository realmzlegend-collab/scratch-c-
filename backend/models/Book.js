const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    genre: {
        type: String,
        required: true,
        enum: ['novel', 'poetry', 'drama', 'prose', 'short-story', 'non-fiction', 'biography', 'fantasy', 'romance', 'mystery', 'others']
    },
    description: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: true
    },
    pages: {
        type: Number,
        default: 0
    },
    tags: [String],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: [{
        userId: mongoose.Schema.Types.ObjectId,
        rating: Number,
        comment: String,
        createdAt: Date
    }],
    views: {
        type: Number,
        default: 0
    },
    reads: {
        type: Number,
        default: 0
    },
    saves: [{
        userId: mongoose.Schema.Types.ObjectId,
        savedAt: Date
    }],
    donations: [{
        userId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        message: String,
        donatedAt: Date
    }],
    totalDonations: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isPublished: {
        type: Boolean,
        default: true
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
bookSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    // Calculate pages based on content length (approx 300 words per page)
    const wordCount = this.content.split(/\s+/).length;
    this.pages = Math.ceil(wordCount / 300);
    next();
});

module.exports = mongoose.model('Book', bookSchema);