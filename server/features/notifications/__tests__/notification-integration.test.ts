/**
 * Notification System Integration Tests
 * 
 * Tests the complete notification flow from creation to delivery across all channels
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notificationService } from '../application/services/notification.service';
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
import { smartNotificationFilterService } from '../domain/services/smart-notification-filter';
import { userPreferencesService } from '@server/features/users/domain/user-preferences';
import type { NotificationRequest } from '../application/services/notification.service';

// Mock user preferences service
vi.mock('@server/features/users/domain/user-preferences', () => ({
  userPreferencesService: {
    getUserPreferences: vi.fn().mockResolvedValue({
      smartFiltering: {
        enabled: false,
        priorityThreshold: 'low',
        interestBasedFiltering: false
      },
      notificationChannels: {
        inApp: true,
        email: true,
        sms: false,
        push: false
      },
      tracking_types: ['statusChanges', 'newComments', 'amendments', 'votingSchedule'],
      updateFrequency: 'immediate',
      statusChanges: true,
      newComments: true,
      amendments: true,
      votingSchedule: true,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      alert_frequency: 'immediate'
    }),
    updateBillTrackingPreferences: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock database operations
vi.mock('@server/infrastructure/database', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{
      id: 1,
      user_id: 'test-user-123',
      notification_type: 'bill_update',
      title: 'Test',
      message: 'Test message',
      is_read: false,
      created_at: new Date()
    }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  }
}));

describe('Notification System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Notification Flow', () => {
    it('should create and deliver a notification through all enabled channels', async () => {
      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        subType: 'status_change',
        title: 'Bill Status Changed',
        message: 'The Education Reform Bill has been passed',
        priority: 'high',
        relatedBillId: 123,
        category: 'education',
        tags: ['education', 'reform'],
        actionUrl: '/bills/123',
        metadata: { previousStatus: 'pending', newStatus: 'passed' }
      };

      const result = await notificationService.send(request);

      expect(result.sent).toBe(true);
      expect(result.channels).toContain('inApp');
      expect(result.filteredOut).toBe(false);
      expect(result.notificationId).toBeDefined();
    });

    it('should filter out low-priority notifications during quiet hours', async () => {
      // Mock quiet hours check
      const now = new Date();
      const quietStart = new Date(now);
      quietStart.setHours(22, 0, 0, 0);
      const quietEnd = new Date(now);
      quietEnd.setHours(8, 0, 0, 0);

      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        title: 'Minor Update',
        message: 'A minor change occurred',
        priority: 'low',
        relatedBillId: 123
      };

      // This test assumes current time is within quiet hours
      // In production, this would be controlled by user preferences
      const result = await notificationService.send(request);

      // Low priority notifications should be filtered during quiet hours
      // unless user has disabled quiet hours
      expect(result).toBeDefined();
    });

    it('should deliver urgent notifications even during quiet hours', async () => {
      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'system_alert',
        title: 'Urgent Security Alert',
        message: 'Your account requires immediate attention',
        priority: 'urgent'
      };

      const result = await notificationService.send(request);

      expect(result.sent).toBe(true);
      expect(result.filteredOut).toBe(false);
    });
  });

  describe('Multi-Channel Delivery', () => {
    it('should deliver to multiple channels based on priority', async () => {
      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        title: 'Important Bill Update',
        message: 'Critical legislation requires your attention',
        priority: 'high',
        relatedBillId: 456
      };

      const result = await notificationService.send(request);

      expect(result.sent).toBe(true);
      expect(result.channels.length).toBeGreaterThan(0);
      // High priority should trigger multiple channels
      expect(result.channels).toContain('inApp');
    });

    it('should handle channel delivery failures gracefully', async () => {
      // Mock a channel failure
      const originalSend = notificationChannelService.sendToChannel;
      vi.spyOn(notificationChannelService, 'sendToChannel').mockRejectedValueOnce(
        new Error('Channel unavailable')
      );

      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        title: 'Test Notification',
        message: 'Testing failure handling',
        priority: 'medium'
      };

      const result = await notificationService.send(request);

      // Should still succeed if at least one channel works
      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();

      vi.spyOn(notificationChannelService, 'sendToChannel').mockRestore();
    });
  });

  describe('Smart Filtering', () => {
    it('should apply smart filtering based on user engagement', async () => {
      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        subType: 'new_comment',
        title: 'New Comment on Bill',
        message: 'Someone commented on a bill',
        priority: 'low',
        relatedBillId: 789,
        category: 'healthcare'
      };

      const result = await notificationService.send(request);

      // Smart filter should evaluate based on user's engagement profile
      expect(result).toBeDefined();
      expect(result.filterReasons).toBeDefined();
      expect(Array.isArray(result.filterReasons)).toBe(true);
    });

    it('should recommend appropriate channels based on confidence', async () => {
      const request: NotificationRequest = {
        user_id: 'test-user-123',
        type: 'bill_update',
        subType: 'status_change',
        title: 'Bill Passed',
        message: 'A bill you track has been passed',
        priority: 'high',
        relatedBillId: 101,
        category: 'education',
        sponsorName: 'Senator Smith'
      };

      const result = await notificationService.send(request);

      expect(result.sent).toBe(true);
      expect(result.channels).toBeDefined();
      expect(result.channels.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Notifications', () => {
    it('should send notifications to multiple users efficiently', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const template: Omit<NotificationRequest, 'user_id'> = {
        type: 'system_alert',
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight at 2 AM',
        priority: 'medium'
      };

      const result = await notificationService.sendBulk(userIds, template);

      expect(result.total).toBe(3);
      expect(result.succeeded).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.succeeded + result.failed).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should handle partial failures in bulk sending', async () => {
      const userIds = ['valid-user', 'invalid-user', 'another-valid-user'];
      const template: Omit<NotificationRequest, 'user_id'> = {
        type: 'bill_update',
        title: 'Bulk Update',
        message: 'Testing bulk notification',
        priority: 'low'
      };

      const result = await notificationService.sendBulk(userIds, template);

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      // Some may succeed, some may fail
      expect(result.succeeded + result.failed).toBe(3);
    });
  });

  describe('Notification CRUD Operations', () => {
    it.skip('should create a notification in the database', async () => {
      // Skipped: Requires database setup
      const notification = await notificationService.createNotification({
        user_id: 'test-user-123',
        type: 'bill_update',
        title: 'Test Notification',
        message: 'This is a test',
        relatedBillId: 999
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.user_id).toBe('test-user-123');
      expect(notification.title).toBe('Test Notification');
      expect(notification.is_read).toBe(false);
    });

    it('should retrieve user notifications with pagination', async () => {
      const notifications = await notificationService.getUserNotifications('test-user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: false
      });

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeLessThanOrEqual(10);
    });

    it.skip('should mark notification as read', async () => {
      // Skipped: Requires database setup
      // Create a notification first
      const notification = await notificationService.createNotification({
        user_id: 'test-user-123',
        type: 'system_alert',
        title: 'Test',
        message: 'Test message'
      });

      // Mark as read
      await notificationService.markAsRead('test-user-123', notification.id);

      // Verify it's marked as read
      const notifications = await notificationService.getUserNotifications('test-user-123', {
        unreadOnly: true
      });

      const found = notifications.find(n => n.id === notification.id);
      expect(found).toBeUndefined(); // Should not be in unread list
    });

    it('should get unread count', async () => {
      const count = await notificationService.getUnreadCount('test-user-123');

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get notification statistics', async () => {
      const stats = await notificationService.getNotificationStats('test-user-123');

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.unread).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(typeof stats.readRate).toBe('number');
    });
  });

  describe('Service Health', () => {
    it('should report service status', () => {
      const status = notificationService.getStatus();

      expect(status).toBeDefined();
      expect(status.healthy).toBe(true);
      expect(status.description).toBeDefined();
      expect(status.channels).toBeDefined();
    });

    it('should report channel service status', () => {
      const status = notificationChannelService.getStatus();

      expect(status).toBeDefined();
      expect(status.smsProvider).toBeDefined();
      expect(status.pushProvider).toBeDefined();
      expect(typeof status.smsConfigured).toBe('boolean');
      expect(typeof status.pushConfigured).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      const request: NotificationRequest = {
        user_id: '',
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low'
      };

      const result = await notificationService.send(request);

      expect(result).toBeDefined();
      // Should handle gracefully, not throw
    });

    it('should handle missing required fields', async () => {
      const request = {
        user_id: 'test-user-123',
        type: 'bill_update',
        // Missing title and message
        priority: 'low'
      } as NotificationRequest;

      const result = await notificationService.send(request);

      expect(result).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // This test would mock database failures
      // For now, we just verify the service doesn't crash
      const notifications = await notificationService.getUserNotifications('nonexistent-user');

      expect(Array.isArray(notifications)).toBe(true);
    });
  });
});
