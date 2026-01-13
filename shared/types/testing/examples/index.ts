/**
 * TYPE TESTING EXAMPLES - MAIN EXPORTS
 *
 * Centralized exports for all type testing examples
 */

export * from './type-level.example';
export * from './runtime-validation.example';
export * from './comprehensive.example';

// ============================================================================
// Examples Metadata
// ============================================================================

export const EXAMPLES_VERSION = '1.0.0' as const;

export const EXAMPLES_AVAILABLE = {
  typeLevelExamples: true,
  runtimeValidationExamples: true,
  comprehensiveExamples: true,
} as const;