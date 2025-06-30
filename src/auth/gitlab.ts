import passport from 'passport';
import { Strategy as GitLabStrategy, Profile } from 'passport-gitlab2';
import axios from 'axios';
import { VerifyCallback } from 'passport-oauth2';
import User from '../models/User';

// GitLab API response structure
interface GitLabAPIUser {
  id: number;
  name: string;
  username: string;
  avatar_url: string;
  [key: string]: any;
}

// User model shape (adapt if needed)
interface UserType {
  provider: string;
  providerId: number | string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  toObject(): Record<string, any>;
}

passport.use(
  new GitLabStrategy(
    {
      clientID: process.env.GITLAB_CLIENT_ID as string,
      clientSecret: process.env.GITLAB_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/gitlab/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const response = await axios.get<GitLabAPIUser>(
          'https://gitlab.com/api/v4/user',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = response.data;

        if (!data || !data.id) return done(null, false);

        let user = (await User.findOne({
          provider: 'gitlab',
          providerId: data.id,
        })) as UserType | null;

        if (!user) {
          user = await User.create({
            provider: 'gitlab',
            providerId: data.id,
            name: data.name,
            email: profile.emails?.[0]?.value,
            username: data.username,
            avatar: data.avatar_url,
          });
        }

        return done(null, {
          ...user.toObject(),
          accessToken,
          provider: 'gitlab',
        });
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);
