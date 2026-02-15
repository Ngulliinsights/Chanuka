/**
 * Property Test: Round-Trip Transformation Preserves Data
 * Feature: comprehensive-bug-fixes, Property 2: Round-Trip Transformation Preserves Data
 * 
 * Validates: Requirements 2.1, 2.2, 2.4
 * 
 * This property test verifies that:
 * - For any domain model with complete fields (including foreign keys and audit timestamps),
 *   transforming from domain to DB and back to domain produces an equivalent object
 * - UserPreferences round-trip preserves userId field
 * - UserProfile round-trip preserves userId field
 * - All audit timestamps (createdAt, updatedAt) are preserved
 * - Round-trip transformations maintain data integrity
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  userProfileDbToDomain,
  userPreferencesDbToDomain,
} from '@shared/utils/transformers/entities/user';
import type { UserProfile, UserPreferences } from '@shared/types/domains/authentication/user';
import type { UserId } from '@shared/types/core/branded';
import type { AnonymityLevel } from '@shared/types/core/enums';

// ============================================================================
// Arbitrary Generators for Domain Types
// ============================================================================

/**
 * Generate arbitrary UserProfile for property testing
 */
const arbitraryUserProfile = fc.record({
  userId: fc.uuid().map(id => id as UserId),
  displayName: fc.string({ minLength: 1, maxLength: 100 }),
  firstName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  lastName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  bio: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
  anonymityLevel: fc.constantFrom('public', 'pseudonymous', 'anonymous') as fc.Arbitrary<AnonymityLevel>,
  isPublic: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * Generate arbitrary UserPreferences for property testing
 * Note: Boolean fields are always defined (not undefined) because the database
 * requires non-null boolean values. When undefined is provided, defaults are applied.
 */
const arbitraryUserPreferences = fc.record({
  userId: fc.uuid().map(id => id as UserId),
  theme: fc.option(fc.constantFrom('light', 'dark', 'system'), { nil: undefined }),
  language: fc.option(fc.constantFrom('en', 'sw'), { nil: undefined }),
  notificationsEnabled: fc.boolean(),
  emailNotifications: fc.boolean(),
  pushNotifications: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compare two objects for deep equality, handling Date objects and null/undefined
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Normalize data for comparison (handle undefined vs null)
 */
function normalizeForComparison(obj: any): any {
  if (obj == null) return null;
  if (obj instanceof Date) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeForComparison);
  
  const normalized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Normalize undefined to null for comparison
    normalized[key] = value === undefined ? null : normalizeForComparison(value);
  }
  return normalized;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: comprehensive-bug-fixes, Property 2: Round-Trip Transformation Preserves Data', () => {
  
  it('should preserve UserProfile data through round-trip transformation (Domain→DB→Domain)', () => {
    fc.assert(
      fc.property(
        arbitraryUserProfile,
        (domainProfile: UserProfile) => {
          // Transform: Domain → DB → Domain
          const dbProfile = userProfileDbToDomain.reverse(domainProfile);
          const domainProfile2 = userProfileDbToDomain.transform(dbProfile);
          
          // Normalize for comparison (handle undefined vs null)
          const normalized1 = normalizeForComparison(domainProfile);
          const normalized2 = normalizeForComparison(domainProfile2);
          
          // Data should be equivalent after round trip
          // This validates Requirements 2.1, 2.2: userId and audit timestamps are preserved
          expect(deepEqual(normalized1, normalized2)).toBe(true);
          
          // Explicitly verify critical fields are preserved (Requirements 2.1, 2.2)
          expect(domainProfile2.userId).toBe(domainProfile.userId);
          expect(domainProfile2.createdAt.getTime()).toBe(domainProfile.createdAt.getTime());
          expect(domainProfile2.updatedAt.getTime()).toBe(domainProfile.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve UserPreferences data through round-trip transformation (Domain→DB→Domain)', () => {
    fc.assert(
      fc.property(
        arbitraryUserPreferences,
        (domainPreferences: UserPreferences) => {
          // Transform: Domain → DB → Domain
          const dbPreferences = userPreferencesDbToDomain.reverse(domainPreferences);
          const domainPreferences2 = userPreferencesDbToDomain.transform(dbPreferences);
          
          // Normalize for comparison (handle undefined vs null)
          const normalized1 = normalizeForComparison(domainPreferences);
          const normalized2 = normalizeForComparison(domainPreferences2);
          
          // Data should be equivalent after round trip
          // This validates Requirements 2.1, 2.2: userId and audit timestamps are preserved
          expect(deepEqual(normalized1, normalized2)).toBe(true);
          
          // Explicitly verify critical fields are preserved (Requirements 2.1, 2.2)
          expect(domainPreferences2.userId).toBe(domainPreferences.userId);
          expect(domainPreferences2.createdAt.getTime()).toBe(domainPreferences.createdAt.getTime());
          expect(domainPreferences2.updatedAt.getTime()).toBe(domainPreferences.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all optional fields in UserProfile round-trip', () => {
    fc.assert(
      fc.property(
        arbitraryUserProfile,
        (domainProfile: UserProfile) => {
          // Transform: Domain → DB → Domain
          const dbProfile = userProfileDbToDomain.reverse(domainProfile);
          const domainProfile2 = userProfileDbToDomain.transform(dbProfile);
          
          // Verify optional fields are preserved
          if (domainProfile.firstName !== undefined) {
            expect(domainProfile2.firstName).toBe(domainProfile.firstName);
          }
          if (domainProfile.lastName !== undefined) {
            expect(domainProfile2.lastName).toBe(domainProfile.lastName);
          }
          if (domainProfile.bio !== undefined) {
            expect(domainProfile2.bio).toBe(domainProfile.bio);
          }
          if (domainProfile.avatarUrl !== undefined) {
            expect(domainProfile2.avatarUrl).toBe(domainProfile.avatarUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all optional fields in UserPreferences round-trip', () => {
    fc.assert(
      fc.property(
        arbitraryUserPreferences,
        (domainPreferences: UserPreferences) => {
          // Transform: Domain → DB → Domain
          const dbPreferences = userPreferencesDbToDomain.reverse(domainPreferences);
          const domainPreferences2 = userPreferencesDbToDomain.transform(dbPreferences);
          
          // Verify optional string fields are preserved
          if (domainPreferences.theme !== undefined) {
            expect(domainPreferences2.theme).toBe(domainPreferences.theme);
          }
          if (domainPreferences.language !== undefined) {
            expect(domainPreferences2.language).toBe(domainPreferences.language);
          }
          
          // Boolean fields are always preserved (they're required in DB)
          expect(domainPreferences2.notificationsEnabled).toBe(domainPreferences.notificationsEnabled);
          expect(domainPreferences2.emailNotifications).toBe(domainPreferences.emailNotifications);
          expect(domainPreferences2.pushNotifications).toBe(domainPreferences.pushNotifications);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases: all optional fields undefined in UserProfile', () => {
    fc.assert(
      fc.property(
        fc.uuid().map(id => id as UserId),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('public', 'pseudonymous', 'anonymous') as fc.Arbitrary<AnonymityLevel>,
        fc.boolean(),
        fc.date(),
        fc.date(),
        (userId, displayName, anonymityLevel, isPublic, createdAt, updatedAt) => {
          const domainProfile: UserProfile = {
            userId,
            displayName,
            firstName: undefined,
            lastName: undefined,
            bio: undefined,
            avatarUrl: undefined,
            anonymityLevel,
            isPublic,
            createdAt,
            updatedAt,
          };
          
          // Transform: Domain → DB → Domain
          const dbProfile = userProfileDbToDomain.reverse(domainProfile);
          const domainProfile2 = userProfileDbToDomain.transform(dbProfile);
          
          // Verify all fields are preserved
          expect(domainProfile2.userId).toBe(userId);
          expect(domainProfile2.displayName).toBe(displayName);
          expect(domainProfile2.anonymityLevel).toBe(anonymityLevel);
          expect(domainProfile2.isPublic).toBe(isPublic);
          expect(domainProfile2.createdAt.getTime()).toBe(createdAt.getTime());
          expect(domainProfile2.updatedAt.getTime()).toBe(updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases: all optional fields undefined in UserPreferences', () => {
    fc.assert(
      fc.property(
        fc.uuid().map(id => id as UserId),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.date(),
        fc.date(),
        (userId, notificationsEnabled, emailNotifications, pushNotifications, createdAt, updatedAt) => {
          const domainPreferences: UserPreferences = {
            userId,
            theme: undefined,
            language: undefined,
            notificationsEnabled,
            emailNotifications,
            pushNotifications,
            createdAt,
            updatedAt,
          };
          
          // Transform: Domain → DB → Domain
          const dbPreferences = userPreferencesDbToDomain.reverse(domainPreferences);
          const domainPreferences2 = userPreferencesDbToDomain.transform(dbPreferences);
          
          // Verify all fields are preserved
          expect(domainPreferences2.userId).toBe(userId);
          expect(domainPreferences2.notificationsEnabled).toBe(notificationsEnabled);
          expect(domainPreferences2.emailNotifications).toBe(emailNotifications);
          expect(domainPreferences2.pushNotifications).toBe(pushNotifications);
          expect(domainPreferences2.createdAt.getTime()).toBe(createdAt.getTime());
          expect(domainPreferences2.updatedAt.getTime()).toBe(updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve data integrity across multiple round-trips', () => {
    fc.assert(
      fc.property(
        arbitraryUserProfile,
        (domainProfile: UserProfile) => {
          // Perform multiple round-trips
          let current = domainProfile;
          for (let i = 0; i < 5; i++) {
            const db = userProfileDbToDomain.reverse(current);
            current = userProfileDbToDomain.transform(db);
          }
          
          // After 5 round-trips, data should still be equivalent
          const normalized1 = normalizeForComparison(domainProfile);
          const normalized2 = normalizeForComparison(current);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve data integrity across multiple round-trips for UserPreferences', () => {
    fc.assert(
      fc.property(
        arbitraryUserPreferences,
        (domainPreferences: UserPreferences) => {
          // Perform multiple round-trips
          let current = domainPreferences;
          for (let i = 0; i < 5; i++) {
            const db = userPreferencesDbToDomain.reverse(current);
            current = userPreferencesDbToDomain.transform(db);
          }
          
          // After 5 round-trips, data should still be equivalent
          const normalized1 = normalizeForComparison(domainPreferences);
          const normalized2 = normalizeForComparison(current);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
