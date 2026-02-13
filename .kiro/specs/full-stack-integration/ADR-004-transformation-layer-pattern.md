# ADR-004: Transformation Layer Pattern

**Status**: Accepted

**Date**: 2024

**Context**: Data in the Chanuka Platform flows through multiple layers, and each layer has different representation requirements:

- **Database Layer**: Uses snake_case column names, database-specific types (timestamps, UUIDs), nullable columns
- **Domain Layer**: Uses camelCase property names, branded types, Date objects, domain-specific types
- **API Layer**: Uses camelCase, ISO 8601 date strings, plain objects suitable for JSON serialization
- **Client Layer**: Uses the same format as API layer but may have additional UI-specific transformations

Without explicit transformation logic, the codebase has suffered from:
- **Inconsistent transformations**: Different parts of the code transform data differently
- **Scattered logic**: Transformation code is duplicated across services, controllers, and components
- **Type unsafety**: Transformations often use `any` or type assertions, bypassing type checking
- **Bugs**: Incorrect transformations (e.g., forgetting to convert snake_case to camelCase) cause runtime errors
- **Maintenance burden**: Changing a type requires finding and updating all transformation code

Example of the problem:
```typescript
// Scattered transformation logic
const user = await db.select().from(users).where(eq(users.id, id));
// Manual transformation, easy to get wrong
return {
  id: user.id,
  email: user.email,
  username: user.username,
  createdAt: user.created_at, // Easy to forget this conversion
  updatedAt: user.updated_at,
};
```

**Decision**: We will implement a systematic transformation layer pattern with explicit, type-safe transformation functions for each layer boundary.

**Transformation Pipeline**:

```
Database Type (snake_case, DB types)
    ↓ DbToDomain transformer
Domain Type (camelCase, branded types, Date objects)
    ↓ DomainToApi transformer
API Type (camelCase, ISO strings, plain objects)
    ↓ JSON serialization
Wire Format (JSON string)
    ↓ JSON parsing
API Type (camelCase, ISO strings, plain objects)
    ↓ ApiToDomain transformer (reverse)
Domain Type (camelCase, branded types, Date objects)
    ↓ DomainToDb transformer (reverse)
Database Type (snake_case, DB types)
```

**Implementation**:

All transformers are defined in `shared/utils/transformers/` with a standard interface:

```typescript
// shared/utils/transformers/transformer.interface.ts
export interface Transformer<TSource, TTarget> {
  transform(source: TSource): TTarget;
  reverse(target: TTarget): TSource;
}

// shared/utils/transformers/user.transformer.ts
export const UserDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      id: dbUser.id as UserId,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role as UserRole,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  },
  
  reverse(user: User): UserTable {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  },
};

export const UserDomainToApi: Transformer<User, ApiUser> = {
  transform(user: User): ApiUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  },
  
  reverse(apiUser: ApiUser): User {
    return {
      id: apiUser.id as UserId,
      email: apiUser.email,
      username: apiUser.username,
      role: apiUser.role,
      createdAt: new Date(apiUser.createdAt),
      updatedAt: new Date(apiUser.updatedAt),
    };
  },
};
```

**Usage in application**:

```typescript
// Server repository layer (Database → Domain)
class UserRepository {
  async findById(id: UserId): Promise<User | null> {
    const dbUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!dbUser[0]) return null;
    return UserDbToDomain.transform(dbUser[0]);
  }
  
  async create(user: User): Promise<User> {
    const dbUser = UserDbToDomain.reverse(user);
    const [created] = await db.insert(users).values(dbUser).returning();
    return UserDbToDomain.transform(created);
  }
}

// Server controller layer (Domain → API)
app.get('/api/users/:id', async (req, res) => {
  const user = await userRepository.findById(req.params.id as UserId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const apiUser = UserDomainToApi.transform(user);
  res.json(apiUser);
});
```

**Consequences**:

**Positive**:
- **Centralized logic**: All transformation logic is in one place per entity
- **Type safety**: Transformers are fully typed, catching errors at compile time
- **Consistency**: Same transformation logic used everywhere
- **Testability**: Transformers can be unit tested in isolation
- **Bidirectional**: `reverse()` method ensures transformations are reversible
- **Composability**: Transformers can be composed for complex pipelines
- **Maintainability**: Changing a type requires updating only the transformer
- **Documentation**: Transformers serve as documentation of data flow
- **Round-trip testing**: Can verify data integrity through full transformation pipeline

**Negative**:
- **Boilerplate**: Requires writing transformer code for each entity
- **Performance overhead**: Transformation has runtime cost (minimal but non-zero)
- **Indirection**: Adds a layer of abstraction between layers
- **Learning curve**: Developers must understand and use the transformer pattern
- **Maintenance**: Transformers must be kept in sync with type changes

**Mitigation**:
- Provide code generation tools to scaffold transformers from type definitions
- Use property-based tests to verify round-trip correctness automatically
- Document the pattern clearly with examples
- Create linting rules to enforce transformer usage at layer boundaries
- Only transform at layer boundaries, not within a layer

**Design Principles**:

1. **Explicit over implicit**: Transformations are explicit function calls, not hidden magic
2. **Type-safe**: All transformations are fully typed with no `any` or type assertions
3. **Bidirectional**: Every transformer has a `reverse()` method for the opposite direction
4. **Pure functions**: Transformers have no side effects and always produce the same output for the same input
5. **Single responsibility**: Each transformer handles one specific layer boundary
6. **Composable**: Transformers can be chained for multi-step transformations

**Testing Strategy**:

```typescript
// Unit test for specific transformation
describe('UserDbToDomain', () => {
  it('should transform database user to domain user', () => {
    const dbUser: UserTable = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };
    
    const domainUser = UserDbToDomain.transform(dbUser);
    
    expect(domainUser.id).toBe(dbUser.id);
    expect(domainUser.createdAt).toEqual(dbUser.created_at);
  });
});

// Property-based test for round-trip correctness
describe('User transformation pipeline', () => {
  it('should preserve data through round-trip transformation', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          username: fc.string({ minLength: 3, maxLength: 100 }),
          role: fc.constantFrom('user', 'admin', 'moderator'),
          created_at: fc.date(),
          updated_at: fc.date(),
        }),
        (dbUser) => {
          // DB → Domain → API → Domain → DB
          const domain1 = UserDbToDomain.transform(dbUser);
          const api = UserDomainToApi.transform(domain1);
          const domain2 = UserDomainToApi.reverse(api);
          const dbUser2 = UserDbToDomain.reverse(domain2);
          
          expect(dbUser2).toEqual(dbUser);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Alternatives Considered**:

1. **Automatic mapping libraries (AutoMapper)**: Rejected because they use reflection/magic and reduce type safety
2. **ORM built-in transformations**: Rejected because it couples transformation to database layer
3. **GraphQL resolvers**: Rejected because the platform doesn't use GraphQL
4. **Class-based transformers with decorators**: Rejected because it requires class-based models
5. **No explicit transformations**: Rejected because it leads to inconsistent, error-prone code

**Related Requirements**: Requirements 4.1, 4.2, 4.3, 4.4, 4.5 (data transformation consistency and type safety)

**Related ADRs**: ADR-001 (Branded Types), ADR-002 (Single Source of Truth), ADR-003 (Zod for Validation)
