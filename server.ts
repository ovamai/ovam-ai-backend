import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import jwt from "jsonwebtoken";

// Load environment variables
dotenv.config();

// 🔥 Import authentication strategies
import "./auth/github";
import "./auth/gitlab";
import "./auth/azure";
import "./auth/bitbucket";

// Import User model and type
import User, { IUser } from "./models/User";

const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/ovamAI")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Session handling
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ✅ JWT Token generator
const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

// ✅ Scopes for providers
const providerScopes: { [key: string]: string[] } = {
  github: ["user:email"],
  gitlab: ["read_user"],
  azure: [],
  bitbucket: ["account", "email"],
};

// ✅ Auth routes
["github", "gitlab", "azure", "bitbucket"].forEach((provider) => {
  app.get(
    `/auth/${provider}`,
    passport.authenticate(provider, { scope: providerScopes[provider] })
  );

  app.get(
    `/auth/${provider}/callback`,
    passport.authenticate(provider, { failureRedirect: "/" }),
    (req, res) => {
      const token = generateToken(req.user as IUser);
      res.redirect(`http://localhost:3000/?token=${token}`);
    }
  );
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
