# Migration Guide: Shared/Core Consolidation

This guide provides comprehensive instructions for migrating from the fragmented legacy system to the consolidated shared/core package.

## Overview

The shared/core package has been restructured into five main capabilities:

- **Caching** (`@triplecheck/core/caching`) - Multi-tier caching with circuit breakers
- **Error Management** (`@triplecheck/core/error-management`) - Structured error handling
- **Observability** (`@triplecheck/core/observability`) - Unified logging, metrics, and tracing
- **Validation** (`@triplecheck/core/validation`) - Adapter-based validation framework
- **Rate Limiting** (`@triplecheck/core/rate-limiting`) - Multiple algorithms with AI support

## Migration Strategy

### Phase 1: Assessment and Planning

1. **Inventory Current Usage**
   ```bash
   # Find all imports from shared/core
   grep -r "from '@triplecheck/core" src/ --include="*.ts" --include="*.js"
   ```

2. **Identify Migration Candidates**
   - Legacy cache services → `@triplecheck/core/caching`
   - Fragmented loggers → `@triplecheck/core/observability`
   - Validation logic → `@triplecheck/core/validation`
   - Rate limiting → `@triplecheck/core/rate-limiting`
   - Error handling → `@triplecheck/core/error-management`

3. **Set Feature Flags**
   ```typescript
   // In your configuration
   process.env.USE_UNIFIED_CACHING = 'false';        // Start with false
   process.env.USE_UNIFIED_OBSERVABILITY = 'false';  // Enable gradually
   process.env.USE_UNIFIED_VALIDATION = 'false';
   process.env.USE_UNIFIED_RATE_LIMITING = 'false';
   ```

### Phase 2: Gradual Migration

#### Step 1: Update Package Imports

**Before:**
```typescript
import { cacheService } from './services/cache';
import { logger } from './utils/logger';
import { validator } from './utils/validation';
import { rateLimiter } from './middleware/rate-limit';
```

**After:**
```typescript
import { createCacheService } from '@triplecheck/core/caching';
import { logger } from '@triplecheck/core/observability';
import { ValidationService } from '@triplecheck/core/validation';
import { createRateLimitFactory } from '@triplecheck/core/rate-limiting';
```

#### Step 2: Migrate Caching

**Legacy Cache Service:**
```typescript
// Before
import { cacheService } from './old-cache';

const cache = cacheService;
await cache.set('key', 'value');
const value = await cache.get('key');
```

**Unified Caching:**
```typescript
// After
import { createCacheService } from '@triplecheck/core/caching';

const cache = createCacheService({
  provider: 'multi-tier',
  redisUrl: process.env.REDIS_URL,
  enableCircuitBreaker: true
});

await cache.set('key', 'value', 300);
const value = await cache.get('key');
```

#### Step 3: Migrate Logging

**Fragmented Loggers:**
```typescript
// Before
import { logger } from '../utils/logger';
import { monitoringLogger } from '../infrastructure/monitoring';
import { auditLogger } from '../security/audit';

logger.info('User action');
monitoringLogger.metric('request', 1);
auditLogger.security('login_attempt', { userId: '123' });
```

**Unified Observability:**
```typescript
// After
import { logger, createCounter } from '@triplecheck/core/observability';

const requestCounter = createCounter('http_requests_total');

logger.info('User action', { userId: '123' });
requestCounter.increment(1, { method: 'POST', status: '200' });
logger.logSecurityEvent('login_attempt', { userId: '123' });
```

#### Step 4: Migrate Validation

**Legacy Validation:**
```typescript
// Before
import { validateUser } from './validators/user';
import Joi from 'joi';

const schema = Joi.object({ name: Joi.string().required() });
const result = schema.validate(data);
```

**Unified Validation:**
```typescript
// After
import { ValidationService } from '@triplecheck/core/validation';

const validator = new ValidationService();
await validator.registerSchema('user', {
  type: 'object',
  properties: { name: { type: 'string', minLength: 1 } },
  required: ['name']
});

const result = await validator.validate('user', data);
```

#### Step 5: Migrate Rate Limiting

**Legacy Rate Limiting:**
```typescript
// Before
import { rateLimit } from 'express-rate-limit';

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

**Unified Rate Limiting:**
```typescript
// After
import { createExpressRateLimitMiddleware } from '@triplecheck/core/rate-limiting';

app.use(createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 100,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => req.user?.id || req.ip
}));
```

#### Step 6: Migrate Error Handling

**Legacy Error Handling:**
```typescript
// Before
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

throw new CustomError('Something went wrong');
```

**Unified Error Management:**
```typescript
// After
import { BaseError, ErrorDomain, ErrorSeverity } from '@triplecheck/core/error-management';

class CustomError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: 'CUSTOM_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      details
    });
  }
}

throw new CustomError('Something went wrong', { userId: '123' });
```

### Phase 3: Feature Flag Rollout

#### Environment-Based Migration

```typescript
// config/migration.ts
export const MIGRATION_FLAGS = {
  unifiedCaching: process.env.USE_UNIFIED_CACHING === 'true',
  unifiedObservability: process.env.USE_UNIFIED_OBSERVABILITY === 'true',
  unifiedValidation: process.env.USE_UNIFIED_VALIDATION === 'true',
  unifiedRateLimiting: process.env.USE_UNIFIED_RATE_LIMITING === 'true',
};

// Service factory with feature flags
export function createCache() {
  if (MIGRATION_FLAGS.unifiedCaching) {
    return createCacheService(unifiedConfig);
  }
  return legacyCacheService;
}
```

#### Gradual Rollout Strategy

1. **Development Environment**: Enable all flags
2. **Staging Environment**: Enable 50% of traffic
3. **Production Environment**: Enable 10% of traffic, monitor metrics
4. **Full Rollout**: Enable 100% after successful monitoring

### Phase 4: Cleanup and Optimization

#### Remove Legacy Code

```bash
# After successful migration, remove old files
rm -rf src/services/old-cache/
rm -rf src/utils/old-logger/
rm -rf src/validators/legacy/
```

#### Update Dependencies

```json
// package.json
{
  "dependencies": {
    "@triplecheck/core": "^1.0.0"
  },
  "devDependencies": {
    // Remove old validation libraries if no longer needed
    // "joi": "...",
    // "express-rate-limit": "..."
  }
}
```

#### Update TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["../shared/*"]
    }
  }
}
```

## Compatibility Matrix

| Legacy Component | New Component | Compatibility | Migration Effort |
|------------------|---------------|----------------|------------------|
| Legacy Cache | `@triplecheck/core/caching` | Adapter available | Medium |
| Fragmented Loggers | `@triplecheck/core/observability` | Drop-in replacement | Low |
| Joi Validation | `@triplecheck/core/validation` | Schema conversion needed | Medium |
| Express Rate Limit | `@triplecheck/core/rate-limiting` | Middleware compatible | Low |
| Custom Errors | `@triplecheck/core/error-management` | Base class extension | Low |

## Testing Migration

### Unit Tests

```typescript
// Test both implementations during migration
describe('Cache Service Migration', () => {
  it('should work with legacy cache', async () => {
    const cache = createCache(); // Uses feature flag
    await cache.set('test', 'value');
    expect(await cache.get('test')).toBe('value');
  });

  it('should work with unified cache', async () => {
    process.env.USE_UNIFIED_CACHING = 'true';
    const cache = createCache();
    await cache.set('test', 'value');
    expect(await cache.get('test')).toBe('value');
  });
});
```

### Integration Tests

```typescript
// Test end-to-end functionality
describe('Migration Integration', () => {
  it('should handle mixed implementations', async () => {
    // Test with some services migrated, others not
    const app = createApp({
      useUnifiedCaching: true,
      useUnifiedObservability: false
    });

    const response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
  });
});
```

### Performance Testing

```typescript
// Compare performance before/after migration
describe('Performance Regression', () => {
  it('should maintain performance levels', async () => {
    const baseline = await runPerformanceTest(legacyImplementation);
    const migrated = await runPerformanceTest(unifiedImplementation);

    expect(migrated.opsPerSecond).toBeGreaterThan(baseline.opsPerSecond * 0.9);
  });
});
```

## Troubleshooting

### Common Issues

#### Import Errors
```typescript
// Error: Cannot find module '@triplecheck/core/caching'
// Solution: Update package.json exports or use relative imports during migration
import { createCacheService } from '../../../shared/core/src/caching';
```

#### Type Conflicts
```typescript
// Error: Type 'X' is not assignable to type 'Y'
// Solution: Use adapter pattern or update type definitions
import { LegacyCacheAdapter } from '@triplecheck/core/migration';
const adaptedCache = new LegacyCacheAdapter(legacyCache);
```

#### Runtime Errors
```typescript
// Error: Circuit breaker open
// Solution: Check configuration and dependencies
const cache = createCacheService({
  provider: 'multi-tier',
  enableCircuitBreaker: false, // Disable during migration
  redisUrl: process.env.REDIS_URL
});
```

### Monitoring Migration

#### Metrics to Track

```typescript
import { createCounter, createHistogram } from '@triplecheck/core/observability';

const migrationErrors = createCounter('migration_errors_total');
const migrationLatency = createHistogram('migration_operation_duration');

// Track migration progress
migrationErrors.increment(1, { component: 'caching', error: 'timeout' });
```

#### Health Checks

```typescript
// Migration health check
export async function checkMigrationHealth(): Promise<HealthResult> {
  const checks = await Promise.all([
    checkCachingMigration(),
    checkObservabilityMigration(),
    checkValidationMigration(),
    checkRateLimitingMigration()
  ]);

  return {
    status: checks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded',
    checks
  };
}
```

## Rollback Strategy

### Quick Rollback

```typescript
// Emergency rollback: disable all unified features
process.env.USE_UNIFIED_CACHING = 'false';
process.env.USE_UNIFIED_OBSERVABILITY = 'false';
process.env.USE_UNIFIED_VALIDATION = 'false';
process.env.USE_UNIFIED_RATE_LIMITING = 'false';

// Restart application
```

### Gradual Rollback

```typescript
// Rollback one component at a time
const ROLLBACK_SEQUENCE = [
  'rate-limiting',
  'validation',
  'observability',
  'caching'
];

for (const component of ROLLBACK_SEQUENCE) {
  await rollbackComponent(component);
  await validateSystemHealth();
  await waitForMonitoringPeriod();
}
```

## Support and Resources

### Documentation
- [API Reference](./api/)
- [Configuration Guide](./configuration/)
- [Best Practices](./best-practices/)

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Migration Support**: Contact the platform team
- **Community**: Join the #shared-core-migration channel

### Success Metrics

Track these metrics to measure migration success:

- **Performance**: No degradation in response times
- **Reliability**: No increase in error rates
- **Functionality**: All features work as expected
- **Developer Experience**: Reduced complexity and improved maintainability

---

**Migration Checklist**

- [ ] Assess current usage and dependencies
- [ ] Set up feature flags and monitoring
- [ ] Migrate components one by one
- [ ] Update tests and documentation
- [ ] Perform gradual rollout
- [ ] Monitor performance and errors
- [ ] Clean up legacy code
- [ ] Update team documentation

Remember: Migration is a journey, not a destination. Take it one step at a time and ensure each change improves the system.