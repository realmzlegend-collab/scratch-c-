const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const router = express.Router();

// Get marketplace items
router.get('/items', auth, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    
    const query = { status: 'available' };
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const items = await MarketplaceItem.find(query)
      .populate('seller', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add marketplace item
router.post('/items', auth, async (req, res) => {
  try {
    const { title, description, price, category, images, sellerWhatsapp, sellerAddress } = req.body;
    
    const item = new MarketplaceItem({
      title,
      description,
      price,
      category,
      images,
      sellerWhatsapp,
      sellerAddress,
      seller: req.user._id
    });
    
    await item.save();
    
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Purchase item
router.post('/purchase/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const item = await MarketplaceItem.findById(itemId)
      .populate('seller', 'username whatsappNumber');
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.seller._id.equals(req.user._id)) {
      return res.status(400).json({ error: 'Cannot purchase your own item' });
    }
    
    if (item.status !== 'available') {
      return res.status(400).json({ error: 'Item is not available' });
    }
    
    // Check buyer balance
    const buyer = req.user;
    if (buyer.balance < item.price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Get seller
    const seller = await User.findById(item.seller._id);
    
    // Process transaction
    buyer.balance -= item.price;
    buyer.totalSpent += item.price;
    await buyer.save();
    
    seller.balance += (item.price * 0.95); // 5% platform fee
    seller.totalEarned += (item.price * 0.95);
    await seller.save();
    
    // Update item status
    item.status = 'sold';
    item.buyer = buyer._id;
    item.soldAt = new Date();
    await item.save();
    
    // Record transactions
    const buyerTransaction = new Transaction({
      user: buyer._id,
      type: 'purchase',
      amount: item.price,
      description: `Purchased: ${item.title}`,
      status: 'completed',
      metadata: { item: item._id }
    });
    
    const sellerTransaction = new Transaction({
      user: seller._id,
      type: 'earning',
      amount: item.price * 0.95,
      description: `Sold: ${item.title}`,
      status: 'completed',
      metadata: { item: item._id }
    });
    
    const platformTransaction = new Transaction({
      user: null, // Platform account
      type: 'earning',
      amount: item.price * 0.05,
      description: `Platform fee: ${item.title}`,
      status: 'completed',
      metadata: { item: item._id }
    });
    
    await Promise.all([
      buyerTransaction.save(),
      sellerTransaction.save(),
      platformTransaction.save()
    ]);
    
    res.json({
      success: true,
      message: 'Purchase successful!',
      item,
      sellerWhatsapp: seller.whatsappNumber || item.sellerWhatsapp
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

// Upload images (simplified - in production use Cloudinary/Multer)
router.post('/upload-images', auth, async (req, res) => {
  try {
    // In production, you would use multer to handle file uploads
    // For now, we'll assume base64 images are sent
    const { images } = req.body;
    
    // This would upload to Cloudinary in production
    // const uploadedImages = await uploadToCloudinary(images);
    
    res.json({ 
      success: true, 
      images: images || [] // Return the image URLs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

module.exports = router;
