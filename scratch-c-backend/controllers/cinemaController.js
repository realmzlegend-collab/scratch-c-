const Movie = require('../models/Movie');
const User = require('../models/User');
const Comment = require('../models/Comment');

// Get currently playing movie
exports.getNowPlaying = async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      $or: [
        { isPlaying: true },
        { 
          isScheduled: true,
          scheduledTime: { $lte: new Date() }
        }
      ]
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

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Check if user already voted
    if (movie.voters && movie.voters.includes(userId)) {
      return res.status(400).json({ 
        error: 'You have already voted for this movie' 
      });
    }

    // Update vote count
    movie.voteCount += 1;
    if (!movie.voters) movie.voters = [];
    movie.voters.push(userId);
    await movie.save();

    // Award credits for voting (optional)
    const user = await User.findById(userId);
    if (user) {
      user.balance += 5; // 5 credits for voting
      await user.save();
    }

    res.json({
      success: true,
      message: 'Vote recorded! You earned 5 credits.',
      voteCount: movie.voteCount
    });
  } catch (error) {
    console.error('Vote for movie error:', error);
    res.status(500).json({ error: 'Failed to vote for movie' });
  }
};

// Add comment to movie
exports.addComment = async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const { comment } = req.body;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const newComment = new Comment({
      movie: movieId,
      user: req.user._id,
      username: req.user.username,
      comment,
      likes: 0
    });

    await newComment.save();

    res.json({
      success: true,
      message: 'Comment added',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Get movie comments
exports.getComments = async (req, res) => {
  try {
    const movieId = req.params.movieId;

    const comments = await Comment.find({ movie: movieId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};
