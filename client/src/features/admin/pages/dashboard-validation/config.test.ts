/**
 * Dashboard Configuration Validator Tests
 * Tests for Requirements 15.1, 15.2, 15.3, 15.5
 */

import { describe, it, expect } from 'vitest';
import { validateDashboardConfig, safeValidateDashboardConfig } from './config';

describe('Dashboard Config Validator', () => {
  describe('validateDashboardConfig', () => {
    it('should accept valid dashboard configuration', () => {
      const validConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
          { id: 'widget2', type: 'table', config: {} },
        ],
        layout: {
          columns: 3,
          rows: 2,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 2, height: 1 },
            { widgetId: 'widget2', x: 2, y: 0, width: 1, height: 1 },
          ],
        },
        theme: 'light',
        refreshInterval: 30000,
      };

      const result = validateDashboardConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should accept valid configuration without optional fields', () => {
      const validConfig = {
        widgets: [
          { id: 'widget1', type: 'metric', config: { value: 42 } },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
          ],
        },
      };

      const result = validateDashboardConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    // Requirement 15.1: Validate all required fields
    it('should reject configuration missing widgets field', () => {
      const invalidConfig = {
        layout: {
          columns: 3,
          rows: 2,
          positions: [],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Invalid dashboard configuration/
      );
    });

    it('should reject configuration missing layout field', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Invalid dashboard configuration/
      );
    });

    it('should reject configuration with empty widgets array', () => {
      const invalidConfig = {
        widgets: [],
        layout: {
          columns: 3,
          rows: 2,
          positions: [],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Dashboard must have at least one widget/
      );
    });

    // Requirement 15.2: Reject configs with invalid widget types
    it('should reject configuration with invalid widget type', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'invalid-type', config: {} },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Widget type must be one of: chart, table, metric, list/
      );
    });

    // Requirement 15.3: Reject configs with invalid layout
    it('should reject configuration with invalid layout columns', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 0,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Columns must be a positive integer/
      );
    });

    it('should reject configuration with invalid layout rows', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 1,
          rows: -1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Rows must be a positive integer/
      );
    });

    it('should reject configuration with negative position coordinates', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: -1, y: 0, width: 1, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /X position must be a non-negative integer/
      );
    });

    it('should reject configuration with invalid position dimensions', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 0, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Width must be a positive integer/
      );
    });

    // Requirement 15.5: Ensure widget positions reference existing widgets
    it('should reject configuration where position references non-existent widget', () => {
      const invalidConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 2,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
            { widgetId: 'widget2', x: 1, y: 0, width: 1, height: 1 },
          ],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Widget position references non-existent widget: widget2/
      );
    });

    it('should provide field-level error messages', () => {
      const invalidConfig = {
        widgets: [
          { id: '', type: 'chart', config: {} },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [],
        },
      };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(
        /Widget ID cannot be empty/
      );
    });
  });

  describe('safeValidateDashboardConfig', () => {
    it('should return success for valid configuration', () => {
      const validConfig = {
        widgets: [
          { id: 'widget1', type: 'chart', config: {} },
        ],
        layout: {
          columns: 1,
          rows: 1,
          positions: [
            { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
          ],
        },
      };

      const result = safeValidateDashboardConfig(validConfig);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validConfig);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid configuration', () => {
      const invalidConfig = {
        widgets: [],
        layout: {
          columns: 1,
          rows: 1,
          positions: [],
        },
      };

      const result = safeValidateDashboardConfig(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toContain('Dashboard must have at least one widget');
    });
  });
});
