/**
 * Alert Preference Routes
 * 
 * Unified API endpoints for alert preference management
 * Consolidates functionality from the deprecated alert-preferences feature
 */

import { Router, type Response } from 'express';
import { z } from 'zod';
import { logger } from '@server/infrastructure/observability';
import {
  sendSuccess,
  sendError,
  sendValidationError
} from '@server/utils/api-response-helpers';
import { AuthenticatedRequest, authenticateToken } from '@server/middleware/auth';
import { emailSchema } from '@shared/validation';
import { standardRateLimits } from '@server/middleware/rate-limiter';

import { alertPreferenceManagementService } from '../../application/services/alert-preference-management.service';

export const router: Router = Router();

// Apply rate limiting to all routes
router.use(standardRateLimits.api);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const alertChannelSchema = z.object({
  type: z.enum(['in_app', 'email', 'push', 'sms', 'webhook']),
  enabled: z.boolean(),
  config: z.object({
    email: emailSchema.optional(),
    pushToken: z.string().optional(),
    phone_number: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    verified: z.boolean().default(false)
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
});

const alertConditionsSchema = z.object({
  billCategories: z.array(z.string()).optional(),
  billStatuses: z.array(z.string()).optional(),
  sponsor_ids: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  minimumEngagement: z.number().min(0).optional(),
  user_roles: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }).optional(),
  dayOfWeek: z.array(z.number().min(0).max(6)).optional()
});

const alertPreferenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
  alertTypes: z.array(z.object({
    type: z.enum(['bill_status_change', 'new_comment', 'amendment', 'voting_scheduled', 'sponsor_update', 'engagement_milestone']),
    enabled: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    conditions: alertConditionsSchema.optional()
  })).min(1),
  channels: z.array(alertChannelSchema).min(1),
  frequency: z.object({
    type: z.enum(['immediate', 'batched']),
    batchInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
    batchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    batchDay: z.number().min(0).max(6).optional()
  }).refine(data => {
    if (data.type === 'batched' && !data.batchInterval) {
      return false;
    }
    return true;
  }, { message: "Batched frequency requires batchInterval" }),
  smartFiltering: z.object({
    enabled: z.boolean(),
    user_interestWeight: z.number().min(0).max(1),
    engagementHistoryWeight: z.number().min(0).max(1),
    trendingWeight: z.number().min(0).max(1),
    duplicateFiltering: z.boolean(),
    spamFiltering: z.boolean(),
    minimumConfidence: z.number().min(0).max(1).default(0.3)
  })
});

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const handleError = (
  res: Response,
  error: unknown,
  defaultMessage: string,
  startTime: number
) => {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.') || 'unknown',
      message: err.message
    }));
    
    return sendValidationError(
      res,
      formattedErrors,
      { duration: Date.now() - startTime, source: 'database' }
    );
  }
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  logger.error({
    message: defaultMessage,
    component: 'AlertPreferenceRoutes',
    error: errorMessage
  });
  
  return sendError(
    res,
    errorMessage,
    500,
    { duration: Date.now() - startTime, source: 'database' }
  );
};

// ============================================================================
// PREFERENCE MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/notifications/preferences
 * Create a new alert preference
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceData = alertPreferenceSchema.parse(req.body);
    
    const preference = await alertPreferenceManagementService.createAlertPreference(
      user_id,
      preferenceData
    );
    
    return sendSuccess(
      res,
      preference,
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to create alert preference', startTime);
  }
});

/**
 * GET /api/notifications/preferences
 * Get all alert preferences for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferences = await alertPreferenceManagementService.getUserAlertPreferences(user_id);
    
    return sendSuccess(
      res,
      {
        preferences,
        count: preferences.length
      },
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preferences', startTime);
  }
});

/**
 * GET /api/notifications/preferences/:preferenceId
 * Get a specific alert preference by ID
 */
router.get('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId!;
    
    const preference = await alertPreferenceManagementService.getAlertPreference(
      user_id,
      preferenceId
    );
    
    if (!preference) {
      return sendError(
        res,
        'Alert preference not found',
        404,
        { duration: Date.now() - startTime, source: 'database' }
      );
    }
    
    return sendSuccess(
      res,
      preference,
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preference', startTime);
  }
});

/**
 * PATCH /api/notifications/preferences/:preferenceId
 * Update an existing alert preference
 */
router.patch('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId!;
    const updates = updatePreferenceSchema.parse(req.body);
    
    const updatedPreference = await alertPreferenceManagementService.updateAlertPreference(
      user_id,
      preferenceId,
      updates
    );
    
    return sendSuccess(
      res,
      updatedPreference,
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to update alert preference', startTime);
  }
});

/**
 * DELETE /api/notifications/preferences/:preferenceId
 * Delete an alert preference
 */
router.delete('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferenceId = req.params.preferenceId!;
    
    await alertPreferenceManagementService.deleteAlertPreference(user_id, preferenceId);
    
    return sendSuccess(
      res,
      {
        success: true,
        message: 'Alert preference deleted successfully'
      },
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to delete alert preference', startTime);
  }
});

// ============================================================================
// ANALYTICS AND REPORTING ROUTES
// ============================================================================

/**
 * GET /api/notifications/delivery-logs
 * Get delivery logs with pagination and filtering
 */
router.get('/logs/delivery', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const query = deliveryLogsQuerySchema.parse(req.query);
    
    const result = await alertPreferenceManagementService.getDeliveryLogs(user_id, {
      page: query.page,
      limit: query.limit,
      alertType: query.alertType,
      status: query.status,
      start_date: query.start_date ? new Date(query.start_date) : undefined,
      end_date: query.end_date ? new Date(query.end_date) : undefined
    });
    
    return sendSuccess(
      res,
      result,
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch delivery logs', startTime);
  }
});

/**
 * GET /api/notifications/analytics
 * Get comprehensive statistics about alert preferences and delivery
 */
router.get('/analytics/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const stats = await alertPreferenceManagementService.getAlertPreferenceStats(user_id);
    
    return sendSuccess(
      res,
      stats,
      { duration: Date.now() - startTime, source: 'database' }
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch alert preference stats', startTime);
  }
});

export default router;
