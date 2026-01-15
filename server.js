const express = require('express');
const path = require('path');
const fs = require('fs');
const { connect } = require('./lib/mongoose');
const models = require('./models'); // ensures models are registered (idempotent)

const app = express();
app.use(express.json());

// Debug info
console.log('Starting server.js');
console.log('__dirname =', __dirname);

const rootPath = path.join(__dirname); // serve files directly from repo root
const indexPath = path.join(rootPath, 'index.html');

console.log('Serving rootPath =', rootPath);
console.log('index.html exists =', fs.existsSync(indexPath));

// Serve all files from repository root (NOTE: this will expose files in repo root over HTTP)
// If you only want to serve index.html, you can remove express.static and only serve indexPath.
app.use(express.static(rootPath));

// Health check
app.get('/health', (req, res) => res.send('ok'));

// API route example
app.get('/users', async (req, res) => {
  try {
    const users = await models.User.find().lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// Root route -> serve index.html from repo root
app.get('/', (req, res) => {
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('index.html not found on server');
});

// Fallback for client-side routing (serve index.html for non-API GETs)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/users') || req.path === '/health') {
    return res.status(404).send('Not Found');
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('index.html not found on server');
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await connect(); // ensure DB connection (if configured)
    app.listen(port, () => console.log(`Listening on ${port}`));
  } catch (err) {
    console.error('Failed to start', err);
    process.exit(1);
  }
}

start();
