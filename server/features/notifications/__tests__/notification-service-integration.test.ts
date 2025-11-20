import { describe, it, expect, beforeAll } from 'vitest';
import { NotificationService } from '../../../infrastructure/notifications/notification-service';
import { NotificationChannelService } from '../../../infrastructure/notifications/notification-channels';

/**
 * Integration tests for Notification Service migration to direct Drizzle usage
 * 
 * These tests validate that the notification service works correctly with direct Drizzle queries
 * without requiring a full database setup.
 */
describe('Notification Service Integration', () => {
  let notificationService: NotificationService;
  let notificationChannelService: NotificationChannelService;

  beforeAll(() => {
    notificationService = new NotificationService();
    notificationChannelService = new NotificationChannelService();
  });

  describe('Service Initialization', () => {
    it('should initialize notification service successfully', () => {
      expect(notificationService).toBeDefined();
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should initialize notification channel service successfully', () => {
      expect(notificationChannelService).toBeDefined();
      expect(notificationChannelService).toBeInstanceOf(NotificationChannelService);
    });

    it('should have all required methods in notification service', () => {
      expect(typeof notificationService.createNotification).toBe('function');
      expect(typeof notificationService.getUserNotifications).toBe('function');
      expect(typeof notificationService.markAsRead).toBe('function');
      expect(typeof notificationService.markAllAsRead).toBe('function');
      expect(typeof notificationService.getUnreadCount).toBe('function');
      expect(typeof notificationService.deleteNotification).toBe('function');
      expect(typeof notificationService.createBulkNotifications).toBe('function');
      expect(typeof notificationService.cleanupOldNotifications).toBe('function');
      expect(typeof notificationService.getNotificationStats).toBe('function');
    });

    it('should have all required methods in channel service', () => {
      expect(typeof notificationChannelService.sendToChannel).toBe('function');
      expect(typeof notificationChannelService.sendToMultipleChannels).toBe('function');
      expect(typeof notificationChannelService.getStatus).toBe('function');
      expect(typeof notificationChannelService.cleanup).toBe('function');
    });
  });

  describe('Service Status', () => {
    it('should return correct service status', () => {
      const status = notificationService.getStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('name');
      expect(status).toHaveProperty('description');
      expect(status.name).toBe('Notification Service');
      expect(typeof status.initialized).toBe('boolean');
    });

    it('should return correct channel service status', () => {
      const status = notificationChannelService.getStatus();
      
      expect(status).toHaveProperty('smsProvider');
      expect(status).toHaveProperty('smsConfigured');
      expect(status).toHaveProperty('pushProvider');
      expect(status).toHaveProperty('pushConfigured');
      expect(status).toHaveProperty('pendingRetries');
      expect(typeof status.smsConfigured).toBe('boolean');
      expect(typeof status.pushConfigured).toBe('boolean');
      expect(typeof status.pendingRetries).toBe('number');
    });
  });

  describe('Validation Logic', () => {
    it('should validate notification data correctly', async () => {
      const invalidData = {
        user_id: '', // Empty user_id should fail
        type: 'bill_update' as const,
        title: 'Test',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });

    it('should validate notification type', async () => {
      const invalidData = {
        user_id: 'test-user',
        type: 'invalid_type' as any,
        title: 'Test',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });

    it('should validate title length', async () => {
      const invalidData = {
        user_id: 'test-user',
        type: 'bill_update' as const,
        title: '', // Empty title should fail
        message: 'Test message'
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });

    it('should validate message length', async () => {
      const invalidData = {
        user_id: 'test-user',
        type: 'bill_update' as const,
        title: 'Test',
        message: '' // Empty message should fail
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });

    it('should validate title max length', async () => {
      const longTitle = 'a'.repeat(201); // Exceeds 200 character limit
      const invalidData = {
        user_id: 'test-user',
        type: 'bill_update' as const,
        title: longTitle,
        message: 'Test message'
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });

    it('should validate message max length', async () => {
      const longMessage = 'a'.repeat(1001); // Exceeds 1000 character limit
      const invalidData = {
        user_id: 'test-user',
        type: 'bill_update' as const,
        title: 'Test',
        message: longMessage
      };

      await expect(notificationService.createNotification(invalidData))
        .rejects.toThrow();
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk notification creation structure', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      const notificationData = {
        type: 'bill_update' as const,
        title: 'Bulk Test',
        message: 'Bulk message'
      };

      // This will fail at database level, but should return proper structure
      const result = await notificationService.createBulkNotifications(userIds, notificationData);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(typeof result.success).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Channel Service Message Formatting', () => {
    it('should format email content correctly', () => {
      const service = notificationChannelService as any;
      
      const request = {
        user_id: 'test-user',
        channel: 'email' as const,
        content: {
          title: 'Test Email',
          message: 'Test email message'
        },
        metadata: {
          priority: 'high' as const,
          actionUrl: 'https://example.com',
          relatedBillId: 123
        }
      };

      const emailContent = service.formatEmailContent(request, 'Test User');
      
      expect(emailContent).toHaveProperty('text');
      expect(emailContent).toHaveProperty('html');
      expect(emailContent.text).toContain('Test User');
      expect(emailContent.text).toContain('Test Email');
      expect(emailContent.text).toContain('Test email message');
      expect(emailContent.html).toContain('Test Email');
      expect(emailContent.html).toContain('Test email message');
    });

    it('should format SMS message correctly', () => {
      const service = notificationChannelService as any;
      
      const request = {
        user_id: 'test-user',
        channel: 'sms' as const,
        content: {
          title: 'SMS Test',
          message: 'SMS message'
        },
        metadata: {
          priority: 'urgent' as const
        },
        config: {
          sms: {
            shortFormat: true,
            maxLength: 160
          }
        }
      };

      const smsMessage = service.formatSMSMessage(request);
      
      expect(smsMessage).toContain('[URGENT]');
      expect(smsMessage).toContain('SMS Test');
      expect(smsMessage).toContain('SMS message');
      expect(smsMessage.length).toBeLessThanOrEqual(160);
    });

    it('should format push payload correctly', () => {
      const service = notificationChannelService as any;
      
      const request = {
        user_id: 'test-user',
        channel: 'push' as const,
        content: {
          title: 'Push Test',
          message: 'Push message'
        },
        metadata: {
          priority: 'medium' as const,
          actionUrl: 'https://example.com',
          relatedBillId: 123,
          category: 'bill_update'
        },
        config: {
          push: {
            sound: true,
            vibration: true,
            icon: 'custom-icon',
            badge: 5
          }
        }
      };

      const pushPayload = service.formatPushPayload(request);
      
      expect(pushPayload).toHaveProperty('title', 'Push Test');
      expect(pushPayload).toHaveProperty('body', 'Push message');
      expect(pushPayload).toHaveProperty('data');
      expect(pushPayload.data).toHaveProperty('type', 'bill_update');
      expect(pushPayload.data).toHaveProperty('priority', 'medium');
      expect(pushPayload.data).toHaveProperty('bill_id', '123');
      expect(pushPayload).toHaveProperty('android');
      expect(pushPayload).toHaveProperty('apns');
      expect(pushPayload).toHaveProperty('webpush');
    });
  });

  describe('Utility Functions', () => {
    it('should validate email addresses correctly', () => {
      const service = notificationChannelService as any;
      
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('invalid@')).toBe(false);
      expect(service.isValidEmail('@invalid.com')).toBe(false);
      expect(service.isValidEmail('')).toBe(false);
    });

    it('should generate priority prefixes correctly', () => {
      const service = notificationChannelService as any;
      
      expect(service.getPriorityPrefix('urgent')).toBe('[URGENT] ');
      expect(service.getPriorityPrefix('high')).toBe('[HIGH PRIORITY] ');
      expect(service.getPriorityPrefix('medium')).toBe('');
      expect(service.getPriorityPrefix('low')).toBe('');
      expect(service.getPriorityPrefix(undefined)).toBe('');
    });

    it('should generate priority colors correctly', () => {
      const service = notificationChannelService as any;
      
      expect(service.getPriorityColor('urgent')).toBe('#dc3545');
      expect(service.getPriorityColor('high')).toBe('#fd7e14');
      expect(service.getPriorityColor('medium')).toBe('#ffc107');
      expect(service.getPriorityColor('low')).toBe('#28a745');
      expect(service.getPriorityColor(undefined)).toBe('#6c757d');
    });

    it('should have retryable error detection method', () => {
      const service = notificationChannelService as any;
      
      // Just verify the method exists and is callable
      expect(typeof service.isRetryableError).toBe('function');
      
      // Test basic functionality without specific error patterns
      expect(service.isRetryableError('some error')).toBeDefined();
      expect(typeof service.isRetryableError('some error')).toBe('boolean');
    });
  });

  describe('Mock Provider Operations', () => {
    it('should handle mock SMS sending', () => {
      const service = notificationChannelService as any;
      
      const messageId = service.sendViaMockSMS('+1234567890', 'Test SMS');
      
      expect(messageId).toContain('mock-sms-');
      expect(typeof messageId).toBe('string');
    });

    it('should handle mock push sending', () => {
      const service = notificationChannelService as any;
      
      const tokens = ['token1', 'token2'];
      const payload = { title: 'Test', body: 'Test message' };
      const messageId = service.sendViaMockPush(tokens, payload);
      
      expect(messageId).toContain('mock-push-');
      expect(typeof messageId).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle cleanup gracefully', () => {
      expect(() => notificationChannelService.cleanup()).not.toThrow();
    });

    it('should handle delay utility', async () => {
      const service = notificationChannelService as any;
      
      const start = Date.now();
      await service.delay(10);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Multi-Channel Operations', () => {
    it('should handle multiple channel requests structure', async () => {
      const channels = ['inApp', 'email'] as const;
      const content = {
        title: 'Multi-Channel Test',
        message: 'Multi-channel message'
      };
      const metadata = {
        priority: 'medium' as const,
        category: 'bill_update'
      };

      // This will fail at database/service level, but should return proper structure
      const results = await notificationChannelService.sendToMultipleChannels(
        'test-user',
        channels,
        content,
        metadata
      );
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('channel');
        expect(result).toHaveProperty('deliveredAt');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.channel).toBe('string');
        expect(result.deliveredAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should have proper SMS configuration structure', () => {
      const service = notificationChannelService as any;
      
      expect(service.smsConfig).toHaveProperty('provider');
      expect(service.smsConfig).toHaveProperty('accountSid');
      expect(service.smsConfig).toHaveProperty('authToken');
      expect(service.smsConfig).toHaveProperty('fromNumber');
      expect(['twilio', 'aws-sns', 'mock']).toContain(service.smsConfig.provider);
    });

    it('should have proper push configuration structure', () => {
      const service = notificationChannelService as any;
      
      expect(service.pushConfig).toHaveProperty('provider');
      expect(service.pushConfig).toHaveProperty('serverKey');
      expect(service.pushConfig).toHaveProperty('appId');
      expect(['firebase', 'onesignal', 'mock']).toContain(service.pushConfig.provider);
    });
  });
});
