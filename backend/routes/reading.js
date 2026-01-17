const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all books
router.get('/books', async (req, res) => {
    try {
        const { genre, page = 1, limit = 20 } = req.query;
        const query = { isPublished: true };
        
        if (genre && genre !== 'all') {
            query.genre = genre;
        }

        const books = await Book.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Book.countDocuments(query);

        res.json({
            books,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single book
router.get('/books/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('authorId', 'username profilePic');

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Increment views or similar metric
        res.json({ book });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create book
router.post('/books', authMiddleware, async (req, res) => {
    try {
        const bookData = {
            ...req.body,
            authorId: req.user._id,
            author: req.user.username
        };

        const book = new Book(bookData);
        await book.save();

        res.status(201).json({ book });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reading completion
router.post('/complete', authMiddleware, async (req, res) => {
    try {
        const { bookId, pagesRead } = req.body;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if already read today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const user = await User.findById(req.user._id);
        const todayRead = user.readBooks.find(
            rb => rb.bookId.toString() === bookId && 
            new Date(rb.lastRead) >= today
        );

        if (todayRead) {
            return res.status(400).json({ error: 'Already read today' });
        }

        // Calculate earnings
        const earnings = pagesRead * book.earningsPerPage;
        const platformFee = earnings * 0.2; // 20% platform fee
        const userEarnings = earnings - platformFee;

        // Update user balance and read books
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 
                balance: userEarnings,
                totalEarned: userEarnings
            },
            $push: {
                readBooks: {
                    bookId,
                    lastRead: new Date(),
                    progress: pagesRead
                }
            }
        });

        // Record transaction
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'earning',
            amount: userEarnings,
            description: `Earned from reading "${book.title}"`,
            platformFee,
            metadata: { bookId, pagesRead }
        });
        await transaction.save();

        res.json({
            message: 'Reading recorded',
            earnings: userEarnings,
            pagesRead
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment to book
router.post('/books/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { comment } = req.body;
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        book.comments.push({
            userId: req.user._id,
            username: req.user.username,
            comment,
            createdAt: new Date()
        });

        await book.save();
        res.json({ message: 'Comment added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like book
router.post('/books/:id/like', authMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if already liked
        const alreadyLiked = book.likes.some(
            like => like.userId.toString() === req.user._id.toString()
        );

        if (alreadyLiked) {
            // Unlike
            book.likes = book.likes.filter(
                like => like.userId.toString() !== req.user._id.toString()
            );
        } else {
            // Like
            book.likes.push({
                userId: req.user._id,
                likedAt: new Date()
            });
        }

        await book.save();
        res.json({ 
            message: alreadyLiked ? 'Unliked' : 'Liked',
            likes: book.likes.length 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Donate to book author
router.post('/books/:id/donate', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check user balance
        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Calculate platform fee (20%)
        const platformFee = amount * 0.2;
        const authorAmount = amount - platformFee;

        // Update user balance
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 
                balance: -amount,
                totalSpent: amount
            }
        });

        // Update author balance
        await User.findByIdAndUpdate(book.authorId, {
            $inc: { 
                balance: authorAmount,
                totalEarned: authorAmount
            }
        });

        // Update book donations
        book.donations.push({
            userId: req.user._id,
            amount,
            donatedAt: new Date()
        });
        book.totalDonations += amount;
        await book.save();

        // Record transactions
        const donorTransaction = new Transaction({
            userId: req.user._id,
            type: 'donation',
            amount: -amount,
            description: `Donated to "${book.title}"`,
            platformFee,
            metadata: { bookId: book._id, authorId: book.authorId }
        });

        const authorTransaction = new Transaction({
            userId: book.authorId,
            type: 'donation',
            amount: authorAmount,
            description: `Received donation for "${book.title}"`,
            platformFee: 0,
            metadata: { bookId: book._id, donorId: req.user._id }
        });

        await Promise.all([donorTransaction.save(), authorTransaction.save()]);

        res.json({ 
            message: 'Donation successful',
            amount,
            authorAmount,
            platformFee
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
