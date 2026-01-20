const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { auth } = require('../middleware/auth');

// Protected routes
router.get('/search/:query', auth, transferController.searchUsers);
router.post('/transfer', auth, transferController.processTransfer);

module.exports = router;
