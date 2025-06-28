const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/github/callback`,
  scope:['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ provider: "github", providerId: profile.id });
  if (!user) {
    user = await User.create({
      provider: "github",
      providerId: profile?.id,
      name: profile?.displayName || profile?.username,
      email: profile?.emails[0]?.value,
      avatar: profile?.photos[0]?.value,
    });
  }
  done(null, user);
}));
