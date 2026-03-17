import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { regulatoryChangeMonitoringService as regulatoryChangeTrackerService } from './regulatory-change-tracker.service';
import { logger } from '@server/infrastructure/observability';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod'; // For runtime validation

const router: Router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Schema for creating custom alerts
const createAlertSchema = z.object({
  type: z.enum(['regulatory_change', 'impact_assessment', 'opportunity_identified', 'compliance_update']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  metadata: z.record(z.unknown()).optional()
});


// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Async error handler wrapper to avoid try-catch blocks in every route
 * This catches any promise rejections and forwards them to Express error handlers
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validator middleware factory
 * This validates incoming data against Zod schemas before it reaches route handlers
 * Think of it as a bouncer that checks if data has the right "ID" before letting it in
 */
const validateRequest = (schema: z.ZodSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }
    
    // Replace the request data with the validated version
    // This ensures type safety throughout the rest of the request handling
    (req as any)[source] = result.data;
    next();
  };
};

// ============================================================================
// MONITORING CONTROL ROUTES
// ============================================================================

/**
 * POST /monitoring/start
 * Initiates automated regulatory change monitoring across all tracked regulations
 * 
 * This endpoint starts a background process that periodically checks for regulatory changes.
 * It's idempotent, meaning calling it multiple times won't create multiple monitoring instances.
 * 
 * @returns Success confirmation with timestamp
 */
router.post('/monitoring/start', asyncHandler(async (_req: Request, res: Response) => {
  regulatoryChangeTrackerService.startAutomatedMonitoring();
  
  res.json({
    success: true,
    message: 'Regulatory change monitoring started successfully',
    data: {
      startedAt: new Date().toISOString()
    }
  });
}));

/**
 * POST /monitoring/stop
 * Stops the automated regulatory monitoring process gracefully
 * 
 * This allows any in-progress checks to complete before stopping.
 * It's safe to call even if monitoring isn't currently running.
 * 
 * @returns Success confirmation with timestamp
 */
router.post('/monitoring/stop', asyncHandler(async (_req: Request, res: Response) => {
  regulatoryChangeTrackerService.stopAutomatedMonitoring();
  
  res.json({
    success: true,
    message: 'Regulatory change monitoring stopped successfully',
    data: {
      stoppedAt: new Date().toISOString()
    }
  });
}));

// ============================================================================
// IMPACT ANALYSIS ROUTES
// ============================================================================

/**
 * GET /impact/:regulationId
 * Analyzes and returns stakeholder impacts for a specific regulation
 * 
 * This performs a comprehensive analysis of how the regulation affects different
 * stakeholder groups (businesses, consumers, government entities, etc.).
 * Results are cached to improve performance on subsequent requests.
 * 
 * @param regulationId - UUID of the regulation to analyze
 * @returns Detailed stakeholder impact analysis with severity and affected groups
 */
router.get(
  '/impact/:regulationId',
  asyncHandler(async (req: Request, res: Response) => {
    const regulationId = req.params.regulationId;
    if (!regulationId) {
      res.status(400).json({ success: false, error: 'Regulation ID is required' });
      return;
    }
    
    const impacts = await regulatoryChangeTrackerService.analyzeStakeholderImpact(
      regulationId
    );
    
    if (!impacts || impacts.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No impact analysis found for this regulation',
        data: { regulationId }
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        regulationId,
        impactCount: impacts.length,
        impacts,
        analyzed_at: new Date().toISOString()
      }
    });
  })
);

/**
 * GET /impact/batch
 * Analyzes stakeholder impacts for multiple regulations in one request
 * 
 * This is more efficient than making multiple individual requests because it can
 * batch database queries and reuse cached results across regulations.
 * 
 * @query regulationIds - Comma-separated list of regulation UUIDs (max 50)
 * @returns Batch impact analysis results with per-regulation breakdown
 */
router.get('/impact/batch', asyncHandler(async (req: Request, res: Response) => {
  const regulationIds = (req.query.regulationIds as string)?.split(',').filter(Boolean);
  
  if (!regulationIds || regulationIds.length === 0) {
    res.status(400).json({
      success: false,
      error: 'At least one regulation ID is required',
      hint: 'Provide comma-separated UUIDs via ?regulationIds=id1,id2,id3'
    });
    return;
  }
  
  if (regulationIds.length > 50) {
    res.status(400).json({
      success: false,
      error: 'Too many regulations requested',
      limit: 50,
      requested: regulationIds.length
    });
    return;
  }
  
  const impactPromises = regulationIds.map(async (id) => {
    try {
      const impacts = await regulatoryChangeTrackerService.analyzeStakeholderImpact(id);
      return { regulationId: id, impacts, error: null };
    } catch (_error) {
      return { regulationId: id, impacts: [], error: 'Analysis failed' };
    }
  });
  
  const results = await Promise.all(impactPromises);
  
  res.json({
    success: true,
    data: {
      total: results.length,
      results,
      analyzed_at: new Date().toISOString()
    }
  });
}));

// ============================================================================
// STRATEGIC OPPORTUNITIES ROUTES
// ============================================================================

/**
 * GET /opportunities/:regulationId
 * Identifies strategic opportunities arising from a specific regulation
 * 
 * This analyzes the regulation to find potential business advantages, compliance
 * strategies, or market positioning opportunities. The service returns opportunities
 * sorted by relevance and potential impact.
 * 
 * @param regulationId - UUID of the regulation to analyze
 * @returns Strategic opportunities with descriptions and timeframes
 */
router.get(
  '/opportunities/:regulationId',
  asyncHandler(async (req: Request, res: Response) => {
    const regulationId = req.params.regulationId;
    if (!regulationId) {
      res.status(400).json({ success: false, error: 'Regulation ID is required' });
      return;
    }
    
    const opportunities = await regulatoryChangeTrackerService.identifyStrategicOpportunities(
      regulationId
    );
    
    if (opportunities.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No strategic opportunities found for this regulation',
        data: { regulationId }
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        regulationId,
        opportunityCount: opportunities.length,
        opportunities,
        analyzed_at: new Date().toISOString()
      }
    });
  })
);

router.get('/opportunities/batch', asyncHandler(async (req: Request, res: Response) => {
  const regulationIds = (req.query.regulationIds as string)?.split(',').filter(Boolean);
  
  if (!regulationIds || regulationIds.length === 0) {
    res.status(400).json({
      success: false,
      error: 'At least one regulation ID is required',
      hint: 'Provide comma-separated UUIDs via ?regulationIds=id1,id2,id3'
    });
    return;
  }
  
  if (regulationIds.length > 50) {
    res.status(400).json({
      success: false,
      error: 'Batch size limit exceeded',
      limit: 50,
      requested: regulationIds.length
    });
    return;
  }
  
  const results: Record<string, Awaited<ReturnType<typeof regulatoryChangeTrackerService.identifyStrategicOpportunities>>> = {};
  await Promise.all(
    regulationIds.map(async (id) => {
      results[id] = await regulatoryChangeTrackerService.identifyStrategicOpportunities(id);
    })
  );
  
  const totalOpportunities = Object.values(results).reduce(
    (sum, opps) => sum + opps.length,
    0
  );
  
  res.json({
    success: true,
    data: {
      total: totalOpportunities,
      regulationCount: regulationIds.length,
      opportunities: results,
      analyzed_at: new Date().toISOString()
    }
  });
}));

// ============================================================================
// ALERT MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /alerts
 * Creates a custom regulatory alert for tracking specific changes or events
 * 
 * Alerts are useful for manual tracking of regulatory developments that the
 * automated system might not catch, or for flagging specific concerns that
 * require human attention.
 * 
 * @body type - Alert category (determines routing and handling)
 * @body title - Brief, descriptive alert title
 * @body description - Detailed explanation of the alert
 * @body severity - Priority level affecting notification and display
 * @body metadata - Additional contextual information as key-value pairs
 * @returns Created alert with generated ID and timestamp
 */
router.post(
  '/alerts',
  validateRequest(createAlertSchema, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, title, description, severity, metadata } = req.body;
    
    // The service handles persisting the alert and potentially triggering notifications
    const alert = await regulatoryChangeTrackerService.createRegulatoryAlert(
      type,
      title,
      description,
      severity,
      { metadata: metadata || {} }
    );
    
    // 201 status code indicates successful resource creation
    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler for this router
 *
 * This catches any errors that weren't handled by individual route handlers.
 * It provides consistent error responses and logs details for debugging.
 * In production, we hide internal error details from clients for security.
 */
router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Track error with comprehensive context using errorTracker
  errorTracker.trackRequestError(
    err,
    req,
    'medium',
    'business_logic'
  );

  // Send consistent error response
  const statusCode = 500;
  const requestId = (req as unknown as Record<string, unknown>).traceId as string | undefined;
  const startTime = (req as unknown as Record<string, unknown>).startTime as number | undefined;
  
  logger.error({ err, requestId, statusCode }, 'Regulatory monitoring route error');

  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    requestId,
    executionTime: startTime ? Date.now() - startTime : undefined
  });
});

export default router;













































