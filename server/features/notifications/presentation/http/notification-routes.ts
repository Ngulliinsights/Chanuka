import { userPreferencesService } from '@server/features/users/domain/user-preferences';
import { notificationService } from '@server/features/notifications/application/services/notification.service';
import { smartNotificationFilterService } from '@server/features/notifications/domain/services/smart-notification-filter';
import { AuthenticatedRequest, authenticateToken } from '@server/middleware/auth';
import { logger } from '@server/infrastructure/observability';
import { sendError, sendSuccess, sendValidationError } from '@server/utils/api-response-helpers';
import { Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';

export const router: Router = Router();

// ===== VALIDATION SCHEMAS =====

const createNotificationSchema = z.object({
  type: z.enum(['bill_update', 'comment_reply', 'verification_status', 'system_alert']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  relatedBillId: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

const notificationQuerySchema = z.object({
  page: z.string().transform(val => Math.max(parseInt(val) || 1, 1)).optional(),
  limit: z.string().transform(val => Math.min(Math.max(parseInt(val) || 20, 1), 100)).optional(),
  unreadOnly: z.string().transform(val => val === 'true').optional(),
  type: z.string().optional()
});

/**
 * Consolidated Notification Routes
 * 
 * Unified REST API for notification operations including:
 * - Core notification CRUD operations
 * - Enhanced notification preferences
 * - Smart filtering capabilities
 * - Service status monitoring
 */

// ===== CORE NOTIFICATION ENDPOINTS =====

/**
 * Get user notifications with pagination and filtering
 * GET /api/notifications
 */
router.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const query = notificationQuerySchema.parse(req.query);

      const notifications = await notificationService.getUserNotifications(user_id, {
        limit: query.limit,
        offset: query.page ? (query.page - 1) * (query.limit || 20) : 0,
        unreadOnly: query.unreadOnly,
        type: query.type
      });

      const unreadCount = await notificationService.getUnreadCount(user_id);

      return sendSuccess(res, {
        notifications,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          hasMore: notifications.length === (query.limit || 20)
        },
        unreadCount
      });

    } catch (error) {
      logger.error(`Error getting notifications: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      if (error instanceof ZodError) {
        return sendValidationError(res, error.errors);
      }

      return sendError(res, 'Failed to get notifications', 500);
    }
  }
);

/**
 * Create a new notification
 * POST /api/notifications
 */
router.post(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const notificationData = createNotificationSchema.parse(req.body);

      const notification = await notificationService.createNotification({
        user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        relatedBillId: notificationData.relatedBillId,
        metadata: notificationData.metadata
      });

      return res.status(201).json({
        success: true,
        data: notification,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Error creating notification: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      if (error instanceof ZodError) {
        return sendValidationError(res, error.errors);
      }

      return sendError(res, 'Failed to create notification', 500);
    }
  }
);

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch(
  '/:id/read',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const notification_id = parseInt(req.params.id || '', 10);
      if (isNaN(notification_id)) {
        return sendError(res, 'Invalid notification ID', 400);
      }

      await notificationService.markAsRead(user_id, notification_id);

      return sendSuccess(res, {
        message: 'Notification marked as read'
      });

    } catch (error) {
      logger.error(`Error marking notification as read: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to mark notification as read', 500);
    }
  }
);

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
router.patch(
  '/read-all',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      await notificationService.markAllAsRead(user_id);

      return sendSuccess(res, {
        message: 'All notifications marked as read'
      });

    } catch (error) {
      logger.error(`Error marking all notifications as read: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to mark all notifications as read', 500);
    }
  }
);

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const notification_id = parseInt(req.params.id || '', 10);
      if (isNaN(notification_id)) {
        return sendError(res, 'Invalid notification ID', 400);
      }

      await notificationService.deleteNotification(user_id, notification_id);

      return sendSuccess(res, {
        message: 'Notification deleted'
      });

    } catch (error) {
      logger.error(`Error deleting notification: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to delete notification', 500);
    }
  }
);

/**
 * Get notification statistics
 * GET /api/notifications/stats
 */
router.get(
  '/stats',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const stats = await notificationService.getNotificationStats(user_id);

      return sendSuccess(res, stats);

    } catch (error) {
      logger.error(`Error getting notification stats: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to get notification statistics', 500);
    }
  }
);

// ===== ENHANCED NOTIFICATION ENDPOINTS =====

/**
 * Get user's enhanced notification preferences
 * GET /api/notifications/preferences/enhanced
 */
router.get(
  '/preferences/enhanced',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const preferences = await userPreferencesService.getUserPreferences(user_id);
      const engagementProfile = await smartNotificationFilterService.getEngagementProfileForUser(user_id);

      return sendSuccess(res, {
        preferences,
        engagementProfile,
        availableChannels: [
          {
            type: 'inApp',
            name: 'In-App Notifications',
            description: 'Notifications within the platform',
            supported: true,
            requiresSetup: false
          },
          {
            type: 'email',
            name: 'Email Notifications',
            description: 'Email notifications to your registered email',
            supported: true,
            requiresSetup: false
          },
          {
            type: 'sms',
            name: 'SMS Notifications',
            description: 'Text message notifications',
            supported: false,
            requiresSetup: true
          },
          {
            type: 'push',
            name: 'Push Notifications',
            description: 'Browser and mobile push notifications',
            supported: false,
            requiresSetup: true
          }
        ]
      });

    } catch (error) {
      logger.error(`Error getting enhanced preferences: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to get enhanced preferences', 500);
    }
  }
);

/**
 * Update notification channel preferences
 * PATCH /api/notifications/preferences/channels
 */
router.patch(
  '/preferences/channels',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const channelPreferences = req.body;

      await userPreferencesService.updateBillTrackingPreferences(user_id, {
        notificationChannels: channelPreferences
      });

      return sendSuccess(res, {
        message: 'Channel preferences updated successfully'
      });

    } catch (error) {
      logger.error(`Error updating channel preferences: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to update channel preferences', 500);
    }
  }
);

/**
 * Test smart notification filter
 * POST /api/notifications/test-filter
 */
router.post(
  '/test-filter',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return sendError(res, 'User not authenticated', 401);
      }

      const filterCriteria = req.body;

      const filterResult = await smartNotificationFilterService.applySmartFilter({
        ...filterCriteria,
        user_id
      });

      return sendSuccess(res, filterResult);

    } catch (error) {
      logger.error(`Error testing smart filter: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

      return sendError(res, 'Failed to test smart filter', 500);
    }
  }
);

// ===== SERVICE STATUS ENDPOINTS =====

/**
 * Get notification service status
 * GET /api/notifications/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const coreStatus = notificationService.getStatus();

    return sendSuccess(res, {
      services: {
        core: coreStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error getting service status: ${error instanceof Error ? error.message : String(error)} | component=NotificationRoutes`);

    return sendError(res, 'Failed to get service status', 500);
  }
});
