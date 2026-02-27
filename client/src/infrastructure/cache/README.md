# Cache Infrastructure Module

## Overview

The Cache Infrastructure module provides shared caching utilities and intelligent cache invalidation system for the Chanuka platform. It handles cache lifecycle management, invalidation strategies, and cache entry operations across the application.

## Purpose and Responsibilities

- **Cache Entry Management**: Set, get, and delete cache entries with TTL support
- **Cache Invalidation**: Intelligent invalidation strategies including pattern-based invalidation
- **Cache Lifecycle**: Automatic expiration, cleanup, and memory management
- **Multi-level Caching**: Support for memory, localStorage, and IndexedDB caching
- **Cache Statistics**: Track cache hits, misses, and performance metrics

## Public Exports

### Classes and Instances

- `cacheInvalidationManager` - Global cache invalidation manager instance

### Functions

- `invalidateCache(key: string): Promise<void>` - Invalidate a specific cache entry
- `setCacheEntry<T>(key: string, value: T, options?: CacheOptions): Promise<void>` - Set a cache entry
- `getCacheEntry<T>(key: string): Promise<T | null>` - Retrieve a cache entry

## Usage Examples

### Basic Cache Operations

```typescript
import { setCacheEntry, getCacheEntry, invalidateCache } from '@/infrastructure/cache';

// Set a cache entry with 1 hour TTL
await setCacheEntry('user:123', userData, { ttl: 3600 });

// Retrieve cached data
const user = await getCacheEntry('user:123');

// Invalidate when data changes
await invalidateCache('user:123');
```

### Pattern-Based Invalidation

```typescript
import { cacheInvalidationManager } from '@/infrastructure/cache';

// Invalidate all user caches
await cacheInvalidationManager.invalidateByPattern('user:*');

// Invalidate multiple specific keys
await cacheInvalidationManager.invalidateMultiple([
  'user:123',
  'user:456',
  'user:789'
]);
```

### Cache with Metadata

```typescript
import { setCacheEntry } from '@/infrastructure/cache';

await setCacheEntry('dashboard:config', config, {
  ttl: 7200, // 2 hours
  tags: ['dashboard', 'config'],
  priority: 'high'
});
```

## Best Practices

1. **Use Appropriate TTLs**: Set reasonable expiration times based on data volatility
2. **Pattern-Based Keys**: Use consistent key patterns (e.g., `entity:id`) for easy invalidation
3. **Cache Warming**: Preload frequently accessed data during initialization
4. **Invalidation Strategy**: Invalidate proactively when data changes rather than relying on TTL
5. **Memory Management**: Monitor cache size and implement eviction policies for large datasets

## Sub-Module Organization

```
cache/
├── index.ts                    # Public API exports
├── cache-invalidation.ts       # Cache invalidation manager
└── README.md                   # This file
```

## Integration Points

- **API Module**: Caches API responses to reduce network requests
- **Storage Module**: Persists cache entries across sessions
- **Observability Module**: Tracks cache performance metrics
- **Auth Module**: Caches user sessions and tokens

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [API Module](../api/README.md) - API response caching
- [Storage Module](../storage/README.md) - Cache persistence
- [Observability Module](../observability/README.md) - Cache metrics
