/**
 * Health Check Endpoint Middleware
 * 
 * Express middleware for health check endpoints with comprehensive features
 * Based on patterns from optimized_health_system.md
 */

import { Request, Response, NextFunction } from 'express';
import { HealthChecker } from './health-checker';
import { Logger } from '../logging';
import { logger } from '../logging';

export interface HealthEndpointConfig {
  includeDetails?: boolean;
  cacheMs?: number;
  transformResponse?: (health: any) => any;
  enableCors?: boolean;
  maxRequestsPerMinute?: number;
  enableMetrics?: boolean;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  statusCode: number;
}

export function createHealthEndpoints(
  checker: HealthChecker, 
  config: HealthEndpointConfig = {}
) {
  const logger = Logger.getInstance();
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  let cachedResponse: CachedResponse | null = null;
  
  const defaultConfig: Required<HealthEndpointConfig> = {
    includeDetails: true,
    cacheMs: 0,
    transformResponse: (health) => health,
    enableCors: false,
    maxRequestsPerMinute: 0, // 0 = no limit
    enableMetrics: true,
    ...config
  };

  /**
   * Apply rate limiting if configured
   */
  const applyRateLimit = (req: Request, res: Response): boolean => {
    if (defaultConfig.maxRequestsPerMinute === 0) return true;
    
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    const clientData = requestCounts.get(clientId) || { count: 0, resetTime: now + windowMs };
    
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    clientData.count++;
    requestCounts.set(clientId, clientData);
    
    if (clientData.count > defaultConfig.maxRequestsPerMinute) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return false;
    }
    
    return true;
  };

  /**
   * Apply CORS headers if enabled
   */
  const applyCors = (res: Response): void => {
    if (defaultConfig.enableCors) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
    }
  };

  /**
   * Get cached response if available and valid
   */
  const getCachedResponse = (): CachedResponse | null => {
    if (defaultConfig.cacheMs === 0 || !cachedResponse) {
      return null;
    }
    
    const now = Date.now();
    if (now - cachedResponse.timestamp > defaultConfig.cacheMs) {
      cachedResponse = null;
      return null;
    }
    
    return cachedResponse;
  };

  /**
   * Cache response if caching is enabled
   */
  const setCachedResponse = (data: any, statusCode: number): void => {
    if (defaultConfig.cacheMs > 0) {
      cachedResponse = {
        data,
        timestamp: Date.now(),
        statusCode
      };
    }
  };

  /**
   * Main health endpoint - comprehensive health information
   */
  const healthEndpoint = async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      if (!applyRateLimit(req, res)) return;
      applyCors(res);
      
      // Handle OPTIONS request for CORS
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      // Check cache first
      const cached = getCachedResponse();
      if (cached) {
        logger.debug('Serving cached health response');
        return res.status(cached.statusCode).json(cached.data);
      }
      
      // Run health checks
      const report = await checker.checkHealth();
      
      // Transform response if transformer provided
      const response = defaultConfig.transformResponse(report);
      
      // Set appropriate status code
      const statusCode = report.status === 'healthy' ? 200 : 
                        report.status === 'degraded' ? 200 : 503;
      
      // Cache the response
      setCachedResponse(response, statusCode);
      
      // Add response headers
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', defaultConfig.cacheMs > 0 ? 
        `public, max-age=${Math.floor(defaultConfig.cacheMs / 1000)}` : 
        'no-cache, no-store, must-revalidate'
      );
      
      res.status(statusCode).json(response);
      
      // Log metrics if enabled
      if (defaultConfig.enableMetrics) {
        const responseTime = Date.now() - startTime;
        logger.debug('Health check endpoint accessed', {
          status: report.status,
          checkCount: report.summary.total,
          criticalFailures: report.summary.critical_failures,
          responseTime,
          cached: false,
          clientIp: req.ip
        });
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Health endpoint failure', { 
        error: error.message,
        responseTime,
        clientIp: req.ip
      });
      
      res.status(503).json({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Readiness endpoint - lightweight check for load balancers
   */
  const readinessEndpoint = async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      if (!applyRateLimit(req, res)) return;
      applyCors(res);
      
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      const report = await checker.checkHealth();
      
      // Only return minimal data for readiness
      const ready = report.summary.critical_failures === 0;
      
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      res.status(ready ? 200 : 503).json({
        ready,
        timestamp: report.timestamp,
        criticalFailures: report.summary.critical_failures
      });
      
      if (defaultConfig.enableMetrics) {
        const responseTime = Date.now() - startTime;
        logger.debug('Readiness check accessed', {
          ready,
          criticalFailures: report.summary.critical_failures,
          responseTime,
          clientIp: req.ip
        });
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Readiness endpoint failure', { 
        error: error.message,
        responseTime,
        clientIp: req.ip
      });
      
      res.status(503).json({ 
        ready: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Liveness endpoint - very minimal for orchestrators
   */
  const livenessEndpoint = (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      if (!applyRateLimit(req, res)) return;
      applyCors(res);
      
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      // Simple liveness check - if we can respond, we're alive
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      res.status(200).json({ 
        alive: true, 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
      
      if (defaultConfig.enableMetrics) {
        const responseTime = Date.now() - startTime;
        logger.debug('Liveness check accessed', {
          responseTime,
          clientIp: req.ip
        });
      }
      
    } catch (error: any) {
      // Even if there's an error, we're still alive if we can respond
      logger.warn('Liveness endpoint error (but still alive)', { 
        error: error.message,
        clientIp: req.ip
      });
      
      res.status(200).json({ 
        alive: true, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Metrics endpoint - health check statistics
   */
  const metricsEndpoint = (req: Request, res: Response) => {
    try {
      if (!applyRateLimit(req, res)) return;
      applyCors(res);
      
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      const stats = checker.getStats();
      const lastResults = checker.getLastResults();
      
      const metrics = {
        checker: stats,
        lastResults: Object.fromEntries(lastResults),
        cache: {
          enabled: defaultConfig.cacheMs > 0,
          ttlMs: defaultConfig.cacheMs,
          hasCachedResponse: cachedResponse !== null,
          cacheAge: cachedResponse ? Date.now() - cachedResponse.timestamp : null
        },
        endpoint: {
          rateLimitEnabled: defaultConfig.maxRequestsPerMinute > 0,
          corsEnabled: defaultConfig.enableCors,
          activeConnections: requestCounts.size
        }
      };
      
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      res.status(200).json(metrics);
      
    } catch (error: any) {
      logger.error('Metrics endpoint failure', { 
        error: error.message,
        clientIp: req.ip
      });
      
      res.status(500).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  return {
    health: healthEndpoint,
    readiness: readinessEndpoint,
    liveness: livenessEndpoint,
    metrics: metricsEndpoint,
    // Utility functions
    clearCache: () => {
      cachedResponse = null;
      checker.clearCache();
    },
    getStats: () => ({
      requestCounts: requestCounts.size,
      cachedResponse: cachedResponse !== null,
      config: defaultConfig
    })
  };
}

/**
 * Backward compatibility - single health endpoint
 */
export function healthCheckEndpoint(
  checker: HealthChecker, 
  config?: HealthEndpointConfig
) {
  return createHealthEndpoints(checker, config).health;
}

/**
 * Create a complete health router with all endpoints
 */
export function createHealthRouter(
  checker: HealthChecker,
  config?: HealthEndpointConfig
) {
  const endpoints = createHealthEndpoints(checker, config);
  
  return {
    '/health': endpoints.health,
    '/health/ready': endpoints.readiness,
    '/health/live': endpoints.liveness,
    '/health/metrics': endpoints.metrics
  };
}















































