// server.js (Node.js + Express OAuth backend)
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(passport.initialize());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  // 🔓 Opening of .then()

  console.log('MongoDB Connected');

  // ✅ Load all strategies
  require('./auth');

  // ✅ Auth Routes inside
  ['github', 'azure', 'bitbucket'].forEach((provider) => {
    app.get(`/auth/${provider}`, passport.authenticate(provider, {
      scope: ['repo','user:email'],
      prompt: 'login'
    }));

    app.get(`/auth/${provider}/callback`,
      passport.authenticate(provider, { failureRedirect: '/unauthorized', session: false }),
      (req, res) => {
        const user = req.user;

        const query = new URLSearchParams({
          token: jwt.sign({ id: user._id, name: user.name,avatar:user.avatar }, 'jwt_secret', { expiresIn: '1h' }),
          provider: user.provider,
          accessToken: user.accessToken
        }).toString();

        res.redirect(`http://localhost:3000/dashboard?${query}`);
      }
    );
  });

  app.get('/auth/gitlab', passport.authenticate('gitlab', {
    scope: ['read_user']
  }));

  app.get('/auth/gitlab/callback',
    passport.authenticate('gitlab', { failureRedirect: '/unauthorized', session: false }),
    (req, res) => {
      const user = req.user;

      const query = new URLSearchParams({
        token: jwt.sign({ id: user._id, name: user.name }, 'jwt_secret', { expiresIn: '1h' }),
        provider: user.provider,
        accessToken: user.accessToken
      }).toString();

      res.redirect(`http://localhost:3000/dashboard?${query}`);
    }
  );

  app.get('/unauthorized', (req, res) => res.send('Unauthorized User'));

  // ✅ Start server — still inside .then()
  app.listen(5000, () => console.log('Server running on http://localhost:5000'));

}); // ✅ CLOSE the .then() block and connect() call

