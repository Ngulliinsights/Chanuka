# @Chanuka/core

Consolidated cross-cutting utilities for the Chanuka platform. This package provides unified, high-performance, and well-tested utilities for caching, logging, validation, error handling, rate limiting, and other cross-cutting concerns.

## Features

### Core Capabilities
- 🚀 **Caching** - Multi-tier caching with Redis/memory, single-flight deduplication, circuit breakers
- 📝 **Error Management** - Structured error handling with specialized classes, recovery strategies, correlation
- 📊 **Observability** - Unified logging, health monitoring, metrics, and distributed tracing
- ✅ **Validation** - Adapter-based validation (Zod/Joi/custom) with schema caching and middleware
- 🚦 **Rate Limiting** - Multiple algorithms with Redis/memory storage and AI-specific optimizations

### Cross-Cutting Features
- 🔄 **Migration Support** - Backward compatibility adapters and gradual migration utilities
- ⚙️ **Configuration Management** - Schema-validated config with hot reloading and feature flags
- 🔧 **Middleware Integration** - Unified middleware for Express applications
- 📊 **Performance Testing** - Built-in benchmarking, load testing, and monitoring tools
- 🏗️ **Primitives** - Core types, errors, constants, and utilities

## Installation

```bash
npm install @Chanuka/core
```

## Quick Start

```typescript
import {
  createCacheService,
  logger,
  ValidationService,
  createRateLimitFactory,
  ValidationError
} from '@Chanuka/core';

// Initialize services
const cache = createCacheService({
  provider: 'multi-tier',
  redisUrl: process.env.REDIS_URL,
  enableCircuitBreaker: true
});

const validator = new ValidationService();
await validator.registerSchema('user', userSchema);

const rateLimitFactory = createRateLimitFactory();
const rateLimiter = rateLimitFactory.createStore('sliding-window');

// Use in your application
async function handleRequest(userData: any) {
  // Rate limiting with automatic retry-after headers
  const rateLimitResult = await rateLimiter.hit('user:123', 100, 60000);
  if (!rateLimitResult.allowed) {
    throw new ValidationError('Rate limit exceeded', {
      retryAfter: rateLimitResult.retryAfter
    });
  }

  // Validation with preprocessing
  const validatedData = await validator.validate('user', userData);

  // Caching with single-flight protection
  const cacheKey = `user:${validatedData.email}`;
  let cachedUser = await cache.get(cacheKey);

  if (!cachedUser) {
    // Process user data...
    cachedUser = { ...validatedData, processed: true };
    await cache.set(cacheKey, cachedUser, 300);
  }

  // Structured logging with correlation
  logger.info('User request processed', {
    email: validatedData.email,
    cached: !!cachedUser,
    rateLimitRemaining: rateLimitResult.remaining
  });

  return cachedUser;
}
```

## Core Capabilities

The shared/core package is organized into five main capabilities, each providing comprehensive functionality for cross-cutting concerns:

### 🚀 Caching (`@Chanuka/core/caching`)
Multi-tier caching with Redis and memory support, single-flight request deduplication, circuit breaker protection, and AI-specific optimizations.

```typescript
import { createCacheService } from '@Chanuka/core/caching';

const cache = createCacheService({
  provider: 'multi-tier',
  redisUrl: 'redis://localhost:6379',
  maxMemoryMB: 100,
  enableCircuitBreaker: true
});

// Basic operations with automatic single-flight protection
await cache.set('user:123', userData, 300);
const user = await cache.get('user:123');
```

### 📝 Error Management (`@Chanuka/core/error-management`)
Structured error handling with specialized error classes, recovery strategies, circuit breaker patterns, and comprehensive error correlation.

```typescript
import { ValidationError, DatabaseError, CircuitBreaker } from '@Chanuka/core/error-management';

// Specialized errors with automatic recovery
throw new ValidationError('Invalid email format', { field: 'email' });

// Circuit breaker protection
const breaker = new CircuitBreaker({ threshold: 5, timeout: 60000 });
const result = await breaker.call(() => externalApiCall());
```

### 📊 Observability (`@Chanuka/core/observability`)
Unified logging, health monitoring, metrics collection, and distributed tracing with shared correlation IDs and comprehensive telemetry.

```typescript
import { logger, createTracer, createCounter } from '@Chanuka/core/observability';

// Structured logging with correlation
logger.info('User login successful', { userId: '123', component: 'auth' });

// Distributed tracing
const tracer = createTracer('my-service', '1.0.0');
const span = tracer.startSpan('http-request');

// Metrics collection
const requestCounter = createCounter('http_requests_total');
requestCounter.increment(1, { method: 'GET', status: '200' });
```

### ✅ Validation (`@Chanuka/core/validation`)
Adapter-based validation framework supporting Zod, Joi, and custom validators with schema caching, preprocessing, and Express middleware integration.

```typescript
import { ValidationService } from '@Chanuka/core/validation';

const validator = new ValidationService();
await validator.registerSchema('user', userSchema);

// Validate with automatic preprocessing
const validatedData = await validator.validate('user', inputData);

// Express middleware integration
app.post('/users', validateRequest({ body: 'user' }), handler);
```

### 🚦 Rate Limiting (`@Chanuka/core/rate-limiting`)
Multiple algorithms (sliding window, token bucket, fixed window) with Redis/memory storage, AI-specific rate limiting, and comprehensive metrics.

```typescript
import { createRateLimitFactory } from '@Chanuka/core/rate-limiting';

const factory = createRateLimitFactory(redisClient);
const rateLimiter = factory.createStore('sliding-window');

// Check rate limit
const result = await rateLimiter.hit('user:123', 100, 60000);
if (!result.allowed) {
  // Handle rate limit exceeded
}
```

### Configuration Management

Schema-validated configuration with feature flags:

```typescript
import { configManager } from '@Chanuka/core/config';

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
import { HealthChecker } from '@Chanuka/core/health';

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

Unified middleware for Express applications with comprehensive cross-cutting concerns:

```typescript
import express from 'express';
import {
  createExpressRateLimitMiddleware,
  validateRequest,
  logger,
  errorHandlerMiddleware
} from '@Chanuka/core';

const app = express();

// Request logging with correlation IDs
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateId();
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    correlationId: req.correlationId
  });
  next();
});

// Rate limiting with Redis storage
app.use('/api', createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 100,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => req.user?.id || req.ip
}));

// Validation with schema caching
app.post('/users',
  validateRequest({
    body: 'user',
    query: 'pagination'
  }),
  async (req, res) => {
    // Request body is validated and typed
    const user = req.body;
    res.json({ success: true, user });
  }
);

// Error handling with structured responses
app.use(errorHandlerMiddleware({
  includeStackTrace: process.env.NODE_ENV === 'development',
  enableSentryReporting: true
}));
```

## Performance Testing

Built-in performance benchmarking and monitoring:

```typescript
import { 
  PerformanceBenchmarks,
  StressTests,
  PerformanceMonitor,
  createComprehensiveTestSuite 
} from '@Chanuka/core/testing';

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

## Migration Support

Comprehensive migration utilities for gradual adoption of the consolidated system:

```typescript
import {
  LegacyCacheAdapter,
  LegacyLoggerAdapter,
  MigrationValidator,
  useUnifiedCaching,
  useUnifiedObservability
} from '@Chanuka/core';

// Feature flag-based migration
if (useUnifiedCaching) {
  // Use new caching system
  const cache = createCacheService(unifiedConfig);
} else {
  // Use legacy cache with adapter
  const cache = new LegacyCacheAdapter(legacyCache);
}

// Gradual observability migration
if (useUnifiedObservability) {
  // Use unified observability platform
  logger.info('Using unified logging');
} else {
  // Use legacy fragmented systems
  legacyLogger.info('Using legacy logging');
}

// Migration validation
const validator = new MigrationValidator();
const report = await validator.validateMigration('./src');
console.log(`Migration readiness: ${report.score}%`);
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
} from '@Chanuka/core';

// All interfaces are fully typed
const cache: CacheService = createCacheService(config);
const metrics: CacheMetrics = cache.getMetrics();
```

## Performance Characteristics

### Core Capabilities Performance
- **Caching**: >10,000 ops/sec (memory), >5,000 ops/sec (Redis), single-flight deduplication
- **Error Management**: Minimal overhead, automatic recovery strategies, correlation tracking
- **Observability**: >10,000 logs/sec with async transport, efficient metrics collection
- **Validation**: >10,000 simple validations/sec, >1,000 complex validations/sec with schema caching
- **Rate Limiting**: >5,000 checks/sec, multiple algorithms with Redis/memory storage

### System Performance
- **Memory Usage**: Optimized allocation with efficient garbage collection
- **Tree Shaking**: Named exports enable optimal bundle size reduction
- **Type Safety**: Full TypeScript support with zero runtime type checking overhead
- **Backward Compatibility**: Legacy adapters with minimal performance impact

## Testing

Comprehensive test suite with >95% coverage across all capabilities:

```bash
# Run all tests
npm test

# Run capability-specific tests
npm test -- src/caching/
npm test -- src/error-management/
npm test -- src/observability/
npm test -- src/validation/
npm test -- src/rate-limiting/

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
- Issues: [GitHub Issues](https://github.com/Chanuka/core/issues)
- Discussions: [GitHub Discussions](https://github.com/Chanuka/core/discussions)

---

Built with ❤️ by the Chanuka Team