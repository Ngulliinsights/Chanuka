import { Hono } from "hono";
import { validateDatabaseHealth } from "../utils/db-init";
import { isDatabaseConnected } from "../db";

const app = new Hono();

app.get("/", async (c) => {
  const dbHealth = await validateDatabaseHealth();

  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: {
      connected: isDatabaseConnected,
      tables_exist: dbHealth.tablesExist,
      can_write: dbHealth.canWrite,
      mode: isDatabaseConnected ? "database" : "sample_data"
    },
    services: {
      api: "operational",
      frontend: "operational",
      database: isDatabaseConnected ? "operational" : "fallback"
    }
  });
});

// Detailed system status
app.get("/system", async (c) => {
  const dbHealth = await validateDatabaseHealth();

  return c.json({
    timestamp: new Date().toISOString(),
    database: {
      status: isDatabaseConnected ? "connected" : "disconnected",
      health: dbHealth,
      message: isDatabaseConnected 
        ? "Database fully operational" 
        : "Running in sample data mode - database unavailable"
    },
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

export default app;