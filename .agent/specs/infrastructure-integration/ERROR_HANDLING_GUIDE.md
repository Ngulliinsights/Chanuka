# Error Handling Guide

**Version:** 1.0  
**Date:** February 28, 2026  
**Status:** Complete

---

## Overview

This guide documents the error handling patterns used across the infrastructure integration project. All features use a consistent Result type pattern with the `AsyncServiceResult<T>` type and `safeAsync` wrapper function.

---

## Core Concepts

### Result Type Pattern

The codebase uses `AsyncServiceResult<T>` which wraps operations in a Result type that can represent either success or failure:

```typescript
type AsyncServiceResult<T> = Promise<Result<T, Error>>;
```

This pattern provides:
- **Type-safe error handling** - Errors are part of the type system
- **Explicit error handling** - Callers must handle both success and failure cases
- **Error context** - Errors include contextual information
- **Consistent API** - All service methods use the same pattern

---

## Using safeAsync

### Basic Usage

```typescript
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';

async function getUserById(id: string): AsyncServiceResult<User | null> {
  return safeAsync(async () => {
    // Your logic here
    const user = await db.select().from(users).where(eq(users.id, id));
    return user;
  }, { 
    service: 'UserService', 
    operation: 'getUserById' 
  });
}
```

### With Error Context

```typescript
async function createBill(data: CreateBillInput): AsyncServiceResult<Bill> {
  return safeAsync(async () => {
    // Validation
    const validation = await validateData(CreateBillSchema, data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // Business logic
    const [bill] = await db.insert(bills).values(data).returning();
    
    return bill;
  }, { 
    service: 'BillService', 
    operation: 'createBill',
    context: { billTitle: data.title }
  });
}
```

---

## Error Handling Patterns

### Pattern 1: Validation Errors

```typescript
async function updateUser(id: string, updates: UpdateUserInput): AsyncServiceResult<User> {
  return safeAsync(async () => {
    // 1. Validate input
    const validation = await validateData(UpdateUserSchema, updates);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // 2. Execute update
    const [user] = await db
      .update(users)
      .set(validation.data)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }, { service: 'UserService', operation: 'updateUser' });
}
```

### Pattern 2: Not Found Errors

```typescript
async function getBillById(id: string): AsyncServiceResult<Bill | null> {
  return safeAsync(async () => {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, id))
      .limit(1);

    // Return null for not found (not an error)
    return bill || null;
  }, { service: 'BillService', operation: 'getBillById' });
}
```

### Pattern 3: Transaction Errors

```typescript
async function registerUser(data: RegisterUserInput): AsyncServiceResult<User> {
  return safeAsync(async () => {
    const user = await withTransaction(async () => {
      // Multi-step operation
      const [newUser] = await db.insert(users).values(userData).returning();
      await db.insert(user_profiles).values({ user_id: newUser.id, ...profileData });
      
      return newUser;
    });
    // Transaction automatically rolls back on error
    
    return user;
  }, { service: 'UserService', operation: 'registerUser' });
}
```

### Pattern 4: External Service Errors

```typescript
async function sendNotification(userId: string, message: string): AsyncServiceResult<boolean> {
  return safeAsync(async () => {
    try {
      await externalNotificationService.send(userId, message);
      return true;
    } catch (error) {
      // Log but don't throw - graceful degradation
      logger.error('Notification service failed', { error, userId });
      return false;
    }
  }, { service: 'NotificationService', operation: 'sendNotification' });
}
```

---

## Consuming Result Types

### Pattern 1: Unwrapping with Error Handling

```typescript
const result = await userService.getUserById(userId);

if (result.success) {
  const user = result.data;
  // Use user
} else {
  const error = result.error;
  logger.error('Failed to get user', { error });
  // Handle error
}
```

### Pattern 2: Early Return on Error

```typescript
const userResult = await userService.getUserById(userId);
if (!userResult.success) {
  return res.status(404).json({ error: 'User not found' });
}

const user = userResult.data;
// Continue with user
```

### Pattern 3: Chaining Operations

```typescript
const userResult = await userService.getUserById(userId);
if (!userResult.success) {
  return userResult; // Propagate error
}

const profileResult = await userService.getUserProfile(userResult.data.id);
if (!profileResult.success) {
  return profileResult; // Propagate error
}

return { user: userResult.data, profile: profileResult.data };
```

---

## Error Context Enrichment

### Adding Context to Errors

```typescript
async function processPayment(orderId: string, amount: number): AsyncServiceResult<Payment> {
  return safeAsync(async () => {
    // Business logic
    const payment = await createPayment(orderId, amount);
    return payment;
  }, { 
    service: 'PaymentService', 
    operation: 'processPayment',
    context: {
      orderId,
      amount,
      timestamp: new Date().toISOString()
    }
  });
}
```

### Context in Error Logs

When an error occurs, `safeAsync` automatically logs it with context:

```json
{
  "level": "error",
  "message": "Operation failed",
  "service": "PaymentService",
  "operation": "processPayment",
  "context": {
    "orderId": "order-123",
    "amount": 99.99,
    "timestamp": "2026-02-28T10:30:00Z"
  },
  "error": {
    "message": "Payment gateway timeout",
    "stack": "..."
  }
}
```

---

## Error Monitoring

### Automatic Logging

All errors caught by `safeAsync` are automatically logged with:
- Service name
- Operation name
- Error message and stack trace
- Custom context
- Timestamp

### Integration with Observability

```typescript
import { logger } from '@server/infrastructure/observability';

// Errors are automatically sent to your logging infrastructure
// No manual logging needed when using safeAsync
```

### Error Metrics

Track error rates by service and operation:

```typescript
// Errors are tagged with service and operation
// Use your monitoring dashboard to track:
// - Error rate by service
// - Error rate by operation
// - Error trends over time
```

---

## Best Practices

### ✅ DO: Use safeAsync for All Service Methods

```typescript
// Good
async function getUser(id: string): AsyncServiceResult<User> {
  return safeAsync(async () => {
    // Logic
  }, { service: 'UserService', operation: 'getUser' });
}
```

### ❌ DON'T: Throw Errors Outside safeAsync

```typescript
// Bad
async function getUser(id: string): Promise<User> {
  throw new Error('Not implemented'); // Uncaught error
}
```

### ✅ DO: Validate Input Before Processing

```typescript
// Good
return safeAsync(async () => {
  const validation = await validateData(schema, input);
  if (!validation.success) {
    throw new Error('Validation failed');
  }
  // Process validated data
}, { service, operation });
```

### ✅ DO: Return Null for Not Found (Not an Error)

```typescript
// Good
return safeAsync(async () => {
  const item = await db.select()...;
  return item || null; // null is valid, not an error
}, { service, operation });
```

### ❌ DON'T: Throw for Expected Conditions

```typescript
// Bad
return safeAsync(async () => {
  const item = await db.select()...;
  if (!item) {
    throw new Error('Not found'); // Don't throw for expected condition
  }
  return item;
}, { service, operation });
```

### ✅ DO: Add Context for Complex Operations

```typescript
// Good
return safeAsync(async () => {
  // Complex logic
}, { 
  service: 'OrderService', 
  operation: 'processOrder',
  context: { orderId, userId, items: items.length }
});
```

---

## Testing Error Handling

### Testing Success Cases

```typescript
describe('UserService', () => {
  it('should return user when found', async () => {
    const result = await userService.getUserById('user-123');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe('user-123');
  });
});
```

### Testing Error Cases

```typescript
describe('UserService', () => {
  it('should return error when validation fails', async () => {
    const result = await userService.createUser({ email: 'invalid' });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Validation failed');
  });
});
```

### Testing Not Found Cases

```typescript
describe('UserService', () => {
  it('should return null when user not found', async () => {
    const result = await userService.getUserById('nonexistent');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});
```

---

## Troubleshooting

### Problem: Errors Not Being Logged

**Solution:** Ensure you're using `safeAsync` wrapper:

```typescript
// Wrong
async function myMethod() {
  // Errors not caught
}

// Right
async function myMethod(): AsyncServiceResult<T> {
  return safeAsync(async () => {
    // Errors automatically logged
  }, { service, operation });
}
```

### Problem: Type Errors with Result

**Solution:** Always specify the return type:

```typescript
// Wrong
async function getUser(id: string) {
  return safeAsync(async () => { ... });
}

// Right
async function getUser(id: string): AsyncServiceResult<User | null> {
  return safeAsync(async () => { ... }, { service, operation });
}
```

### Problem: Transaction Not Rolling Back

**Solution:** Ensure errors are thrown, not returned:

```typescript
// Wrong
return safeAsync(async () => {
  await withTransaction(async () => {
    if (error) return { error }; // Won't rollback
  });
}, { service, operation });

// Right
return safeAsync(async () => {
  await withTransaction(async () => {
    if (error) throw new Error('Failed'); // Will rollback
  });
}, { service, operation });
```

---

## Examples from Codebase

### Bills Service

```typescript
async createBill(billData: InsertBill): Promise<AsyncServiceResult<Bill>> {
  return safeAsync(async () => {
    // Validate input using Zod schema
    const validation = await validateData(CreateBillSchema, billData);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // Execute with transaction
    const newBillResults = await withTransaction(async () => {
      return await db
        .insert(bills)
        .values(validation.data)
        .returning();
    });

    const newBill = newBillResults[0];

    // Audit log
    await securityAuditService.logSecurityEvent({
      event_type: 'bill_created',
      severity: 'low',
      resource: `bill:${newBill.id}`,
      action: 'create',
      success: true,
    });

    // Invalidate caches
    await cacheInvalidation.invalidatePattern('bill:*');

    return newBill;
  }, { service: 'CachedBillService', operation: 'createBill' });
}
```

### Users Service

```typescript
async createUser(data: RegisterUserInput, passwordHash: string): Promise<AsyncServiceResult<User>> {
  return safeAsync(async () => {
    // 1. Validate input
    const validation = await validateData(RegisterUserSchema, data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // 2. Sanitize inputs
    const sanitizedEmail = this.inputSanitizer.sanitizeString(validatedData.email);

    // 3. Encrypt PII
    const encryptedEmail = await this.encryptPII(sanitizedEmail);

    // 4. Execute with transaction
    const user = await withTransaction(async () => {
      const [newUser] = await db.insert(users).values({...}).returning();
      await db.insert(user_profiles).values({...});
      return User.create({...});
    });

    // 5. Audit log
    await securityAuditService.logSecurityEvent({...});

    // 6. Invalidate caches
    await this.invalidateUserCaches(user.id);

    return user;
  }, { service: 'EnhancedUserService', operation: 'createUser' });
}
```

---

## Summary

The error handling infrastructure provides:

- ✅ **Consistent pattern** across all features
- ✅ **Type-safe** error handling
- ✅ **Automatic logging** with context
- ✅ **Transaction integration** with automatic rollback
- ✅ **Monitoring ready** with service/operation tags
- ✅ **Testable** error scenarios

All service methods use `AsyncServiceResult<T>` and `safeAsync` for consistent, robust error handling.

---

**Guide Version:** 1.0  
**Last Updated:** February 28, 2026  
**Next Review:** March 28, 2026
