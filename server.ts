import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import jwt from "jsonwebtoken";

// 🔥 Load environment variables
dotenv.config();

// 🔥 Import authentication strategies
import "./auth/github";
import "./auth/gitlab";
import "./auth/azure";
import "./auth/bitbucket";

// 🔥 Import User model
import User, { IUser } from "./models/User";

// ✅ Express app initialization
const app = express();

// ✅ Middleware setup
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

// ✅ MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/ovamAI")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ✅ Session handling for Passport
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// ✅ JWT Token Generator
const generateToken = (user: IUser) => {
  const jwtSecret = process.env.JWT_SECRET as string;
  return jwt.sign(
    { id: user._id, email: user.email },
    jwtSecret,
    { expiresIn: "7d" }
  );
};

// ✅ Scopes for each provider
const providerScopes: { [key: string]: string[] } = {
  github: ["user:email"],
  gitlab: ["read_user"],
  azure: [],
  bitbucket: ["account", "email"],
};

// ✅ Authentication Routes
["github", "gitlab", "azure", "bitbucket"].forEach((provider) => {
  app.get(
    `/auth/${provider}`,
    passport.authenticate(provider, { scope: providerScopes[provider] })
  );

  app.get(
    `/auth/${provider}/callback`,
    passport.authenticate(provider, { failureRedirect: "/" }),
    (req: Request, res: Response) => {
      const token = generateToken(req.user as IUser);
      res.redirect(`http://localhost:3000/?token=${token}`);
    }
  );
});

// ✅ Server Listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
