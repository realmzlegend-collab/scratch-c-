const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Cinema = require('../models/Cinema');
const User = require('../models/User');

// Get all movies
router.get('/movies', authMiddleware, async (req, res) => {
    try {
        const movies = await Cinema.find({ status: 'published' });
        res.json({ success: true, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reward user for watching
router.post('/reward', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.balance += 5; // Reward amount
        await user.save();
        res.json({ success: true, newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // Essential export
