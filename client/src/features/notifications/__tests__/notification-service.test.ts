/**
 * Client Notification Service Tests
 * 
 * Tests client-side notification management and delivery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notificationService } from '../model/notification-service';
import type { NotificationData, NotificationPreferences } from '../model/notification-service';

describe('Client Notification Service', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Clear notifications
    notificationService.clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification Management', () => {
    it('should add a new notification', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test Notification',
        message: 'This is a test',
        priority: 'medium',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test Notification');
      expect(notifications[0].read).toBe(false);
    });

    it('should generate unique IDs for notifications', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'First',
        message: 'First notification',
        priority: 'low',
        category: 'test'
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Second',
        message: 'Second notification',
        priority: 'low',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });

    it('should mark notification as read', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      const notificationId = notifications[0].id;

      notificationService.markAsRead(notificationId);

      const updated = notificationService.getNotifications();
      expect(updated[0].read).toBe(true);
    });

    it('should mark all notifications as read', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'First',
        message: 'First message',
        priority: 'low',
        category: 'test'
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Second',
        message: 'Second message',
        priority: 'low',
        category: 'test'
      });

      notificationService.markAllAsRead();

      const notifications = notificationService.getNotifications();
      expect(notifications.every(n => n.read)).toBe(true);
    });

    it('should dismiss notification', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      const notificationId = notifications[0].id;

      notificationService.dismissNotification(notificationId);

      const remaining = notificationService.getNotifications();
      expect(remaining).toHaveLength(0);
    });

    it('should get unread notifications', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'Unread',
        message: 'Unread message',
        priority: 'low',
        category: 'test'
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Read',
        message: 'Read message',
        priority: 'low',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      notificationService.markAsRead(notifications[1].id);

      const unread = notificationService.getUnreadNotifications();
      expect(unread).toHaveLength(1);
      expect(unread[0].title).toBe('Unread');
    });

    it('should get unread count', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'First',
        message: 'First message',
        priority: 'low',
        category: 'test'
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Second',
        message: 'Second message',
        priority: 'low',
        category: 'test'
      });

      expect(notificationService.getUnreadCount()).toBe(2);

      const notifications = notificationService.getNotifications();
      notificationService.markAsRead(notifications[0].id);

      expect(notificationService.getUnreadCount()).toBe(1);
    });

    it('should limit notifications to 100', () => {
      for (let i = 0; i < 150; i++) {
        notificationService.addNotification({
          type: 'bill_update',
          title: `Notification ${i}`,
          message: `Message ${i}`,
          priority: 'low',
          category: 'test'
        });
      }

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(100);
    });

    it('should clear all notifications', () => {
      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      notificationService.clearAll();

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Preferences Management', () => {
    it('should get default preferences', () => {
      const preferences = notificationService.getPreferences();

      expect(preferences).toBeDefined();
      expect(preferences.inApp).toBe(true);
      expect(preferences.email).toBe(true);
      expect(preferences.billStatusChanges).toBe(true);
    });

    it('should update preferences', () => {
      notificationService.updatePreferences({
        email: false,
        billStatusChanges: false
      });

      const preferences = notificationService.getPreferences();
      expect(preferences.email).toBe(false);
      expect(preferences.billStatusChanges).toBe(false);
    });

    it('should persist preferences to localStorage', () => {
      notificationService.updatePreferences({
        email: false,
        push: true
      });

      const stored = localStorage.getItem('notification-preferences');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.email).toBe(false);
      expect(parsed.push).toBe(true);
    });

    it('should load preferences from localStorage', () => {
      const preferences: Partial<NotificationPreferences> = {
        email: false,
        sms: true,
        frequency: 'daily'
      };

      localStorage.setItem('notification-preferences', JSON.stringify(preferences));

      // Create new instance to test loading
      const loadedPreferences = notificationService.getPreferences();
      expect(loadedPreferences.email).toBe(false);
      expect(loadedPreferences.sms).toBe(true);
      expect(loadedPreferences.frequency).toBe('daily');
    });
  });

  describe('Event Subscription', () => {
    it('should notify subscribers when notification is added', () => {
      const listener = vi.fn();
      const unsubscribe = notificationService.subscribe(listener);

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification_received',
          data: expect.objectContaining({
            title: 'Test'
          })
        })
      );

      unsubscribe();
    });

    it('should notify subscribers when notification is read', () => {
      const listener = vi.fn();
      notificationService.subscribe(listener);

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      const notifications = notificationService.getNotifications();
      listener.mockClear();

      notificationService.markAsRead(notifications[0].id);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification_read'
        })
      );
    });

    it('should notify subscribers when preferences are updated', () => {
      const listener = vi.fn();
      notificationService.subscribe(listener);

      notificationService.updatePreferences({
        email: false
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'preferences_updated',
          data: expect.objectContaining({
            email: false
          })
        })
      );
    });

    it('should unsubscribe listeners', () => {
      const listener = vi.fn();
      const unsubscribe = notificationService.subscribe(listener);

      unsubscribe();

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test',
        message: 'Test message',
        priority: 'low',
        category: 'test'
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications based on preferences', () => {
      notificationService.updatePreferences({
        billStatusChanges: false
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Bill Status Changed',
        message: 'Status changed',
        priority: 'low',
        category: 'bills'
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should allow system notifications regardless of preferences', () => {
      notificationService.updatePreferences({
        inApp: false
      });

      notificationService.addNotification({
        type: 'system',
        title: 'System Alert',
        message: 'Important system message',
        priority: 'high',
        category: 'system'
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
    });

    it('should filter comment notifications when disabled', () => {
      notificationService.updatePreferences({
        newComments: false
      });

      notificationService.addNotification({
        type: 'comment',
        title: 'New Comment',
        message: 'Someone commented',
        priority: 'low',
        category: 'comments'
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    it('should notify bill status change', () => {
      notificationService.notifyBillStatusChange('bill-123', 'Education Reform Bill', 'passed');

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('bill_update');
      expect(notifications[0].title).toBe('Bill Status Update');
      expect(notifications[0].actionUrl).toBe('/bills/bill-123');
      expect(notifications[0].metadata).toEqual({
        billId: 'bill-123',
        newStatus: 'passed'
      });
    });

    it('should notify new comment', () => {
      notificationService.notifyNewComment('bill-456', 'Healthcare Bill', 'John Doe');

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('comment');
      expect(notifications[0].title).toBe('New Comment');
      expect(notifications[0].actionUrl).toBe('/bills/bill-456#comments');
    });

    it('should notify expert analysis', () => {
      notificationService.notifyExpertAnalysis('bill-789', 'Tax Reform Bill', 'Dr. Smith');

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('analysis');
      expect(notifications[0].title).toBe('New Expert Analysis');
      expect(notifications[0].priority).toBe('high');
      expect(notifications[0].actionUrl).toBe('/bills/bill-789/analysis');
    });
  });

  describe('Browser Notifications', () => {
    it('should request permission for push notifications', () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      global.Notification = {
        permission: 'default',
        requestPermission: mockRequestPermission
      } as any;

      notificationService.updatePreferences({
        push: true
      });

      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should show browser notification when push is enabled', () => {
      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      (global.Notification as any).permission = 'granted';

      notificationService.updatePreferences({
        push: true
      });

      notificationService.addNotification({
        type: 'bill_update',
        title: 'Test Notification',
        message: 'Test message',
        priority: 'high',
        category: 'test'
      });

      expect(mockNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'Test message'
        })
      );
    });
  });
});
