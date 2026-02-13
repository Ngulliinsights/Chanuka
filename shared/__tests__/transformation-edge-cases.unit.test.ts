/**
 * Unit Tests: Transformation Edge Cases
 * 
 * Tests specific edge cases for data transformations:
 * - Null value handling
 * - Date serialization/deserialization
 * - Enum transformation
 * 
 * Requirements: 4.2, 4.3
 */

import { describe, it, expect } from 'vitest';
import {
  dateToStringTransformer,
  optionalDateToStringTransformer,
  createEnumTransformer,
  createOptionalTransformer,
} from '../utils/transformers/base';
import {
  userDbToDomain,
  userDomainToApi,
  userProfileDbToDomain,
} from '../utils/transformers/entities/user';
import {
  billDbToDomain,
  billDomainToApi,
  billTimelineEventDbToDomain,
} from '../utils/transformers/entities/bill';
import type { UserTable, UserProfileTable, BillTable, BillTimelineEventTable } from '../types/database/tables';
import type { UserId, BillId, SponsorId, ActionId, BillTimelineEventId } from '../types/core/branded';
import { UserRole, UserStatus, VerificationStatus, AnonymityLevel, BillStatus, Chamber, BillType } from '../types/core/enums';
import { BillPriority } from '../types/domains/legislative/bill';

describe('Feature: full-stack-integration - Transformation Edge Cases', () => {
  describe('Null Value Handling', () => {
    it('should handle null optional fields in user transformation', () => {
      const dbUser: UserTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash123',
        role: 'user',
        status: 'active',
        verification_status: 'verified',
        last_login: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      const domainUser = userDbToDomain.transform(dbUser);

      expect(domainUser.lastLogin).toBeUndefined();
      expect(domainUser.createdBy).toBeUndefined();
      expect(domainUser.updatedBy).toBeUndefined();
      expect(domainUser.metadata).toBeUndefined();
    });

    it('should handle null optional fields in user profile transformation', () => {
      const dbProfile: UserProfileTable = {
        user_id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
        display_name: 'Test User',
        first_name: null,
        last_name: null,
        bio: null,
        avatar_url: null,
        anonymity_level: 'public',
        is_public: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      const domainProfile = userProfileDbToDomain.transform(dbProfile);

      expect(domainProfile.firstName).toBeUndefined();
      expect(domainProfile.lastName).toBeUndefined();
      expect(domainProfile.bio).toBeUndefined();
      expect(domainProfile.avatarUrl).toBeUndefined();
    });

    it('should handle null optional fields in bill transformation', () => {
      const dbBill: BillTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as BillId,
        bill_number: 'HR-1234',
        title: 'Test Bill',
        official_title: null,
        summary: 'A test bill',
        detailed_summary: null,
        status: 'introduced',
        chamber: 'house',
        bill_type: 'bill',
        priority: 'medium',
        introduction_date: new Date('2024-01-01'),
        congress: 118,
        session: 1,
        sponsor_id: '123e4567-e89b-12d3-a456-426614174000' as SponsorId,
        full_text_url: null,
        pdf_url: null,
        is_active: true,
        version: 1,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      const domainBill = billDbToDomain.transform(dbBill);

      expect(domainBill.officialTitle).toBeUndefined();
      expect(domainBill.detailedSummary).toBeUndefined();
      expect(domainBill.fullTextUrl).toBeUndefined();
      expect(domainBill.pdfUrl).toBeUndefined();
      expect(domainBill.createdBy).toBeUndefined();
      expect(domainBill.updatedBy).toBeUndefined();
      expect(domainBill.metadata).toBeUndefined();
    });

    it('should preserve null values in reverse transformation', () => {
      const dbUser: UserTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash123',
        role: 'user',
        status: 'active',
        verification_status: 'verified',
        last_login: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      const domainUser = userDbToDomain.transform(dbUser);
      const dbUser2 = userDbToDomain.reverse(domainUser);

      expect(dbUser2.last_login).toBeNull();
      expect(dbUser2.created_by).toBeNull();
      expect(dbUser2.updated_by).toBeNull();
      expect(dbUser2.metadata).toBeNull();
    });

    it('should handle optional date transformer with null', () => {
      const result = optionalDateToStringTransformer.transform(null);
      expect(result).toBeNull();

      const reversed = optionalDateToStringTransformer.reverse(null);
      expect(reversed).toBeNull();
    });

    it('should handle optional date transformer with undefined', () => {
      const result = optionalDateToStringTransformer.transform(undefined);
      expect(result).toBeNull();
    });

    it('should handle optional transformer with null', () => {
      const stringTransformer = createOptionalTransformer({
        transform: (s: string) => s.toUpperCase(),
        reverse: (s: string) => s.toLowerCase(),
      });

      const result = stringTransformer.transform(null);
      expect(result).toBeNull();

      const reversed = stringTransformer.reverse(null);
      expect(reversed).toBeNull();
    });

    it('should handle optional transformer with undefined', () => {
      const stringTransformer = createOptionalTransformer({
        transform: (s: string) => s.toUpperCase(),
        reverse: (s: string) => s.toLowerCase(),
      });

      const result = stringTransformer.transform(undefined);
      expect(result).toBeNull();
    });
  });

  describe('Date Serialization/Deserialization', () => {
    it('should serialize Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = dateToStringTransformer.transform(date);

      expect(result).toBe('2024-01-15T10:30:00.000Z');
      expect(typeof result).toBe('string');
    });

    it('should deserialize ISO string to Date', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = dateToStringTransformer.reverse(isoString);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(isoString);
    });

    it('should handle date round-trip transformation', () => {
      const originalDate = new Date('2024-01-15T10:30:00.000Z');
      const serialized = dateToStringTransformer.transform(originalDate);
      const deserialized = dateToStringTransformer.reverse(serialized);

      expect(deserialized.getTime()).toBe(originalDate.getTime());
    });

    it('should handle dates with milliseconds', () => {
      const date = new Date('2024-01-15T10:30:00.123Z');
      const serialized = dateToStringTransformer.transform(date);
      const deserialized = dateToStringTransformer.reverse(serialized);

      expect(deserialized.getTime()).toBe(date.getTime());
      expect(serialized).toBe('2024-01-15T10:30:00.123Z');
    });

    it('should handle dates at epoch', () => {
      const date = new Date(0);
      const serialized = dateToStringTransformer.transform(date);
      const deserialized = dateToStringTransformer.reverse(serialized);

      expect(deserialized.getTime()).toBe(0);
      expect(serialized).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle dates far in the future', () => {
      const date = new Date('2099-12-31T23:59:59.999Z');
      const serialized = dateToStringTransformer.transform(date);
      const deserialized = dateToStringTransformer.reverse(serialized);

      expect(deserialized.getTime()).toBe(date.getTime());
    });

    it('should handle optional date with valid date', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const serialized = optionalDateToStringTransformer.transform(date);
      const deserialized = optionalDateToStringTransformer.reverse(serialized);

      expect(serialized).toBe('2024-01-15T10:30:00.000Z');
      expect(deserialized).toBeInstanceOf(Date);
      expect(deserialized?.getTime()).toBe(date.getTime());
    });

    it('should preserve dates through user transformation pipeline', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-15T12:30:00.000Z');
      const lastLogin = new Date('2024-01-14T08:00:00.000Z');

      const dbUser: UserTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash123',
        role: 'user',
        status: 'active',
        verification_status: 'verified',
        last_login: lastLogin,
        is_active: true,
        created_at: createdAt,
        updated_at: updatedAt,
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      const domainUser = userDbToDomain.transform(dbUser);
      const apiUser = userDomainToApi.transform(domainUser);

      // API should have ISO strings
      expect(typeof apiUser.createdAt).toBe('string');
      expect(typeof apiUser.updatedAt).toBe('string');
      expect(typeof apiUser.lastLogin).toBe('string');
      expect(apiUser.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(apiUser.updatedAt).toBe('2024-01-15T12:30:00.000Z');
      expect(apiUser.lastLogin).toBe('2024-01-14T08:00:00.000Z');

      // Reverse transformation should restore dates
      const domainUser2 = userDomainToApi.reverse(apiUser);
      expect(domainUser2.createdAt).toBeInstanceOf(Date);
      expect(domainUser2.updatedAt).toBeInstanceOf(Date);
      expect(domainUser2.lastLogin).toBeInstanceOf(Date);
      expect(domainUser2.createdAt.getTime()).toBe(createdAt.getTime());
      expect(domainUser2.updatedAt.getTime()).toBe(updatedAt.getTime());
      expect(domainUser2.lastLogin?.getTime()).toBe(lastLogin.getTime());
    });

    it('should preserve dates through bill transformation pipeline', () => {
      const introductionDate = new Date('2024-01-01T00:00:00.000Z');
      const createdAt = new Date('2024-01-01T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T15:00:00.000Z');

      const dbBill: BillTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as BillId,
        bill_number: 'HR-1234',
        title: 'Test Bill',
        official_title: null,
        summary: 'A test bill',
        detailed_summary: null,
        status: 'introduced',
        chamber: 'house',
        bill_type: 'bill',
        priority: 'medium',
        introduction_date: introductionDate,
        congress: 118,
        session: 1,
        sponsor_id: '123e4567-e89b-12d3-a456-426614174000' as SponsorId,
        full_text_url: null,
        pdf_url: null,
        is_active: true,
        version: 1,
        created_at: createdAt,
        updated_at: updatedAt,
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      const domainBill = billDbToDomain.transform(dbBill);
      const apiBill = billDomainToApi.transform(domainBill);

      // API should have ISO strings
      expect(typeof apiBill.introductionDate).toBe('string');
      expect(typeof apiBill.createdAt).toBe('string');
      expect(typeof apiBill.updatedAt).toBe('string');

      // Reverse transformation should restore dates
      const domainBill2 = billDomainToApi.reverse(apiBill);
      expect(domainBill2.introductionDate).toBeInstanceOf(Date);
      expect(domainBill2.createdAt).toBeInstanceOf(Date);
      expect(domainBill2.updatedAt).toBeInstanceOf(Date);
      expect(domainBill2.introductionDate.getTime()).toBe(introductionDate.getTime());
      expect(domainBill2.createdAt.getTime()).toBe(createdAt.getTime());
      expect(domainBill2.updatedAt.getTime()).toBe(updatedAt.getTime());
    });
  });

  describe('Enum Transformation', () => {
    it('should transform UserRole enum correctly', () => {
      const roles: Array<'user' | 'admin' | 'moderator'> = ['user', 'admin', 'moderator'];

      roles.forEach(role => {
        const dbUser: UserTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hash123',
          role,
          status: 'active',
          verification_status: 'verified',
          last_login: null,
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainUser = userDbToDomain.transform(dbUser);
        expect(domainUser.role).toBe(role);

        const apiUser = userDomainToApi.transform(domainUser);
        expect(apiUser.role).toBe(role);

        const domainUser2 = userDomainToApi.reverse(apiUser);
        expect(domainUser2.role).toBe(role);
      });
    });

    it('should transform UserStatus enum correctly', () => {
      const statuses: Array<'active' | 'inactive' | 'suspended' | 'pending'> = ['active', 'inactive', 'suspended', 'pending'];

      statuses.forEach(status => {
        const dbUser: UserTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hash123',
          role: 'user',
          status,
          verification_status: 'verified',
          last_login: null,
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainUser = userDbToDomain.transform(dbUser);
        expect(domainUser.status).toBe(status);

        const apiUser = userDomainToApi.transform(domainUser);
        expect(apiUser.status).toBe(status);
      });
    });

    it('should transform VerificationStatus enum correctly', () => {
      const verificationStatuses: Array<'unverified' | 'pending' | 'verified'> = ['unverified', 'pending', 'verified'];

      verificationStatuses.forEach(verification => {
        const dbUser: UserTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hash123',
          role: 'user',
          status: 'active',
          verification_status: verification,
          last_login: null,
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainUser = userDbToDomain.transform(dbUser);
        expect(domainUser.verification).toBe(verification);

        const apiUser = userDomainToApi.transform(domainUser);
        expect(apiUser.verification).toBe(verification);
      });
    });

    it('should transform AnonymityLevel enum correctly', () => {
      const anonymityLevels: Array<'public' | 'pseudonymous' | 'anonymous'> = ['public', 'pseudonymous', 'anonymous'];

      anonymityLevels.forEach(level => {
        const dbProfile: UserProfileTable = {
          user_id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
          display_name: 'Test User',
          first_name: null,
          last_name: null,
          bio: null,
          avatar_url: null,
          anonymity_level: level,
          is_public: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        };

        const domainProfile = userProfileDbToDomain.transform(dbProfile);
        expect(domainProfile.anonymityLevel).toBe(level);
      });
    });

    it('should transform BillStatus enum correctly', () => {
      const statuses: Array<'draft' | 'introduced' | 'in_committee' | 'passed' | 'rejected'> = 
        ['draft', 'introduced', 'in_committee', 'passed', 'rejected'];

      statuses.forEach(status => {
        const dbBill: BillTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as BillId,
          bill_number: 'HR-1234',
          title: 'Test Bill',
          official_title: null,
          summary: 'A test bill',
          detailed_summary: null,
          status,
          chamber: 'house',
          bill_type: 'bill',
          priority: 'medium',
          introduction_date: new Date('2024-01-01'),
          congress: 118,
          session: 1,
          sponsor_id: '123e4567-e89b-12d3-a456-426614174000' as SponsorId,
          full_text_url: null,
          pdf_url: null,
          is_active: true,
          version: 1,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainBill = billDbToDomain.transform(dbBill);
        expect(domainBill.status).toBe(status);

        const apiBill = billDomainToApi.transform(domainBill);
        expect(apiBill.status).toBe(status);
      });
    });

    it('should transform Chamber enum correctly', () => {
      const chambers: Array<'house' | 'senate'> = ['house', 'senate'];

      chambers.forEach(chamber => {
        const dbBill: BillTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as BillId,
          bill_number: 'HR-1234',
          title: 'Test Bill',
          official_title: null,
          summary: 'A test bill',
          detailed_summary: null,
          status: 'introduced',
          chamber,
          bill_type: 'bill',
          priority: 'medium',
          introduction_date: new Date('2024-01-01'),
          congress: 118,
          session: 1,
          sponsor_id: '123e4567-e89b-12d3-a456-426614174000' as SponsorId,
          full_text_url: null,
          pdf_url: null,
          is_active: true,
          version: 1,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainBill = billDbToDomain.transform(dbBill);
        expect(domainBill.chamber).toBe(chamber);

        const apiBill = billDomainToApi.transform(domainBill);
        expect(apiBill.chamber).toBe(chamber);
      });
    });

    it('should transform BillType enum correctly', () => {
      const billTypes: Array<'bill' | 'resolution' | 'concurrent_resolution' | 'joint_resolution'> = 
        ['bill', 'resolution', 'concurrent_resolution', 'joint_resolution'];

      billTypes.forEach(billType => {
        const dbBill: BillTable = {
          id: '123e4567-e89b-12d3-a456-426614174000' as BillId,
          bill_number: 'HR-1234',
          title: 'Test Bill',
          official_title: null,
          summary: 'A test bill',
          detailed_summary: null,
          status: 'introduced',
          chamber: 'house',
          bill_type: billType,
          priority: 'medium',
          introduction_date: new Date('2024-01-01'),
          congress: 118,
          session: 1,
          sponsor_id: '123e4567-e89b-12d3-a456-426614174000' as SponsorId,
          full_text_url: null,
          pdf_url: null,
          is_active: true,
          version: 1,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          created_by: null,
          updated_by: null,
          metadata: null,
        };

        const domainBill = billDbToDomain.transform(dbBill);
        expect(domainBill.billType).toBe(billType);

        const apiBill = billDomainToApi.transform(domainBill);
        expect(apiBill.billType).toBe(billType);
      });
    });

    it('should handle enum transformer with valid values', () => {
      const enumTransformer = createEnumTransformer(['red', 'green', 'blue'] as const);

      expect(enumTransformer.transform('red')).toBe('red');
      expect(enumTransformer.reverse('green')).toBe('green');
      expect(enumTransformer.reverse('blue')).toBe('blue');
    });

    it('should throw error for invalid enum value', () => {
      const enumTransformer = createEnumTransformer(['red', 'green', 'blue'] as const);

      expect(() => enumTransformer.reverse('yellow')).toThrow('Invalid enum value: yellow');
    });

    it('should preserve enum values through full transformation pipeline', () => {
      const dbUser: UserTable = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UserId,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash123',
        role: 'admin',
        status: 'active',
        verification_status: 'verified',
        last_login: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        created_by: null,
        updated_by: null,
        metadata: null,
      };

      // Transform through full pipeline
      const domainUser = userDbToDomain.transform(dbUser);
      const apiUser = userDomainToApi.transform(domainUser);
      const domainUser2 = userDomainToApi.reverse(apiUser);
      const dbUser2 = userDbToDomain.reverse(domainUser2);

      // All enum values should be preserved
      expect(dbUser2.role).toBe('admin');
      expect(dbUser2.status).toBe('active');
      expect(dbUser2.verification_status).toBe('verified');
    });
  });
});
