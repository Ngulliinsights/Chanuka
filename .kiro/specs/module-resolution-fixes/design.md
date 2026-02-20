# Module Resolution Fixes - Design

## Architecture

### Module Structure
```
server/
├── features/
│   ├── community/
│   │   ├── community.ts (router)
│   │   ├── comment.ts (service)
│   │   └── comment-voting.ts (service)
│   └── users/
│       └── domain/
│           └── user-profile.ts
├── infrastructure/
│   ├── cache/
│   │   └── index.ts (exports cacheService, CACHE_TTL)
│   ├── observability/
│   │   └── index.ts (exports logger)
│   ├── database/
│   │   └── index.ts (exports database, withTransaction)
│   ├── error-handling/
│   │   └── index.ts (exports error factory functions)
│   └── schema/
│       └── index.ts (exports all tables)
└── middleware/
    ├── auth.ts (exports authenticateToken)
    └── error-management.ts (exports asyncHandler)

shared/
├── constants/
│   └── error-codes.ts (exports ERROR_CODES)
└── core/
    └── index.ts (exports ErrorDomain, ErrorSeverity)
```

### Import Patterns

#### Error Handling Pattern
```typescript
// OLD (incorrect)
import { BaseError, ValidationError } from '@server/infrastructure/error-handling';
import { ERROR_CODES } from '@shared/core';

// NEW (correct)
import { createValidationError, createNotFoundError } from '@server/infrastructure/error-handling';
import { ERROR_CODES } from '@shared/constants/error-codes';
import { ErrorDomain, ErrorSeverity } from '@shared/core';
```

#### Service Import Pattern
```typescript
// OLD (incorrect)
import { commentService, commentVotingService } from '@server/features/community/comment-voting';

// NEW (correct)
import { commentService } from './comment';
import { commentVotingService } from './comment-voting';
```

#### Middleware Import Pattern
```typescript
// OLD (incorrect)
import { asyncHandler } from '@/middleware/error-management';

// NEW (correct)
import { asyncHandler } from '@server/middleware/error-management';
```

## Implementation Plan

### Phase 1: Fix Import Statements
1. Update community.ts imports
2. Update comment.ts imports (if needed)
3. Update comment-voting.ts imports (if needed)
4. Update user-profile.ts imports

### Phase 2: Replace Error Classes with Factory Functions
1. Replace `new ValidationError()` with `createValidationError()`
2. Replace `new BaseError()` with appropriate factory function
3. Update error throwing patterns

### Phase 3: Fix Type Annotations
1. Add Request type imports from express
2. Add proper type annotations for req parameters
3. Fix implicit any types

### Phase 4: Remove Non-Existent Imports
1. Remove `createErrorContext` import (doesn't exist)
2. Remove `contentModerationService` import (deprecated)
3. Remove any other non-existent imports

## Error Handling Strategy

### Error Factory Functions
Use these factory functions instead of classes:
- `createValidationError()` - for validation errors
- `createNotFoundError()` - for 404 errors
- `createAuthenticationError()` - for auth errors
- `createAuthorizationError()` - for permission errors
- `createDatabaseError()` - for database errors
- `createSystemError()` - for system errors

### Error Response Pattern
```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed', { context }, error);
  throw createSystemError(
    error as Error,
    { component: 'feature-name' }
  );
}
```

## Testing Strategy
- Run TypeScript compiler after each fix
- Verify no module resolution errors
- Check that all imports resolve correctly
- Ensure no runtime errors

## Rollback Plan
- Git commit after each successful phase
- Can revert individual files if needed
- Keep backup of original files
