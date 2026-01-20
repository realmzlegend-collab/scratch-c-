const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Search users for transfer
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.length < 2) {
      return res.json({ success: true, users: [] });
    }
    
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id }, // Exclude current user
      status: 'active'
    })
    .select('username profilePic')
    .limit(10);
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Process transfer
exports.processTransfer = async (req, res) => {
  try {
    const { receiverUsername, amount, description } = req.body;
    const sender = req.user;
    
    // Validate amount
    if (amount < 10 || amount > 50000) {
      return res.status(400).json({ 
        error: 'Amount must be between ₦10 and ₦50,000' 
      });
    }
    
    // Check sender balance
    if (sender.balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient balance' 
      });
    }
    
    // Find receiver
    const receiver = await User.findOne({ 
      username: receiverUsername,
      status: 'active'
    });
    
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found or inactive' });
    }
    
    // Calculate platform fee (2%)
    const platformFee = amount * 0.02;
    const receiverAmount = amount - platformFee;
    
    // Update balances
    const senderBalanceBefore = sender.balance;
    const receiverBalanceBefore = receiver.balance;
    
    sender.balance -= amount;
    sender.totalSpent += amount;
    
    receiver.balance += receiverAmount;
    receiver.totalEarned += receiverAmount;
    
    await sender.save();
    await receiver.save();
    
    // Record transactions
    const senderTransaction = new Transaction({
      user: sender._id,
      type: 'transfer_out',
      amount: amount,
      description: description || `Transfer to ${receiver.username}`,
      reference: `TX${Date.now()}${Math.random()}`,
      balanceBefore: senderBalanceBefore,
      balanceAfter: sender.balance,
      metadata: { 
        receiverId: receiver._id, 
        receiverUsername: receiver.username,
        fee: platformFee 
      }
    });
    
    const receiverTransaction = new Transaction({
      user: receiver._id,
      type: 'transfer_in',
      amount: receiverAmount,
      description: description || `Transfer from ${sender.username}`,
      reference: `RX${Date.now()}${Math.random()}`,
      balanceBefore: receiverBalanceBefore,
      balanceAfter: receiver.balance,
      metadata: { 
        senderId: sender._id, 
        senderUsername: sender.username 
      }
    });
    
    await senderTransaction.save();
    await receiverTransaction.save();
    
    res.json({
      success: true,
      message: `Transfer successful! ₦${amount} sent to ${receiver.username}`,
      amount: receiverAmount,
      fee: platformFee,
      receiver: {
        id: receiver._id,
        username: receiver.username
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
};
