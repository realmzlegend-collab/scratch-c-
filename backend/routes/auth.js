const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Telegram Authentication Only - No traditional signup
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        
        if (!initData) {
            return res.status(400).json({
                success: false,
                error: 'Telegram authentication required'
            });
        }

        // Validate Telegram data
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        
        // Remove hash from params
        params.delete('hash');
        
        // Sort keys alphabetically
        const dataCheckArr = [];
        for (const [key, value] of params.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort((a, b) => a.localeCompare(b));
        
        const dataCheckString = dataCheckArr.join('\n');
        
        // Create secret key
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();
        
        // Calculate HMAC SHA256 hash
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash !== hash) {
            return res.status(401).json({
                success: false,
                error: 'Invalid Telegram authentication'
            });
        }

        // Extract user data
        const userStr = params.get('user');
        if (!userStr) {
            return res.status(401).json({
                success: false,
                error: 'No user data in Telegram authentication'
            });
        }

        const telegramUser = JSON.parse(userStr);
        
        // Find or create user
        let user = await User.findOne({ telegramId: telegramUser.id });
        
        if (!user) {
            // Create new Telegram user
            user = new User({
                telegramId: telegramUser.id,
                telegramUsername: telegramUser.username,
                telegramPhotoUrl: telegramUser.photo_url,
                isTelegramUser: true,
                username: telegramUser.username || `user_${telegramUser.id}`,
                displayName: telegramUser.first_name || telegramUser.username || `User ${telegramUser.id}`,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                profilePic: telegramUser.photo_url || `https://ui-avatars.com/api/?name=${telegramUser.first_name}&background=FFD700&color=000`,
                balance: 50, // Starting bonus
                status: 'active',
                lastLogin: new Date()
            });
            
            console.log(`✅ New Telegram user created: ${telegramUser.id}`);
        } else {
            // Update existing user
            user.lastLogin = new Date();
            user.telegramUsername = telegramUser.username || user.telegramUsername;
            user.telegramPhotoUrl = telegramUser.photo_url || user.telegramPhotoUrl;
            
            console.log(`✅ Existing Telegram user logged in: ${telegramUser.id}`);
        }

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                telegramId: user.telegramId,
                isAdmin: user.isAdmin 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        // Return user data
        const userResponse = {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            profilePic: user.profilePic,
            balance: user.balance,
            isAdmin: user.isAdmin,
            isTelegramUser: user.isTelegramUser,
            telegramId: user.telegramId,
            telegramUsername: user.telegramUsername
        };

        res.json({
            success: true,
            message: 'Telegram authentication successful',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Telegram auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
});

// Get user profile (works with both Telegram and traditional auth)
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Find user
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                profilePic: user.profilePic,
                balance: user.balance,
                isAdmin: user.isAdmin,
                isTelegramUser: user.isTelegramUser,
                telegramId: user.telegramId,
                telegramUsername: user.telegramUsername
            }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
});

module.exports = router;
