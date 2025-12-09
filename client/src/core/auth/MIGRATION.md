# Authentication System Migration Guide

## Overview

This guide helps you migrate from the fragmented authentication implementations to the new consolidated auth system.

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
// Old fragmented imports
import { useAuth } from '@/features/users/hooks/useAuth';
import { tokenManager } from '@/utils/storage';
import { authService } from '@/services/auth-service-init';
import { authMiddleware } from '@/store/middleware/authMiddleware';
import { authSlice } from '@/store/slices/authSlice';
```

**After:**
```typescript
// New consolidated imports
import { 
  useAuth, 
  tokenManager, 
  authApiService, 
  authMiddleware, 
  authReducer 
} from '@/core/auth';
```

### 2. Initialize the System

Add this to your app initialization:

```typescript
import { initializeAuth } from '@/core/auth';
import { globalApiClient } from '@/core/api';

await initializeAuth({
  apiClient: globalApiClient,
  enableAutoInit: true,
});
```

### 3. Update Redux Store

```typescript
import { authReducer, authMiddleware } from '@/core/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer, // Was: authSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware),
});
```

## Breaking Changes

- `authSlice.reducer` → `authReducer`
- `authService` → `authApiService.instance`
- Some method signatures have been standardized

## Benefits

- Single source of truth for all auth functionality
- Improved type safety and error handling
- Better performance and smaller bundle size
- Comprehensive documentation and testing