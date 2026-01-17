const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Transfer money to another user
router.post('/transfer', authMiddleware, async (req, res) => {
    try {
        const { receiverUsername, amount, description } = req.body;

        if (!receiverUsername || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid transfer details' });
        }

        // Check if transferring to self
        if (receiverUsername === req.user.username) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        // Find receiver
        const receiver = await User.findOne({ username: receiverUsername });
        if (!receiver || receiver.status !== 'active') {
            return res.status(404).json({ error: 'Receiver not found or inactive' });
        }

        // Check sender balance
        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Calculate platform fee (2%)
        const platformFee = amount * 0.02;
        const transferAmount = amount - platformFee;

        // Start transaction
        const session = await User.startSession();
        session.startTransaction();

        try {
            // Update sender balance
            await User.findByIdAndUpdate(
                req.user._id,
                {
                    $inc: { 
                        balance: -amount,
                        totalSpent: amount
                    }
                },
                { session }
            );

            // Update receiver balance
            await User.findByIdAndUpdate(
                receiver._id,
                {
                    $inc: { 
                        balance: transferAmount,
                        totalEarned: transferAmount
                    }
                },
                { session }
            );

            // Create sender transaction record
            const senderTransaction = new Transaction({
                userId: req.user._id,
                type: 'transfer',
                amount: -amount,
                description: `Transfer to ${receiver.username}: ${description || 'No description'}`,
                platformFee: platformFee,
                metadata: {
                    receiverId: receiver._id,
                    receiverUsername: receiver.username
                }
            });

            // Create receiver transaction record
            const receiverTransaction = new Transaction({
                userId: receiver._id,
                type: 'transfer',
                amount: transferAmount,
                description: `Received from ${req.user.username}: ${description || 'No description'}`,
                platformFee: 0,
                metadata: {
                    senderId: req.user._id,
                    senderUsername: req.user.username
                }
            });

            await Promise.all([
                senderTransaction.save({ session }),
                receiverTransaction.save({ session })
            ]);

            await session.commitTransaction();
            session.endSession();

            res.json({
                message: 'Transfer successful',
                amount: transferAmount,
                platformFee,
                receiver: {
                    username: receiver.username,
                    profilePic: receiver.profilePic
                }
            });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transfer history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const transfers = await Transaction.find({
            userId: req.user._id,
            type: 'transfer'
        }).sort({ createdAt: -1 }).limit(20);

        res.json({ transfers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search users for transfer
router.get('/search/:username', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({
            username: { $regex: req.params.username, $options: 'i' },
            _id: { $ne: req.user._id },
            status: 'active'
        })
        .select('username profilePic')
        .limit(10);

        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
