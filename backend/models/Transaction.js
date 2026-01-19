const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'transfer', 'purchase', 'earning', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: String,
  reference: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  metadata: {
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem' },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
