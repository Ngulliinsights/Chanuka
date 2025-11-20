import { Router } from "express";
import { z } from "zod";
import { ApiSuccess, ApiValidationError, ApiResponseWrapper } from '@shared/core/src/utils/api';
import { notificationService } from "./notification-service";
import { authenticateToken as requireAuth } from "../../middleware/auth";
import { logger } from '@shared/core/src/index.js';

export const router: Router = Router();

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  notification_type: z.enum(['bill_update', 'comment_reply', 'milestone', 'campaign_update', 'moderation_action']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
  related_bill_id: z.string().uuid().optional(),
  related_comment_id: z.string().uuid().optional(),
  related_user_id: z.string().uuid().optional(),
  delivery_method: z.enum(['in_app', 'email', 'sms', 'push']).optional()
});

const notificationFiltersSchema = z.object({
  is_read: z.boolean().optional(),
  notification_type: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

const updateAlertPreferencesSchema = z.object({
  bill_alerts: z.boolean().optional(),
  comment_alerts: z.boolean().optional(),
  campaign_alerts: z.boolean().optional(),
  system_alerts: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  whatsapp_notifications: z.boolean().optional(),
  digest_frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function handleApiError(res: any, error: unknown, message: string, startTime: number) {
  logger.error(message, { component: 'NotificationRouter' }, error);

  const errorDetails = error instanceof Error ? { message: error.message } : undefined;

  return res.status(500).json({
    success: false,
    message,
    error: errorDetails,
    metadata: ApiResponseWrapper.createMetadata(startTime, 'database')
  });
}

function createErrorResponse(res: any, message: string, statusCode: number, startTime: number) {
  return res.status(statusCode).json({
    success: false,
    message,
    metadata: ApiResponseWrapper.createMetadata(startTime, 'database')
  });
}

/**
 * Transform Zod validation errors to the expected format
 */
function transformZodErrors(zodErrors: any[]): Array<{ field: string; message: string }> {
  return zodErrors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /notifications
 * Get user's notifications with filtering and pagination
 */
router.get("/", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    // Validate query parameters
    const queryResult = notificationFiltersSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errors = queryResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return ApiValidationError(res, errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await notificationService.getUserNotifications(user_id, queryResult.data);

    return ApiSuccess(res, result,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch notifications", startTime);
  }
});

/**
 * POST /notifications
 * Create a new notification (admin/system use)
 */
router.post("/", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const data = req.body;

    // Validate input
    const result = createNotificationSchema.safeParse(data);
    if (!result.success) {
      const errors = transformZodErrors(result.error.errors);
      return ApiValidationError(res, errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const notification = await notificationService.createNotification({
      user_id: result.data.user_id,
      notification_type: result.data.notification_type,
      title: result.data.title,
      message: result.data.message,
      related_bill_id: result.data.related_bill_id,
      related_comment_id: result.data.related_comment_id,
      related_user_id: result.data.related_user_id,
      delivery_method: result.data.delivery_method
    });

    return ApiSuccess(res, notification,
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    return handleApiError(res, error, "Failed to create notification", startTime);
  }
});

/**
 * PUT /notifications/:id/read
 * Mark a notification as read
 */
router.put("/:id/read", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    if (!notification_id) {
      return createErrorResponse(res, "Notification ID is required", 400, startTime);
    }

    const success = await notificationService.markAsRead(notification_id, user_id);

    if (!success) {
      return createErrorResponse(res, "Notification not found or access denied", 404, startTime);
    }

    return ApiSuccess(res, { success: true },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to mark notification as read", startTime);
  }
});

/**
 * PUT /notifications/read-multiple
 * Mark multiple notifications as read
 */
router.put("/read-multiple", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const { notification_ids } = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return createErrorResponse(res, "Notification IDs array is required", 400, startTime);
    }

    const updatedCount = await notificationService.markMultipleAsRead(notification_ids, user_id);

    return ApiSuccess(res, { success: true, updatedCount },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to mark notifications as read", startTime);
  }
});

/**
 * PUT /notifications/:id/dismiss
 * Dismiss a notification
 */
router.put("/:id/dismiss", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    if (!notification_id) {
      return createErrorResponse(res, "Notification ID is required", 400, startTime);
    }

    const success = await notificationService.dismissNotification(notification_id, user_id);

    if (!success) {
      return createErrorResponse(res, "Notification not found or access denied", 404, startTime);
    }

    return ApiSuccess(res, { success: true },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to dismiss notification", startTime);
  }
});

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    if (!notification_id) {
      return createErrorResponse(res, "Notification ID is required", 400, startTime);
    }

    const success = await notificationService.deleteNotification(notification_id, user_id);

    if (!success) {
      return createErrorResponse(res, "Notification not found or access denied", 404, startTime);
    }

    return ApiSuccess(res, { success: true },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to delete notification", startTime);
  }
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /notifications/stats
 * Get notification statistics for the user
 */
router.get("/stats", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    const stats = await notificationService.getNotificationStats(user_id);

    return ApiSuccess(res, stats,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch notification statistics", startTime);
  }
});

// ============================================================================
// ALERT PREFERENCES ENDPOINTS
// ============================================================================

/**
 * GET /notifications/preferences
 * Get user's alert preferences
 */
router.get("/preferences", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    const preferences = await notificationService.getUserAlertPreferences(user_id);

    return ApiSuccess(res, preferences,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch alert preferences", startTime);
  }
});

/**
 * PUT /notifications/preferences
 * Update user's alert preferences
 */
router.put("/preferences", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const user_id = (req as any).user?.id;
    const data = req.body;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    // Validate input
    const result = updateAlertPreferencesSchema.safeParse(data);
    if (!result.success) {
      const errors = transformZodErrors(result.error.errors);
      return ApiValidationError(res, errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const preferences = await notificationService.updateUserAlertPreferences(user_id, result.data);

    return ApiSuccess(res, preferences,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to update alert preferences", startTime);
  }
});

// ============================================================================
// CONTACT METHODS ENDPOINTS
// ============================================================================

/**
 * GET /notifications/contact-methods
 * Get user's contact methods for notification delivery
 */
router.get("/contact-methods", requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
    }

    const contactMethods = await notificationService.getUserContactMethods(user_id);

    return ApiSuccess(res, contactMethods,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch contact methods", startTime);
  }
});
