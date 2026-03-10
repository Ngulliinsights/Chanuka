# Migration Guide: AuthenticatedApiClient → globalApiClient

## Overview

`AuthenticatedApiClient` is deprecated and will be removed in v2.0.0. This guide shows how to migrate to the modern `globalApiClient` with proper authentication interceptors.

## Why Migrate?

The `AuthenticatedApiClient` lacks critical features:
- ❌ No retry logic
- ❌ No caching
- ❌ No circuit breaker
- ❌ No token refresh
- ❌ No error handling
- ❌ Direct localStorage access (security concern)
- ❌ No request/response interceptors

The `globalApiClient` provides:
- ✅ Automatic retry with exponential backoff
- ✅ Response caching
- ✅ Circuit breaker for fault tolerance
- ✅ Automatic token refresh
- ✅ Comprehensive error handling
- ✅ Secure token management
- ✅ Request/response interceptors
- ✅ Request deduplication

## Migration Steps

### Step 1: Replace Imports

**Before:**
```typescript
import { AuthenticatedApiClient } from '@client/infrastructure/auth';

const client = new AuthenticatedApiClient();
```

**After:**
```typescript
import { globalApiClient, createAuthRequestInterceptor } from '@client/infrastructure/api';
import { getAuthToken } from '@client/infrastructure/auth';

// Set up auth interceptor once (typically in app initialization)
globalApiClient.addRequestInterceptor(
  createAuthRequestInterceptor(() => getAuthToken())
);
```

### Step 2: Update API Calls

**Before:**
```typescript
// GET request
const users = await client.get<User[]>('/api/users');

// POST request
const newUser = await client.post<User>('/api/users', userData);

// PUT request
const updated = await client.put<User>('/api/users/123', userData);

// DELETE request
await client.delete('/api/users/123');
```

**After:**
```typescript
// GET request
const users = await globalApiClient.get<User[]>('/api/users');

// POST request
const newUser = await globalApiClient.post<User>('/api/users', userData);

// PUT request
const updated = await globalApiClient.put<User>('/api/users/123', userData);

// DELETE request
await globalApiClient.delete('/api/users/123');
```

### Step 3: Handle Errors Properly

**Before:**
```typescript
try {
  const data = await client.get('/api/data');
} catch (error) {
  // Basic error handling
  console.error(error);
}
```

**After:**
```typescript
import { isApiError } from '@client/infrastructure/error';

try {
  const response = await globalApiClient.get('/api/data');
  const data = response.data;
} catch (error) {
  if (isApiError(error)) {
    // Handle API errors with proper typing
    console.error(`API Error: ${error.message}`, {
      code: error.code,
      status: error.status,
    });
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

### Step 4: Use Advanced Features

#### Caching
```typescript
// Cache GET requests automatically
const response = await globalApiClient.get('/api/data', {
  cache: true,
  cacheTTL: 60000, // 1 minute
});
```

#### Retry Logic
```typescript
// Automatic retry with exponential backoff
const response = await globalApiClient.post('/api/data', payload, {
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
});
```

#### Fallback Data
```typescript
// Provide fallback data if request fails
const response = await globalApiClient.get('/api/data', {
  fallbackData: { items: [] },
});
```

#### Request Cancellation
```typescript
const controller = new AbortController();

const response = await globalApiClient.get('/api/data', {
  signal: controller.signal,
});

// Cancel if needed
controller.abort();
```

## Complete Example

### Before (AuthenticatedApiClient)

```typescript
import { AuthenticatedApiClient } from '@client/infrastructure/auth';

export class UserService {
  private client = new AuthenticatedApiClient({
    baseURL: 'https://api.example.com',
    timeout: 5000,
  });

  async getUsers(): Promise<User[]> {
    try {
      return await this.client.get<User[]>('/api/users');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    return await this.client.post<User>('/api/users', userData);
  }
}
```

### After (globalApiClient)

```typescript
import { globalApiClient, createAuthRequestInterceptor } from '@client/infrastructure/api';
import { getAuthToken } from '@client/infrastructure/auth';
import { isApiError } from '@client/infrastructure/error';

// Initialize auth interceptor once (in app setup)
globalApiClient.addRequestInterceptor(
  createAuthRequestInterceptor(() => getAuthToken())
);

export class UserService {
  async getUsers(): Promise<User[]> {
    try {
      const response = await globalApiClient.get<User[]>('/api/users', {
        cache: true,
        cacheTTL: 60000, // Cache for 1 minute
      });
      return response.data;
    } catch (error) {
      if (isApiError(error)) {
        console.error('API Error:', {
          message: error.message,
          code: error.code,
          status: error.status,
        });
      }
      throw error;
    }
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const response = await globalApiClient.post<User>('/api/users', userData, {
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
      },
    });
    return response.data;
  }
}
```

## Type-Safe Alternative: Contract Client

For even better type safety, consider using the contract-based client:

```typescript
import { contractApiClient } from '@client/infrastructure/api';
import { userEndpoints } from '@shared/types/api/contracts';

// Fully type-safe with request/response validation
const result = await contractApiClient.call(
  userEndpoints.createUser,
  { name: 'John', email: 'john@example.com' }
);

if (result.success) {
  console.log('User created:', result.data);
} else {
  console.error('Validation error:', result.error);
}
```

## App Initialization Setup

Add this to your app initialization (e.g., `main.tsx` or `App.tsx`):

```typescript
import { globalApiClient, createAuthRequestInterceptor } from '@client/infrastructure/api';
import { getAuthToken } from '@client/infrastructure/auth';

// Set up authentication interceptor
globalApiClient.addRequestInterceptor(
  createAuthRequestInterceptor(() => getAuthToken())
);

// Optional: Add logging interceptor
globalApiClient.addResponseInterceptor(async (response) => {
  console.log('API Response:', {
    status: response.status,
    url: response.url,
  });
  return response;
});

// Optional: Configure base settings
globalApiClient.configure({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Testing

### Before
```typescript
// Hard to mock
const client = new AuthenticatedApiClient();
```

### After
```typescript
import { globalApiClient } from '@client/infrastructure/api';

// Easy to mock with interceptors
globalApiClient.addRequestInterceptor(async (request) => {
  // Mock logic
  return request;
});
```

## Timeline

- **Now**: `AuthenticatedApiClient` marked as deprecated
- **v1.x**: Both clients available (migration period)
- **v2.0.0**: `AuthenticatedApiClient` removed

## Need Help?

- Check the [API Client Documentation](../api/README.md)
- See [Contract Client Guide](../api/contract-client.ts)
- Review [Error Handling Guide](../error/README.md)

## Checklist

- [ ] Replace all `AuthenticatedApiClient` imports
- [ ] Set up auth interceptor in app initialization
- [ ] Update all API calls to use `globalApiClient`
- [ ] Add proper error handling
- [ ] Test authentication flow
- [ ] Test token refresh
- [ ] Remove `AuthenticatedApiClient` instances
- [ ] Update tests
