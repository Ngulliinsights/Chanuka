/**
 * Manual runner for property tests
 * Run with: npx tsx client/src/features/dashboard/validation/run-property-tests.ts
 */

import fc from 'fast-check';
import { validateDashboardConfig, type WidgetType } from './config';

console.log('=== Dashboard Config Property Tests ===\n');

// Generators
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

// Test 1: Valid configurations
console.log('Test 1: Valid configurations should be accepted');
try {
  fc.assert(
    fc.property(validDashboardConfigArb, (config) => {
      validateDashboardConfig(config);
      return true;
    }),
    { numRuns: 100 }
  );
  console.log('✅ PASS: All 100 valid configurations accepted\n');
} catch (error) {
  console.log('❌ FAIL:', error instanceof Error ? error.message : String(error));
  console.log();
}

// Test 2: Invalid widget types
console.log('Test 2: Invalid widget types should be rejected');
const invalidWidgetTypeArb = fc
  .array(widgetArb, { minLength: 1, maxLength: 5 })
  .chain(widgets => {
    const uniqueWidgets = Array.from(
      new Map(widgets.map(w => [w.id, w])).values()
    );
    const widgetIds = uniqueWidgets.map(w => w.id);

    const invalidWidgets = [...uniqueWidgets];
    if (invalidWidgets.length > 0) {
      invalidWidgets[0] = {
        ...invalidWidgets[0],
        type: 'invalid-type' as unknown,
      };
    }

    return fc.record({
      widgets: fc.constant(invalidWidgets),
      layout: layoutArb(widgetIds),
    });
  });

try {
  fc.assert(
    fc.property(invalidWidgetTypeArb, (config) => {
      try {
        validateDashboardConfig(config);
        return false; // Should have thrown
      } catch (error) {
        return error instanceof Error && /Widget type must be one of/.test(error.message);
      }
    }),
    { numRuns: 50 }
  );
  console.log('✅ PASS: All 50 invalid widget types rejected\n');
} catch (error) {
  console.log('❌ FAIL:', error instanceof Error ? error.message : String(error));
  console.log();
}

// Test 3: Invalid layout columns
console.log('Test 3: Invalid layout columns should be rejected');
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
        columns: fc.integer({ max: 0 }),
        rows: fc.integer({ min: 1, max: 12 }),
        positions: fc.array(widgetPositionArb(widgetIds), { maxLength: widgetIds.length }),
      }),
    });
  });

try {
  fc.assert(
    fc.property(invalidLayoutColumnsArb, (config) => {
      try {
        validateDashboardConfig(config);
        return false;
      } catch (error) {
        return error instanceof Error && /Columns must be a positive integer/.test(error.message);
      }
    }),
    { numRuns: 50 }
  );
  console.log('✅ PASS: All 50 invalid column values rejected\n');
} catch (error) {
  console.log('❌ FAIL:', error instanceof Error ? error.message : String(error));
  console.log();
}

// Test 4: Non-existent widget references
console.log('Test 4: Non-existent widget references should be rejected');
const invalidPositionRefArb = fc
  .array(widgetArb, { minLength: 1, maxLength: 5 })
  .chain(widgets => {
    const uniqueWidgets = Array.from(
      new Map(widgets.map(w => [w.id, w])).values()
    );

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

try {
  fc.assert(
    fc.property(invalidPositionRefArb, (config) => {
      try {
        validateDashboardConfig(config);
        return false;
      } catch (error) {
        return error instanceof Error && /Widget position references non-existent widget/.test(error.message);
      }
    }),
    { numRuns: 50 }
  );
  console.log('✅ PASS: All 50 invalid widget references rejected\n');
} catch (error) {
  console.log('❌ FAIL:', error instanceof Error ? error.message : String(error));
  console.log();
}

console.log('=== Property Tests Complete ===');
console.log('Total runs: 250 (100 + 50 + 50 + 50)');
