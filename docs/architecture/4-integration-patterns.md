# Level 4: Integration Patterns

**Overview:** Patterns for safely and reliably integrating with external APIs, services, and systems

---

## Integration Architecture

```
Chanuka Application
    ↓
Integration Service Layer
    ├─ Abstraction layer
    ├─ Error handling
    ├─ Retry logic
    ├─ Rate limiting
    └─ Caching
    ↓
External Service
    └─ Third-party API / Service
```

---

## 1. Basic Integration Pattern

### Service Wrapper

```typescript
// server/integrations/legislative-api.ts
import axios, { AxiosError } from 'axios';
import { z } from 'zod';

const LegislativeDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  // ... other fields
});

type LegislativeData = z.infer<typeof LegislativeDataSchema>;

export class LegislativeApiClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async getBillData(billId: string): Promise<LegislativeData> {
    try {
      const url = `${this.baseUrl}/bills/${billId}`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000, // 5 second timeout
      });
      
      // Validate response matches schema
      const validated = LegislativeDataSchema.parse(response.data);
      return validated;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      if (status === 404) {
        return new NotFoundError('Bill not found in legislative API');
      }
      
      if (status === 401 || status === 403) {
        return new UnauthorizedError('Invalid API credentials');
      }
      
      if (status && status >= 500) {
        return new ExternalServiceError(
          `Legislative API error: ${status}`,
          'LEGISLATIVE_API_ERROR',
          { retryable: true }
        );
      }
    }
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new ExternalServiceError(
          'Legislative API request timed out',
          'LEGISLATIVE_API_TIMEOUT',
          { retryable: true }
        );
      }
    }
    
    return new ExternalServiceError(
      'Unknown error calling legislative API',
      'LEGISLATIVE_API_UNKNOWN',
      { retryable: false }
    );
  }
}

// Custom error types
export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata: { retryable: boolean }
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}
```

**Pattern:**
- Wrap external service in a typed client
- Validate all responses with schemas
- Convert external errors to app-specific errors
- Mark errors as retryable or not based on cause

---

## 2. Retry & Resilience

### Exponential Backoff Retry

```typescript
// server/integrations/retry-strategy.ts
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger: Logger
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if not retryable
      if (error instanceof ExternalServiceError && !error.metadata.retryable) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        throw error;
      }
      
      // Calculate backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      logger.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms`,
        { error: lastError.message }
      );
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// Usage
const client = new LegislativeApiClient(apiUrl, apiKey);

const billData = await withRetry(
  () => client.getBillData(billId),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },
  logger
);
```

### Circuit Breaker Pattern

```typescript
// server/integrations/circuit-breaker.ts
export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half-open', // Testing if recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  
  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000, // 1 minute
    private successThreshold: number = 2,
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if should transition to half-open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
      
      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker(
  5,      // Open after 5 failures
  60000,  // Reset after 1 minute
  2       // Close after 2 successes in half-open
);

const billData = await breaker.execute(
  () => withRetry(
    () => client.getBillData(billId),
    config,
    logger
  )
);
```

**Pattern:**
- Retry with exponential backoff for transient failures
- Circuit breaker stops hammering failed services
- Track which errors are retryable vs permanent
- Configure thresholds based on service SLA

---

## 3. Rate Limiting

### Token Bucket Rate Limiter

```typescript
// server/integrations/rate-limiter.ts
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  
  constructor(
    private readonly capacity: number,       // Max tokens
    private readonly refillRatePerSecond: number, // Tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }
  
  async acquire(tokensNeeded: number = 1): Promise<void> {
    // Refill tokens based on elapsed time
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    
    this.tokens = Math.min(
      this.capacity,
      this.tokens + tokensToAdd
    );
    this.lastRefillTime = now;
    
    // If not enough tokens, wait
    if (this.tokens < tokensNeeded) {
      const tokensNeeded = tokensNeeded - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRatePerSecond) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      
      // Recursive call after wait
      return this.acquire(tokensNeeded);
    }
    
    this.tokens -= tokensNeeded;
  }
}

// Usage: 100 requests per minute
const limiter = new RateLimiter(
  100,        // Capacity
  100 / 60,   // 100/minute = 1.67/second
);

await limiter.acquire(); // Wait if needed
const billData = await client.getBillData(billId);
```

---

## 4. Caching External Data

### Cache-Aside Pattern

```typescript
// server/integrations/cached-legislative-api.ts
import { Redis } from 'redis';

export class CachedLegislativeApiClient {
  constructor(
    private client: LegislativeApiClient,
    private cache: Redis,
    private ttlSeconds: number = 3600, // 1 hour
  ) {}
  
  async getBillData(billId: string): Promise<LegislativeData> {
    const cacheKey = `legislative:bill:${billId}`;
    
    // 1. Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as LegislativeData;
    }
    
    // 2. Fall back to API
    const data = await this.client.getBillData(billId);
    
    // 3. Store in cache
    await this.cache.setex(
      cacheKey,
      this.ttlSeconds,
      JSON.stringify(data)
    );
    
    return data;
  }
  
  // Manually invalidate cache when updated
  async invalidateBillData(billId: string): Promise<void> {
    const cacheKey = `legislative:bill:${billId}`;
    await this.cache.del(cacheKey);
  }
}

// Usage
const cachedClient = new CachedLegislativeApiClient(
  client,
  redisClient,
  3600 // 1 hour TTL
);

const billData = await cachedClient.getBillData(billId);
```

**Pattern:**
- Cache external data with appropriate TTL
- Invalidate cache when data is updated
- Don't trust stale external data for critical operations

---

## 5. Async Integration with Webhooks

### Webhook Receiver

```typescript
// server/routes/webhooks.ts
import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '@server/utils/crypto';
import { queues } from '@server/jobs/queues';

const router = Router();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

// POST /webhooks/legislative
router.post('/legislative', async (req: Request, res: Response) => {
  // 1. Verify signature (important for security)
  const signature = req.headers['x-webhook-signature'] as string;
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Queue async job
  try {
    await queues.legislativeUpdates.add('process-bill-update', {
      billId: req.body.billId,
      updateType: req.body.type,
      data: req.body.data,
      timestamp: Date.now(),
    });
    
    // 3. Return immediately (webhook shouldn't wait)
    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    logger.error('Failed to queue webhook', { error });
    res.status(500).json({ error: 'Failed to process' });
  }
});

export default router;
```

### Job Handler

```typescript
// server/jobs/handlers/legislative-updates.ts
import { Job } from 'bull';
import { db } from '@server/db';
import { bills } from '@shared/db/schema';

export async function handleBillUpdate(
  job: Job<{
    billId: string;
    updateType: string;
    data: any;
  }>
): Promise<void> {
  const { billId, updateType, data } = job.data;
  
  try {
    logger.info('Processing bill webhook', { billId, updateType });
    
    // Process update based on type
    if (updateType === 'status-change') {
      await db
        .update(bills)
        .set({ 
          status: data.newStatus,
          updated_at: new Date(),
        })
        .where(eq(bills.id, parseInt(billId)));
      
      // Notify clients via WebSocket
      notifyClients(`bill:${billId}:updated`, {
        billId,
        status: data.newStatus,
      });
    }
    
    // Mark job as complete
    logger.info('Bill update processed', { billId });
  } catch (error) {
    logger.error('Failed to process bill update', { billId, error });
    throw error; // Trigger retry
  }
}
```

**Pattern:**
- Webhooks return immediately
- Queue jobs for processing
- Use retries for failed jobs
- Notify clients when complete

---

## 6. Error Handling across Integrations

### Integration Error Types

```typescript
// server/utils/integration-errors.ts
export class IntegrationError extends AppError {
  constructor(
    message: string,
    code: string,
    public serviceName: string,
    public retriable: boolean,
  ) {
    super(message, retriable ? 503 : 400, code);
    this.name = 'IntegrationError';
  }
}

export class RateLimitedError extends IntegrationError {
  constructor(
    serviceName: string,
    public retryAfterSeconds: number,
  ) {
    super(
      `Rate limited by ${serviceName}`,
      'RATE_LIMITED',
      serviceName,
      true // Always retriable
    );
  }
}

export class IntegrationTimeoutError extends IntegrationError {
  constructor(serviceName: string) {
    super(
      `${serviceName} request timed out`,
      'TIMEOUT',
      serviceName,
      true // Retriable
    );
  }
}
```

### Error Handling Middleware

```typescript
// server/middleware/integration-error-handler.ts
export const integrationErrorHandler: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  next
) => {
  if (!(err instanceof IntegrationError)) {
    return next(err);
  }
  
  const status = err.retriable ? 503 : 400; // 503 = Service Unavailable
  
  res.status(status).json({
    error: {
      message: err.message,
      code: err.code,
      service: err.serviceName,
      retryable: err.retriable,
      retryAfter: 'retryAfterSeconds' in err ? err.retryAfterSeconds : undefined,
    },
  });
};
```

**Pattern:**
- Integration errors are distinct from app errors
- Retriable errors return 503 (try again later)
- Non-retriable return 400 (check your request)
- Include retry guidance in response

---

## 7. Testing Integrations

### Mock Integration Client

```typescript
// __tests__/mocks/legislative-api.mock.ts
import { vi } from 'vitest';
import { LegislativeApiClient } from '@server/integrations/legislative-api';

export const mockLegislativeApiClient = {
  getBillData: vi.fn<[string], Promise<any>>(),
} as any as LegislativeApiClient;

export function setupMockBillData(billId: string, data: any) {
  mockLegislativeApiClient.getBillData.mockResolvedValueOnce(data);
}

export function setupMockError(error: Error) {
  mockLegislativeApiClient.getBillData.mockRejectedValueOnce(error);
}
```

### Integration Tests

```typescript
// __tests__/integrations/legislative-api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegislativeApiClient } from '@server/integrations/legislative-api';

describe('LegislativeApiClient', () => {
  let client: LegislativeApiClient;
  
  beforeEach(() => {
    client = new LegislativeApiClient('http://fake.api', 'fake-key');
  });
  
  it('should fetch bill data', async () => {
    // Mock axios
    vi.mock('axios');
    // ... setup mock response
    
    const data = await client.getBillData('bill-123');
    expect(data.id).toBe('bill-123');
  });
  
  it('should retry on transient errors', async () => {
    // Setup mock to fail 2 times, succeed 3rd time
    // ... verify retry logic
  });
  
  it('should handle rate limiting', async () => {
    // Setup mock 429 response
    // ... expect RateLimitedError
  });
});
```

---

## Async Integration Checklist

- [ ] Service client created with typed responses
- [ ] Response validation with Zod schemas
- [ ] Error handling with custom error types
- [ ] Retry strategy with exponential backoff
- [ ] Rate limiting implemented
- [ ] Caching strategy defined
- [ ] Circuit breaker for failure protection
- [ ] Webhook verification implemented
- [ ] Async job queue configured
- [ ] Error monitoring/logging
- [ ] Integration tests covering happy + error paths
- [ ] Load testing for rate limits

---

## Related Documentation

- **[../guides/API_CONTRACTS.md](../guides/API_CONTRACTS.md)** - API specification standards
- **[../adr/ADR-022-api-integration-standardization.md](../adr/ADR-022-api-integration-standardization.md)** - Integration standards
- **[../infrastructure/](../infrastructure/)** - External service configuration
