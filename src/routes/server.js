require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require("jsonwebtoken");

require("./auth");

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://localhost:27017/ovamAI')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));


passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await require("./backend/models/User").findById(id);
  done(null, user);
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ✅ Scopes per provider
const providerScopes = {
  github: ["user:email"],
  gitlab: ["read_user"],
  azure: [], // Azure DevOps doesn't need scope here
  bitbucket: ["account", "email"],
};

// Auth routes
["github", "gitlab", "azure", "bitbucket"].forEach((provider) => {
  if (provider === "bitbucket") {
    console.log(process.env.BITBUCKET_CLIENT_ID);
  }
  app.get(
    `/auth/${provider}`,
    passport.authenticate(provider, { scope: providerScopes[provider] })
  );

  app.get(
    `/auth/${provider}/callback`,
    passport.authenticate(provider, { failureRedirect: "/" }),
    (req, res) => {
      console.log("jwt_secret:", process.env.JWT_SECRET);
      console.log("User:", req.user);
      const token = generateToken(req.user);
      res.redirect(`http://localhost:3000/?token=${token}`);
    }
  );
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
