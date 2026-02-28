# Cache Infrastructure Architecture

## Overview

The cache infrastructure provides a unified, high-performance caching system with support for multiple adapters, advanced features, and comprehensive monitoring. This document describes the architecture after the Phase 1 refactoring (Strategy Extraction).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Uses cache through factory or service interfaces)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Factory Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  factory.ts      │  │ cache-factory.ts │                │
│  │  (Simple)        │  │  (Advanced)      │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ caching-service  │  │ simple-cache-    │                │
│  │ (Full-featured)  │  │ service (Light)  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Strategy Layer (NEW)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Compression  │  │   Tagging    │  │Circuit Breaker│     │
│  │  Strategy    │  │   Strategy   │  │   Strategy    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Memory  │  │  Redis   │  │Multi-Tier│  │ Browser  │   │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
server/infrastructure/cache/
├── adapters/
│   ├── memory-adapter.ts          # In-memory caching
│   ├── redis-adapter.ts           # Redis caching
│   ├── browser-adapter.ts         # Browser storage
│   └── multi-tier-adapter.ts      # L1/L2 caching
├── strategies/                    # NEW: Extracted strategies
│   ├── compression-strategy.ts    # Compression logic
│   ├── tagging-strategy.ts        # Tag-based invalidation
│   ├── circuit-breaker-strategy.ts # Circuit breaker pattern
│   └── index.ts                   # Strategy exports
├── monitoring/
│   ├── metrics-collector.ts       # Metrics collection
│   └── health-checker.ts          # Health monitoring
├── clustering/
│   └── cluster-manager.ts         # Cluster coordination
├── compression/
│   └── cache-compressor.ts        # Compression utilities
├── tagging/
│   └── tag-manager.ts             # Tag management
├── warming/
│   └── cache-warmer.ts            # Cache warming
├── core/
│   ├── interfaces.ts              # Core interfaces
│   └── types.ts                   # Core types
├── utils/
│   ├── key-generator.ts           # Key generation
│   └── serialization.ts           # Serialization helpers
├── factory.ts                     # Simple factory
├── cache-factory.ts               # Advanced factory (refactored)
├── caching-service.ts             # Unified service
├── simple-cache-service.ts        # Lightweight service
├── index.ts                       # Public API
├── ARCHITECTURE.md                # This file
└── README.md                      # User documentation
```

## Phase 1 Refactoring: Strategy Extraction

### What Changed

**Before:**
- Wrapper classes (CompressedCacheAdapter, TaggedCacheAdapter, CircuitBreakerCacheAdapter) embedded in `cache-factory.ts`
- ~860 lines in `cache-factory.ts`
- Mixed concerns: factory logic + wrapper implementations

**After:**
- Extracted strategies to dedicated files in `strategies/` directory
- Wrapper classes now use strategy instances
- ~550 lines in `cache-factory.ts` (36% reduction)
- Clear separation: factory orchestrates, strategies implement

### Benefits

1. **Separation of Concerns**: Each strategy has a single, well-defined responsibility
2. **Testability**: Strategies can be tested independently
3. **Reusability**: Strategies can be used outside the factory context
4. **Maintainability**: Easier to understand and modify individual strategies
5. **Extensibility**: New strategies can be added without modifying factory

## Components

### 1. Strategies (NEW)

#### CompressionStrategy

**Location**: `strategies/compression-strategy.ts`

**Purpose**: Handles compression and decompression of cache values to reduce memory usage.

**Key Methods**:
- `compress<T>(value: T): Promise<T>` - Compress a value
- `decompress<T>(value: T): Promise<T>` - Decompress a value
- `shouldCompress<T>(value: T): boolean` - Check if value should be compressed
- `getStats()` - Get compression statistics

**Usage**:
```typescript
const strategy = new CompressionStrategy(compressor);
const compressed = await strategy.compress(largeObject);
const decompressed = await strategy.decompress(compressed);
```

#### TaggingStrategy

**Location**: `strategies/tagging-strategy.ts`

**Purpose**: Manages tags for cache entries, enabling group-based invalidation.

**Key Methods**:
- `addTags(key: string, tags: string[]): Promise<void>` - Add tags to a key
- `removeKey(key: string): Promise<void>` - Remove key from all tags
- `getKeysByTags(tags: string[]): Promise<string[]>` - Get keys by tags
- `invalidateByTags(tags: string[]): Promise<string[]>` - Invalidate by tags
- `getStats()` - Get tagging statistics

**Usage**:
```typescript
const strategy = new TaggingStrategy(tagManager, 'myCache');
await strategy.addTags('user:123', ['user', 'active']);
const keys = await strategy.invalidateByTags(['user']);
```

#### CircuitBreakerStrategy

**Location**: `strategies/circuit-breaker-strategy.ts`

**Purpose**: Implements circuit breaker pattern to prevent cascading failures.

**States**:
- `closed`: Normal operation, all requests pass through
- `open`: Circuit is open, requests fail fast
- `half-open`: Testing recovery, limited requests allowed

**Key Methods**:
- `execute<T>(operation: () => Promise<T>): Promise<T>` - Execute with protection
- `getState()` - Get current circuit state
- `reset()` - Manually reset circuit
- `getMetrics()` - Get circuit breaker metrics

**Usage**:
```typescript
const strategy = new CircuitBreakerStrategy({
  threshold: 5,
  timeout: 60000,
  resetTimeout: 300000
});

const result = await strategy.execute(async () => {
  return await cache.get('key');
});
```

### 2. Factories

#### Simple Factory

**Location**: `factory.ts`

**Purpose**: Create basic cache instances with minimal configuration.

**Key Functions**:
- `createSimpleCacheService(config?)` - Create simple memory cache
- `createCacheService(config)` - Create cache with full config
- `createCacheManager(cache?)` - Create cache manager

**Usage**:
```typescript
// Simple cache
const cache = createSimpleCacheService();

// Full configuration
const cache = createCacheService({
  provider: 'memory',
  defaultTtlSec: 3600,
  maxMemoryMB: 100
});
```

#### Advanced Factory

**Location**: `cache-factory.ts`

**Purpose**: Create advanced cache instances with clustering, strategies, and monitoring.

**Key Features**:
- Multiple adapter support (memory, Redis, multi-tier, browser)
- Strategy composition (compression, tagging, circuit breaker)
- Clustering support
- Comprehensive metrics
- Event-driven architecture

**Usage**:
```typescript
const factory = UnifiedCacheFactory.getInstance({
  provider: 'multi-tier',
  defaultTtlSec: 3600,
  enableCompression: true,
  enableCircuitBreaker: true,
  enableClustering: true
});

const cacheResult = await factory.createCache('myCache');
```

### 3. Services

#### CachingService

**Location**: `caching-service.ts`

**Purpose**: Unified caching service with Result types for error handling.

**Key Methods**:
- `get<T>(key: string): Promise<Result<T | null>>`
- `set<T>(key: string, value: T, options?): Promise<Result<void>>`
- `delete(key: string): Promise<Result<void>>`
- `getOrSet<T>(key, factory, options?): Promise<Result<T>>`
- `healthCheck(): Promise<HealthStatus>`
- `getMetrics(): CacheMetrics`

**Usage**:
```typescript
const result = await createCachingService({
  type: 'memory',
  defaultTtl: 3600
});

if (result.isOk()) {
  const service = result.value;
  const getResult = await service.get('key');
  if (getResult.isOk()) {
    console.log('Value:', getResult.value);
  }
}
```

### 4. Adapters

#### Memory Adapter

**Location**: `adapters/memory-adapter.ts`

**Features**:
- In-memory storage with LRU eviction
- Configurable memory limits
- Fast access times (<1ms)

#### Redis Adapter

**Location**: `adapters/redis-adapter.ts`

**Features**:
- Persistent storage
- Distributed caching
- Connection pooling

#### Multi-Tier Adapter

**Location**: `adapters/multi-tier-adapter.ts`

**Features**:
- L1 (memory) + L2 (Redis) caching
- Automatic promotion of hot data
- Configurable write strategies

#### Browser Adapter

**Location**: `adapters/browser-adapter.ts`

**Features**:
- localStorage/sessionStorage/IndexedDB support
- Client-side caching
- Size limits

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:
- **Adapters**: Handle storage mechanisms
- **Strategies**: Implement specific behaviors
- **Factories**: Orchestrate component creation
- **Services**: Provide high-level APIs

### 2. Strategy Pattern

Strategies are composable and can be mixed and matched:
```typescript
// With compression only
const cache = createCache({ enableCompression: true });

// With compression + circuit breaker
const cache = createCache({
  enableCompression: true,
  enableCircuitBreaker: true
});

// With all strategies
const cache = createCache({
  enableCompression: true,
  enableCircuitBreaker: true,
  enableTagging: true
});
```

### 3. Dependency Injection

Strategies are injected into wrapper classes:
```typescript
// Old: Direct dependency on CacheCompressor
new CompressedCacheAdapter(adapter, compressor);

// New: Dependency on CompressionStrategy
new CompressedCacheAdapter(adapter, compressionStrategy);
```

### 4. Consistent Interface

All adapters implement the same `CacheAdapter` interface:
```typescript
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getMetrics(): CacheMetrics;
  // ... other methods
}
```

## Configuration

### Basic Configuration

```typescript
{
  provider: 'memory',
  defaultTtlSec: 3600,
  maxMemoryMB: 100,
  keyPrefix: 'app:',
  enableMetrics: true
}
```

### Advanced Configuration

```typescript
{
  provider: 'multi-tier',
  defaultTtlSec: 3600,
  maxMemoryMB: 100,
  
  // Compression
  enableCompression: true,
  compressionThreshold: 1024,
  
  // Circuit Breaker
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  circuitBreakerResetTimeout: 300000,
  
  // Clustering
  enableClustering: true,
  clusterNodes: [
    { host: 'node1', port: 6379 },
    { host: 'node2', port: 6379 }
  ],
  
  // Multi-tier
  l1MaxSizeMB: 20,
  redisUrl: 'redis://localhost:6379'
}
```

## Performance Characteristics

### Memory Adapter
- **GET**: <1ms average
- **SET**: <1ms average
- **Memory**: Configurable limit
- **Persistence**: None

### Redis Adapter
- **GET**: 1-5ms average
- **SET**: 1-5ms average
- **Memory**: Redis server memory
- **Persistence**: Yes

### Multi-Tier Adapter
- **GET (L1 hit)**: <1ms
- **GET (L2 hit)**: 1-5ms
- **SET**: 1-5ms (write-through)
- **Memory**: L1 + L2 combined
- **Persistence**: Yes (L2)

## Monitoring

### Metrics

All adapters provide comprehensive metrics:
```typescript
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  operations: number;
  errors: number;
  memoryUsage: number;
  keyCount: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  avgResponseTime: number;
}
```

### Health Checks

```typescript
const health = await cache.getHealth();
console.log(health.status);      // 'healthy' | 'degraded' | 'unhealthy'
console.log(health.latency);     // Response time in ms
console.log(health.connected);   // Connection status
```

## Testing

### Unit Tests

Each strategy can be tested independently:
```typescript
describe('CompressionStrategy', () => {
  it('should compress large values', async () => {
    const strategy = new CompressionStrategy(compressor);
    const large = 'x'.repeat(10000);
    const compressed = await strategy.compress(large);
    expect(compressed.length).toBeLessThan(large.length);
  });
});
```

### Integration Tests

Test strategy composition:
```typescript
describe('Cache with strategies', () => {
  it('should compress and tag values', async () => {
    const cache = createCache({
      enableCompression: true,
      enableTagging: true
    });
    
    await cache.set('key', largeValue, { tags: ['test'] });
    const result = await cache.get('key');
    expect(result).toEqual(largeValue);
  });
});
```

## Migration Guide

### From Old Architecture

No changes required! The refactoring is backward compatible:

```typescript
// Old code still works
import { UnifiedCacheFactory } from './cache-factory';
const factory = UnifiedCacheFactory.getInstance(config);
const cache = await factory.createCache('myCache');
```

### Using New Strategies Directly

You can now use strategies independently:

```typescript
import { CompressionStrategy } from './strategies';

const strategy = new CompressionStrategy(compressor);
const compressed = await strategy.compress(data);
```

## Future Enhancements

### Phase 2: Core Service Consolidation
- Create unified `CacheService` class
- Consolidate `caching-service.ts` logic
- Simplify service layer

### Phase 3: Factory Simplification
- Refactor `factory.ts` as primary factory
- Keep `cache-factory.ts` for advanced features only
- Remove deprecated `simple-factory.ts`

### Phase 4: Documentation
- Complete API documentation
- Add usage examples
- Create migration guides

### Phase 5: Testing & Validation
- Comprehensive test coverage
- Performance benchmarks
- Integration tests

## Best Practices

### 1. Use Simple Factory for Basic Needs

```typescript
const cache = createSimpleCacheService();
```

### 2. Use Advanced Factory for Complex Scenarios

```typescript
const factory = UnifiedCacheFactory.getInstance({
  provider: 'multi-tier',
  enableCompression: true,
  enableCircuitBreaker: true
});
```

### 3. Monitor Cache Performance

```typescript
const metrics = cache.getMetrics();
if (metrics.hitRate < 80) {
  console.warn('Low cache hit rate:', metrics.hitRate);
}
```

### 4. Use Strategies Independently When Needed

```typescript
// Use compression strategy outside cache context
const strategy = new CompressionStrategy(compressor);
const compressed = await strategy.compress(data);
```

## Troubleshooting

### Issue: High memory usage

**Solution**: Enable compression or reduce maxMemoryMB:
```typescript
const cache = createCache({
  enableCompression: true,
  compressionThreshold: 512,
  maxMemoryMB: 50
});
```

### Issue: Frequent circuit breaker trips

**Solution**: Increase threshold or timeout:
```typescript
const cache = createCache({
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 10,
  circuitBreakerResetTimeout: 600000
});
```

### Issue: Low hit rate

**Solution**: Increase TTL or warm up cache:
```typescript
const manager = createCacheManager(cache);
await manager.warmUp([
  { key: 'hot:data', factory: () => loadData(), ttl: 7200 }
]);
```

## Related Documentation

- [README.md](./README.md) - User documentation
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - Complete refactoring plan
- [Messaging Architecture](../messaging/ARCHITECTURE.md) - Similar pattern

## Changelog

### Phase 1 (Current) - Strategy Extraction
- ✅ Extracted CompressionStrategy
- ✅ Extracted TaggingStrategy
- ✅ Extracted CircuitBreakerStrategy
- ✅ Updated cache-factory.ts to use strategies
- ✅ Reduced cache-factory.ts from ~860 to ~550 lines (36% reduction)
- ✅ Created strategies/ directory
- ✅ All TypeScript diagnostics pass
- ✅ Backward compatible

### Phase 2 (Planned) - Core Service Consolidation
- Create unified CacheService class
- Consolidate caching-service.ts
- Simplify service layer

### Phase 3 (Planned) - Factory Simplification
- Refactor factory.ts as primary
- Simplify cache-factory.ts
- Remove deprecated files

---

**Status**: Phase 1 Complete  
**Last Updated**: February 28, 2026  
**Next Phase**: Core Service Consolidation
