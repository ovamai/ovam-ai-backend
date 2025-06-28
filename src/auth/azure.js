const passport = require("passport");
const AzureStrategy = require("passport-azure-ad-oauth2").Strategy;
const graph = require("@microsoft/microsoft-graph-client");
const User = require("../models/User");

passport.use(new AzureStrategy({
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/azure/callback`,
  tenant: "common"
}, async (accessToken, refreshToken, params, profile, done) => {
  const client = graph.Client.init({
    authProvider: (done) => done(null, accessToken),
  });

  const me = await client.api("/me").get();

  let user = await User.findOne({ provider: "azure", providerId: me.id });
  if (!user) {
    user = await User.create({
      provider: "azure",
      providerId: me.id,
      name: me.displayName,
      email: me.mail || me.userPrincipalName,
      avatar: null,
    });
  }

  done(null, user);
}));
