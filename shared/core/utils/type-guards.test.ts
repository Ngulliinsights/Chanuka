/**
 * Unit tests for enum converter utilities
 * 
 * Tests cover:
 * - Valid enum conversions
 * - Invalid enum values (should throw descriptive errors)
 * - Type guards
 */

import { describe, it, expect } from 'vitest';
import {
  createEnumConverter,
  userRoleConverter,
  userStatusConverter,
  billStatusConverter,
  chamberConverter,
} from './type-guards';
import { UserRole, UserStatus, BillStatus, Chamber } from '../../types/core/enums';

describe('createEnumConverter', () => {
  const testConverter = createEnumConverter(
    ['active', 'inactive', 'pending'] as const,
    'TestStatus'
  );

  describe('toEnum', () => {
    it('should convert valid string to enum value', () => {
      expect(testConverter.toEnum('active')).toBe('active');
      expect(testConverter.toEnum('inactive')).toBe('inactive');
      expect(testConverter.toEnum('pending')).toBe('pending');
    });

    it('should throw TypeError for non-string values', () => {
      expect(() => testConverter.toEnum(123)).toThrow(TypeError);
      expect(() => testConverter.toEnum(123)).toThrow('Expected string for TestStatus, got number');
      
      expect(() => testConverter.toEnum(null)).toThrow(TypeError);
      expect(() => testConverter.toEnum(undefined)).toThrow(TypeError);
      expect(() => testConverter.toEnum({})).toThrow(TypeError);
    });

    it('should throw Error for invalid enum values with descriptive message', () => {
      expect(() => testConverter.toEnum('invalid')).toThrow(Error);
      expect(() => testConverter.toEnum('invalid')).toThrow(
        'Invalid TestStatus: "invalid". Expected one of: active, inactive, pending'
      );
      
      expect(() => testConverter.toEnum('ACTIVE')).toThrow(Error);
      expect(() => testConverter.toEnum('')).toThrow(Error);
    });
  });

  describe('fromEnum', () => {
    it('should convert enum value to string', () => {
      expect(testConverter.fromEnum('active')).toBe('active');
      expect(testConverter.fromEnum('inactive')).toBe('inactive');
    });
  });

  describe('isValid', () => {
    it('should return true for valid enum values', () => {
      expect(testConverter.isValid('active')).toBe(true);
      expect(testConverter.isValid('inactive')).toBe(true);
      expect(testConverter.isValid('pending')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(testConverter.isValid('invalid')).toBe(false);
      expect(testConverter.isValid('ACTIVE')).toBe(false);
      expect(testConverter.isValid('')).toBe(false);
      expect(testConverter.isValid(123)).toBe(false);
      expect(testConverter.isValid(null)).toBe(false);
      expect(testConverter.isValid(undefined)).toBe(false);
    });
  });
});

describe('userRoleConverter', () => {
  it('should convert valid UserRole values', () => {
    expect(userRoleConverter.toEnum('public')).toBe(UserRole.Public);
    expect(userRoleConverter.toEnum('citizen')).toBe(UserRole.Citizen);
    expect(userRoleConverter.toEnum('admin')).toBe(UserRole.Admin);
  });

  it('should throw error for invalid UserRole', () => {
    expect(() => userRoleConverter.toEnum('invalid_role')).toThrow(
      'Invalid UserRole'
    );
  });

  it('should validate UserRole values', () => {
    expect(userRoleConverter.isValid('public')).toBe(true);
    expect(userRoleConverter.isValid('invalid')).toBe(false);
  });
});

describe('userStatusConverter', () => {
  it('should convert valid UserStatus values', () => {
    expect(userStatusConverter.toEnum('active')).toBe(UserStatus.Active);
    expect(userStatusConverter.toEnum('inactive')).toBe(UserStatus.Inactive);
    expect(userStatusConverter.toEnum('suspended')).toBe(UserStatus.Suspended);
  });

  it('should throw error for invalid UserStatus', () => {
    expect(() => userStatusConverter.toEnum('deleted')).toThrow(
      'Invalid UserStatus'
    );
  });

  it('should validate UserStatus values', () => {
    expect(userStatusConverter.isValid('active')).toBe(true);
    expect(userStatusConverter.isValid('deleted')).toBe(false);
  });
});

describe('billStatusConverter', () => {
  it('should convert valid BillStatus values', () => {
    expect(billStatusConverter.toEnum('draft')).toBe(BillStatus.Draft);
    expect(billStatusConverter.toEnum('first_reading')).toBe(BillStatus.FirstReading);
    expect(billStatusConverter.toEnum('enacted')).toBe(BillStatus.Enacted);
  });

  it('should throw error for invalid BillStatus', () => {
    expect(() => billStatusConverter.toEnum('invalid_status')).toThrow(
      'Invalid BillStatus'
    );
  });

  it('should validate BillStatus values', () => {
    expect(billStatusConverter.isValid('draft')).toBe(true);
    expect(billStatusConverter.isValid('invalid')).toBe(false);
  });
});

describe('chamberConverter', () => {
  it('should convert valid Chamber values', () => {
    expect(chamberConverter.toEnum('national_assembly')).toBe(Chamber.NationalAssembly);
    expect(chamberConverter.toEnum('senate')).toBe(Chamber.Senate);
    expect(chamberConverter.toEnum('both')).toBe(Chamber.Both);
  });

  it('should throw error for invalid Chamber', () => {
    expect(() => chamberConverter.toEnum('parliament')).toThrow(
      'Invalid Chamber'
    );
  });

  it('should validate Chamber values', () => {
    expect(chamberConverter.isValid('senate')).toBe(true);
    expect(chamberConverter.isValid('parliament')).toBe(false);
  });
});

describe('Edge cases', () => {
  it('should handle empty string', () => {
    expect(() => userRoleConverter.toEnum('')).toThrow('Invalid UserRole');
    expect(userRoleConverter.isValid('')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(() => userRoleConverter.toEnum('  ')).toThrow('Invalid UserRole');
    expect(userRoleConverter.isValid('  ')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(() => userRoleConverter.toEnum('PUBLIC')).toThrow('Invalid UserRole');
    expect(() => userRoleConverter.toEnum('Public')).toThrow('Invalid UserRole');
    expect(userRoleConverter.isValid('PUBLIC')).toBe(false);
  });

  it('should handle special characters', () => {
    expect(() => billStatusConverter.toEnum('draft!')).toThrow('Invalid BillStatus');
    expect(billStatusConverter.isValid('draft!')).toBe(false);
  });
});
