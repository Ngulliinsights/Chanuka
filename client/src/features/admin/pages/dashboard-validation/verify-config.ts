/**
 * Manual verification script for dashboard config validator
 * Run with: npx tsx client/src/features/dashboard/validation/verify-config.ts
 */

import { validateDashboardConfig, safeValidateDashboardConfig } from './config';

console.log('=== Dashboard Config Validator Verification ===\n');

// Test 1: Valid configuration
console.log('Test 1: Valid configuration');
try {
  const validConfig = {
    widgets: [
      { id: 'widget1', type: 'chart' as const, config: {} },
      { id: 'widget2', type: 'table' as const, config: {} },
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
  console.log('✅ PASS: Valid configuration accepted');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('❌ FAIL:', error instanceof Error ? error.message : String(error));
}

// Test 2: Missing widgets field (Requirement 15.1)
console.log('\nTest 2: Missing widgets field (Requirement 15.1)');
try {
  const invalidConfig = {
    layout: {
      columns: 3,
      rows: 2,
      positions: [],
    },
  };
  
  validateDashboardConfig(invalidConfig);
  console.log('❌ FAIL: Should have rejected configuration');
} catch (error) {
  console.log('✅ PASS: Correctly rejected configuration');
  console.log('Error:', error instanceof Error ? error.message : String(error));
}

// Test 3: Invalid widget type (Requirement 15.2)
console.log('\nTest 3: Invalid widget type (Requirement 15.2)');
try {
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
  
  validateDashboardConfig(invalidConfig);
  console.log('❌ FAIL: Should have rejected configuration');
} catch (error) {
  console.log('✅ PASS: Correctly rejected configuration');
  console.log('Error:', error instanceof Error ? error.message : String(error));
}

// Test 4: Invalid layout (Requirement 15.3)
console.log('\nTest 4: Invalid layout - negative columns (Requirement 15.3)');
try {
  const invalidConfig = {
    widgets: [
      { id: 'widget1', type: 'chart' as const, config: {} },
    ],
    layout: {
      columns: 0,
      rows: 1,
      positions: [
        { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
      ],
    },
  };
  
  validateDashboardConfig(invalidConfig);
  console.log('❌ FAIL: Should have rejected configuration');
} catch (error) {
  console.log('✅ PASS: Correctly rejected configuration');
  console.log('Error:', error instanceof Error ? error.message : String(error));
}

// Test 5: Widget position references non-existent widget (Requirement 15.5)
console.log('\nTest 5: Widget position references non-existent widget (Requirement 15.5)');
try {
  const invalidConfig = {
    widgets: [
      { id: 'widget1', type: 'chart' as const, config: {} },
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
  
  validateDashboardConfig(invalidConfig);
  console.log('❌ FAIL: Should have rejected configuration');
} catch (error) {
  console.log('✅ PASS: Correctly rejected configuration');
  console.log('Error:', error instanceof Error ? error.message : String(error));
}

// Test 6: Safe validation with valid config
console.log('\nTest 6: Safe validation with valid config');
const validConfig = {
  widgets: [
    { id: 'widget1', type: 'metric' as const, config: { value: 42 } },
  ],
  layout: {
    columns: 1,
    rows: 1,
    positions: [
      { widgetId: 'widget1', x: 0, y: 0, width: 1, height: 1 },
    ],
  },
};

const safeResult = safeValidateDashboardConfig(validConfig);
if (safeResult.success) {
  console.log('✅ PASS: Safe validation returned success');
  console.log('Data:', JSON.stringify(safeResult.data, null, 2));
} else {
  console.log('❌ FAIL: Safe validation should have succeeded');
  console.log('Error:', safeResult.error);
}

// Test 7: Safe validation with invalid config
console.log('\nTest 7: Safe validation with invalid config');
const invalidConfig = {
  widgets: [],
  layout: {
    columns: 1,
    rows: 1,
    positions: [],
  },
};

const safeResultInvalid = safeValidateDashboardConfig(invalidConfig);
if (!safeResultInvalid.success && safeResultInvalid.error) {
  console.log('✅ PASS: Safe validation returned error');
  console.log('Error:', safeResultInvalid.error);
} else {
  console.log('❌ FAIL: Safe validation should have failed');
}

console.log('\n=== Verification Complete ===');
