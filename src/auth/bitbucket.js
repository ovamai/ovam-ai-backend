const passport = require('passport');
const BitbucketStrategy = require('passport-bitbucket-oauth2').Strategy;
const axios = require('axios');
const User = require('../models/User');

passport.use(new BitbucketStrategy({
  clientID: process.env.BITBUCKET_CLIENT_ID,
  clientSecret: process.env.BITBUCKET_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/bitbucket/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { data } = await axios.get('https://api.bitbucket.org/2.0/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!data || !data.uuid) return done(null, false);

    let user = await User.findOne({ provider: 'bitbucket', providerId: data.uuid });

    if (!user) {
      user = await User.create({
        provider: 'bitbucket',
        providerId: data.uuid,
        name: data.display_name,
        email: profile.emails?.[0]?.value,
        username: data.username,
        avatar: data.links?.avatar?.href
      });
    }

    return done(null,  {
            ...user.toObject(),         // Convert Mongoose doc to plain object
            accessToken,                // Add access token
            provider: 'bitbucket'          // Add provider name
              });
  } catch (err) {
    return done(err);
  }
}));
