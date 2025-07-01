import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-azure-ad-oauth2';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // adjust path/types if needed
import { VerifyCallback } from 'passport-oauth2';

// ✅ Define Profile manually
interface Profile {
  id?: string;
  displayName?: string;
  emails?: { value: string }[];
  username?: string;
}
// Define the shape of the decoded Azure token (based on Azure AD claims)
interface AzureDecodedToken {
  oid: string;
  name?: string;
  upn?: string;
  email?: string;
  unique_name?: string;
  [key: string]: any;
}

passport.use(
  'azure',
  new OAuth2Strategy(
    {
      clientID: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      callbackURL: `${process.env.BASE_URL}/auth/azure/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      params: any,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const decoded = jwt.decode(params.id_token) as AzureDecodedToken | null;
        if (!decoded || !decoded.oid) return done(null, false);

        let user: IUser | null = await User.findOne({
          provider: 'azure',
          providerId: decoded.oid,
        });

        if (!user) {
          user = await User.create({
            provider: 'azure',
            providerId: decoded.oid,
            name: decoded.name,
            email: decoded.upn || decoded.email,
            username: decoded.unique_name,
            avatar: '', // Azure doesn't provide an avatar
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
    },
  ),
);
