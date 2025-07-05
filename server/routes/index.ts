import express from "express";
import { createServer } from "http";
import { setupBillRoutes } from "./bills";
import { setupSponsorRoutes } from "./sponsors";
import { setupAnalysisRoutes } from "./analysis";
import { setupSponsorshipRoutes } from "./sponsorship";
import { setupSystemRoutes } from "./system";
import { setupHealthRoutes } from "./health";
import { setupAuthRoutes } from "./auth";
import { setupUserRoutes } from "./users";
import { setupVerificationRoutes } from "./verification";

export async function registerRoutes(app: express.Express) {
  const server = createServer(app);

  // Set up API routes
  const apiRouter = express.Router();

  // Register all route handlers
  setupBillRoutes(apiRouter);
  setupSponsorRoutes(apiRouter);
  setupAnalysisRoutes(apiRouter);
  setupSponsorshipRoutes(apiRouter);
  setupSystemRoutes(apiRouter);
  setupHealthRoutes(apiRouter);
  setupAuthRoutes(apiRouter);
  setupUserRoutes(apiRouter);
  setupVerificationRoutes(apiRouter);

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