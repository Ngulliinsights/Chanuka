/**
 * @deprecated This file has been merged into './caching-service.ts'
 * Please import from './caching-service' instead.
 * This file will be removed in v2.0.0
 *
 * @example
 * // Old (deprecated):
 * import { ICachingService } from './icaching-service';
 *
 * // New (recommended):
 * import { ICachingService } from './caching-service';
 */

// Emit deprecation warning at runtime
if (typeof console !== 'undefined' && console.warn) {
  console.warn(
    '[DEPRECATION WARNING] icaching-service.ts is deprecated and has been merged into caching-service.ts. ' +
    'Please update your imports to use "./caching-service" instead. ' +
    'This file will be removed in v2.0.0'
  );
}

// Re-export everything from the consolidated module
export * from './caching-service';
