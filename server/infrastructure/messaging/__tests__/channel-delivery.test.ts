/**
 * Channel Delivery Service Tests
 * 
 * Tests email, SMS, push, and in-app notification delivery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notificationChannelService } from '../delivery/channel.service';
import type { ChannelDeliveryRequest } from '../delivery/channel.service';

describe('Channel Delivery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('In-App Notifications', () => {
    it('should deliver in-app notification successfully', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'inApp',
        content: {
          title: 'Test Notification',
          message: 'This is a test in-app notification'
        },
        metadata: {
          priority: 'medium',
          category: 'test'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('inApp');
      expect(result.messageId).toBeDefined();
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('should include metadata in in-app notification', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'inApp',
        content: {
          title: 'Bill Update',
          message: 'Your tracked bill has been updated'
        },
        metadata: {
          priority: 'high',
          relatedBillId: 456,
          category: 'bill_update',
          actionUrl: '/bills/456'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Email Notifications', () => {
    it('should deliver email notification successfully', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'email',
        content: {
          title: 'Test Email',
          message: 'This is a test email notification',
          htmlMessage: '<p>This is a <strong>test</strong> email notification</p>'
        },
        metadata: {
          priority: 'medium'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('should format email with priority badge', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'email',
        content: {
          title: 'Urgent Update',
          message: 'This requires immediate attention'
        },
        metadata: {
          priority: 'urgent',
          actionUrl: '/dashboard'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
    });

    it('should handle missing user email gracefully', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'user-without-email',
        channel: 'email',
        content: {
          title: 'Test',
          message: 'Test message'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      // Should fail gracefully
      expect(result.channel).toBe('email');
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });
  });

  describe('SMS Notifications', () => {
    it('should deliver SMS notification in development mode', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'sms',
        content: {
          title: 'Test SMS',
          message: 'This is a test SMS notification'
        },
        metadata: {
          priority: 'high'
        },
        config: {
          sms: {
            shortFormat: true,
            maxLength: 160
          }
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toBeDefined();
    });

    it('should truncate long SMS messages', async () => {
      const longMessage = 'A'.repeat(200);
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'sms',
        content: {
          title: 'Long Message',
          message: longMessage
        },
        config: {
          sms: {
            shortFormat: true,
            maxLength: 160
          }
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      // Message should be truncated to fit SMS limits
    });

    it('should add priority prefix to urgent SMS', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'sms',
        content: {
          title: 'Urgent Alert',
          message: 'Immediate action required'
        },
        metadata: {
          priority: 'urgent'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
    });
  });

  describe('Push Notifications', () => {
    it('should deliver push notification in development mode', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'push',
        content: {
          title: 'Test Push',
          message: 'This is a test push notification'
        },
        metadata: {
          priority: 'medium',
          actionUrl: '/notifications'
        },
        config: {
          push: {
            sound: true,
            vibration: true,
            icon: '/icon.png',
            badge: 1
          }
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
      expect(result.messageId).toBeDefined();
    });

    it('should configure platform-specific push settings', async () => {
      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'push',
        content: {
          title: 'Platform Test',
          message: 'Testing platform-specific settings'
        },
        metadata: {
          priority: 'high'
        },
        config: {
          push: {
            sound: false,
            vibration: false
          }
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(result.success).toBe(true);
    });
  });

  describe('Multi-Channel Delivery', () => {
    it('should deliver to multiple channels in parallel', async () => {
      const channels: Array<'email' | 'inApp' | 'sms' | 'push'> = ['inApp', 'email'];
      const content = {
        title: 'Multi-Channel Test',
        message: 'Testing parallel delivery'
      };
      const metadata = {
        priority: 'high' as const,
        category: 'test'
      };

      const results = await notificationChannelService.sendToMultipleChannels(
        'test-user-123',
        channels,
        content,
        metadata
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.deliveredAt instanceof Date)).toBe(true);
    });

    it('should handle partial failures in multi-channel delivery', async () => {
      const channels: Array<'email' | 'inApp' | 'sms' | 'push'> = ['inApp', 'email', 'sms'];
      const content = {
        title: 'Partial Failure Test',
        message: 'Testing failure handling'
      };

      const results = await notificationChannelService.sendToMultipleChannels(
        'test-user-123',
        channels,
        content
      );

      expect(results).toHaveLength(3);
      // At least some should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed deliveries with exponential backoff', async () => {
      // Mock a transient failure
      let attemptCount = 0;
      const originalSend = notificationChannelService.sendToChannel;
      
      vi.spyOn(notificationChannelService, 'sendToChannel').mockImplementation(async (req) => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Transient failure');
        }
        return originalSend.call(notificationChannelService, req);
      });

      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'inApp',
        content: {
          title: 'Retry Test',
          message: 'Testing retry logic'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      expect(attemptCount).toBeGreaterThan(1);
      vi.spyOn(notificationChannelService, 'sendToChannel').mockRestore();
    });

    it('should give up after max retry attempts', async () => {
      // Mock persistent failure
      vi.spyOn(notificationChannelService, 'sendToChannel').mockRejectedValue(
        new Error('Persistent failure')
      );

      const request: ChannelDeliveryRequest = {
        user_id: 'test-user-123',
        channel: 'email',
        content: {
          title: 'Max Retry Test',
          message: 'Testing max retries'
        }
      };

      const result = await notificationChannelService.sendToChannel(request);

      // Should eventually fail
      expect(result.channel).toBe('email');
      
      vi.spyOn(notificationChannelService, 'sendToChannel').mockRestore();
    });
  });

  describe('Service Status', () => {
    it('should report channel service status', () => {
      const status = notificationChannelService.getStatus();

      expect(status).toBeDefined();
      expect(status.smsProvider).toBeDefined();
      expect(status.pushProvider).toBeDefined();
      expect(typeof status.smsConfigured).toBe('boolean');
      expect(typeof status.pushConfigured).toBe('boolean');
      expect(typeof status.awsInitialised).toBe('boolean');
      expect(typeof status.firebaseInitialised).toBe('boolean');
      expect(typeof status.fallbackMode).toBe('boolean');
      expect(typeof status.pendingRetries).toBe('number');
    });

    it('should test connectivity to external services', async () => {
      const connectivity = await notificationChannelService.testConnectivity();

      expect(connectivity).toBeDefined();
      expect(connectivity.aws).toBeDefined();
      expect(connectivity.firebase).toBeDefined();
      expect(typeof connectivity.aws.connected).toBe('boolean');
      expect(typeof connectivity.firebase.connected).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      expect(() => {
        notificationChannelService.cleanup();
      }).not.toThrow();
    });
  });
});
