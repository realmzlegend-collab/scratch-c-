const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    genre: [String],
    duration: String,
    director: String,
    releaseYear: Number,
    googleDriveLink: {
        type: String,
        required: true
    },
    thumbnail: String,
    votes: {
        type: Number,
        default: 0
    },
    voters: [{
        userId: mongoose.Schema.Types.ObjectId,
        votedAt: Date
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    scheduleDate: Date,
    comments: [{
        userId: mongoose.Schema.Types.ObjectId,
        text: String,
        likes: Number,
        dislikes: Number,
        createdAt: Date
    }],
    totalWatches: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cinema', cinemaSchema);