/**
 * PersonaDetector Unit Tests
 *
 * Tests for persona classification logic
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { UserActivity } from '../../lib/types/analytics';
import type { User } from '../auth/types';

import { PersonaDetector } from './persona-detector';
import type { PersonaDetectionConfig, UserPersonaProfile } from './types';

describe('PersonaDetector', () => {
  let detector: PersonaDetector;
  let mockUser: User;
  let mockActivity: UserActivity[];

  beforeEach(() => {
    detector = new PersonaDetector();

    mockUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verified: true,
      twoFactorEnabled: false,
      preferences: {
        notifications: true,
        emailAlerts: true,
        theme: 'light',
        language: 'en',
      },
      permissions: [],
      lastLogin: '2024-01-01T00:00:00Z',
      createdAt: '2023-12-01T00:00:00Z',
      login_count: 5,
    };

    mockActivity = [];
  });

  describe('detectPersona', () => {
    it('should classify new user as novice', async () => {
      const newUser = {
        ...mockUser,
        login_count: 1,
        createdAt: new Date().toISOString(),
      };

      const result = await detector.detectPersona(newUser, []);

      expect(result.type).toBe('novice');
      expect(result.confidence).toBeLessThan(0.7); // Low confidence for new user
      expect(result.reasons).toContain('New user - classification based on account type');
    });

    it('should classify expert role user as intermediate initially', async () => {
      const expertUser = {
        ...mockUser,
        role: 'expert' as const,
        login_count: 1,
      };

      const result = await detector.detectPersona(expertUser, []);

      expect(result.type).toBe('intermediate');
      expect(result.reasons).toContain('New user - classification based on account type');
    });

    it('should classify user as novice with minimal activity', async () => {
      const minimalActivity: UserActivity[] = [
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-01T10:00:00Z',
          action: 'view',
          target_type: 'bill',
          target_id: 'bill-1',
          metadata: {},
          duration: 60000, // 1 minute
        },
      ];

      const result = await detector.detectPersona(mockUser, minimalActivity);

      expect(result.type).toBe('novice');
      expect(result.suggestedFeatures).toContain('Getting started guide');
      expect(result.nextLevelRequirements).toBeDefined();
    });

    it('should classify user as intermediate with moderate activity', async () => {
      const moderateUser = {
        ...mockUser,
        login_count: 10,
      };

      const moderateActivity: UserActivity[] = [
        // Multiple bill views
        ...Array.from({ length: 8 }, (_, i) => ({
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: `2024-01-0${(i % 9) + 1}T10:00:00Z`,
          action: 'view' as const,
          target_type: 'bill' as const,
          target_id: `bill-${i + 1}`,
          metadata: {},
          duration: 180000, // 3 minutes each
        })),
        // Some comments
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-05T10:00:00Z',
          action: 'comment',
          target_type: 'bill',
          target_id: 'bill-1',
          metadata: {},
          duration: 30000,
        },
        // Some searches
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-06T10:00:00Z',
          action: 'search',
          target_type: 'bill',
          target_id: 'search-1',
          metadata: {},
          duration: 10000,
        },
        // Bookmarks
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-07T10:00:00Z',
          action: 'bookmark',
          target_type: 'bill',
          target_id: 'bill-2',
          metadata: {},
          duration: 5000,
        },
      ];

      const result = await detector.detectPersona(moderateUser, moderateActivity);

      expect(result.type).toBe('intermediate');
      expect(result.suggestedFeatures).toContain('Bill tracking dashboard');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify user as expert with advanced activity', async () => {
      const expertUser = {
        ...mockUser,
        login_count: 25,
        role: 'expert' as const,
      };

      const expertActivity: UserActivity[] = [
        // Many bill views with long duration
        ...Array.from({ length: 15 }, (_, i) => ({
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
          action: 'view' as const,
          target_type: 'bill' as const,
          target_id: `bill-${i + 1}`,
          metadata: { full_text_read: true },
          duration: 600000, // 10 minutes each
        })),
        // Advanced filter usage
        ...Array.from({ length: 12 }, (_, i) => ({
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T11:00:00Z`,
          action: 'search' as const,
          target_type: 'bill' as const,
          target_id: `search-${i + 1}`,
          metadata: { advanced_filter: true },
          duration: 30000,
        })),
        // Expert contributions
        ...Array.from({ length: 5 }, (_, i) => ({
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
          action: 'share' as const,
          target_type: 'bill' as const,
          target_id: `bill-${i + 1}`,
          metadata: {
            expert_insight: true,
            verification_contribution: true,
          },
          duration: 120000,
        })),
        // Analytics views
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-15T13:00:00Z',
          action: 'view',
          target_type: 'analytics',
          target_id: 'dashboard-1',
          metadata: {},
          duration: 300000,
        },
      ];

      const result = await detector.detectPersona(expertUser, expertActivity);

      expect(result.type).toBe('expert');
      expect(result.suggestedFeatures).toContain('Advanced analytics dashboard');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.nextLevelRequirements).toBeUndefined(); // Already at highest level
    });

    it('should maintain consistency with existing profile', async () => {
      const existingProfile: UserPersonaProfile = {
        userId: 'test-user-1',
        currentPersona: 'intermediate',
        confidence: 0.8,
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        metrics: {} as any,
        preferences: {} as any,
        history: [],
      };

      // Activity that might suggest novice but with low confidence
      const ambiguousActivity: UserActivity[] = [
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-01T10:00:00Z',
          action: 'view',
          target_type: 'bill',
          target_id: 'bill-1',
          metadata: {},
          duration: 30000,
        },
      ];

      const result = await detector.detectPersona(mockUser, ambiguousActivity, existingProfile);

      // Should maintain existing persona due to consistency check
      expect(result.type).toBe('intermediate');
      expect(result.reasons).toContain(
        'Maintaining current persona - insufficient confidence for change'
      );
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return novice preferences', () => {
      const prefs = detector.getDefaultPreferences('novice');

      expect(prefs.defaultView).toBe('cards');
      expect(prefs.contentComplexity).toBe('simple');
      expect(prefs.showAdvancedFeatures).toBe(false);
      expect(prefs.enableExpertMode).toBe(false);
    });

    it('should return intermediate preferences', () => {
      const prefs = detector.getDefaultPreferences('intermediate');

      expect(prefs.defaultView).toBe('list');
      expect(prefs.contentComplexity).toBe('detailed');
      expect(prefs.showAdvancedFeatures).toBe(true);
      expect(prefs.enableExpertMode).toBe(false);
    });

    it('should return expert preferences', () => {
      const prefs = detector.getDefaultPreferences('expert');

      expect(prefs.defaultView).toBe('grid');
      expect(prefs.contentComplexity).toBe('technical');
      expect(prefs.showAdvancedFeatures).toBe(true);
      expect(prefs.enableExpertMode).toBe(true);
    });
  });

  describe('custom configuration', () => {
    it('should use custom thresholds', async () => {
      const customConfig: Partial<PersonaDetectionConfig> = {
        thresholds: {
          novice: {
            maxLoginCount: 3, // Lower threshold
            maxDaysActive: 3,
            maxBillsViewed: 2,
            maxAdvancedFeatureUsage: 1,
          },
          intermediate: {
            minLoginCount: 2,
            minDaysActive: 2,
            minBillsViewed: 2,
            minEngagementActions: 3,
            maxExpertFeatureUsage: 5,
          },
          expert: {
            minLoginCount: 10,
            minDaysActive: 7,
            minAdvancedFeatureUsage: 5,
            minExpertContributions: 2,
          },
        },
      };

      const customDetector = new PersonaDetector(customConfig);

      const moderateUser = {
        ...mockUser,
        login_count: 4, // Would be novice with default config, intermediate with custom
      };

      const result = await customDetector.detectPersona(moderateUser, []);

      // With custom lower thresholds, this should be classified differently
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty activity history', async () => {
      const result = await detector.detectPersona(mockUser, []);

      expect(result.type).toBe('novice');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle user with no login count', async () => {
      const userWithoutLoginCount = {
        ...mockUser,
        login_count: undefined,
      };

      const result = await detector.detectPersona(userWithoutLoginCount, []);

      expect(result).toBeDefined();
      expect(result.type).toBe('novice');
    });

    it('should handle malformed activity data', async () => {
      const malformedActivity: UserActivity[] = [
        {
          user_id: 'test-user-1',
          session_id: 'session-1',
          timestamp: '2024-01-01T10:00:00Z',
          action: 'view',
          target_type: 'bill',
          target_id: 'bill-1',
          metadata: {},
          // Missing duration
        },
      ];

      const result = await detector.detectPersona(mockUser, malformedActivity);

      expect(result).toBeDefined();
      expect(['novice', 'intermediate', 'expert']).toContain(result.type);
    });
  });
});
