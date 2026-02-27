# Infrastructure Security

Low-level, reusable security utilities for the Chanuka platform.

## ⚠️ DEPRECATION NOTICE

Most security functionality has been migrated to `server/features/security` with proper DDD structure.

**Migration Guide:**
- Old: `import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder'`
- New: `import { secureQueryBuilderService } from '@server/features/security'`

The files in this directory now serve as backward-compatible wrappers.

## Purpose

This directory contains **infrastructure-level** security utilities that are:
- Reusable across multiple features
- Low-level and foundational
- Not tied to specific business logic
- Performance-critical

## Contents

### Secure Query Builder (`secure-query-builder.ts`) - DEPRECATED
**⚠️ This file is deprecated. Use `@server/features/security` instead.**

Backward compatibility wrapper for parameterized query building.

**New Location:** `server/features/security/application/services/secure-query-builder.service.ts`

```typescript
// Old (still works but deprecated)
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';

// New (recommended)
import { secureQueryBuilderService } from '@server/features/security';

// Build secure parameterized query
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email: userEmail }
);
```

## New DDD Structure

The security functionality has been reorganized following Domain-Driven Design principles:

```
server/features/security/
├── domain/
│   ├── value-objects/
│   │   ├── pagination-params.ts      # Pagination value object
│   │   ├── secure-query.ts           # Secure query value object
│   │   └── query-validation-result.ts # Validation result value object
│   └── services/
│       ├── input-sanitization.service.ts  # Input sanitization domain logic
│       └── query-validation.service.ts    # Query validation domain logic
└── application/
    └── services/
        └── secure-query-builder.service.ts # Application service
```

## Architecture

### Infrastructure vs Features

**This directory (`infrastructure/security`):**
- ⚠️ Deprecated backward-compatible wrappers
- Legacy support for existing code

**Features directory (`features/security`):**
- ✅ DDD-structured security services
- ✅ Domain value objects (PaginationParams, SecureQuery, QueryValidationResult)
- ✅ Domain services (InputSanitization, QueryValidation)
- ✅ Application services (SecureQueryBuilder)
- ✅ Security audit services
- ✅ Encryption services
- ✅ Intrusion detection
- ✅ Security event logging

### Why This Separation?

1. **Domain-Driven Design** - Proper separation of domain logic and application services
2. **Maintainability** - Clear boundaries between layers
3. **Testability** - Domain logic can be tested independently
4. **Reusability** - Value objects and domain services are highly reusable

## Usage Examples

### Building Secure Queries (New Way)

```typescript
import { secureQueryBuilderService } from '@server/features/security';

// Build parameterized query
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email: userEmail }
);

const users = await db.execute(query.sql, query.params);
```

### Using Value Objects

```typescript
import { PaginationParams } from '@server/features/security';

// Create pagination params
const pagination = PaginationParams.create(req.query.page, req.query.limit);

// Use in query
const users = await db.query.users.findMany({
  limit: pagination.limit,
  offset: pagination.offset
});
```

### Input Sanitization

```typescript
import { inputSanitizationService } from '@server/features/security';

// Sanitize string input
const sanitized = inputSanitizationService.sanitizeString(userInput);

// Create safe LIKE pattern
const pattern = inputSanitizationService.createSafeLikePattern(searchTerm);
```

### Query Validation

```typescript
import { queryValidationService } from '@server/features/security';

// Validate inputs
const validation = queryValidationService.validateInputs([email, age, name]);

if (validation.hasErrors()) {
  throw new Error(validation.getErrorMessage());
}

// Use sanitized params
const params = validation.sanitizedParams;
```

## Security Best Practices

### Input Validation
1. **Always validate** - Never trust user input
2. **Whitelist, don't blacklist** - Define what's allowed, not what's forbidden
3. **Validate early** - Check input at the API boundary
4. **Use value objects** - Encapsulate validation logic

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
```

✅ **DO:**
```typescript
// Parameterized queries with value objects
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE id = ${id}',
  { id: userId }
);

// Validated pagination
const pagination = PaginationParams.create(req.query.page, req.query.limit);
```

## Migration Checklist

- [ ] Replace `secureQueryBuilder` imports with `secureQueryBuilderService`
- [ ] Update method calls to use new service methods
- [ ] Consider using value objects (PaginationParams, SecureQuery)
- [ ] Update tests to use new imports
- [ ] Remove deprecated imports once migration is complete

## Related Documentation

- [Features Security](../../features/security/README.md) - New DDD-structured security
- [Authentication](../auth/README.md)
- [Database](../database/README.md)
