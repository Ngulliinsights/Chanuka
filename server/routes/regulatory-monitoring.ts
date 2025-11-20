import { Router, Request, Response, NextFunction } from 'express';
import { regulatoryChangeMonitoringService } from '@client/features/analytics/regulatory-change-monitoring.js';
import { z } from 'zod'; // For runtime validation
import { errorTracker } from '@client/core/errors/error-tracker.js';
import { ApiResponseWrapper   } from '@shared/core/src/index.js';
import { logger   } from '@shared/core/src/index.js';

const router = Router();

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

// Schema for regulation ID parameter validation
const regulationIdSchema = z.string().uuid('Invalid regulation ID format');

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
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    // Replace the request data with the validated version
    // This ensures type safety throughout the rest of the request handling
    req[source] = result.data;
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
router.post('/monitoring/start', asyncHandler(async (req: Request, res: Response) => {
  // Start the monitoring service
  // Note: The service handles preventing duplicate monitoring instances internally
  regulatoryChangeMonitoringService.startAutomatedMonitoring();
  
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
router.post('/monitoring/stop', asyncHandler(async (req: Request, res: Response) => {
  regulatoryChangeMonitoringService.stopAutomatedMonitoring();
  
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
  validateRequest(regulationIdSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { regulationId } = req.params;
    
    // Call the service to perform stakeholder impact analysis
    const impacts = await regulatoryChangeMonitoringService.analyzeStakeholderImpact(
      regulationId
    );
    
    // Handle the case where no analysis is available
    // This could happen if the regulation doesn't exist or hasn't been analyzed yet
    if (!impacts || impacts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No impact analysis found for this regulation',
        data: { regulationId }
      });
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
  // Parse the comma-separated list of IDs from the query string
  const regulationIds = (req.query.regulationIds as string)?.split(',').filter(Boolean);
  
  if (!regulationIds || regulationIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one regulation ID is required',
      hint: 'Provide comma-separated UUIDs via ?regulationIds=id1,id2,id3'
    });
  }
  
  // Limit batch size to prevent overwhelming the system
  // 50 is a reasonable limit that balances efficiency with resource usage
  if (regulationIds.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Too many regulations requested',
      limit: 50,
      requested: regulationIds.length
    });
  }
  
  // Process all impacts in parallel for better performance
  // Promise.all runs all the analyses simultaneously rather than one after another
  const impactPromises = regulationIds.map(async (id) => {
    try {
      const impacts = await regulatoryChangeMonitoringService.analyzeStakeholderImpact(id);
      return { regulationId: id, impacts, error: null };
    } catch (error) {
      // If one regulation fails, we still want to return results for the others
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
  validateRequest(regulationIdSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { regulationId } = req.params;
    
    // Use the bulk method even for single IDs because it's optimized for performance
    const bulkOpportunities = await regulatoryChangeMonitoringService.getBulkStrategicOpportunities(
      [regulationId]
    );
    
    const opportunities = bulkOpportunities[regulationId] || [];
    
    // If no opportunities are found, it might mean the regulation hasn't been analyzed
    // or genuinely presents no strategic opportunities
    if (opportunities.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No strategic opportunities found for this regulation',
        data: { regulationId }
      });
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

/**
 * GET /opportunities/batch
 * Retrieves strategic opportunities for multiple regulations efficiently
 * 
 * The service method is already designed for bulk operations, making this the most
 * efficient way to get opportunities for multiple regulations at once.
 * 
 * @query regulationIds - Comma-separated list of regulation UUIDs (max 50)
 * @returns Batch opportunities analysis organized by regulation
 */
router.get('/opportunities/batch', asyncHandler(async (req: Request, res: Response) => {
  const regulationIds = (req.query.regulationIds as string)?.split(',').filter(Boolean);
  
  if (!regulationIds || regulationIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one regulation ID is required',
      hint: 'Provide comma-separated UUIDs via ?regulationIds=id1,id2,id3'
    });
  }
  
  if (regulationIds.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Batch size limit exceeded',
      limit: 50,
      requested: regulationIds.length
    });
  }
  
  // This method is specifically designed for bulk operations and handles caching internally
  const bulkOpportunities = await regulatoryChangeMonitoringService.getBulkStrategicOpportunities(
    regulationIds
  );
  
  // Calculate total opportunities across all regulations for the summary
  const totalOpportunities = Object.values(bulkOpportunities).reduce(
    (sum, opportunities) => sum + opportunities.length,
    0
  );
  
  res.json({
    success: true,
    data: {
      total: totalOpportunities,
      regulationCount: regulationIds.length,
      opportunities: bulkOpportunities,
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
    const alert = await regulatoryChangeMonitoringService.createRegulatoryAlert(
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
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Track error with comprehensive context using errorTracker
  errorTracker.trackRequestError(
    err,
    req,
    'medium',
    'business_logic'
  );

  // Send consistent error response using ApiResponseWrapper
  ApiResponseWrapper.error(
    res,
    err,
    500,
    {
      source: 'database',
      requestId: (req as any).traceId,
      executionTime: Date.now() - (req as any).startTime
    }
  );
});

export default router;












































