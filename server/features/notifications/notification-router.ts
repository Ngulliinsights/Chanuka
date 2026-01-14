import { Router, Response } from 'express';
import { z } from 'zod';

import { authenticateToken as requireAuth } from '@server/middleware/auth';
import { logger } from '@shared/core';
import { asyncHandler } from '@/middleware/error-management';
import { BaseError, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES, ErrorDomain, ErrorSeverity } from '@shared/constants';
import { createErrorContext } from '@shared/core/observability/distributed-tracing';
import { notificationService } from './notification-service';

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
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /notifications - Get user's notifications with filtering and pagination
 */
router.get('/', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/notifications');

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    // Validate query parameters
    const queryResult = notificationFiltersSchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid filter parameters', queryResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    const result = await notificationService.getUserNotifications(user_id, queryResult.data);

    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to fetch notifications', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to fetch notifications', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * POST /notifications - Create a new notification (admin/system use)
 */
router.post('/', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/notifications');

  try {
    const data = req.body;

    // Validate input
    const result = createNotificationSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid notification data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
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

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to create notification', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to create notification', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes' }
    });
  }
}));

/**
 * PUT /notifications/:id/read - Mark a notification as read
 */
router.put('/:id/read', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/notifications/:id/read');

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    if (!notification_id) {
      throw new ValidationError('Notification ID is required', [
        { field: 'id', message: 'Notification ID parameter is required', code: 'REQUIRED_FIELD' }
      ]);
    }

    const success = await notificationService.markAsRead(notification_id, user_id);

    if (!success) {
      throw new BaseError('Notification not found or access denied', {
        statusCode: 404,
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { component: 'notification-routes', notificationId: notification_id }
      });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to mark notification as read', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to mark notification as read', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', notificationId: req.params.id }
    });
  }
}));

/**
 * PUT /notifications/read-multiple - Mark multiple notifications as read
 */
router.put('/read-multiple', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/notifications/read-multiple');

  try {
    const { notification_ids } = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      throw new ValidationError('Invalid notification IDs', [
        { field: 'notification_ids', message: 'Notification IDs array is required and must not be empty', code: 'REQUIRED_FIELD' }
      ]);
    }

    const updatedCount = await notificationService.markMultipleAsRead(notification_ids, user_id);

    res.json({ success: true, updatedCount });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to mark multiple notifications as read', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to mark notifications as read', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * PUT /notifications/:id/dismiss - Dismiss a notification
 */
router.put('/:id/dismiss', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/notifications/:id/dismiss');

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    if (!notification_id) {
      throw new ValidationError('Notification ID is required', [
        { field: 'id', message: 'Notification ID parameter is required', code: 'REQUIRED_FIELD' }
      ]);
    }

    const success = await notificationService.dismissNotification(notification_id, user_id);

    if (!success) {
      throw new BaseError('Notification not found or access denied', {
        statusCode: 404,
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { component: 'notification-routes', notificationId: notification_id }
      });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to dismiss notification', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to dismiss notification', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', notificationId: req.params.id }
    });
  }
}));

/**
 * DELETE /notifications/:id - Delete a notification
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'DELETE /api/notifications/:id');

  try {
    const notification_id = req.params.id;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    if (!notification_id) {
      throw new ValidationError('Notification ID is required', [
        { field: 'id', message: 'Notification ID parameter is required', code: 'REQUIRED_FIELD' }
      ]);
    }

    const success = await notificationService.deleteNotification(notification_id, user_id);

    if (!success) {
      throw new BaseError('Notification not found or access denied', {
        statusCode: 404,
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { component: 'notification-routes', notificationId: notification_id }
      });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to delete notification', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to delete notification', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', notificationId: req.params.id }
    });
  }
}));

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /notifications/stats - Get notification statistics for the user
 */
router.get('/stats', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/notifications/stats');

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    const stats = await notificationService.getNotificationStats(user_id);

    res.json(stats);
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to fetch notification statistics', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to fetch notification statistics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));

// ============================================================================
// ALERT PREFERENCES ENDPOINTS
// ============================================================================

/**
 * GET /notifications/preferences - Get user's alert preferences
 */
router.get('/preferences', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/notifications/preferences');

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    const preferences = await notificationService.getUserAlertPreferences(user_id);

    res.json(preferences);
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to fetch alert preferences', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to fetch alert preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * PUT /notifications/preferences - Update user's alert preferences
 */
router.put('/preferences', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/notifications/preferences');

  try {
    const user_id = (req as any).user?.id;
    const data = req.body;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    // Validate input
    const result = updateAlertPreferencesSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid preference data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    const preferences = await notificationService.updateUserAlertPreferences(user_id, result.data);

    res.json(preferences);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to update alert preferences', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to update alert preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * GET /notifications/contact-methods - Get user's contact methods for notification delivery
 */
router.get('/contact-methods', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/notifications/contact-methods');

  try {
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'notification-routes' }
      });
    }

    const contactMethods = await notificationService.getUserContactMethods(user_id);

    res.json(contactMethods);
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to fetch contact methods', { component: 'notification-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to fetch contact methods', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'notification-routes', userId: (req as any).user?.id }
    });
  }
}));
