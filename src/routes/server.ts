import 'dotenv/config';
import express, { Request, Response } from 'express';
import passport from 'passport';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log('✅ MongoDB Connected');

  // Load all passport strategies
  import('./auth/github');
  import('./auth/gitlab');
  import('./auth/azure');
  import('./auth/bitbucket');

  // Supported OAuth providers (excluding GitLab for separate scope)
  ['github', 'azure', 'bitbucket'].forEach((provider) => {
    app.get(`/auth/${provider}`, passport.authenticate(provider, {
      scope: ['repo', 'user:email'],
      prompt: 'login'
    }));

    app.get(`/auth/${provider}/callback`,
      passport.authenticate(provider, { failureRedirect: '/unauthorized', session: false }),
      (req: Request, res: Response) => {
        const user = req.user as any;

        const token = jwt.sign(
          { id: user._id, name: user.name, avatar: user.avatar },
          'jwt_secret', // 🔒 Replace with env var in production
          { expiresIn: '1h' }
        );

        const query = new URLSearchParams({
          token,
          provider: user.provider,
          accessToken: user.accessToken
        }).toString();

        res.redirect(`http://localhost:3000/dashboard?${query}`);
      }
    );
  });

  // GitLab has separate scope
  app.get('/auth/gitlab', passport.authenticate('gitlab', {
    scope: ['read_user']
  }));

  app.get('/auth/gitlab/callback',
    passport.authenticate('gitlab', { failureRedirect: '/unauthorized', session: false }),
    (req: Request, res: Response) => {
      const user = req.user as any;

      const token = jwt.sign(
        { id: user._id, name: user.name },
        'jwt_secret',
        { expiresIn: '1h' }
      );

      const query = new URLSearchParams({
        token,
        provider: user.provider,
        accessToken: user.accessToken
      }).toString();

      res.redirect(`http://localhost:3000/dashboard?${query}`);
    }
  );

  app.get('/unauthorized', (_req, res) => res.send('Unauthorized User'));

  app.listen(5000, () => console.log('🚀 Server running on http://localhost:5000'));
});
