import passport from "passport";
const BitbucketOAuth2 = require("passport-bitbucket-oauth2");
import axios from "axios";
import User, { IUser } from "../models/User";

passport.use(
  new BitbucketOAuth2(
    {
      clientID: process.env.BITBUCKET_CLIENT_ID as string,
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/bitbucket/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: Express.User | false | null) => void
    ) => {
      try {
        // 🔥 Fetch email from Bitbucket API
        const emailRes = await axios.get(
          "https://api.bitbucket.org/2.0/user/emails",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const email = emailRes.data.values.find(
          (e: { is_primary: boolean }) => e.is_primary
        )?.email;

        // 🔥 Find or Create User
        let user = await User.findOne({
          provider: "bitbucket",
          providerId: profile.id,
        }).exec();

        if (!user) {
          user = await User.create({
            provider: "bitbucket",
            providerId: profile.id,
            name: profile.displayName,
            email: email,
          });
        }

        done(null, user);
      } catch (error) {
        console.error("Bitbucket OAuth error:", error);
        done(error, null);
      }
    }
  )
);

export default passport;
