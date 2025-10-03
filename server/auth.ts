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
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Note: storage.getUser method needs to be implemented or use direct DB query
      // Create a complete user object that matches the User schema
      const user = {
        id,
        email: '',
        name: '',
        role: 'citizen',
        verificationStatus: 'pending',
        passwordHash: '',
        firstName: null,
        lastName: null,
        preferences: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Set up local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Note: This needs to be implemented with proper DB query
        // For now, always return authentication failure
        return done(null, false);
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
          // Note: Google OAuth integration needs proper implementation
          // For now, create a placeholder user that matches the User schema
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
          const user = {
            id: profile.id,
            email: email,
            name: profile.displayName || '',
            role: 'citizen',
            passwordHash: await hashPassword(randomBytes(16).toString('hex')),
            verificationStatus: 'pending',
            firstName: null,
            lastName: null,
            preferences: null,
            isActive: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };

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
      // Note: This needs proper implementation with DB queries
      // For now, return a placeholder response that matches the User schema
      const { password, ...rest } = req.body;
      const user = {
        id: randomBytes(16).toString('hex'),
        email: req.body.email,
        name: req.body.name || req.body.username,
        role: 'citizen',
        passwordHash: await hashPassword(password),
        verificationStatus: 'pending',
        firstName: null,
        lastName: null,
        preferences: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

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
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    verificationStatus: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    preferences: unknown;
    isActive: boolean | null;
    lastLoginAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
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

// Functions are already exported individually above