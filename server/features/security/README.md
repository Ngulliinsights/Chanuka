# Security Features

This directory contains all security-related business logic and features for the Chanuka platform, organized following Domain-Driven Design (DDD) principles.

## Directory Structure

```
server/features/security/
├── domain/                            # Domain layer (business logic)
│   ├── value-objects/                # Immutable value objects
│   │   ├── pagination-params.ts     # Pagination parameters
│   │   ├── secure-query.ts          # Secure query representation
│   │   └── query-validation-result.ts # Validation result
│   └── services/                     # Domain services
│       ├── input-sanitization.service.ts # Input sanitization logic
│       └── query-validation.service.ts   # Query validation logic
├── application/                       # Application layer (use cases)
│   └── services/                     # Application services
│       └── secure-query-builder.service.ts # Query building orchestration
├── services/                          # Legacy services (to be refactored)
│   └── data-privacy-service.ts       # Data privacy and anonymization
├── encryption-service.ts              # Encryption/decryption utilities
├── intrusion-detection-service.ts    # Intrusion detection and prevention
├── privacy-service.ts                 # Privacy controls and compliance
├── security-audit-service.ts          # Security audit logging
├── security-event-logger.ts           # Security event logging
├── security-initialization-service.ts # Security initialization
├── security-middleware.ts             # Security middleware
├── security-monitoring-service.ts     # Security monitoring
├── security-monitoring.ts             # Security monitoring utilities
├── security-policy.ts                 # Security policies
├── tls-config-service.ts             # TLS configuration
└── index.ts                           # Public exports
```

## DDD Architecture

### Domain Layer
Contains core business logic and rules that are independent of infrastructure concerns.

**Value Objects:**
- `PaginationParams` - Immutable pagination parameters with validation
- `SecureQuery` - Represents a validated, parameterized database query
- `QueryValidationResult` - Encapsulates validation results

**Domain Services:**
- `InputSanitizationService` - Sanitizes and validates input data
- `QueryValidationService` - Validates query parameters and sanitizes output

### Application Layer
Orchestrates domain objects and services to implement use cases.

**Application Services:**
- `SecureQueryBuilderService` - Builds secure parameterized queries using domain services

### Infrastructure Layer
Located in `server/infrastructure/security/` - provides backward compatibility wrappers.

## Core Services

### Secure Query Builder (NEW DDD Structure)

```typescript
import { secureQueryBuilderService, PaginationParams } from '@server/features/security';

// Build parameterized query
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email: userEmail }
);

// Execute query
const users = await db.execute(query.sql, query.params);

// Use pagination value object
const pagination = PaginationParams.create(req.query.page, req.query.limit);
```

### Input Sanitization

```typescript
import { inputSanitizationService } from '@server/features/security';

// Sanitize string input
const sanitized = inputSanitizationService.sanitizeString(userInput);

// Sanitize HTML output
const safe = inputSanitizationService.sanitizeHtml(htmlContent);

// Create safe LIKE pattern
const pattern = inputSanitizationService.createSafeLikePattern(searchTerm);

// Check for sensitive fields
if (inputSanitizationService.isSensitiveField('password')) {
  // Handle sensitive data
}
```

### Query Validation

```typescript
import { queryValidationService } from '@server/features/security';

// Validate query inputs
const validation = queryValidationService.validateInputs([email, age, name]);

if (validation.hasErrors()) {
  throw new Error(validation.getErrorMessage());
}

// Use sanitized parameters
const params = validation.sanitizedParams;

// Sanitize output data
const sanitizedData = queryValidationService.sanitizeOutput(userData);
```

### Encryption Service

```typescript
import { encryptionService } from '@server/features/security';

const encrypted = await encryptionService.encrypt(sensitiveData);
const decrypted = await encryptionService.decrypt(encrypted);
```

### Security Audit Service

```typescript
import { securityAuditService } from '@server/features/security';

await securityAuditService.logSecurityEvent({
  type: 'authentication_failure',
  user_id: userId,
  ip: req.ip,
  description: 'Failed login attempt'
});
```

### Security Event Logger

```typescript
import { emitSecurityEvent } from '@server/infrastructure/observability';

emitSecurityEvent({
  type: 'unauthorized_access',
  severity: 'high',
  user_id: userId,
  ip: req.ip,
  description: 'Attempted access to admin endpoint'
});
```

### Data Privacy Service

```typescript
import { dataPrivacyService } from '@server/features/security/services/data-privacy-service';

const anonymized = await dataPrivacyService.anonymizeUserData(userData);
```

## Value Objects

### PaginationParams

Immutable value object representing validated pagination parameters.

```typescript
import { PaginationParams } from '@server/features/security';

// Create from query strings
const pagination = PaginationParams.create(req.query.page, req.query.limit);

// Create from numbers
const pagination = PaginationParams.fromNumbers(1, 20);

// Access properties
console.log(pagination.page);    // 1
console.log(pagination.limit);   // 20
console.log(pagination.offset);  // 0
```

### SecureQuery

Represents a validated, parameterized database query.

```typescript
import { SecureQuery } from '@server/features/security';

const query = SecureQuery.create(sql, params, queryId);

// Access properties
console.log(query.sql);      // SQL template
console.log(query.params);   // Sanitized parameters
console.log(query.queryId);  // Unique query identifier
```

### QueryValidationResult

Encapsulates the result of query parameter validation.

```typescript
import { QueryValidationResult } from '@server/features/security';

// Create valid result
const valid = QueryValidationResult.valid(sanitizedParams);

// Create invalid result
const invalid = QueryValidationResult.invalid(['Error 1', 'Error 2']);

// Check for errors
if (result.hasErrors()) {
  console.log(result.getErrorMessage());
}
```

## Architecture Principles

### Features vs Infrastructure

**This directory (`features/security`)** contains:
- ✅ Domain-driven design structure
- ✅ Business logic for security features
- ✅ Value objects and domain services
- ✅ Application services
- ✅ Security audit services
- ✅ Encryption services
- ✅ Intrusion detection
- ✅ Privacy services
- ✅ Security event logging

**Infrastructure layer (`infrastructure/security`)** contains:
- ⚠️ Deprecated backward-compatible wrappers
- Legacy support for existing code

### Why DDD?

1. **Separation of Concerns** - Clear boundaries between domain, application, and infrastructure
2. **Testability** - Domain logic can be tested independently
3. **Maintainability** - Business rules are centralized in domain layer
4. **Reusability** - Value objects and domain services are highly reusable
5. **Type Safety** - Value objects provide compile-time guarantees

## Import Guidelines

### DO:
```typescript
// Security features (new DDD structure)
import { 
  secureQueryBuilderService,
  PaginationParams,
  SecureQuery,
  QueryValidationResult,
  inputSanitizationService,
  queryValidationService
} from '@server/features/security';

// Legacy services
import { encryptionService, securityAuditService } from '@server/features/security';

// Security event logging (via observability barrel)
import { emitSecurityEvent, isSensitiveEndpoint } from '@server/infrastructure/observability';
```

### DON'T:
```typescript
// ❌ Don't use deprecated infrastructure imports
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';

// ❌ Don't bypass the barrel exports
import { SecureQueryBuilderService } from '@server/features/security/application/services/secure-query-builder.service';
```

## Security Best Practices

1. **Always validate input** - Use `inputValidationService` for all user input
2. **Use parameterized queries** - Use `secureQueryBuilder` for database queries
3. **Log security events** - Use `emitSecurityEvent` for security-relevant actions
4. **Encrypt sensitive data** - Use `encryptionService` for PII and secrets
5. **Audit sensitive operations** - Use `securityAuditService` for compliance

## Related Documentation

- [Infrastructure Security](../../infrastructure/security/README.md)
- [Observability](../../infrastructure/observability/README.md)
- [Authentication](../../infrastructure/auth/README.md)


## Security Best Practices

### Input Validation
1. **Always validate** - Never trust user input
2. **Use value objects** - Encapsulate validation logic in domain objects
3. **Validate early** - Check input at the API boundary
4. **Sanitize consistently** - Use domain services for sanitization

### Query Security
1. **Never concatenate** - Use parameterized queries via SecureQueryBuilderService
2. **Use value objects** - Leverage SecureQuery and PaginationParams
3. **Validate parameters** - Use QueryValidationService before building queries
4. **Audit queries** - Log all database operations

### Domain-Driven Design
1. **Immutable value objects** - Use value objects for validated data
2. **Domain services** - Centralize business logic in domain services
3. **Application services** - Orchestrate domain objects in application layer
4. **Clear boundaries** - Maintain separation between layers

### Common Pitfalls

❌ **DON'T:**
```typescript
// String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Unvalidated input
const user = await createUser(req.body);

// Direct primitive usage
const page = parseInt(req.query.page);
const limit = parseInt(req.query.limit);
```

✅ **DO:**
```typescript
// Parameterized queries with value objects
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE id = ${id}',
  { id: userId }
);

// Validated input with domain services
const validation = queryValidationService.validateInputs([req.body]);
if (validation.hasErrors()) {
  throw new Error(validation.getErrorMessage());
}

// Value objects for validated data
const pagination = PaginationParams.create(req.query.page, req.query.limit);
```

## Testing

### Testing Value Objects

```typescript
import { PaginationParams, QueryValidationResult } from '@server/features/security';

describe('PaginationParams', () => {
  it('should create valid pagination params', () => {
    const params = PaginationParams.create('2', '50');
    expect(params.page).toBe(2);
    expect(params.limit).toBe(50);
    expect(params.offset).toBe(50);
  });

  it('should enforce max limit', () => {
    const params = PaginationParams.create('1', '200');
    expect(params.limit).toBe(100); // Max limit
  });
});

describe('QueryValidationResult', () => {
  it('should create valid result', () => {
    const result = QueryValidationResult.valid({ key: 'value' });
    expect(result.isValid).toBe(true);
    expect(result.hasErrors()).toBe(false);
  });

  it('should create invalid result', () => {
    const result = QueryValidationResult.invalid(['Error 1']);
    expect(result.isValid).toBe(false);
    expect(result.hasErrors()).toBe(true);
    expect(result.getErrorMessage()).toBe('Error 1');
  });
});
```

### Testing Domain Services

```typescript
import { inputSanitizationService, queryValidationService } from '@server/features/security';

describe('InputSanitizationService', () => {
  it('should sanitize string input', () => {
    const input = 'test--comment';
    const sanitized = inputSanitizationService.sanitizeString(input);
    expect(sanitized).not.toContain('--');
  });

  it('should create safe LIKE pattern', () => {
    const pattern = inputSanitizationService.createSafeLikePattern('test%');
    expect(pattern).toBe('%test\\%%');
  });
});

describe('QueryValidationService', () => {
  it('should validate valid inputs', () => {
    const result = queryValidationService.validateInputs(['test', 123, true]);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid inputs', () => {
    const result = queryValidationService.validateInputs([NaN]);
    expect(result.isValid).toBe(false);
  });
});
```

### Testing Application Services

```typescript
import { secureQueryBuilderService } from '@server/features/security';

describe('SecureQueryBuilderService', () => {
  it('should build parameterized query', () => {
    const query = secureQueryBuilderService.buildParameterizedQuery(
      'SELECT * FROM users WHERE email = ${email}',
      { email: 'test@example.com' }
    );
    
    expect(query.sql).toBeDefined();
    expect(query.params).toHaveProperty('email');
    expect(query.queryId).toBeDefined();
  });

  it('should validate pagination params', () => {
    const params = secureQueryBuilderService.validatePaginationParams('2', '30');
    expect(params.page).toBe(2);
    expect(params.limit).toBe(30);
    expect(params.offset).toBe(30);
  });
});
```

## Migration from Infrastructure Layer

If you're migrating from the old infrastructure layer:

1. **Update imports:**
   ```typescript
   // Old
   import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';
   
   // New
   import { secureQueryBuilderService } from '@server/features/security';
   ```

2. **Use value objects:**
   ```typescript
   // Old
   const { page, limit, offset } = secureQueryBuilder.validatePaginationParams(
     req.query.page,
     req.query.limit
   );
   
   // New
   const pagination = PaginationParams.create(req.query.page, req.query.limit);
   // Access: pagination.page, pagination.limit, pagination.offset
   ```

3. **Update method calls:**
   ```typescript
   // Old
   const query = secureQueryBuilder.buildParameterizedQuery(template, params);
   
   // New (same API)
   const query = secureQueryBuilderService.buildParameterizedQuery(template, params);
   ```

## Related Documentation

- [Infrastructure Security](../../infrastructure/security/README.md) - Deprecated wrappers
- [Observability](../../infrastructure/observability/README.md)
- [Authentication](../../infrastructure/auth/README.md)
- [DDD Patterns](../../ARCHITECTURE.md)
