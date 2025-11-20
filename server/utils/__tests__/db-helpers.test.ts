import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { buildTimeThreshold, normalizeRowNumbers, groupByTime } from '../db-helpers';
import { logger  } from '@shared/core/src/observability/logging';

describe('Database Helpers', () => {
  describe('buildTimeThreshold', () => {
    const originalDate = new Date('2024-01-15T12:00:00Z'); // Monday

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(originalDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('day formats (Xd)', () => {
      test('parses "7d" correctly', () => {
        const result = buildTimeThreshold('7d');
        const expected = new Date('2024-01-08T00:00:00Z'); // 7 days before, start of day
        expect(result).toEqual(expected);
      });

      test('parses "30d" correctly', () => {
        const result = buildTimeThreshold('30d');
        const expected = new Date('2023-12-16T00:00:00Z');
        expect(result).toEqual(expected);
      });

      test('throws error for invalid day format', () => {
        expect(() => buildTimeThreshold('0d')).toThrow('Days must be a positive number');
        expect(() => buildTimeThreshold('-5d')).toThrow('Days must be a positive number');
      });
    });

    describe('hour formats (Xh)', () => {
      test('parses "1h" correctly', () => {
        const result = buildTimeThreshold('1h');
        const expected = new Date('2024-01-15T11:00:00Z');
        expect(result).toEqual(expected);
      });

      test('parses "24h" correctly', () => {
        const result = buildTimeThreshold('24h');
        const expected = new Date('2024-01-14T12:00:00Z');
        expect(result).toEqual(expected);
      });

      test('throws error for invalid hour format', () => {
        expect(() => buildTimeThreshold('0h')).toThrow('Hours must be positive');
      });
    });

    describe('special values', () => {
      test('handles "month-start"', () => {
        const result = buildTimeThreshold('month-start');
        const expected = new Date('2024-01-01T00:00:00Z');
        expect(result).toEqual(expected);
      });

      test('handles "week-start"', () => {
        const result = buildTimeThreshold('week-start');
        const expected = new Date('2024-01-15T00:00:00Z'); // Monday of the week (Jan 15 is Monday)
        expect(result).toEqual(expected);
      });

      test('handles "year-start"', () => {
        const result = buildTimeThreshold('year-start');
        const expected = new Date('2024-01-01T00:00:00Z');
        expect(result).toEqual(expected);
      });
    });

    describe('edge cases', () => {
      test('handles month boundaries correctly', () => {
        vi.setSystemTime(new Date('2024-03-31T12:00:00Z')); // End of March
        const result = buildTimeThreshold('1d');
        const expected = new Date('2024-03-30T00:00:00Z');
        expect(result).toEqual(expected);
      });

      test('handles leap year correctly', () => {
        vi.setSystemTime(new Date('2024-02-29T12:00:00Z')); // Leap day
        const result = buildTimeThreshold('1d');
        const expected = new Date('2024-02-28T00:00:00Z');
        expect(result).toEqual(expected);
      });

      test('throws error for invalid format', () => {
        expect(() => buildTimeThreshold('invalid')).toThrow('Invalid timeframe format');
        expect(() => buildTimeThreshold('')).toThrow('Invalid timeframe format');
      });
    });
  });

  describe('normalizeRowNumbers', () => {
    test('normalizes string row numbers to numbers', () => {
      const input = [
        { id: 1, row_number: '5', name: 'test' },
        { id: 2, row_number: '10', name: 'test2' }
      ];
      const result = normalizeRowNumbers(input);
      expect(result[0].row_number).toBe(5);
      expect(result[1].row_number).toBe(10);
      expect(result[0].name).toBe('test'); // Other fields preserved
    });

    test('handles null values correctly', () => {
      const input = [
        { id: 1, row_number: null, name: 'test' },
        { id: 2, row_number: '5', name: 'test2' }
      ];
      const result = normalizeRowNumbers(input);
      expect(result[0].row_number).toBeNull();
      expect(result[1].row_number).toBe(5);
    });

    test('handles different field name variations', () => {
      const input = [
        { id: 1, rowNumber: '3', name: 'test' },
        { id: 2, row_number: '7', name: 'test2' },
        { id: 3, rownumber: '9', name: 'test3' }
      ];
      const result = normalizeRowNumbers(input);
      expect(result[0].rowNumber).toBe(3);
      expect(result[1].row_number).toBe(7);
      expect(result[2].rownumber).toBe(9);
    });

    test('preserves non-row-number fields unchanged', () => {
      const input = [
        { id: 1, row_number: '5', metadata: { complex: 'data' }, count: 42 }
      ];
      const result = normalizeRowNumbers(input);
      expect(result[0].row_number).toBe(5);
      expect(result[0].metadata).toEqual({ complex: 'data' });
      expect(result[0].count).toBe(42);
    });

    test('handles invalid number strings gracefully', () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation();
      const input = [
        { id: 1, row_number: 'invalid', name: 'test' }
      ];
      const result = normalizeRowNumbers(input);
      expect(result[0].row_number).toBe('invalid'); // Unchanged on invalid
      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
    });
  });

  describe('groupByTime', () => {
    const testData = [
      { id: 1, created_at: new Date('2024-01-15T10:30:00Z'), value: 10 },
      { id: 2, created_at: new Date('2024-01-15T11:45:00Z'), value: 20 },
      { id: 3, created_at: new Date('2024-01-16T10:30:00Z'), value: 30 },
      { id: 4, created_at: new Date('2024-01-15T10:15:00Z'), value: 40 }
    ];

    test('groups by hour correctly', () => {
      const result = groupByTime(testData, 'created_at', 'hour');
      expect(Object.keys(result)).toHaveLength(3);
      expect(result['2024-01-15T10:00:00Z']).toHaveLength(2); // 10:30 and 10:15
      expect(result['2024-01-15T11:00:00Z']).toHaveLength(1); // 11:45
      expect(result['2024-01-16T10:00:00Z']).toHaveLength(1); // 16th at 10:30
    });

    test('groups by day correctly', () => {
      const result = groupByTime(testData, 'created_at', 'day');
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2024-01-15']).toHaveLength(3);
      expect(result['2024-01-16']).toHaveLength(1);
    });

    test('groups by week correctly', () => {
      const result = groupByTime(testData, 'created_at', 'week');
      expect(Object.keys(result)).toHaveLength(1); // All in same week
      expect(result['2024-01-15']).toHaveLength(4); // Monday of the week (Jan 15 is Monday)
    });

    test('groups by month correctly', () => {
      const result = groupByTime(testData, 'created_at', 'month');
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2024-01']).toHaveLength(4);
    });

    test('handles invalid timestamps gracefully', () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation();
      const invalidData = [
        { id: 1, created_at: 'invalid', value: 10 }
      ];
      const result = groupByTime(invalidData, 'created_at', 'day');
      expect(Object.keys(result)).toHaveLength(0);
      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
    });

    test('returns empty object for empty input', () => {
      const result = groupByTime([], 'created_at', 'day');
      expect(result).toEqual({});
    });
  });
});





































