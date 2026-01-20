const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    required: false,
    unique: false,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
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
  whatsappNumber: String,
  subscriptionActive: {
    type: Boolean,
    default: false
  },
  freeTrialUsed: {
    type: Boolean,
    default: false
  },
  freeTrialExpiry: Date,
  
  // Secret Admin Fields
  isSecretAdmin: {
    type: Boolean,
    default: false
  },
  adminGrantedAt: Date,
  
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is admin (regular or secret)
userSchema.methods.isAdmin = function() {
  return this.role === 'admin' || this.isSecretAdmin === true;
};

module.exports = mongoose.model('User', userSchema);
