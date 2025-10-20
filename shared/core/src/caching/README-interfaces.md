# Cache Interface Documentation

## Overview

The refined cache system provides a unified interface for all cache implementations using Result types for explicit error handling. This design eliminates thrown exceptions in favor of functional error handling patterns.

## Core Interface: CacheAdapter

The `CacheAdapter` interface defines the contract that all cache implementations must follow:

```typescript
interface CacheAdapter {
  // Core operations
  get<T>(key: string): Promise<Result<T | null, Error>>;
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>>;
  delete(key: string): Promise<Result<void, Error>>;
  clear(): Promise<Result<void, Error>>;
  exists(key: string): Promise<Result<boolean, Error>>;
  
  // Lifecycle management
  initialize(): Promise<Result<void, Error>>;
  healthCheck(): Promise<HealthStatus>;
  shutdown(): Promise<Result<void, Error>>;
  
  // Observability
  getMetrics(): CacheMetrics;
}
```

## Usage Patterns

### Basic Operations

```typescript
import { CacheAdapter, ok, err } from './core';

// Get operation with explicit error handling
const result = await cache.get<string>('user:123');
if (result.isOk()) {
  const value = result.value; // string | null
  if (value !== null) {
    console.log('Found cached value:', value);
  } else {
    console.log('Key not found in cache');
  }
} else {
  console.error('Cache error:', result.error);
}

// Set operation with TTL
const setResult = await cache.set('user:123', userData, 3600);
if (setResult.isOk()) {
  console.log('Value cached successfully');
} else {
  console.error('Failed to cache value:', setResult.error);
}
```

### Lifecycle Management

```typescript
// Initialize cache
const initResult = await cache.initialize();
if (initResult.isErr()) {
  console.error('Failed to initialize cache:', initResult.error);
  return;
}

// Check health
const health = await cache.healthCheck();
console.log('Cache status:', health.status);
console.log('Response time:', health.latency, 'ms');

// Graceful shutdown
const shutdownResult = await cache.shutdown();
if (shutdownResult.isErr()) {
  console.error('Error during shutdown:', shutdownResult.error);
}
```

### Monitoring and Metrics

```typescript
// Get current metrics
const metrics = cache.getMetrics();
console.log('Hit rate:', metrics.hitRate.toFixed(2) + '%');
console.log('Average latency:', metrics.averageLatency.toFixed(2) + 'ms');
console.log('Total operations:', metrics.totalOperations);
console.log('Error count:', metrics.errors);

// Listen to cache events
cache.on('cache:event', (event) => {
  console.log('Cache event:', event.type, 'for key:', event.key);
});

cache.on('cache:error', (event) => {
  console.error('Cache error:', event.error?.message);
});
```

## Configuration Types

### Memory Cache Configuration

```typescript
const memoryConfig: MemoryCacheConfig = {
  type: 'memory',
  name: 'user-cache',
  defaultTtl: 3600,
  maxMemoryMB: 100,
  evictionPolicy: 'lru',
  enableMetrics: true
};
```

### Redis Cache Configuration

```typescript
const redisConfig: RedisCacheConfig = {
  type: 'redis',
  name: 'session-cache',
  defaultTtl: 1800,
  host: 'localhost',
  port: 6379,
  password: 'secret',
  database: 0,
  keyPrefix: 'app',
  pool: {
    min: 2,
    max: 10,
    idleTimeout: 30000
  }
};
```

### Multi-Tier Cache Configuration

```typescript
const multiTierConfig: MultiTierCacheConfig = {
  type: 'multi-tier',
  name: 'hybrid-cache',
  defaultTtl: 3600,
  l1Config: {
    type: 'memory',
    name: 'l1-cache',
    defaultTtl: 300,
    maxMemoryMB: 50
  },
  l2Config: {
    type: 'redis',
    name: 'l2-cache',
    defaultTtl: 3600,
    host: 'localhost',
    port: 6379
  },
  writeStrategy: 'write-through',
  enablePromotion: true
};
```

## Error Handling

The cache system uses Result types for explicit error handling:

```typescript
// Handle different error scenarios
const result = await cache.get<UserData>('user:123');

result.match(
  // Success case
  (value) => {
    if (value !== null) {
      return processUser(value);
    } else {
      return loadUserFromDatabase();
    }
  },
  // Error case
  (error) => {
    logger.error('Cache error:', error);
    return loadUserFromDatabase(); // Fallback
  }
);
```

## Health Monitoring

The health check system provides detailed status information:

```typescript
const health = await cache.healthCheck();

switch (health.status) {
  case 'healthy':
    console.log('Cache is operating normally');
    break;
  case 'degraded':
    console.warn('Cache has issues but is functional:', health.details.lastError?.message);
    break;
  case 'unhealthy':
    console.error('Cache is not functional:', health.details.lastError?.message);
    break;
}

// Check specific health details
if (health.details.memory) {
  const memUsage = health.details.memory.percentage;
  if (memUsage > 90) {
    console.warn('High memory usage:', memUsage.toFixed(1) + '%');
  }
}
```

## Best Practices

### 1. Always Handle Errors

```typescript
// ❌ Don't ignore errors
const value = (await cache.get('key')).value;

// ✅ Handle errors explicitly
const result = await cache.get('key');
if (result.isErr()) {
  // Handle error appropriately
  logger.error('Cache error:', result.error);
  return fallbackValue;
}
```

### 2. Use Appropriate TTL Values

```typescript
// ✅ Set reasonable TTL values
await cache.set('user-session', session, 1800);     // 30 minutes
await cache.set('user-profile', profile, 3600);     // 1 hour
await cache.set('static-config', config, 86400);    // 24 hours
```

### 3. Monitor Cache Performance

```typescript
// ✅ Regular health checks
setInterval(async () => {
  const health = await cache.healthCheck();
  if (health.status !== 'healthy') {
    alerting.notify('Cache health degraded', health);
  }
}, 60000); // Check every minute

// ✅ Monitor metrics
setInterval(() => {
  const metrics = cache.getMetrics();
  monitoring.gauge('cache.hit_rate', metrics.hitRate);
  monitoring.gauge('cache.avg_latency', metrics.averageLatency);
}, 30000); // Report every 30 seconds
```

### 4. Graceful Shutdown

```typescript
// ✅ Proper cleanup
process.on('SIGTERM', async () => {
  const shutdownResult = await cache.shutdown();
  if (shutdownResult.isErr()) {
    logger.error('Cache shutdown error:', shutdownResult.error);
  }
  process.exit(0);
});
```

## Migration from Legacy Cache

When migrating from the existing cache system:

1. Replace `CacheService` interface usage with `CacheAdapter`
2. Update error handling from try/catch to Result pattern
3. Use the new configuration types
4. Update initialization and shutdown procedures
5. Leverage the new health check and metrics capabilities

See the migration guide for detailed steps and examples.