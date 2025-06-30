import passport from "passport";
const GitHubOAuth2 = require("passport-github2");
import User, { IUser } from "../models/User";

passport.use(
  new GitHubOAuth2(
    {
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/github/callback`,
      scope: ["user:email"],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: Express.User | false | null) => void
    ) => {
      try {
        const email = profile?.emails?.[0]?.value;
        const avatar = profile?.photos?.[0]?.value;
        const name = profile?.displayName || profile?.username;

        let user = await User.findOne({
          provider: "github",
          providerId: profile.id,
        }).exec();

        if (!user) {
          user = await User.create({
            provider: "github",
            providerId: profile.id,
            name,
            email,
            avatar,
          });
        }

        done(null, user);
      } catch (error) {
        console.error("GitHub OAuth error:", error);
        done(error, null);
      }
    }
  )
);

export default passport;
