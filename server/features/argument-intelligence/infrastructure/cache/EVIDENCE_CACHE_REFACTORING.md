# Evidence Cache Refactoring

## Summary

The redundant `EvidenceCache` and `EvidenceCacheManager` classes have been replaced with a thin wrapper using the unified caching infrastructure (`ICachingService` + factory pattern).

## What Changed

### Removed (Redundant)
- `EvidenceCache<T>` — Custom LRU cache implementation
- `EvidenceCacheManager` — Manager wrapping two EvidenceCache instances
- Duplicated TTL management, LRU eviction, cleanup timers

### Added
- `EvidenceCacheService` — Thin wrapper using `createCacheService()` factory
- `evidenceCacheService` singleton — Drop-in replacement for old `evidenceCacheManager`
- Type-safe `ICachingService` interface replaces generic cache methods

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Code duplication** | ❌ Full cache implementation | ✅ ~70% less code |
| **Type safety** | ⚠️ `any` types | ✅ Fully typed `ICachingService` |
| **Flexibility** | 🔒 Memory only | ✅ Memory/Redis/multi-tier swappable |
| **Maintenance** | 📦 Multiple implementations | ✅ Single cache infrastructure |
| **Features** | ⚙️ Limited | ✅ Metrics, health checks, tagging, warming |

## Migration Guide

### Old Code
```typescript
import { evidenceCacheManager } from '@server/features/argument-intelligence/infrastructure/cache/evidence-cache';

const credibilityCache = evidenceCacheManager.getSourceCredibilityCache();
const value = credibilityCache.get(key);
await credibilityCache.set(key, value);
```

### New Code
```typescript
import { evidenceCacheService } from '@server/features/argument-intelligence/infrastructure/cache';

const credibilityCache = evidenceCacheService.getSourceCredibilityCache();
const result = await credibilityCache.get(key);
if (result.isOk()) {
  const value = result.value;
}
await credibilityCache.set(key, value);
```

### Key Differences

1. **Result type** — Returns `Result<T | null>` instead of `T | null`
   - Use `result.isOk()` to check success
   - Errors are captured, not thrown

2. **Async** — All operations are async (consistent with Redis/multi-tier)
   - Old: `cache.get(key)` → `value`
   - New: `await cache.get(key)` → `Result<value>`

3. **Configuration** — Now driven by factory options
   ```typescript
   createCacheService({
     provider: 'memory',
     name: 'source-credibility-cache',
     defaultTtlSec: 86400,
     maxSize: 10000,
   })
   ```

## Adapter Swapping

To switch from memory to Redis without code changes:

```typescript
// In environment config or factory invocation
const credibilityCache = createCacheService({
  provider: 'redis',  // ← Changed
  name: 'source-credibility-cache',
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  defaultTtlSec: 86400,
});
```

## Cleanup

The old `evidence-cache.ts` file contains only the redundant `EvidenceCache` and `EvidenceCacheManager` classes. It can be safely deleted once all imports are migrated.

Old singleton: ~~`evidenceCacheManager`~~ → New singleton: `evidenceCacheService`
