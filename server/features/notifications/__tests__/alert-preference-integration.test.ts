/**
 * Alert Preference Integration Tests
 * 
 * Tests the complete alert preference flow including:
 * - CRUD operations
 * - Smart filtering
 * - Delivery orchestration
 * - Analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertPreferenceManagementService } from '../application/services/alert-preference-management.service';
import { alertDeliveryService } from '../application/services/alert-delivery.service';
import { alertPreferenceDomainService } from '../domain/services/alert-preference-domain.service';
import type { AlertPreference, AlertType, Priority } from '../domain/entities/alert-preference';

describe('Alert Preference Integration', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Clear any cached data
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should create a new alert preference', async () => {
      const preferenceData = {
        name: 'Test Alerts',
        description: 'Test alert preferences',
        is_active: true,
        alertTypes: [
          {
            type: 'bill_status_change' as AlertType,
            enabled: true,
            priority: 'normal' as Priority
          }
        ],
        channels: [
          {
            type: 'in_app' as const,
            enabled: true,
            config: { verified: true },
            priority: 'normal' as Priority
          }
        ],
        frequency: {
          type: 'immediate' as const
        },
        smartFiltering: {
          enabled: true,
          user_interestWeight: 0.6,
          engagementHistoryWeight: 0.3,
          trendingWeight: 0.1,
          duplicateFiltering: true,
          spamFiltering: true,
          minimumConfidence: 0.3
        }
      };

      const preference = await alertPreferenceManagementService.createAlertPreference(
        testUserId,
        preferenceData
      );

      expect(preference).toBeDefined();
      expect(preference.id).toBeDefined();
      expect(preference.user_id).toBe(testUserId);
      expect(preference.name).toBe('Test Alerts');
      expect(preference.is_active).toBe(true);
    });

    it('should retrieve user alert preferences', async () => {
      const preferences = await alertPreferenceManagementService.getUserAlertPreferences(testUserId);

      expect(preferences).toBeDefined();
      expect(Array.isArray(preferences)).toBe(true);
    });

    it('should update an alert preference', async () => {
      // First create a preference
      const created = await alertPreferenceManagementService.createAlertPreference(
        testUserId,
        {
          name: 'Original Name',
          is_active: true,
          alertTypes: [
            {
              type: 'bill_status_change' as AlertType,
              enabled: true,
              priority: 'normal' as Priority
            }
          ],
          channels: [
            {
              type: 'in_app' as const,
              enabled: true,
              config: { verified: true },
              priority: 'normal' as Priority
            }
          ],
          frequency: { type: 'immediate' as const },
          smartFiltering: {
            enabled: true,
            user_interestWeight: 0.6,
            engagementHistoryWeight: 0.3,
            trendingWeight: 0.1,
            duplicateFiltering: true,
            spamFiltering: true,
            minimumConfidence: 0.3
          }
        }
      );

      // Update it
      const updated = await alertPreferenceManagementService.updateAlertPreference(
        testUserId,
        created.id,
        { name: 'Updated Name', is_active: false }
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.is_active).toBe(false);
    });

    it('should delete an alert preference', async () => {
      // Create a preference
      const created = await alertPreferenceManagementService.createAlertPreference(
        testUserId,
        {
          name: 'To Delete',
          is_active: true,
          alertTypes: [
            {
              type: 'bill_status_change' as AlertType,
              enabled: true,
              priority: 'normal' as Priority
            }
          ],
          channels: [
            {
              type: 'in_app' as const,
              enabled: true,
              config: { verified: true },
              priority: 'normal' as Priority
            }
          ],
          frequency: { type: 'immediate' as const },
          smartFiltering: {
            enabled: true,
            user_interestWeight: 0.6,
            engagementHistoryWeight: 0.3,
            trendingWeight: 0.1,
            duplicateFiltering: true,
            spamFiltering: true,
            minimumConfidence: 0.3
          }
        }
      );

      // Delete it
      await alertPreferenceManagementService.deleteAlertPreference(testUserId, created.id);

      // Verify it's gone
      const preference = await alertPreferenceManagementService.getAlertPreference(
        testUserId,
        created.id
      );
      expect(preference).toBeNull();
    });
  });

  describe('Domain Service', () => {
    it('should validate preference correctly', () => {
      const validPreference: AlertPreference = {
        id: 'test-id',
        user_id: testUserId,
        name: 'Valid Preference',
        is_active: true,
        alertTypes: [
          {
            type: 'bill_status_change',
            enabled: true,
            priority: 'normal'
          }
        ],
        channels: [
          {
            type: 'in_app',
            enabled: true,
            config: { verified: true },
            priority: 'normal'
          }
        ],
        frequency: { type: 'immediate' },
        smartFiltering: {
          enabled: true,
          user_interestWeight: 0.6,
          engagementHistoryWeight: 0.3,
          trendingWeight: 0.1,
          duplicateFiltering: true,
          spamFiltering: true,
          minimumConfidence: 0.3
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = alertPreferenceDomainService.validatePreference(validPreference);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid preference', () => {
      const invalidPreference: AlertPreference = {
        id: 'test-id',
        user_id: testUserId,
        name: '', // Invalid: empty name
        is_active: true,
        alertTypes: [], // Invalid: no alert types
        channels: [], // Invalid: no channels
        frequency: { type: 'immediate' },
        smartFiltering: {
          enabled: true,
          user_interestWeight: 0.6,
          engagementHistoryWeight: 0.3,
          trendingWeight: 0.1,
          duplicateFiltering: true,
          spamFiltering: true,
          minimumConfidence: 0.3
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = alertPreferenceDomainService.validatePreference(invalidPreference);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should get channels for priority correctly', () => {
      const preference: AlertPreference = {
        id: 'test-id',
        user_id: testUserId,
        name: 'Test',
        is_active: true,
        alertTypes: [
          {
            type: 'bill_status_change',
            enabled: true,
            priority: 'normal'
          }
        ],
        channels: [
          {
            type: 'in_app',
            enabled: true,
            config: { verified: true },
            priority: 'low'
          },
          {
            type: 'email',
            enabled: true,
            config: { email: 'test@example.com', verified: true },
            priority: 'normal'
          },
          {
            type: 'push',
            enabled: true,
            config: { pushToken: 'token', verified: true },
            priority: 'high'
          }
        ],
        frequency: { type: 'immediate' },
        smartFiltering: {
          enabled: true,
          user_interestWeight: 0.6,
          engagementHistoryWeight: 0.3,
          trendingWeight: 0.1,
          duplicateFiltering: true,
          spamFiltering: true,
          minimumConfidence: 0.3
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      // Urgent should get all channels
      const urgentChannels = alertPreferenceDomainService.getChannelsForPriority(
        preference,
        'urgent'
      );
      expect(urgentChannels).toHaveLength(3);

      // High should get normal and high priority channels
      const highChannels = alertPreferenceDomainService.getChannelsForPriority(
        preference,
        'high'
      );
      expect(highChannels.length).toBeGreaterThanOrEqual(2);

      // Normal should get normal priority channels
      const normalChannels = alertPreferenceDomainService.getChannelsForPriority(
        preference,
        'normal'
      );
      expect(normalChannels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Alert Delivery', () => {
    it('should process alert delivery successfully', async () => {
      const result = await alertDeliveryService.processAlertDelivery({
        user_id: testUserId,
        alertType: 'bill_status_change',
        alertData: {
          title: 'Bill Status Changed',
          message: 'The Healthcare Reform Bill has been passed',
          bill_id: 123,
          billCategory: 'healthcare'
        },
        originalPriority: 'normal'
      });

      expect(result).toBeDefined();
      expect(result.deliveryLogs).toBeDefined();
      expect(Array.isArray(result.deliveryLogs)).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('should get alert preference statistics', async () => {
      const stats = await alertPreferenceManagementService.getAlertPreferenceStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalPreferences).toBeDefined();
      expect(stats.activePreferences).toBeDefined();
      expect(stats.deliveryStats).toBeDefined();
      expect(stats.channelStats).toBeDefined();
    });

    it('should get delivery logs with pagination', async () => {
      const result = await alertPreferenceManagementService.getDeliveryLogs(testUserId, {
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });
});
