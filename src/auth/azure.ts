import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-azure-ad-oauth2';
import jwt from 'jsonwebtoken';
import { Profile, VerifyCallback } from 'passport-oauth2';
import { Request } from 'express';
import User from '../models/User';

// Extend jwt.decode result with Azure-specific fields
interface AzureDecodedToken {
  oid?: string;
  name?: string;
  email?: string;
  upn?: string;
  unique_name?: string;
  [key: string]: any;
}

// Extend User type to match your schema (optional)
interface UserType {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  toObject: () => any;
}

passport.use('azure', new OAuth2Strategy(
  {
    clientID: process.env.AZURE_CLIENT_ID as string,
    clientSecret: process.env.AZURE_CLIENT_SECRET as string,
    callbackURL: `${process.env.BASE_URL}/auth/azure/callback`
  },
  async (
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: Profile,
    done: VerifyCallback
  ) => {
    try {
      const decoded = jwt.decode(params.id_token) as AzureDecodedToken;

      if (!decoded || !decoded.oid) return done(null, false);

      let user = await User.findOne({
        provider: 'azure',
        providerId: decoded.oid
      }) as UserType | null;

      if (!user) {
        user = await User.create({
          provider: 'azure',
          providerId: decoded.oid,
          name: decoded.name,
          email: decoded.upn || decoded.email,
          username: decoded.unique_name,
          avatar: ''
        });
      }

      return done(null, {
        ...user.toObject(),
        accessToken,
        provider: 'azure'
      });
    } catch (err) {
      return done(err as Error);
    }
  }
));
