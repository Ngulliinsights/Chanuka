import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth';
import {
  unifiedAlertPreferenceService,
  alertPreferenceSchema,
  AlertType,
  ChannelType,
  Priority,
  DeliveryStatus
} from '../../domain/services/unified-alert-preference-service';
import { z } from 'zod';
import { 
  ApiSuccess, 
  ApiError,
  ApiValidationError, 
  ApiResponseWrapper 
} from "../../../shared/core/src/utils/api";
import { logger } from '@shared/core';

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
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
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
 * POST /api/alert-preferences/:preferenceId/process-batch
 * Manually trigger processing of batched alerts for a preference
 */
router.post(
  '/:preferenceId/process-batch',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.id;
      const preferenceId = req.params.preferenceId;
      
      const processedCount = await unifiedAlertPreferenceService.processBatchedAlerts(
        userId,
        preferenceId
      );
      
      return ApiSuccess(
        res,
        {
          success: true,
          processedCount,
          message: `Processed ${processedCount} batched alerts`
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
 * GET /api/alert-preferences/delivery-logs
 * Get delivery logs with pagination and filtering
 */
router.get('/logs/delivery', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const query = deliveryLogsQuerySchema.parse(req.query);
    
    const result = await unifiedAlertPreferenceService.getAlertDeliveryLogs(userId, {
      page: query.page,
      limit: query.limit,
      alertType: query.alertType,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined
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
 * GET /api/alert-preferences/stats
 * Get comprehensive statistics about alert preferences and delivery
 */
router.get('/analytics/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const stats = await unifiedAlertPreferenceService.getAlertPreferenceStats(userId);
    
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
 * POST /api/alert-preferences/test-filtering
 * Test smart filtering logic without actually sending alerts
 * (Development/testing only)
 */
router.post('/test/filtering', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return ApiError(
        res, 
        'Test endpoint not available in production', 
        403, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    const userId = req.user!.id;
    const { alertType, alertData, preferenceId } = req.body;
    
    // Validate required fields
    if (!alertType || !alertData || !preferenceId) {
      return ApiError(
        res, 
        'alertType, alertData, and preferenceId are required', 
        400, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    // Get the preference
    const preference = await unifiedAlertPreferenceService.getAlertPreference(
      userId, 
      preferenceId
    );
    
    if (!preference) {
      return ApiError(
        res, 
        'Alert preference not found', 
        404, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    // Process smart filtering
    const filteringResult = await unifiedAlertPreferenceService.processSmartFiltering(
      userId,
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
 * Send a test notification to a specific channel
 */
router.post(
  '/:preferenceId/test-channel',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.id;
      const preferenceId = req.params.preferenceId;
      const { channelType } = z.object({
        channelType: z.enum(['in_app', 'email', 'push', 'sms', 'webhook'])
      }).parse(req.body);
      
      // Get the preference to verify channel exists
      const preference = await unifiedAlertPreferenceService.getAlertPreference(
        userId,
        preferenceId
      );
      
      if (!preference) {
        return ApiError(
          res,
          'Alert preference not found',
          404,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      const channel = preference.channels.find(ch => ch.type === channelType);
      
      if (!channel) {
        return ApiError(
          res,
          `Channel ${channelType} not found in preference`,
          404,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      if (!channel.enabled) {
        return ApiError(
          res,
          `Channel ${channelType} is not enabled`,
          400,
          ApiResponseWrapper.createMetadata(startTime, 'database')
        );
      }
      
      // Send test alert
      const testAlertData = {
        title: `Test ${channelType} Notification`,
        message: `This is a test notification for the ${channelType} channel.`,
        billId: 0,
        timestamp: new Date().toISOString()
      };
      
      const deliveryLogs = await unifiedAlertPreferenceService.processAlertDelivery(
        userId,
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
 * Get service-level statistics (admin only)
 */
router.get('/service/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Check if user has admin role
    if (req.user!.role !== 'admin') {
      return ApiError(
        res, 
        'Insufficient permissions', 
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
 * Health check endpoint for monitoring
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
      'Service unhealthy',
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
 * Update multiple preferences at once
 */
router.post('/bulk/update', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { updates } = z.object({
      updates: z.array(z.object({
        preferenceId: z.string(),
        data: updatePreferenceSchema
      }))
    }).parse(req.body);
    
    const results: Array<{ success: boolean; preferenceId: string; preference?: any; error?: string }> = [];

    for (const update of updates) {
      try {
        const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
          userId,
          update.preferenceId,
          update.data
        );
        results.push({ success: true, preferenceId: update.preferenceId, preference: updatedPreference });
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

export default router;

/**
 * POST /api/alert-preferences/bulk/enable
 * Enable or disable multiple preferences at once
 */
router.post('/bulk/enable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { preferenceIds, isActive } = z.object({
      preferenceIds: z.array(z.string()).min(1),
      isActive: z.boolean()
    }).parse(req.body);
    
    const results: Array<{ success: boolean; preferenceId: string; preference?: any; error?: string }> = [];

    for (const preferenceId of preferenceIds) {
      try {
        const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
          userId,
          preferenceId,
          { isActive }
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
          message: `${successCount} preferences ${isActive ? 'enabled' : 'disabled'}`
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
 * GET /api/alert-preferences/export
 * Export all user preferences for backup
 */
router.get('/backup/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await unifiedAlertPreferenceService.getUserAlertPreferences(userId);
    
    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      userId,
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
 * POST /api/alert-preferences/import
 * Import preferences from backup
 */
router.post('/backup/import', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { preferences, overwrite } = z.object({
      preferences: z.array(z.any()),
      overwrite: z.boolean().default(false)
    }).parse(req.body);
    
    if (overwrite) {
      // Delete existing preferences first
      const existingPreferences = await unifiedAlertPreferenceService.getUserAlertPreferences(userId);
      for (const pref of existingPreferences) {
        await unifiedAlertPreferenceService.deleteAlertPreference(userId, pref.id);
      }
    }
    
    const results: Array<{ success: boolean; preference?: any; error?: string }> = [];

    for (const preference of preferences) {
      try {
        // Remove id, userId, dates to create fresh preferences
        const { id, userId: prefUserId, createdAt, updatedAt, ...preferenceData } = preference;

        const newPreference = await unifiedAlertPreferenceService.createAlertPreference(
          userId,
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

/**
 * Centralized error handler to reduce code duplication
 * Provides consistent error responses across all endpoints
 */
const handleError = (
  res: any, 
  error: unknown, 
  defaultMessage: string, 
  startTime: number
) => {
  // Handle Zod validation errors specially
  if (error instanceof z.ZodError) {
    return ApiValidationError(
      res, 
      error.errors, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
  
  // Extract error message from Error objects
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  // Log the error for debugging
  logger.error(defaultMessage, { component: 'AlertPreferenceRoutes' }, error);
  
  // Return standardized error response
  return ApiError(
    res, 
    errorMessage, 
    500, 
    ApiResponseWrapper.createMetadata(startTime, 'database')
  );
};

// ============================================================================
// PREFERENCE MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/alert-preferences
 * Create a new alert preference
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceData = alertPreferenceSchema.parse(req.body);
    
    const preference = await unifiedAlertPreferenceService.createAlertPreference(
      userId, 
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
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await unifiedAlertPreferenceService.getUserAlertPreferences(userId);
    
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
router.get('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    const preference = await unifiedAlertPreferenceService.getAlertPreference(
      userId, 
      preferenceId
    );
    
    if (!preference) {
      return ApiError(
        res, 
        'Alert preference not found', 
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
 * Update an existing alert preference
 */
router.patch('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    const updates = updatePreferenceSchema.parse(req.body);
    
    const updatedPreference = await unifiedAlertPreferenceService.updateAlertPreference(
      userId, 
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
 * Delete an alert preference
 */
router.delete('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    await unifiedAlertPreferenceService.deleteAlertPreference(userId, preferenceId);
    
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
 * Verify a notification channel (email, SMS, etc.)
 */
router.post(
  '/:preferenceId/verify-channel', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user!.id;
      const preferenceId = req.params.preferenceId;
      const { channelType, verificationCode } = verifyChannelSchema.parse(req.body);
      
      const verified = await unifiedAlertPreferenceService.verifyChannel(
        userId,
        preferenceId,
        channelType,
        verificationCode
      );
      
      if (!verified) {
        return ApiError(
          res,
          'Channel verification failed',
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
 * Process and deliver an alert based on user preferences
 * (typically called by internal services, not directly by users)
 */
router.post('/process-alert', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { alertType, alertData, priority } = processAlertSchema.parse(req.body);
    
    const deliveryLogs = await unifiedAlertPreferenceService.processAlertDelivery(
      userId,
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





































