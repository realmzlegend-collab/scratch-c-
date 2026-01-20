const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  googleDriveLink: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  voteCount: {
    type: Number,
    default: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  scheduledTime: {
    type: Date
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number // in minutes
  },
  category: {
    type: String,
    enum: ['action', 'comedy', 'drama', 'horror', 'sci-fi', 'documentary'],
    default: 'action'
  },
  views: {
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
}, {
  timestamps: true
});

const Movie = mongoose.model('Movie', MovieSchema);
module.exports = Movie;
