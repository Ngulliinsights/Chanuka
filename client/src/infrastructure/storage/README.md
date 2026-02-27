# Storage Infrastructure Module

## Overview

The Storage Infrastructure module provides comprehensive storage functionality including secure encrypted storage, session management, token handling, and intelligent caching with eviction policies.

## Purpose and Responsibilities

- **Secure Storage**: Encrypted storage with AES-GCM
- **Session Management**: Session lifecycle and validation
- **Token Management**: Token storage with automatic refresh
- **Cache Management**: Intelligent caching with TTL and eviction
- **Cross-Storage Support**: Support for localStorage, sessionStorage, and IndexedDB

## Public Exports

### Classes
- `SecureStorage` - Encrypted storage manager
- `SessionManager` - Session lifecycle management
- `TokenManager` - Token storage and refresh
- `CacheStorageManager` - Cache management with eviction

### Functions
- `storeSecurely()` - Store data with encryption
- `retrieveSecurely()` - Retrieve encrypted data
- `getCurrentSession()` - Get current session
- `isAuthenticated()` - Check authentication status
- `getAuthToken()` - Get authentication token
- `getRefreshToken()` - Get refresh token
- `isTokenValid()` - Check token validity
- `cacheData()` - Cache data with TTL
- `getCachedData()` - Retrieve cached data
- `clearCache()` - Clear cache
- `clearSession()` - Clear session
- `clearTokens()` - Clear tokens
- `clearAllStorage()` - Clear all storage
- `getStorageStats()` - Get storage statistics

## Usage Examples

### Secure Storage

```typescript
import { storeSecurely, retrieveSecurely } from '@/infrastructure/storage';

// Store sensitive data
await storeSecurely('user-preferences', preferences, {
  encrypt: true,
  ttl: 3600 // 1 hour
});

// Retrieve data
const prefs = await retrieveSecurely('user-preferences');
```

### Session Management

```typescript
import { getCurrentSession, isAuthenticated } from '@/infrastructure/storage';

if (isAuthenticated()) {
  const session = getCurrentSession();
  console.log(`User: ${session.userId}`);
  console.log(`Expires: ${session.expiresAt}`);
}
```

### Token Management

```typescript
import { getAuthToken, isTokenValid } from '@/infrastructure/storage';

const token = await getAuthToken();

if (await isTokenValid()) {
  // Use token for API requests
  api.setAuthToken(token);
} else {
  // Token expired, refresh needed
  await refreshToken();
}
```

### Cache Management

```typescript
import { cacheData, getCachedData } from '@/infrastructure/storage';

// Cache API response
await cacheData('user-data', userData, 30); // 30 minutes TTL

// Retrieve from cache
const cached = await getCachedData('user-data');
if (cached) {
  return cached; // Use cached data
} else {
  // Fetch fresh data
  const fresh = await api.getUserData();
  await cacheData('user-data', fresh, 30);
  return fresh;
}
```

### Storage Statistics

```typescript
import { getStorageStats } from '@/infrastructure/storage';

const stats = await getStorageStats();
console.log('Secure storage:', stats.secure);
console.log('Cache stats:', stats.cache);
console.log('Session info:', stats.session);
console.log('Token metadata:', stats.tokens);
```

## Best Practices

1. **Encrypt Sensitive Data**: Always encrypt sensitive information
2. **Set Appropriate TTLs**: Use reasonable expiration times
3. **Clean Up**: Regularly clear expired data
4. **Monitor Size**: Track storage usage to avoid limits
5. **Handle Errors**: Gracefully handle storage quota errors
6. **Validate Data**: Validate data before storing and after retrieving

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md
- **Requirement 5.1**: All exports documented
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Auth Module](../auth/README.md) - Authentication integration
- [Cache Module](../cache/README.md) - Cache invalidation
- [Security Module](../security/README.md) - Encryption utilities
