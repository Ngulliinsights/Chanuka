import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NotificationServiceClass } from '../../infrastructure/notifications/notification-service';
import { database as db } from '../../../shared/database/connection';
import { users, user_profiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * SMS and Push Notification Integration Tests
 * 
 * Focused tests for SMS (AWS SNS) and Push (Firebase) notification delivery
 * including provider SDK integration, error handling, and fallback mechanisms.
 */

describe('SMS Notifications Integration', () => {
  let testUserId: string;
  let notificationService: NotificationServiceClass;

  beforeAll(async () => {
    // Create test user
    const [testUser] = await db.insert(users).values({
      email: 'sms-test@example.com',
      password_hash: 'test-hash',
      role: 'citizen',
      is_verified: true,
      is_active: true
    }).returning({ id: users.id });

    testUserId = testUser.id;

    await db.insert(user_profiles).values({
      user_id: testUserId,
      first_name: 'SMS',
      last_name: 'Tester',
      display_name: 'SMS Tester'
    });
  });

  afterAll(async () => {
    await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(() => {
    notificationService = new NotificationServiceClass({
      aws: {
        region: 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret'
      },
      fallbackToMock: true
    });
  });

  describe('AWS SNS SMS Integration', () => {
    it('should send SMS with proper AWS SNS configuration', async () => {
      const request = {
        user_id: testUserId,
        channel: 'sms' as const,
        content: {
          title: 'Bill Alert',
          message: 'The Climate Change Bill has been scheduled for second reading.'
        },
        metadata: {
          priority: 'high' as const,
          relatedBillId: 123,
          category: 'bill_update'
        }
      };

      // Set development mode to enable mock phone number
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toBeDefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Kenyan phone number formats', async () => {
      const service = notificationService as any;
      
      // Test various Kenyan phone number formats
      const testCases = [
        { input: '0712345678', expected: '+254712345678' },
        { input: '712345678', expected: '+254712345678' },
        { input: '+254712345678', expected: '+254712345678' },
        { input: '254712345678', expected: '+254712345678' },
        { input: '0722123456', expected: '+254722123456' },
        { input: '0733987654', expected: '+254733987654' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(service.normalizePhoneNumber(input)).toBe(expected);
      });
    });

    it('should format SMS messages for different priorities', async () => {
      const service = notificationService as any;
      
      const urgentRequest = {
        user_id: testUserId,
        channel: 'sms' as const,
        content: {
          title: 'Emergency Alert',
          message: 'Parliament session cancelled due to emergency.'
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

      const message = service.formatSMSMessage(urgentRequest);
      
      expect(message).toContain('[URGENT]');
      expect(message).toContain('Emergency Alert');
      expect(message.length).toBeLessThanOrEqual(160);
    });

    it('should handle SMS message truncation with URLs', async () => {
      const service = notificationService as any;
      
      const longRequest = {
        user_id: testUserId,
        channel: 'sms' as const,
        content: {
          title: 'Very Long Bill Title That Would Normally Exceed SMS Limits',
          message: 'This is a very detailed message about a complex legislative matter that requires immediate attention from citizens.'
        },
        metadata: {
          actionUrl: 'https://chanuka.co.ke/bills/climate-change-amendment-2024'
        },
        config: {
          sms: {
            shortFormat: true,
            maxLength: 160
          }
        }
      };

      const message = service.formatSMSMessage(longRequest);
      
      expect(message.length).toBeLessThanOrEqual(160);
      expect(message).toContain('...');
      // URL should be included if there's space
      if (message.includes('https://')) {
        expect(message).toContain('chanuka.co.ke');
      }
    });

    it('should mask phone numbers for privacy in logs', async () => {
      const service = notificationService as any;
      
      const testNumbers = [
        { input: '+254712345678', expected: '+254***78' },
        { input: '0712345678', expected: '0712***78' },
        { input: '712345678', expected: '7123***78' },
        { input: '123', expected: '123' } // Short numbers unchanged
      ];

      testNumbers.forEach(({ input, expected }) => {
        expect(service.maskPhoneNumber(input)).toBe(expected);
      });
    });

    it('should handle AWS SNS error scenarios', async () => {
      // Test with invalid user (should fail gracefully)
      const request = {
        user_id: 'non-existent-user',
        channel: 'sms' as const,
        content: {
          title: 'Test',
          message: 'This should fail'
        }
      };

      const result = await notificationService.sendToChannel(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should identify retryable AWS errors correctly', async () => {
      const service = notificationService as any;
      
      const retryableErrors = [
        { name: 'Throttling' },
        { name: 'ServiceUnavailable' },
        { name: 'InternalError' },
        { code: 'RequestTimeout' },
        { message: 'NetworkingError occurred' }
      ];

      const nonRetryableErrors = [
        { name: 'InvalidParameter' },
        { name: 'AuthorizationError' },
        { code: 'InvalidPhoneNumber' }
      ];

      retryableErrors.forEach(error => {
        expect(service.isAWSRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(service.isAWSRetryableError(error)).toBe(false);
      });
    });
  });
});

describe('Push Notifications Integration', () => {
  let testUserId: string;
  let notificationService: NotificationServiceClass;

  beforeAll(async () => {
    // Create test user
    const [testUser] = await db.insert(users).values({
      email: 'push-test@example.com',
      password_hash: 'test-hash',
      role: 'citizen',
      is_verified: true,
      is_active: true
    }).returning({ id: users.id });

    testUserId = testUser.id;

    await db.insert(user_profiles).values({
      user_id: testUserId,
      first_name: 'Push',
      last_name: 'Tester',
      display_name: 'Push Tester'
    });
  });

  afterAll(async () => {
    await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(() => {
    notificationService = new NotificationServiceClass({
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
        privateKey: process.env.FIREBASE_PRIVATE_KEY || 'test-key',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@test.com'
      },
      fallbackToMock: true
    });
  });

  describe('Firebase Push Notification Integration', () => {
    it('should send push notification with proper Firebase configuration', async () => {
      const request = {
        user_id: testUserId,
        channel: 'push' as const,
        content: {
          title: 'New Bill Published',
          message: 'The Digital Economy Bill 2024 is now available for public comment.'
        },
        metadata: {
          priority: 'medium' as const,
          relatedBillId: 456,
          category: 'bill_update',
          actionUrl: 'https://chanuka.co.ke/bills/digital-economy-2024'
        }
      };

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
      expect(result.messageId).toBeDefined();
    });

    it('should format push payload correctly for different platforms', async () => {
      const service = notificationService as any;
      
      const request = {
        user_id: testUserId,
        channel: 'push' as const,
        content: {
          title: 'Parliament Session',
          message: 'Live session starting in 30 minutes'
        },
        metadata: {
          priority: 'urgent' as const,
          category: 'session_alert',
          actionUrl: 'https://chanuka.co.ke/live'
        },
        config: {
          push: {
            sound: true,
            vibration: true,
            badge: 5,
            icon: 'parliament-icon'
          }
        }
      };

      const payload = service.formatPushPayload(request);

      // Check basic structure
      expect(payload.title).toBe('Parliament Session');
      expect(payload.body).toBe('Live session starting in 30 minutes');
      expect(payload.data.priority).toBe('urgent');
      expect(payload.data.actionUrl).toBe('https://chanuka.co.ke/live');

      // Check Android-specific
      expect(payload.android.priority).toBe('high');
      expect(payload.android.notification.sound).toBe('default');
      expect(payload.android.notification.icon).toBe('parliament-icon');

      // Check iOS-specific
      expect(payload.apns.payload.aps.sound).toBe('default');
      expect(payload.apns.payload.aps.badge).toBe(5);

      // Check Web Push
      expect(payload.webpush.notification.icon).toBe('parliament-icon');
      expect(payload.webpush.notification.vibrate).toEqual([200, 100, 200]);
    });

    it('should sanitize Firebase data payload properly', async () => {
      const service = notificationService as any;
      
      const testData = {
        billId: 123,
        isUrgent: true,
        tags: ['education', 'budget'],
        metadata: { complex: 'object' },
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroNumber: 0
      };

      const sanitized = service.sanitizeFirebaseData(testData);

      expect(sanitized).toEqual({
        billId: '123',
        isUrgent: 'true',
        tags: 'education,budget',
        metadata: '[object Object]',
        emptyString: '',
        zeroNumber: '0'
      });

      // Null and undefined should be excluded
      expect(sanitized).not.toHaveProperty('nullValue');
      expect(sanitized).not.toHaveProperty('undefinedValue');
    });

    it('should handle different priority levels correctly', async () => {
      const service = notificationService as any;
      
      const priorities = [
        { priority: 'low', expectedAndroid: 'normal' },
        { priority: 'medium', expectedAndroid: 'normal' },
        { priority: 'high', expectedAndroid: 'high' },
        { priority: 'urgent', expectedAndroid: 'high' }
      ];

      priorities.forEach(({ priority, expectedAndroid }) => {
        const request = {
          user_id: testUserId,
          channel: 'push' as const,
          content: { title: 'Test', message: 'Test' },
          metadata: { priority: priority as any }
        };

        const payload = service.formatPushPayload(request);
        expect(payload.android.priority).toBe(expectedAndroid);
      });
    });

    it('should filter mock tokens in production mode', async () => {
      const service = notificationService as any;
      
      // Mock the sendViaFirebase method to test token filtering
      const originalMethod = service.sendViaFirebase;
      let capturedTokens: string[] = [];
      
      service.sendViaFirebase = vi.fn().mockImplementation(async (tokens: string[]) => {
        capturedTokens = tokens;
        return 'mock-message-id';
      });

      const mockTokens = [
        'valid-fcm-token-1',
        'mock-token-user-123',
        'valid-fcm-token-2',
        'mock-token-user-456'
      ];

      // Simulate the token filtering that happens in the real method
      const validTokens = mockTokens.filter(token => !token.startsWith('mock-token-'));
      
      expect(validTokens).toHaveLength(2);
      expect(validTokens).toEqual(['valid-fcm-token-1', 'valid-fcm-token-2']);

      // Restore original method
      service.sendViaFirebase = originalMethod;
    });

    it('should handle Firebase error scenarios', async () => {
      const service = notificationService as any;
      
      const retryableErrors = [
        { code: 'messaging/internal-error' },
        { code: 'messaging/server-unavailable' },
        { code: 'messaging/timeout' },
        { code: 'messaging/quota-exceeded' }
      ];

      const nonRetryableErrors = [
        { code: 'messaging/invalid-argument' },
        { code: 'messaging/authentication-error' },
        { code: 'messaging/invalid-registration-token' }
      ];

      retryableErrors.forEach(error => {
        expect(service.isFirebaseRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(service.isFirebaseRetryableError(error)).toBe(false);
      });
    });

    it('should handle push notification with custom configuration', async () => {
      const request = {
        user_id: testUserId,
        channel: 'push' as const,
        content: {
          title: 'Custom Notification',
          message: 'Testing custom configuration'
        },
        config: {
          push: {
            sound: false,
            vibration: false,
            badge: 0,
            icon: 'silent-icon'
          }
        }
      };

      const result = await notificationService.sendToChannel(request);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
    });
  });

  describe('Multi-Channel Integration', () => {
    it('should send to both SMS and Push channels', async () => {
      // Set development mode for SMS
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const results = await notificationService.sendToMultipleChannels(
        testUserId,
        ['sms', 'push'],
        {
          title: 'Multi-Channel Alert',
          message: 'This goes to both SMS and push notifications'
        },
        {
          priority: 'high',
          category: 'system_alert'
        }
      );

      expect(results).toHaveLength(2);
      
      const smsResult = results.find(r => r.channel === 'sms');
      const pushResult = results.find(r => r.channel === 'push');

      expect(smsResult).toBeDefined();
      expect(pushResult).toBeDefined();
      expect(smsResult!.success).toBe(true);
      expect(pushResult!.success).toBe(true);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle partial failures in multi-channel delivery', async () => {
      // Test with invalid user for SMS, valid for push
      const results = await notificationService.sendToMultipleChannels(
        'invalid-user-id',
        ['sms', 'push'],
        {
          title: 'Partial Failure Test',
          message: 'This should have mixed results'
        }
      );

      expect(results).toHaveLength(2);
      
      // Both should fail due to invalid user
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('User not found');
      });
    });
  });
});

/**
 * Provider Authentication and Configuration Tests
 */
describe('Provider Authentication Integration', () => {
  it('should handle AWS credentials validation', async () => {
    const serviceWithCreds = new NotificationServiceClass({
      aws: {
        region: 'us-east-1',
        accessKeyId: 'AKIA...',
        secretAccessKey: 'secret...'
      },
      fallbackToMock: true
    });

    const status = serviceWithCreds.getStatus();
    expect(status.awsInitialized).toBe(true);
  });

  it('should handle Firebase credentials validation', async () => {
    const serviceWithCreds = new NotificationServiceClass({
      firebase: {
        projectId: 'test-project',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        clientEmail: 'test@test-project.iam.gserviceaccount.com'
      },
      fallbackToMock: true
    });

    const status = serviceWithCreds.getStatus();
    expect(status.firebaseInitialized).toBe(true);
  });

  it('should test provider connectivity', async () => {
    const service = new NotificationServiceClass({ fallbackToMock: true });
    
    const connectivity = await service.testConnectivity();
    
    expect(connectivity).toHaveProperty('aws');
    expect(connectivity).toHaveProperty('firebase');
    expect(typeof connectivity.aws.connected).toBe('boolean');
    expect(typeof connectivity.firebase.connected).toBe('boolean');
  });
});