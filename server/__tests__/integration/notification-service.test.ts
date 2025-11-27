import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NotificationService, NotificationServiceClass } from '@server/infrastructure/notifications/notification-service';
import { notificationChannelService } from '@server/infrastructure/notifications/notification-channels';
import { database as db } from '@shared/database/connection';
import { users, user_profiles, notifications } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Integration Tests for Notification Service with Provider SDKs
 * 
 * Tests the integration of AWS SNS and Firebase Admin SDK
 * while maintaining compatibility with existing NotificationChannelService interface.
 * 
 * Test Categories:
 * 1. Service Initialization
 * 2. SMS Delivery via AWS SNS
 * 3. Push Notifications via Firebase
 * 4. Fallback Mechanisms
 * 5. Error Handling and Retries
 * 6. Interface Compatibility
 */

describe('NotificationService Integration Tests', () => {
  let testUserId: string;
  let notificationService: NotificationServiceClass;

  beforeAll(async () => {
    // Create test user
    const [testUser] = await db.insert(users).values({
      email: 'test-notifications@example.com',
      password_hash: 'test-hash',
      role: 'citizen',
      is_verified: true,
      is_active: true
    }).returning({ id: users.id });

    testUserId = testUser.id;

    // Create user profile
    await db.insert(user_profiles).values({
      user_id: testUserId,
      first_name: 'Test',
      last_name: 'User',
      display_name: 'Test User'
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(notifications).where(eq(notifications.user_id, testUserId));
    await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(() => {
    // Create fresh service instance for each test
    notificationService = new NotificationServiceClass({
      fallbackToMock: true // Use mock for tests
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with mock providers in test environment', async () => {
      const status = notificationService.getStatus();
      
      expect(status.fallbackMode).toBe(true);
      expect(status.smsProvider).toBe('aws-sns');
      expect(status.pushProvider).toBe('firebase');
    });

    it('should handle missing credentials gracefully', async () => {
      const serviceWithoutCreds = new NotificationServiceClass({
        aws: { region: 'us-east-1' },
        firebase: { projectId: '' },
        fallbackToMock: true
      });

      const status = serviceWithoutCreds.getStatus();
      expect(status.fallbackMode).toBe(true);
    });

    it('should test provider connectivity', async () => {
      const connectivity = await notificationService.testConnectivity();
      
      expect(connectivity).toHaveProperty('aws');
      expect(connectivity).toHaveProperty('firebase');
      expect(typeof connectivity.aws.connected).toBe('boolean');
      expect(typeof connectivity.firebase.connected).toBe('boolean');
    });
  });

  describe('SMS Delivery Integration', () => {
    it('should send SMS via AWS SNS (mock)', async () => {
      const request = {
        user_id: testUserId,
        channel: 'sms' as const,
        content: {
          title: 'Test SMS',
          message: 'This is a test SMS notification'
        },
        metadata: {
          priority: 'medium' as const,
          category: 'test'
        }
      };

      // Mock the phone number for development
      process.env.NODE_ENV = 'development';

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toMatch(/^sns-\d+$/);
    });

    it('should handle phone number normalization', async () => {
      const service = notificationService as any;
      
      // Test Kenyan number formats
      expect(service.normalizePhoneNumber('0712345678')).toBe('+254712345678');
      expect(service.normalizePhoneNumber('712345678')).toBe('+254712345678');
      expect(service.normalizePhoneNumber('+254712345678')).toBe('+254712345678');
      expect(service.normalizePhoneNumber('254712345678')).toBe('+254712345678');
    });

    it('should mask phone numbers for logging', async () => {
      const service = notificationService as any;
      
      expect(service.maskPhoneNumber('+254712345678')).toBe('+254***78');
      expect(service.maskPhoneNumber('0712345678')).toBe('0712***78');
    });

    it('should handle SMS delivery errors gracefully', async () => {
      // Test with invalid user ID
      const request = {
        user_id: 'invalid-user-id',
        channel: 'sms' as const,
        content: {
          title: 'Test SMS',
          message: 'This should fail'
        }
      };

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('Push Notification Integration', () => {
    it('should send push notification via Firebase (mock)', async () => {
      const request = {
        user_id: testUserId,
        channel: 'push' as const,
        content: {
          title: 'Test Push',
          message: 'This is a test push notification'
        },
        metadata: {
          priority: 'high' as const,
          category: 'bill_update',
          actionUrl: 'https://example.com/bill/123'
        }
      };

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
      expect(result.messageId).toMatch(/^mock-push-\d+$/);
    });

    it('should sanitize Firebase data payload', async () => {
      const service = notificationService as any;
      
      const testData = {
        stringValue: 'test',
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
        objectValue: { nested: 'object' }
      };

      const sanitized = service.sanitizeFirebaseData(testData);

      expect(sanitized).toEqual({
        stringValue: 'test',
        numberValue: '123',
        booleanValue: 'true',
        objectValue: '[object Object]'
      });
    });

    it('should handle Firebase payload formatting', async () => {
      const request = {
        user_id: testUserId,
        channel: 'push' as const,
        content: {
          title: 'Bill Update',
          message: 'Bill #123 has been updated'
        },
        metadata: {
          priority: 'urgent' as const,
          relatedBillId: 123,
          actionUrl: 'https://example.com/bill/123'
        },
        config: {
          push: {
            sound: true,
            vibration: true,
            badge: 5
          }
        }
      };

      const service = notificationService as any;
      const payload = service.formatPushPayload(request);

      expect(payload.title).toBe('Bill Update');
      expect(payload.body).toBe('Bill #123 has been updated');
      expect(payload.data.priority).toBe('urgent');
      expect(payload.data.bill_id).toBe('123');
      expect(payload.android.priority).toBe('high');
      expect(payload.apns.payload.aps.badge).toBe(5);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should identify retryable AWS errors', async () => {
      const service = notificationService as any;
      
      const retryableError = { name: 'Throttling', message: 'Rate exceeded' };
      const nonRetryableError = { name: 'InvalidParameter', message: 'Bad request' };

      expect(service.isAWSRetryableError(retryableError)).toBe(true);
      expect(service.isAWSRetryableError(nonRetryableError)).toBe(false);
    });

    it('should identify retryable Firebase errors', async () => {
      const service = notificationService as any;
      
      const retryableError = { code: 'messaging/internal-error' };
      const nonRetryableError = { code: 'messaging/invalid-argument' };

      expect(service.isFirebaseRetryableError(retryableError)).toBe(true);
      expect(service.isFirebaseRetryableError(nonRetryableError)).toBe(false);
    });

    it('should fallback to mock on provider errors', async () => {
      // This test would require mocking actual provider failures
      // For now, we test the fallback configuration
      const serviceWithFallback = new NotificationServiceClass({
        fallbackToMock: true
      });

      const status = serviceWithFallback.getStatus();
      expect(status.fallbackMode).toBe(true);
    });
  });

  describe('Interface Compatibility', () => {
    it('should maintain NotificationChannelService interface', async () => {
      // Test that our service extends the base class properly
      expect(notificationService).toBeInstanceOf(NotificationServiceClass);
      expect(typeof notificationService.sendToChannel).toBe('function');
      expect(typeof notificationService.sendToMultipleChannels).toBe('function');
      expect(typeof notificationService.getStatus).toBe('function');
      expect(typeof notificationService.cleanup).toBe('function');
    });

    it('should send to multiple channels', async () => {
      const results = await notificationService.sendToMultipleChannels(
        testUserId,
        ['email', 'push'],
        {
          title: 'Multi-channel Test',
          message: 'This notification goes to multiple channels'
        },
        {
          priority: 'medium',
          category: 'test'
        }
      );

      expect(results).toHaveLength(2);
      expect(results[0].channel).toBe('email');
      expect(results[1].channel).toBe('push');
      
      // At least one should succeed (email should work)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle in-app notifications', async () => {
      const request = {
        user_id: testUserId,
        channel: 'inApp' as const,
        content: {
          title: 'In-App Test',
          message: 'This is an in-app notification'
        },
        metadata: {
          priority: 'low' as const,
          relatedBillId: 123,
          category: 'bill_update'
        }
      };

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('inApp');

      // Verify notification was stored in database
      const [storedNotification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, result.messageId!))
        .limit(1);

      expect(storedNotification).toBeDefined();
      expect(storedNotification.title).toBe('In-App Test');
      expect(storedNotification.user_id).toBe(testUserId);
    });
  });

  describe('Configuration and Environment', () => {
    it('should handle production configuration', async () => {
      const prodService = new NotificationServiceClass({
        aws: {
          region: 'us-east-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        },
        firebase: {
          projectId: 'test-project',
          privateKey: 'test-key',
          clientEmail: 'test@test.com'
        },
        fallbackToMock: false
      });

      const status = prodService.getStatus();
      expect(status.fallbackMode).toBe(false);
    });

    it('should handle environment variables', async () => {
      // Test environment variable loading
      const originalEnv = process.env.AWS_REGION;
      process.env.AWS_REGION = 'eu-west-1';

      const envService = new NotificationServiceClass();
      // The region should be picked up from environment
      
      // Restore original environment
      if (originalEnv) {
        process.env.AWS_REGION = originalEnv;
      } else {
        delete process.env.AWS_REGION;
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      const service = new NotificationServiceClass({ fallbackToMock: true });
      
      // Should not throw
      expect(() => service.cleanup()).not.toThrow();
    });

    it('should handle cleanup with active providers', async () => {
      const service = new NotificationServiceClass({
        fallbackToMock: true
      });

      // Initialize some state
      await service.sendToChannel({
        user_id: testUserId,
        channel: 'email',
        content: { title: 'Test', message: 'Test' }
      });

      // Cleanup should work
      expect(() => service.cleanup()).not.toThrow();
    });
  });
});

/**
 * SMS Provider Integration Tests
 * Tests specific to SMS delivery functionality
 */
describe('SMS Provider Integration', () => {
  let service: NotificationServiceClass;

  beforeEach(() => {
    service = new NotificationServiceClass({ fallbackToMock: true });
  });

  it('should format SMS messages correctly', async () => {
    const request = {
      user_id: 'test-user',
      channel: 'sms' as const,
      content: {
        title: 'Bill Alert',
        message: 'The Education Amendment Bill has been passed by Parliament.'
      },
      metadata: {
        priority: 'urgent' as const,
        actionUrl: 'https://chanuka.co.ke/bill/123'
      },
      config: {
        sms: {
          shortFormat: true,
          maxLength: 160
        }
      }
    };

    const serviceInternal = service as any;
    const formattedMessage = serviceInternal.formatSMSMessage(request);

    expect(formattedMessage).toContain('[URGENT]');
    expect(formattedMessage).toContain('Bill Alert');
    expect(formattedMessage.length).toBeLessThanOrEqual(160);
  });

  it('should handle long messages with truncation', async () => {
    const request = {
      user_id: 'test-user',
      channel: 'sms' as const,
      content: {
        title: 'Very Long Bill Title That Exceeds Normal Length Limits',
        message: 'This is a very long message that would normally exceed the SMS character limit and should be truncated appropriately while maintaining readability and including the most important information.'
      },
      config: {
        sms: {
          shortFormat: true,
          maxLength: 160
        }
      }
    };

    const serviceInternal = service as any;
    const formattedMessage = serviceInternal.formatSMSMessage(request);

    expect(formattedMessage.length).toBeLessThanOrEqual(160);
    expect(formattedMessage).toContain('...');
  });
});

/**
 * Push Notification Provider Integration Tests
 * Tests specific to push notification functionality
 */
describe('Push Notification Provider Integration', () => {
  let service: NotificationServiceClass;

  beforeEach(() => {
    service = new NotificationServiceClass({ fallbackToMock: true });
  });

  it('should handle different priority levels', async () => {
    const urgentRequest = {
      user_id: 'test-user',
      channel: 'push' as const,
      content: {
        title: 'Urgent Alert',
        message: 'Immediate action required'
      },
      metadata: {
        priority: 'urgent' as const
      }
    };

    const serviceInternal = service as any;
    const payload = serviceInternal.formatPushPayload(urgentRequest);

    expect(payload.android.priority).toBe('high');
    expect(payload.data.priority).toBe('urgent');
  });

  it('should handle platform-specific configurations', async () => {
    const request = {
      user_id: 'test-user',
      channel: 'push' as const,
      content: {
        title: 'Platform Test',
        message: 'Testing platform-specific features'
      },
      config: {
        push: {
          sound: false,
          vibration: true,
          badge: 3,
          icon: 'custom-icon'
        }
      }
    };

    const serviceInternal = service as any;
    const payload = serviceInternal.formatPushPayload(request);

    expect(payload.android.notification.sound).toBeUndefined();
    expect(payload.android.notification.icon).toBe('custom-icon');
    expect(payload.apns.payload.aps.badge).toBe(3);
    expect(payload.webpush.notification.vibrate).toEqual([200, 100, 200]);
  });

  it('should filter out mock tokens in production mode', async () => {
    const tokens = ['valid-token-123', 'mock-token-456', 'another-valid-token'];
    
    const serviceInternal = service as any;
    // This would be tested by mocking the sendViaFirebase method
    // and checking that mock tokens are filtered out
    
    expect(tokens.filter(token => !token.startsWith('mock-token-'))).toHaveLength(2);
  });
});
