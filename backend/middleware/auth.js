const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No authentication token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9');
        const user = await User.findById(decoded.userId || decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // Auto-activate user if they are new
        if (!user.status) {
            user.status = 'active';
            await user.save();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

const adminMiddleware = async (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
