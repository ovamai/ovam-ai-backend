const passport = require("passport");
const GitLabStrategy = require("passport-gitlab2").Strategy;
const User = require("../models/User");

passport.use(new GitLabStrategy({
  clientID: process.env.GITLAB_CLIENT_ID,
  clientSecret: process.env.GITLAB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/gitlab/callback`
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ provider: "gitlab", providerId: profile.id });
  if (!user) {
    user = await User.create({
      provider: "gitlab",
      providerId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.avatarUrl,
    });
  }
  done(null, user);
}));
