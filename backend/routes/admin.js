const express = require('express');
const User = require('../models/User');
const Book = require('../models/Book');
const Movie = require('../models/Movie');
const MarketplaceItem = require('../models/MarketplaceItem');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');
const auth = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(auth, adminMiddleware);

// Get admin stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalBooks,
      totalMovies,
      totalTransactions,
      platformEarnings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Book.countDocuments(),
      Movie.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { type: 'earning' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const recentTransactions = await Transaction.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalUsers,
      platformEarnings: platformEarnings[0]?.total || 0,
      activeUsers,
      totalBooks,
      totalMovies,
      totalTransactions,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update user balance
router.put('/users/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, operation } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (operation === 'add') {
      user.balance += amount;
      user.totalEarned += amount;
    } else if (operation === 'subtract') {
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      user.balance -= amount;
      user.totalSpent += amount;
    }
    
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: userId,
      type: operation === 'add' ? 'credit' : 'debit',
      amount,
      description: `Admin ${operation === 'add' ? 'added' : 'deducted'} balance`,
      status: 'completed'
    });
    await transaction.save();
    
    res.json({ success: true, balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Add movie to voting
router.post('/cinema/voting', async (req, res) => {
  try {
    const { title, googleDriveLink, thumbnail, description } = req.body;
    
    const movie = new Movie({
      title,
      googleDriveLink,
      thumbnail,
      description,
      category: 'voting'
    });
    
    await movie.save();
    res.json({ success: true, movie });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

// Schedule movie
router.post('/cinema/watching', async (req, res) => {
  try {
    const { title, googleDriveLink, thumbnail, description, scheduledTime } = req.body;
    
    const movie = new Movie({
      title,
      googleDriveLink,
      thumbnail,
      description,
      category: 'scheduled',
      scheduledTime,
      isPlaying: false
    });
    
    await movie.save();
    res.json({ success: true, movie });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule movie' });
  }
});

// Set movie as playing
router.put('/cinema/:movieId/set-playing', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { scheduledTime } = req.body;
    
    // Set all other movies to not playing
    await Movie.updateMany({}, { isPlaying: false });
    
    const movie = await Movie.findByIdAndUpdate(
      movieId,
      {
        category: 'now-playing',
        scheduledTime,
        isPlaying: true
      },
      { new: true }
    );
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json({ success: true, movie });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set movie playing' });
  }
});

// Send announcement
router.post('/announcements', async (req, res) => {
  try {
    const { text, page } = req.body;
    
    const announcement = new Announcement({
      text,
      page,
      createdBy: req.user._id
    });
    
    await announcement.save();
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// Get announcements
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Execute admin command
router.post('/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    let message = 'Command executed';
    
    if (command === 'CLOSE_CINEMA') {
      await Movie.updateMany({}, { isPlaying: false });
      message = 'Cinema closed';
    } else if (command === 'OPEN_CINEMA') {
      message = 'Cinema opened';
    } else if (command.startsWith('ADD_ANNOUNCEMENT:')) {
      const text = command.split(':')[1];
      const announcement = new Announcement({
        text,
        page: 'all',
        createdBy: req.user._id
      });
      await announcement.save();
      message = 'Announcement added';
    } else if (command.startsWith('SET_VOTING_TIME:')) {
      message = 'Voting time updated';
    }
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: 'Command execution failed' });
  }
});

module.exports = router;
