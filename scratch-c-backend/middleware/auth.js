const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findOne({ _id: decoded.id, status: 'active' });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found or account suspended' });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

const moderator = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Moderator privileges required.' });
  }
};

module.exports = { auth, admin, moderator };
