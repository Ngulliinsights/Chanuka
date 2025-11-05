# Caching System

A comprehensive, TypeScript-based caching system with multiple adapters and advanced features.

## ✅ What's Working

### Core Components
- **BaseCacheAdapter**: Base class with metrics, events, and common functionality
- **MemoryAdapter**: In-memory cache with TTL, LRU eviction, and size limits
- **SimpleCacheFactory**: Working factory for creating and managing cache instances

### Support Classes
- **CacheMetricsCollector**: Collects and aggregates metrics from cache adapters
- **CacheWarmer**: Preloads cache with frequently accessed data
- **CacheCompressor**: Handles compression and decompression of cache data
- **CacheSerializer**: Handles serialization with type preservation
- **CacheTagManager**: Manages cache entry tags for bulk invalidation
- **CacheClusterManager**: Manages distributed cache clusters

### Features
- ✅ Basic cache operations (get, set, del, exists, clear)
- ✅ TTL (Time To Live) support
- ✅ Multiple key operations (mget, mset, mdel)
- ✅ Metrics collection (hits, misses, hit rate, latency)
- ✅ Event system for monitoring
- ✅ Health checks
- ✅ Memory management with size limits
- ✅ LRU eviction policy
- ✅ TypeScript support with full type safety

## 🚧 In Progress

### Advanced Adapters
- **MultiTierAdapter**: L1 (memory) + L2 (Redis) with promotion strategies
- **BrowserAdapter**: Browser-compatible cache using localStorage/IndexedDB
- **RedisAdapter**: Redis-backed cache (requires ioredis dependency)

### Advanced Factory
- **UnifiedCacheFactory**: Full-featured factory with compression, tagging, clustering

## 📖 Usage

### Basic Usage

```typescript
import { cacheFactory } from './caching';

// Create a cache
const cache = cacheFactory.createCache('my-cache', {
  provider: 'memory',
  defaultTtlSec: 300,
  maxMemoryMB: 10
});

// Use the cache
await cache.set('key', 'value');
const result = await cache.get('key');
console.log(result); // 'value'

// With TTL
await cache.set('temp-key', 'temp-value', 60); // 60 seconds

// Multiple operations
await cache.mset([
  ['key1', 'value1'],
  ['key2', 'value2', 120] // with TTL
]);

const values = await cache.mget(['key1', 'key2']);
```

### Advanced Usage

```typescript
import { 
  MemoryAdapter, 
  CacheMetricsCollector,
  CacheWarmer 
} from './caching';

// Direct adapter usage
const cache = new MemoryAdapter({
  maxSize: 1000,
  defaultTtlSec: 300,
  evictionPolicy: 'lru'
});

// Metrics collection
const collector = new CacheMetricsCollector();
collector.registerCache('my-cache', cache.getMetrics());

// Cache warming
const warmer = new CacheWarmer({
  preloadData: [
    { key: 'popular-key', value: 'popular-value' }
  ]
});
await warmer.warmUp(cache);
```

## 🧪 Testing

```typescript
import { testCachingSystem } from './caching';

// Run comprehensive tests
await testCachingSystem();
```

## 🔧 Configuration

### Memory Adapter Options

```typescript
interface MemoryAdapterConfig {
  maxSize?: number;           // Max entries
  maxMemory?: number;         // Max memory in bytes
  defaultTtlSec?: number;     // Default TTL in seconds
  evictionPolicy?: 'lru' | 'fifo' | 'random';
  keyPrefix?: string;         // Key prefix
  enableMetrics?: boolean;    // Enable metrics collection
}
```

## 📊 Metrics

The system provides comprehensive metrics:

- **hits**: Number of cache hits
- **misses**: Number of cache misses  
- **hitRate**: Hit rate percentage
- **operations**: Total operations
- **errors**: Number of errors
- **avgLatency**: Average operation latency
- **memoryUsage**: Current memory usage
- **keyCount**: Number of keys stored

## 🎯 Next Steps

1. **Complete MultiTierAdapter**: Fix remaining TypeScript issues
2. **Add Redis support**: Implement RedisAdapter with ioredis
3. **Browser compatibility**: Complete BrowserAdapter
4. **Performance optimization**: Add benchmarking and optimization
5. **Documentation**: Add comprehensive API documentation
6. **Testing**: Add unit tests and integration tests

## 🏗️ Architecture

```
caching/
├── core/
│   ├── interfaces.ts      # Core interfaces and types
│   └── base-adapter.ts    # Base adapter implementation
├── adapters/
│   ├── memory-adapter.ts  # ✅ Working
│   ├── multi-tier-adapter.ts  # 🚧 In progress
│   ├── browser-adapter.ts     # 🚧 In progress
│   └── redis-adapter.ts       # 🚧 Needs ioredis
├── monitoring/
│   └── metrics-collector.ts  # ✅ Working
├── warming/
│   └── cache-warmer.ts       # ✅ Working
├── compression/
│   └── cache-compressor.ts   # ✅ Working
├── serialization/
│   └── cache-serializer.ts  # ✅ Working
├── tagging/
│   └── tag-manager.ts       # ✅ Working
├── clustering/
│   └── cluster-manager.ts   # ✅ Working
├── simple-factory.ts        # ✅ Working
├── cache-factory.ts         # 🚧 Advanced features
└── index.ts                 # ✅ Main exports
```