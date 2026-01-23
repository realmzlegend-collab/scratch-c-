const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin access verification with PIN and command
exports.verifyAdminAccess = async (req, res, next) => {
    try {
        const { pin, command } = req.body;
        
        // Verify PIN
        if (pin !== process.env.ADMIN_ACCESS_PIN) {
            return res.status(401).json({
                success: false,
                error: 'Invalid PIN'
            });
        }
        
        // Verify command
        if (command !== process.env.ADMIN_COMMAND_CODE) {
            return res.status(401).json({
                success: false,
                error: 'Invalid command'
            });
        }
        
        // Get user from token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Grant admin role
        user.role = 'admin';
        await user.save();
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin access verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Admin access verification failed'
        });
    }
};
