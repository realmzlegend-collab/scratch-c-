const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  profilePic: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  freeTrialUsed: {
    type: Boolean,
    default: false
  },
  freeTrialExpiry: {
    type: Date
  },
  subscriptionActive: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date
  },
  lastLogin: {
    type: Date
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

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user profile without sensitive data
UserSchema.methods.toProfileJSON = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    balance: this.balance,
    role: this.role,
    profilePic: this.profilePic,
    status: this.status,
    totalEarned: this.totalEarned,
    totalSpent: this.totalSpent,
    createdAt: this.createdAt
  };
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
