const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Marketplace = require('../models/Marketplace');
const User = require('../models/User');

// Get all items
router.get('/items', authMiddleware, async (req, res) => {
    try {
        const items = await Marketplace.find({ stock: { $gt: 0 } });
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Purchase an item
router.post('/purchase/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Marketplace.findById(req.params.id);
        const user = await User.findById(req.user._id);

        if (user.balance < item.price) {
            return res.status(400).json({ success: false, error: 'Insufficient balance' });
        }

        user.balance -= item.price;
        item.stock -= 1;
        
        await user.save();
        await item.save();

        res.json({ success: true, message: 'Purchase successful!', newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // Essential export
