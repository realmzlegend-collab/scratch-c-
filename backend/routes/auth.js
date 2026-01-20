const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Register new user
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already exists' 
      });
    }
    
    // Create user
    const user = new User({
      username,
      password,
      email,
      balance: 50, // Starting bonus
      role: 'user',
      status: 'active',
      freeTrialUsed: false
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        status: user.status,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        error: `Account is ${user.status}` 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        status: user.status,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        profilePic: user.profilePic,
        subscriptionActive: user.subscriptionActive,
        freeTrialUsed: user.freeTrialUsed,
        freeTrialExpiry: user.freeTrialExpiry,
        isSecretAdmin: user.isSecretAdmin,
        adminGrantedAt: user.adminGrantedAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed' 
    });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        status: user.status,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        profilePic: user.profilePic,
        whatsappNumber: user.whatsappNumber,
        subscriptionActive: user.subscriptionActive,
        freeTrialUsed: user.freeTrialUsed,
        freeTrialExpiry: user.freeTrialExpiry,
        isSecretAdmin: user.isSecretAdmin,
        adminGrantedAt: user.adminGrantedAt,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile' 
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { email, whatsappNumber, profilePic } = req.body;
    
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        status: user.status,
        profilePic: user.profilePic,
        whatsappNumber: user.whatsappNumber
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile' 
    });
  }
});

// Secret admin grant endpoint (for profile page secret access)
router.post('/grant-secret-admin', auth, async (req, res) => {
  try {
    const { pin, command } = req.body;
    
    console.log('Secret admin attempt by:', req.user.username);
    console.log('PIN:', pin);
    console.log('Command:', command);
    
    // Verify secret credentials
    const correctPin = '141612';
    const correctCommand = 'MENU BOUNCER 0 REALLY 1';
    
    if (pin !== correctPin || command !== correctCommand) {
      console.log('Invalid secret credentials');
      return res.status(403).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Update user role to admin
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        role: 'admin',
        isSecretAdmin: true,
        adminGrantedAt: new Date()
      },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    console.log('Secret admin granted to:', user.username);
    
    // Generate new token with updated role
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Secret admin access granted!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        status: user.status,
        isSecretAdmin: user.isSecretAdmin,
        adminGrantedAt: user.adminGrantedAt
      }
    });
  } catch (error) {
    console.error('Secret admin grant error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to grant admin access' 
    });
  }
});

// Verify admin access (for admin panel)
router.get('/admin/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Check if user has admin role (regular or secret)
    const isAdmin = user.role === 'admin' || user.isSecretAdmin === true;
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Admin access verified',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        isSecretAdmin: user.isSecretAdmin,
        adminGrantedAt: user.adminGrantedAt
      }
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Admin verification failed' 
    });
  }
});

// Get user by ID (for admin panel)
router.get('/user/:id', auth, async (req, res) => {
  try {
    // Check if requester is admin
    const requester = await User.findById(req.user._id);
    if (requester.role !== 'admin' && !requester.isSecretAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user' 
    });
  }
});

// Get all users (for admin panel)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if requester is admin
    const requester = await User.findById(req.user._id);
    if (requester.role !== 'admin' && !requester.isSecretAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }
    
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users' 
    });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ username });
    
    res.json({
      success: true,
      available: !existingUser,
      message: existingUser ? 'Username taken' : 'Username available'
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check username' 
    });
  }
});

// Logout (client-side only, but we can invalidate if needed)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a real app, you might want to invalidate the token
    // For now, we just return success and let client clear localStorage
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
});

module.exports = router;
