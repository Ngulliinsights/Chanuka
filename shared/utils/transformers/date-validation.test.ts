/**
 * Date Validation Tests
 * Verifies that date transformers properly validate dates
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import { dateToStringTransformer, optionalDateToStringTransformer } from './base';

describe('Date Transformer Validation', () => {
  describe('dateToStringTransformer', () => {
    it('should transform valid dates to ISO strings', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = dateToStringTransformer.transform(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should throw descriptive error for invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(() => dateToStringTransformer.transform(invalidDate)).toThrow(
        'Cannot transform invalid date:'
      );
    });

    it('should throw descriptive error for NaN dates', () => {
      const nanDate = new Date(NaN);
      expect(() => dateToStringTransformer.transform(nanDate)).toThrow(
        'Cannot transform invalid date:'
      );
    });

    it('should reverse valid ISO strings to dates', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = dateToStringTransformer.reverse(isoString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(isoString);
    });

    it('should throw descriptive error for invalid date strings', () => {
      expect(() => dateToStringTransformer.reverse('invalid-date')).toThrow(
        'Cannot parse invalid date string:'
      );
    });
  });

  describe('optionalDateToStringTransformer', () => {
    it('should transform valid dates to ISO strings', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = optionalDateToStringTransformer.transform(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle null dates', () => {
      const result = optionalDateToStringTransformer.transform(null);
      expect(result).toBeNull();
    });

    it('should handle undefined dates', () => {
      const result = optionalDateToStringTransformer.transform(undefined);
      expect(result).toBeNull();
    });

    it('should throw descriptive error for invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(() => optionalDateToStringTransformer.transform(invalidDate)).toThrow(
        'Cannot transform invalid date:'
      );
    });

    it('should reverse valid ISO strings to dates', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = optionalDateToStringTransformer.reverse(isoString);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(isoString);
    });

    it('should reverse null to null', () => {
      const result = optionalDateToStringTransformer.reverse(null);
      expect(result).toBeNull();
    });

    it('should throw descriptive error for invalid date strings', () => {
      expect(() => optionalDateToStringTransformer.reverse('invalid-date')).toThrow(
        'Cannot parse invalid date string:'
      );
    });
  });
});
