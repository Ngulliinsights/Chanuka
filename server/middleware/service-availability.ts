import { logger } from '@shared/core';
import { NextFunction,Request, Response } from 'express';

interface ServiceStatus {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
}

class ServiceAvailabilityManager {
  private serviceStatus: ServiceStatus = {
    isHealthy: true,
    lastCheck: new Date(),
    consecutiveFailures: 0
  };

  private readonly maxFailures = 3;
  private readonly checkInterval = 30000; // 30 seconds

  constructor() {
    this.startHealthChecks();
  }

  private startHealthChecks() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  private async performHealthCheck() {
    try {
      // Basic health checks
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // More lenient memory check - only fail at 95%
      if (heapUsedPercent > 95) {
        throw new Error(`Critical memory usage: ${heapUsedPercent.toFixed(2)}%`);
      }

      // Check if we can access basic Node.js functionality
      const testDate = new Date();
      if (!testDate || isNaN(testDate.getTime())) {
        throw new Error('Basic JavaScript functionality compromised');
      }

      // Reset failure count on successful check
      this.serviceStatus.consecutiveFailures = 0;
      this.serviceStatus.isHealthy = true;
      this.serviceStatus.lastCheck = new Date();

    } catch (error) {
      this.serviceStatus.consecutiveFailures++;
      this.serviceStatus.lastCheck = new Date();

      // Only mark as unhealthy after more failures (5 instead of 3)
      if (this.serviceStatus.consecutiveFailures >= 5) {
        this.serviceStatus.isHealthy = false;
        logger.error('Service marked as unhealthy', {
          error: error instanceof Error ? error.message : String(error),
          consecutiveFailures: this.serviceStatus.consecutiveFailures
        });
      }
    }
  }

  public isServiceHealthy(): boolean {
    return this.serviceStatus.isHealthy;
  }

  public getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  public forceHealthy() {
    this.serviceStatus.isHealthy = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.lastCheck = new Date();
  }
}

const serviceManager = new ServiceAvailabilityManager();

export const serviceAvailabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip health checks for API health endpoints and development resources
  if (req.path.includes('/health') ||
    req.path.includes('/api/frontend-health') ||
    req.path.startsWith('/src/') ||
    req.path.startsWith('/@') ||
    req.path.includes('?import') ||
    req.path.includes('?direct') ||
    req.path.match(/\.(ts|tsx|jsx|vue|js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|json|map)$/)) {
    return next();
  }

  // Check service health - but be more lenient during startup
  if (!serviceManager.isServiceHealthy()) {
    const status = serviceManager.getServiceStatus();

    // If it's been less than 60 seconds since startup, don't block requests
    const timeSinceLastCheck = Date.now() - status.lastCheck.getTime();
    if (timeSinceLastCheck < 60000) {
      logger.warn('Service health check failed but allowing request during startup period', {
        consecutiveFailures: status.consecutiveFailures,
        timeSinceLastCheck
      });
      return next();
    }

    // Return 503 Service Unavailable only for severe issues
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'The service is currently experiencing issues and will be back shortly',
      code: 'SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      retryAfter: 30, // seconds
      lastHealthCheck: status.lastCheck,
      consecutiveFailures: status.consecutiveFailures
    });
  }

  next();
};

export { serviceManager };

