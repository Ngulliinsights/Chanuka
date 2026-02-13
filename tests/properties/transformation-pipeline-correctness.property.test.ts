/**
 * Property Test: Transformation Pipeline Correctness
 * Feature: full-stack-integration, Property 8: Transformation Pipeline Correctness
 * 
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * This property test verifies that:
 * - For any entity, transformation functions exist for database→domain and domain→API conversions
 * - Applying transformations in sequence (db→domain→api→domain→db) preserves data equivalence
 * - Transformations handle all field types correctly (dates, enums, nulls, branded types)
 * - Round-trip transformations maintain data integrity
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  userDbToDomain,
  userDomainToApi,
  userDbToApi,
  userProfileDbToDomain,
  userProfileDomainToApi,
  userPreferencesDbToDomain,
  userPreferencesDomainToApi,
} from '@shared/utils/transformers/entities/user';
import {
  billDbToDomain,
  billDomainToApi,
  billDbToApi,
  billTimelineEventDbToDomain,
  billTimelineEventDomainToApi,
  billEngagementMetricsDbToDomain,
  billEngagementMetricsDomainToApi,
  sponsorDbToDomain,
  sponsorDomainToApi,
  committeeDbToDomain,
  committeeDomainToApi,
  billCommitteeAssignmentDbToDomain,
  billCommitteeAssignmentDomainToApi,
} from '@shared/utils/transformers/entities/bill';
import type { UserTable, UserProfileTable, UserPreferencesTable } from '@shared/types/database/tables';
import type {
  BillTable,
  BillTimelineEventTable,
  BillEngagementMetricsTable,
  SponsorTable,
  CommitteeTable,
  BillCommitteeAssignmentTable,
} from '@shared/types/database/tables';
import type { UserId, BillId, CommitteeId, SponsorId, ActionId, BillTimelineEventId, BillCommitteeAssignmentId, LegislatorId } from '@shared/types/core/branded';

// ============================================================================
// Arbitrary Generators for Database Types
// ============================================================================

/**
 * Generate arbitrary UserTable for property testing
 */
const arbitraryUserTable = fc.record({
  id: fc.uuid().map(id => id as UserId),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 3, maxLength: 100 }),
  password_hash: fc.string({ minLength: 60, maxLength: 60 }), // bcrypt hash length
  role: fc.constantFrom('user', 'admin', 'moderator'),
  status: fc.constantFrom('active', 'inactive', 'suspended', 'pending'),
  verification_status: fc.constantFrom('unverified', 'pending', 'verified'),
  last_login: fc.option(fc.date(), { nil: null }),
  is_active: fc.boolean(),
  created_at: fc.date(),
  updated_at: fc.date(),
  created_by: fc.option(fc.uuid().map(id => id as UserId), { nil: null }),
  updated_by: fc.option(fc.uuid().map(id => id as UserId), { nil: null }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
});

/**
 * Generate arbitrary UserProfileTable for property testing
 */
const arbitraryUserProfileTable = fc.record({
  user_id: fc.uuid().map(id => id as UserId),
  display_name: fc.string({ minLength: 1, maxLength: 100 }),
  first_name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  last_name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  bio: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  anonymity_level: fc.constantFrom('public', 'pseudonymous', 'anonymous'),
  is_public: fc.boolean(),
  created_at: fc.date(),
  updated_at: fc.date(),
});

/**
 * Generate arbitrary UserPreferencesTable for property testing
 */
const arbitraryUserPreferencesTable = fc.record({
  user_id: fc.uuid().map(id => id as UserId),
  theme: fc.option(fc.constantFrom('light', 'dark', 'system'), { nil: null }),
  language: fc.option(fc.constantFrom('en', 'sw'), { nil: null }),
  notifications_enabled: fc.boolean(),
  email_notifications: fc.boolean(),
  push_notifications: fc.boolean(),
  created_at: fc.date(),
  updated_at: fc.date(),
});

/**
 * Generate arbitrary BillTable for property testing
 */
const arbitraryBillTable = fc.record({
  id: fc.uuid().map(id => id as BillId),
  bill_number: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 10, maxLength: 500 }),
  official_title: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null }),
  summary: fc.string({ minLength: 10, maxLength: 1000 }),
  detailed_summary: fc.option(fc.string({ minLength: 10, maxLength: 5000 }), { nil: null }),
  status: fc.constantFrom('draft', 'introduced', 'in_committee', 'passed', 'rejected'),
  chamber: fc.constantFrom('house', 'senate'),
  bill_type: fc.constantFrom('bill', 'resolution', 'joint_resolution', 'concurrent_resolution'),
  priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
  introduction_date: fc.date(),
  congress: fc.integer({ min: 1, max: 200 }),
  session: fc.integer({ min: 1, max: 2 }),
  sponsor_id: fc.uuid().map(id => id as SponsorId),
  full_text_url: fc.option(fc.webUrl(), { nil: null }),
  pdf_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.boolean(),
  version: fc.integer({ min: 1, max: 100 }),
  created_at: fc.date(),
  updated_at: fc.date(),
  created_by: fc.option(fc.uuid().map(id => id as UserId), { nil: null }),
  updated_by: fc.option(fc.uuid().map(id => id as UserId), { nil: null }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
});

/**
 * Generate arbitrary BillTimelineEventTable for property testing
 */
const arbitraryBillTimelineEventTable = fc.record({
  id: fc.uuid().map(id => id as BillTimelineEventId),
  bill_id: fc.uuid().map(id => id as BillId),
  action_type: fc.constantFrom('introduced', 'referred', 'reported', 'voted', 'passed', 'failed', 'signed', 'vetoed'),
  timestamp: fc.date(),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  chamber: fc.option(fc.constantFrom('house', 'senate'), { nil: null }),
  result: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
  created_at: fc.date(),
});

/**
 * Generate arbitrary BillEngagementMetricsTable for property testing
 */
const arbitraryBillEngagementMetricsTable = fc.record({
  bill_id: fc.uuid().map(id => id as BillId),
  views: fc.integer({ min: 0, max: 1000000 }),
  comments: fc.integer({ min: 0, max: 10000 }),
  shares: fc.integer({ min: 0, max: 10000 }),
  endorsements: fc.integer({ min: 0, max: 10000 }),
  oppositions: fc.integer({ min: 0, max: 10000 }),
  last_engaged_at: fc.option(fc.date(), { nil: null }),
  created_at: fc.date(),
  updated_at: fc.date(),
});

/**
 * Generate arbitrary SponsorTable for property testing
 */
const arbitrarySponsorTable = fc.record({
  id: fc.uuid().map(id => id as SponsorId),
  bill_id: fc.uuid().map(id => id as BillId),
  legislator_id: fc.uuid().map(id => id as LegislatorId),
  legislator_name: fc.string({ minLength: 3, maxLength: 100 }),
  party: fc.string({ minLength: 1, maxLength: 50 }),
  state: fc.string({ minLength: 2, maxLength: 2 }),
  district: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
  sponsor_type: fc.constantFrom('primary', 'cosponsor'),
  sponsorship_date: fc.date(),
  is_primary: fc.boolean(),
  created_at: fc.date(),
  updated_at: fc.date(),
});

/**
 * Generate arbitrary CommitteeTable for property testing
 */
const arbitraryCommitteeTable = fc.record({
  id: fc.uuid().map(id => id as CommitteeId),
  name: fc.string({ minLength: 3, maxLength: 200 }),
  committee_type: fc.constantFrom('standing', 'select', 'joint', 'special'),
  chamber: fc.constantFrom('house', 'senate'),
  jurisdiction: fc.string({ minLength: 10, maxLength: 500 }),
  chairperson: fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: null }),
  created_at: fc.date(),
  updated_at: fc.date(),
});

/**
 * Generate arbitrary BillCommitteeAssignmentTable for property testing
 */
const arbitraryBillCommitteeAssignmentTable = fc.record({
  id: fc.uuid().map(id => id as BillCommitteeAssignmentId),
  bill_id: fc.uuid().map(id => id as BillId),
  committee_id: fc.uuid().map(id => id as CommitteeId),
  assignment_date: fc.date(),
  status: fc.constantFrom('assigned', 'in_review', 'reported', 'discharged'),
  action_taken: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  report_date: fc.option(fc.date(), { nil: null }),
  created_at: fc.date(),
  updated_at: fc.date(),
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
    normalized[key] = normalizeForComparison(value);
  }
  return normalized;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: full-stack-integration, Property 8: Transformation Pipeline Correctness', () => {
  
  it('should preserve User data through full transformation pipeline (DB→Domain→API→Domain→DB)', () => {
    fc.assert(
      fc.property(
        arbitraryUserTable,
        (dbUser: UserTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser = userDomainToApi.transform(domainUser);
          const domainUser2 = userDomainToApi.reverse(apiUser);
          const dbUser2 = userDbToDomain.reverse(domainUser2);
          
          // Normalize for comparison (handle undefined vs null)
          const normalized1 = normalizeForComparison(dbUser);
          const normalized2 = normalizeForComparison(dbUser2);
          
          // Data should be equivalent after round trip
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve UserProfile data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryUserProfileTable,
        (dbProfile: UserProfileTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainProfile = userProfileDbToDomain.transform(dbProfile);
          const apiProfile = userProfileDomainToApi.transform(domainProfile);
          const domainProfile2 = userProfileDomainToApi.reverse(apiProfile);
          const dbProfile2 = userProfileDbToDomain.reverse(domainProfile2);
          
          // Normalize for comparison
          const normalized1 = normalizeForComparison(dbProfile);
          const normalized2 = normalizeForComparison(dbProfile2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve UserPreferences data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryUserPreferencesTable,
        (dbPreferences: UserPreferencesTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainPreferences = userPreferencesDbToDomain.transform(dbPreferences);
          const apiPreferences = userPreferencesDomainToApi.transform(domainPreferences);
          const domainPreferences2 = userPreferencesDomainToApi.reverse(apiPreferences);
          const dbPreferences2 = userPreferencesDbToDomain.reverse(domainPreferences2);
          
          // Note: user_id is not preserved in round trip as it's set by caller
          // Compare all fields except user_id
          const { user_id: _, ...dbWithoutUserId } = dbPreferences;
          const { user_id: __, ...dbWithoutUserId2 } = dbPreferences2;
          
          const normalized1 = normalizeForComparison(dbWithoutUserId);
          const normalized2 = normalizeForComparison(dbWithoutUserId2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve Bill data through full transformation pipeline (DB→Domain→API→Domain→DB)', () => {
    fc.assert(
      fc.property(
        arbitraryBillTable,
        (dbBill: BillTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainBill = billDbToDomain.transform(dbBill);
          const apiBill = billDomainToApi.transform(domainBill);
          const domainBill2 = billDomainToApi.reverse(apiBill);
          const dbBill2 = billDbToDomain.reverse(domainBill2);
          
          // Normalize for comparison
          const normalized1 = normalizeForComparison(dbBill);
          const normalized2 = normalizeForComparison(dbBill2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve BillTimelineEvent data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryBillTimelineEventTable,
        (dbEvent: BillTimelineEventTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainEvent = billTimelineEventDbToDomain.transform(dbEvent);
          const apiEvent = billTimelineEventDomainToApi.transform(domainEvent);
          const domainEvent2 = billTimelineEventDomainToApi.reverse(apiEvent);
          const dbEvent2 = billTimelineEventDbToDomain.reverse(domainEvent2);
          
          // Note: created_at is regenerated in reverse transformation
          const { created_at: _, ...dbWithoutCreatedAt } = dbEvent;
          const { created_at: __, ...dbWithoutCreatedAt2 } = dbEvent2;
          
          const normalized1 = normalizeForComparison(dbWithoutCreatedAt);
          const normalized2 = normalizeForComparison(dbWithoutCreatedAt2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve BillEngagementMetrics data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryBillEngagementMetricsTable,
        (dbMetrics: BillEngagementMetricsTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainMetrics = billEngagementMetricsDbToDomain.transform(dbMetrics);
          const apiMetrics = billEngagementMetricsDomainToApi.transform(domainMetrics);
          const domainMetrics2 = billEngagementMetricsDomainToApi.reverse(apiMetrics);
          const dbMetrics2 = billEngagementMetricsDbToDomain.reverse(domainMetrics2);
          
          // Note: created_at and updated_at are regenerated in reverse transformation
          const { created_at: _1, updated_at: _2, ...dbWithoutTimestamps } = dbMetrics;
          const { created_at: _3, updated_at: _4, ...dbWithoutTimestamps2 } = dbMetrics2;
          
          const normalized1 = normalizeForComparison(dbWithoutTimestamps);
          const normalized2 = normalizeForComparison(dbWithoutTimestamps2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve Sponsor data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitrarySponsorTable,
        (dbSponsor: SponsorTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainSponsor = sponsorDbToDomain.transform(dbSponsor);
          const apiSponsor = sponsorDomainToApi.transform(domainSponsor);
          const domainSponsor2 = sponsorDomainToApi.reverse(apiSponsor);
          const dbSponsor2 = sponsorDbToDomain.reverse(domainSponsor2);
          
          const normalized1 = normalizeForComparison(dbSponsor);
          const normalized2 = normalizeForComparison(dbSponsor2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve Committee data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryCommitteeTable,
        (dbCommittee: CommitteeTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainCommittee = committeeDbToDomain.transform(dbCommittee);
          const apiCommittee = committeeDomainToApi.transform(domainCommittee);
          const domainCommittee2 = committeeDomainToApi.reverse(apiCommittee);
          const dbCommittee2 = committeeDbToDomain.reverse(domainCommittee2);
          
          const normalized1 = normalizeForComparison(dbCommittee);
          const normalized2 = normalizeForComparison(dbCommittee2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve BillCommitteeAssignment data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        arbitraryBillCommitteeAssignmentTable,
        (dbAssignment: BillCommitteeAssignmentTable) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainAssignment = billCommitteeAssignmentDbToDomain.transform(dbAssignment);
          const apiAssignment = billCommitteeAssignmentDomainToApi.transform(domainAssignment);
          const domainAssignment2 = billCommitteeAssignmentDomainToApi.reverse(apiAssignment);
          const dbAssignment2 = billCommitteeAssignmentDbToDomain.reverse(domainAssignment2);
          
          const normalized1 = normalizeForComparison(dbAssignment);
          const normalized2 = normalizeForComparison(dbAssignment2);
          
          expect(deepEqual(normalized1, normalized2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle composite transformers correctly (DB→API direct)', () => {
    fc.assert(
      fc.property(
        arbitraryUserTable,
        (dbUser: UserTable) => {
          // Direct transformation
          const apiUser1 = userDbToApi.transform(dbUser);
          
          // Step-by-step transformation
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser2 = userDomainToApi.transform(domainUser);
          
          // Both paths should produce equivalent results
          expect(deepEqual(apiUser1, apiUser2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle composite transformers correctly for Bills (DB→API direct)', () => {
    fc.assert(
      fc.property(
        arbitraryBillTable,
        (dbBill: BillTable) => {
          // Direct transformation
          const apiBill1 = billDbToApi.transform(dbBill);
          
          // Step-by-step transformation
          const domainBill = billDbToDomain.transform(dbBill);
          const apiBill2 = billDomainToApi.transform(domainBill);
          
          // Both paths should produce equivalent results
          expect(deepEqual(apiBill1, apiBill2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly transform Date objects to ISO strings and back', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (date: Date) => {
          // Create a user with the date
          const dbUser: UserTable = {
            id: 'test-id' as UserId,
            email: 'test@example.com',
            username: 'testuser',
            password_hash: 'hash',
            role: 'user',
            status: 'active',
            verification_status: 'verified',
            last_login: date,
            is_active: true,
            created_at: date,
            updated_at: date,
            created_by: null,
            updated_by: null,
            metadata: null,
          };
          
          // Transform through pipeline
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser = userDomainToApi.transform(domainUser);
          
          // API should have ISO string dates
          expect(typeof apiUser.createdAt).toBe('string');
          expect(typeof apiUser.updatedAt).toBe('string');
          
          // Reverse transformation should restore Date objects
          const domainUser2 = userDomainToApi.reverse(apiUser);
          expect(domainUser2.createdAt instanceof Date).toBe(true);
          expect(domainUser2.updatedAt instanceof Date).toBe(true);
          
          // Dates should be equivalent (within millisecond precision)
          expect(Math.abs(domainUser2.createdAt.getTime() - date.getTime())).toBeLessThan(1);
          expect(Math.abs(domainUser2.updatedAt.getTime() - date.getTime())).toBeLessThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly handle null and undefined values in transformations', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasLastLogin: fc.boolean(),
          hasMetadata: fc.boolean(),
          hasCreatedBy: fc.boolean(),
        }),
        ({ hasLastLogin, hasMetadata, hasCreatedBy }) => {
          const dbUser: UserTable = {
            id: 'test-id' as UserId,
            email: 'test@example.com',
            username: 'testuser',
            password_hash: 'hash',
            role: 'user',
            status: 'active',
            verification_status: 'verified',
            last_login: hasLastLogin ? new Date() : null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: hasCreatedBy ? ('creator-id' as UserId) : null,
            updated_by: null,
            metadata: hasMetadata ? { key: 'value' } : null,
          };
          
          // Transform through pipeline
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser = userDomainToApi.transform(domainUser);
          const domainUser2 = userDomainToApi.reverse(apiUser);
          const dbUser2 = userDbToDomain.reverse(domainUser2);
          
          // Null/undefined handling should be consistent
          if (!hasLastLogin) {
            expect(dbUser2.last_login).toBeNull();
          }
          if (!hasMetadata) {
            expect(dbUser2.metadata).toBeNull();
          }
          if (!hasCreatedBy) {
            expect(dbUser2.created_by).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly handle enum transformations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('user', 'admin', 'moderator'),
        fc.constantFrom('active', 'inactive', 'suspended', 'pending'),
        fc.constantFrom('unverified', 'pending', 'verified'),
        (role, status, verification) => {
          const dbUser: UserTable = {
            id: 'test-id' as UserId,
            email: 'test@example.com',
            username: 'testuser',
            password_hash: 'hash',
            role,
            status,
            verification_status: verification,
            last_login: null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: null,
            updated_by: null,
            metadata: null,
          };
          
          // Transform through pipeline
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser = userDomainToApi.transform(domainUser);
          const domainUser2 = userDomainToApi.reverse(apiUser);
          const dbUser2 = userDbToDomain.reverse(domainUser2);
          
          // Enum values should be preserved
          expect(dbUser2.role).toBe(role);
          expect(dbUser2.status).toBe(status);
          expect(dbUser2.verification_status).toBe(verification);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly handle branded type transformations', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, createdBy, updatedBy) => {
          const dbUser: UserTable = {
            id: userId as UserId,
            email: 'test@example.com',
            username: 'testuser',
            password_hash: 'hash',
            role: 'user',
            status: 'active',
            verification_status: 'verified',
            last_login: null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: createdBy as UserId,
            updated_by: updatedBy as UserId,
            metadata: null,
          };
          
          // Transform through pipeline
          const domainUser = userDbToDomain.transform(dbUser);
          const apiUser = userDomainToApi.transform(domainUser);
          const domainUser2 = userDomainToApi.reverse(apiUser);
          const dbUser2 = userDbToDomain.reverse(domainUser2);
          
          // Branded types should be preserved as strings
          expect(dbUser2.id).toBe(userId);
          expect(dbUser2.created_by).toBe(createdBy);
          expect(dbUser2.updated_by).toBe(updatedBy);
        }
      ),
      { numRuns: 100 }
    );
  });
});
