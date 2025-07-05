import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertCheckpointSchema, insertFeatureFlagSchema,
  insertAnalyticsMetricSchema, insertPivotDecisionSchema, insertArchitectureComponentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Checkpoint routes
  app.get("/api/projects/:projectId/checkpoints", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const checkpoints = await storage.getCheckpoints(projectId);
      res.json(checkpoints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch checkpoints" });
    }
  });

  app.post("/api/projects/:projectId/checkpoints", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertCheckpointSchema.parse({ ...req.body, projectId });
      const checkpoint = await storage.createCheckpoint(validatedData);
      res.status(201).json(checkpoint);
    } catch (error) {
      res.status(400).json({ error: "Invalid checkpoint data" });
    }
  });

  app.put("/api/checkpoints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const checkpoint = await storage.updateCheckpoint(id, req.body);
      if (!checkpoint) {
        return res.status(404).json({ error: "Checkpoint not found" });
      }
      res.json(checkpoint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update checkpoint" });
    }
  });

  // Feature flag routes
  app.get("/api/projects/:projectId/feature-flags", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const featureFlags = await storage.getFeatureFlags(projectId);
      res.json(featureFlags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/projects/:projectId/feature-flags", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertFeatureFlagSchema.parse({ ...req.body, projectId });
      const featureFlag = await storage.createFeatureFlag(validatedData);
      res.status(201).json(featureFlag);
    } catch (error) {
      res.status(400).json({ error: "Invalid feature flag data" });
    }
  });

  app.put("/api/feature-flags/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const featureFlag = await storage.updateFeatureFlag(id, req.body);
      if (!featureFlag) {
        return res.status(404).json({ error: "Feature flag not found" });
      }
      res.json(featureFlag);
    } catch (error) {
      res.status(500).json({ error: "Failed to update feature flag" });
    }
  });

  // Analytics routes
  app.get("/api/projects/:projectId/analytics", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const metrics = await storage.getAnalyticsMetrics(projectId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics metrics" });
    }
  });

  app.post("/api/projects/:projectId/analytics", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertAnalyticsMetricSchema.parse({ ...req.body, projectId });
      const metric = await storage.createAnalyticsMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      res.status(400).json({ error: "Invalid analytics metric data" });
    }
  });

  // Pivot decision routes
  app.get("/api/projects/:projectId/pivot-decisions", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const decisions = await storage.getPivotDecisions(projectId);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pivot decisions" });
    }
  });

  app.post("/api/projects/:projectId/pivot-decisions", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertPivotDecisionSchema.parse({ ...req.body, projectId });
      const decision = await storage.createPivotDecision(validatedData);
      res.status(201).json(decision);
    } catch (error) {
      res.status(400).json({ error: "Invalid pivot decision data" });
    }
  });

  app.put("/api/pivot-decisions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const decision = await storage.updatePivotDecision(id, req.body);
      if (!decision) {
        return res.status(404).json({ error: "Pivot decision not found" });
      }
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pivot decision" });
    }
  });

  // Architecture component routes
  app.get("/api/projects/:projectId/architecture", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const components = await storage.getArchitectureComponents(projectId);
      res.json(components);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch architecture components" });
    }
  });

  app.post("/api/projects/:projectId/architecture", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertArchitectureComponentSchema.parse({ ...req.body, projectId });
      const component = await storage.createArchitectureComponent(validatedData);
      res.status(201).json(component);
    } catch (error) {
      res.status(400).json({ error: "Invalid architecture component data" });
    }
  });

  app.put("/api/architecture/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const component = await storage.updateArchitectureComponent(id, req.body);
      if (!component) {
        return res.status(404).json({ error: "Architecture component not found" });
      }
      res.json(component);
    } catch (error) {
      res.status(500).json({ error: "Failed to update architecture component" });
    }
  });

  return httpServer;
}
