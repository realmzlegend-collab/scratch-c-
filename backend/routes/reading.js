const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const router = express.Router();

// Get books by genre
router.get('/books', auth, async (req, res) => {
  try {
    const { genre, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (genre && genre !== 'all') {
      query.genre = genre;
    }
    
    const books = await Book.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Upload book
router.post('/upload', auth, async (req, res) => {
  try {
    const { title, genre, coverImage, summary, chapters, tags } = req.body;
    
    // Check if user has subscription or free trial
    const user = req.user;
    const now = new Date();
    
    if (!user.subscriptionActive) {
      if (user.freeTrialUsed) {
        if (!user.freeTrialExpiry || user.freeTrialExpiry < now) {
          return res.status(403).json({ 
            error: 'Free trial expired. Please subscribe to continue uploading.' 
          });
        }
      } else {
        // Activate free trial for new users
        user.freeTrialUsed = true;
        user.freeTrialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await user.save();
      }
    }
    
    const book = new Book({
      title,
      genre,
      coverImage,
      summary,
      chapters,
      tags,
      author: user._id
    });
    
    await book.save();
    
    // Add to user's total earned
    user.totalEarned += 10; // Bonus for uploading
    user.balance += 10;
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'earning',
      amount: 10,
      description: 'Book upload bonus',
      status: 'completed'
    });
    await transaction.save();
    
    res.json({ 
      success: true, 
      message: 'Book uploaded successfully! You earned 10 credits.',
      book 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload book' });
  }
});

// Record reading completion
router.post('/complete', auth, async (req, res) => {
  try {
    const { bookId, pagesRead } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Calculate earnings (1 credit per page, up to 50 per day)
    const earnings = Math.min(pagesRead, 50);
    
    // Update user balance
    const user = req.user;
    user.balance += earnings;
    user.totalEarned += earnings;
    await user.save();
    
    // Update book readers
    const readerIndex = book.readers.findIndex(r => r.userId.equals(user._id));
    if (readerIndex > -1) {
      book.readers[readerIndex].pagesRead += pagesRead;
      book.readers[readerIndex].lastRead = new Date();
    } else {
      book.readers.push({
        userId: user._id,
        pagesRead,
        lastRead: new Date()
      });
    }
    await book.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'earning',
      amount: earnings,
      description: `Read ${pagesRead} pages of "${book.title}"`,
      status: 'completed'
    });
    await transaction.save();
    
    res.json({ 
      success: true, 
      earnings,
      balance: user.balance 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record reading' });
  }
});

// Like book
router.post('/books/:bookId/like', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const alreadyLiked = book.likesBy.some(id => id.equals(req.user._id));
    
    if (alreadyLiked) {
      // Unlike
      book.likes -= 1;
      book.likesBy = book.likesBy.filter(id => !id.equals(req.user._id));
    } else {
      // Like
      book.likes += 1;
      book.likesBy.push(req.user._id);
    }
    
    await book.save();
    
    res.json({ 
      success: true, 
      liked: !alreadyLiked,
      likes: book.likes 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like book' });
  }
});

// Favorite book
router.post('/favorite/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const alreadyFavorited = book.favoritesBy.some(id => id.equals(req.user._id));
    
    if (alreadyFavorited) {
      // Remove favorite
      book.favorites -= 1;
      book.favoritesBy = book.favoritesBy.filter(id => !id.equals(req.user._id));
    } else {
      // Add favorite
      book.favorites += 1;
      book.favoritesBy.push(req.user._id);
    }
    
    await book.save();
    
    res.json({ 
      success: true, 
      favorited: !alreadyFavorited,
      favorites: book.favorites 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to favorite book' });
  }
});

// Repost book
router.post('/repost/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    book.reposts += 1;
    await book.save();
    
    res.json({ success: true, reposts: book.reposts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to repost book' });
  }
});

// Follow author
router.post('/follow/:authorId', auth, async (req, res) => {
  try {
    const { authorId } = req.params;
    
    // In a real app, you'd have a Follow model
    // For now, we'll just return success
    
    res.json({ 
      success: true, 
      following: true,
      message: 'Followed author' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow author' });
  }
});

module.exports = router;
