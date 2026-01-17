const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const axios = require('axios');

// Initialize Paystack subscription
router.post('/subscribe-reading', authMiddleware, async (req, res) => {
    try {
        const { email, amount } = req.body;
        const user = await User.findById(req.user._id);
        
        // Create Paystack transaction
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: email || user.email,
            amount: amount * 100, // Paystack uses kobo
            metadata: {
                userId: user._id,
                subscriptionType: 'reading_upload'
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.status) {
            res.json({
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference: response.data.data.reference
            });
        } else {
            throw new Error('Paystack initialization failed');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Paystack webhook
router.post('/webhook/paystack', async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        
        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).send('Invalid signature');
        }
        
        const event = req.body;
        
        if (event.event === 'charge.success') {
            const { metadata, amount } = event.data;
            
            if (metadata.subscriptionType === 'reading_upload') {
                // Activate user's subscription
                await User.findByIdAndUpdate(metadata.userId, {
                    subscriptionActive: true,
                    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    subscriptionType: 'reading_upload'
                });
                
                // Record transaction
                const transaction = new Transaction({
                    userId: metadata.userId,
                    type: 'subscription',
                    amount: -amount / 100,
                    description: 'Reading upload subscription',
                    reference: event.data.reference
                });
                await transaction.save();
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Paystack webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
