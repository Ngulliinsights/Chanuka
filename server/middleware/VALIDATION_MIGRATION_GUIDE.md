# Validation Middleware Migration Guide

This guide explains how to migrate from inline validation to centralized validation middleware.

## Overview

The new validation middleware provides:
- Centralized validation logic
- Standardized error responses
- Type-safe validation
- Consistent error formatting
- Automatic request data sanitization

## Migration Steps

### Before (Inline Validation)

```typescript
import { z } from 'zod';

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const profileData = updateProfileSchema.parse(req.body);
    // ... rest of handler
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Manual error handling
      return res.status(400).json({ errors: error.errors });
    }
    throw error;
  }
});
```

### After (Centralized Validation)

```typescript
import { validateBody } from '@/middleware/validation-middleware';
import { UpdateProfileRequestSchema } from '@shared/validation';

router.patch(
  '/me',
  authenticateToken,
  validateBody(UpdateProfileRequestSchema),
  async (req, res) => {
    // req.body is now validated and type-safe
    const profileData = req.body;
    // ... rest of handler
  }
);
```

## Validation Middleware Functions

### 1. validateBody - Validate Request Body

```typescript
import { validateBody } from '@/middleware/validation-middleware';
import { CreateUserRequestSchema } from '@shared/validation';

router.post(
  '/users',
  validateBody(CreateUserRequestSchema),
  createUserHandler
);
```

### 2. validateQuery - Validate Query Parameters

```typescript
import { validateQuery } from '@/middleware/validation-middleware';
import { ListUsersQuerySchema } from '@shared/types/api/contracts/user.schemas';

router.get(
  '/users',
  validateQuery(ListUsersQuerySchema),
  listUsersHandler
);
```

### 3. validateParams - Validate Path Parameters

```typescript
import { validateParams } from '@/middleware/validation-middleware';
import { GetUserParamsSchema } from '@shared/types/api/contracts/user.schemas';

router.get(
  '/users/:id',
  validateParams(GetUserParamsSchema),
  getUserHandler
);
```

### 4. validateMultiple - Validate Multiple Targets

```typescript
import { validateMultiple } from '@/middleware/validation-middleware';
import { 
  GetUserParamsSchema,
  UpdateUserRequestSchema 
} from '@shared/types/api/contracts/user.schemas';

router.put(
  '/users/:id',
  validateMultiple({
    params: GetUserParamsSchema,
    body: UpdateUserRequestSchema
  }),
  updateUserHandler
);
```

## Error Response Format

All validation errors return a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "statusCode": 400,
    "correlationId": "req-1234567890-abc123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "validationErrors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "too_small"
      }
    ]
  }
}
```

## Schema Organization

### Domain Schemas (shared/validation/schemas/)

Use for domain entity validation:

```typescript
// shared/validation/schemas/user.schema.ts
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  username: z.string().min(3).max(20),
  // ...
});
```

### API Contract Schemas (shared/types/api/contracts/)

Use for API request/response validation:

```typescript
// shared/types/api/contracts/user.schemas.ts
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
});

export const CreateUserResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string(),
});
```

## Best Practices

### 1. Use Shared Schemas

Always import schemas from `@shared/validation` or `@shared/types/api/contracts`:

```typescript
// ✅ Good
import { UserSchema } from '@shared/validation';

// ❌ Bad - inline schema
const userSchema = z.object({ ... });
```

### 2. Validate at Route Level

Apply validation middleware at the route level, not in handlers:

```typescript
// ✅ Good
router.post('/users', validateBody(CreateUserRequestSchema), createUser);

// ❌ Bad - validation in handler
router.post('/users', async (req, res) => {
  const data = CreateUserRequestSchema.parse(req.body);
  // ...
});
```

### 3. Remove Manual Error Handling

Let the middleware handle validation errors:

```typescript
// ✅ Good
router.post('/users', validateBody(CreateUserRequestSchema), async (req, res) => {
  // req.body is already validated
  const user = await createUser(req.body);
  res.json(user);
});

// ❌ Bad - manual try/catch for validation
router.post('/users', async (req, res) => {
  try {
    const data = CreateUserRequestSchema.parse(req.body);
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
  }
});
```

### 4. Combine with Other Middleware

Validation middleware works with other middleware:

```typescript
router.post(
  '/users',
  authenticateToken,           // Auth first
  validateBody(CreateUserRequestSchema),  // Then validate
  createUserHandler            // Then handle
);
```

## Migration Checklist

For each route:

- [ ] Identify validation schemas used
- [ ] Move inline schemas to `shared/validation/schemas/` if domain-specific
- [ ] Move inline schemas to `shared/types/api/contracts/` if API-specific
- [ ] Replace inline validation with middleware
- [ ] Remove manual error handling for validation
- [ ] Test the route with valid and invalid data
- [ ] Verify error responses match expected format

## Example: Complete Migration

### Before

```typescript
// server/features/users/application/profile.ts
const updateProfileSchema = z.object({
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const profileData = updateProfileSchema.parse(req.body);
    const updatedProfile = await userProfileService.updateUserProfile(
      req.user!.id,
      profileData
    );
    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid profile data', formatZodErrors(error.errors));
    }
    throw error;
  }
});
```

### After

```typescript
// shared/validation/schemas/profile.schema.ts
export const UpdateProfileRequestSchema = z.object({
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
});

// server/features/users/application/profile.ts
import { validateBody } from '@/middleware/validation-middleware';
import { UpdateProfileRequestSchema } from '@shared/validation';

router.patch(
  '/me',
  authenticateToken,
  validateBody(UpdateProfileRequestSchema),
  async (req, res) => {
    const updatedProfile = await userProfileService.updateUserProfile(
      req.user!.id,
      req.body
    );
    res.json(updatedProfile);
  }
);
```

## Benefits

1. **Consistency**: All validation errors have the same format
2. **Maintainability**: Schemas are centralized and reusable
3. **Type Safety**: Validated data is properly typed
4. **Less Boilerplate**: No manual error handling needed
5. **Better Testing**: Validation logic is isolated and testable
6. **Single Source of Truth**: Schemas defined once, used everywhere
