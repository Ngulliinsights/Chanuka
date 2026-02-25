# Infrastructure Security

Low-level, reusable security utilities for the Chanuka platform.

## Purpose

This directory contains **infrastructure-level** security utilities that are:
- Reusable across multiple features
- Low-level and foundational
- Not tied to specific business logic
- Performance-critical

## Contents

### Input Validation Service (`input-validation-service.ts`)
Centralized input validation using Zod schemas.

```typescript
import { inputValidationService } from '@server/infrastructure/security/input-validation-service';

// Validate request body
const result = await inputValidationService.validateRequest(req, {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

if (!result.isValid) {
  return res.status(400).json({ errors: result.errors });
}
```

**Features:**
- Zod schema validation
- File upload validation
- SQL injection prevention
- XSS prevention
- Common validation schemas (email, phone, etc.)

### Secure Query Builder (`secure-query-builder.ts`)
Parameterized query building to prevent SQL injection.

```typescript
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';

// Build secure parameterized query
const query = secureQueryBuilder.buildQuery({
  table: 'users',
  where: { email: userEmail },
  select: ['id', 'name', 'email']
});

// Execute with automatic parameter binding
const result = await db.execute(query.sql);
```

**Features:**
- Automatic parameter binding
- SQL injection prevention
- Query validation
- Audit logging
- Type-safe query building

## Architecture

### Infrastructure vs Features

**This directory (`infrastructure/security`):**
- ✅ Input validation (reusable across all features)
- ✅ Secure query builder (database-level security)
- ✅ Low-level security primitives

**Features directory (`features/security`):**
- ✅ Security audit services
- ✅ Encryption services
- ✅ Intrusion detection
- ✅ Security event logging
- ✅ Business-specific security logic

### Why This Separation?

1. **Reusability** - Infrastructure utilities are used by multiple features
2. **Performance** - Low-level utilities are optimized for speed
3. **Testability** - Infrastructure can be tested independently
4. **Maintainability** - Clear separation of concerns

## Usage Examples

### Validating API Requests

```typescript
import { inputValidationService } from '@server/infrastructure/security/input-validation-service';
import { z } from 'zod';

router.post('/api/users', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().int().min(18)
  });

  const result = await inputValidationService.validate(req.body, schema);
  
  if (!result.isValid) {
    return res.status(400).json({ errors: result.errors });
  }

  // Use validated data
  const user = await createUser(result.data);
  res.json(user);
});
```

### Building Secure Queries

```typescript
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';

// Instead of string concatenation (vulnerable to SQL injection)
// const query = `SELECT * FROM users WHERE email = '${email}'`; // ❌ NEVER DO THIS

// Use secure query builder
const query = secureQueryBuilder.select('users')
  .where({ email: userEmail })
  .build();

const users = await db.execute(query.sql, query.params);
```

### File Upload Validation

```typescript
import { inputValidationService } from '@server/infrastructure/security/input-validation-service';

const fileValidation = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png'],
  allowedExtensions: ['.jpg', '.jpeg', '.png']
};

const result = inputValidationService.validateFile(
  uploadedFile,
  fileValidation
);

if (!result.isValid) {
  return res.status(400).json({ errors: result.errors });
}
```

## Security Best Practices

### Input Validation
1. **Always validate** - Never trust user input
2. **Whitelist, don't blacklist** - Define what's allowed, not what's forbidden
3. **Validate early** - Check input at the API boundary
4. **Use schemas** - Define clear validation rules with Zod

### Query Security
1. **Never concatenate** - Use parameterized queries
2. **Use query builder** - Let the builder handle escaping
3. **Validate parameters** - Check query parameters before building
4. **Audit queries** - Log all database operations

### Common Pitfalls

❌ **DON'T:**
```typescript
// String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Unvalidated input
const user = await createUser(req.body);

// Blacklist validation
if (input.includes('DROP') || input.includes('DELETE')) {
  throw new Error('Invalid input');
}
```

✅ **DO:**
```typescript
// Parameterized queries
const query = secureQueryBuilder.select('users')
  .where({ id: userId })
  .build();

// Schema validation
const validated = await inputValidationService.validate(req.body, userSchema);

// Whitelist validation
const schema = z.object({
  name: z.string().regex(/^[a-zA-Z\s]+$/),
  age: z.number().int().positive()
});
```

## Testing

```typescript
import { inputValidationService } from '@server/infrastructure/security/input-validation-service';
import { z } from 'zod';

describe('Input Validation', () => {
  it('should validate valid input', async () => {
    const schema = z.object({ email: z.string().email() });
    const result = await inputValidationService.validate(
      { email: 'test@example.com' },
      schema
    );
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid input', async () => {
    const schema = z.object({ email: z.string().email() });
    const result = await inputValidationService.validate(
      { email: 'invalid' },
      schema
    );
    expect(result.isValid).toBe(false);
  });
});
```

## Related Documentation

- [Features Security](../../features/security/README.md)
- [Authentication](../auth/README.md)
- [Database](../database/README.md)
