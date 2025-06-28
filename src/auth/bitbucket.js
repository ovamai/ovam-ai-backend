const passport = require("passport");
const BitbucketStrategy = require("passport-bitbucket-oauth2").Strategy;
const axios = require("axios");
const User = require("../models/User");

passport.use(
  new BitbucketStrategy(
    {
      clientID: process.env.BITBUCKET_CLIENT_ID,
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/bitbucket/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      const emailRes = await axios.get(
        "https://api.bitbucket.org/2.0/user/emails",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const email = emailRes.data.values.find((e) => e.is_primary)?.email;

      let user = await User.findOne({
        provider: "bitbucket",
        providerId: profile.id,
      });
      if (!user) {
        user = await User.create({
          provider: "bitbucket",
          providerId: profile.id,
          name: profile.displayName,
          email,
        });
      }
      done(null, user);
    }
  )
);
