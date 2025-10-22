import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { notificationService } from './notification-service.js';
import { userPreferencesService } from '../../features/users/domain/user-preferences.js';
import { notificationChannelService } from './notification-channels.js';
import { smartNotificationFilterService } from './smart-notification-filter.js';
import { z } from 'zod';
import { ApiSuccess, ApiError, ApiValidationError, logger } from "@shared/core";

export const router = Router();

// Validation schemas
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

const markReadSchema = z.object({
  notificationId: z.number()
});

/**
 * Consolidated Notification Routes
 * 
 * Merges API endpoints from:
 * - notifications.ts (basic notification endpoints)
 * - enhanced-notifications.ts (enhanced notification endpoints)
 * 
 * Provides unified REST API for notification operations while keeping
 * specialized services separate.
 */

// ===== CORE NOTIFICATION ENDPOINTS =====

/**
 * Get user notifications with pagination and filtering
 * Consolidated from notifications.ts
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const query = notificationQuerySchema.parse(req.query);

    const notifications = await notificationService.getUserNotifications(userId, {
      limit: query.limit,
      offset: query.page ? (query.page - 1) * (query.limit || 20) : 0,
      unreadOnly: query.unreadOnly,
      type: query.type
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    return ApiSuccess(res, {
      notifications,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        hasMore: notifications.length === (query.limit || 20)
      },
      unreadCount
    });

  } catch (error) {
    logger.error('Error getting notifications:', { component: 'Chanuka' }, error);

    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error);
    }

    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to get notifications' }, 500);
  }
});

/**
 * Create a new notification
 * Consolidated from notifications.ts
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const notificationData = createNotificationSchema.parse(req.body);

    const notification = await notificationService.createNotification({
      userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      relatedBillId: notificationData.relatedBillId,
      metadata: notificationData.metadata
    });

    return ApiSuccess(res, notification, {}, 201);

  } catch (error) {
    logger.error('Error creating notification:', { component: 'Chanuka' }, error);

    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error);
    }

    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to create notification' }, 500);
  }
});

/**
 * Mark notification as read
 * Consolidated from notifications.ts
 */
router.patch('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return ApiError(res, { code: 'INVALID_ID', message: 'Invalid notification ID' }, 400);
    }

    await notificationService.markAsRead(userId, notificationId);

    return ApiSuccess(res, { message: 'Notification marked as read' });

  } catch (error) {
    logger.error('Error marking notification as read:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' }, 500);
  }
});

/**
 * Mark all notifications as read
 * Consolidated from notifications.ts
 */
router.patch('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    await notificationService.markAllAsRead(userId);

    return ApiSuccess(res, { message: 'All notifications marked as read' });

  } catch (error) {
    logger.error('Error marking all notifications as read:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' }, 500);
  }
});

/**
 * Delete notification
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return ApiError(res, { code: 'INVALID_ID', message: 'Invalid notification ID' }, 400);
    }

    await notificationService.deleteNotification(userId, notificationId);

    return ApiSuccess(res, { message: 'Notification deleted' });

  } catch (error) {
    logger.error('Error deleting notification:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' }, 500);
  }
});

/**
 * Get notification statistics
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const stats = await notificationService.getNotificationStats(userId);

    return ApiSuccess(res, stats);

  } catch (error) {
    logger.error('Error getting notification stats:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to get notification statistics' }, 500);
  }
});

// ===== ENHANCED NOTIFICATION ENDPOINTS =====

/**
 * Get user's enhanced notification preferences
 * Consolidated from enhanced-notifications.ts
 */
router.get('/preferences/enhanced', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const preferences = await userPreferencesService.getUserPreferences(userId);
    const engagementProfile = await smartNotificationFilterService.getEngagementProfileForUser(userId);

    return ApiSuccess(res, {
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
          supported: false, // Not implemented yet
          requiresSetup: true
        },
        {
          type: 'push',
          name: 'Push Notifications',
          description: 'Browser and mobile push notifications',
          supported: false, // Not implemented yet
          requiresSetup: true
        }
      ]
    });

  } catch (error) {
    logger.error('Error getting enhanced preferences:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to get enhanced preferences' }, 500);
  }
});

/**
 * Update notification channel preferences
 * Consolidated from enhanced-notifications.ts
 */
router.patch('/preferences/channels', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const channelPreferences = req.body;

    // Update channel preferences through the user preferences service
    await userPreferencesService.updateBillTrackingPreferences(userId, { notificationChannels: channelPreferences });

    return ApiSuccess(res, { message: 'Channel preferences updated successfully' });

  } catch (error) {
    logger.error('Error updating channel preferences:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to update channel preferences' }, 500);
  }
});

/**
 * Test smart notification filter
 * Consolidated from enhanced-notifications.ts
 */
router.post('/test-filter', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiError(res, { code: 'UNAUTHORIZED', message: 'User not authenticated' }, 401);
    }

    const filterCriteria = req.body;

    const filterResult = await smartNotificationFilterService.applySmartFilter({
      ...filterCriteria,
      userId
    });

    return ApiSuccess(res, filterResult);

  } catch (error) {
    logger.error('Error testing smart filter:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to test smart filter' }, 500);
  }
});

// ===== SERVICE STATUS ENDPOINTS =====

/**
 * Get notification service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const coreStatus = notificationService.getStatus();

    return ApiSuccess(res, {
      services: {
        core: coreStatus,
        // Other services can add their status here
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting service status:', { component: 'Chanuka' }, error);
    return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to get service status' }, 500);
  }
});

export default router;











































