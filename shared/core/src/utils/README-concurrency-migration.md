# Concurrency Utilities Migration

This document describes the migration from custom concurrency utilities to established libraries (`async-mutex` and `p-limit`) while maintaining API compatibility and enabling gradual rollout through feature flags.

## Overview

The migration replaces custom implementations of mutex and semaphore functionality with battle-tested libraries:

- **async-mutex**: Provides robust mutex (mutual exclusion) functionality
- **p-limit**: Provides concurrency limiting with better performance and memory management

## Architecture

### Components

1. **ConcurrencyAdapter** (`concurrency-adapter.ts`): New implementations using established libraries
2. **ConcurrencyMigrationRouter** (`concurrency-migration-router.ts`): Routes between legacy and new implementations based on feature flags
3. **FeatureFlagsService** (`server/infrastructure/migration/feature-flags.service.ts`): Controls rollout percentages and A/B testing

### Migration Pattern

The migration follows the **Strangler Fig Pattern**:

```
Client Request → Feature Flag Router → [Legacy Implementation | New Implementation] → Shared Data Layer
```

## Usage

### Direct Usage (New Implementation)

```typescript
import { ConcurrencyAdapter, globalMutex, apiSemaphore } from '@shared/core';

// Create adapter with concurrency limit
const adapter = new ConcurrencyAdapter(10);

// Use mutex for exclusive access
const result = await adapter.withLock(async () => {
  // Critical section code
  return 'protected-operation';
});

// Use concurrency limiter
const limitedResult = await adapter.withLimit(async () => {
  // Rate-limited operation
  return 'limited-operation';
});

// Use global instances
await globalMutex.withLock(async () => {
  // Global mutex operation
});

await apiSemaphore.withPermit(async () => {
  // API rate-limited operation
});
```

### Migration Router Usage

```typescript
import { getConcurrencyRouter } from '@shared/core';
import { featureFlagsService } from '@server/infrastructure/migration/feature-flags.service';

// Get router with feature flags
const router = getConcurrencyRouter(featureFlagsService);

// Enable gradual rollout (50% of users)
await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 50);

// Use router (automatically routes based on feature flags)
const result = await router.withMutexLock(async () => {
  return 'migrated-operation';
}, 'global', 'user-123');

// Get performance metrics
const summary = router.getPerformanceSummary();
console.log('Performance:', summary);
```

## Feature Flags

### Configuration

```typescript
// Enable feature for all users
featureFlagsService.updateFlag('utilities-concurrency-adapter', {
  enabled: true,
  rolloutPercentage: 100
});

// Gradual rollout
await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 25);

// Rollback to legacy
await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');
```

### Rollout Strategy

1. **1% rollout**: Initial testing with minimal user impact
2. **5% rollout**: Expanded testing with performance monitoring
3. **10% rollout**: Broader validation with statistical significance
4. **25% rollout**: Quarter rollout with comprehensive metrics
5. **50% rollout**: Half rollout with A/B testing analysis
6. **100% rollout**: Full migration completion

## API Compatibility

The new implementations maintain full API compatibility with legacy code:

### Mutex Interface

```typescript
interface Mutex {
  acquire(): Promise<() => void>;
  withLock<T>(fn: () => Promise<T>): Promise<T>;
  isLocked(): boolean;
  getWaitingCount(): number;
}
```

### Semaphore Interface

```typescript
interface Semaphore {
  acquire(): Promise<() => void>;
  withPermit<T>(fn: () => Promise<T>): Promise<T>;
  getAvailablePermits(): number;
  getWaitingCount(): number;
}
```

### Global Instances

All existing global instances remain available:

- `globalMutex`: General-purpose mutex
- `apiMutex`: API-specific mutex
- `cacheMutex`: Cache-specific mutex
- `apiSemaphore`: API rate limiting (5 concurrent operations)
- `fileSemaphore`: File operation limiting (3 concurrent operations)

## Performance Improvements

### Expected Benefits

1. **Memory Usage**: 10% reduction through better resource management
2. **Response Time**: Improved performance with optimized library implementations
3. **Reliability**: Better error handling and edge case coverage
4. **Maintainability**: Reduced custom code complexity

### Monitoring

The migration router automatically collects performance metrics:

```typescript
interface MigrationMetrics {
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: Error;
  implementation: 'legacy' | 'new';
  operation: string;
}
```

### Performance Summary

```typescript
const summary = router.getPerformanceSummary();
// Returns:
// {
//   new: { count: 100, avgResponseTime: 45, errorRate: 0.5 },
//   legacy: { count: 50, avgResponseTime: 52, errorRate: 1.2 }
// }
```

## Error Handling

### Graceful Degradation

- Feature flag service failures default to legacy implementation
- Library errors are caught and logged with fallback to legacy
- Rollback mechanisms preserve system stability

### Rollback Procedures

```typescript
// Automatic rollback on error rate > 1%
if (errorRate > 1.0) {
  await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');
}

// Manual rollback
await router.rollbackFeature('utilities-concurrency-adapter');
```

## Testing

### Unit Tests

- **concurrency-adapter.test.ts**: Tests new implementations
- **concurrency-migration-router.test.ts**: Tests feature flag routing
- **integration.test.ts**: End-to-end migration scenarios

### Test Coverage

- API compatibility verification
- Performance benchmarking
- Error handling scenarios
- Memory leak prevention
- Concurrent operation safety

### Running Tests

```bash
# Run all concurrency tests
npm test -- shared/core/src/utils/__tests__/ --run

# Run specific test files
npm test -- shared/core/src/utils/__tests__/concurrency-adapter.test.ts --run
npm test -- shared/core/src/utils/__tests__/concurrency-migration-router.test.ts --run
npm test -- shared/core/src/utils/__tests__/integration.test.ts --run
```

## Migration Checklist

### Phase 1: Setup (✅ Completed)

- [x] Install `async-mutex` and `p-limit` libraries
- [x] Create `ConcurrencyAdapter` class maintaining existing API
- [x] Implement feature flag routing between legacy and new implementations
- [x] Write comprehensive unit tests for adapter functionality

### Phase 2: Deployment

- [ ] Deploy with 1% rollout
- [ ] Monitor memory usage and performance metrics
- [ ] Validate 10% memory usage improvement
- [ ] Complete rollback testing procedures

### Phase 3: Gradual Rollout

- [ ] Increase to 5% rollout with monitoring
- [ ] Increase to 10% rollout with statistical validation
- [ ] Increase to 25% rollout with comprehensive metrics
- [ ] Increase to 50% rollout with A/B testing analysis

### Phase 4: Full Migration

- [ ] Complete 100% rollout
- [ ] Remove legacy implementations
- [ ] Update documentation
- [ ] Archive migration infrastructure

## Troubleshooting

### Common Issues

1. **Feature Flag Service Unavailable**
   - System defaults to legacy implementation
   - Check service health and connectivity

2. **Performance Degradation**
   - Automatic rollback triggers at >500ms response time
   - Review metrics and adjust rollout percentage

3. **Memory Usage Increase**
   - Monitor heap usage and garbage collection
   - Verify proper resource cleanup

### Debug Information

```typescript
// Get adapter statistics
const stats = adapter.getStats();
console.log('Adapter stats:', stats);

// Get migration metrics
const metrics = router.getMetrics();
console.log('Migration metrics:', metrics);

// Check feature flag status
const flag = featureFlagsService.getFlag('utilities-concurrency-adapter');
console.log('Feature flag:', flag);
```

## Examples

See `examples/concurrency-migration-example.ts` for comprehensive usage examples including:

- Direct usage of new utilities
- Migration router with feature flags
- Gradual rollout simulation
- Error handling and rollback
- Performance comparison

## Support

For issues or questions regarding the concurrency utilities migration:

1. Check the test files for usage examples
2. Review the migration metrics for performance insights
3. Consult the feature flag configuration for rollout status
4. Contact the development team for migration support