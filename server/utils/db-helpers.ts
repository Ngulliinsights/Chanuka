import { logger  } from '../../shared/core/src/index.js';

/**
 * Database helper utilities for standardized date calculations and result formatting.
 * These utilities ensure consistent timezone handling and edge case management.
 */

/**
 * Builds a time threshold Date object from a timeframe string.
 * All calculations are performed in UTC to avoid timezone issues.
 *
 * Supported formats:
 * - "Xd" format: "7d", "30d" for days
 * - "Xh" format: "1h", "24h" for hours
 * - Special values: "month-start", "week-start", "year-start"
 *
 * @param timeframe - The timeframe string to parse
 * @returns Date object representing the threshold
 * @throws Error if timeframe format is invalid
 *
 * @example
 * buildTimeThreshold("7d") // 7 days ago in UTC
 * buildTimeThreshold("24h") // 24 hours ago in UTC
 * buildTimeThreshold("month-start") // Start of current month in UTC
 */
export function buildTimeThreshold(timeframe: string): Date {
  const now = new Date();

  // Handle "Xd" format (days)
  const dayMatch = timeframe.match(/^(-?\d+)d$/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days <= 0 || isNaN(days)) {
      throw new Error(`Invalid timeframe: ${timeframe}. Days must be a positive number.`);
    }
    const threshold = new Date(now);
    threshold.setUTCDate(threshold.getUTCDate() - days);
    threshold.setUTCHours(0, 0, 0, 0); // Start of day
    return threshold;
  }

  // Handle "Xh" format (hours)
  const hourMatch = timeframe.match(/^(\d+)h$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (hours <= 0) {
      throw new Error(`Invalid timeframe: ${timeframe}. Hours must be positive.`);
    }
    const threshold = new Date(now);
    threshold.setUTCHours(threshold.getUTCHours() - hours);
    return threshold;
  }

  // Handle special values
  switch (timeframe) {
    case 'month-start': {
      const threshold = new Date(now);
      threshold.setUTCDate(1); // First day of current month
      threshold.setUTCHours(0, 0, 0, 0);
      return threshold;
    }
    case 'week-start': {
      const threshold = new Date(now);
      const dayOfWeek = threshold.getUTCDay(); // 0 = Sunday
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
      threshold.setUTCDate(threshold.getUTCDate() - daysToSubtract);
      threshold.setUTCHours(0, 0, 0, 0);
      return threshold;
    }
    case 'year-start': {
      const threshold = new Date(now);
      threshold.setUTCMonth(0, 1); // January 1st
      threshold.setUTCHours(0, 0, 0, 0);
      return threshold;
    }
    default:
      throw new Error(
        `Invalid timeframe format: ${timeframe}. ` +
        `Supported formats: "Xd" (e.g., "7d"), "Xh" (e.g., "24h"), ` +
        `or special values: "month-start", "week-start", "year-start"`
      );
  }
}

/**
 * Normalizes row number formats in database result arrays.
 * Converts various row number representations to consistent numbers.
 * Handles null values appropriately and preserves all other row data.
 *
 * @param rows - Array of database result rows
 * @returns Array with normalized row numbers
 *
 * @example
 * normalizeRowNumbers([{ id: 1, row_number: "5" }, { id: 2, row_number: null }])
 * // Returns: [{ id: 1, row_number: 5 }, { id: 2, row_number: null }]
 */
export function normalizeRowNumbers<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map(row => {
    const normalized = { ...row };

    // Look for row number fields and normalize them
    Object.keys(normalized).forEach(key => {
      if (key.toLowerCase().includes('row') && key.toLowerCase().includes('number')) {
        const value = (normalized as any)[key];
        if (value !== null && value !== undefined) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (!isNaN(numValue)) {
            (normalized as any)[key] = numValue;
          } else {
            logger.warn('Failed to normalize row number', {
              component: 'db-helpers',
              operation: 'normalizeRowNumbers',
              key,
              value,
              rowId: (row as any).id || 'unknown'
            });
          }
        }
      }
    });

    return normalized;
  });
}

/**
 * Groups database results by time periods for time-based analytics.
 * Supports grouping by hour, day, week, or month.
 *
 * @param data - Array of data with timestamp fields
 * @param timestampField - Name of the timestamp field
 * @param groupBy - Grouping period ('hour' | 'day' | 'week' | 'month')
 * @returns Grouped data with period keys
 *
 * @example
 * groupByTime([{ createdAt: new Date(), value: 10 }], 'createdAt', 'day')
 */
export function groupByTime<T extends Record<string, any>>(
  data: T[],
  timestampField: keyof T,
  groupBy: 'hour' | 'day' | 'week' | 'month'
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  data.forEach(item => {
    const timestamp = item[timestampField] as any;
    if (!(timestamp instanceof Date)) {
      logger.warn('Invalid timestamp in groupByTime', {
        component: 'db-helpers',
        operation: 'groupByTime',
        timestampField: String(timestampField),
        timestamp
      });
      return;
    }

    let key: string;
    switch (groupBy) {
      case 'hour':
        key = `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(timestamp.getUTCDate()).padStart(2, '0')}T${String(timestamp.getUTCHours()).padStart(2, '0')}:00:00Z`;
        break;
      case 'day':
        key = `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}-${String(timestamp.getUTCDate()).padStart(2, '0')}`;
        break;
      case 'week': {
        const startOfWeek = new Date(timestamp);
        const dayOfWeek = startOfWeek.getUTCDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysToSubtract);
        startOfWeek.setUTCHours(0, 0, 0, 0);
        key = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'month':
        key = `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  return groups;
}





































