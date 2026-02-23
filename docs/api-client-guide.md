# API Client Usage Guide

## Overview

This guide documents the standard API client patterns used in the application. After consolidation, we have two primary API clients:

- **`globalApiClient`** - The standard HTTP client for all API calls
- **`contractApiClient`** - Type-safe wrapper for contract-based API calls

## Standard API Client: `globalApiClient`

The `globalApiClient` is the canonical implementation for making HTTP requests. It provides comprehensive features including retry logic, caching, circuit breaker protection, and error handling.

### Basic Usage

```typescript
import { globalApiClient } from '@client/infrastructure/api';

// GET request
const response = await globalApiClient.get('/api/bills');

// POST request
const createResponse = await globalApiClient.post('/api/bills', {
  title: 'New Bill',
  description: 'Bill description'
});

// PUT request
const updateResponse = await globalApiClient.put('/api/bills/123', {
  title: 'Updated Bill'
});

// PATCH request
const patchResponse = await globalApiClient.patch('/api/bills/123', {
  status: 'active'
});

// DELETE request
const deleteResponse = await globalApiClient.delete('/api/bills/123');
```

### Advanced Features

#### Request Options

```typescript
import { globalApiClient } from '@client/infrastructure/api';

const response = await globalApiClient.get('/api/bills', {
  // Query parameters
  params: {
    page: 1,
    limit: 20,
    status: 'active'
  },
  
  // Custom headers
  headers: {
    'X-Custom-Header': 'value'
  },
  
  // Request timeout (milliseconds)
  timeout: 5000,
  
  // Skip cache for this request
  skipCache: true,
  
  // Custom cache TTL (milliseconds)
  cacheTTL: 60000,
  
  // Fallback data if request fails
  fallbackData: [],
  
  // Custom retry configuration
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
});
```

#### Caching

GET requests are automatically cached by default. Cache behavior can be controlled:

```typescript
// Use cached response if available
const response = await globalApiClient.get('/api/bills');

// Skip cache and fetch fresh data
const freshResponse = await globalApiClient.get('/api/bills', {
  skipCache: true
});

// Custom cache TTL (30 seconds)
const customCacheResponse = await globalApiClient.get('/api/bills', {
  cacheTTL: 30000
});
```

#### Retry Logic

The client automatically retries failed requests with exponential backoff:

- Retries network errors and 5xx server errors
- Does not retry 4xx client errors (except 408 timeout and 429 rate limit)
- Uses exponential backoff with jitter to prevent thundering herd

```typescript
// Custom retry configuration
const response = await globalApiClient.get('/api/bills', {
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffMultiplier: 2,
    retryCondition: (error, attempt) => {
      // Custom retry logic
      return error.message.includes('timeout') && attempt < 3;
    },
    onRetry: (error, attempt, delayMs) => {
      console.log(`Retry attempt ${attempt + 1} after ${delayMs}ms`);
    }
  }
});
```

#### Circuit Breaker

The client includes built-in circuit breaker protection to prevent cascading failures:

- Opens after 5 consecutive failures
- Enters half-open state after 60 seconds
- Closes after 3 consecutive successes in half-open state

```typescript
// Check circuit breaker health
const health = globalApiClient.getHealthStatus();
console.log('Circuit breaker state:', health.circuitBreakerState);
console.log('Active requests:', health.activeRequests);
console.log('Total requests:', health.totalRequests);
```

#### Fallback Data

Provide fallback data to use when requests fail:

```typescript
const response = await globalApiClient.get('/api/bills', {
  fallbackData: []
});

// If request fails, response.data will be []
// response.fromFallback will be true
```

#### Interceptors

Add custom request and response interceptors:

```typescript
import { globalApiClient } from '@client/infrastructure/api';

// Request interceptor (e.g., add authentication)
globalApiClient.addRequestInterceptor(async (request) => {
  const token = getAuthToken();
  return {
    ...request,
    headers: {
      ...request.headers,
      Authorization: `Bearer ${token}`
    }
  };
});

// Response interceptor (e.g., transform data)
globalApiClient.addResponseInterceptor(async (response) => {
  // Transform response data
  return {
    ...response,
    data: transformData(response.data)
  };
});
```

### Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  id: string;              // Unique response ID
  requestId: string;       // Original request ID
  status: number;          // HTTP status code
  statusText: string;      // HTTP status text
  headers: Record<string, string>;  // Response headers
  data: T;                 // Response data
  timestamp: string;       // ISO timestamp
  duration: number;        // Request duration (ms)
  cached: boolean;         // Whether response was cached
  fromFallback: boolean;   // Whether fallback data was used
}
```

## Type-Safe API Client: `contractApiClient`

The `contractApiClient` provides type-safe API calls using endpoint contracts defined in `@shared/types/api/contracts`.

### Basic Usage

```typescript
import { contractApiClient } from '@client/infrastructure/api';
import { GetBillsEndpoint } from '@shared/types/api/contracts';

// Type-safe API call with automatic validation
const result = await contractApiClient.call(GetBillsEndpoint, {
  page: 1,
  limit: 20
});

if (result.success) {
  // result.data is fully typed
  console.log('Bills:', result.data);
} else {
  // result.error contains validation or API errors
  console.error('Error:', result.error);
}
```

### With Path Parameters

```typescript
import { contractApiClient } from '@client/infrastructure/api';
import { GetBillEndpoint } from '@shared/types/api/contracts';

const result = await contractApiClient.callWithParams(
  GetBillEndpoint,
  { id: '123' },  // Path parameters
  {}              // Request body (optional)
);
```

### With Query Parameters

```typescript
import { contractApiClient } from '@client/infrastructure/api';
import { SearchBillsEndpoint } from '@shared/types/api/contracts';

const result = await contractApiClient.callWithQuery(
  SearchBillsEndpoint,
  { query: 'healthcare', status: 'active' }  // Query parameters
);
```

### With Both Path and Query Parameters

```typescript
import { contractApiClient } from '@client/infrastructure/api';
import { GetUserBillsEndpoint } from '@shared/types/api/contracts';

const result = await contractApiClient.callWithParamsAndQuery(
  GetUserBillsEndpoint,
  { userId: '456' },           // Path parameters
  { page: 1, limit: 10 },      // Query parameters
  {}                           // Request body (optional)
);
```

### Benefits of Contract-Based Calls

1. **Type Safety**: Full TypeScript type checking for requests and responses
2. **Validation**: Automatic client-side validation using Zod schemas
3. **Documentation**: Contracts serve as living API documentation
4. **Consistency**: Ensures client and server agree on API structure

### Result Format

```typescript
interface EndpointCallResult<T> {
  success: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  headers?: Record<string, string>;
}
```

## Circuit Breaker Monitoring

The `CircuitBreakerMonitor` provides observability into API health and error patterns.

### Basic Monitoring

```typescript
import { circuitBreakerMonitor } from '@client/infrastructure/api';

// Get service health status
const health = circuitBreakerMonitor.getServiceHealth();
console.log('Service health:', health);

// Get monitoring status
const status = circuitBreakerMonitor.getMonitoringStatus();
console.log('Monitoring status:', status);

// Get circuit breaker statistics
const stats = circuitBreakerMonitor.getCircuitBreakerStatistics();
console.log('Circuit breaker stats:', stats);
```

### Event Listeners

```typescript
import { circuitBreakerMonitor } from '@client/infrastructure/api';

// Listen to all circuit breaker events
circuitBreakerMonitor.addEventListener('*', (event) => {
  console.log('Circuit breaker event:', event);
});

// Listen to specific service events
circuitBreakerMonitor.addEventListener('api-service', (event) => {
  if (event.state === 'open') {
    console.warn('API service circuit breaker opened!');
  }
});
```

### Error Correlation

Track related errors across multiple requests:

```typescript
import { circuitBreakerMonitor } from '@client/infrastructure/api';

// Get active error correlations
const activeErrors = circuitBreakerMonitor.getErrorCorrelations(false);

// Get resolved error correlations
const resolvedErrors = circuitBreakerMonitor.getErrorCorrelations(true);

// Manually resolve a correlation
circuitBreakerMonitor.resolveCorrelation('correlation-id-123');
```

## Authentication Integration

### Current Implementation

The `globalApiClient` includes inline authentication with automatic token refresh:

```typescript
// Authentication is handled automatically
// When a 401 response is received, the client attempts to refresh tokens
// and retry the request

const response = await globalApiClient.get('/api/protected-resource');
// If token is expired, it will be refreshed automatically
```

### Future Integration

The application includes a production-ready authentication interceptor implementation in `client/src/infrastructure/api/authentication.ts` that is available for future integration. This implementation provides:

- Integration with the `tokenManager` service
- Complete token refresh implementation
- Concurrent refresh attempt handling (prevents race conditions)
- Custom events for auth failures
- Proactive token refresh utilities

For details on the authentication consolidation analysis, see `.kiro/specs/codebase-consolidation/AUTHENTICATION_CONSOLIDATION_ANALYSIS.md`.

## Configuration

### Global Configuration

```typescript
import { globalApiClient } from '@client/infrastructure/api';

// Get current configuration
const config = globalApiClient.getConfig();

// Update base URL
globalApiClient.setBaseUrl('https://api.example.com');

// Update timeout
globalApiClient.setTimeout(10000);

// Full reconfiguration
globalApiClient.configure({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value'
  }
});
```

### Default Configuration

The client is initialized with these defaults:

```typescript
{
  baseUrl: process.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,  // 30 seconds
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  cache: {
    ttl: 300000  // 5 minutes
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
```

## Lifecycle Management

### Initialization

```typescript
import { globalApiClient } from '@client/infrastructure/api';

// Initialize the client (called automatically on import)
await globalApiClient.initialize();
```

### Cleanup

```typescript
import { globalApiClient } from '@client/infrastructure/api';

// Clean up resources (cancel active requests, clear interceptors)
await globalApiClient.cleanup();
```

## Migration Guide

### From Deleted Clients

The following API clients have been removed during consolidation:

- `BaseApiClient` - Use `globalApiClient` instead
- `AuthenticatedApiClient` - Use `globalApiClient` (authentication is built-in)
- `SafeApiClient` - Use `globalApiClient` with `fallbackData` option
- `CircuitBreakerClient` - Use `globalApiClient` (circuit breaker is built-in)

#### Migration Examples

**From SafeApiClient:**

```typescript
// Before (SafeApiClient)
const result = await safeApiClient.get('/api/bills');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// After (globalApiClient with fallback)
const response = await globalApiClient.get('/api/bills', {
  fallbackData: []
});
console.log(response.data);  // Will be [] if request fails
```

**From AuthenticatedApiClient:**

```typescript
// Before (AuthenticatedApiClient)
const client = new AuthenticatedApiClient(config);
const response = await client.get('/api/protected');

// After (globalApiClient - authentication is automatic)
const response = await globalApiClient.get('/api/protected');
```

**From CircuitBreakerClient:**

```typescript
// Before (CircuitBreakerClient)
const client = createCircuitBreakerClient('api-service', config);
const response = await client.get('/api/bills');

// After (globalApiClient - circuit breaker is built-in)
const response = await globalApiClient.get('/api/bills');

// Monitor circuit breaker state
const health = globalApiClient.getHealthStatus();
console.log('Circuit breaker state:', health.circuitBreakerState);
```

## Best Practices

### 1. Use `globalApiClient` for Standard API Calls

```typescript
// ✅ Good
import { globalApiClient } from '@client/infrastructure/api';
const response = await globalApiClient.get('/api/bills');

// ❌ Avoid creating new client instances
const client = new UnifiedApiClientImpl(config);
```

### 2. Use `contractApiClient` for Type-Safe Calls

```typescript
// ✅ Good - Type-safe with validation
import { contractApiClient } from '@client/infrastructure/api';
import { GetBillsEndpoint } from '@shared/types/api/contracts';
const result = await contractApiClient.call(GetBillsEndpoint, request);

// ❌ Avoid untyped calls when contracts exist
const response = await globalApiClient.get('/api/bills');
```

### 3. Provide Fallback Data for Critical UI

```typescript
// ✅ Good - UI won't break if API fails
const response = await globalApiClient.get('/api/bills', {
  fallbackData: []
});

// ❌ Avoid leaving UI in broken state
const response = await globalApiClient.get('/api/bills');
if (!response.data) {
  // UI breaks here
}
```

### 4. Use Appropriate Cache Settings

```typescript
// ✅ Good - Skip cache for real-time data
const response = await globalApiClient.get('/api/notifications', {
  skipCache: true
});

// ✅ Good - Use cache for static data
const response = await globalApiClient.get('/api/categories', {
  cacheTTL: 3600000  // 1 hour
});
```

### 5. Monitor Circuit Breaker Health

```typescript
// ✅ Good - Monitor and respond to circuit breaker state
import { circuitBreakerMonitor } from '@client/infrastructure/api';

circuitBreakerMonitor.addEventListener('api-service', (event) => {
  if (event.state === 'open') {
    // Show user-friendly error message
    showNotification('Service temporarily unavailable');
  }
});
```

### 6. Handle Errors Gracefully

```typescript
// ✅ Good - Handle errors with fallback
try {
  const response = await globalApiClient.get('/api/bills', {
    fallbackData: []
  });
  return response.data;
} catch (error) {
  logger.error('Failed to fetch bills', { error });
  return [];
}

// ❌ Avoid letting errors propagate unhandled
const response = await globalApiClient.get('/api/bills');
return response.data;  // Could be null if request failed
```

## Troubleshooting

### Request Timeouts

```typescript
// Increase timeout for slow endpoints
const response = await globalApiClient.get('/api/slow-endpoint', {
  timeout: 60000  // 60 seconds
});
```

### Circuit Breaker Opens Frequently

```typescript
// Check circuit breaker metrics
const health = globalApiClient.getHealthStatus();
console.log('Failure rate:', health.circuitBreakerMetrics.failureRate);

// Adjust circuit breaker thresholds (requires code change)
// See client/src/infrastructure/api/client.ts - CircuitBreaker constructor
```

### Cache Issues

```typescript
// Clear cache for specific endpoint
import { globalCache } from '@client/infrastructure/api/cache-manager';
await globalCache.clear();

// Skip cache for specific request
const response = await globalApiClient.get('/api/bills', {
  skipCache: true
});
```

### Authentication Issues

```typescript
// Check if auth service is available
const authService = (globalThis as any).authService;
if (!authService) {
  console.error('Auth service not initialized');
}

// Manually trigger token refresh
if (authService && authService.refreshTokens) {
  await authService.refreshTokens();
}
```

## Related Documentation

- [Authentication Consolidation Analysis](.kiro/specs/codebase-consolidation/AUTHENTICATION_CONSOLIDATION_ANALYSIS.md)
- [API Contracts](../shared/types/api/contracts/README.md)
- [Error Handling](../client/src/infrastructure/error/README.md)
- [Caching Strategy](../client/src/infrastructure/api/cache-manager.ts)

## Support

For questions or issues with the API client:

1. Check this guide for common patterns
2. Review the source code in `client/src/infrastructure/api/`
3. Check circuit breaker monitoring for service health issues
4. Consult the team's architecture documentation
