# Error Handling Migration Guide

**Status:** Active Migration  
**Target Completion:** Week 5  
**Current Phase:** Phase 2A - Infrastructure Consolidation

---

## Quick Reference

### ❌ Deprecated (DO NOT USE)

```typescript
// Class-based errors (REMOVED)
import { ValidationError, DatabaseError } from '@server/infrastructure/errors/error-types';
throw new ValidationError([{ field: 'email', message: 'Invalid' }]);

// Legacy utility errors (DEPRECATED)
import { BaseError, AuthError } from '@server/utils/errors';
throw new BaseError('Something failed', { statusCode: 500 });

// Boom middleware (DEPRECATED)
import { boomErrorMiddleware } from '@server/middleware/boom-error-middleware';
app.use(boomErrorMiddleware);
```

### ✅ Modern Approach (USE THIS)

```typescript
// Error factory functions
import { createValidationError, createDatabaseError, safeAsync } from '@server/infrastructure/error-handling';

// Service methods return AsyncServiceResult
async getBill(id: string): Promise<AsyncServiceResult<Bill>> {
  return safeAsync(async () => {
    const bill = await db.query(...);
    return bill;
  }, {
    service: 'BillService',
    operation: 'getBill',
    metadata: { billId: id }
  });
}

// Unified error middleware
import { createUnifiedErrorMiddleware } from '@server/middleware/error-management';
app.use(createUnifiedErrorMiddleware());
```

---

## Migration Patterns

### Pattern 1: Service Method Migration

**Before:**
```typescript
async getUser(id: string): Promise<User | null> {
  try {
    const user = await db.select().from(users).where(eq(users.id, id));
    return user[0] || null;
  } catch (error) {
    logger.error({ error }, 'Failed to get user');
    throw error;
  }
}
```

**After:**
```typescript
import { safeAsync, type AsyncServiceResult } from '@server/infrastructure/error-handling';

async getUser(id: string): Promise<AsyncServiceResult<User | null>> {
  return safeAsync(async () => {
    const user = await db.select().from(users).where(eq(users.id, id));
    return user[0] || null;
  }, {
    service: 'UserService',
    operation: 'getUser',
    metadata: { userId: id }
  });
}
```

### Pattern 2: Error Creation

**Before:**
```typescript
import { BaseError } from '@server/utils/errors';
import { ERROR_CODES } from '@shared/constants';

throw new BaseError('User not found', {
  statusCode: 404,
  code: ERROR_CODES.NOT_FOUND
});
```

**After:**
```typescript
import { createNotFoundError } from '@server/infrastructure/error-handling';

return err(createNotFoundError(
  'User',
  userId,
  {
    service: 'UserService',
    operation: 'getUser'
  }
));
```

### Pattern 3: Controller Handler

**Before:**
```typescript
router.get('/users/:id', async (req, res) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error({ error }, 'Failed to get user');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
```

**After:**
```typescript
import { asyncHandler } from '@server/middleware/error-management';
import { boomFromStandardized } from '@server/infrastructure/error-handling';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const result = await userService.getUser(req.params.id);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json({ success: true, data: result.value });
}));
```

### Pattern 4: Validation Errors

**Before:**
```typescript
import { ValidationError } from '@server/infrastructure/errors/error-types';

if (!email) {
  throw new ValidationError([
    { field: 'email', message: 'Email is required' }
  ]);
}
```

**After:**
```typescript
import { createValidationError } from '@server/infrastructure/error-handling';

if (!email) {
  return err(createValidationError(
    [{ field: 'email', message: 'Email is required' }],
    {
      service: 'UserService',
      operation: 'createUser'
    }
  ));
}
```

### Pattern 5: Error Context

**Before:**
```typescript
// Scattered implementations
function createErrorContext(req: Request, endpoint: string) {
  return {
    endpoint,
    method: req.method,
    path: req.path,
  };
}
```

**After:**
```typescript
import { createErrorContext } from '@server/utils/createErrorContext';

const context = createErrorContext(req, 'GET /api/users/:id', {
  customField: 'value'
});
```

---

## Migration Checklist

### Per-Service Checklist

- [ ] Replace `try-catch` with `safeAsync()`
- [ ] Return `AsyncServiceResult<T>` from all methods
- [ ] Use error factory functions (no `throw new Error()`)
- [ ] Add error context (service, operation, metadata)
- [ ] Remove custom error classes
- [ ] Update tests to handle Result types
- [ ] Add structured logging
- [ ] Update API documentation

### Per-Controller Checklist

- [ ] Use `asyncHandler()` wrapper
- [ ] Handle `AsyncServiceResult` from services
- [ ] Convert errors to Boom with `boomFromStandardized()`
- [ ] Remove try-catch blocks
- [ ] Update response handling

---

## Common Pitfalls

### ❌ Don't: Mix patterns

```typescript
// BAD: Mixing try-catch with Result types
async getUser(id: string): Promise<AsyncServiceResult<User>> {
  try {
    return safeAsync(async () => {
      // ...
    }, context);
  } catch (error) {
    // This catch is redundant!
  }
}
```

### ✅ Do: Use Result types consistently

```typescript
// GOOD: Pure Result type handling
async getUser(id: string): Promise<AsyncServiceResult<User>> {
  return safeAsync(async () => {
    // All errors are caught by safeAsync
    const user = await db.query(...);
    return user;
  }, context);
}
```

### ❌ Don't: Throw errors in service layer

```typescript
// BAD: Throwing breaks Result type contract
async getUser(id: string): Promise<AsyncServiceResult<User>> {
  return safeAsync(async () => {
    if (!id) {
      throw new Error('ID required'); // BAD!
    }
    // ...
  }, context);
}
```

### ✅ Do: Return errors via Result type

```typescript
// GOOD: Return errors through Result type
async getUser(id: string): Promise<AsyncServiceResult<User>> {
  if (!id) {
    return err(createValidationError(
      [{ field: 'id', message: 'ID is required' }],
      context
    ));
  }
  
  return safeAsync(async () => {
    // ...
  }, context);
}
```

---

## Testing

### Unit Test Pattern

```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should return error for invalid ID', async () => {
    const result = await userService.getUser('invalid');
    
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.category).toBe(ErrorCategory.VALIDATION);
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });
  
  it('should return user for valid ID', async () => {
    const result = await userService.getUser('valid-id');
    
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeDefined();
      expect(result.value.id).toBe('valid-id');
    }
  });
});
```

---

## Support

**Questions?** Check the [Error Handling Consolidation Audit](./ERROR_HANDLING_CONSOLIDATION_AUDIT.md)

**Issues?** File a ticket with label `error-handling-migration`

**Need Help?** Ping #infrastructure-modernization channel
