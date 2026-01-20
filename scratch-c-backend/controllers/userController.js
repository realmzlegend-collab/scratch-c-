const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = req.user;
    
    // Remove restricted fields
    delete updates.role;
    delete updates.balance;
    delete updates.status;
    delete updates.password;
    
    // Update user
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });
    
    await user.save();
    
    res.json({
      success: true,
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get user transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { user: req.user._id };
    if (type) query.type = type;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

// Get user's uploaded books
exports.getUserBooks = async (req, res) => {
  try {
    const books = await Book.find({ author: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      books
    });
  } catch (error) {
    console.error('Get user books error:', error);
    res.status(500).json({ error: 'Failed to get books' });
  }
};

// Get user's marketplace items
exports.getUserItems = async (req, res) => {
  try {
    const items = await Item.find({ seller: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
};
