/**
 * User Transformer Round-Trip Tests
 * Verifies that transformers preserve all fields during round-trip transformations
 * 
 * Requirements: 2.1, 2.2, 2.4
 */

import { describe, it, expect } from 'vitest';
import {
  userProfileDbToDomain,
  userPreferencesDbToDomain,
} from './entities/user';
import type { UserProfileTable, UserPreferencesTable } from '../../types/database/tables';
import type { UserId } from '../../types/core/branded';
import { AnonymityLevel } from '../../types/core/enums';

describe('User Transformer Round-Trip', () => {
  describe('UserProfile Transformer', () => {
    it('should preserve userId in round-trip transformation', () => {
      const dbProfile: UserProfileTable = {
        user_id: 'user-123' as UserId,
        display_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.jpg',
        anonymity_level: AnonymityLevel.PUBLIC,
        is_public: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainProfile = userProfileDbToDomain.transform(dbProfile);
      const reversedProfile = userProfileDbToDomain.reverse(domainProfile);

      expect(reversedProfile.user_id).toBe(dbProfile.user_id);
    });

    it('should preserve createdAt in round-trip transformation', () => {
      const dbProfile: UserProfileTable = {
        user_id: 'user-123' as UserId,
        display_name: 'John Doe',
        first_name: null,
        last_name: null,
        bio: null,
        avatar_url: null,
        anonymity_level: AnonymityLevel.PUBLIC,
        is_public: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainProfile = userProfileDbToDomain.transform(dbProfile);
      const reversedProfile = userProfileDbToDomain.reverse(domainProfile);

      expect(reversedProfile.created_at.getTime()).toBe(dbProfile.created_at.getTime());
    });

    it('should preserve updatedAt in round-trip transformation', () => {
      const dbProfile: UserProfileTable = {
        user_id: 'user-123' as UserId,
        display_name: 'John Doe',
        first_name: null,
        last_name: null,
        bio: null,
        avatar_url: null,
        anonymity_level: AnonymityLevel.PUBLIC,
        is_public: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainProfile = userProfileDbToDomain.transform(dbProfile);
      const reversedProfile = userProfileDbToDomain.reverse(domainProfile);

      expect(reversedProfile.updated_at.getTime()).toBe(dbProfile.updated_at.getTime());
    });

    it('should preserve all fields in complete round-trip', () => {
      const dbProfile: UserProfileTable = {
        user_id: 'user-456' as UserId,
        display_name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        bio: 'Software engineer',
        avatar_url: 'https://example.com/jane.jpg',
        anonymity_level: AnonymityLevel.PARTIAL,
        is_public: false,
        created_at: new Date('2024-02-01T10:30:00Z'),
        updated_at: new Date('2024-02-15T14:45:00Z'),
      };

      const domainProfile = userProfileDbToDomain.transform(dbProfile);
      const reversedProfile = userProfileDbToDomain.reverse(domainProfile);

      expect(reversedProfile).toEqual(dbProfile);
    });
  });

  describe('UserPreferences Transformer', () => {
    it('should preserve userId in round-trip transformation', () => {
      const dbPreferences: UserPreferencesTable = {
        user_id: 'user-123' as UserId,
        theme: 'dark',
        language: 'en',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainPreferences = userPreferencesDbToDomain.transform(dbPreferences);
      const reversedPreferences = userPreferencesDbToDomain.reverse(domainPreferences);

      expect(reversedPreferences.user_id).toBe(dbPreferences.user_id);
    });

    it('should preserve createdAt in round-trip transformation', () => {
      const dbPreferences: UserPreferencesTable = {
        user_id: 'user-123' as UserId,
        theme: null,
        language: null,
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainPreferences = userPreferencesDbToDomain.transform(dbPreferences);
      const reversedPreferences = userPreferencesDbToDomain.reverse(domainPreferences);

      expect(reversedPreferences.created_at.getTime()).toBe(dbPreferences.created_at.getTime());
    });

    it('should preserve updatedAt in round-trip transformation', () => {
      const dbPreferences: UserPreferencesTable = {
        user_id: 'user-123' as UserId,
        theme: null,
        language: null,
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-15T00:00:00Z'),
      };

      const domainPreferences = userPreferencesDbToDomain.transform(dbPreferences);
      const reversedPreferences = userPreferencesDbToDomain.reverse(domainPreferences);

      expect(reversedPreferences.updated_at.getTime()).toBe(dbPreferences.updated_at.getTime());
    });

    it('should preserve all fields in complete round-trip', () => {
      const dbPreferences: UserPreferencesTable = {
        user_id: 'user-789' as UserId,
        theme: 'light',
        language: 'es',
        notifications_enabled: false,
        email_notifications: false,
        push_notifications: true,
        created_at: new Date('2024-03-01T08:00:00Z'),
        updated_at: new Date('2024-03-10T16:30:00Z'),
      };

      const domainPreferences = userPreferencesDbToDomain.transform(dbPreferences);
      const reversedPreferences = userPreferencesDbToDomain.reverse(domainPreferences);

      expect(reversedPreferences).toEqual(dbPreferences);
    });
  });
});
