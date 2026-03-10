/**
 * Government Data API Routes
 * Complete REST API for government data management with modernized architecture
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@server/infrastructure/observability';
import { governmentDataService } from '../../application/services/government-data.service';

const router = Router();

// ==========================================================================
// Validation Schemas
// ==========================================================================

const querySchema = z.object({
  dataType: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['created_at', 'updated_at', 'data_type', 'source']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  dataType: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  externalId: z.string().max(255).optional(),
  title: z.string().max(500).optional(),
  content: z.any(),
  metadata: z.any().optional(),
  status: z.string().max(50).optional(),
  publishedDate: z.string().datetime().optional(),
  effectiveDate: z.string().datetime().optional(),
});

const updateSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.any().optional(),
  metadata: z.any().optional(),
  status: z.string().max(50).optional(),
  publishedDate: z.string().datetime().optional(),
  effectiveDate: z.string().datetime().optional(),
});

// ==========================================================================
// Middleware
// ==========================================================================

const validateRequest = (schema: { query?: z.ZodSchema; body?: z.ZodSchema }) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// ==========================================================================
// Public Routes (Read-only)
// ==========================================================================

/**
 * GET /api/government-data
 * List government data with filtering, pagination, and sorting
 */
router.get('/', validateRequest({ query: querySchema }), async (req: Request, res: Response) => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'listGovernmentData',
      query: req.query 
    };
    logger.info(logContext, 'Listing government data');

    const options = {
      ...req.query,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };

    const result = await governmentDataService.getGovernmentData(options);
    
    if (!result.isOk) {
      return res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
    }

    // Get total count for pagination
    const countResult = await governmentDataService.countGovernmentData({
      dataType: options.dataType,
      source: options.source,
      status: options.status,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
    });

    const totalCount = countResult.isOk ? countResult.value : 0;

    res.json({
      success: true,
      data: result.value,
      pagination: {
        total: totalCount,
        limit: options.limit,
        offset: options.offset,
        hasMore: (options.offset + options.limit) < totalCount,
      }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to list government data');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/:id
 * Get government data by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        code: 'INVALID_ID'
      });
    }

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getGovernmentDataById',
      id 
    };
    logger.info(logContext, 'Getting government data by ID');

    const result = await governmentDataService.getGovernmentDataById(id);
    
    if (!result.isOk) {
      return res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
    }

    if (!result.value) {
      return res.status(404).json({
        success: false,
        error: 'Government data not found',
        code: 'NOT_F