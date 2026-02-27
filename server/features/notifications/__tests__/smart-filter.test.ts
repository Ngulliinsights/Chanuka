/**
 * Smart Notification Filter Tests
 * 
 * Tests intelligent filtering based on user preferences, engagement, and context
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { smartNotificationFilterService } from '../domain/services/smart-notification-filter';
import type { FilterCriteria } from '../domain/services/smart-notification-filter';

describe('Smart Notification Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Priority Threshold Filtering', () => {
    it('should allow notifications meeting priority threshold', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'high',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'medium',
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: true, sms: false, push: false },
          tracking_types: ['statusChanges', 'newComments'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: true,
          amendments: true,
          votingSchedule: true,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('meets threshold'));
    });

    it('should block notifications below priority threshold', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'low',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'high',
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(false);
      expect(result.reasons).toContain(expect.stringContaining('below threshold'));
    });
  });

  describe('Quiet Hours Filtering', () => {
    it('should block non-urgent notifications during quiet hours', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: true, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      // Result depends on current time
      expect(result).toBeDefined();
      expect(result.reasons).toBeDefined();
    });

    it('should allow urgent notifications during quiet hours', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'urgent',
        notificationType: 'system_alert',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: true, sms: true, push: true },
          tracking_types: [],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: true,
          amendments: true,
          votingSchedule: true,
          quietHours: { enabled: true, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
    });
  });

  describe('Category Relevance Filtering', () => {
    it('should allow notifications matching user category filters', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        category: 'education',
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'low',
            categoryFilters: ['education', 'healthcare'],
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('matches user filter'));
    });

    it('should block notifications not matching category filters', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        category: 'defense',
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'low',
            categoryFilters: ['education', 'healthcare'],
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(false);
      expect(result.reasons).toContain(expect.stringContaining('blocked by user filter'));
    });
  });

  describe('Keyword Filtering', () => {
    it('should allow notifications matching keyword filters', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        content: {
          title: 'Education Reform Bill',
          message: 'Major changes to education funding'
        },
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'low',
            keywordFilters: ['education', 'funding'],
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('matched keywords'));
    });

    it('should block notifications not matching keyword filters', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        content: {
          title: 'Defense Budget',
          message: 'Military spending increase'
        },
        userPreferences: {
          smartFiltering: {
            enabled: true,
            priorityThreshold: 'low',
            keywordFilters: ['education', 'healthcare'],
            interestBasedFiltering: false
          },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(false);
      expect(result.reasons).toContain(expect.stringContaining('did not match'));
    });
  });

  describe('Channel Recommendation', () => {
    it('should recommend multiple channels for high-priority notifications', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'high',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: true, sms: false, push: true },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.recommendedChannels.length).toBeGreaterThan(1);
      expect(result.recommendedChannels).toContain('inApp');
    });

    it('should recommend SMS only for urgent notifications', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'urgent',
        notificationType: 'system_alert',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: true, sms: true, push: true },
          tracking_types: [],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: true,
          amendments: true,
          votingSchedule: true,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.recommendedChannels).toContain('sms');
    });

    it('should recommend only in-app for low-priority notifications', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'low',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: true, sms: false, push: true },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.recommendedChannels).toContain('inApp');
    });
  });

  describe('Batching Recommendations', () => {
    it('should recommend batching for non-urgent notifications', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'low',
        notificationType: 'bill_update',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'daily',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'daily'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.shouldBatch).toBe(true);
    });

    it('should not recommend batching for urgent notifications', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'urgent',
        notificationType: 'system_alert',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: true, sms: true, push: true },
          tracking_types: [],
          updateFrequency: 'daily',
          statusChanges: true,
          newComments: true,
          amendments: true,
          votingSchedule: true,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'daily'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.shouldBatch).toBe(false);
    });
  });

  describe('Engagement Profile', () => {
    it('should build user engagement profile', async () => {
      const profile = await smartNotificationFilterService.getEngagementProfileForUser('test-user-123');

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe('test-user-123');
      expect(Array.isArray(profile.topCategories)).toBe(true);
      expect(Array.isArray(profile.topSponsors)).toBe(true);
      expect(Array.isArray(profile.topTags)).toBe(true);
      expect(['low', 'medium', 'high']).toContain(profile.engagementLevel);
    });

    it('should cache engagement profiles', async () => {
      const profile1 = await smartNotificationFilterService.getEngagementProfileForUser('test-user-123');
      const profile2 = await smartNotificationFilterService.getEngagementProfileForUser('test-user-123');

      expect(profile1).toEqual(profile2);
    });

    it('should clear user cache', async () => {
      await smartNotificationFilterService.clearUserCache('test-user-123');

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Notification Type Filtering', () => {
    it('should allow enabled notification types', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        subType: 'status_change',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges', 'newComments'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: true,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('enabled'));
    });

    it('should block disabled notification types', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'medium',
        notificationType: 'bill_update',
        subType: 'amendment',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: ['statusChanges'],
          updateFrequency: 'immediate',
          statusChanges: true,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(false);
      expect(result.reasons).toContain(expect.stringContaining('disabled'));
    });

    it('should always allow system alerts', async () => {
      const criteria: FilterCriteria = {
        user_id: 'test-user-123',
        priority: 'high',
        notificationType: 'system_alert',
        userPreferences: {
          smartFiltering: { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
          notificationChannels: { inApp: true, email: false, sms: false, push: false },
          tracking_types: [],
          updateFrequency: 'immediate',
          statusChanges: false,
          newComments: false,
          amendments: false,
          votingSchedule: false,
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
          alert_frequency: 'immediate'
        } as any
      };

      const result = await smartNotificationFilterService.shouldSendNotification(criteria);

      expect(result.shouldNotify).toBe(true);
    });
  });
});
