const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.status !== 'active') {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            throw new Error();
        }
        next();
    } catch (error) {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { authMiddleware, adminMiddleware };
