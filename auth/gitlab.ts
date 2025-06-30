import passport from "passport";
const GitHubOAuth2 = require("passport-gitlab2");
import User, { IUser } from "../models/User";

passport.use(
  new GitHubOAuth2(
    {
      clientID: process.env.GITLAB_CLIENT_ID as string,
      clientSecret: process.env.GITLAB_CLIENT_SECRET as string,
      callbackURL: `${process.env.BASE_URL}/auth/gitlab/callback`,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: Express.User | false | null) => void
    ) => {
      try {
        const email = profile?.emails?.[0]?.value;
        const avatar = profile?.avatarUrl;
        const name = profile?.displayName || profile?.username;

        let user = await User.findOne({
          provider: "gitlab",
          providerId: profile.id,
        }).exec();

        if (!user) {
          user = await User.create({
            provider: "gitlab",
            providerId: profile.id,
            name,
            email,
            avatar,
          });
        }

        done(null, user);
      } catch (error) {
        console.error("GitLab OAuth error:", error);
        done(error, null);
      }
    }
  )
);

export default passport;
