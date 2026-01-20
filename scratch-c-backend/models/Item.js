const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    enum: ['digital', 'physical', 'service'],
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    required: true
  },
  sellerWhatsapp: {
    type: String,
    required: true
  },
  sellerAddress: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'pending', 'removed'],
    default: 'available'
  },
  views: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Item = mongoose.model('Item', ItemSchema);
module.exports = Item;
