import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationServiceClass } from '../../infrastructure/notifications/notification-service';

/**
 * Unit Tests for NotificationService Core Functionality
 * 
 * These tests focus on the core logic without external dependencies
 * like database connections or actual provider SDKs.
 */

describe('NotificationService Unit Tests', () => {
  let notificationService: NotificationServiceClass;

  beforeEach(() => {
    notificationService = new NotificationServiceClass({
      fallbackToMock: true
    });
  });

  describe('Phone Number Normalization', () => {
    it('should normalize Kenyan phone numbers correctly', () => {
      const service = notificationService as any;
      
      const testCases = [
        { input: '0712345678', expected: '+254712345678' },
        { input: '712345678', expected: '+254712345678' },
        { input: '+254712345678', expected: '+254712345678' },
        { input: '254712345678', expected: '+254712345678' },
        { input: '0722123456', expected: '+254722123456' },
        { input: '0733987654', expected: '+254733987654' },
        { input: '0700000000', expected: '+254700000000' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(service.normalizePhoneNumber(input)).toBe(expected);
      });
    });

    it('should handle international numbers', () => {
      const service = notificationService as any;
      
      expect(service.normalizePhoneNumber('+1234567890')).toBe('+1234567890');
      expect(service.normalizePhoneNumber('1234567890')).toBe('+1234567890');
    });
  });

  describe('Phone Number Masking', () => {
    it('should mask phone numbers for privacy', () => {
      const service = notificationService as any;
      
      const testCases = [
        { input: '+254712345678', expected: '+254***78' },
        { input: '0712345678', expected: '0712***78' },
        { input: '712345678', expected: '7123***78' },
        { input: '123', expected: '123' }, // Short numbers unchanged
        { input: '1234', expected: '1234' } // 4 chars or less unchanged
      ];

      testCases.forEach(({ input, expected }) => {
        expect(service.maskPhoneNumber(input)).toBe(expected);
      });
    });
  });

  describe('Firebase Data Sanitization', () => {
    it('should sanitize Firebase data payload correctly', () => {
      const service = notificationService as any;
      
      const testData = {
        stringValue: 'test',
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
        objectValue: { nested: 'object' },
        arrayValue: ['item1', 'item2'],
        emptyString: '',
        zeroNumber: 0,
        falseBoolean: false
      };

      const sanitized = service.sanitizeFirebaseData(testData);

      expect(sanitized).toEqual({
        stringValue: 'test',
        numberValue: '123',
        booleanValue: 'true',
        objectValue: '[object Object]',
        arrayValue: 'item1,item2',
        emptyString: '',
        zeroNumber: '0',
        falseBoolean: 'false'
      });

      // Null and undefined should be excluded
      expect(sanitized).not.toHaveProperty('nullValue');
      expect(sanitized).not.toHaveProperty('undefinedValue');
    });
  });

  describe('SMS Message Formatting', () => {
    it('should format SMS messages with priority prefixes', () => {
      const service = notificationService as any;
      
      const urgentRequest = {
        user_id: 'test-user',
        channel: 'sms' as const,
        content: {
          title: 'Emergency Alert',
          message: 'Parliament session cancelled.'
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

    it('should handle message truncation', () => {
      const service = notificationService as any;
      
      const longRequest = {
        user_id: 'test-user',
        channel: 'sms' as const,
        content: {
          title: 'Very Long Bill Title That Would Normally Exceed SMS Character Limits',
          message: 'This is a very detailed message about a complex legislative matter that requires immediate attention from citizens and stakeholders.'
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
    });

    it('should include URLs when space permits', () => {
      const service = notificationService as any;
      
      const requestWithUrl = {
        user_id: 'test-user',
        channel: 'sms' as const,
        content: {
          title: 'Bill Alert',
          message: 'New bill published.'
        },
        metadata: {
          actionUrl: 'https://chanuka.co.ke/bill/123'
        },
        config: {
          sms: {
            shortFormat: true,
            maxLength: 160
          }
        }
      };

      const message = service.formatSMSMessage(requestWithUrl);
      
      expect(message.length).toBeLessThanOrEqual(160);
      // URL should be included if there's space
      if (message.includes('https://')) {
        expect(message).toContain('chanuka.co.ke');
      }
    });

    it('should handle different priority levels', () => {
      const service = notificationService as any;
      
      const priorities = [
        { priority: 'low', expectedPrefix: '' },
        { priority: 'medium', expectedPrefix: '' },
        { priority: 'high', expectedPrefix: '[HIGH PRIORITY]' },
        { priority: 'urgent', expectedPrefix: '[URGENT]' }
      ];

      priorities.forEach(({ priority, expectedPrefix }) => {
        const request = {
          user_id: 'test-user',
          channel: 'sms' as const,
          content: { title: 'Test', message: 'Test message' },
          metadata: { priority: priority as any },
          config: { sms: { shortFormat: true, maxLength: 160 } }
        };

        const message = service.formatSMSMessage(request);
        
        if (expectedPrefix) {
          expect(message).toContain(expectedPrefix);
        } else {
          expect(message).not.toContain('[');
        }
      });
    });
  });

  describe('Push Notification Payload Formatting', () => {
    it('should format push payload correctly', () => {
      const service = notificationService as any;
      
      const request = {
        user_id: 'test-user',
        channel: 'push' as const,
        content: {
          title: 'Bill Update',
          message: 'The Education Bill has been updated.'
        },
        metadata: {
          priority: 'high' as const,
          relatedBillId: 123,
          category: 'bill_update',
          actionUrl: 'https://chanuka.co.ke/bills/education-2024'
        }
      };

      const payload = service.formatPushPayload(request);

      // Check basic structure
      expect(payload.title).toBe('Bill Update');
      expect(payload.body).toBe('The Education Bill has been updated.');
      expect(payload.data.priority).toBe('high');
      expect(payload.data.bill_id).toBe('123');
      expect(payload.data.actionUrl).toBe('https://chanuka.co.ke/bills/education-2024');

      // Check platform-specific configurations
      expect(payload.android.priority).toBe('high');
      expect(payload.apns.payload.aps.sound).toBe('default');
      expect(payload.webpush.notification.icon).toBe('/icon-192x192.png');
    });

    it('should handle custom push configuration', () => {
      const service = notificationService as any;
      
      const request = {
        user_id: 'test-user',
        channel: 'push' as const,
        content: {
          title: 'Custom Notification',
          message: 'Testing custom settings'
        },
        config: {
          push: {
            sound: false,
            vibration: false,
            badge: 5,
            icon: 'custom-icon'
          }
        }
      };

      const payload = service.formatPushPayload(request);

      expect(payload.android.notification.sound).toBeUndefined();
      expect(payload.android.notification.icon).toBe('custom-icon');
      expect(payload.apns.payload.aps.badge).toBe(5);
      expect(payload.webpush.notification.vibrate).toBeUndefined();
    });

    it('should handle different priority levels for push', () => {
      const service = notificationService as any;
      
      const priorities = [
        { priority: 'low', expectedAndroid: 'normal' },
        { priority: 'medium', expectedAndroid: 'normal' },
        { priority: 'high', expectedAndroid: 'high' },
        { priority: 'urgent', expectedAndroid: 'high' }
      ];

      priorities.forEach(({ priority, expectedAndroid }) => {
        const request = {
          user_id: 'test-user',
          channel: 'push' as const,
          content: { title: 'Test', message: 'Test' },
          metadata: { priority: priority as any }
        };

        const payload = service.formatPushPayload(request);
        expect(payload.android.priority).toBe(expectedAndroid);
      });
    });
  });

  describe('Error Classification', () => {
    it('should identify retryable AWS errors', () => {
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
        { code: 'InvalidPhoneNumber' },
        { message: 'Invalid credentials' }
      ];

      retryableErrors.forEach(error => {
        expect(service.isAWSRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(service.isAWSRetryableError(error)).toBe(false);
      });
    });

    it('should identify retryable Firebase errors', () => {
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
        { code: 'messaging/invalid-registration-token' },
        { code: 'messaging/registration-token-not-registered' }
      ];

      retryableErrors.forEach(error => {
        expect(service.isFirebaseRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(service.isFirebaseRetryableError(error)).toBe(false);
      });
    });
  });

  describe('Service Configuration', () => {
    it('should initialize with default configuration', () => {
      const service = new NotificationServiceClass();
      const status = service.getStatus();
      
      expect(status).toHaveProperty('smsProvider');
      expect(status).toHaveProperty('pushProvider');
      expect(status).toHaveProperty('fallbackMode');
      expect(status).toHaveProperty('awsInitialized');
      expect(status).toHaveProperty('firebaseInitialized');
    });

    it('should handle custom configuration', () => {
      const customConfig = {
        aws: {
          region: 'eu-west-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        },
        firebase: {
          projectId: 'custom-project',
          privateKey: 'custom-key',
          clientEmail: 'custom@test.com'
        },
        fallbackToMock: false
      };

      const service = new NotificationServiceClass(customConfig);
      const status = service.getStatus();
      
      expect(status.fallbackMode).toBe(false);
    });

    it('should handle missing credentials gracefully', () => {
      const serviceWithoutCreds = new NotificationServiceClass({
        aws: { region: 'us-east-1' },
        firebase: { projectId: '' },
        fallbackToMock: true
      });

      const status = serviceWithoutCreds.getStatus();
      expect(status.fallbackMode).toBe(true);
    });
  });

  describe('Token Filtering', () => {
    it('should filter mock tokens correctly', () => {
      const tokens = [
        'valid-fcm-token-1',
        'mock-token-user-123',
        'valid-fcm-token-2',
        'mock-token-user-456',
        'another-valid-token'
      ];

      const validTokens = tokens.filter(token => !token.startsWith('mock-token-'));
      
      expect(validTokens).toHaveLength(3);
      expect(validTokens).toEqual([
        'valid-fcm-token-1',
        'valid-fcm-token-2',
        'another-valid-token'
      ]);
    });
  });

  describe('Service Cleanup', () => {
    it('should cleanup resources without errors', () => {
      const service = new NotificationServiceClass({ fallbackToMock: true });
      
      expect(() => service.cleanup()).not.toThrow();
    });

    it('should handle cleanup with null providers', () => {
      const service = new NotificationServiceClass({ fallbackToMock: true });
      
      // Simulate null providers
      (service as any).snsClient = null;
      (service as any).firebaseApp = null;
      
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  describe('Connectivity Testing', () => {
    it('should test connectivity without actual connections', async () => {
      const service = new NotificationServiceClass({ fallbackToMock: true });
      
      const connectivity = await service.testConnectivity();
      
      expect(connectivity).toHaveProperty('aws');
      expect(connectivity).toHaveProperty('firebase');
      expect(typeof connectivity.aws.connected).toBe('boolean');
      expect(typeof connectivity.firebase.connected).toBe('boolean');
    });
  });
});
