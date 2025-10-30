# Rate Limiting System

A comprehensive rate limiting framework with multiple algorithms (sliding window, token bucket, fixed window), Redis and memory storage support, and advanced features like AI-specific rate limiting and comprehensive metrics collection.

## Architecture

```
rate-limiting/
├── core/                    # Core rate limiting interfaces and services
│   ├── interfaces.ts       # Rate limiting service contracts
│   ├── service.ts          # Main rate limiting service
│   └── index.ts           # Core barrel exports
├── adapters/               # Storage adapters
│   ├── memory-adapter.ts   # In-memory storage
│   ├── redis-adapter.ts    # Redis storage
│   └── index.ts           # Adapter barrel exports
├── algorithms/             # Rate limiting algorithms
│   ├── fixed-window.ts     # Fixed window algorithm
│   ├── sliding-window.ts   # Sliding window algorithm
│   ├── token-bucket.ts     # Token bucket algorithm
│   └── index.ts           # Algorithm barrel exports
├── middleware/             # Framework middleware
│   ├── express-middleware.ts # Express.js middleware
│   └── index.ts           # Middleware barrel exports
├── ai-rate-limiter.ts      # AI-specific rate limiting
├── factory.ts             # Rate limiter factory
├── metrics.ts             # Metrics collection
├── types.ts               # TypeScript type definitions
├── stores/                # Storage implementations
│   ├── memory-store.ts    # In-memory store
│   ├── redis-store.ts     # Redis store
│   └── index.ts          # Store barrel exports
└── index.ts              # Main exports
```

## Key Features

### 🏗️ Multiple Algorithms
- **Fixed Window**: Simple time-based windows with reset boundaries
- **Sliding Window**: Rolling time windows for smoother rate limiting
- **Token Bucket**: Credit-based system with burst capacity
- **Custom Algorithms**: Extensible algorithm framework

### 💾 Storage Options
- **Memory Store**: Fast in-memory storage for single-instance apps
- **Redis Store**: Distributed storage for multi-instance deployments
- **Legacy Adapters**: Backward compatibility with existing stores
- **Custom Stores**: Plugin architecture for new storage backends

### 🤖 AI-Specific Rate Limiting
- **Cost-Aware Limiting**: Rate limits based on API call costs
- **Model-Based Limits**: Different limits per AI model/service
- **Adaptive Limits**: Dynamic adjustment based on usage patterns
- **Credit Management**: Token-based credit systems

### 📊 Comprehensive Metrics
- **Hit/Miss Tracking**: Detailed rate limit statistics
- **Performance Monitoring**: Response time and throughput metrics
- **Storage Metrics**: Cache hit rates and storage performance
- **Custom Metrics**: Extensible metrics collection

## Usage Examples

### Basic Rate Limiting

```typescript
import { createRateLimitFactory } from '@Chanuka/core/rate-limiting';

const factory = createRateLimitFactory(redisClient);
const rateLimiter = factory.createStore('sliding-window');

// Check rate limit
const result = await rateLimiter.hit('user:123', 100, 60000); // 100 requests per minute

if (result.allowed) {
  console.log(`Request allowed. Remaining: ${result.remaining}`);
  // Process request
} else {
  console.log(`Rate limited. Retry after: ${result.retryAfter}ms`);
  // Return 429 Too Many Requests
}
```

### Express Middleware

```typescript
import express from 'express';
import { createExpressRateLimitMiddleware } from '@Chanuka/core/rate-limiting';

const app = express();

// Apply rate limiting to all routes
app.use(createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 100,           // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (req) => req.ip, // Rate limit by IP
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  onLimitReached: (req, res) => {
    console.log(`Rate limit exceeded for ${req.ip}`);
  }
}));

// Different limits for different routes
app.use('/api/admin', createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 1000,          // Higher limit for admin routes
  windowMs: 60 * 1000,  // per minute
  keyGenerator: (req) => req.user?.id || req.ip
}));
```

### AI-Specific Rate Limiting

```typescript
import { AIRateLimiter } from '@Chanuka/core/rate-limiting';

const aiLimiter = AIRateLimiter.createOpenAIRateLimiter(redisStore, 100);

// Rate limit OpenAI API calls
const canMakeCall = await aiLimiter.checkLimit('user:123', {
  model: 'gpt-4',
  tokens: 1000,
  cost: 0.02
});

if (canMakeCall.allowed) {
  // Make OpenAI API call
  const response = await openai.chat.completions.create({ ... });
  await aiLimiter.recordUsage('user:123', response.usage);
} else {
  // Handle rate limit exceeded
}
```

### Multiple Algorithms

```typescript
import { FixedWindowStore, SlidingWindowStore, TokenBucketStore } from '@Chanuka/core/rate-limiting';

// Fixed window: resets at fixed intervals
const fixedWindow = new FixedWindowStore(memoryStore, {
  windowMs: 60000, // 1 minute
  maxRequests: 100
});

// Sliding window: smooth rate limiting
const slidingWindow = new SlidingWindowStore(redisStore, {
  windowMs: 60000,
  maxRequests: 100,
  bucketCount: 10 // 10 buckets per window
});

// Token bucket: burst capacity with steady rate
const tokenBucket = new TokenBucketStore(redisStore, {
  capacity: 100,     // Max burst tokens
  refillRate: 10,    // Tokens per second
  refillInterval: 100 // Refill every 100ms
});
```

### Custom Storage Adapter

```typescript
import { RateLimitStore } from '@Chanuka/core/rate-limiting';

class CustomStore implements RateLimitStore {
  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    // Custom storage logic
    const current = await this.getCurrentCount(key);
    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: windowMs,
        resetTime: Date.now() + windowMs
      };
    }

    await this.increment(key, windowMs);
    return {
      allowed: true,
      remaining: limit - current - 1,
      retryAfter: 0,
      resetTime: Date.now() + windowMs
    };
  }

  // Implement other required methods...
}
```

## Configuration Options

### Rate Limiter Configuration

```typescript
const rateLimiter = factory.createStore('sliding-window', {
  // Algorithm-specific options
  windowMs: 60000,        // Time window in milliseconds
  maxRequests: 100,       // Maximum requests per window
  bucketCount: 10,        // Number of buckets (sliding window only)

  // Storage options
  prefix: 'rl:',          // Key prefix for storage
  cleanupInterval: 300000, // Cleanup interval (5 minutes)

  // Behavior options
  burstAllowance: 1.2,    // Allow 20% burst above limit
  gradualBackoff: true,   // Gradually increase retry time
  jitter: true           // Add randomness to prevent thundering herd
});
```

### AI Rate Limiter Configuration

```typescript
const aiLimiter = new AIRateLimiter(redisStore, {
  // Cost-based limits
  maxCostPerWindow: 10.0,    // Max cost per time window
  maxCostPerDay: 100.0,      // Max cost per day

  // Request-based limits
  maxRequestsPerWindow: 1000,
  maxRequestsPerDay: 10000,

  // Model-specific limits
  modelLimits: {
    'gpt-4': { maxTokensPerMinute: 10000, maxCostPerHour: 5.0 },
    'gpt-3.5-turbo': { maxTokensPerMinute: 50000, maxCostPerHour: 2.0 }
  },

  // Adaptive behavior
  adaptiveScaling: true,     // Adjust limits based on usage patterns
  burstMultiplier: 1.5       // Allow burst requests
});
```

### Middleware Configuration

```typescript
app.use(createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 100,
  windowMs: 15 * 60 * 1000,

  // Request identification
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.path === '/health', // Skip health checks

  // Response handling
  onLimitReached: (req, res) => {
    res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  },

  // Headers
  standardHeaders: true,     // X-RateLimit-* headers
  legacyHeaders: false,      // X-RateLimit-* legacy headers

  // Behavior
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}));
```

## Rate Limiting Algorithms

### Fixed Window
- **Pros**: Simple, predictable, low overhead
- **Cons**: Burst at window boundaries
- **Use Case**: Simple APIs with predictable traffic

```typescript
const fixedWindow = new FixedWindowStore(store, {
  windowMs: 60000, // 1 minute
  maxRequests: 100
});
```

### Sliding Window
- **Pros**: Smooth rate limiting, no boundary bursts
- **Cons**: Higher memory usage, more complex
- **Use Case**: APIs requiring consistent rate limiting

```typescript
const slidingWindow = new SlidingWindowStore(store, {
  windowMs: 60000,
  maxRequests: 100,
  bucketCount: 10 // More buckets = smoother limiting
});
```

### Token Bucket
- **Pros**: Burst capacity, steady rate, flexible
- **Cons**: More complex configuration
- **Use Case**: APIs needing burst capacity with steady rates

```typescript
const tokenBucket = new TokenBucketStore(store, {
  capacity: 100,     // Burst capacity
  refillRate: 10,    // Tokens per second
  refillInterval: 100 // Refill every 100ms
});
```

## Metrics and Monitoring

### Collecting Metrics

```typescript
import { RateLimitMetrics } from '@Chanuka/core/rate-limiting';

const metrics = new RateLimitMetrics();

// Track rate limiter performance
rateLimiter.on('hit', (result) => {
  metrics.recordHit(result.allowed, result.remaining);
});

rateLimiter.on('limit-exceeded', (key, retryAfter) => {
  metrics.recordLimitExceeded(key, retryAfter);
});

// Get metrics
const stats = metrics.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Average response time: ${stats.avgResponseTime}ms`);
```

### Health Checks

```typescript
// Rate limiter health check
const health = await rateLimiter.healthCheck();
if (!health.healthy) {
  console.error('Rate limiter unhealthy:', health.details);
}

// Storage health check
const storageHealth = await store.healthCheck();
console.log(`Storage latency: ${storageHealth.latency}ms`);
```

## Migration Guide

### From Legacy Rate Limiting

```typescript
// Before
import { rateLimiter } from './old-rate-limiter';
const result = await rateLimiter.check('user:123');

// After
import { createRateLimitFactory } from '@Chanuka/core/rate-limiting';
const factory = createRateLimitFactory(redisClient);
const rateLimiter = factory.createStore('sliding-window');
const result = await rateLimiter.hit('user:123', 100, 60000);
```

### From Express Rate Limit

```typescript
// Before
import rateLimit from 'express-rate-limit';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// After
import { createExpressRateLimitMiddleware } from '@Chanuka/core/rate-limiting';
app.use(createExpressRateLimitMiddleware({
  store: redisStore,
  limit: 100,
  windowMs: 15 * 60 * 1000
}));
```

### From Custom Rate Limiters

```typescript
// Before
class CustomRateLimiter {
  async check(key: string): Promise<boolean> {
    // Custom logic
  }
}

// After
import { RateLimitStore } from '@Chanuka/core/rate-limiting';

class CustomRateLimiter implements RateLimitStore {
  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    // Implement unified interface
  }
}
```

## Testing

```bash
# Run rate limiting tests
npm test -- src/rate-limiting

# Run algorithm tests
npm test -- src/rate-limiting/algorithms

# Run adapter tests
npm test -- src/rate-limiting/adapters

# Run middleware tests
npm test -- src/rate-limiting/middleware

# Run AI rate limiter tests
npm test -- src/rate-limiting/ai-rate-limiter.test.ts
```

## Performance Considerations

- **Memory Usage**: Sliding window uses more memory than fixed window
- **Redis Performance**: Network latency affects Redis-based rate limiting
- **Algorithm Choice**: Fixed window fastest, token bucket most flexible
- **Storage Selection**: Memory for single-instance, Redis for distributed
- **Metrics Overhead**: Disable metrics in high-throughput scenarios if needed

## Best Practices

1. **Choose Appropriate Algorithm**: Match algorithm to your use case
2. **Use Redis for Production**: Distributed storage for multi-instance deployments
3. **Set Reasonable Limits**: Balance protection with user experience
4. **Monitor Usage**: Track rate limit effectiveness and adjust as needed
5. **Handle Bursts**: Allow reasonable burst capacity for better UX
6. **Use Different Limits**: Apply different limits for different user tiers
7. **Test Rate Limits**: Include rate limiting in your test suites
8. **Plan for Scale**: Design rate limiting to handle increased load

## Security Considerations

- **IP-Based Limiting**: Prevent abuse from single IP addresses
- **User-Based Limiting**: Apply limits per authenticated user
- **API Key Limiting**: Rate limit by API key for programmatic access
- **Geographic Limiting**: Different limits for different regions
- **Bot Protection**: Combine with other anti-abuse measures
- **Audit Logging**: Log rate limit violations for analysis
- **Gradual Backoff**: Prevent rapid retry attempts

## Integration Examples

### With Authentication

```typescript
app.use('/api', (req, res, next) => {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  // Apply user-specific or IP-based rate limiting
  rateLimiter.hit(key, userLimit, windowMs).then(result => {
    if (result.allowed) {
      next();
    } else {
      res.status(429).json({ error: 'Too many requests' });
    }
  });
});
```

### With API Gateway

```typescript
// Rate limit by API key
app.use('/api', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const result = await rateLimiter.hit(`apikey:${apiKey}`, 1000, 60000);
  if (result.allowed) {
    next();
  } else {
    res.set('Retry-After', Math.ceil(result.retryAfter / 1000));
    res.status(429).json({ error: 'API rate limit exceeded' });
  }
});
```

### With GraphQL

```typescript
import { createRateLimitRule } from '@Chanuka/core/rate-limiting';

const rateLimitRule = createRateLimitRule({
  store: redisStore,
  limit: 100,
  windowMs: 60000,
  keyGenerator: (context) => context.user?.id || context.ip
});

// Apply to GraphQL operations
const schema = applyRateLimitRule(schema, rateLimitRule);