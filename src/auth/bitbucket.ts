import passport from 'passport';
import { Strategy as BitbucketStrategy } from 'passport-bitbucket-oauth2';
import axios from 'axios';
import { VerifyCallback } from 'passport-oauth2';
import User, { IUser } from '../models/User'; // ensure User model exports IUser interface

// ✅ Define Profile manually
interface Profile {
  id?: string;
  displayName?: string;
  emails?: { value: string }[];
  username?: string;
}

interface BitbucketUserResponse {
  uuid: string;
  display_name?: string;
  username?: string;
  links?: {
    avatar?: {
      href?: string;
    };
  };
  [key: string]: any;
}

passport.use(
  new BitbucketStrategy(
    {
      clientID: process.env.BITBUCKET_CLIENT_ID!,
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET!,
      callbackURL: `${process.env.BASE_URL}/auth/bitbucket/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const { data } = await axios.get<BitbucketUserResponse>(
          'https://api.bitbucket.org/2.0/user',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!data || !data.uuid) return done(null, false);

        let user: IUser | null = await User.findOne({
          provider: 'bitbucket',
          providerId: data.uuid,
        });

        if (!user) {
          user = await User.create({
            provider: 'bitbucket',
            providerId: data.uuid,
            name: data.display_name,
            email: profile.emails?.[0]?.value || '',
            username: data.username,
            avatar: data.links?.avatar?.href || '',
          });
        }

        return done(null, {
          ...user.toObject(),
          accessToken,
          provider: 'bitbucket',
        });
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);
