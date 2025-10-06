# @triplecheck/core

Consolidated cross-cutting utilities for the TripleCheck platform. This package provides unified, high-performance, and well-tested utilities for caching, logging, validation, error handling, rate limiting, and other cross-cutting concerns.

## Features

- 🚀 **Multi-Tier Caching** - Memory + Redis with automatic promotion and circuit breaker patterns
- 📝 **Structured Logging** - Pino-based logging with async context preservation and redaction
- ✅ **Comprehensive Validation** - Zod-based validation with preprocessing and caching
- 🛡️ **Error Handling** - Categorized errors with circuit breaker integration
- 🚦 **Rate Limiting** - Multiple algorithms (sliding window, token bucket, fixed window)
- ⚙️ **Configuration Management** - Zod schema validation with hot reloading and feature flags
- 🏥 **Health Monitoring** - Comprehensive dependency checking with timeout protection
- 🔧 **Middleware Integration** - Unified middleware for Express applications
- 📊 **Performance Testing** - Built-in benchmarking, load testing, and monitoring tools
- 🔄 **Migration Support** - Backward compatibility adapters and migration utilities

## Installation

```bash
npm install @triplecheck/core
```

## Quick Start

```typescript
import { 
  createCacheService, 
  Logger, 
  ValidationService, 
  createRateLimitFactory,
  configManager 
} from '@triplecheck/core';

// Initialize configuration
const config = await configManager.load();

// Create cache service
const cache = createCacheService({
  provider: 'redis',
  redisUrl: 'redis://localhost:6379',
  maxMemoryMB: 100,
  enableMetrics: true
});

// Create logger
const logger = new Logger({
  level: 'info',
  pretty: process.env.NODE_ENV === 'development',
  enableMetrics: true
});

// Create validator
const validator = new ValidationService();
await validator.registerSchema('user', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 }
  },
  required: ['name', 'email', 'age']
});

// Create rate limiter
const rateLimitFactory = createRateLimitFactory();
const rateLimiter = rateLimitFactory.createStore('sliding-window');

// Use in your application
async function handleRequest(userData: any) {
  // Rate limiting
  const rateLimitResult = await rateLimiter.hit('user:123', 100, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('Rate limit exceeded');
  }

  // Validation
  const validatedData = await validator.validate('user', userData);

  // Caching
  const cacheKey = `user:${validatedData.email}`;
  let cachedUser = await cache.get(cacheKey);
  
  if (!cachedUser) {
    // Process user data...
    cachedUser = { ...validatedData, processed: true };
    await cache.set(cacheKey, cachedUser, 300);
  }

  // Logging
  logger.info('User request processed', {
    email: validatedData.email,
    cached: !!cachedUser,
    rateLimitRemaining: rateLimitResult.remaining
  });

  return cachedUser;
}
```

## Core Modules

### Cache Service

Multi-tier caching with Redis and memory support:

```typescript
import { createCacheService } from '@triplecheck/core/cache';

const cache = createCacheService({
  provider: 'multi-tier', // 'memory', 'redis', or 'multi-tier'
  redisUrl: 'redis://localhost:6379',
  maxMemoryMB: 100,
  enableCompression: true,
  enableCircuitBreaker: true
});

// Basic operations
await cache.set('key', 'value', 300); // TTL in seconds
const value = await cache.get('key');
await cache.del('key');

// Batch operations
await cache.mset([['key1', 'value1'], ['key2', 'value2']]);
const values = await cache.mget(['key1', 'key2']);

// Metrics
const metrics = cache.getMetrics();
console.log(`Hit rate: ${metrics.hitRate}%`);
```

### Logging Service

Structured logging with context preservation:

```typescript
import { Logger } from '@triplecheck/core/logging';

const logger = new Logger({
  level: 'info',
  pretty: false,
  redactPaths: ['password', 'token', 'ssn'],
  asyncTransport: true,
  enableMetrics: true
});

// Basic logging
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database error', { error: err, query: 'SELECT * FROM users' });

// Structured logging methods
logger.logRequest(req, res, duration);
logger.logDatabaseQuery('SELECT * FROM users', 150, ['active']);
logger.logCacheOperation('get', 'user:123', true, 2.5);
logger.logBusinessEvent('user_signup', { userId: '123', plan: 'premium' });
logger.logSecurityEvent('failed_login', { ip: '192.168.1.1', attempts: 3 });

// Context preservation
logger.withContext({ requestId: 'req-123', userId: '456' }, () => {
  logger.info('Processing request'); // Automatically includes context
});
```

### Validation Service

Zod-based validation with preprocessing:

```typescript
import { ValidationService } from '@triplecheck/core/validation';

const validator = new ValidationService();

// Register schemas
await validator.registerSchema('user', {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 }
  },
  required: ['name', 'email', 'age']
});

// Validate data
const validatedData = await validator.validate('user', userData);

// Batch validation
const results = await validator.validateBatch('user', [user1, user2, user3]);
console.log(`Valid: ${results.valid.length}, Invalid: ${results.invalid.length}`);

// Safe validation (doesn't throw)
const result = await validator.validateSafe('user', userData);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### Rate Limiting

Multiple algorithms with Redis and memory support:

```typescript
import { createRateLimitFactory } from '@triplecheck/core/rate-limiting';

const factory = createRateLimitFactory(redisClient);
const rateLimiter = factory.createStore('sliding-window'); // 'token-bucket', 'fixed-window'

// Check rate limit
const result = await rateLimiter.hit('user:123', 100, 60000); // 100 requests per minute
if (result.allowed) {
  console.log(`Request allowed. Remaining: ${result.remaining}`);
} else {
  console.log(`Rate limited. Retry after: ${result.retryAfter}ms`);
}

// Get metrics
const metrics = rateLimiter.getMetrics();
console.log(`Block rate: ${metrics.blockRate}%`);
```

### Error Handling

Categorized errors with circuit breaker patterns:

```typescript
import { 
  AppError, 
  ValidationError, 
  NotFoundError,
  CircuitBreaker,
  errorHandlerMiddleware 
} from '@triplecheck/core/error-handling';

// Custom errors
throw new ValidationError('Invalid email format', { field: 'email', value: 'invalid' });
throw new NotFoundError('User not found', { userId: '123' });

// Circuit breaker
const circuitBreaker = new CircuitBreaker({
  threshold: 5,
  timeout: 60000,
  slowCallThreshold: 5000
});

const result = await circuitBreaker.call(async () => {
  return await externalApiCall();
});

// Express middleware
app.use(errorHandlerMiddleware({
  includeStackTrace: process.env.NODE_ENV === 'development',
  enableSentryReporting: true
}));
```

### Configuration Management

Schema-validated configuration with feature flags:

```typescript
import { configManager } from '@triplecheck/core/config';

// Load configuration
const config = await configManager.load();

// Access configuration
console.log(`Cache provider: ${config.cache.provider}`);
console.log(`Log level: ${config.log.level}`);

// Feature flags
const isEnabled = configManager.isFeatureEnabled('new-feature', 'user-123');
if (isEnabled) {
  // Use new feature
}

// Hot reloading (development only)
configManager.on('config:changed', (newConfig) => {
  console.log('Configuration updated:', newConfig);
});
```

### Health Monitoring

Comprehensive health checks with timeout protection:

```typescript
import { HealthChecker } from '@triplecheck/core/health';

const healthChecker = new HealthChecker();

// Register health checks
healthChecker.register({
  name: 'database',
  check: async () => {
    try {
      await db.query('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', details: error.message };
    }
  }
});

// Run health checks
const result = await healthChecker.runChecks();
console.log(`Overall status: ${result.status}`);
console.log('Individual checks:', result.checks);

// Express endpoint
app.get('/health', async (req, res) => {
  const health = await healthChecker.runChecks();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Middleware Integration

Unified middleware for Express applications:

```typescript
import express from 'express';
import { 
  rateLimitMiddleware,
  validateRequest,
  requestLoggingMiddleware,
  errorHandlerMiddleware 
} from '@triplecheck/core/middleware';

const app = express();

// Request logging
app.use(requestLoggingMiddleware({
  includeBody: true,
  includeQuery: true,
  redactFields: ['password', 'token']
}));

// Rate limiting
app.use('/api', rateLimitMiddleware({
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: false
}));

// Validation
app.post('/users', 
  validateRequest({
    body: 'user', // References registered schema
    query: 'pagination'
  }),
  async (req, res) => {
    // Request body is validated and typed
    const user = req.body;
    res.json({ success: true, user });
  }
);

// Error handling (should be last)
app.use(errorHandlerMiddleware());
```

## Performance Testing

Built-in performance benchmarking and monitoring:

```typescript
import { 
  PerformanceBenchmarks,
  StressTests,
  PerformanceMonitor,
  createComprehensiveTestSuite 
} from '@triplecheck/core/testing';

// Performance benchmarks
const benchmarks = new PerformanceBenchmarks();
const suite = await benchmarks.runAll({
  cache,
  rateLimiter,
  logger,
  validator
});

console.log(`Performance score: ${suite.summary.successfulTests}/${suite.summary.totalTests}`);

// Stress testing
const stressTests = new StressTests();
const stressResults = await stressTests.runStressTests({
  cache,
  rateLimiter,
  logger
});

// Performance monitoring
const monitor = new PerformanceMonitor();
monitor.startMonitoring('cache-hit-rate', async () => {
  const metrics = cache.getMetrics();
  return metrics.hitRate;
}, 5000);

// Generate reports
const report = monitor.generateReport();
const reportPath = monitor.saveReport(report);
```

## Migration from Legacy Code

Backward compatibility adapters for smooth migration:

```typescript
import { 
  LegacyCacheAdapter,
  LegacyLoggerAdapter,
  MigrationFinalizer,
  MigrationValidator 
} from '@triplecheck/core/migration';

// Legacy cache adapter
const legacyCache = new LegacyCacheAdapter(coreCache);
// Use existing cache interface without changes

// Migration scripts
const migrationFinalizer = new MigrationFinalizer();
await migrationFinalizer.finalizeMigration('./src');

// Validation
const validator = new MigrationValidator();
const validationResult = await validator.validateMigration();
```

## Environment Configuration

Configure via environment variables:

```bash
# Cache Configuration
CACHE_PROVIDER=redis
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
CACHE_MAX_MEMORY_MB=100

# Logging Configuration
LOG_LEVEL=info
LOG_PRETTY=false
LOG_ASYNC_TRANSPORT=true

# Rate Limiting Configuration
RATE_LIMIT_REDIS_URL=redis://localhost:6379
RATE_LIMIT_DEFAULT_MAX=100
RATE_LIMIT_DEFAULT_WINDOW=60000

# Feature Flags
FEATURE_NEW_CACHE=true
FEATURE_ENHANCED_LOGGING=false

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  CacheService,
  CacheMetrics,
  LogContext,
  ValidationResult,
  RateLimitResult,
  HealthResult,
  AppConfig
} from '@triplecheck/core';

// All interfaces are fully typed
const cache: CacheService = createCacheService(config);
const metrics: CacheMetrics = cache.getMetrics();
```

## Performance Characteristics

- **Cache Operations**: >10,000 ops/sec (memory), >5,000 ops/sec (Redis)
- **Logging**: >10,000 logs/sec with async transport
- **Validation**: >10,000 simple validations/sec, >1,000 complex validations/sec
- **Rate Limiting**: >5,000 checks/sec
- **Memory Usage**: Optimized for minimal allocation and efficient garbage collection

## Testing

Comprehensive test suite with >95% coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run performance tests
npm run test:performance

# Run stress tests
npm run test:stress

# Run integration tests
npm run test:integration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: [Core Utilities Docs](./docs/)
- Issues: [GitHub Issues](https://github.com/triplecheck/core/issues)
- Discussions: [GitHub Discussions](https://github.com/triplecheck/core/discussions)

---

Built with ❤️ by the TripleCheck Team