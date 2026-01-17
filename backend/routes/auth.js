const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const User = require('../models/User');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to validate email
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Helper function to validate username
const validateUsername = (username) => {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
};

// Telegram Web App Data Validation
const validateTelegramData = (initData) => {
    try {
        // Parse the initData string
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        
        // Remove hash from params
        params.delete('hash');
        
        // Sort keys alphabetically
        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Create secret key
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN')
            .digest();
        
        // Create HMAC SHA256 hash
        const dataCheckString = sortedParams;
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        console.error('Telegram validation error:', error);
        return false;
    }
};

// Extract Telegram user data
const extractTelegramUserData = (initData) => {
    try {
        const params = new URLSearchParams(initData);
        const userString = params.get('user');
        
        if (!userString) return null;
        
        return JSON.parse(decodeURIComponent(userString));
    } catch (error) {
        console.error('Telegram data extraction error:', error);
        return null;
    }
};

// Generate unique custom user ID
const generateCustomUserId = async (baseId) => {
    // Remove spaces and convert to lowercase
    const cleanId = baseId.toLowerCase().replace(/\s+/g, '');
    
    // Validate format
    const userIdRegex = /^[a-zA-Z0-9._-]+$/;
    if (!userIdRegex.test(cleanId)) {
        throw new Error('User ID can only contain letters, numbers, hyphen, underscore, and period');
    }
    
    // Check if ID already exists
    const existingUser = await User.findOne({ customUserId: cleanId });
    
    if (existingUser) {
        // Try to make it unique by adding random numbers
        for (let i = 1; i <= 100; i++) {
            const newId = `${cleanId}${i}`;
            const checkUser = await User.findOne({ customUserId: newId });
            if (!checkUser) {
                return newId;
            }
        }
        throw new Error('Could not generate unique user ID. Please try a different base ID.');
    }
    
    return cleanId;
};

// ============================================
// TELEGRAM AUTHENTICATION ROUTES
// ============================================

// Telegram Mini App Signup
router.post('/telegram/signup', async (req, res) => {
    try {
        const { initData, password, preferredUsername, customUserId } = req.body;

        // Validate Telegram data
        if (!validateTelegramData(initData)) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid Telegram data' 
            });
        }

        // Extract user data from Telegram
        const telegramUser = extractTelegramUserData(initData);
        if (!telegramUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Could not extract Telegram user data' 
            });
        }

        // Validate required fields
        if (!password || !preferredUsername || !customUserId) {
            return res.status(400).json({ 
                success: false,
                error: 'Password, username, and user ID are required' 
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        // Validate preferred username
        if (!validateUsername(preferredUsername)) {
            return res.status(400).json({
                success: false,
                error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
            });
        }

        // Generate unique custom user ID
        let uniqueUserId;
        try {
            uniqueUserId = await generateCustomUserId(customUserId);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        // Check if Telegram ID already registered
        const existingTelegramUser = await User.findOne({ telegramId: telegramUser.id });
        if (existingTelegramUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Telegram account already registered. Please login instead.' 
            });
        }

        // Check if username already taken
        const existingUsername = await User.findOne({ 
            username: preferredUsername.toLowerCase() 
        });
        if (existingUsername) {
            return res.status(400).json({ 
                success: false,
                error: 'Username already taken' 
            });
        }

        // Check if custom user ID already taken (except by current user)
        const existingCustomId = await User.findOne({ customUserId: uniqueUserId });
        if (existingCustomId) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID already taken' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user profile picture from Telegram
        let profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(preferredUsername)}&background=FFD700&color=000&bold=true`;
        if (telegramUser.photo_url) {
            profilePic = telegramUser.photo_url;
        }

        // Create user
        const user = new User({
            telegramId: telegramUser.id,
            username: preferredUsername.toLowerCase(),
            customUserId: uniqueUserId,
            password: hashedPassword,
            firstName: telegramUser.first_name || '',
            lastName: telegramUser.last_name || '',
            telegramUsername: telegramUser.username || '',
            telegramPhotoUrl: telegramUser.photo_url || '',
            profilePic: profilePic,
            balance: 100, // Starting bonus for Telegram users
            status: 'active',
            isTelegramUser: true,
            telegramAuthDate: new Date(telegramUser.auth_date * 1000),
            createdAt: new Date()
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                telegramId: user.telegramId,
                username: user.username,
                email: user.email,
                isTelegramUser: true
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: '🎉 Account created successfully!',
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Telegram signup error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Registration failed. Please try again.' 
        });
    }
});

// Telegram Mini App Login
router.post('/telegram/login', async (req, res) => {
    try {
        const { initData, password } = req.body;

        // Validate Telegram data
        if (!validateTelegramData(initData)) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid Telegram data' 
            });
        }

        // Extract user data from Telegram
        const telegramUser = extractTelegramUserData(initData);
        if (!telegramUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Could not extract Telegram user data' 
            });
        }

        if (!password) {
            return res.status(400).json({ 
                success: false,
                error: 'Password is required' 
            });
        }

        // Find user by Telegram ID
        const user = await User.findOne({ 
            telegramId: telegramUser.id,
            isTelegramUser: true
        });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'Account not found. Please sign up first.' 
            });
        }

        // Check account status
        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'Account is deactivated. Please contact support.' 
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid password' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        user.telegramAuthDate = new Date(telegramUser.auth_date * 1000);
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                telegramId: user.telegramId,
                username: user.username,
                email: user.email,
                isTelegramUser: true
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: `👋 Welcome back, ${user.username}!`,
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Telegram login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
});

// Check if Telegram user exists (for auto-detection)
router.post('/telegram/check', async (req, res) => {
    try {
        const { initData } = req.body;

        // Validate Telegram data
        if (!validateTelegramData(initData)) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid Telegram data' 
            });
        }

        // Extract user data from Telegram
        const telegramUser = extractTelegramUserData(initData);
        if (!telegramUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Could not extract Telegram user data' 
            });
        }

        // Check if user exists
        const user = await User.findOne({ 
            telegramId: telegramUser.id,
            isTelegramUser: true
        });

        res.json({
            success: true,
            data: {
                exists: !!user,
                userId: user?._id,
                username: user?.username,
                profilePic: user?.profilePic,
                needsPassword: user ? false : true // If user exists, no password needed for Telegram auth
            }
        });
    } catch (error) {
        console.error('Telegram check error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to check user' 
        });
    }
});

// ============================================
// REGULAR WEB AUTHENTICATION ROUTES
// ============================================

// Signup (for web users)
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Email already registered' 
                });
            }
            if (existingUser.username === username.toLowerCase()) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Username already taken' 
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            balance: 0,
            profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FFD700&color=000&bold=true`,
            status: 'active',
            isTelegramUser: false,
            createdAt: new Date()
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                username: user.username,
                isTelegramUser: false
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Registration failed. Please try again.' 
        });
    }
});

// Login (for web users)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password are required' 
            });
        }

        // Find user by email or username
        const user = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: email.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'Account is deactivated. Please contact support.' 
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                username: user.username,
                isTelegramUser: user.isTelegramUser || false
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful!',
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
});

// ============================================
// COMMON USER ROUTES (WORK FOR BOTH TYPES)
// ============================================

// Get user profile (works for both Telegram and web users)
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired' 
            });
        }
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch profile' 
        });
    }
});

// Update profile (works for both, but with different validations)
router.put('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { username, email, customUserId } = req.body;

        // Get current user
        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        const updateData = {};

        // Username validation and update
        if (username) {
            if (!validateUsername(username)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid username format'
                });
            }

            const existingUsername = await User.findOne({ 
                username: username.toLowerCase(),
                _id: { $ne: decoded.userId }
            });
            
            if (existingUsername) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already taken'
                });
            }
            
            updateData.username = username.toLowerCase();
        }

        // Email validation and update (only for non-Telegram users)
        if (email && !currentUser.isTelegramUser) {
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            const existingEmail = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: decoded.userId }
            });
            
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }
            
            updateData.email = email.toLowerCase();
        }

        // Custom User ID validation and update (only for Telegram users)
        if (customUserId && currentUser.isTelegramUser) {
            try {
                const uniqueUserId = await generateCustomUserId(customUserId);
                const existingCustomId = await User.findOne({ 
                    customUserId: uniqueUserId,
                    _id: { $ne: decoded.userId }
                });
                
                if (existingCustomId) {
                    return res.status(400).json({
                        success: false,
                        error: 'User ID already taken'
                    });
                }
                
                updateData.customUserId = uniqueUserId;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            decoded.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to update profile' 
        });
    }
});

// Upload profile picture (works for both)
router.post('/upload-profile-pic', upload.single('profilePic'), async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image uploaded' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Only JPG, PNG, and GIF images are allowed'
            });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'scratch_c/profiles',
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto:good',
            format: 'jpg'
        });

        // Update user profile
        const user = await User.findByIdAndUpdate(
            decoded.userId,
            { profilePic: result.secure_url },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                profilePic: result.secure_url,
                user
            }
        });
    } catch (error) {
        console.error('Upload profile pic error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        if (error.http_code === 400) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image file'
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload profile picture' 
        });
    }
});

// Change password (works for both)
router.put('/change-password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get user with password
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to change password' 
        });
    }
});

// Logout (client-side only)
router.post('/logout', async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
