const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const cinemaRoutes = require('./routes/cinema');
const readingRoutes = require('./routes/reading');
const marketplaceRoutes = require('./routes/marketplace');
const transferRoutes = require('./routes/transfer');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://pagead2.googlesyndication.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      frameSrc: ["'self'", "https://api.adgem.com", "https://drive.google.com"]
    }
  }
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://scratch-c.vercel.app',
  'https://scratch-c.herokuapp.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/transfer', transferRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve HTML files for SPA
app.get('*', (req, res) => {
  // List of valid HTML pages
  const validPages = [
    'index.html', 'dashboard.html', 'admin.html', 'cinema.html',
    'reading.html', 'marketplace.html', 'profile.html', 'chat.html',
    'coming-soon.html'
  ];
  
  const requestedPage = req.path.split('/').pop();
  
  if (validPages.includes(requestedPage)) {
    res.sendFile(path.join(__dirname, '../frontend', requestedPage));
  } else if (req.path === '/' || req.path === '') {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  } else {
    // For API routes that don't exist
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Serve the requested file if it exists, otherwise serve index.html
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Static files served from: ${path.join(__dirname, '../frontend')}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server, just log
});
