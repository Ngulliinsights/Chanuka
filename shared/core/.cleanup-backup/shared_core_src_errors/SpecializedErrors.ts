/**
 * DEPRECATED: Legacy errors directory
 * 
 * This file has been consolidated into the unified observability system.
 * Please update your imports to use:
 * 
 * import { ... } from '@shared/core/observability/error-management'
 * 
 * This legacy export will be removed in a future version.
 */

// Re-export from the new consolidated location
export * from '../observability/error-management/legacy-adapters/errors-adapter.js';

// Deprecation warning
console.warn(
  '[DEPRECATED] Importing from shared/core/src/errors/SpecializedErrors is deprecated. ' +
  'Please import from shared/core/src/observability/error-management instead. ' +
  'This legacy export will be removed in a future version.'
);












































