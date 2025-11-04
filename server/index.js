require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');

const app = express();
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'dev-secret'],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use('/auth', authRoutes);
app.use('/me', meRoutes);

// health
app.get('/', (req, res) => res.send('Toyhou auth backend running'));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Listening ${port}`));

