const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  chapterNumber: Number,
  chapterTitle: String,
  content: String,
  pageCount: Number
});

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  coverImage: String,
  summary: String,
  tags: [String],
  chapters: [chapterSchema],
  totalPages: Number,
  likes: {
    type: Number,
    default: 0
  },
  likesBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  favorites: {
    type: Number,
    default: 0
  },
  favoritesBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reposts: {
    type: Number,
    default: 0
  },
  readers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pagesRead: Number,
    lastRead: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total pages before saving
bookSchema.pre('save', function(next) {
  if (this.chapters && this.chapters.length > 0) {
    this.totalPages = this.chapters.reduce((total, chapter) => total + (chapter.pageCount || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Book', bookSchema);
