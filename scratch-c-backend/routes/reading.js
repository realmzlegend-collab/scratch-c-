const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');
const { auth } = require('../middleware/auth');

// Public routes
router.get('/books', readingController.getBooks);
router.get('/books/:id', readingController.getBook);

// Protected routes
router.post('/upload', auth, readingController.uploadBook);
router.post('/complete', auth, readingController.recordReading);
router.post('/books/:id/like', auth, readingController.toggleLike);
router.post('/follow/:authorId', auth, readingController.toggleFollow);

module.exports = router;
