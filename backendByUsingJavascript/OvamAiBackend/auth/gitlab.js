const passport = require('passport');
const GitLabStrategy = require('passport-gitlab2').Strategy;
const axios = require('axios');
const User = require('../models/User');

passport.use(new GitLabStrategy({
  clientID: process.env.GITLAB_CLIENT_ID,
  clientSecret: process.env.GITLAB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/gitlab/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { data } = await axios.get('https://gitlab.com/api/v4/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!data || !data.id) return done(null, false);

    let user = await User.findOne({ provider: 'gitlab', providerId: data.id });

    if (!user) {
      user = await User.create({
        provider: 'gitlab',
        providerId: data.id,
        name: data.name,
        email: profile.emails?.[0]?.value,
        username: data.username,
        avatar: data.avatar_url
      });
    }

    return done(null, {
            ...user.toObject(),         // Convert Mongoose doc to plain object
            accessToken,                // Add access token
            provider: 'gitlab'          // Add provider name
              });
  } catch (err) {
    return done(err);
  }
}));
