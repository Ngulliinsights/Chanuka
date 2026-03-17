// financial-disclosure.ts
// API Router for Financial Disclosure System
// Provides REST endpoints for monitoring, analytics, and data export

import { ComplianceAuditingService } from '@server/features/analytics/domain/financial-disclosure/compliance-auditing.service';
import {
  FinancialDisclosureAnalyticsService,
  financialDisclosureAnalyticsService,
} from './financial-disclosure-analytics.service';
import { logger } from '@server/infrastructure/observability';
import { ApiSuccess, ApiErrorResponse } from '@server/utils/api-utils';
import type { FinancialAlert } from './types';
import * as crypto from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { ErrorCategory } from '@server/infrastructure/error-handling';

// ============================================================================
// Validation Schemas & Middleware
// ============================================================================

const Schemas = {
  getDisclosures: z.object({
    query: z.object({
      sponsor_id: z.coerce.number().int().positive().optional(),
    }),
  }),

  bySponsorId: z.object({
    params: z.object({
      sponsor_id: z.coerce
        .number()
        .int()
        .positive('Sponsor ID must be a positive integer'),
    }),
  }),

  createAlert: z.object({
    body: z.object({
      type: z.enum([
        'new_disclosure',
        'updated_disclosure',
        'missing_disclosure',
        'threshold_exceeded',
        'conflict_detected',
        'stale_disclosure',
      ]),
      sponsor_id: z.number().int().positive('Sponsor ID must be positive'),
      description: z.string().min(10, 'Description must be at least 10 characters'),
      severity: z.enum(['info', 'warning', 'critical']),
      metadata: z.record(z.any()).optional(),
    }),
  }),

  exportDisclosures: z.object({
    params: z.object({
      sponsor_id: z.coerce
        .number()
        .int()
        .positive('Sponsor ID must be a positive integer'),
    }),
    query: z.object({
      format: z.enum(['json', 'csv']).default('json'),
    }),
  }),

  getAlerts: z.object({
    query: z.object({
      sponsor_id: z.coerce.number().int().positive().optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      type: z
        .enum([
          'new_disclosure',
          'updated_disclosure',
          'missing_disclosure',
          'threshold_exceeded',
          'conflict_detected',
          'stale_disclosure',
        ])
        .optional(),
      includeResolved: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
    }),
  }),

  resolveAlert: z.object({
    params: z.object({
      alertId: z.string().min(1, 'Alert ID is required'),
    }),
    body: z.object({
      resolution: z
        .string()
        .min(10, 'Resolution notes must be at least 10 characters')
        .optional(),
    }),
  }),
};

/** Request validation middleware factory. */
const validateRequest = (schema: z.ZodObject<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
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
 */
export function createFinancialDisclosureRouter(
  auditingService: ComplianceAuditingService,
  analyticsService: FinancialDisclosureAnalyticsService = financialDisclosureAnalyticsService,
): Router {
  const router = Router();

  // ── Disclosures ─────────────────────────────────────────────────────────────

  router.get(
    '/disclosures',
    validateRequest(Schemas.getDisclosures),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sponsor_id = req.query.sponsor_id ? Number(req.query.sponsor_id) : undefined;
        const data = await auditingService.collectFinancialDisclosures(sponsor_id);

        const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
        res.setHeader('ETag', etag);

        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return;
        }

        res.setHeader('Cache-Control', 'public, max-age=300');
        ApiSuccess(res, data);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/disclosures/:sponsor_id/completeness',
    validateRequest(Schemas.bySponsorId),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sponsor_id = Number(req.params.sponsor_id);
        const completeness = await auditingService.calculateBasicCompleteness(sponsor_id);
        ApiSuccess(res, completeness);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Alerts ───────────────────────────────────────────────────────────────────

  router.get(
    '/alerts',
    validateRequest(Schemas.getAlerts),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const options = {
          sponsor_id: req.query.sponsor_id ? Number(req.query.sponsor_id) : undefined,
          severity: req.query.severity as FinancialAlert['severity'] | undefined,
          type: req.query.type as FinancialAlert['type'] | undefined,
          includeResolved: req.query.includeResolved === 'true',
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        };
        const alerts = await auditingService.getRecentAlerts(options);
        ApiSuccess(res, alerts);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/alerts',
    validateRequest(Schemas.createAlert),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { type, sponsor_id, description, severity, metadata } = req.body;
        const alert = await auditingService.createManualAlert(
          type,
          sponsor_id,
          description,
          severity,
          metadata ?? {},
        );
        ApiSuccess(res, alert);
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/alerts/:alertId/resolve',
    validateRequest(Schemas.resolveAlert),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { alertId } = req.params as { alertId: string };
        const resolutionRaw = (req.body as { resolution?: string }).resolution ?? '';
        // Basic sanitization for resolution notes
        const resolution = resolutionRaw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        await auditingService.resolveAlert(alertId, resolution);
        ApiSuccess(res, {
          message: 'Alert resolved successfully',
          alertId,
          resolvedAt: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Monitoring Lifecycle ─────────────────────────────────────────────────────

  router.post('/monitoring/start', (_req: Request, res: Response, next: NextFunction) => {
    try {
      auditingService.startAutomatedMonitoring();
      ApiSuccess(res, {
        message: 'Automated monitoring started successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/monitoring/stop',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        await auditingService.stopAutomatedMonitoring();
        const status = auditingService.getStatus();
        ApiSuccess(res, {
          message: 'Monitoring stopped successfully',
          finalStatus: status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/monitoring/trigger',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const alerts = await auditingService.triggerManualCheck();
        ApiSuccess(res, {
          message: 'Monitoring check completed',
          alertsGenerated: alerts.length,
          alerts,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/monitoring/status', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = auditingService.getStatus();
      ApiSuccess(res, status);
    } catch (error) {
      next(error);
    }
  });

  // ── Health ───────────────────────────────────────────────────────────────────

  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const healthStatus = await auditingService.getHealthStatus();
      if (healthStatus.status === 'unhealthy') {
        res.status(503).json(healthStatus);
        return;
      }
      // Degraded still returns 200 — service is partially functional.
      ApiSuccess(res, healthStatus);
    } catch (error) {
      next(error);
    }
  });

  // ── Analytics ────────────────────────────────────────────────────────────────

  router.get(
    '/analytics/completeness/:sponsor_id',
    validateRequest(Schemas.bySponsorId),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sponsor_id = Number(req.params.sponsor_id);
        const report = await analyticsService.calculateCompletenessScore(sponsor_id);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        ApiSuccess(res, report);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/analytics/relationships/:sponsor_id',
    validateRequest(Schemas.bySponsorId),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sponsor_id = Number(req.params.sponsor_id);
        const mapping = await analyticsService.buildRelationshipMap(sponsor_id);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        ApiSuccess(res, mapping);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/analytics/dashboard',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const dashboard = await analyticsService.generateDashboard();
        res.setHeader('Cache-Control', 'private, max-age=300');
        ApiSuccess(res, dashboard);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Export ───────────────────────────────────────────────────────────────────

  router.get(
    '/export/:sponsor_id',
    validateRequest(Schemas.exportDisclosures),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sponsor_id = Number(req.params.sponsor_id);
        const format = (req.query.format as 'json' | 'csv') ?? 'json';

        const data = await auditingService.exportSponsorDisclosures(sponsor_id, format);

        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          // Sanitize sponsor_id for filename to prevent HTTP Response Splitting
          const safeSponsorId = String(sponsor_id).replace(/[^0-9]/g, '');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="disclosures-${safeSponsorId}-${Date.now()}.csv"`,
          );
          res.setHeader('Cache-Control', 'private, no-cache');
          res.send(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'private, no-cache');
          res.json(JSON.parse(data));
        }
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Centralised Error Handler ────────────────────────────────────────────────

  router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      ApiErrorResponse(res, { code: 'VALIDATION_ERROR', message: 'Validation failed' }, 400);
      return;
    }

    if (err.category === ErrorCategory.NOT_FOUND) {
      ApiErrorResponse(res, { code: 'NOT_FOUND', message: err.message }, 404);
      return;
    }

    if (err.category === ErrorCategory.VALIDATION) {
      ApiErrorResponse(res, { code: 'VALIDATION_ERROR', message: err.message }, 400);
      return;
    }

    if (err.category) {
      ApiErrorResponse(
        res,
        { code: err.code ?? 'INTERNAL_ERROR', message: err.message },
        err.statusCode ?? 500,
      );
      return;
    }

    logger.error(
      {
        component: 'financial-disclosure',
        path: req.path,
        method: req.method,
        query: req.query,
        params: req.params,
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      },
      `[Unhandled API Error]: ${err instanceof Error ? err.message : String(err)}`,
    );

    try {
      if ((errorTracker as any)?.capture) {
        (errorTracker as any).capture(
          err instanceof Error ? err : new Error(String(err)),
          { component: 'financial-disclosure', path: req.path, method: req.method },
        );
      }
    } catch (reportErr) {
      logger.warn(
        { error: reportErr },
        'Failed to report unhandled financial-disclosure error to errorTracker',
      );
    }

    ApiErrorResponse(
      res,
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred. Please try again later.',
      },
      500,
    );
  });

  return router;
}

export type { ComplianceAuditingService, FinancialDisclosureAnalyticsService };