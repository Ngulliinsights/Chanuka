/**
 * @deprecated This file is deprecated and will be removed in v2.0.0
 * 
 * Please import directly from './factory' instead:
 * 
 * @example
 * ```typescript
 * // Old (deprecated):
 * import { createCacheService } from './cache';
 * 
 * // New (recommended):
 * import { createCacheService } from './factory';
 * ```
 * 
 * All exports from this file are now available in './factory'
 */

// Emit deprecation warning at runtime
if (process.env.NODE_ENV !== 'test') {
  console.warn(
    '[DEPRECATION WARNING] server/infrastructure/cache/cache.ts is deprecated.\n' +
    'Please import from ./factory instead. This file will be removed in v2.0.0.\n' +
    'See migration guide: .kiro/specs/infrastructure-consolidation/design.md'
  );
}

// Re-export everything from factory.ts
export * from './factory';

// Maintain backward compatibility with legacy exports
export type {
  CacheService,
  CacheConfig,
} from './core/interfaces';

