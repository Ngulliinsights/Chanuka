/**
 * TYPE TESTING INFRASTRUCTURE - MAIN EXPORTS
 *
 * Centralized exports for the complete type testing infrastructure
 */

// Type-level testing utilities
export * from './type-level';

// Runtime validation utilities
export * from './runtime-validation';

// Integration testing utilities
export * from './integration';

// Automated validation utilities
export * from './automated-validation';

// ============================================================================
// Testing Infrastructure Metadata
// ============================================================================

export const TESTING_INFRASTRUCTURE_VERSION = '1.0.0' as const;

export const TESTING_INFRASTRUCTURE_COMPONENTS = {
  typeLevelTesting: true,
  runtimeValidation: true,
  integrationTesting: true,
  automatedValidation: true,
} as const;

export const TESTING_INFRASTRUCTURE_FEATURES = {
  ...TYPE_LEVEL_TESTING_FEATURES,
  ...RUNTIME_VALIDATION_FEATURES,
  ...INTEGRATION_TESTING_FEATURES,
  ...AUTOMATED_VALIDATION_FEATURES,
} as const;