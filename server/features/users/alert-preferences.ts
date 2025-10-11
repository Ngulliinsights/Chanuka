import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { alertPreferenceService } from './alert-preference.js';
import { z } from 'zod';
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger';

export const router = Router();

// Validation schemas
const alertChannelSchema = z.object({
  type: z.enum(['in_app', 'email', 'push', 'sms']),
  enabled: z.boolean(),
  config: z.object({
    email: z.string().email().optional(),
    pushToken: z.string().optional(),
    phoneNumber: z.string().optional(),
    verified: z.boolean().default(false)
  }),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
});

const createPreferenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  alertTypes: z.array(z.object({
    type: z.enum(['bill_status_change', 'new_comment', 'amendment', 'voting_scheduled', 'sponsor_update', 'engagement_milestone']),
    enabled: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    conditions: z.object({
      billCategories: z.array(z.string()).optional(),
      billStatuses: z.array(z.string()).optional(),
      sponsorIds: z.array(z.number()).optional(),
      keywords: z.array(z.string()).optional(),
      minimumEngagement: z.number().min(0).optional()
    }).optional()
  })),
  channels: z.array(alertChannelSchema),
  frequency: z.object({
    type: z.enum(['immediate', 'batched']),
    batchInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
    batchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    batchDay: z.number().min(0).max(6).optional()
  }),
  smartFiltering: z.object({
    enabled: z.boolean(),
    userInterestWeight: z.number().min(0).max(1),
    engagementHistoryWeight: z.number().min(0).max(1),
    trendingWeight: z.number().min(0).max(1),
    duplicateFiltering: z.boolean(),
    spamFiltering: z.boolean()
  })
});

const updatePreferenceSchema = createPreferenceSchema.partial();

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  conditions: z.object({
    billCategories: z.array(z.string()).optional(),
    billStatuses: z.array(z.string()).optional(),
    sponsorIds: z.array(z.number()).optional(),
    keywords: z.array(z.string()).optional(),
    minimumEngagement: z.number().min(0).optional(),
    userRoles: z.array(z.string()).optional(),
    timeRange: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    dayOfWeek: z.array(z.number().min(0).max(6)).optional()
  }),
  actions: z.object({
    channels: z.array(z.string()),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    template: z.string().optional(),
    customMessage: z.string().max(1000).optional()
  }),
  isActive: z.boolean().default(true)
});

const deliveryLogsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  alertType: z.string().optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'filtered']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const processAlertSchema = z.object({
  alertType: z.string(),
  alertData: z.any(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

// Create alert preference
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceData = createPreferenceSchema.parse(req.body);
    
    const preference = await alertPreferenceService.createAlertPreference(userId, preferenceData);
    
    return ApiSuccess(res, preference, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error creating alert preference:', { component: 'SimpleTool' }, error);
    return ApiError(res, error instanceof Error ? error.message : 'Failed to create alert preference', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get all user alert preferences
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await alertPreferenceService.getUserAlertPreferences(userId);
    
    return ApiSuccess(res, { 
      preferences,
      count: preferences.length 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching alert preferences:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch alert preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get specific alert preference
router.get('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    const preference = await alertPreferenceService.getAlertPreference(userId, preferenceId);
    
    if (!preference) {
      return ApiError(res, 'Alert preference not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    return ApiSuccess(res, preference, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching alert preference:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch alert preference', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update alert preference
router.patch('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    const updates = updatePreferenceSchema.parse(req.body);
    
    const updatedPreference = await alertPreferenceService.updateAlertPreference(
      userId, 
      preferenceId, 
      updates
    );
    
    return ApiSuccess(res, updatedPreference, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating alert preference:', { component: 'SimpleTool' }, error);
    return ApiError(res, error instanceof Error ? error.message : 'Failed to update alert preference', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Delete alert preference
router.delete('/:preferenceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    
    await alertPreferenceService.deleteAlertPreference(userId, preferenceId);
    
    return ApiSuccess(res, { 
      success: true, 
      message: 'Alert preference deleted successfully' 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error deleting alert preference:', { component: 'SimpleTool' }, error);
    return ApiError(res, error instanceof Error ? error.message : 'Failed to delete alert preference', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Create alert rule for a preference
router.post('/:preferenceId/rules', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferenceId = req.params.preferenceId;
    const ruleData = createRuleSchema.parse(req.body);
    
    const rule = await alertPreferenceService.createAlertRule(userId, preferenceId, ruleData);
    
    return ApiSuccess(res, rule, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error creating alert rule:', { component: 'SimpleTool' }, error);
    return ApiError(res, error instanceof Error ? error.message : 'Failed to create alert rule', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Process alert delivery (for testing/admin use)
router.post('/process-alert', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { alertType, alertData, priority } = processAlertSchema.parse(req.body);
    
    const deliveryLogs = await alertPreferenceService.processAlertDelivery(
      userId,
      alertType,
      alertData,
      priority
    );
    
    return ApiSuccess(res, { 
      deliveryLogs,
      count: deliveryLogs.length,
      message: 'Alert processing completed'
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error processing alert:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to process alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get alert delivery logs
router.get('/delivery-logs', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const query = deliveryLogsQuerySchema.parse(req.query);
    
    const result = await alertPreferenceService.getAlertDeliveryLogs(userId, {
      page: query.page,
      limit: query.limit,
      alertType: query.alertType,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined
    });
    
    return ApiSuccess(res, result, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error fetching delivery logs:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch delivery logs', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get alert preference statistics
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const stats = await alertPreferenceService.getAlertPreferenceStats(userId);
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching alert preference stats:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch alert preference stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Test smart filtering (development/testing endpoint)
router.post('/test-filtering', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return ApiError(res, 'Test endpoint not available in production', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const userId = req.user!.id;
    const { alertType, alertData, preferenceId } = req.body;
    
    if (!alertType || !alertData || !preferenceId) {
      return ApiError(res, 'alertType, alertData, and preferenceId are required', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const preference = await alertPreferenceService.getAlertPreference(userId, preferenceId);
    if (!preference) {
      return ApiError(res, 'Alert preference not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const filteringResult = await alertPreferenceService.processSmartFiltering(
      userId,
      alertType,
      alertData,
      preference
    );
    
    return ApiSuccess(res, {
      filteringResult,
      preference: {
        id: preference.id,
        name: preference.name,
        smartFiltering: preference.smartFiltering
      }
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error testing smart filtering:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to test smart filtering', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get service statistics (admin only)
router.get('/service/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Check if user has admin role
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const stats = alertPreferenceService.getStats();
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching service stats:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch service stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

export default router;








