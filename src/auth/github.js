const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const User = require('../models/User');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { data } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!data || !data.id) return done(null, false);

    let user = await User.findOne({ provider: 'github', providerId: data.id });

    if (!user) {
      user = await User.create({
        provider: 'github',
        providerId: data.id,
        name: data.name || data.login,
        email: profile.emails?.[0]?.value,
        username: data.login,
        avatar: data.avatar_url
      });
    }

    return done(null, {
      ...user.toObject(),       // ✅ Convert to plain object
      accessToken,              // ✅ Attach accessToken
      provider: 'github'        // ✅ Tag provider
    });

  } catch (err) {
    return done(err);
  }
}));
