import { describe, it, expect } from 'vitest';
import {
  brand,
  isBranded,
  unbrand,
  UserId,
  createUserId,
  Email,
  createEmail,
  PositiveInt,
  createPositiveInt,
  NonNegativeInt,
  createNonNegativeInt,
  Url,
  createUrl,
  Uuid,
  createUuid,
  Timestamp,
  createTimestamp,
  Percentage,
  createPercentage
} from '../types/branded';

describe('Branded Types', () => {
  describe('brand function', () => {
    it('should create branded values', () => {
      const userId = brand('123', 'UserId');
      expect(userId).toBe('123');
      expect(isBranded(userId, 'UserId')).toBe(true);
    });

    it('should unbrand values correctly', () => {
      const branded = brand(42, 'Test');
      const unbranded = unbrand(branded);
      expect(unbranded).toBe(42);
    });
  });

  describe('UserId', () => {
    it('should create valid UserIds', () => {
      const userId = createUserId('user123');
      expect(userId).toBe('user123');
      expect(isBranded(userId, 'UserId')).toBe(true);
    });

    it('should reject empty UserIds', () => {
      expect(() => createUserId('')).toThrow('UserId cannot be empty');
      expect(() => createUserId('   ')).toThrow('UserId cannot be empty');
    });
  });

  describe('Email', () => {
    it('should create valid emails', () => {
      const email = createEmail('user@example.com');
      expect(email).toBe('user@example.com');
      expect(isBranded(email, 'Email')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(() => createEmail('invalid')).toThrow('Invalid email format');
      expect(() => createEmail('user@')).toThrow('Invalid email format');
      expect(() => createEmail('@example.com')).toThrow('Invalid email format');
    });
  });

  describe('PositiveInt', () => {
    it('should create positive integers', () => {
      const positive = createPositiveInt(42);
      expect(positive).toBe(42);
      expect(isBranded(positive, 'PositiveInt')).toBe(true);
    });

    it('should reject zero and negative numbers', () => {
      expect(() => createPositiveInt(0)).toThrow('Value must be a positive integer');
      expect(() => createPositiveInt(-1)).toThrow('Value must be a positive integer');
    });

    it('should reject non-integers', () => {
      expect(() => createPositiveInt(3.14)).toThrow('Value must be a positive integer');
      expect(() => createPositiveInt(NaN)).toThrow('Value must be a positive integer');
    });
  });

  describe('NonNegativeInt', () => {
    it('should create non-negative integers', () => {
      const zero = createNonNegativeInt(0);
      const positive = createNonNegativeInt(42);

      expect(zero).toBe(0);
      expect(positive).toBe(42);
      expect(isBranded(zero, 'NonNegativeInt')).toBe(true);
      expect(isBranded(positive, 'NonNegativeInt')).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(() => createNonNegativeInt(-1)).toThrow('Value must be a non-negative integer');
    });

    it('should reject non-integers', () => {
      expect(() => createNonNegativeInt(3.14)).toThrow('Value must be a non-negative integer');
    });
  });

  describe('Url', () => {
    it('should create valid URLs', () => {
      const url = createUrl('https://example.com/path');
      expect(url).toBe('https://example.com/path');
      expect(isBranded(url, 'Url')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(() => createUrl('not-a-url')).toThrow('Invalid URL format');
      expect(() => createUrl('')).toThrow('Invalid URL format');
    });
  });

  describe('Uuid', () => {
    it('should create valid UUIDs', () => {
      const uuid = createUuid('123e4567-e89b-12d3-a456-426614174000');
      expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(isBranded(uuid, 'Uuid')).toBe(true);
    });

    it('should reject invalid UUID formats', () => {
      expect(() => createUuid('invalid')).toThrow('Invalid UUID format');
      expect(() => createUuid('123e4567-e89b-12d3-a456')).toThrow('Invalid UUID format');
    });
  });

  describe('Timestamp', () => {
    it('should create valid timestamps', () => {
      const timestamp = createTimestamp(1640995200000); // 2022-01-01
      expect(timestamp).toBe(1640995200000);
      expect(isBranded(timestamp, 'Timestamp')).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      expect(() => createTimestamp(-1)).toThrow('Invalid timestamp');
      expect(() => createTimestamp(NaN)).toThrow('Invalid timestamp');
    });
  });

  describe('Percentage', () => {
    it('should create valid percentages', () => {
      const zero = createPercentage(0);
      const fifty = createPercentage(50);
      const hundred = createPercentage(100);

      expect(zero).toBe(0);
      expect(fifty).toBe(50);
      expect(hundred).toBe(100);
      expect(isBranded(zero, 'Percentage')).toBe(true);
    });

    it('should reject out-of-range values', () => {
      expect(() => createPercentage(-1)).toThrow('Percentage must be between 0 and 100');
      expect(() => createPercentage(101)).toThrow('Percentage must be between 0 and 100');
    });

    it('should reject non-finite numbers', () => {
      expect(() => createPercentage(NaN)).toThrow('Percentage must be between 0 and 100');
      expect(() => createPercentage(Infinity)).toThrow('Percentage must be between 0 and 100');
    });
  });

  describe('Type safety', () => {
    it('should prevent mixing different branded types', () => {
      const userId = createUserId('123');
      const email = createEmail('test@example.com');

      // These should be different types at compile time
      expect(typeof userId).toBe('string');
      expect(typeof email).toBe('string');

      // But they should not be assignable to each other
      // Note: Runtime test can't catch type errors, but this ensures they are strings
      expect(userId).toBe('123');
      expect(email).toBe('test@example.com');
    });
  });
});