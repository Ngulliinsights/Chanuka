/**
 * Unit Tests for Date and Time Formatting Utilities
 * 
 * Tests date formatting, timestamp formatting, and relative time formatting.
 * 
 * **Validates: Requirements 7.1**
 */

import { formatDate, formatTimestamp, formatRelativeTime } from './date-time';

describe('Date and Time Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('January 15, 2024');
    });

    it('should format string date correctly', () => {
      const formatted = formatDate('2024-03-20T15:45:00.000Z');
      expect(formatted).toBe('March 20, 2024');
    });

    it('should format timestamp number correctly', () => {
      const timestamp = new Date('2024-12-25T00:00:00.000Z').getTime();
      const formatted = formatDate(timestamp);
      expect(formatted).toBe('December 25, 2024');
    });

    it('should handle edge case: January 1st', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('January 1, 2024');
    });

    it('should handle edge case: December 31st', () => {
      const date = new Date('2024-12-31T23:59:59.999Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('December 31, 2024');
    });

    it('should handle leap year date', () => {
      const date = new Date('2024-02-29T12:00:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('February 29, 2024');
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date object with time', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const formatted = formatTimestamp(date);
      // Note: Time will be in local timezone, so we check for date part
      expect(formatted).toContain('January 15, 2024');
      expect(formatted).toMatch(/\d{2}:\d{2}/); // Contains time in HH:MM format
    });

    it('should format timestamp number with time', () => {
      const timestamp = new Date('2024-03-20T15:45:00.000Z').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toContain('March 20, 2024');
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('should include AM/PM indicator', () => {
      const morning = new Date('2024-01-15T08:30:00.000Z');
      const formatted = formatTimestamp(morning);
      expect(formatted).toMatch(/AM|PM/);
    });

    it('should handle midnight', () => {
      const midnight = new Date('2024-01-15T00:00:00.000Z');
      const formatted = formatTimestamp(midnight);
      expect(formatted).toContain('January 15, 2024');
    });

    it('should handle noon', () => {
      const noon = new Date('2024-01-15T12:00:00.000Z');
      const formatted = formatTimestamp(noon);
      expect(formatted).toContain('January 15, 2024');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "just now" for very recent times', () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      const formatted = formatRelativeTime(now);
      expect(formatted).toBe('just now');
    });

    it('should return "just now" for times within 60 seconds', () => {
      const recent = new Date('2024-01-15T11:59:30.000Z'); // 30 seconds ago
      const formatted = formatRelativeTime(recent);
      expect(formatted).toBe('just now');
    });

    it('should return minutes for times within an hour', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00.000Z');
      const formatted = formatRelativeTime(fiveMinutesAgo);
      expect(formatted).toBe('5m ago');
    });

    it('should return minutes for 30 minutes ago', () => {
      const thirtyMinutesAgo = new Date('2024-01-15T11:30:00.000Z');
      const formatted = formatRelativeTime(thirtyMinutesAgo);
      expect(formatted).toBe('30m ago');
    });

    it('should return hours for times within a day', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00.000Z');
      const formatted = formatRelativeTime(twoHoursAgo);
      expect(formatted).toBe('2h ago');
    });

    it('should return hours for 12 hours ago', () => {
      const twelveHoursAgo = new Date('2024-01-15T00:00:00.000Z');
      const formatted = formatRelativeTime(twelveHoursAgo);
      expect(formatted).toBe('12h ago');
    });

    it('should return formatted date for times over a day ago', () => {
      const twoDaysAgo = new Date('2024-01-13T12:00:00.000Z');
      const formatted = formatRelativeTime(twoDaysAgo);
      expect(formatted).toBe('January 13, 2024');
    });

    it('should handle string date input', () => {
      const formatted = formatRelativeTime('2024-01-15T11:55:00.000Z');
      expect(formatted).toBe('5m ago');
    });

    it('should handle timestamp number input', () => {
      const timestamp = new Date('2024-01-15T11:50:00.000Z').getTime();
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toBe('10m ago');
    });

    it('should handle edge case: exactly 1 hour ago', () => {
      const oneHourAgo = new Date('2024-01-15T11:00:00.000Z');
      const formatted = formatRelativeTime(oneHourAgo);
      expect(formatted).toBe('1h ago');
    });

    it('should handle edge case: exactly 24 hours ago', () => {
      const oneDayAgo = new Date('2024-01-14T12:00:00.000Z');
      const formatted = formatRelativeTime(oneDayAgo);
      expect(formatted).toBe('January 14, 2024');
    });
  });
});
