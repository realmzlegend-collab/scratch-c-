const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

// Grant admin access via pin/command (no admin check needed for this)
router.post('/grant-access', auth, adminController.grantAdminAccess);

// Admin verification
router.get('/verify', auth, adminController.verifyAdmin);

// All routes below require admin privileges
router.get('/stats', auth, adminController.getStats);
router.get('/users', auth, adminController.getAllUsers);
router.put('/users/:userId/status', auth, adminController.toggleUserStatus);
router.put('/users/:userId/balance', auth, adminController.editUserBalance);
router.post('/cinema/voting', auth, adminController.addVotingMovie);
router.post('/cinema/watching', auth, adminController.scheduleMovie);
router.put('/cinema/:movieId/set-playing', auth, adminController.setMoviePlaying);
router.post('/command', auth, adminController.executeCommand);
router.post('/announcements', auth, adminController.sendAnnouncement);
router.get('/announcements', auth, adminController.getAnnouncements);

module.exports = router;
