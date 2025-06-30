import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import axios from 'axios';
import { VerifyCallback } from 'passport-oauth2';
import User from '../models/User';

// Define the structure of the GitHub user object returned by the API
interface GitHubAPIUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  [key: string]: any;
}

// Extend User type (optional, based on your Mongoose schema)
interface UserType {
  provider: string;
  providerId: string | number;
  name: string;
  email: string;
  username: string;
  avatar: string;
  toObject(): Record<string, any>;
}

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/github/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const response = await axios.get<GitHubAPIUser>('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = response.data;

        if (!data || !data.id) return done(null, false);

        let user = (await User.findOne({
          provider: 'github',
          providerId: data.id,
        })) as UserType | null;

        if (!user) {
          user = await User.create({
            provider: 'github',
            providerId: data.id,
            name: data.name || data.login,
            email: profile.emails?.[0]?.value,
            username: data.login,
            avatar: data.avatar_url,
          });
        }

        return done(null, {
          ...user.toObject(),
          accessToken,
          provider: 'github',
        });
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);
