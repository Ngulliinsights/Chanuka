# Cache Factory Comparison Analysis

## Task 4.2: Analyze differences between `simple-factory.ts` and `factory.ts`

**Date:** 2026-02-16  
**Status:** Complete

---

## Executive Summary

The two factory files serve different purposes and have minimal overlap:

- **`simple-factory.ts`**: Singleton factory pattern for managing multiple named cache instances
- **`factory.ts`**: Functional factory pattern for creating individual cache services with advanced features

**Key Finding:** These files are complementary rather than duplicative. Consolidation should merge their patterns while preserving both use cases.

---

## Detailed Comparison

### 1. Architecture Pattern

| Aspect | simple-factory.ts | factory.ts |
|--------|------------------|------------|
| **Pattern** | Singleton class with instance registry | Functional factory with singleton default |
| **Instance Management** | Multiple named caches in Map | Single default cache + on-demand creation |
| **API Style** | Object-oriented (class methods) | Functional (exported functions) |

### 2. Type System

| Aspect | simple-factory.ts | factory.ts |
|--------|------------------|------------|
| **Return Type** | `CacheAdapter` | `CacheService` |
| **Config Type** | `SimpleCacheConfig` (custom) | `CacheConfig` (standard) |
| **Type Safety** | Limited (only memory provider) | Comprehensive (memory/redis/multi-tier) |

### 3. Supported Providers

| Provider | simple-factory.ts | factory.ts |
|----------|------------------|------------|
| **Memory** | ✅ Yes | ✅ Yes |
| **Redis** | ❌ No | ✅ Yes (but missing import) |
| **Multi-tier** | ❌ No | ✅ Yes |

**Note:** `factory.ts` references `RedisAdapter` but doesn't import it. This is a bug that needs fixing.

### 4. Feature Comparison

#### simple-factory.ts Features
```typescript
✅ Named cache instances (registry pattern)
✅ Instance reuse (get existing cache by name)
✅ Bulk operations (clearAll, shutdown)
✅ Cache lifecycle management
✅ Instance enumeration (getCacheNames)
✅ Singleton pattern
```

#### factory.ts Features
```typescript
✅ CacheManager class (warmUp, stats, health, maintenance)
✅ Multi-provider support (memory/redis/multi-tier)
✅ Default cache instance management
✅ Advanced configuration options
✅ Compression support
✅ Metrics integration
✅ Circuit breaker support (commented out)
```

### 5. Configuration Options

#### simple-factory.ts Config
```typescript
interface SimpleCacheConfig {
  provider: 'memory';              // Only memory supported
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  keyPrefix?: string;
}
```

#### factory.ts Config
```typescript
interface CacheConfig {
  provider: 'memory' | 'redis' | 'multi-tier';
  keyPrefix?: string;
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  enableMetrics?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  redisUrl?: string;              // Redis-specific
  l1MaxSizeMB?: number;           // Multi-tier specific
}
```

### 6. API Surface

#### simple-factory.ts API
```typescript
class SimpleCacheFactory {
  static getInstance(): SimpleCacheFactory
  createCache(name: string, config: SimpleCacheConfig): CacheAdapter
  getCache(name: string): CacheAdapter | undefined
  removeCache(name: string): boolean
  getCacheNames(): string[]
  clearAll(): Promise<void>
  shutdown(): Promise<void>
}

export const cacheFactory = SimpleCacheFactory.getInstance();
```

#### factory.ts API
```typescript
class CacheManager {
  constructor(cache: CacheService)
  warmUp(entries: Array<{...}>): Promise<void>
  getStats(): CacheMetrics | undefined
  getHealth(): Promise<CacheHealthStatus | undefined>
  clear(): Promise<void>
  maintenance(): Promise<void>
}

// Factory functions
function createCacheService(config: CacheConfig): CacheService
function getDefaultCache(): CacheService
function initializeDefaultCache(config: CacheConfig): CacheService
function resetDefaultCache(): void
function createCacheManager(cache?: CacheService): CacheManager
```

### 7. Code Quality Issues

#### simple-factory.ts Issues
- ✅ Clean, well-documented
- ✅ Type-safe
- ⚠️ Limited to memory provider only
- ⚠️ Uses `any` type for memoryConfig

#### factory.ts Issues
- ⚠️ Missing `RedisAdapter` import (compilation error)
- ⚠️ Uses `as any` type assertion at return
- ⚠️ TODO comment about SingleFlightCache interface conflict
- ⚠️ Excessive spread operator usage (verbose)
- ✅ Comprehensive feature support

---

## Consolidation Strategy

### Recommended Approach: Merge into Unified `factory.ts`

#### Phase 1: Fix Existing Issues
1. Remove `RedisAdapter` case (no adapter exists in codebase)
2. Fix type assertions
3. Clean up spread operator verbosity

#### Phase 2: Merge Functionality
1. Keep functional factory pattern from `factory.ts` as primary API
2. Add named cache registry from `simple-factory.ts`
3. Preserve `CacheManager` class
4. Add convenience functions for both patterns

#### Phase 3: Unified API Design

```typescript
// Unified factory.ts structure

// 1. CacheManager class (from factory.ts)
export class CacheManager { /* ... */ }

// 2. Named cache registry (from simple-factory.ts)
class CacheRegistry {
  private caches = new Map<string, CacheService>();
  
  register(name: string, cache: CacheService): void
  get(name: string): CacheService | undefined
  remove(name: string): boolean
  list(): string[]
  clearAll(): Promise<void>
  shutdown(): Promise<void>
}

const registry = new CacheRegistry();

// 3. Factory functions (enhanced from factory.ts)
export function createCacheService(config: CacheConfig): CacheService {
  // Support memory and multi-tier only (redis removed)
}

// 4. Named cache functions (from simple-factory.ts)
export function createNamedCache(name: string, config: CacheConfig): CacheService {
  let cache = registry.get(name);
  if (!cache) {
    cache = createCacheService(config);
    registry.register(name, cache);
  }
  return cache;
}

export function getNamedCache(name: string): CacheService | undefined {
  return registry.get(name);
}

export function removeNamedCache(name: string): boolean {
  return registry.remove(name);
}

export function listCaches(): string[] {
  return registry.list();
}

// 5. Default cache singleton (from factory.ts)
let defaultCacheInstance: CacheService | null = null;

export function getDefaultCache(): CacheService { /* ... */ }
export function initializeDefaultCache(config: CacheConfig): CacheService { /* ... */ }
export function resetDefaultCache(): void { /* ... */ }

// 6. CacheManager factory (from factory.ts)
export function createCacheManager(cache?: CacheService): CacheManager { /* ... */ }

// 7. Simple convenience function (from simple-factory.ts concept)
export function createSimpleCacheService(config?: Partial<CacheConfig>): CacheService {
  return createCacheService({
    provider: 'memory',
    defaultTtlSec: config?.defaultTtlSec || 3600,
    maxMemoryMB: config?.maxMemoryMB || 100,
    ...config
  });
}
```

---

## Migration Impact

### Breaking Changes
- ❌ None if we maintain backward compatibility exports

### Deprecation Path
1. Keep `simple-factory.ts` with deprecation warning
2. Re-export new functions from unified `factory.ts`
3. Update documentation
4. Remove after grace period

### Import Updates Needed
```typescript
// Old (simple-factory.ts)
import { cacheFactory } from './simple-factory';
const cache = cacheFactory.createCache('myCache', config);

// New (unified factory.ts)
import { createNamedCache } from './factory';
const cache = createNamedCache('myCache', config);

// Or use default cache
import { initializeDefaultCache } from './factory';
const cache = initializeDefaultCache(config);
```

---

## Lines of Code Analysis

| File | Current LOC | Target LOC | Change |
|------|-------------|------------|--------|
| simple-factory.ts | 108 | 0 (deprecated) | -108 |
| factory.ts | 200 | 280 | +80 |
| **Total** | **308** | **280** | **-28** |

**Net Reduction:** 28 lines (9% reduction)  
**Functional Consolidation:** 2 files → 1 file

---

## Recommendations

### Immediate Actions (Task 4.3)
1. ✅ Fix `RedisAdapter` reference in `factory.ts` (remove redis case)
2. ✅ Add named cache registry to `factory.ts`
3. ✅ Add convenience functions for simple use cases
4. ✅ Improve type safety (remove `as any`)
5. ✅ Add comprehensive JSDoc comments

### Future Enhancements
- Add Redis support when RedisAdapter is implemented
- Implement SingleFlightCache wrapper properly
- Add cache warming strategies
- Add eviction policy configuration

### Testing Requirements
- Test named cache registry
- Test default cache singleton
- Test CacheManager operations
- Test backward compatibility
- Test memory adapter creation
- Test multi-tier adapter creation

---

## Conclusion

The two factory files serve complementary purposes:
- **simple-factory.ts**: Named instance management (registry pattern)
- **factory.ts**: Advanced cache creation with CacheManager

**Consolidation Value:**
- ✅ Single source of truth for cache creation
- ✅ Unified API surface
- ✅ Reduced maintenance burden
- ✅ Better discoverability
- ⚠️ Minimal code reduction (only 28 lines)

**Risk Level:** Low  
**Effort:** Medium  
**Value:** High (improved developer experience)

---

## Next Steps

Proceed to **Task 4.3**: Create unified `factory.ts` with merged functionality
