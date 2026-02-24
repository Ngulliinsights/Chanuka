# Developer Guide: Creating New Features

**Version**: 1.0  
**Last Updated**: 2026-02-24  
**Audience**: All Developers

---

## Quick Start

Creating a new feature? Follow this guide to ensure consistency with our architecture.

### TL;DR
1. Use the DDD structure template
2. Put routes in `application/`
3. Put business logic in `domain/`
4. Put data access in `infrastructure/`
5. Export everything through `index.ts`

---

## Feature Structure Template

```
features/<feature-name>/
├── application/           # Application Layer
│   ├── *.routes.ts       # HTTP routes
│   ├── *.controller.ts   # Controllers
│   ├── *.service.ts      # Application services
│   └── use-cases/        # Use case implementations
├── domain/               # Domain Layer
│   ├── entities/         # Domain entities
│   ├── events/           # Domain events
│   ├── services/         # Domain services
│   └── value-objects/    # Value objects
├── infrastructure/       # Infrastructure Layer
│   ├── repositories/     # Repository implementations
│   ├── storage/          # Storage adapters
│   └── adapters/         # External service adapters
├── types/               # Shared type definitions
├── index.ts             # Public API
└── README.md            # Feature documentation
```

---

## Step-by-Step Guide

### Step 1: Create Feature Folder

```bash
mkdir -p server/features/my-feature/{application,domain,infrastructure,types}
```

### Step 2: Create index.ts

```typescript
// server/features/my-feature/index.ts

// Application Layer - Routes
export { router as myFeatureRouter } from './application/my-feature.routes';

// Application Layer - Services
export { MyFeatureService, myFeatureService } from './application/my-feature.service';

// Domain Layer - Entities
export { MyEntity } from './domain/entities/my-entity';

// Domain Layer - Services
export { MyDomainService } from './domain/services/my-domain.service';

// Infrastructure Layer
export { MyRepository } from './infrastructure/repositories/my-repository';

// Types
export * from './types';
```

### Step 3: Create Routes (Application Layer)

```typescript
// server/features/my-feature/application/my-feature.routes.ts
import { Router } from 'express';
import { asyncHandler } from '@server/middleware';
import { myFeatureService } from './my-feature.service';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await myFeatureService.getAll();
  res.json({ success: true, data: result });
}));

router.post('/', asyncHandler(async (req, res) => {
  const result = await myFeatureService.create(req.body);
  res.json({ success: true, data: result });
}));

export { router };
```

### Step 4: Create Application Service

```typescript
// server/features/my-feature/application/my-feature.service.ts
import { logger } from '@server/infrastructure/observability';
import { myDomainService } from '../domain/services/my-domain.service';
import { myRepository } from '../infrastructure/repositories/my-repository';

export class MyFeatureService {
  async getAll() {
    logger.info('Getting all items', { component: 'MyFeature' });
    return myRepository.findAll();
  }

  async create(data: CreateData) {
    // Validate using domain service
    myDomainService.validate(data);
    
    // Create entity
    const entity = myDomainService.createEntity(data);
    
    // Save using repository
    return myRepository.save(entity);
  }
}

export const myFeatureService = new MyFeatureService();
```

### Step 5: Create Domain Service

```typescript
// server/features/my-feature/domain/services/my-domain.service.ts
import { MyEntity } from '../entities/my-entity';
import { ValidationError } from '@shared/types/core/errors';

export class MyDomainService {
  validate(data: CreateData): void {
    if (!data.name) {
      throw new ValidationError('Name is required');
    }
    // Business validation logic here
  }

  createEntity(data: CreateData): MyEntity {
    return new MyEntity({
      id: crypto.randomUUID(),
      name: data.name,
      createdAt: new Date()
    });
  }
}

export const myDomainService = new MyDomainService();
```

### Step 6: Create Entity

```typescript
// server/features/my-feature/domain/entities/my-entity.ts

export class MyEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly createdAt: Date,
    public updatedAt?: Date
  ) {}

  update(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

### Step 7: Create Repository

```typescript
// server/features/my-feature/infrastructure/repositories/my-repository.ts
import { database as db } from '@server/infrastructure/database';
import { myFeatureTable } from '@server/infrastructure/schema';
import { MyEntity } from '../../domain/entities/my-entity';
import { eq } from 'drizzle-orm';

export class MyRepository {
  async findAll(): Promise<MyEntity[]> {
    const rows = await db.select().from(myFeatureTable);
    return rows.map(row => new MyEntity(
      row.id,
      row.name,
      row.created_at,
      row.updated_at
    ));
  }

  async save(entity: MyEntity): Promise<MyEntity> {
    const [row] = await db
      .insert(myFeatureTable)
      .values({
        id: entity.id,
        name: entity.name,
        created_at: entity.createdAt
      })
      .returning();
    
    return new MyEntity(
      row.id,
      row.name,
      row.created_at,
      row.updated_at
    );
  }
}

export const myRepository = new MyRepository();
```

### Step 8: Register Routes

```typescript
// server/index.ts
import { myFeatureRouter } from '@server/features/my-feature';

// ... other imports

app.use('/api/my-feature', myFeatureRouter);
```

### Step 9: Create README

```markdown
# My Feature

## Overview
Brief description of what this feature does.

## API Endpoints
- `GET /api/my-feature` - Get all items
- `POST /api/my-feature` - Create new item

## Domain Logic
- Validation rules
- Business rules
- Constraints

## Dependencies
- Infrastructure: database, observability
- External: none

## Testing
```bash
npm test -- server/features/my-feature
```
```

---

## Layer Responsibilities

### Application Layer (`application/`)
**Purpose**: Handle HTTP requests and orchestrate domain logic

**Contains**:
- Routes (Express routers)
- Controllers (request/response handling)
- Application services (orchestration)
- Use cases (business workflows)

**Responsibilities**:
- Parse HTTP requests
- Validate input (basic)
- Call domain services
- Format responses
- Handle errors

**Example**:
```typescript
// application/my-feature.service.ts
export class MyFeatureService {
  async create(data: CreateData) {
    // 1. Validate input
    // 2. Call domain service
    // 3. Save using repository
    // 4. Return result
  }
}
```

### Domain Layer (`domain/`)
**Purpose**: Contain business logic and rules

**Contains**:
- Entities (business objects)
- Domain services (business logic)
- Value objects (immutable values)
- Domain events (state changes)

**Responsibilities**:
- Implement business rules
- Validate business constraints
- Emit domain events
- Maintain invariants

**Example**:
```typescript
// domain/services/my-domain.service.ts
export class MyDomainService {
  validate(data: CreateData): void {
    // Business validation
  }

  calculatePrice(item: Item): number {
    // Business calculation
  }
}
```

### Infrastructure Layer (`infrastructure/`)
**Purpose**: Handle technical details and external systems

**Contains**:
- Repositories (data access)
- Storage adapters (persistence)
- External service adapters (APIs)
- Technical utilities

**Responsibilities**:
- Database queries
- External API calls
- File system operations
- Caching

**Example**:
```typescript
// infrastructure/repositories/my-repository.ts
export class MyRepository {
  async findById(id: string): Promise<MyEntity | null> {
    // Database query
  }

  async save(entity: MyEntity): Promise<void> {
    // Database insert/update
  }
}
```

---

## Import Rules

### ✅ Allowed Imports

```typescript
// Features can import from infrastructure
import { database } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';

// Features can import from shared
import { ValidationError } from '@shared/types/core/errors';

// Features can import from other features (with caution)
import { userService } from '@server/features/users';

// Application can import from domain
import { myDomainService } from '../domain/services/my-domain.service';

// Infrastructure can import from domain
import { MyEntity } from '../../domain/entities/my-entity';
```

### ❌ Forbidden Imports

```typescript
// Infrastructure CANNOT import from features
import { myService } from '@server/features/my-feature'; // ❌

// Middleware CANNOT import from features
import { myService } from '@server/features/my-feature'; // ❌

// Domain SHOULD NOT import from infrastructure
import { database } from '@server/infrastructure/database'; // ❌
// Use repository pattern instead
```

---

## Common Patterns

### Pattern 1: CRUD Operations

```typescript
// Application service orchestrates
export class MyFeatureService {
  async create(data: CreateData) {
    const entity = myDomainService.createEntity(data);
    return myRepository.save(entity);
  }

  async update(id: string, data: UpdateData) {
    const entity = await myRepository.findById(id);
    if (!entity) throw new NotFoundError();
    
    entity.update(data);
    return myRepository.save(entity);
  }

  async delete(id: string) {
    return myRepository.delete(id);
  }
}
```

### Pattern 2: Complex Business Logic

```typescript
// Domain service contains business logic
export class OrderDomainService {
  calculateTotal(order: Order): number {
    const subtotal = order.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const tax = subtotal * 0.1;
    const shipping = this.calculateShipping(order);
    
    return subtotal + tax + shipping;
  }

  private calculateShipping(order: Order): number {
    // Complex shipping calculation
  }
}
```

### Pattern 3: Repository with Caching

```typescript
export class MyRepository {
  private cache = new Map<string, MyEntity>();

  async findById(id: string): Promise<MyEntity | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Query database
    const row = await db
      .select()
      .from(myTable)
      .where(eq(myTable.id, id))
      .limit(1);

    if (!row[0]) return null;

    const entity = this.mapToEntity(row[0]);
    this.cache.set(id, entity);
    return entity;
  }
}
```

---

## Testing Guide

### Unit Tests

```typescript
// domain/services/__tests__/my-domain.service.test.ts
describe('MyDomainService', () => {
  it('validates required fields', () => {
    expect(() => {
      myDomainService.validate({ name: '' });
    }).toThrow(ValidationError);
  });

  it('creates entity with correct data', () => {
    const entity = myDomainService.createEntity({ name: 'Test' });
    expect(entity.name).toBe('Test');
    expect(entity.id).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// application/__tests__/my-feature.service.test.ts
describe('MyFeatureService', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('creates new item', async () => {
    const result = await myFeatureService.create({ name: 'Test' });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test');
  });

  it('retrieves all items', async () => {
    await myFeatureService.create({ name: 'Test 1' });
    await myFeatureService.create({ name: 'Test 2' });
    
    const results = await myFeatureService.getAll();
    expect(results).toHaveLength(2);
  });
});
```

---

## Checklist

Before submitting PR:

- [ ] Feature follows DDD structure
- [ ] Files in correct layers (application/domain/infrastructure)
- [ ] index.ts exports public API
- [ ] README.md documents feature
- [ ] Routes registered in server/index.ts
- [ ] Unit tests for domain logic
- [ ] Integration tests for application service
- [ ] No circular dependencies
- [ ] Import rules followed
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Types defined

---

## Common Mistakes

### ❌ Mistake 1: Business Logic in Routes
```typescript
// BAD
router.post('/', async (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'Name required' });
  }
  // Business logic here...
});

// GOOD
router.post('/', asyncHandler(async (req, res) => {
  const result = await myFeatureService.create(req.body);
  res.json({ success: true, data: result });
}));
```

### ❌ Mistake 2: Database Queries in Domain
```typescript
// BAD - domain/services/my-domain.service.ts
export class MyDomainService {
  async validate(id: string) {
    const exists = await db.select().from(myTable)...
  }
}

// GOOD - use repository
export class MyDomainService {
  async validate(entity: MyEntity) {
    if (!entity.name) throw new ValidationError();
  }
}
```

### ❌ Mistake 3: Flat Structure
```typescript
// BAD
features/my-feature/
├── my-feature.ts
├── my-service.ts
└── my-repository.ts

// GOOD
features/my-feature/
├── application/
│   └── my-feature.routes.ts
├── domain/
│   └── services/my-domain.service.ts
└── infrastructure/
    └── repositories/my-repository.ts
```

---

## Getting Help

- **Architecture Questions**: See ADR-001 (DDD Structure)
- **Import Rules**: See ADR-003 (Layer Import Rules)
- **Facade Pattern**: See ADR-002 (Facade Pattern)
- **Examples**: Check `features/bills`, `features/users`, `features/analytics`

---

**Happy Coding!** 🚀
