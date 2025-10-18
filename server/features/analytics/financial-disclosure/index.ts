// financial-disclosure.ts
// API Router for Financial Disclosure System
// Provides REST endpoints for monitoring, analytics, and data export

import { Router, Request, Response, NextFunction } from "express";
import { FinancialDisclosureMonitoringService } from "./monitoring.js";
import { FinancialDisclosureAnalyticsService } from "../services/financial-disclosure.service.js";
import { ApiSuccess, ApiError } from "../../../utils/api-response.js";
import { z, ZodError } from "zod";
// Note: BaseError, InvalidInputError not found in utils/errors.js - using ValidationError instead
import { ValidationError as InvalidInputError, SponsorNotFoundError, AppError } from "../../../utils/errors.js";
import crypto from 'crypto';
import { logger } from '../../../utils/logger.js';
import { errorTracker } from '../../../core/errors/error-tracker.js';

// ============================================================================
// API Validation Schemas & Middleware
// ============================================================================

/**
 * Centralized validation schemas using Zod.
 * These schemas provide type-safe request validation with clear error messages.
 * Each schema validates a different endpoint's input parameters.
 */
const Schemas = {
  getDisclosures: z.object({
    query: z.object({
      sponsorId: z.coerce.number().int().positive().optional(),
    })
  }),
  
  bySponsorId: z.object({
    params: z.object({
      sponsorId: z.coerce.number().int().positive("Sponsor ID must be a positive integer"),
    })
  }),
  
  createAlert: z.object({
    body: z.object({
      type: z.enum([
        'new_disclosure', 
        'updated_disclosure',
        'missing_disclosure',
        'threshold_exceeded', 
        'conflict_detected',
        'stale_disclosure'
      ]),
      sponsorId: z.number().int().positive("Sponsor ID must be positive"),
      description: z.string().min(10, "Description must be at least 10 characters"),
      severity: z.enum(['info', 'warning', 'critical']),
      metadata: z.record(z.any()).optional()
    })
  }),
  
  exportDisclosures: z.object({
    params: z.object({
      sponsorId: z.coerce.number().int().positive("Sponsor ID must be a positive integer"),
    }),
    query: z.object({
      format: z.enum(['json', 'csv']).default('json')
    })
  }),
  
  getAlerts: z.object({
    query: z.object({
      sponsorId: z.coerce.number().int().positive().optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      type: z.enum([
        'new_disclosure',
        'updated_disclosure', 
        'missing_disclosure',
        'threshold_exceeded',
        'conflict_detected',
        'stale_disclosure'
      ]).optional(),
      includeResolved: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().positive().max(500).optional()
    })
  }),
  
  resolveAlert: z.object({
    params: z.object({
      alertId: z.string().min(1, "Alert ID is required")
    }),
    body: z.object({
      resolution: z.string().min(10, "Resolution notes must be at least 10 characters").optional()
    })
  })
};

/**
 * Request validation middleware factory.
 * Validates incoming requests against Zod schemas and returns
 * structured error responses for validation failures.
 */
const validateRequest = (schema: z.ZodObject<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ 
        body: req.body, 
        query: req.query, 
        params: req.params 
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          status: "error", 
          message: "Validation failed", 
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        next(error);
      }
    }
  };
};

// ============================================================================
// Router Factory
// ============================================================================

/**
 * Creates and configures the financial disclosure router with all endpoints.
 * 
 * This factory pattern allows for:
 * - Dependency injection of services
 * - Easier testing and mocking
 * - Better separation of concerns
 * - Flexibility in service configuration
 * 
 * The router provides endpoints for:
 * - Operational monitoring (disclosures, alerts, health)
 * - Advanced analytics (completeness, relationships)
 * - Data export (JSON, CSV formats)
 * - System control (start/stop monitoring)
 */
export function createFinancialDisclosureRouter(
  monitoringService: FinancialDisclosureMonitoringService,
  analyticsService: FinancialDisclosureAnalyticsService
): Router {
  const router = Router();
  
  // Note: In production, add these middleware layers:
  // router.use(helmet()); // Security headers
  // router.use(rateLimiter(config)); // Rate limiting
  // router.use(authenticate); // Authentication
  // router.use(authorize(['admin', 'compliance'])); // Authorization

  // ============================================================================
  // Operational Monitoring Endpoints
  // ============================================================================

  /**
   * GET /disclosures
   * Retrieve operational disclosure data with optional sponsor filtering.
   * 
   * Query Parameters:
   *   - sponsorId (optional): Filter to a specific sponsor
   * 
   * Response: Array of enriched disclosure objects with risk levels
   * 
   * Features:
   *   - HTTP ETag support for conditional requests
   *   - Cache-Control headers for browser/CDN caching
   *   - 304 Not Modified responses to save bandwidth
   */
  router.get(
    "/disclosures", 
    validateRequest(Schemas.getDisclosures), 
    async (req, res, next) => {
      try {
        const sponsorId = req.query.sponsorId ? Number(req.query.sponsorId) : undefined;
        const data = await monitoringService.collectFinancialDisclosures(sponsorId);
        
        // Generate ETag for conditional requests
        const etag = crypto
          .createHash('md5')
          .update(JSON.stringify(data))
          .digest('hex');
        res.setHeader('ETag', etag);
        
        // Return 304 Not Modified if content hasn't changed
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }

        // Cache response for 5 minutes
        res.setHeader('Cache-Control', 'public, max-age=300');
        ApiSuccess(res, data);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /disclosures/:sponsorId/completeness
   * Calculate basic completeness score for operational monitoring.
   * 
   * This is a lightweight endpoint for quick completeness checks.
   * For detailed analytics, use /analytics/completeness/:sponsorId instead.
   * 
   * Response: Simple completeness score with missing disclosure types
   */
  router.get(
    "/disclosures/:sponsorId/completeness",
    validateRequest(Schemas.bySponsorId),
    async (req, res, next) => {
      try {
        const sponsorId = Number(req.params.sponsorId);
        const completeness = await monitoringService.calculateBasicCompleteness(sponsorId);
        ApiSuccess(res, completeness);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /alerts
   * Retrieve recent alerts with flexible filtering.
   * 
   * Query Parameters:
   *   - sponsorId (optional): Filter by sponsor
   *   - severity (optional): Filter by severity level
   *   - type (optional): Filter by alert type
   *   - includeResolved (optional): Include resolved alerts
   *   - limit (optional): Maximum results (default 50, max 500)
   * 
   * Response: Array of alerts sorted by creation time (newest first)
   */
  router.get(
    "/alerts",
    validateRequest(Schemas.getAlerts),
    async (req, res, next) => {
      try {
        const options = {
          sponsorId: req.query.sponsorId ? Number(req.query.sponsorId) : undefined,
          severity: req.query.severity as any,
          type: req.query.type as any,
          includeResolved: req.query.includeResolved === 'true',
          limit: req.query.limit ? Number(req.query.limit) : undefined
        };
        
        const alerts = await monitoringService.getRecentAlerts(options);
        ApiSuccess(res, alerts);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /alerts
   * Manually create a new disclosure alert.
   * 
   * Request Body:
   *   - type: Alert type (enum)
   *   - sponsorId: Sponsor identifier
   *   - description: Alert description (min 10 chars)
   *   - severity: Alert severity level
   *   - metadata (optional): Additional alert data
   * 
   * Response: Created alert object with 201 status
   * 
   * Use Cases:
   *   - Admin-triggered alerts for manual review
   *   - Integration with external compliance systems
   *   - Testing and validation workflows
   */
  router.post(
    "/alerts", 
    validateRequest(Schemas.createAlert), 
    async (req, res, next) => {
      try {
        const { type, sponsorId, description, severity, metadata } = req.body;
        const alert = await monitoringService.createManualAlert(
          type, 
          sponsorId, 
          description, 
          severity,
          metadata || {}
        );
        
        // Return 201 Created for successful resource creation
        ApiSuccess(res, alert);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /alerts/:alertId/resolve
   * Mark an alert as resolved with optional resolution notes.
   * 
   * Request Body:
   *   - resolution (optional): Resolution notes
   * 
   * Response: Success message
   */
  router.put(
    "/alerts/:alertId/resolve",
    validateRequest(Schemas.resolveAlert),
    async (req, res, next) => {
      try {
        const { alertId } = req.params;
        const { resolution } = req.body;
        
        await monitoringService.resolveAlert(alertId, resolution);
        ApiSuccess(res, { 
          message: 'Alert resolved successfully',
          alertId,
          resolvedAt: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /monitoring/start
   * Manually start the automated monitoring lifecycle.
   * 
   * Response: Confirmation message with timestamp
   * 
   * Security Note: In production, protect this endpoint with admin-only
   * authorization middleware to prevent unauthorized system control.
   */
  router.post(
    "/monitoring/start", 
    /* TODO: Add adminOnly middleware */
    (_req, res, next) => {
      try {
        monitoringService.startAutomatedMonitoring();
        ApiSuccess(res, { 
          message: "Automated monitoring started successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /monitoring/stop
   * Gracefully stop the automated monitoring lifecycle.
   * 
   * Response: Confirmation message with final statistics
   * 
   * Security Note: Requires admin authorization in production
   */
  router.post(
    "/monitoring/stop",
    /* TODO: Add adminOnly middleware */
    async (_req, res, next) => {
      try {
        await monitoringService.stopAutomatedMonitoring();
        const status = monitoringService.getStatus();
        
        ApiSuccess(res, {
          message: "Monitoring stopped successfully",
          finalStatus: status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /monitoring/trigger
   * Manually trigger an immediate monitoring check cycle.
   * 
   * Response: Array of alerts generated during the check
   * 
   * Use Cases:
   *   - On-demand compliance checks
   *   - Testing and validation
   *   - Emergency audits
   */
  router.post(
    "/monitoring/trigger",
    /* TODO: Add adminOnly middleware */
    async (_req, res, next) => {
      try {
        const alerts = await monitoringService.triggerManualCheck();
        ApiSuccess(res, {
          message: "Monitoring check completed",
          alertsGenerated: alerts.length,
          alerts,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /monitoring/status
   * Get current monitoring service status and statistics.
   * 
   * Response: Current operational status
   */
  router.get(
    "/monitoring/status",
    (_req, res, next) => {
      try {
        const status = monitoringService.getStatus();
        ApiSuccess(res, status);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /health
   * Comprehensive health check for monitoring and alerting systems.
   * 
   * Response: Health status with component-level diagnostics
   * HTTP Status: 503 if any critical dependencies are unhealthy
   * 
   * This endpoint is designed for:
   *   - Load balancer health checks
   *   - Monitoring system integration
   *   - Incident response and diagnostics
   */
  router.get("/health", async (_req, res, next) => {
    try {
      const healthStatus = await monitoringService.getHealthStatus();
      
      // Return appropriate HTTP status code based on health
      if (healthStatus.status === 'unhealthy') {
        return res.status(503).json(healthStatus);
      }
      
      if (healthStatus.status === 'degraded') {
        return res.status(200).json(healthStatus);
      }
      
      ApiSuccess(res, healthStatus);
    } catch (error) {
      next(error);
    }
  });

  // ============================================================================
  // Advanced Analytics Endpoints
  // ============================================================================

  /**
   * GET /analytics/completeness/:sponsorId
   * Generate comprehensive completeness analysis with recommendations.
   * 
   * This endpoint provides:
   *   - Multi-dimensional quality scoring
   *   - Temporal trend analysis
   *   - Specific actionable recommendations
   *   - Detailed metric breakdowns
   * 
   * Response: Detailed completeness report
   * 
   * Note: This is more expensive than the basic completeness endpoint
   * and should be used for detailed analysis rather than frequent polling.
   */
  router.get(
    "/analytics/completeness/:sponsorId", 
    validateRequest(Schemas.bySponsorId), 
    async (req, res, next) => {
      try {
        const sponsorId = Number(req.params.sponsorId);
        const report = await analyticsService.calculateCompletenessScore(sponsorId);
        
        // Cache for 1 hour due to expensive computation
        res.setHeader('Cache-Control', 'private, max-age=3600');
        ApiSuccess(res, report);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /analytics/relationships/:sponsorId
   * Generate comprehensive financial relationship mapping.
   * 
   * This endpoint provides:
   *   - Network analysis of financial connections
   *   - Conflict of interest detection
   *   - Risk concentration analysis
   *   - Relationship strength scoring
   * 
   * Response: Detailed relationship mapping with network metrics
   * 
   * Use Cases:
   *   - Due diligence investigations
   *   - Conflict of interest reviews
   *   - Risk assessment and monitoring
   */
  router.get(
    "/analytics/relationships/:sponsorId", 
    validateRequest(Schemas.bySponsorId), 
    async (req, res, next) => {
      try {
        const sponsorId = Number(req.params.sponsorId);
        const mapping = await analyticsService.buildRelationshipMap(sponsorId);
        
        // Cache for 1 hour due to expensive computation
        res.setHeader('Cache-Control', 'private, max-age=3600');
        ApiSuccess(res, mapping);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /analytics/dashboard
   * Generate system-wide transparency dashboard.
   * 
   * This endpoint provides:
   *   - Overall system health metrics
   *   - Risk distribution across all sponsors
   *   - Top performers and sponsors needing attention
   *   - Aggregate disclosure statistics
   * 
   * Response: System-wide dashboard data
   * 
   * Intended for:
   *   - Executive oversight
   *   - Compliance reporting
   *   - System monitoring
   */
  router.get(
    "/analytics/dashboard",
    async (_req, res, next) => {
      try {
        const dashboard = await analyticsService.generateDashboard();
        
        // Cache for 5 minutes (dashboards need to be relatively fresh)
        res.setHeader('Cache-Control', 'private, max-age=300');
        ApiSuccess(res, dashboard);
      } catch (error) {
        next(error);
      }
    }
  );

  // ============================================================================
  // Data Export Endpoints
  // ============================================================================

  /**
   * GET /export/:sponsorId
   * Export sponsor disclosure data in multiple formats.
   * 
   * Query Parameters:
   *   - format: 'json' (default) or 'csv'
   * 
   * Response: Formatted disclosure data
   *   - JSON: Standard JSON response
   *   - CSV: File download with appropriate headers
   * 
   * Use Cases:
   *   - Compliance reporting
   *   - External system integration
   *   - Data analysis and auditing
   *   - Archival and backup
   */
  router.get(
    "/export/:sponsorId", 
    validateRequest(Schemas.exportDisclosures), 
    async (req, res, next) => {
      try {
        const sponsorId = Number(req.params.sponsorId);
        const format = (req.query.format as 'json' | 'csv') || 'json';
        
        const data = await monitoringService.exportSponsorDisclosures(sponsorId, format);
        
        // Set appropriate headers based on export format
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition', 
            `attachment; filename="disclosures-${sponsorId}-${Date.now()}.csv"`
          );
          res.setHeader('Cache-Control', 'private, no-cache');
          res.send(data);
        } else {
          // For JSON, parse the string and send as proper JSON response
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'private, no-cache');
          res.json(JSON.parse(data));
        }
      } catch (error) {
        next(error);
      }
    }
  );

  // ============================================================================
  // Centralized Error Handling Middleware
  // ============================================================================

  /**
   * Global error handler for the financial disclosure router.
   * 
   * Provides consistent error responses and logging across all endpoints.
   * Maps specific error types to appropriate HTTP status codes.
   * 
   * Error Handling Strategy:
   *   - Known errors: Specific status codes with safe error messages
   *   - Unknown errors: Generic 500 with logged details (no leak)
   *   - All errors: Logged with context for debugging
   */
  /**
   * Global error handler for the financial disclosure router.
   * 
   * Provides consistent error responses and logging across all endpoints.
   * Maps specific error types to appropriate HTTP status codes.
   * 
   * Error Handling Strategy:
   *   - Known errors: Specific status codes with safe error messages
   *   - Unknown errors: Generic 500 with logged details (no leak)
   *   - All errors: Logged with context for debugging
   */
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Handle Zod validation errors (should be caught earlier, but just in case)
    if (err instanceof ZodError) {
      return ApiError(res, 'Validation failed', 400);
    }

    // Handle known business logic errors with appropriate status codes
    if (err instanceof SponsorNotFoundError) {
      return ApiError(res, err.message, 404);
    }
    
    if (err instanceof InvalidInputError) {
      return ApiError(res, err.message, 400);
    }
    
    if (err instanceof AppError) {
      return ApiError(res, err.message, err.statusCode || 500);
    }
    
    // Log unexpected errors with full context for debugging
    logger.error(`[Unhandled API Error]: ${err instanceof Error ? err.message : String(err)}`, {
      component: 'financial-disclosure',
      path: req.path,
      method: req.method,
      query: req.query,
      params: req.params,
      stack: err instanceof Error ? err.stack : undefined
    });
    try {
      if ((errorTracker as any)?.capture) {
        (errorTracker as any).capture(err instanceof Error ? err : new Error(String(err)), { component: 'financial-disclosure', path: req.path, method: req.method });
      }
    } catch (reportErr) {
      logger.warn('Failed to report unhandled financial-disclosure error to errorTracker', { reportErr });
    }
    
    // Return generic error message to avoid leaking implementation details
    ApiError(res, "An unexpected internal server error occurred. Please try again later.", 500);
  });
  
  return router;
}

// ============================================================================
// Type Exports
// ============================================================================

export type { 
  FinancialDisclosureMonitoringService,
  FinancialDisclosureAnalyticsService 
};
