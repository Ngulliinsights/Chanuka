/**
 * Property-Based Tests for Dashboard Config Validation
 * Feature: comprehensive-bug-fixes, Property 16: Dashboard Config Validation
 * Validates: Requirements 15.1, 15.2, 15.3, 15.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateDashboardConfig, type DashboardConfig, type WidgetType } from './config';

// ============================================================================
// Generators
// ============================================================================

const widgetTypeArb = fc.constantFrom<WidgetType>('chart', 'table', 'metric', 'list');

const widgetIdArb = fc.string({ minLength: 1, maxLength: 20 }).filter(id => id.trim().length > 0);

const widgetArb = fc.record({
  id: widgetIdArb,
  type: widgetTypeArb,
  config: fc.dictionary(fc.string(), fc.anything()),
});

const widgetPositionArb = (widgetIds: string[]) =>
  fc.record({
    widgetId: fc.constantFrom(...widgetIds),
    x: fc.nat({ max: 100 }),
    y: fc.nat({ max: 100 }),
    width: fc.integer({ min: 1, max: 10 }),
    height: fc.integer({ min: 1, max: 10 }),
  });

const layoutArb = (widgetIds: string[]) =>
  fc.record({
    columns: fc.integer({ min: 1, max: 12 }),
    rows: fc.integer({ min: 1, max: 12 }),
    positions: fc.array(widgetPositionArb(widgetIds), { minLength: 0, maxLength: widgetIds.length }),
  });

const validDashboardConfigArb = fc
  .array(widgetArb, { minLength: 1, maxLength: 10 })
  .chain(widgets => {
    // Ensure unique widget IDs
    const uniqueWidgets = Array.from(
      new Map(widgets.map(w => [w.id, w])).values()
    );
    const widgetIds = uniqueWidgets.map(w => w.id);

    return fc.record({
      widgets: fc.constant(uniqueWidgets),
      layout: layoutArb(widgetIds),
      theme: fc.option(fc.string(), { nil: undefined }),
      refreshInterval: fc.option(fc.integer({ min: 1000, max: 3600000 }), { nil: undefined }),
    });
  });

// ============================================================================
// Property Tests
// ============================================================================

describe('Dashboard Config Validation - Property Tests', () => {
  // Feature: comprehensive-bug-fixes, Property 16: Dashboard Config Validation
  
  it('Property 16.1: Should accept all valid dashboard configurations', () => {
    fc.assert(
      fc.property(validDashboardConfigArb, (config) => {
        // Valid configurations should not throw
        expect(() => validateDashboardConfig(config)).not.toThrow();
        
        // The returned config should match the input
        const result = validateDashboardConfig(config);
        expect(result).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 16.2: Should reject configurations with invalid widget types', () => {
    const invalidWidgetTypeArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        // Replace one widget's type with an invalid type
        const invalidWidgets = [...uniqueWidgets];
        if (invalidWidgets.length > 0) {
          invalidWidgets[0] = {
            ...invalidWidgets[0],
            type: 'invalid-type' as any,
          };
        }

        return fc.record({
          widgets: fc.constant(invalidWidgets),
          layout: layoutArb(widgetIds),
        });
      });

    fc.assert(
      fc.property(invalidWidgetTypeArb, (config) => {
        // Invalid widget types should throw with descriptive error
        expect(() => validateDashboardConfig(config)).toThrow(/Widget type must be one of/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 16.3: Should reject configurations with invalid layout (non-positive columns)', () => {
    const invalidLayoutColumnsArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        return fc.record({
          widgets: fc.constant(uniqueWidgets),
          layout: fc.record({
            columns: fc.integer({ max: 0 }), // Invalid: non-positive
            rows: fc.integer({ min: 1, max: 12 }),
            positions: fc.array(widgetPositionArb(widgetIds), { maxLength: widgetIds.length }),
          }),
        });
      });

    fc.assert(
      fc.property(invalidLayoutColumnsArb, (config) => {
        // Invalid layout should throw with descriptive error
        expect(() => validateDashboardConfig(config)).toThrow(/Columns must be a positive integer/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 16.4: Should reject configurations with invalid layout (non-positive rows)', () => {
    const invalidLayoutRowsArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        return fc.record({
          widgets: fc.constant(uniqueWidgets),
          layout: fc.record({
            columns: fc.integer({ min: 1, max: 12 }),
            rows: fc.integer({ max: 0 }), // Invalid: non-positive
            positions: fc.array(widgetPositionArb(widgetIds), { maxLength: widgetIds.length }),
          }),
        });
      });

    fc.assert(
      fc.property(invalidLayoutRowsArb, (config) => {
        // Invalid layout should throw with descriptive error
        expect(() => validateDashboardConfig(config)).toThrow(/Rows must be a positive integer/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 16.5: Should reject configurations where positions reference non-existent widgets', () => {
    const invalidPositionRefArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        // Create a position that references a non-existent widget
        const nonExistentId = 'non-existent-widget-' + Math.random();

        return fc.record({
          widgets: fc.constant(uniqueWidgets),
          layout: fc.record({
            columns: fc.integer({ min: 1, max: 12 }),
            rows: fc.integer({ min: 1, max: 12 }),
            positions: fc.array(
              fc.record({
                widgetId: fc.constant(nonExistentId),
                x: fc.nat({ max: 100 }),
                y: fc.nat({ max: 100 }),
                width: fc.integer({ min: 1, max: 10 }),
                height: fc.integer({ min: 1, max: 10 }),
              }),
              { minLength: 1, maxLength: 1 }
            ),
          }),
        });
      });

    fc.assert(
      fc.property(invalidPositionRefArb, (config) => {
        // Positions referencing non-existent widgets should throw
        expect(() => validateDashboardConfig(config)).toThrow(/Widget position references non-existent widget/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 16.6: Should provide field-level error messages for all validation failures', () => {
    const invalidConfigArb = fc.oneof(
      // Missing widgets
      fc.record({
        layout: fc.record({
          columns: fc.integer({ min: 1, max: 12 }),
          rows: fc.integer({ min: 1, max: 12 }),
          positions: fc.constant([]),
        }),
      }),
      // Empty widgets array
      fc.record({
        widgets: fc.constant([]),
        layout: fc.record({
          columns: fc.integer({ min: 1, max: 12 }),
          rows: fc.integer({ min: 1, max: 12 }),
          positions: fc.constant([]),
        }),
      }),
      // Missing layout
      fc.record({
        widgets: fc.array(widgetArb, { minLength: 1, maxLength: 5 }),
      })
    );

    fc.assert(
      fc.property(invalidConfigArb, (config) => {
        // All validation failures should provide descriptive error messages
        expect(() => validateDashboardConfig(config)).toThrow(/Invalid dashboard configuration/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 16.7: Should validate optional fields when present', () => {
    const configWithOptionalFieldsArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        return fc.record({
          widgets: fc.constant(uniqueWidgets),
          layout: layoutArb(widgetIds),
          theme: fc.string({ minLength: 1, maxLength: 20 }),
          refreshInterval: fc.integer({ min: 1000, max: 3600000 }),
        });
      });

    fc.assert(
      fc.property(configWithOptionalFieldsArb, (config) => {
        // Valid configurations with optional fields should not throw
        expect(() => validateDashboardConfig(config)).not.toThrow();
        
        const result = validateDashboardConfig(config);
        expect(result.theme).toBe(config.theme);
        expect(result.refreshInterval).toBe(config.refreshInterval);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 16.8: Should reject invalid refresh intervals', () => {
    const invalidRefreshIntervalArb = fc
      .array(widgetArb, { minLength: 1, maxLength: 5 })
      .chain(widgets => {
        const uniqueWidgets = Array.from(
          new Map(widgets.map(w => [w.id, w])).values()
        );
        const widgetIds = uniqueWidgets.map(w => w.id);

        return fc.record({
          widgets: fc.constant(uniqueWidgets),
          layout: layoutArb(widgetIds),
          refreshInterval: fc.integer({ max: 0 }), // Invalid: non-positive
        });
      });

    fc.assert(
      fc.property(invalidRefreshIntervalArb, (config) => {
        // Invalid refresh intervals should throw
        expect(() => validateDashboardConfig(config)).toThrow(/Refresh interval must be a positive integer/);
      }),
      { numRuns: 50 }
    );
  });
});
