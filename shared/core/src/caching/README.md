# Caching Abstraction (Phase 3)

This module implements a comprehensive caching abstraction following the adapter pattern, providing a unified interface for different cache implementations while preserving advanced features like single-flight request deduplication, circuit breaker protection, and comprehensive statistics.

## Architecture

```
caching/
├── core/                    # Core interfaces and utilities
│   ├── interfaces.ts       # Cache service interfaces
│   ├── base-adapter.ts     # Base adapter with common functionality
│   ├── key-generator.ts    # Cache key generation utilities
│   └── index.ts           # Core barrel exports
├── adapters/               # Concrete cache implementations
│   ├── memory-adapter.ts   # In-memory cache
│   ├── redis-adapter.ts    # Redis cache
│   ├── multi-tier-adapter.ts # L1 + L2 cache
│   ├── ai-cache.ts         # AI-specific caching
│   └── index.ts           # Adapter barrel exports
├── patterns/               # Advanced caching patterns
│   ├── single-flight-cache.ts # Request deduplication
│   └── index.ts           # Pattern barrel exports
├── factory.ts             # Cache factory and management
├── decorators.ts          # Method-level caching decorators
├── index.ts              # Main barrel exports
└── __tests__/            # Comprehensive test suite
```

## Key Features

### 🏗️ Adapter Pattern
- **Unified Interface**: All cache implementations conform to `CacheService` interface
- **Provider Agnostic**: Easy switching between memory, Redis, and multi-tier caches
- **Extensible**: Simple to add new cache providers

### ⚡ Advanced Features
- **Single-Flight**: Prevents duplicate concurrent requests
- **Circuit Breaker**: Automatic failure detection and recovery
- **Graceful Degradation**: Fallback strategies during outages
- **Metrics & Monitoring**: Comprehensive performance tracking
- **Tag-based Invalidation**: Efficient cache invalidation by tags
- **Pattern-based Invalidation**: Wildcard cache clearing

### 🤖 AI-Specific Caching
- **Cost-Aware TTL**: Expensive operations cached longer
- **Accuracy-Based TTL**: More accurate results cached longer
- **Semantic Similarity**: Intelligent cache reuse (future)
- **Service-Specific Tuning**: Optimized TTL per AI service

### 🔧 Developer Experience
- **Type Safety**: Full TypeScript support
- **Method Decorators**: `@Cache` and `@InvalidateCache` decorators
- **Factory Pattern**: Simple cache service creation
- **Backward Compatibility**: Legacy adapter support

## Usage

### Basic Usage

```typescript
import { createCacheService } from '@shared/core/caching';

// Create a memory cache
const cache = createCacheService({
  provider: 'memory',
  maxMemoryMB: 50,
  defaultTtlSec: 300,
  enableMetrics: true,
});

// Basic operations
await cache.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await cache.get('user:123');
await cache.del('user:123');
```

### Multi-Tier Cache

```typescript
const cache = createCacheService({
  provider: 'multi-tier',
  redisUrl: process.env.REDIS_URL,
  maxMemoryMB: 100,
  l1MaxSizeMB: 20, // L1 cache size
  enableCircuitBreaker: true,
});
```

### AI-Specific Caching

```typescript
import { AICache } from '@shared/core/caching';

const aiCache = new AICache({
  enableCostAwareCaching: true,
  enableAdaptiveTTL: true,
});

// Cache AI responses with cost-aware TTL
await aiCache.set(
  'analysis:property:123',
  analysisResult,
  'property-analysis',
  'comprehensive',
  {
    cost: 0.05, // API cost in dollars
    accuracy: 0.95, // Model confidence
  }
);
```

### Method-Level Caching

```typescript
import { Cache, InvalidateCache } from '@shared/core/caching';

class UserService {
  @Cache({
    ttl: 300,
    keyGenerator: (userId) => `user:${userId}`,
  })
  async getUser(userId: number) {
    // Expensive database operation
    return await this.db.getUser(userId);
  }

  @InvalidateCache({
    keys: ['users:list'],
    patterns: ['user:*'],
  })
  async updateUser(userId: number, data: any) {
    await this.db.updateUser(userId, data);
  }
}
```

### Single-Flight Protection

```typescript
import { SingleFlightCache } from '@shared/core/caching';

const protectedCache = new SingleFlightCache(baseCache, {
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  enableGracefulDegradation: true,
});

// Multiple concurrent requests for the same key
// will be deduplicated automatically
const results = await Promise.all([
  protectedCache.get('expensive:key'),
  protectedCache.get('expensive:key'),
  protectedCache.get('expensive:key'),
]);
// All get the same result, but only one actual call is made
```

## Configuration

### Cache Providers

#### Memory Cache
```typescript
{
  provider: 'memory',
  maxMemoryMB: 50,
  maxEntries: 10000,
  evictionPolicy: 'lru', // 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random'
  enablePersistence: false,
  cleanupIntervalMs: 60000,
}
```

#### Redis Cache
```typescript
{
  provider: 'redis',
  redisUrl: 'redis://localhost:6379',
  maxRetries: 3,
  enableCompression: true,
  compressionThreshold: 1024,
}
```

#### Multi-Tier Cache
```typescript
{
  provider: 'multi-tier',
  redisUrl: 'redis://localhost:6379',
  maxMemoryMB: 100,
  l1MaxSizeMB: 20,
  promotionStrategy: 'hybrid', // 'lru' | 'frequency' | 'size' | 'hybrid'
  promotionThreshold: 3,
}
```

### Circuit Breaker Options

```typescript
{
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,    // Failures before opening
  circuitBreakerTimeout: 60000,  // Recovery timeout (ms)
  slowCallThreshold: 5000,       // Slow call threshold (ms)
  slowCallRateThreshold: 0.5,    // Slow call rate threshold
  successThreshold: 3,           // Successes to close circuit
}
```

## Migration Guide

### From Legacy CacheService

```typescript
// Before
import { cacheService } from './old-cache';

// After
import { createCacheService } from '@shared/core/caching';

const cache = createCacheService({
  provider: 'memory',
  maxMemoryMB: 50,
  defaultTtlSec: 300,
});

// Legacy adapter available for gradual migration
import { LegacyCacheServiceAdapter } from '@shared/core/caching';
const legacyAdapter = new LegacyCacheServiceAdapter(cacheService);
```

### Feature Flags

Use the `useUnifiedCaching` feature flag for gradual migration:

```typescript
const cache = process.env.USE_UNIFIED_CACHING
  ? createCacheService(unifiedConfig)
  : legacyCacheService;
```

## Testing

```bash
# Run cache tests
npm test -- caching/

# Run specific adapter tests
npm test -- caching/__tests__/memory-adapter.test.ts
```

## Performance Benchmarks

- **Memory Cache**: ~1μs read/write operations
- **Redis Cache**: ~100μs network round-trip
- **Multi-Tier**: ~10μs L1 hits, ~100μs L2 hits
- **Single-Flight**: Eliminates duplicate requests under load
- **Circuit Breaker**: Prevents cascade failures

## Monitoring

### Metrics Collected

- **Hits/Misses**: Cache effectiveness
- **Response Times**: Performance monitoring
- **Error Rates**: Reliability tracking
- **Memory Usage**: Resource utilization
- **Circuit Breaker States**: Failure detection
- **TTL Distribution**: Cache lifetime analysis

### Health Checks

```typescript
const health = await cache.getHealth();
// {
//   connected: true,
//   latency: 1.2,
//   memory: { used: 45, total: 100 },
//   stats: { hits: 1250, misses: 234, hitRate: 84.2 },
//   circuitBreakers: { /* active circuit breakers */ }
// }
```

## Best Practices

1. **Choose Appropriate TTL**: Balance freshness vs performance
2. **Use Key Prefixes**: Namespace keys to avoid conflicts
3. **Enable Circuit Breakers**: Protect against downstream failures
4. **Monitor Metrics**: Track cache effectiveness regularly
5. **Use Tags for Invalidation**: Efficient cache clearing
6. **Test Failure Scenarios**: Verify graceful degradation
7. **Profile Memory Usage**: Prevent memory leaks in long-running apps

## Future Enhancements

- **Semantic Similarity**: NLP-based cache reuse
- **Predictive Warming**: ML-based cache preloading
- **Distributed Coordination**: Multi-region cache consistency
- **Advanced Eviction**: Custom eviction policies
- **Cache Analytics**: Usage pattern analysis