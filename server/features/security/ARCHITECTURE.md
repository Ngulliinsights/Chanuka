# Security Feature Architecture

## DDD Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│                  (Controllers/Routers)                       │
│                                                              │
│  • admin-router.ts                                          │
│  • security-monitoring.ts (router)                          │
│  • Other feature routers                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                   (Use Case Services)                        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  SecureQueryBuilderService                     │        │
│  │  • buildParameterizedQuery()                   │        │
│  │  • validateInputs()                            │        │
│  │  • sanitizeOutput()                            │        │
│  │  • createSafeLikePattern()                     │        │
│  │  • validatePaginationParams()                  │        │
│  └────────────────────────────────────────────────┘        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│                  (Business Logic)                            │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │           Value Objects                       │          │
│  │  • PaginationParams                           │          │
│  │  • SecureQuery                                │          │
│  │  • QueryValidationResult                      │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │         Domain Services                       │          │
│  │  • InputSanitizationService                   │          │
│  │    - sanitizeString()                         │          │
│  │    - sanitizeHtml()                           │          │
│  │    - createSafeLikePattern()                  │          │
│  │    - isSensitiveField()                       │          │
│  │                                                │          │
│  │  • QueryValidationService                     │          │
│  │    - validateInputs()                         │          │
│  │    - sanitizeOutput()                         │          │
│  │                                                │          │
│  │  • EncryptionService                          │          │
│  │    - encryptData()                            │          │
│  │    - decryptData()                            │          │
│  │    - hashPassword()                           │          │
│  │    - verifyPassword()                         │          │
│  │                                                │          │
│  │  • TLSConfigService                           │          │
│  │    - getProductionTLSConfig()                 │          │
│  │    - getDevelopmentTLSConfig()                │          │
│  │    - validateTLSConfig()                      │          │
│  └──────────────────────────────────────────────┘          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│                (Technical Concerns)                          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  Infrastructure Services                      │          │
│  │  • SecurityAuditService                       │          │
│  │  • IntrusionDetectionService                  │          │
│  │  • SecurityMonitoringService                  │          │
│  │  • PrivacyService                             │          │
│  │  • SecurityInitializationService              │          │
│  │  • DataPrivacyService                         │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  • Database (Drizzle ORM)                                   │
│  • Logging (Observability)                                  │
│  • External Services                                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                  admin-router.ts                             │
│                                                              │
│  import { secureQueryBuilderService, PaginationParams }     │
│                                                              │
│  const pagination = PaginationParams.create('1', '20')      │
│  const pattern = secureQueryBuilderService                  │
│                   .createSafeLikePattern(search)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SecureQueryBuilderService (Application)              │
│                                                              │
│  buildParameterizedQuery(template, params) {                │
│    const validation = queryValidationService                │
│                        .validateInputs(params)              │
│    return SecureQuery.create(sql, params, id)               │
│  }                                                           │
│                                                              │
│  validatePaginationParams(page, limit) {                    │
│    return PaginationParams.create(page, limit)              │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Domain Services & Value Objects                 │
│                                                              │
│  QueryValidationService.validateInputs()                    │
│         ↓                                                    │
│  InputSanitizationService.sanitizeString()                  │
│         ↓                                                    │
│  QueryValidationResult.valid(params)                        │
│         ↓                                                    │
│  SecureQuery.create(sql, params, id)                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Query Building Flow

```
1. Router receives request
   ↓
2. Create PaginationParams value object
   PaginationParams.create(page, limit)
   ↓
3. Build secure query
   secureQueryBuilderService.buildParameterizedQuery(template, params)
   ↓
4. Validate inputs (Domain Service)
   queryValidationService.validateInputs(params)
   ↓
5. Sanitize strings (Domain Service)
   inputSanitizationService.sanitizeString(input)
   ↓
6. Create QueryValidationResult (Value Object)
   QueryValidationResult.valid(sanitizedParams)
   ↓
7. Build SQL template
   sql.raw(template)
   ↓
8. Create SecureQuery (Value Object)
   SecureQuery.create(sql, params, queryId)
   ↓
9. Execute query with Drizzle ORM
   db.execute(query.sql, query.params)
   ↓
10. Sanitize output (Domain Service)
    queryValidationService.sanitizeOutput(results)
```

### Pagination Flow

```
1. Router receives pagination params
   page: '2', limit: '50'
   ↓
2. Create PaginationParams value object
   const pagination = PaginationParams.create('2', '50')
   ↓
3. Validate and enforce constraints
   - page >= 1
   - limit <= 100
   - Calculate offset
   ↓
4. Use in query
   .limit(pagination.limit)
   .offset(pagination.offset)
   ↓
5. Return in response
   { page: pagination.page, limit: pagination.limit, total }
```

## Key Design Patterns

### 1. Value Objects
Immutable objects that represent domain concepts:

```typescript
class PaginationParams {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly offset: number
  ) {}
}
```

**Benefits:**
- Immutability prevents accidental mutations
- Encapsulates validation logic
- Type-safe at compile time
- Self-documenting code

### 2. Domain Services
Stateless services for domain logic:

```typescript
class InputSanitizationService {
  sanitizeString(input: string): string {
    // Domain logic for sanitization
  }
}
```

**Benefits:**
- Reusable across application
- Testable in isolation
- No infrastructure dependencies
- Clear single responsibility

### 3. Application Services
Orchestrate domain objects to implement use cases:

```typescript
class SecureQueryBuilderService {
  buildParameterizedQuery(template, params) {
    // Orchestrates domain services and value objects
    const validation = queryValidationService.validateInputs(params);
    return SecureQuery.create(sql, params, id);
  }
}
```

**Benefits:**
- Implements use cases
- Coordinates domain objects
- Handles cross-cutting concerns
- Clear application boundaries

### 4. Singleton Pattern
Single instance for stateless services:

```typescript
export const secureQueryBuilderService = 
  SecureQueryBuilderService.getInstance();
```

**Benefits:**
- Memory efficient
- Consistent state
- Easy to test
- Simple to use

## Testing Strategy

### Unit Tests (Domain Layer)

```typescript
describe('PaginationParams', () => {
  it('should enforce max limit', () => {
    const params = PaginationParams.create('1', '200');
    expect(params.limit).toBe(100);
  });
});

describe('InputSanitizationService', () => {
  it('should remove SQL comments', () => {
    const result = inputSanitizationService.sanitizeString('test--');
    expect(result).not.toContain('--');
  });
});
```

### Integration Tests (Application Layer)

```typescript
describe('SecureQueryBuilderService', () => {
  it('should build valid query', () => {
    const query = secureQueryBuilderService.buildParameterizedQuery(
      'SELECT * FROM users WHERE id = ${id}',
      { id: 123 }
    );
    expect(query.sql).toBeDefined();
  });
});
```

### E2E Tests (Full Stack)

```typescript
describe('Admin Router', () => {
  it('should list users with pagination', async () => {
    const response = await request(app)
      .get('/api/admin/users?page=1&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(1);
  });
});
```

## Migration Path

### Phase 1: Create DDD Structure ✅
- Create value objects
- Create domain services
- Create application services
- Maintain backward compatibility

### Phase 2: Update Consumers (Current)
- Update imports to use new services
- Adopt value objects
- Update tests

### Phase 3: Deprecate Old Structure
- Add deprecation warnings
- Update documentation
- Monitor usage

### Phase 4: Remove Old Code
- Remove deprecated wrappers
- Clean up infrastructure layer
- Final documentation update

## Benefits Achieved

### 1. Separation of Concerns
- Domain logic isolated from infrastructure
- Clear boundaries between layers
- Easy to understand and maintain

### 2. Testability
- Domain logic testable without infrastructure
- Mock-free unit tests
- Fast test execution

### 3. Type Safety
- Value objects provide compile-time guarantees
- Immutability prevents bugs
- Self-documenting code

### 4. Maintainability
- Business rules centralized in domain
- Changes isolated to specific layers
- Clear dependencies

### 5. Reusability
- Domain services reusable across features
- Value objects shareable
- Application services composable

## Related Documentation

- [Security Feature README](./README.md)
- [DDD Migration Summary](./DDD_MIGRATION_SUMMARY.md)
- [Infrastructure Security](../../infrastructure/security/README.md)
