const Movie = require('../models/Movie');
const Vote = require('../models/Vote');
const User = require('../models/User');

// Get currently playing movie
exports.getNowPlaying = async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      isPlaying: true 
    }).sort({ scheduledTime: -1 });
    
    res.json({
      success: true,
      movie: movie || null
    });
  } catch (error) {
    console.error('Get now playing error:', error);
    res.status(500).json({ error: 'Failed to fetch current movie' });
  }
};

// Get movies for voting
exports.getVotingMovies = async (req, res) => {
  try {
    const movies = await Movie.find({
      isPlaying: false,
      isScheduled: false
    })
    .sort({ voteCount: -1, createdAt: -1 })
    .limit(10);
    
    res.json({
      success: true,
      movies
    });
  } catch (error) {
    console.error('Get voting movies error:', error);
    res.status(500).json({ error: 'Failed to fetch voting movies' });
  }
};

// Vote for a movie
exports.voteForMovie = async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const userId = req.user._id;
    
    // Check if user already voted today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingVote = await Vote.findOne({
      user: userId,
      movie: movieId,
      createdAt: { $gte: today }
    });
    
    if (existingVote) {
      return res.status(400).json({ 
        error: 'You have already voted for this movie today' 
      });
    }
    
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Update vote count
    movie.voteCount += 1;
    movie.voters.push(userId);
    await movie.save();
    
    // Record vote
    const vote = new Vote
