/**
 * INTEGRATION TESTING - MAIN EXPORTS
 *
 * Centralized exports for all integration testing functionality
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

export * from './comprehensive-type-tests';
export * from './validation-middleware-tests';
export * from './comprehensive-integration-test';
export * from './integration-test-runner';
export * from './backward-compatibility-test';

// ============================================================================
// Integration Testing Metadata
// ============================================================================

export const INTEGRATION_TESTING_VERSION = '1.0.0' as const;

export const INTEGRATION_TESTING_COMPONENTS = {
  comprehensiveTypeTests: true,
  validationMiddlewareTests: true,
  backwardCompatibilityTests: true,
  domainTypePatternValidation: true,
} as const;

export const INTEGRATION_TESTING_FEATURES = {
  comprehensiveTypeTests: true,
  validationMiddlewareTests: true,
  comprehensiveIntegrationTests: true,
  integrationTestRunner: true,
  backwardCompatibilityTests: true,
} as const;