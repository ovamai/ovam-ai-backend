import passport from 'passport';
import {
  Strategy as BitbucketStrategy,
  Profile,
} from 'passport-bitbucket-oauth2';
import axios from 'axios';
import { VerifyCallback } from 'passport-oauth2';
import User from '../models/User';

// Define the structure of Bitbucket user response from the API
interface BitbucketAPIUser {
  uuid: string;
  display_name: string;
  username: string;
  links?: {
    avatar?: {
      href: string;
    };
  };
  [key: string]: any;
}

// Extend Mongoose user type if needed
interface UserType {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  toObject(): any;
}

passport.use(
  new BitbucketStrategy(
    {
      clientID: process.env.BITBUCKET_CLIENT_ID as string,
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/bitbucket/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const response = await axios.get<BitbucketAPIUser>(
          'https://api.bitbucket.org/2.0/user',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const data = response.data;

        if (!data || !data.uuid) return done(null, false);

        let user = (await User.findOne({
          provider: 'bitbucket',
          providerId: data.uuid,
        })) as UserType | null;

        if (!user) {
          user = await User.create({
            provider: 'bitbucket',
            providerId: data.uuid,
            name: data.display_name,
            email: profile.emails?.[0]?.value,
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
