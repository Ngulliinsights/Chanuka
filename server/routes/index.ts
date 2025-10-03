import express from "express";
import { createServer } from "http";
import { router as billsRouter } from "./bills.js";
import { router as sponsorsRouter } from "./sponsors.js";
import { router as analysisRouter } from "./analysis.js";
import { router as sponsorshipRouter } from "./sponsorship.js";
import { router as systemRouter } from "./system.js";
import { router as healthRouter } from "./health.js";
import { router as authRouter } from "./auth.js";
import { router as usersRouter } from "./users.js";
import { router as verificationRouter } from "./verification.js";

export async function registerRoutes(app: express.Express) {
  const server = createServer(app);

  // Set up API routes
  const apiRouter = express.Router();

  // Register all route handlers
  apiRouter.use("/bills", billsRouter);
  apiRouter.use("/sponsors", sponsorsRouter);
  apiRouter.use("/analysis", analysisRouter);
  apiRouter.use("/sponsorship", sponsorshipRouter);
  apiRouter.use("/system", systemRouter);
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/users", usersRouter);
  apiRouter.use("/verification", verificationRouter);

  // Mount API router
  app.use("/api", apiRouter);

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({ 
      message: "Chanuka Legislative Transparency Platform API",
      version: "1.0.0",
      endpoints: {
        bills: "/api/bills",
        sponsors: "/api/sponsors",
        analysis: "/api/analysis",
        sponsorship: "/api/sponsorship",
        system: "/api/system",
        health: "/api/health",
        auth: "/api/auth",
        users: "/api/users",
        verification: "/api/verification"
      }
    });
  });

  return server;
}