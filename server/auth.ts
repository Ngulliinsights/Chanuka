import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import express from "express";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "legislative-track-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Set up local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.passwordHash))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Check if Google credentials are available
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Only set up Google strategy if credentials are available
  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy({
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by googleId
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            // If not found by googleId, check by email to link accounts
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
            if (email) {
              user = await storage.getUserByEmail(email);
            }

            if (user) {
              // Update existing user with Google ID
              user = await storage.updateUserGoogleId(user.id, profile.id);
            } else {
              // Create new user from Google profile
              user = await storage.createUser({
                username: profile.displayName || `user_${profile.id.substring(0, 8)}`,
                email: email,
                passwordHash: await hashPassword(randomBytes(16).toString('hex')), // random password
                googleId: profile.id,
                displayName: profile.displayName || '',
                avatarUrl: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      })
    );
  }

  // Register endpoints
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create a new user object with passwordHash instead of password
      const { password, ...rest } = req.body;
      const user = await storage.createUser({
        ...rest,
        passwordHash: await hashPassword(password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Google OAuth routes - Only add these if Google auth is set up
  if (googleClientId && googleClientSecret) {
    app.get("/api/auth/google", 
      passport.authenticate("google", { 
        scope: ["profile", "email"],
        prompt: "select_account"
      })
    );

    app.get("/api/auth/google/callback",
      passport.authenticate("google", { 
        failureRedirect: "/auth?error=google-auth-failed"
      }),
      (req, res) => {
        // Successful authentication, redirect to home or a success page
        res.redirect("/");
      }
    );
  }
}
// JWT Authentication utilities


export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}

// JWT Authentication functions
export const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const optionalAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, user: any) => {
      if (!err) {
        req.user = user;
      }
    });
  }

  next();
};

// Export all authentication functions
export { hashPassword, comparePasswords, authenticateToken, optionalAuth };
export type { AuthenticatedRequest };