const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9',
        { expiresIn: '30d' }
    );
};

// MANUAL SIGNUP
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ success: false, error: 'Username already taken' });

        user = new User({
            username,
            password, // In production, use bcrypt to hash this
            status: 'active',
            balance: 50 // Signup bonus
        });

        await user.save();
        const token = generateToken(user);
        res.status(201).json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// MANUAL LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const token = generateToken(user);
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// TELEGRAM AUTH
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ success: false, error: 'No data' });

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        const userStr = params.get('user');
        const telegramUser = JSON.parse(userStr);

        let user = await User.findOne({ telegramId: telegramUser.id });

        if (!user) {
            user = new User({
                telegramId: telegramUser.id,
                username: telegramUser.username || `user_${telegramUser.id}`,
                status: 'active',
                balance: 50
            });
            await user.save();
        }

        const token = generateToken(user);
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Telegram auth failed' });
    }
});

// GET PROFILE
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9');
        const user = await User.findById(decoded.userId);
        res.json({ success: true, user });
    } catch (e) {
        res.status(401).json({ success: false });
    }
});

module.exports = router;
