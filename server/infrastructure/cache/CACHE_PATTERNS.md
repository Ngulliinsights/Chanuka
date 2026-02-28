# Cache Patterns Documentation

## Overview

This document describes the standardized caching patterns, strategies, and best practices for the application's caching infrastructure.

## Table of Contents

1. [Cache Key Generation](#cache-key-generation)
2. [Invalidation Patterns](#invalidation-patterns)
3. [Warming Strategies](#warming-strategies)
4. [Cache Decorators](#cache-decorators)
5. [Monitoring](#monitoring)
6. [Testing](#testing)
7. [Best Practices](#best-practices)

---

## Cache Key Generation

### Overview

Consistent cache key generation is critical for cache effectiveness. The `CacheKeyGenerator` provides standardized methods for creating cache keys across all features.

### Key Format

Standard format: `{prefix}:{feature}:{entity}:{id}:{variant}`

Example: `app:property:listing:123:details`

### Usage

```typescript
import { cacheKeys } from '@server/infrastructure/cache';

// Entity keys
const propertyKey = cacheKeys.property(123);
// Result: "app:property:123"

const userKey = cacheKeys.user(456);
// Result: "app:user:456"

// List keys
const propertiesKey = cacheKeys.properties('location=nairobi');
// Result: "app:properties:{hash}"

// Search keys
const searchKey = cacheKeys.searchResults('apartments in nairobi');
// Result: "app:search:{hash}"

// User-specific keys
const sessionKey = cacheKeys.userSession('session-abc123');
// Result: "app:user:session:session-abc123"

const permissionsKey = cacheKeys.userPermissions(789);
// Result: "app:user:permissions:789"
```

### Key Utilities

```typescript
// Generate key with tags for invalidation
const { key, tags } = cacheKeys.withTags('base:key', ['tag1', 'tag2']);

// Generate time-based key (changes every N minutes)
const timeKey = cacheKeys.withTimestamp('base:key', 5); // 5-minute intervals

// Generate user-specific key
const userKey = cacheKeys.withUser('base:key', userId);

// Generate versioned key
const versionedKey = cacheKeys.withVersion('base:key', '1.0');

// Generate pattern for invalidation
const pattern = cacheKeys.pattern('property'); // "app:property:*"
```

### Key Validation

```typescript
// Validate key format
const isValid = cacheKeys.validateKey('app:property:123');

// Parse key components
const parsed = cacheKeys.parseKey('app:property:123');
// Result: { prefix: 'app', type: 'property', identifier: '123' }
```

### Best Practices

1. **Always use the key generator** - Never construct keys manually
2. **Use descriptive entity names** - Make keys self-documenting
3. **Include relevant context** - Add user ID, tenant ID, etc. when needed
4. **Keep keys under 250 characters** - Redis has a 512MB key size limit
5. **Avoid special characters** - Stick to alphanumeric and colons

---

## Invalidation Patterns

### Overview

Cache invalidation ensures data consistency when underlying data changes. Multiple strategies are available for different use cases.

### Available Strategies

#### 1. Write-Through Invalidation

Invalidates cache immediately when data is written.

**Use Case:** Real-time data that must be consistent

```typescript
import { invalidationManager } from '@server/infrastructure/cache';

// Invalidate on update
await invalidationManager.invalidate({
  feature: 'property',
  entity: 'listing',
  id: 123,
  relatedEntities: [
    { feature: 'user', entity: 'profile', id: 456 }
  ]
}, 'write-through');
```

**Pros:**
- Immediate consistency
- Simple to understand
- Predictable behavior

**Cons:**
- Higher write latency
- More cache operations

#### 2. Tag-Based Invalidation

Invalidates all caches with specific tags.

**Use Case:** Related data that should be invalidated together

```typescript
// Invalidate by tags
await invalidationManager.invalidate({
  feature: 'property',
  entity: 'listing',
  tags: ['featured', 'verified']
}, 'tag-based');
```

**Pros:**
- Flexible grouping
- Efficient bulk invalidation
- Logical organization

**Cons:**
- Requires tag management
- Can over-invalidate

#### 3. Cascade Invalidation

Invalidates entity and all dependent entities.

**Use Case:** Complex data relationships

```typescript
import { CascadeInvalidation } from '@server/infrastructure/cache';

// Define dependencies
const dependencyMap = new Map([
  ['property:listing', ['user:profile', 'review:summary']],
  ['user:profile', ['user:permissions', 'user:settings']]
]);

const strategy = new CascadeInvalidation(dependencyMap);
invalidationManager.registerStrategy(strategy);

// Invalidate with cascade
await invalidationManager.invalidate({
  feature: 'property',
  entity: 'listing',
  id: 123
}, 'cascade');
```

**Pros:**
- Maintains referential integrity
- Automatic dependency handling
- Prevents stale related data

**Cons:**
- Can invalidate too much
- Requires dependency mapping
- Complex to maintain

#### 4. Lazy Invalidation

Marks cache as stale, refreshes on next access.

**Use Case:** Non-critical data, eventual consistency acceptable

```typescript
// Mark as stale
await invalidationManager.invalidate({
  feature: 'property',
  entity: 'listing',
  id: 123
}, 'lazy');
```

**Pros:**
- Lower write latency
- Deferred work
- Better write performance

**Cons:**
- Eventual consistency
- First read after write may be slow
- Requires stale detection

#### 5. Batch Invalidation

Collects invalidations and executes in batch.

**Use Case:** High-frequency updates

```typescript
// Batch invalidations (automatic batching)
await invalidationManager.invalidate({
  feature: 'property',
  entity: 'listing',
  id: 123
}, 'batch');
```

**Pros:**
- Reduced cache operations
- Better performance under load
- Automatic deduplication

**Cons:**
- Slight delay in invalidation
- More complex implementation

### TTL-Based Invalidation

Set time-to-live for automatic expiration.

```typescript
import { TTL } from '@server/infrastructure/cache';

// Set with TTL
await cache.set(key, value, TTL.FIVE_MINUTES);
await cache.set(key, value, TTL.ONE_HOUR);
await cache.set(key, value, TTL.ONE_DAY);
```

**Available TTL Constants:**
- `TTL.FIVE_MINUTES` - 300 seconds
- `TTL.FIFTEEN_MINUTES` - 900 seconds
- `TTL.THIRTY_MINUTES` - 1800 seconds
- `TTL.ONE_HOUR` - 3600 seconds
- `TTL.SIX_HOURS` - 21600 seconds
- `TTL.ONE_DAY` - 86400 seconds
- `TTL.ONE_WEEK` - 604800 seconds
- `TTL.ONE_MONTH` - 2592000 seconds

### Choosing an Invalidation Strategy

| Strategy | Consistency | Performance | Complexity | Use Case |
|----------|-------------|-------------|------------|----------|
| Write-Through | Strong | Medium | Low | Critical data |
| Tag-Based | Strong | High | Medium | Related data |
| Cascade | Strong | Low | High | Complex relationships |
| Lazy | Eventual | High | Medium | Non-critical data |
| Batch | Eventual | Very High | High | High-frequency updates |
| TTL | Eventual | Very High | Low | Time-sensitive data |

---

## Warming Strategies

### Overview

Cache warming proactively populates the cache with frequently accessed data to improve performance.

### Available Strategies

#### 1. Eager Warming

Warms cache immediately on startup.

**Use Case:** Critical data needed at startup

```typescript
import { warmingManager } from '@server/infrastructure/cache';

const result = await warmingManager.warm({
  feature: 'property',
  entity: 'listing',
  dataLoader: async () => {
    return await db.query.properties.findMany({
      where: eq(properties.featured, true)
    });
  }
}, 'eager');

console.log(`Warmed ${result.itemsWarmed} items in ${result.duration}ms`);
```

**Pros:**
- Immediate availability
- Predictable startup
- No cold start penalty

**Cons:**
- Slower startup
- May warm unused data
- Resource intensive

#### 2. Lazy Warming

Warms cache on first access.

**Use Case:** Data with unpredictable access patterns

```typescript
const result = await warmingManager.warm({
  feature: 'property',
  entity: 'listing',
  dataLoader: async () => {
    return await fetchPropertyData();
  }
}, 'lazy');
```

**Pros:**
- Fast startup
- Only warms needed data
- Resource efficient

**Cons:**
- First access slow
- Unpredictable latency
- Cold start penalty

#### 3. Scheduled Warming

Warms cache on a schedule.

**Use Case:** Data that changes periodically

```typescript
const result = await warmingManager.warm({
  feature: 'property',
  entity: 'listing',
  dataLoader: async () => {
    return await fetchPropertyData();
  },
  schedule: '*/5 * * * *' // Every 5 minutes
}, 'scheduled');
```

**Pros:**
- Fresh data
- Predictable refresh
- Automatic updates

**Cons:**
- Requires scheduling
- May warm during low usage
- Resource overhead

#### 4. Predictive Warming

Warms cache based on access patterns.

**Use Case:** Data with predictable patterns

```typescript
import { PredictiveWarming } from '@server/infrastructure/cache';

const strategy = warmingManager.getStrategy('predictive') as PredictiveWarming;

// Record access patterns
strategy.recordAccess('property', 'listing');

// Warm based on predictions
const result = await warmingManager.warm({
  feature: 'property',
  entity: 'listing',
  dataLoader: async () => {
    return await fetchPropertyData();
  }
}, 'predictive');
```

**Pros:**
- Intelligent warming
- Adapts to usage
- Efficient resource use

**Cons:**
- Complex implementation
- Requires learning period
- May miss patterns

#### 5. Priority Warming

Warms high-priority items first.

**Use Case:** Mixed priority data

```typescript
const result = await warmingManager.warm({
  feature: 'property',
  entity: 'listing',
  dataLoader: async () => {
    return await fetchFeaturedProperties();
  },
  priority: 'high'
}, 'priority');
```

**Pros:**
- Critical data first
- Flexible prioritization
- Better resource allocation

**Cons:**
- Requires priority assignment
- More complex
- May delay low-priority data

### Choosing a Warming Strategy

| Strategy | Startup Time | Resource Usage | Complexity | Use Case |
|----------|--------------|----------------|------------|----------|
| Eager | Slow | High | Low | Critical startup data |
| Lazy | Fast | Low | Low | Unpredictable access |
| Scheduled | Fast | Medium | Medium | Periodic updates |
| Predictive | Fast | Low | High | Pattern-based access |
| Priority | Medium | Medium | Medium | Mixed priority data |

---

## Cache Decorators

### Overview

Decorators provide a simple way to add caching to methods without modifying their implementation.

### @Cache Decorator

Automatically caches method results.

```typescript
import { Cache } from '@server/infrastructure/cache';
import { cacheKeys } from '@server/infrastructure/cache';
import { TTL } from '@server/infrastructure/cache';

class PropertyService {
  @Cache({
    ttl: TTL.FIVE_MINUTES,
    keyGenerator: (propertyId: number) => cacheKeys.property(propertyId),
    skipCondition: (propertyId: number) => propertyId < 0,
    tags: ['property', 'listing']
  })
  async getProperty(propertyId: number): Promise<Property> {
    return await db.query.properties.findFirst({
      where: eq(properties.id, propertyId)
    });
  }
}
```

**Options:**
- `ttl` - Time to live in seconds
- `keyGenerator` - Function to generate cache key from arguments
- `skipCondition` - Function to skip caching based on arguments
- `tags` - Tags for invalidation

### @InvalidateCache Decorator

Automatically invalidates cache after method execution.

```typescript
import { InvalidateCache } from '@server/infrastructure/cache';

class PropertyService {
  @InvalidateCache({
    keyGenerator: (propertyId: number) => [
      cacheKeys.property(propertyId),
      cacheKeys.properties('*')
    ]
  })
  async updateProperty(propertyId: number, data: UpdatePropertyDTO): Promise<Property> {
    return await db.update(properties)
      .set(data)
      .where(eq(properties.id, propertyId));
  }

  @InvalidateCache({
    patterns: ['app:property:*'],
    tags: ['property']
  })
  async deleteProperty(propertyId: number): Promise<void> {
    await db.delete(properties)
      .where(eq(properties.id, propertyId));
  }
}
```

**Options:**
- `keys` - Specific keys to invalidate
- `patterns` - Patterns to match for invalidation
- `tags` - Tags to invalidate
- `keyGenerator` - Function to generate keys from arguments

---

## Monitoring

### Overview

Cache monitoring provides visibility into cache performance and helps identify issues.

### Metrics Collector

```typescript
import { CacheMetricsCollector } from '@server/infrastructure/cache';

const collector = new CacheMetricsCollector({
  enableAdvancedMetrics: true,
  collectionInterval: 60000 // 1 minute
});

// Start collecting
collector.start();

// Register caches
collector.registerCache('main-cache', await cache.getMetrics());

// Get aggregated metrics
const metrics = collector.getAggregatedMetrics();
console.log(`Hit Rate: ${metrics.hitRate.toFixed(2)}%`);
console.log(`Total Operations: ${metrics.operations}`);
console.log(`Key Count: ${metrics.keyCount}`);

// Listen for metrics events
collector.on('metrics:collected', (metrics) => {
  console.log('Metrics collected:', metrics);
});

// Stop collecting
collector.stop();
```

### Available Metrics

```typescript
interface CacheMetrics {
  hits: number;              // Cache hits
  misses: number;            // Cache misses
  hitRate: number;           // Hit rate percentage
  operations: number;        // Total operations
  errors: number;            // Error count
  avgResponseTime: number;   // Average response time (ms)
  memoryUsage: number;       // Memory usage (bytes)
  keyCount: number;          // Number of keys
  avgLatency: number;        // Average latency (ms)
  maxLatency: number;        // Maximum latency (ms)
  minLatency: number;        // Minimum latency (ms)
}
```

### Monitoring Best Practices

1. **Set target hit rates** - Aim for >70% for high-traffic endpoints
2. **Monitor latency** - Keep average latency <10ms
3. **Track memory usage** - Prevent cache from consuming too much memory
4. **Alert on anomalies** - Set up alerts for low hit rates or high error rates
5. **Regular reviews** - Review metrics weekly to identify optimization opportunities

---

## Testing

### Test Utilities

```typescript
import {
  MockCacheService,
  SpyCacheService,
  CacheTestDataGenerator,
  CacheTestAssertions,
  CachePerformanceTest,
  createPopulatedCache,
  waitForCache
} from '@server/infrastructure/cache/test-utilities';

// Mock cache for testing
const cache = new MockCacheService();

// Spy cache to track calls
const spy = new SpyCacheService(cache);

// Generate test data
const entries = CacheTestDataGenerator.generateEntries(10);
const data = CacheTestDataGenerator.generateData('medium');

// Assert cache behavior
await CacheTestAssertions.assertHitRate(cache, 70);
await CacheTestAssertions.assertHasKey(cache, 'key1');
await CacheTestAssertions.assertValue(cache, 'key1', expectedValue);

// Performance testing
const latency = await CachePerformanceTest.measureLatency(async () => {
  await cache.set('key', 'value');
});

const benchmark = await CachePerformanceTest.benchmark(cache, 1000);
console.log(`Avg SET latency: ${benchmark.avgSetLatency}ms`);

// Create pre-populated cache
const populated = await createPopulatedCache(cache, [
  { key: 'key1', value: 'value1', ttl: 60 },
  { key: 'key2', value: 'value2' }
]);
```

### Writing Cache Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCacheService } from '@server/infrastructure/cache/test-utilities';

describe('PropertyService Caching', () => {
  let cache: MockCacheService;
  let service: PropertyService;

  beforeEach(() => {
    cache = new MockCacheService();
    service = new PropertyService(cache);
  });

  it('should cache property data', async () => {
    const property = await service.getProperty(123);
    
    // Second call should hit cache
    const cached = await service.getProperty(123);
    
    const metrics = await cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.hitRate).toBeGreaterThan(0);
  });

  it('should invalidate cache on update', async () => {
    await service.getProperty(123);
    await service.updateProperty(123, { name: 'Updated' });
    
    const hasKey = await cache.has(cacheKeys.property(123));
    expect(hasKey).toBe(false);
  });
});
```

---

## Best Practices

### General Guidelines

1. **Cache at the right level**
   - Cache expensive operations (database queries, API calls)
   - Don't cache cheap operations (simple calculations)
   - Cache at the service layer, not the controller

2. **Use appropriate TTLs**
   - Short TTL (5-15 min) for frequently changing data
   - Medium TTL (1-6 hours) for moderately stable data
   - Long TTL (1+ days) for rarely changing data
   - No TTL for static data (use invalidation instead)

3. **Implement proper invalidation**
   - Invalidate on write operations
   - Use patterns for bulk invalidation
   - Consider cascade invalidation for related data
   - Don't over-invalidate

4. **Monitor cache performance**
   - Track hit rates (target >70%)
   - Monitor latency (target <10ms)
   - Watch memory usage
   - Set up alerts

5. **Handle cache failures gracefully**
   - Always have a fallback to source data
   - Log cache errors but don't fail requests
   - Implement circuit breakers for cache failures

### Performance Optimization

1. **Optimize cache keys**
   - Keep keys short but descriptive
   - Use consistent naming
   - Avoid dynamic parts when possible

2. **Batch operations**
   - Use batch invalidation for multiple keys
   - Warm cache in batches
   - Use pipelining for multiple operations

3. **Compress large values**
   - Compress values >1KB
   - Use efficient serialization
   - Consider storing references instead of full objects

4. **Use appropriate data structures**
   - Use sets for membership checks
   - Use sorted sets for rankings
   - Use hashes for objects

### Security Considerations

1. **Validate cache keys**
   - Sanitize user input in keys
   - Prevent cache key injection
   - Use key validation

2. **Protect sensitive data**
   - Don't cache sensitive data without encryption
   - Use user-specific keys for personal data
   - Implement proper access controls

3. **Prevent cache poisoning**
   - Validate data before caching
   - Use signed keys for critical data
   - Implement rate limiting

### Common Pitfalls

1. **Over-caching**
   - Don't cache everything
   - Consider the cost of invalidation
   - Balance memory usage

2. **Under-invalidation**
   - Always invalidate on writes
   - Consider related data
   - Use appropriate strategies

3. **Ignoring cache failures**
   - Always have fallbacks
   - Log and monitor failures
   - Implement retry logic

4. **Poor key design**
   - Avoid collisions
   - Use consistent naming
   - Keep keys manageable

---

## Examples

### Complete Service Example

```typescript
import { Cache, InvalidateCache } from '@server/infrastructure/cache';
import { cacheKeys, TTL } from '@server/infrastructure/cache';

export class PropertyService {
  constructor(
    private db: Database,
    private cache: ICachingService
  ) {}

  @Cache({
    ttl: TTL.FIVE_MINUTES,
    keyGenerator: (id: number) => cacheKeys.property(id)
  })
  async getProperty(id: number): Promise<Property> {
    return await this.db.query.properties.findFirst({
      where: eq(properties.id, id)
    });
  }

  @Cache({
    ttl: TTL.FIFTEEN_MINUTES,
    keyGenerator: (filters: string) => cacheKeys.properties(filters)
  })
  async listProperties(filters: PropertyFilters): Promise<Property[]> {
    return await this.db.query.properties.findMany({
      where: this.buildWhereClause(filters)
    });
  }

  @InvalidateCache({
    keyGenerator: (id: number) => [
      cacheKeys.property(id),
      cacheKeys.pattern('properties')
    ]
  })
  async updateProperty(id: number, data: UpdatePropertyDTO): Promise<Property> {
    return await this.db.update(properties)
      .set(data)
      .where(eq(properties.id, id));
  }

  @InvalidateCache({
    patterns: ['app:property:*']
  })
  async deleteProperty(id: number): Promise<void> {
    await this.db.delete(properties)
      .where(eq(properties.id, id));
  }
}
```

---

## Conclusion

This caching infrastructure provides a comprehensive, standardized approach to caching across the application. By following these patterns and best practices, you can achieve:

- **Consistent caching** across all features
- **High performance** with >70% hit rates
- **Data consistency** through proper invalidation
- **Easy maintenance** with clear patterns
- **Good observability** through monitoring

For questions or issues, refer to the test files or contact the infrastructure team.
