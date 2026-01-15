const express = require('express');
const { connect } = require('./lib/mongoose');
const models = require('./models'); // ensures models are registered (idempotent)

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.send('ok'));

app.get('/users', async (req, res) => {
  try {
    const users = await models.User.find().lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await connect(); // uses cached connection; safe to call multiple times
    app.listen(port, () => console.log(`Listening on ${port}`));
  } catch (err) {
    console.error('Failed to start', err);
    process.exit(1);
  }
}

start();
