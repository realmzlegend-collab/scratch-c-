const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all books with filters
exports.getBooks = async (req, res) => {
  try {
    const { genre, page = 1, limit = 10, search, sort = 'createdAt' } = req.query;
    
    const query = {};
    
    // Filter by genre
    if (genre && genre !== 'all') {
      query.genre = genre;
    }
    
    // Search by title or tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Only show published books
    query.status = 'published';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const books = await Book.find(query)
      .populate('author', 'username profilePic')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ [sort]: -1 });
    
    const total = await Book.countDocuments(query);
    
    res.json({
      success: true,
      books,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Get single book
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('author', 'username profilePic');
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({
      success: true,
      book
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

// Upload book
exports.uploadBook = async (req, res) => {
  try {
    const user = req.user;
    
    // Check subscription
    if (!user.subscriptionActive) {
      if (user.freeTrialUsed) {
        return res.status(403).json({ 
          error: 'Please subscribe to upload more books. Subscription: ₦1,000/month' 
        });
      }
    }
    
    const { 
      title, 
      genre, 
      coverImage, 
      summary, 
      tags, 
      chapters 
    } = req.body;
    
    // Create book
    const book = new Book({
      title,
      genre,
      coverImage,
      summary,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      chapters: JSON.parse(chapters),
      author: user._id
    });
    
    await book.save();
    
    // Update user's free trial status if first time
    if (!user.freeTrialUsed) {
      user.freeTrialUsed = true;
      user.freeTrialExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Book uploaded successfully!',
      book
    });
  } catch (error) {
    console.error('Upload book error:', error);
    res.status(500).json({ error: 'Failed to upload book' });
  }
};

// Record reading and award credits
exports.recordReading = async (req, res) => {
  try {
    const { bookId, pagesRead } = req.body;
    const user = req.user;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Calculate earnings (1 credit per page)
    const earnings = pagesRead;
    
    // Update book reads
    book.reads += 1;
    await book.save();
    
    // Update author earnings
    const author = await User.findById(book.author);
    if (author) {
      author.balance += earnings * 0.8; // Author gets 80%
      author.totalEarned += earnings * 0.8;
      await author.save();
      
      // Record transaction for author
      const authorTransaction = new Transaction({
        user: author._id,
        type: 'credit',
        amount: earnings * 0.8,
        description: `Earnings from "${book.title}" reads`,
        reference: `ER${Date.now()}${Math.random()}`,
        balanceBefore: author.balance - earnings * 0.8,
        balanceAfter: author.balance
      });
      await authorTransaction.save();
    }
    
    // Update reader balance (reader gets 20%)
    const readerEarnings = earnings * 0.2;
    user.balance += readerEarnings;
    user.totalEarned += readerEarnings;
    await user.save();
    
    // Record transaction for reader
    const readerTransaction = new Transaction({
      user: user._id,
      type: 'credit',
      amount: readerEarnings,
      description: `Reading reward from "${book.title}"`,
      reference: `RR${Date.now()}${Math.random()}`,
      balanceBefore: user.balance - readerEarnings,
      balanceAfter: user.balance
    });
    await readerTransaction.save();
    
    res.json({
      success: true,
      earnings: readerEarnings,
      message: `You earned ${readerEarnings} credits for reading!`
    });
  } catch (error) {
    console.error('Record reading error:', error);
    res.status(500).json({ error: 'Failed to record reading' });
  }
};

// Like/unlike book
exports.toggleLike = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const userId = req.user._id;
    const alreadyLiked = book.likes.includes(userId);
    
    if (alreadyLiked) {
      book.likes = book.likes.filter(id => id.toString() !== userId.toString());
    } else {
      book.likes.push(userId);
    }
    
    book.likesCount = book.likes.length;
    await book.save();
    
    res.json({
      success: true,
      liked: !alreadyLiked,
      likesCount: book.likesCount
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to update like' });
  }
};

// Follow/unfollow author
exports.toggleFollow = async (req, res) => {
  try {
    const authorId = req.params.authorId;
    const user = req.user;
    
    const author = await User.findById(authorId);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
    
    // This is a simplified version
    // In a real app, you'd have a separate Follow model
    
    res.json({
      success: true,
      following: true,
      message: 'Follow feature coming soon'
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({ error: 'Failed to update follow status' });
  }
};
