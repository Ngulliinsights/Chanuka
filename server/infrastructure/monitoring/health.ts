import { Router } from "express";
import { ApiSuccess, ApiError, ApiResponseWrapper } from "../../utils/api-response.js";
import { databaseFallbackService } from "../database/database-fallback.js";
import { logger } from '@shared/utils/logger';

export const router = Router();

router.get("/", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthInfo = await databaseFallbackService.getHealthInfo();
    const dbStatus = databaseFallbackService.getStatus();
    
    return ApiSuccess(res, {
      status: healthInfo.system.stable ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      database: {
        connected: dbStatus.connected,
        mode: healthInfo.system.mode,
        demoMode: dbStatus.demoMode,
        message: healthInfo.system.message
      },
      services: {
        api: "operational",
        frontend: "operational",
        database: dbStatus.connected ? "operational" : "fallback",
        fallback: dbStatus.demoMode ? "active" : "standby"
      }
    }, ApiResponseWrapper.createMetadata(startTime, dbStatus.connected ? 'database' : 'fallback'));
  } catch (error) {
    return ApiError(res, "Health check failed", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Detailed system status
router.get("/system", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthInfo = await databaseFallbackService.getHealthInfo();
    
    return ApiSuccess(res, {
      timestamp: new Date().toISOString(),
      database: healthInfo.database,
      fallback: healthInfo.fallback,
      system: healthInfo.system,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || "development"
    }, ApiResponseWrapper.createMetadata(startTime, healthInfo.database.connected ? 'database' : 'fallback'));
  } catch (error) {
    return ApiError(res, "System status check failed", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Database retry endpoint (admin function)
router.post("/database/retry", async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔄 Manual database retry requested', { component: 'Chanuka' });
    const success = await databaseFallbackService.forceRetry();
    
    return ApiSuccess(res, {
      success,
      message: success ? "Database connection restored" : "Database connection failed",
      status: await databaseFallbackService.getHealthInfo()
    }, ApiResponseWrapper.createMetadata(startTime, success ? 'database' : 'fallback'));
  } catch (error) {
    return ApiError(res, "Database retry failed", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Demo mode control endpoint (admin function)
router.post("/demo-mode", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return ApiError(res, "Invalid request: 'enabled' must be a boolean", 400,
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
    
    databaseFallbackService.setDemoMode(enabled);
    
    return ApiSuccess(res, {
      demoMode: enabled,
      message: `Demo mode ${enabled ? 'enabled' : 'disabled'}`,
      status: await databaseFallbackService.getHealthInfo()
    }, ApiResponseWrapper.createMetadata(startTime, enabled ? 'fallback' : 'database'));
  } catch (error) {
    return ApiError(res, "Failed to toggle demo mode", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});






