import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/auth';
import {
  unifiedAlertPreferenceService,
  alertPreferenceSchema,
  AlertType,
  ChannelType,
  Priority,
  DeliveryStatus
} from '../../domain/services/unified-alert-preference-service';
import { z } from 'zod';
import { ApiSuccess,
  ApiError,
  ApiValidationError,
  ApiResponseWrapper
 } from '@shared/core/utils/api-utils.js';
import { logger   } from '@shared/core/index.js';

export const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updatePreferenceSchema = alertPreferenceSchema.partial();

const deliveryLogsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  alertType: z.enum([
    'bill_status_change',
    'new_comment',
    'amendment',
    'voting_scheduled',
    'sponsor_update',
    'engagement_milestone'
  ]).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'filtered']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

const processAlertSchema = z.object({
  alertType: z.enum([
    'bill_status_change',
    'new_comment',
    'amendment',
    'voting_scheduled',
    'sponsor_update',
    'engagement_milestone'
  ]),
  alertData: z.any(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

const verifyChannelSchema = z.object({
  channelType: z.enum(['in_app', 'email', 'push', 'sms', 'webhook']),
  verificationCode: z.string().min(4).max(10)
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Centralized error handler to reduce code duplication and provide
 * consistent error responses across all endpoints. This function handles
 * both validation errors (from Zod) and general errors gracefully.
 */
const handleError = (
  res: any, 
  error: unknown, 
  defaultMessage: string, 
  startTime: number
) => {
  // Handle Zod validation errors with proper formatting
  if (error instanceof z.ZodError) {
    // Transform Zod errors into the expected format for ApiValidationError
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.') || 'unknown',
      message: err.message
    }));
    
    return ApiValidationError(
      res, 
      formattedErrors, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
  
  // Extract error message from Error objects
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  // Log the error for debugging and monitoring
  logger.error(defaultMessage, { component: 'AlertPreferenceRoutes' }, error);
  
  // Return standardized error response with proper structure
  return ApiError(
    res, 
    {
      code: 'INTERNAL_ERROR',
      message: errorMessage
    },
    500, 
    ApiResponseWrapper.createMetadata(startTime, 'database')
  );
};

// ============================================================================
// PREFERENCE MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/alert-preferences
 * Create a new alert preference with full validation
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceData = alertPreferenceSchema.parse(req.body);
    
    const preference = await unifiedAlertPreferenceService.createAlertPreference(
      user_id, 
      preferenceData
    );
    
    return ApiSuccess(
      res, 
      preference, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
   } catch (error) {
    return handleError(res, error, 'Failed to create alert preference', startTime);
  }
});

/**
 * GET /api/alert-preferences
 * Get all alert preferences for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferences = await unifiedAlertPreferenceService.getUserAlertPreferences(user_id);
    
    return ApiSuccess(
      res, 
      { 
        preferences,
        count: preferences.length 
       }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preferences', startTime);
  }
});

/**
 * GET /api/alert-preferences/:preferenceId
 * Get a specific alert preference by ID
 */
router.get('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    const preference = await unifiedAlertPreferenceService.getAlertPreference(
      user_id, 
      preferenceId
    );
    
    if (!preference) {
      return ApiError(
        res, 
        {
          code: 'NOT_FOUND',
          message: 'Alert preference not found'
         },
        404, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    return ApiSuccess(
      res, 
      preference, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preference', startTime);
  }
});

/**
 * PATCH /api/alert-preferences/:preferenceId
 * Update an existing alert preference with partial data
 */
router.patch('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId;
    const updates = updatePreferenceSchema.parse(req.body);
    
    const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
      user_id, 
      preferenceId, 
      updates
    );
    
    return ApiSuccess(
      res, 
      updatedPreference, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
   } catch (error) {
    return handleError(res, error, 'Failed to update alert preference', startTime);
  }
});

/**
 * DELETE /api/alert-preferences/:preferenceId
 * Delete an alert preference permanently
 */
router.delete('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    await unifiedAlertPreferenceService.deleteAlertPreference(user_id, preferenceId);
    
    return ApiSuccess(
      res, 
      { 
        success: true, 
        message: 'Alert preference deleted successfully' 
       }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to delete alert preference', startTime);
  }
});

// ============================================================================
// CHANNEL MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/alert-preferences/:preferenceId/verify-channel
 * Verify a notification channel using a verification code
 */
router.post(
  '/:preferenceId/verify-channel', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
    
    try {
      const user_id = req.user!.id;
      const preferenceId = req.params.preferenceId;
      const { channelType, verificationCode  } = verifyChannelSchema.parse(req.body);
      
      const verified = await unifiedAlertPreferenceService.verifyChannel(
        user_id,
        preferenceId,
        channelType,
        verificationCode
      );
      
      if (!verified) {
        return ApiError(
          res,
          {
            code: 'VERIFICATION_FAILED',
            message: 'Channel verification failed. Invalid or expired code.'
          },
          400,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      return ApiSuccess(
        res,
        {
          success: true,
          message: `${channelType} channel verified successfully`
        },
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      return handleError(res, error, 'Failed to verify channel', startTime);
    }
  }
);

// ============================================================================
// ALERT PROCESSING ROUTES
// ============================================================================

/**
 * POST /api/alert-preferences/process-alert
 * Process and deliver an alert based on user preferences.
 * This is typically called by internal services, not directly by users.
 */
router.post('/process-alert', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const { alertType, alertData, priority  } = processAlertSchema.parse(req.body);
    
    const deliveryLogs = await unifiedAlertPreferenceService.processAlertDelivery(
      user_id,
      alertType,
      alertData,
      priority
    );
    
    return ApiSuccess(
      res, 
      { 
        deliveryLogs,
        count: deliveryLogs.length,
        message: 'Alert processing completed'
      }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to process alert', startTime);
  }
});

/**
 * POST /api/alert-preferences/:preferenceId/process-batch
 * Manually trigger processing of batched alerts for a specific preference
 */
router.post(
  '/:preferenceId/process-batch',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
    
    try {
      const user_id = req.user!.id;
      const preferenceId = req.params.preferenceId;
      
      const processedCount = await unifiedAlertPreferenceService.processBatchedAlerts(
        user_id,
        preferenceId
      );
      
      return ApiSuccess(
        res,
        {
          success: true,
          processedCount,
          message: `Processed ${processedCount } batched alerts`
        },
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      return handleError(res, error, 'Failed to process batched alerts', startTime);
    }
  }
);

// ============================================================================
// DELIVERY LOGS AND ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/alert-preferences/logs/delivery
 * Get delivery logs with pagination and filtering capabilities
 */
router.get('/logs/delivery', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const query = deliveryLogsQuerySchema.parse(req.query);
    
    const result = await unifiedAlertPreferenceService.getAlertDeliveryLogs(user_id, {
      page: query.page,
      limit: query.limit,
      alertType: query.alertType,
      status: query.status,
      start_date: query.start_date ? new Date(query.start_date) : undefined,
      end_date: query.end_date ? new Date(query.end_date) : undefined
     });
    
    return ApiSuccess(
      res, 
      result, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch delivery logs', startTime);
  }
});

/**
 * GET /api/alert-preferences/analytics/stats
 * Get comprehensive statistics about alert preferences and delivery metrics
 */
router.get('/analytics/stats', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const stats = await unifiedAlertPreferenceService.getAlertPreferenceStats(user_id);
    
    return ApiSuccess(
      res, 
      stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
   } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preference stats', startTime);
  }
});

// ============================================================================
// TESTING AND DEBUGGING ROUTES
// ============================================================================

/**
 * POST /api/alert-preferences/test/filtering
 * Test smart filtering logic without actually sending alerts.
 * This is a development/testing endpoint only, disabled in production.
 */
router.post('/test/filtering', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Security check: only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return ApiError(
        res, 
        {
          code: 'FORBIDDEN',
          message: 'Test endpoint not available in production'
        },
        403, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    const user_id = req.user!.id;
    const { alertType, alertData, preferenceId } = req.body;
    
    // Validate required fields
    if (!alertType || !alertData || !preferenceId) {
      return ApiError(
        res, 
        {
          code: 'VALIDATION_ERROR',
          message: 'alertType, alertData, and preferenceId are required'
        },
        400, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    // Get the preference to test against
    const preference = await unifiedAlertPreferenceService.getAlertPreference(
      user_id, 
      preferenceId
    );
    
    if (!preference) {
      return ApiError(
        res, 
        {
          code: 'NOT_FOUND',
          message: 'Alert preference not found'
        },
        404, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    // Process smart filtering without sending actual alerts
    const filteringResult = await unifiedAlertPreferenceService.processSmartFiltering(
      user_id,
      alertType,
      alertData,
      preference
    );
    
    return ApiSuccess(
      res,
      {
        filteringResult,
        preference: {
          id: preference.id,
          name: preference.name,
          smartFiltering: preference.smartFiltering
        }
      },
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to test smart filtering', startTime);
  }
});

/**
 * POST /api/alert-preferences/:preferenceId/test-channel
 * Send a test notification to a specific channel to verify configuration
 */
router.post(
  '/:preferenceId/test-channel',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
    
    try {
      const user_id = req.user!.id;
      const preferenceId = req.params.preferenceId;
      const { channelType  } = z.object({
        channelType: z.enum(['in_app', 'email', 'push', 'sms', 'webhook'])
      }).parse(req.body);
      
      // Get the preference to verify channel exists and is configured
      const preference = await unifiedAlertPreferenceService.getAlertPreference(
        user_id,
        preferenceId
      );
      
      if (!preference) {
        return ApiError(
          res,
          {
            code: 'NOT_FOUND',
            message: 'Alert preference not found'
          },
          404,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      const channel = preference.channels.find(ch => ch.type === channelType);
      
      if (!channel) {
        return ApiError(
          res,
          {
            code: 'NOT_FOUND',
            message: `Channel ${channelType} not found in preference`
          },
          404,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      if (!channel.enabled) {
        return ApiError(
          res,
          {
            code: 'CHANNEL_DISABLED',
            message: `Channel ${channelType} is not enabled`
          },
          400,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      // Create and send test alert data
      const testAlertData = {
        title: `Test ${channelType} Notification`,
        message: `This is a test notification for the ${channelType} channel.`,
        bill_id: 0,
        timestamp: new Date().toISOString()
      };
      
      const deliveryLogs = await unifiedAlertPreferenceService.processAlertDelivery(
        user_id,
        'bill_status_change',
        testAlertData,
        'normal'
      );
      
      return ApiSuccess(
        res,
        {
          success: true,
          message: `Test notification sent via ${channelType}`,
          deliveryLogs
        },
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } catch (error) {
      return handleError(res, error, 'Failed to send test notification', startTime);
    }
  }
);

// ============================================================================
// ADMIN/SERVICE ROUTES
// ============================================================================

/**
 * GET /api/alert-preferences/service/stats
 * Get service-level statistics. Admin access required.
 */
router.get('/service/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Authorization check: verify user has admin role
    if (req.user!.role !== 'admin') {
      return ApiError(
        res, 
        {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions. Admin access required.'
        },
        403, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    const stats = unifiedAlertPreferenceService.getServiceStats();
    
    return ApiSuccess(
      res, 
      stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch service stats', startTime);
  }
});

/**
 * GET /api/alert-preferences/service/health
 * Health check endpoint for monitoring and load balancers
 */
router.get('/service/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      service: 'unified-alert-preferences',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    return ApiSuccess(
      res,
      health,
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return ApiError(
      res,
      {
        code: 'SERVICE_UNHEALTHY',
        message: 'Service unhealthy'
      },
      503,
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/alert-preferences/bulk/update
 * Update multiple preferences at once for efficiency
 */
router.post('/bulk/update', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const { updates  } = z.object({
      updates: z.array(z.object({
        preferenceId: z.string(),
        data: updatePreferenceSchema
      }))
    }).parse(req.body);
    
    const results: Array<{ success: boolean; preferenceId: string; preference?: any; error?: string }> = [];

    // Process each update individually to handle partial failures gracefully
    for (const update of updates) { try {
        const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
          user_id,
          update.preferenceId,
          update.data
        );
        results.push({ success: true, preferenceId: update.preferenceId, preference: updatedPreference  });
      } catch (error) {
        results.push({
          success: false,
          preferenceId: update.preferenceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return ApiSuccess(
      res,
      {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failCount
        }
      },
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to bulk update preferences', startTime);
  }
});

/**
 * POST /api/alert-preferences/bulk/enable
 * Enable or disable multiple preferences at once
 */
router.post('/bulk/enable', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const { preferenceIds, is_active  } = z.object({
      preferenceIds: z.array(z.string()).min(1),
      is_active: z.boolean()
    }).parse(req.body);
    
    const results: Array<{ success: boolean; preferenceId: string; preference?: any; error?: string }> = [];

    // Process each preference individually for granular error handling
    for (const preferenceId of preferenceIds) { try {
        const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
          user_id,
          preferenceId,
          { is_active  }
        );
        results.push({ success: true, preferenceId, preference: updatedPreference });
      } catch (error) {
        results.push({
          success: false,
          preferenceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return ApiSuccess(
      res,
      {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          message: `${successCount} preferences ${is_active ? 'enabled' : 'disabled'}`
        }
      },
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to bulk enable/disable preferences', startTime);
  }
});

// ============================================================================
// EXPORT/IMPORT ROUTES
// ============================================================================

/**
 * GET /api/alert-preferences/backup/export
 * Export all user preferences for backup purposes
 */
router.get('/backup/export', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferences = await unifiedAlertPreferenceService.getUserAlertPreferences(user_id);
    
    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user_id,
      preferences
     };
    
    return ApiSuccess(
      res,
      exportData,
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to export preferences', startTime);
  }
});

/**
 * POST /api/alert-preferences/backup/import
 * Import preferences from backup with optional overwrite
 */
router.post('/backup/import', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const { preferences, overwrite  } = z.object({
      preferences: z.array(z.any()),
      overwrite: z.boolean().default(false)
    }).parse(req.body);
    
    // If overwrite is true, delete existing preferences first
    if (overwrite) { const existingPreferences = await unifiedAlertPreferenceService.getUserAlertPreferences(user_id);
      for (const pref of existingPreferences) {
        await unifiedAlertPreferenceService.deleteAlertPreference(user_id, pref.id);
       }
    }
    
    const results: Array<{ success: boolean; preference?: any; error?: string }> = [];

    // Create new preferences from import data
    for (const preference of preferences) { try {
        // Remove system-generated fields to create fresh preferences
        const { id, user_id: prefUserId, created_at, updated_at, ...preferenceData  } = preference;

        const newPreference = await unifiedAlertPreferenceService.createAlertPreference(
          user_id,
          preferenceData
        );

        results.push({ success: true, preference: newPreference });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return ApiSuccess(
      res,
      {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          message: `Imported ${successCount} preferences`
        }
      },
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return handleError(res, error, 'Failed to import preferences', startTime);
  }
});

export default router;


