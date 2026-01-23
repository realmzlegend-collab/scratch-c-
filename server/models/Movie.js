const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter movie title'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Please enter movie description'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    genre: {
        type: String,
        required: [true, 'Please select genre'],
        enum: ['action', 'comedy', 'drama', 'horror', 'romance', 'sci-fi', 'fantasy', 'thriller', 'documentary']
    },
    thumbnail: {
        type: String,
        required: [true, 'Please provide thumbnail URL'],
        default: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    googleDriveLink: {
        type: String,
        required: [true, 'Please provide Google Drive link']
    },
    driveFileId: {
        type: String
    },
    duration: {
        type: Number, // in minutes
        default: 120
    },
    year: {
        type: Number,
        default: new Date().getFullYear()
    },
    director: {
        type: String,
        default: 'Unknown'
    },
    cast: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'featured', 'scheduled', 'playing', 'archived'],
        default: 'published'
    },
    type: {
        type: String,
        enum: ['free', 'premium', 'voting', 'scheduled'],
        default: 'free'
    },
    scheduledTime: {
        type: Date
    },
    currentViewers: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    },
    votes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    voteCount: {
        type: Number,
        default: 0
    },
    earningsPerView: {
        type: Number,
        default: 10 // Credits per view
    },
    earningsPerMinute: {
        type: Number,
        default: 1 // Credits per minute watched
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    platformEarnings: {
        type: Number,
        default: 0
    },
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        comment: {
            type: String,
            required: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    commentsCount: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    isActive: {
        type: Boolean,
        default: true
    },
    requiresSubscription: {
        type: Boolean,
        default: false
    },
    language: {
        type: String,
        default: 'english'
    },
    subtitles: [{
        language: String,
        url: String
    }],
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

// Extract Google Drive file ID from link
movieSchema.pre('save', function(next) {
    if (this.googleDriveLink) {
        const match = this.googleDriveLink.match(/\/d\/([^\/]+)/) || 
                     this.googleDriveLink.match(/id=([^&]+)/) ||
                     this.googleDriveLink.match(/\/([^\/]{25,})$/);
        if (match && match[1]) {
            this.driveFileId = match[1];
        }
    }
    
    // Update vote count
    this.voteCount = this.votes ? this.votes.length : 0;
    
    // Update likes count
    this.likesCount = this.likes ? this.likes.length : 0;
    
    // Update comments count
    this.commentsCount = this.comments ? this.comments.length : 0;
    
    next();
});

// Virtual for embed URL
movieSchema.virtual('embedUrl').get(function() {
    if (this.driveFileId) {
        return `https://drive.google.com/file/d/${this.driveFileId}/preview`;
    }
    return this.googleDriveLink;
});

// Virtual for watch URL
movieSchema.virtual('watchUrl').get(function() {
    if (this.driveFileId) {
        return `https://drive.google.com/uc?export=download&id=${this.driveFileId}`;
    }
    return this.googleDriveLink;
});

// Indexes for better query performance
movieSchema.index({ title: 'text', description: 'text' });
movieSchema.index({ status: 1 });
movieSchema.index({ type: 1 });
movieSchema.index({ genre: 1 });
movieSchema.index({ scheduledTime: 1 });
movieSchema.index({ voteCount: -1 });
movieSchema.index({ totalViews: -1 });
movieSchema.index({ createdAt: -1 });

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
