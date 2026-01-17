const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Telegram authentication fields
    telegramId: {
        type: Number,
        unique: true,
        sparse: true
    },
    telegramUsername: {
        type: String
    },
    telegramPhotoUrl: {
        type: String
    },
    telegramAuthDate: {
        type: Date
    },
    isTelegramUser: {
        type: Boolean,
        default: false
    },
    
    // Traditional authentication fields
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        // Required for traditional users, optional for Telegram users
        required: function() { 
            return !this.isTelegramUser; 
        },
        validate: {
            validator: function(v) {
                // Only validate if email exists (non-Telegram users)
                if (this.isTelegramUser && !v) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    password: {
        type: String,
        // Required only for traditional users
        required: function() { 
            return !this.isTelegramUser; 
        },
        select: false // Don't return password in queries by default
    },
    
    // Common user fields
    displayName: {
        type: String,
        default: function() {
            if (this.isTelegramUser) {
                return this.firstName || this.telegramUsername || 'Telegram User';
            }
            return this.username;
        }
    },
    firstName: String,
    lastName: String,
    profilePic: {
        type: String,
        default: function() {
            if (this.isTelegramUser && this.telegramPhotoUrl) {
                return this.telegramPhotoUrl;
            }
            return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.displayName) + '&background=FFD700&color=000';
        }
    },
    
    // Account status and permissions
    balance: {
        type: Number,
        default: 50, // Starting balance for new users
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    // Subscription info
    subscriptionActive: {
        type: Boolean,
        default: false
    },
    subscriptionExpiry: Date,
    subscriptionType: {
        type: String,
        enum: ['free', 'basic', 'premium', 'pro'],
        default: 'free'
    },
    freeTrialUsed: {
        type: Boolean,
        default: false
    },
    freeTrialExpiry: Date,
    
    // Activity tracking
    lastLogin: {
        type: Date,
        default: Date.now
    },
    loginCount: {
        type: Number,
        default: 0
    },
    dailyStreak: {
        type: Number,
        default: 0
    },
    lastActivity: Date,
    
    // User stats
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    followerCount: {
        type: Number,
        default: 0
    },
    followingCount: {
        type: Number,
        default: 0
    },
    booksReadCount: {
        type: Number,
        default: 0
    },
    moviesWatchedCount: {
        type: Number,
        default: 0
    },
    itemsPurchasedCount: {
        type: Number,
        default: 0
    },
    
    // Content relationships
    readBooks: [{
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book'
        },
        lastRead: {
            type: Date,
            default: Date.now
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        pagesRead: {
            type: Number,
            default: 0
        },
        earningsFromBook: {
            type: Number,
            default: 0
        }
    }],
    
    votedMovies: [{
        movieId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie'
        },
        votedAt: {
            type: Date,
            default: Date.now
        },
        voteType: {
            type: String,
            enum: ['up', 'down']
        }
    }],
    
    purchasedItems: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MarketplaceItem'
        },
        purchasedAt: {
            type: Date,
            default: Date.now
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        price: Number,
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled', 'disputed'],
            default: 'pending'
        }
    }],
    
    favorites: [{
        itemId: mongoose.Schema.Types.ObjectId,
        itemType: {
            type: String,
            enum: ['book', 'movie', 'marketplace']
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Social features
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    notifications: [{
        type: {
            type: String,
            enum: ['follow', 'like', 'comment', 'purchase', 'earning', 'system']
        },
        message: String,
        relatedId: mongoose.Schema.Types.ObjectId,
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Settings and preferences
    settings: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            earnings: {
                type: Boolean,
                default: true
            },
            social: {
                type: Boolean,
                default: true
            }
        },
        privacy: {
            profile: {
                type: String,
                enum: ['public', 'private', 'friends'],
                default: 'public'
            },
            activity: {
                type: Boolean,
                default: true
            },
            earnings: {
                type: Boolean,
                default: false
            }
        },
        language: {
            type: String,
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'dark'
        }
    },
    
    // Security
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
userSchema.index({ telegramId: 1 }, { sparse: true });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ balance: 1 });
userSchema.index({ 'readBooks.bookId': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ totalEarned: -1 });

// Middleware to update timestamps
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Update displayName if not set
    if (!this.displayName || this.displayName === 'Telegram User') {
        if (this.isTelegramUser) {
            this.displayName = this.firstName || this.telegramUsername || 'Telegram User';
        } else {
            this.displayName = this.username;
        }
    }
    
    // Update followerCount and followingCount from arrays
    this.followerCount = this.followers.length;
    this.followingCount = this.following.length;
    
    // Update activity counts
    this.booksReadCount = this.readBooks.length;
    this.moviesWatchedCount = this.votedMovies.length;
    this.itemsPurchasedCount = this.purchasedItems.length;
    
    // Calculate total earned from read books
    this.totalEarned = this.readBooks.reduce((sum, book) => sum + (book.earningsFromBook || 0), 0);
    
    next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.displayName;
});

// Virtual for profile completion percentage
userSchema.virtual('profileCompletion').get(function() {
    let completion = 0;
    const fields = ['displayName', 'profilePic', 'email'];
    
    if (this.isTelegramUser) {
        // Telegram users have different required fields
        if (this.telegramId) completion += 40;
        if (this.displayName && this.displayName !== 'Telegram User') completion += 30;
        if (this.telegramPhotoUrl) completion += 20;
        if (this.telegramUsername) completion += 10;
    } else {
        // Traditional users
        fields.forEach(field => {
            if (this[field]) {
                completion += 25;
            }
        });
    }
    
    return completion;
});

// Method to check if user can earn (not banned, active subscription, etc.)
userSchema.methods.canEarn = function() {
    return this.status === 'active' && 
           (this.subscriptionActive || this.subscriptionType === 'free');
};

// Method to add earnings
userSchema.methods.addEarnings = async function(amount, source) {
    if (amount <= 0) return false;
    
    this.balance += amount;
    this.totalEarned += amount;
    
    // Add notification
    this.notifications.push({
        type: 'earning',
        message: `You earned ${amount} credits from ${source}`,
        read: false
    });
    
    await this.save();
    return true;
};

// Method to deduct balance
userSchema.methods.deductBalance = async function(amount, reason) {
    if (this.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    this.balance -= amount;
    this.totalSpent += amount;
    
    if (reason) {
        this.notifications.push({
            type: 'purchase',
            message: `You spent ${amount} credits on ${reason}`,
            read: false
        });
    }
    
    await this.save();
    return this.balance;
};

// Method to follow another user
userSchema.methods.followUser = async function(userId) {
    if (this.following.includes(userId)) {
        throw new Error('Already following this user');
    }
    
    this.following.push(userId);
    await this.save();
    return true;
};

// Method to unfollow user
userSchema.methods.unfollowUser = async function(userId) {
    const index = this.following.indexOf(userId);
    if (index > -1) {
        this.following.splice(index, 1);
        await this.save();
    }
    return true;
};

// Static method to find or create Telegram user
userSchema.statics.findOrCreateTelegramUser = async function(telegramData) {
    const { id, username, photo_url, auth_date } = telegramData;
    
    // Check if user exists
    let user = await this.findOne({ telegramId: id });
    
    if (!user) {
        // Create new user
        user = new this({
            telegramId: id,
            telegramUsername: username,
            telegramPhotoUrl: photo_url,
            telegramAuthDate: new Date(auth_date * 1000),
            isTelegramUser: true,
            username: `tg_${id}`,
            displayName: telegramData.first_name || username || `User${id}`,
            firstName: telegramData.first_name,
            lastName: telegramData.last_name,
            profilePic: photo_url,
            balance: 50, // Starting bonus for new Telegram users
            status: 'active'
        });
        
        await user.save();
    } else {
        // Update existing user
        user.lastLogin = Date.now();
        user.loginCount += 1;
        user.telegramUsername = username || user.telegramUsername;
        user.telegramPhotoUrl = photo_url || user.telegramPhotoUrl;
        user.telegramAuthDate = new Date(auth_date * 1000);
        
        // Update display name if it's the default
        if (user.displayName === 'Telegram User' && telegramData.first_name) {
            user.displayName = telegramData.first_name;
            user.firstName = telegramData.first_name;
            user.lastName = telegramData.last_name;
        }
        
        await user.save();
    }
    
    return user;
};

// Static method to create traditional user
userSchema.statics.createTraditionalUser = async function(userData) {
    const { username, email, password } = userData;
    
    // Check if user exists
    const existingUser = await this.findOne({ 
        $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
        throw new Error('Username or email already exists');
    }
    
    const user = new this({
        username,
        email,
        password, // Should be hashed before calling this method
        displayName: userData.displayName || username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isTelegramUser: false,
        balance: 0, // Traditional users start with 0 balance
        status: 'active'
    });
    
    await user.save();
    return user;
};

module.exports = mongoose.model('User', userSchema);
