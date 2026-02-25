# Server Utilities

This directory contains server-side utility modules for the Chanuka platform.

## Core Utilities

### API Response Helpers (`api-response-helpers.ts`)
Standardized response utilities for Express endpoints.

**Usage:**
```typescript
import { sendSuccess, sendError, sendValidationError } from '@server/utils/api-response-helpers';

// Success response
sendSuccess(res, { id: 123, name: 'Bill' });

// Error response
sendError(res, 'Something went wrong', 500);

// Validation error
sendValidationError(res, { field: 'email', message: 'Invalid email' });
```

**Available Functions:**
- `sendSuccess(res, data, metadata?)` - 200 OK response
- `sendError(res, message, statusCode?, metadata?)` - Error response
- `sendValidationError(res, errors, metadata?)` - 400 validation error
- `sendNotFound(res, message?, metadata?)` - 404 not found
- `sendUnauthorized(res, message?, metadata?)` - 401 unauthorized
- `sendForbidden(res, message?, metadata?)` - 403 forbidden

**Error Classes:**
- `ApiError` - Base API error class
- `ApiValidationError` - Validation error with details
- `NotFoundError` - Resource not found
- `ValidationError` - Generic validation error
- `AuthenticationError` - Authentication failure
- `AuthorizationError` - Authorization failure

**Constants:**
- `ErrorCodes` - Standard error code constants
- `HttpStatus` - HTTP status code constants

### Legacy Adapter (`api-response.ts`)
**DEPRECATED** - Provides backward compatibility for old imports.

New code should import directly from `api-response-helpers.ts`.

## Architecture Notes

### Removed Temporary Stopgaps

The following temporary compatibility layers have been removed:

1. **`shared-core-fallback.ts`** - Removed in favor of proper infrastructure modules
   - Logger now imported from `@server/infrastructure/observability`
   - API responses from `@server/utils/api-response-helpers`
   - Performance tracking uses simple `Date.now()` instead of wrapper class

### Import Guidelines

**DO:**
```typescript
// Logger
import { logger } from '@server/infrastructure/observability';

// API Responses
import { sendSuccess, sendError } from '@server/utils/api-response-helpers';

// Shared utilities (truly shared between client/server)
import { formatDate, sanitizeString } from '@shared/core/utils';
```

**DON'T:**
```typescript
// ❌ Don't import logger from @shared/core (it doesn't exist there)
import { logger } from '@shared/core';

// ❌ Don't use deprecated api-response.ts
import { ApiResponse } from '@server/utils/api-response';

// ❌ Don't use fallback files
import { anything } from '@server/utils/shared-core-fallback';
```

### Shared vs Server Modules

**`@shared/core`** contains:
- ✅ Primitives (constants, enums, basic types)
- ✅ Types (auth types, feature flags)
- ✅ Utils (string, number, type-guards, security, regex, formatting)

**`@server/infrastructure`** contains:
- ✅ Observability (logging, error management, tracing, metrics)
- ✅ Database (connections, queries, transactions)
- ✅ Cache (Redis, in-memory caching)
- ✅ Configuration (environment, feature flags)

**`@server/utils`** contains:
- ✅ API response helpers
- ✅ Server-specific utilities
- ✅ Middleware helpers

## Migration Guide

If you're updating old code that used `shared-core-fallback.ts`:

### Before:
```typescript
import { logger } from '@server/utils/shared-core-fallback';
import { ApiResponse } from '@server/utils/shared-core-fallback';
import { Performance } from '@server/utils/shared-core-fallback';

const timer = Performance.startTimer('operation');
// ... do work
const duration = timer.end();
```

### After:
```typescript
import { logger } from '@server/infrastructure/observability';
import { sendSuccess } from '@server/utils/api-response-helpers';

const startTime = Date.now();
// ... do work
const duration = Date.now() - startTime;
```

## See Also

- [Server Infrastructure Documentation](../infrastructure/README.md)
- [Shared Core Documentation](../../shared/core/README.md)
- [Architecture Documentation](../../docs/ARCHITECTURE.md)
