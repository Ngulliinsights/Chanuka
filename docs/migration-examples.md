# Error Handling Migration Examples

This document shows how to migrate server features from using generic errors to using the new `@shared/core` error types with recovery patterns.

## Before and After

**BEFORE (old way):**
```typescript
throw new Error('Bill not found');
throw Boom.badRequest('Invalid bill data');
```

**AFTER (new way):**
```typescript
throw new BaseError('Bill not found', {
  statusCode: 404,
  code: ERROR_CODES.BILL_NOT_FOUND,
  domain: 'BUSINESS',
  severity: 'LOW',
  context,
});
```

---

## Example 1: Validation Error

Use `ValidationError` for input validation failures.

```typescript
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/types/core/errors';
import { createErrorContext } from '@server/infrastructure/error-handling';

export async function exampleValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const context = createErrorContext(req, 'POST /api/bills');

    // Validate input
    if (!req.body.title || !req.body.summary) {
      throw new ValidationError('Missing required fields', {
        fields: {
          title: !req.body.title ? 'Title is required' : null,
          summary: !req.body.summary ? 'Summary is required' : null,
        },
        context,
      });
    }

    // Continue with business logic...
  } catch (error) {
    next(error);
  }
}
```

---

## Example 2: Business Logic Error

Use `BaseError` with appropriate domain for business logic failures.

```typescript
import { BaseError } from '@shared/types/core/errors';
import { ERROR_CODES } from '@shared/constants';

export async function exampleBusinessError(req: Request, res: Response, next: NextFunction) {
  try {
    const context = createErrorContext(req, 'GET /api/bills/:id');
    const { id } = req.params;

    // Fetch bill
    const bill = await billRepository.findById(id);
    if (!bill) {
      throw new BaseError('Bill not found', {
        statusCode: 404,
        code: ERROR_CODES.BILL_NOT_FOUND,
        domain: 'BUSINESS',
        severity: 'LOW',
        details: { billId: id },
        context,
      });
    }

    res.json(bill);
  } catch (error) {
    next(error);
  }
}
```

---

## Example 3: External Service with Retry

Use retry pattern for transient failures.

```typescript
import { withRetry } from '@server/infrastructure/error-handling';

export async function exampleExternalServiceWithRetry(req: Request, res: Response, next: NextFunction) {
  try {
    const context = createErrorContext(req, 'GET /api/bills/analysis');

    // Call external service with automatic retry
    const analysis = await withRetry(
      async () => {
        return externalLegislativeApi.analyzeAllBills();
      },
      'fetch-external-bill-analysis',
      {
        maxAttempts: 3,
        initialDelayMs: 200,
        backoffMultiplier: 2,
      }
    );

    res.json(analysis);
  } catch (error) {
    // If all retries fail, error is passed to middleware
    next(error);
  }
}
```

---

## Example 4: Permission Error

Use `BaseError` for authorization failures.

```typescript
export async function examplePermissionError(req: Request, res: Response, next: NextFunction) {
  try {
    const context = createErrorContext(req, 'DELETE /api/bills/:id');

    if (!req.user) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: 'AUTHENTICATION',
        severity: 'MEDIUM',
        context,
      });
    }

    const bill = await billRepository.findById(req.params.id);
    if (bill.authorId !== req.user.id && req.user.role !== 'admin') {
      throw new BaseError('You do not have permission to delete this bill', {
        statusCode: 403,
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        domain: 'AUTHORIZATION',
        severity: 'MEDIUM',
        details: { billId: req.params.id, userId: req.user.id },
        context,
      });
    }

    await billRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
```

---

## Example 5: Wrapped Async Handler

Use `asyncHandler` to automatically pass errors to middleware.

```typescript
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Usage in router:**

```typescript
import { asyncHandler } from '@server/middleware/error-management';
import { createBill } from './bills.service';

router.post('/bills', asyncHandler(createBill));
router.get('/bills/:id', asyncHandler(getBill));
router.delete('/bills/:id', asyncHandler(deleteBill));
```
