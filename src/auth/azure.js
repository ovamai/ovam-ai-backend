const passport = require('passport');
const OAuth2Strategy = require('passport-azure-ad-oauth2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.use('azure', new OAuth2Strategy({
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/azure/callback`,
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const decoded = jwt.decode(params.id_token);
    if (!decoded || !decoded.oid) return done(null, false);

    let user = await User.findOne({ provider: 'azure', providerId: decoded.oid });

    if (!user) {
      user = await User.create({
        provider: 'azure',
        providerId: decoded.oid,
        name: decoded.name,
        email: decoded.upn || decoded.email,
        username: decoded.unique_name,
        avatar: '' // Azure doesn't provide avatar
      });
    }

    return done(null,  {
            ...user.toObject(),         // Convert Mongoose doc to plain object
            accessToken,                // Add access token
            provider: 'azure'          // Add provider name
              });
  } catch (err) {
    return done(err);
  }
}));
