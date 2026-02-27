# Validation Architecture Guide

**Date:** 2026-02-27  
**Status:** Active  
**Purpose:** Prevent validation duplication and ensure consistent validation across the codebase

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED VALIDATION                         │
│  Location: shared/validation/                                │
│                                                              │
│  - Primitive schemas (email, UUID, phone, URL)              │
│  - Common schemas (pagination, search, date range)          │
│  - Domain schemas (user, bill, comment, analytics)          │
│  - Helper functions (nonEmptyString, etc.)                  │
│  - Type definitions                                          │
│  - Works in both client and server                          │
│                                                              │
│  SINGLE SOURCE OF TRUTH FOR ALL VALIDATION PRIMITIVES       │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ imports
                ┌───────────┴───────────┐
                │                       │
┌───────────────▼──────────┐  ┌────────▼──────────────────────┐
│   SERVER VALIDATION      │  │    CLIENT VALIDATION          │
│  Location:               │  │  Location:                    │
│  server/infrastructure/  │  │  client/src/infrastructure/   │
│  validation/             │  │  validation/                  │
│                          │  │                               │
│  - Express middleware    │  │  - React Hook Form helpers    │
│  - Validation services   │  │  - Form state management      │
│  - Validation metrics    │  │  - Client sanitization        │
│  - Server sanitization   │  │  - Field validators           │
│  - Query validation      │  │  - UI validation patterns     │
│  - Security validation   │  │                               │
│  - String transformations│  │                               │
│    (query params)        │  │                               │
│                          │  │                               │
│  IMPORTS FROM SHARED     │  │  IMPORTS FROM SHARED          │
└──────────────────────────┘  └───────────────────────────────┘
```

---

## What Goes Where

### Shared Validation (`shared/validation/`)

**Purpose:** Single source of truth for all validation primitives and domain schemas

**What belongs here:**
- ✅ Primitive schemas (email, UUID, phone, URL)
- ✅ Common patterns (pagination, search, date range)
- ✅ Domain schemas (user, bill, comment, analytics)
- ✅ Helper functions (nonEmptyString, optionalNonEmptyString)
- ✅ Type definitions
- ✅ Enum schemas (user roles, bill status, bill category)
- ✅ Database-aligned schemas

**What does NOT belong here:**
- ❌ Express middleware (server-only)
- ❌ React Hook Form integration (client-only)
- ❌ String-to-number transformations (server query params)
- ❌ Server-specific validation services
- ❌ Client-specific form helpers

**Example:**
```typescript
// shared/validation/schemas/common.ts
export const emailSchema = z.string().email('Invalid email address');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});
```

---

### Server Validation (`server/infrastructure/validation/`)

**Purpose:** Server-specific validation logic, middleware, and services

**What belongs here:**
- ✅ Express middleware (validateSchema, validateQuery, validateBody)
- ✅ Validation services (InputValidationService, SchemaValidationService)
- ✅ Validation metrics and monitoring
- ✅ Server-specific transformations (string-to-boolean, string-to-number for query params)
- ✅ Security validation (SQL injection, XSS detection)
- ✅ Query validation (secure query builder integration)
- ✅ Server-specific helper functions

**What does NOT belong here:**
- ❌ Primitive schema definitions (use shared)
- ❌ Common schema definitions (use shared)
- ❌ Domain schema definitions (use shared or feature-specific)
- ❌ React Hook Form integration
- ❌ Client-specific form helpers

**Example:**
```typescript
// server/infrastructure/validation/validation-helpers.ts
import { emailSchema, uuidSchema } from '@shared/validation/schemas/common';

export const CommonSchemas = {
  // Import from shared
  email: emailSchema,
  id: uuidSchema,
  
  // Server-specific transformations
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  booleanString: z.enum(['true', 'false']).transform(val => val === 'true'),
};
```

---

### Client Validation (`client/src/infrastructure/validation/`)

**Purpose:** Client-specific validation helpers and form integration

**What belongs here:**
- ✅ React Hook Form integration
- ✅ Form state management helpers
- ✅ Client-side sanitization
- ✅ UI validation patterns
- ✅ Field validators for forms
- ✅ Form error handling

**What does NOT belong here:**
- ❌ Primitive schema definitions (use shared)
- ❌ Common schema definitions (use shared)
- ❌ Domain schema definitions (use shared)
- ❌ Express middleware
- ❌ Server-specific validation services

**Example:**
```typescript
// client/src/infrastructure/validation/form-helpers.ts
import { emailSchema } from '@shared/validation/schemas/common';

export function createRHFValidator(schema: z.ZodSchema) {
  return async (data: unknown) => {
    // React Hook Form integration logic
  };
}
```

---

### Feature-Specific Validation

**Purpose:** Feature-specific validation schemas that don't belong in shared

**Location:** `server/features/{feature}/application/{feature}-validation.schemas.ts`

**What belongs here:**
- ✅ Feature-specific input validation schemas
- ✅ Feature-specific enum schemas (if not shared)
- ✅ Feature-specific composite schemas
- ✅ Type exports for feature schemas

**What does NOT belong here:**
- ❌ Primitive schemas (use shared)
- ❌ Common patterns (use shared)
- ❌ Validation logic (use shared helpers)

**Example:**
```typescript
// server/features/bills/application/bill-validation.schemas.ts
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

export const CreateBillSchema = z.object({
  title: CommonSchemas.title,
  summary: CommonSchemas.description,
  category: BillCategorySchema,
  // ... feature-specific fields
});
```

---

## Rules and Best Practices

### Rule 1: Never Duplicate Primitive Schemas

**❌ BAD:**
```typescript
// server/infrastructure/validation/validation-helpers.ts
export const CommonSchemas = {
  email: z.string().email('Invalid email format'), // DUPLICATE!
};
```

**✅ GOOD:**
```typescript
// server/infrastructure/validation/validation-helpers.ts
import { emailSchema } from '@shared/validation/schemas/common';

export const CommonSchemas = {
  email: emailSchema, // Import from shared
};
```

### Rule 2: Import from Shared, Don't Redefine

**❌ BAD:**
```typescript
// Feature service
const emailSchema = z.string().email(); // DUPLICATE!
```

**✅ GOOD:**
```typescript
// Feature service
import { emailSchema } from '@shared/validation/schemas/common';
```

### Rule 3: Keep Server-Specific Logic in Server

**✅ GOOD:**
```typescript
// server/infrastructure/validation/validation-helpers.ts
export const CommonSchemas = {
  // Server-specific: transforms query string to number
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()),
};
```

### Rule 4: Use Feature-Specific Schemas for Complex Validation

**✅ GOOD:**
```typescript
// server/features/bills/application/bill-validation.schemas.ts
export const CreateBillSchema = z.object({
  title: CommonSchemas.title,
  summary: CommonSchemas.description,
  category: BillCategorySchema, // Feature-specific enum
});
```

### Rule 5: Document Differences Between Shared and Server

**✅ GOOD:**
```typescript
/**
 * Pagination parameters schema (server-specific for query string parsing)
 * 
 * NOTE: This differs from shared paginationSchema which uses limit/offset.
 * Server uses page/limit for query string parameters with string-to-number transformation.
 */
export const PaginationSchema = z.object({
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
});
```

---

## Common Patterns

### Pattern 1: Validating User Input

```typescript
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { CreateEntitySchema } from './entity-validation.schemas';

async function createEntity(data: unknown) {
  // 1. Validate
  const validation = await validateData(CreateEntitySchema, data);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
  }

  // 2. Sanitize
  const sanitized = sanitizeInput(validation.data);

  // 3. Execute
  const result = await executeLogic(sanitized);

  return result;
}
```

### Pattern 2: Creating Feature-Specific Schemas

```typescript
// server/features/myfeature/application/myfeature-validation.schemas.ts
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

export const CreateMyFeatureSchema = z.object({
  name: CommonSchemas.title,
  description: CommonSchemas.description,
  email: CommonSchemas.email,
  // ... feature-specific fields
});

export type CreateMyFeatureInput = z.infer<typeof CreateMyFeatureSchema>;
```

### Pattern 3: Using Validation Middleware

```typescript
// server/features/myfeature/infrastructure/myfeature-routes.ts
import { validateBody } from '@server/infrastructure/validation/middleware';
import { CreateMyFeatureSchema } from '../application/myfeature-validation.schemas';

router.post(
  '/myfeature',
  validateBody(CreateMyFeatureSchema),
  async (req, res) => {
    // req.body is validated and typed
    const result = await myFeatureService.create(req.body);
    res.json(result);
  }
);
```

---

## Migration Checklist

When adding new validation:

- [ ] Check if primitive schema exists in shared validation
- [ ] Import from shared instead of creating new schema
- [ ] Use feature-specific schemas for complex validation
- [ ] Document any server-specific transformations
- [ ] Add validation to service methods before sanitization
- [ ] Add validation middleware to routes
- [ ] Write tests for validation schemas
- [ ] Update this document if adding new patterns

---

## Validation Flow

```
User Input
    ↓
1. Validate (Zod schema)
    ↓
2. Sanitize (remove dangerous content)
    ↓
3. Execute (business logic)
    ↓
4. Sanitize Output (if needed)
    ↓
5. Return Result
```

---

## Error Handling

### Validation Error Format

```typescript
{
  success: false,
  errors: [
    { field: 'email', message: 'Invalid email address' },
    { field: 'name', message: 'Name must be at least 2 characters' }
  ]
}
```

### Error Response Pattern

```typescript
const validation = await validateData(Schema, input);
if (!validation.success) {
  const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
  throw new Error(`Validation failed: ${errorMsg}`);
}
```

---

## Testing Validation

### Test Valid Inputs

```typescript
describe('CreateBillSchema', () => {
  it('should validate valid bill data', async () => {
    const validData = {
      title: 'Test Bill',
      summary: 'Test summary',
      category: 'technology',
    };

    const result = await validateData(CreateBillSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });
});
```

### Test Invalid Inputs

```typescript
describe('CreateBillSchema', () => {
  it('should reject invalid email', async () => {
    const invalidData = {
      title: '', // Too short
      summary: 'Test summary',
      category: 'invalid', // Invalid enum
    };

    const result = await validateData(CreateBillSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
```

---

## Common Mistakes to Avoid

### Mistake 1: Duplicating Primitive Schemas

**❌ DON'T:**
```typescript
const emailSchema = z.string().email(); // Already in shared!
```

**✅ DO:**
```typescript
import { emailSchema } from '@shared/validation/schemas/common';
```

### Mistake 2: Creating Feature Schemas in validation-helpers.ts

**❌ DON'T:**
```typescript
// server/infrastructure/validation/validation-helpers.ts
export const BillValidationSchema = { ... }; // Feature-specific!
```

**✅ DO:**
```typescript
// server/features/bills/application/bill-validation.schemas.ts
export const CreateBillSchema = { ... };
```

### Mistake 3: Not Validating Before Sanitizing

**❌ DON'T:**
```typescript
const sanitized = sanitizeInput(input); // No validation!
```

**✅ DO:**
```typescript
const validation = await validateData(Schema, input);
if (!validation.success) throw new Error(...);
const sanitized = sanitizeInput(validation.data);
```

### Mistake 4: Using Different Error Messages

**❌ DON'T:**
```typescript
// Shared
emailSchema = z.string().email('Invalid email address');

// Server (duplicate)
email: z.string().email('Invalid email format'); // Different message!
```

**✅ DO:**
```typescript
// Server
import { emailSchema } from '@shared/validation/schemas/common';
email: emailSchema, // Same message
```

---

## Quick Reference

### Import Paths

```typescript
// Shared validation
import { emailSchema, uuidSchema } from '@shared/validation/schemas/common';
import { UserSchema } from '@shared/validation/schemas/user.schema';

// Server validation
import { validateData, CommonSchemas } from '@server/infrastructure/validation/validation-helpers';
import { validateBody } from '@server/infrastructure/validation/middleware';

// Feature validation
import { CreateBillSchema } from '@server/features/bills/application/bill-validation.schemas';
```

### Common Schemas

| Schema | Location | Use Case |
|--------|----------|----------|
| `emailSchema` | `@shared/validation/schemas/common` | Email validation |
| `uuidSchema` | `@shared/validation/schemas/common` | UUID validation |
| `phoneSchema` | `@shared/validation/schemas/common` | Phone validation |
| `urlSchema` | `@shared/validation/schemas/common` | URL validation |
| `paginationSchema` | `@shared/validation/schemas/common` | Pagination (limit/offset) |
| `searchQuerySchema` | `@shared/validation/schemas/common` | Search queries |
| `dateRangeSchema` | `@shared/validation/schemas/common` | Date ranges |
| `CommonSchemas.page` | `@server/infrastructure/validation/validation-helpers` | Query string page number |
| `CommonSchemas.limit` | `@server/infrastructure/validation/validation-helpers` | Query string limit |

---

## Related Documentation

- `shared/validation/SCHEMA_ALIGNMENT_GUIDE.md` - Database schema alignment
- `.agent/specs/infrastructure-integration/VALIDATION_CONSISTENCY_ANALYSIS.md` - Duplication analysis
- `.agent/specs/infrastructure-integration/BILLS_VALIDATION_COMPLETE.md` - Bills validation example

---

## Maintenance

This document should be updated when:
- New validation patterns are established
- New shared schemas are added
- Architecture changes are made
- Common mistakes are identified

**Last Updated:** 2026-02-27  
**Next Review:** After Phase 2 integration complete

