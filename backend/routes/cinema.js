const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Cinema = require('../models/Cinema');
const User = require('../models/User');

// Get movies for voting
router.get('/voting', async (req, res) => {
    try {
        const movies = await Cinema.find({ 
            category: 'voting',
            isActive: true 
        }).sort({ createdAt: -1 });

        res.json({ movies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get currently playing movie
router.get('/now-playing', async (req, res) => {
    try {
        const now = new Date();
        const movie = await Cinema.findOne({
            category: 'watching',
            scheduledTime: { $lte: now },
            isActive: true
        }).sort({ scheduledTime: -1 });

        res.json({ movie });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vote for movie
router.post('/vote/:id', authMiddleware, async (req, res) => {
    try {
        const movie = await Cinema.findById(req.params.id);
        
        if (!movie || movie.category !== 'voting') {
            return res.status(404).json({ error: 'Movie not found for voting' });
        }

        // Check if already voted
        const alreadyVoted = movie.votes.some(
            vote => vote.userId.toString() === req.user._id.toString()
        );

        if (alreadyVoted) {
            return res.status(400).json({ error: 'Already voted for this movie' });
        }

        // Add vote
        movie.votes.push({
            userId: req.user._id,
            votedAt: new Date()
        });
        movie.voteCount = movie.votes.length;

        await movie.save();

        // Update user's voted movies
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                votedMovies: {
                    movieId: movie._id,
                    votedAt: new Date()
                }
            }
        });

        res.json({ 
            message: 'Vote recorded',
            voteCount: movie.voteCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment to movie
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { comment } = req.body;
        const movie = await Cinema.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        movie.comments.push({
            userId: req.user._id,
            username: req.user.username,
            comment,
            createdAt: new Date()
        });

        await movie.save();
        res.json({ message: 'Comment added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like/Dislike movie
router.post('/:id/reaction', authMiddleware, async (req, res) => {
    try {
        const { reaction } = req.body; // 'like' or 'dislike'
        const movie = await Cinema.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        if (reaction === 'like') {
            movie.likes += 1;
        } else if (reaction === 'dislike') {
            movie.dislikes += 1;
        }

        await movie.save();
        res.json({ 
            message: 'Reaction recorded',
            likes: movie.likes,
            dislikes: movie.dislikes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
