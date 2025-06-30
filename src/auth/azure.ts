import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-azure-ad-oauth2';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import User from '../models/User';

// ✅ Define types manually since passport-oauth2 doesn't export Profile or VerifyCallback
type VerifyCallback = (error: any, user?: any, info?: any) => void;

interface AzureDecodedToken {
  oid?: string;
  name?: string;
  email?: string;
  upn?: string;
  unique_name?: string;
  [key: string]: any;
}

interface UserType {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  toObject(): Record<string, any>;
}

// ✅ Strategy Setup
passport.use(
  'azure',
  new OAuth2Strategy(
    {
      clientID: process.env.AZURE_CLIENT_ID as string,
      clientSecret: process.env.AZURE_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/azure/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      params: any,
      _profile: any, // Azure doesn’t return a full profile, use decoded token
      done: VerifyCallback
    ) => {
      try {
        const decoded = jwt.decode(params.id_token) as AzureDecodedToken;

        if (!decoded || !decoded.oid) return done(null, false);

        let user = (await User.findOne({
          provider: 'azure',
          providerId: decoded.oid,
        })) as UserType | null;

        if (!user) {
          user = await User.create({
            provider: 'azure',
            providerId: decoded.oid,
            name: decoded.name,
            email: decoded.upn || decoded.email,
            username: decoded.unique_name,
            avatar: '', // Azure doesn't return avatar
          });
        }

        return done(null, {
          ...user.toObject(),
          accessToken,
          provider: 'azure',
        });
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);
