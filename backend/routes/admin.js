const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Verify Admin Access
router.get('/verify', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false });
  res.json({ success: true });
});

// Get Dashboard Stats
router.get('/stats', auth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: 'active' });
  // Mocking financial data for now
  res.json({
    totalUsers,
    activeUsers,
    platformEarnings: 12500,
    totalBooks: 89,
    totalMovies: 24,
    totalTransactions: 5620
  });
});

// Update User Balance (Add/Subtract)
router.put('/users/:id/balance', auth, async (req, res) => {
  const { amount, operation } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('User not found');

  user.balance = operation === 'add' ? user.balance + amount : user.balance - amount;
  await user.save();
  res.json({ success: true });
});

module.exports = router;
