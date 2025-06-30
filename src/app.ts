// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import reviewRoutes from './routes/reviewRoutes';
import githubRoutes from './routes/githubRoutes';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => logger.info('✅ MongoDB Connected'))
  .catch((err) => logger.error('❌ MongoDB Connection Error:', err));

// ✅ Load Passport Strategies
require('./auth'); // This should import GitHub, GitLab, Azure, Bitbucket strategies

// ✅ Middlewares
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(passport.initialize());

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }),
);


app.use(express.json());
app.use('/api/v1', reviewRoutes);

// ✅ Auth routes
['github', 'azure', 'bitbucket'].forEach((provider) => {
  app.get(`/auth/${provider}`, passport.authenticate(provider, {
    scope: ['repo', 'user:email'],
    prompt: 'login',
  }));

  app.get(
    `/auth/${provider}/callback`,
    passport.authenticate(provider, { failureRedirect: '/unauthorized', session: false }),
    (req, res) => {
      const user = req.user as any;
      const query = new URLSearchParams({
        token: jwt.sign(
          { id: user._id, name: user.name, avatar: user.avatar },
          'jwt_secret',
          { expiresIn: '1h' },
        ),
        provider: user.provider,
        accessToken: user.accessToken,
      }).toString();

      res.redirect(`http://localhost:3000/dashboard?${query}`);
    },
  );
});

app.get('/auth/gitlab', passport.authenticate('gitlab', {
  scope: ['read_user'],
}));

app.get(
  '/auth/gitlab/callback',
  passport.authenticate('gitlab', { failureRedirect: '/unauthorized', session: false }),
  (req, res) => {
    const user = req.user as any;
    const query = new URLSearchParams({
      token: jwt.sign(
        { id: user._id, name: user.name },
        'jwt_secret',
        { expiresIn: '1h' },
      ),
      provider: user.provider,
      accessToken: user.accessToken,
    }).toString();

    res.redirect(`http://localhost:3000/dashboard?${query}`);
  },
);

// ✅ Existing routes
app.use('/api', reviewRoutes);

app.use('/api/v1', githubRoutes);

// ✅ Basic route
app.get('/', (_req: Request, res: Response) => {
  res.send('Server is running just fine!!');
});

// ✅ Unauthorized fallback
app.get('/unauthorized', (_req: Request, res: Response) => {
  res.send('Unauthorized User');
});

export default app;
