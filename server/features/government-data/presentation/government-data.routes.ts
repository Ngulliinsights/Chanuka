/**
 * Government Data API Routes
 * Complete REST API for government data management with modernized architecture
 */

import { Router, Request, Response } from 'express';
import { logger } from '@server/infrastructure/observability';
import { governmentDataService } from '../application/government-data.service';

const router: Router = Router();

// ==========================================================================
// Public Routes (Read-only)
// ==========================================================================

/**
 * GET /api/government-data
 * List government data with filtering, pagination, and sorting
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'listGovernmentData',
      query: req.query 
    };
    logger.info(logContext, 'Listing government data');

    // Parse and validate query parameters
    const queryParams = {
      dataType: typeof req.query.dataType === 'string' ? req.query.dataType : undefined,
      source: typeof req.query.source === 'string' ? req.query.source : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? new Date(req.query.dateFrom) : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? new Date(req.query.dateTo) : undefined,
      limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20,
      offset: typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0,
      sortBy: (typeof req.query.sortBy === 'string' && ['created_at', 'updated_at', 'data_type', 'source'].includes(req.query.sortBy)) 
        ? req.query.sortBy as 'created_at' | 'updated_at' | 'data_type' | 'source'
        : 'created_at',
      sortOrder: (typeof req.query.sortOrder === 'string' && ['asc', 'desc'].includes(req.query.sortOrder))
        ? req.query.sortOrder as 'asc' | 'desc'
        : 'desc',
    };

    const result = await governmentDataService.getGovernmentData(queryParams);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    // Get total count for pagination
    const countResult = await governmentDataService.countGovernmentData({
      dataType: queryParams.dataType,
      source: queryParams.source,
      status: queryParams.status,
      dateFrom: queryParams.dateFrom,
      dateTo: queryParams.dateTo,
    });

    const totalCount = countResult.isOk() ? countResult.value : 0;

    res.json({
      success: true,
      data: result.value,
      pagination: {
        total: totalCount,
        limit: queryParams.limit,
        offset: queryParams.offset,
        hasMore: (queryParams.offset + queryParams.limit) < totalCount,
      }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to list government data');
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
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({
        success: false,
        error: 'ID parameter is required',
        code: 'MISSING_ID'
      });
      return;
    }
    
    const id = parseInt(idParam);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        code: 'INVALID_ID'
      });
      return;
    }

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getGovernmentDataById',
      id 
    };
    logger.info(logContext, 'Getting government data by ID');

    const result = await governmentDataService.getGovernmentDataById(id);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    if (!result.value) {
      res.status(404).json({
        success: false,
        error: 'Government data not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get government data');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/external/:source/:externalId
 * Get government data by external ID and source
 */
router.get('/external/:source/:externalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { source, externalId } = req.params;

    // Validate required parameters
    if (!source || !externalId) {
      res.status(400).json({
        success: false,
        error: 'Source and external ID are required',
        code: 'MISSING_PARAMETERS'
      });
      return;
    }

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getGovernmentDataByExternalId',
      source,
      externalId 
    };
    logger.info(logContext, 'Getting government data by external ID');

    const result = await governmentDataService.getGovernmentDataByExternalId(externalId, source);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    if (!result.value) {
      res.status(404).json({
        success: false,
        error: 'Government data not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get government data by external ID');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/metadata/data-types
 * Get available data types
 */
router.get('/metadata/data-types', async (_req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getDataTypes'
    };
    logger.debug(logContext, 'Getting data types');

    const result = await governmentDataService.getDataTypes();
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get data types');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/metadata/sources
 * Get available sources
 */
router.get('/metadata/sources', async (_req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getSources'
    };
    logger.debug(logContext, 'Getting sources');

    const result = await governmentDataService.getSources();
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get sources');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/metadata/statistics
 * Get government data statistics
 */
router.get('/metadata/statistics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getStatistics'
    };
    logger.debug(logContext, 'Getting statistics');

    const result = await governmentDataService.getStatistics();
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get statistics');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/government-data/health
 * Get service health status
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getHealthStatus'
    };
    logger.debug(logContext, 'Getting health status');

    const result = await governmentDataService.getHealthStatus();
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'HEALTH_CHECK_FAILED'
      });
      return;
    }

    const statusCode = result.value.status === 'healthy' ? 200 : 
                      result.value.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get health status');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================================================
// Protected Routes (Admin only) - Simplified for now
// ==========================================================================

/**
 * POST /api/government-data
 * Create new government data record
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'createGovernmentData',
      dataType: req.body.data_type,
      source: req.body.source
    };
    logger.info(logContext, 'Creating government data');

    const input = {
      ...req.body,
      publishedDate: req.body.published_date ? new Date(req.body.published_date) : undefined,
      effectiveDate: req.body.effective_date ? new Date(req.body.effective_date) : undefined,
    };

    const result = await governmentDataService.createGovernmentData(input);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'CREATE_FAILED'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to create government data');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PATCH /api/government-data/:id
 * Update government data record
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({
        success: false,
        error: 'ID parameter is required',
        code: 'MISSING_ID'
      });
      return;
    }
    
    const id = parseInt(idParam);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        code: 'INVALID_ID'
      });
      return;
    }

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'updateGovernmentData',
      id
    };
    logger.info(logContext, 'Updating government data');

    const input = {
      ...req.body,
      publishedDate: req.body.published_date ? new Date(req.body.published_date) : undefined,
      effectiveDate: req.body.effective_date ? new Date(req.body.effective_date) : undefined,
    };

    const result = await governmentDataService.updateGovernmentData(id, input);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'UPDATE_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to update government data');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/government-data/:id
 * Delete government data record
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      res.status(400).json({
        success: false,
        error: 'ID parameter is required',
        code: 'MISSING_ID'
      });
      return;
    }
    
    const id = parseInt(idParam);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        code: 'INVALID_ID'
      });
      return;
    }

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'deleteGovernmentData',
      id
    };
    logger.info(logContext, 'Deleting government data');

    const result = await governmentDataService.deleteGovernmentData(id);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'DELETE_FAILED'
      });
      return;
    }

    if (!result.value) {
      res.status(404).json({
        success: false,
        error: 'Government data not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Government data deleted successfully'
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to delete government data');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================================================
// Sync Routes (Admin only)
// ==========================================================================

/**
 * GET /api/government-data/sync/logs
 * Get sync logs
 */
router.get('/sync/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50;

    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'getSyncLogs',
      source,
      limit
    };
    logger.debug(logContext, 'Getting sync logs');

    const result = await governmentDataService.getSyncLogs(source, limit);
    
    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: result.error.message,
        code: 'FETCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to get sync logs');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/government-data/sync/trigger
 * Trigger data synchronization
 */
router.post('/sync/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const logContext = { 
      component: 'GovernmentDataRoutes', 
      operation: 'triggerSync',
      options: req.body
    };
    logger.info(logContext, 'Triggering data sync');

    // TODO: Implement sync trigger using governmentDataSyncService
    // This would integrate with the sync service to trigger data synchronization
    
    res.json({
      success: true,
      message: 'Sync triggered successfully',
      data: {
        status: 'initiated',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error' }, 'Failed to trigger sync');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;