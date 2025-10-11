import { Router } from 'express';
import { GovernmentDataIntegrationService } from '../../services/government-data-integration';
import { DataValidationService } from '../../services/data-validation';
import { DataTransformationService } from '../../services/data-transformation';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();
const integrationService = new GovernmentDataIntegrationService();

/**
 * GET /api/government-data/status
 * Get integration status and health metrics
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = await integrationService.getIntegrationStatus();
    
    res.json({
      success: true,
      data: status,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error getting integration status:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTEGRATION_STATUS_ERROR',
        message: 'Failed to retrieve integration status',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/sync/bills
 * Trigger bill synchronization from government sources
 */
router.post('/sync/bills', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { sources, since, dryRun = false } = req.body;
    
    const options = {
      sources: sources || undefined,
      since: since ? new Date(since) : undefined,
      dryRun: Boolean(dryRun)
    };

    const result = await integrationService.integrateBills(options);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        dryRun: options.dryRun
      }
    });
  } catch (error) {
    logger.error('Error syncing bills:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BILL_SYNC_ERROR',
        message: 'Failed to synchronize bills',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/sync/sponsors
 * Trigger sponsor synchronization from government sources
 */
router.post('/sync/sponsors', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { sources, since, dryRun = false } = req.body;
    
    const options = {
      sources: sources || undefined,
      since: since ? new Date(since) : undefined,
      dryRun: Boolean(dryRun)
    };

    const result = await integrationService.integrateSponsors(options);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        dryRun: options.dryRun
      }
    });
  } catch (error) {
    logger.error('Error syncing sponsors:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPONSOR_SYNC_ERROR',
        message: 'Failed to synchronize sponsors',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/government-data/sources/:sourceName/bills
 * Fetch bills from a specific government data source
 */
router.get('/sources/:sourceName/bills', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { sourceName } = req.params;
    const { limit = 50, offset = 0, since, status } = req.query;
    
    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      since: since ? new Date(since as string) : undefined,
      status: status ? (status as string).split(',') : undefined
    };

    const bills = await integrationService.fetchBillsFromSource(sourceName, options);
    
    res.json({
      success: true,
      data: {
        bills,
        count: bills.length,
        source: sourceName
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error(`Error fetching bills from ${req.params.sourceName}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOURCE_FETCH_ERROR',
        message: `Failed to fetch bills from ${req.params.sourceName}`,
        details: error.message
      }
    });
  }
});

/**
 * GET /api/government-data/sources/:sourceName/sponsors
 * Fetch sponsors from a specific government data source
 */
router.get('/sources/:sourceName/sponsors', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { sourceName } = req.params;
    const { limit = 50, offset = 0, since } = req.query;
    
    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      since: since ? new Date(since as string) : undefined
    };

    const sponsors = await integrationService.fetchSponsorsFromSource(sourceName, options);
    
    res.json({
      success: true,
      data: {
        sponsors,
        count: sponsors.length,
        source: sourceName
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error(`Error fetching sponsors from ${req.params.sourceName}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOURCE_FETCH_ERROR',
        message: `Failed to fetch sponsors from ${req.params.sourceName}`,
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/validate
 * Validate government data before integration
 */
router.post('/validate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data, type } = req.body;
    
    if (!data || !type || !['bills', 'sponsors'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Data and type (bills or sponsors) are required'
        }
      });
    }

    const validationResult = DataValidationService.validateBatch(data, type);
    
    res.json({
      success: true,
      data: validationResult,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error validating data:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate data',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/cross-validate
 * Cross-validate data between sources for conflict detection
 */
router.post('/cross-validate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { records, type } = req.body;
    
    if (!records || !type || !['bills', 'sponsors'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Records and type (bills or sponsors) are required'
        }
      });
    }

    const crossValidationResult = DataValidationService.crossValidate(records, type);
    
    res.json({
      success: true,
      data: crossValidationResult,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error cross-validating data:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CROSS_VALIDATION_ERROR',
        message: 'Failed to cross-validate data',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/transform
 * Transform raw government data to normalized format
 */
router.post('/transform', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data, sourceType } = req.body;
    
    if (!data || !sourceType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Data and sourceType are required'
        }
      });
    }

    let transformedData;
    
    switch (sourceType) {
      case 'parliament-ca':
        transformedData = DataTransformationService.transformParliamentData(data);
        break;
      case 'ontario-legislature':
        transformedData = DataTransformationService.transformOntarioLegislatureData(data);
        break;
      case 'openparliament':
        transformedData = DataTransformationService.transformOpenParliamentData(data);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_SOURCE',
            message: `Unsupported source type: ${sourceType}`
          }
        });
    }

    // Validate transformed data
    const billValidation = transformedData.bills 
      ? DataValidationService.validateTransformedData(transformedData, 'bills')
      : null;
    
    const sponsorValidation = transformedData.sponsors
      ? DataValidationService.validateTransformedData(transformedData, 'sponsors')
      : null;
    
    res.json({
      success: true,
      data: {
        transformed: transformedData,
        validation: {
          bills: billValidation,
          sponsors: sponsorValidation
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        sourceType
      }
    });
  } catch (error) {
    logger.error('Error transforming data:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFORMATION_ERROR',
        message: 'Failed to transform data',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/government-data/sources
 * Get list of configured data sources
 */
router.get('/sources', authenticateToken, async (req, res) => {
  try {
    // This would normally come from the service, but for now return static config
    const sources = [
      {
        name: 'parliament-ca',
        displayName: 'Parliament of Canada',
        description: 'Official Canadian Parliament data',
        status: 'active',
        priority: 10,
        rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
        lastSync: new Date().toISOString(),
        dataTypes: ['bills', 'sponsors']
      },
      {
        name: 'ontario-legislature',
        displayName: 'Ontario Legislature',
        description: 'Ontario Provincial Legislature data',
        status: 'active',
        priority: 8,
        rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
        lastSync: new Date().toISOString(),
        dataTypes: ['bills', 'sponsors']
      },
      {
        name: 'openparliament',
        displayName: 'OpenParliament.ca',
        description: 'Open data from OpenParliament.ca',
        status: 'active',
        priority: 7,
        rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
        lastSync: new Date().toISOString(),
        dataTypes: ['bills', 'sponsors']
      }
    ];
    
    res.json({
      success: true,
      data: {
        sources,
        count: sources.length
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error getting sources:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SOURCES_ERROR',
        message: 'Failed to retrieve data sources',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/government-data/schedule-sync
 * Schedule automatic synchronization
 */
router.post('/schedule-sync', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, schedule, sources, enabled = true } = req.body;
    
    if (!type || !schedule || !['bills', 'sponsors'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Type (bills or sponsors) and schedule are required'
        }
      });
    }

    // In a real implementation, this would configure a job scheduler
    // For now, just return success with the configuration
    const syncConfig = {
      id: `sync-${type}-${Date.now()}`,
      type,
      schedule,
      sources: sources || ['parliament-ca', 'ontario-legislature', 'openparliament'],
      enabled,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.id
    };
    
    res.json({
      success: true,
      data: {
        message: 'Synchronization scheduled successfully',
        config: syncConfig
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error scheduling sync:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_ERROR',
        message: 'Failed to schedule synchronization',
        details: error.message
      }
    });
  }
});

export default router;








