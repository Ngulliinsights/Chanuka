# Transformer Integration Guide

This guide explains how to integrate the transformation layer into the data access layer (repositories, services, and API routes).

## Requirements

- Requirements 4.1: Data transformation consistency
- Requirements 4.3: Type safety through data flow

## Architecture Overview

The transformation layer provides bidirectional transformations between three representations:

1. **Database Layer** (UserTable, BillTable) - Raw database records
2. **Domain Layer** (User, Bill) - Business logic entities
3. **API Layer** (ApiUser, ApiBill) - Serialized wire format

## Integration Points

### 1. Repository Layer (Storage)

Repositories should:
- Accept domain types as input
- Return domain types as output
- Use DB→Domain transformers internally

**Example: User Repository**

```typescript
import { userDbToDomain, userDomainToApi } from '@shared/utils/transformers';
import type { User } from '@shared/types/domains/authentication/user';
import type { UserTable } from '@shared/types/database/tables';

export class UserRepository extends BaseStorage<UserTable> {
  constructor() {
    super({ prefix: 'users' });
  }

  async getUser(id: UserId): Promise<User | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [dbUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      // Transform DB → Domain
      return dbUser ? userDbToDomain.transform(dbUser) : undefined;
    });
  }

  async createUser(user: User): Promise<User> {
    // Transform Domain → DB
    const dbUser = userDbToDomain.reverse(user);
    
    const [created] = await this.db
      .insert(users)
      .values(dbUser)
      .returning();
    
    await this.invalidateCache('all');
    
    // Transform DB → Domain
    return userDbToDomain.transform(created);
  }

  async updateUser(user: User): Promise<User> {
    // Transform Domain → DB
    const dbUser = userDbToDomain.reverse(user);
    
    const [updated] = await this.db
      .update(users)
      .set(dbUser)
      .where(eq(users.id, user.id))
      .returning();
    
    await this.invalidateCache(`id:${user.id}`);
    
    // Transform DB → Domain
    return userDbToDomain.transform(updated);
  }
}
```

### 2. Service Layer

Services should:
- Accept domain types as input
- Return domain types as output
- Work exclusively with domain types

**Example: User Service**

```typescript
import type { User } from '@shared/types/domains/authentication/user';
import type { UserId } from '@shared/types/core/branded';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUserById(id: UserId): Promise<User | null> {
    const user = await this.userRepository.getUser(id);
    return user ?? null;
  }

  async createUser(userData: CreateUserPayload): Promise<User> {
    // Create domain entity
    const user: User = {
      id: generateId() as UserId,
      email: userData.email,
      username: userData.username,
      role: userData.role ?? UserRole.User,
      status: UserStatus.Active,
      profile: null,
      preferences: userData.preferences ?? {},
      verification: userData.verification ?? VerificationStatus.Unverified,
      isActive: userData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Repository handles transformation
    return await this.userRepository.createUser(user);
  }

  async updateUser(id: UserId, updates: UpdateUserPayload): Promise<User> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    // Merge updates with existing domain entity
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Repository handles transformation
    return await this.userRepository.updateUser(updated);
  }
}
```

### 3. API Routes

API routes should:
- Accept API types from requests
- Return API types in responses
- Use Domain→API transformers

**Example: User API Routes**

```typescript
import { Router } from 'express';
import { userDomainToApi } from '@shared/utils/transformers';
import type { ApiUser } from '@shared/utils/transformers/entities/user';

const router = Router();

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id as UserId;
  
  // Service returns domain type
  const user = await userService.getUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Transform Domain → API
  const apiUser: ApiUser = userDomainToApi.transform(user);
  
  res.json(apiUser);
});

// POST /api/users
router.post('/users', async (req, res) => {
  // Request body is API type
  const apiUser: ApiUser = req.body;
  
  // Transform API → Domain
  const domainUser = userDomainToApi.reverse(apiUser);
  
  // Service works with domain type
  const created = await userService.createUser(domainUser);
  
  // Transform Domain → API
  const response: ApiUser = userDomainToApi.transform(created);
  
  res.status(201).json(response);
});

// PUT /api/users/:id
router.put('/users/:id', async (req, res) => {
  const userId = req.params.id as UserId;
  const updates: Partial<ApiUser> = req.body;
  
  // Transform API → Domain (partial)
  const domainUpdates = updates.email ? {
    email: updates.email,
    username: updates.username,
    // ... other fields
  } : {};
  
  // Service works with domain type
  const updated = await userService.updateUser(userId, domainUpdates);
  
  // Transform Domain → API
  const response: ApiUser = userDomainToApi.transform(updated);
  
  res.json(response);
});

export default router;
```

## Best Practices

### 1. Transformation at Boundaries

Always transform at layer boundaries:
- **Repository**: DB ↔ Domain
- **API Routes**: Domain ↔ API
- **Services**: Work only with Domain types

### 2. Type Safety

Use TypeScript's type system to enforce correct transformations:

```typescript
// Good: Type-safe transformation
const domainUser: User = userDbToDomain.transform(dbUser);

// Bad: Unsafe casting
const domainUser = dbUser as unknown as User;
```

### 3. Error Handling

Handle transformation errors gracefully:

```typescript
try {
  const apiUser = userDomainToApi.transform(domainUser);
  res.json(apiUser);
} catch (error) {
  logger.error('Transformation error', { error, domainUser });
  res.status(500).json({ error: 'Internal server error' });
}
```

### 4. Validation

Validate data before transformation:

```typescript
// Validate API input
const validatedInput = CreateUserRequestSchema.parse(req.body);

// Transform to domain
const domainUser = userDomainToApi.reverse(validatedInput);

// Process
const created = await userService.createUser(domainUser);
```

### 5. Composite Transformations

For performance-critical paths, use composite transformers:

```typescript
// Instead of: DB → Domain → API (two transformations)
const domainUser = userDbToDomain.transform(dbUser);
const apiUser = userDomainToApi.transform(domainUser);

// Use: DB → API (one transformation)
const apiUser = userDbToApi.transform(dbUser);
```

## Testing Transformations

### Unit Tests

Test individual transformers:

```typescript
describe('userDbToDomain', () => {
  it('should transform database user to domain user', () => {
    const dbUser: UserTable = {
      id: '123' as UserId,
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hash',
      role: 'user',
      status: 'active',
      verification_status: 'verified',
      last_login: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
      metadata: null,
    };

    const domainUser = userDbToDomain.transform(dbUser);

    expect(domainUser.id).toBe(dbUser.id);
    expect(domainUser.email).toBe(dbUser.email);
    expect(domainUser.role).toBe(UserRole.User);
  });

  it('should preserve data through round-trip transformation', () => {
    const original: UserTable = { /* ... */ };
    
    const domain = userDbToDomain.transform(original);
    const roundTrip = userDbToDomain.reverse(domain);
    
    expect(roundTrip).toEqual(original);
  });
});
```

### Integration Tests

Test full data flow:

```typescript
describe('User API Integration', () => {
  it('should maintain data integrity through full stack', async () => {
    // Create via API
    const apiUser: ApiUser = {
      email: 'test@example.com',
      username: 'testuser',
      // ... other fields
    };

    const response = await request(app)
      .post('/api/users')
      .send(apiUser);

    expect(response.status).toBe(201);
    
    // Retrieve via API
    const getResponse = await request(app)
      .get(`/api/users/${response.body.id}`);

    expect(getResponse.body.email).toBe(apiUser.email);
    
    // Verify in database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.id, response.body.id));

    expect(dbUser[0].email).toBe(apiUser.email);
  });
});
```

## Migration Strategy

### Phase 1: Add Transformers to New Code

Start using transformers in new features:

```typescript
// New feature: Use transformers from the start
export class NewFeatureRepository {
  async getData(id: string) {
    const dbData = await this.db.select()...;
    return transformer.transform(dbData);
  }
}
```

### Phase 2: Refactor Existing Repositories

Gradually refactor existing repositories:

```typescript
// Before
async getUser(id: number) {
  const [user] = await this.db.select().from(users)...;
  return user; // Returns database type
}

// After
async getUser(id: UserId) {
  const [dbUser] = await this.db.select().from(users)...;
  return dbUser ? userDbToDomain.transform(dbUser) : undefined;
}
```

### Phase 3: Update Services

Update services to work with domain types:

```typescript
// Before
async createUser(data: any) {
  return await this.userRepository.createUser(data);
}

// After
async createUser(data: CreateUserPayload): Promise<User> {
  const user: User = { /* create domain entity */ };
  return await this.userRepository.createUser(user);
}
```

### Phase 4: Update API Routes

Update routes to use API types:

```typescript
// Before
router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user); // Returns domain type directly
});

// After
router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  const apiUser = userDomainToApi.transform(user);
  res.json(apiUser); // Returns API type
});
```

## Common Patterns

### Pattern 1: Batch Transformations

Transform arrays of entities:

```typescript
import { createArrayTransformer } from '@shared/utils/transformers';

const userArrayTransformer = createArrayTransformer(userDbToDomain);

async getUsers(): Promise<User[]> {
  const dbUsers = await this.db.select().from(users);
  return userArrayTransformer.transform(dbUsers);
}
```

### Pattern 2: Optional Transformations

Handle nullable entities:

```typescript
import { createOptionalTransformer } from '@shared/utils/transformers';

const optionalUserTransformer = createOptionalTransformer(userDbToDomain);

async getUser(id: UserId): Promise<User | null> {
  const dbUser = await this.db.select()...;
  return optionalUserTransformer.transform(dbUser);
}
```

### Pattern 3: Nested Transformations

Transform entities with relationships:

```typescript
async getBillWithSponsors(id: BillId): Promise<Bill> {
  const dbBill = await this.db.select()...;
  const dbSponsors = await this.db.select()...;
  
  // Transform bill
  const bill = billDbToDomain.transform(dbBill);
  
  // Transform sponsors
  const sponsors = dbSponsors.map(s => sponsorDbToDomain.transform(s));
  
  // Combine
  return {
    ...bill,
    sponsors,
  };
}
```

## Troubleshooting

### Issue: Type Mismatch

**Problem**: TypeScript errors when transforming

**Solution**: Ensure source and target types match transformer signature

```typescript
// Wrong: Using wrong transformer
const user = billDbToDomain.transform(dbUser); // Error!

// Correct: Using correct transformer
const user = userDbToDomain.transform(dbUser); // OK
```

### Issue: Missing Fields

**Problem**: Transformed object missing required fields

**Solution**: Ensure transformer handles all required fields

```typescript
// Check transformer implementation
export const userDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      // ... ensure all User fields are mapped
    };
  },
  // ...
};
```

### Issue: Date Serialization

**Problem**: Dates not serializing correctly for API

**Solution**: Use date transformers

```typescript
import { dateToStringTransformer } from '@shared/utils/transformers';

// In API transformer
createdAt: dateToStringTransformer.transform(user.createdAt),
```

## Summary

The transformation layer provides:
- ✅ Type safety across all layers
- ✅ Consistent data transformations
- ✅ Clear separation of concerns
- ✅ Testable transformation logic
- ✅ Maintainable codebase

Follow this guide to integrate transformers into your data access layer and ensure consistent, type-safe data flow throughout the application.
