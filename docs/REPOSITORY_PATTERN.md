# Repository Pattern Documentation

**Version:** 1.0  
**Last Updated:** 2026-02-27  
**Status:** Phase 1 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [BaseRepository API](#baserepository-api)
4. [Creating Domain-Specific Repositories](#creating-domain-specific-repositories)
5. [Error Handling](#error-handling)
6. [Caching Strategy](#caching-strategy)
7. [Testing Repositories](#testing-repositories)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
9. [Migration Guide](#migration-guide)

---

## Overview

The repository pattern provides a clean abstraction layer between domain logic and data access. Our implementation builds on Week 1's modern database access patterns (`readDatabase`, `withTransaction`) by adding infrastructure capabilities like caching, logging, and error handling.

### Key Features

- **Infrastructure Only** - BaseRepository provides common infrastructure, NOT generic CRUD
- **Domain-Specific Methods** - Repositories define methods that reflect business operations
- **Explicit Error Handling** - Uses Result<T, Error> type for explicit error handling
- **Caching Support** - Optional caching with configurable TTL
- **Performance Logging** - Automatic logging with execution time tracking
- **Transaction Safety** - All writes wrapped in transactions with retry logic

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Services use domain-specific repository methods)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Domain-Specific Repositories                │
│  BillRepository, UserRepository, SponsorRepository, etc.     │
│  (Define domain methods: findByBillNumber, findByEmail)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BaseRepository                          │
│  (Infrastructure: caching, logging, error handling)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Week 1 Database Access Patterns                 │
│  readDatabase, withTransaction (proven patterns)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Infrastructure Only, NOT Generic CRUD

❌ **WRONG (Generic Repository Anti-Pattern):**
```typescript
class BaseRepository<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  create(data: T): Promise<T>;
  update(id: string, data: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

✅ **CORRECT (Infrastructure Only):**
```typescript
class BaseRepository<T> {
  // Infrastructure methods only
  protected executeRead<R>(operation, cacheKey?): Promise<Result<R, Error>>;
  protected executeWrite<R>(operation, invalidateKeys?): Promise<Result<R, Error>>;
  protected executeBatchWrite<R>(operation, pattern?): Promise<Result<R, Error>>;
}

// Domain-specific repositories define their own methods
class BillRepository extends BaseRepository<Bill> {
  findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>>;
  findByAffectedCounties(counties: string[]): Promise<Result<Bill[], Error>>;
  findBySponsorId(sponsorId: string): Promise<Result<Bill[], Error>>;
}
```

### 2. Domain-Specific Methods

Repository methods should reflect business operations, not generic CRUD:

✅ **Good (Domain-Specific):**
- `findByBillNumber(billNumber: string)`
- `findByAffectedCounties(counties: string[])`
- `findBySponsorId(sponsorId: string)`
- `findByStatus(status: BillStatus)`
- `searchByKeywords(keywords: string[])`

❌ **Bad (Generic CRUD):**
- `findById(id: string)`
- `findAll()`
- `findOne(criteria: any)`
- `findMany(criteria: any)`

### 3. Explicit Error Handling

Use Result<T, Error> type for explicit error handling:

```typescript
async function findBill(id: string): Promise<Result<Maybe<Bill>, Error>> {
  const result = await billRepository.findByBillNumber(id);
  
  if (result.isOk) {
    const bill = result.value;
    if (bill !== null) {
      console.log('Found:', bill.title);
    } else {
      console.log('Not found');
    }
  } else {
    console.error('Error:', result.error.message);
  }
}
```

### 4. Separation of Concerns

- **Repositories** - Data access and persistence
- **Domain Services** - Business logic and validation
- **Application Services** - Orchestration and use cases

---

## BaseRepository API

### Constructor Options

```typescript
interface RepositoryOptions {
  entityName: string;        // Entity name for logging and errors
  enableCache?: boolean;     // Enable caching (default: false)
  cacheTTL?: number;         // Cache TTL in seconds (default: 300)
  enableLogging?: boolean;   // Enable logging (default: true)
  retryConfig?: {            // Retry configuration
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}
```

### Protected Methods

#### executeRead<R>()

Execute a read operation with optional caching.

```typescript
protected async executeRead<R>(
  operation: (db: DatabaseConnection) => Promise<R>,
  cacheKey?: string
): Promise<Result<R, Error>>
```

**Example:**
```typescript
async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
  return this.executeRead(
    async (db) => {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return results[0] ?? null;
    },
    `user:email:${email}`
  );
}
```

#### executeWrite<R>()

Execute a write operation within a transaction.

```typescript
protected async executeWrite<R>(
  operation: (tx: DatabaseConnection) => Promise<R>,
  invalidateKeys?: string[]
): Promise<Result<R, Error>>
```

**Example:**
```typescript
async create(data: InsertBill): Promise<Result<Bill, Error>> {
  return this.executeWrite(
    async (tx) => {
      const results = await tx
        .insert(bills)
        .values(data)
        .returning();
      return results[0];
    },
    ['bill:*'] // Invalidate all bill caches
  );
}
```

#### executeBatchWrite<R>()

Execute a batch write operation with extended timeout.

```typescript
protected async executeBatchWrite<R>(
  operation: (tx: DatabaseConnection) => Promise<R>,
  invalidatePattern?: string
): Promise<Result<R, Error>>
```

**Example:**
```typescript
async createMany(data: InsertBill[]): Promise<Result<Bill[], Error>> {
  return this.executeBatchWrite(
    async (tx) => {
      return tx.insert(bills).values(data).returning();
    },
    'bill:*'
  );
}
```

---

## Creating Domain-Specific Repositories

### Step 1: Define Repository Class

```typescript
import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { bills } from '@server/infrastructure/database/schema';
import { eq, arrayOverlaps } from 'drizzle-orm';

export class BillRepository extends BaseRepository<Bill> {
  constructor() {
    super({
      entityName: 'Bill',
      enableCache: true,
      cacheTTL: 300, // 5 minutes
    });
  }
}
```

### Step 2: Add Domain-Specific Methods

```typescript
export class BillRepository extends BaseRepository<Bill> {
  // ... constructor

  /**
   * Find bill by bill number
   */
  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(bills)
          .where(eq(bills.billNumber, billNumber))
          .limit(1);
        return results[0] ?? null;
      },
      `bill:number:${billNumber}`
    );
  }

  /**
   * Find bills by affected counties
   */
  async findByAffectedCounties(counties: string[]): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(bills)
          .where(arrayOverlaps(bills.affectedCounties, counties));
      },
      `bill:counties:${counties.sort().join(',')}`
    );
  }

  /**
   * Find bills by sponsor ID
   */
  async findBySponsorId(sponsorId: string): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(bills)
          .where(eq(bills.sponsorId, sponsorId));
      },
      `bill:sponsor:${sponsorId}`
    );
  }

  /**
   * Create new bill
   */
  async create(data: InsertBill): Promise<Result<Bill, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(bills)
          .values(data)
          .returning();
        return results[0];
      },
      ['bill:*'] // Invalidate all bill caches
    );
  }

  /**
   * Update bill
   */
  async update(id: string, data: Partial<InsertBill>): Promise<Result<Bill, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(bills)
          .set(data)
          .where(eq(bills.id, id))
          .returning();
        return results[0];
      },
      [`bill:id:${id}`, 'bill:*']
    );
  }
}
```

### Step 3: Use in Services

```typescript
export class BillService {
  constructor(private readonly billRepository: BillRepository) {}

  async getBillByNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    return this.billRepository.findByBillNumber(billNumber);
  }

  async getBillsByCounty(county: string): Promise<Result<Bill[], Error>> {
    return this.billRepository.findByAffectedCounties([county]);
  }
}
```

---

## Error Handling

### Error Type Hierarchy

```typescript
RepositoryError (base)
├── TransientError (retryable)
│   └── TimeoutError
├── ValidationError
│   └── ConstraintError
├── NotFoundError
└── FatalError
```

### Using Result Type

```typescript
const result = await billRepository.findByBillNumber('BILL-2024-001');

if (result.isOk) {
  const bill = result.value;
  if (bill !== null) {
    // Bill found
    console.log('Found:', bill.title);
  } else {
    // Bill not found
    console.log('Bill not found');
  }
} else {
  // Error occurred
  console.error('Error:', result.error.message);
  
  // Check error type
  if (result.error.isRetryable()) {
    // Retry logic
  }
}
```

### Error Helpers

```typescript
// Check if error should be retried
if (error.isRetryable()) {
  // Retry operation
}

// Check if error should be cached (negative caching)
if (error.shouldCache()) {
  // Cache the error result
}

// Get sanitized message for production
const message = error.getSanitizedMessage();

// Get error severity
const severity = error.getSeverity(); // 'low' | 'medium' | 'high' | 'critical'
```

---

## Caching Strategy

### Cache Keys

Use descriptive cache keys that reflect the query:

```typescript
// Good cache keys
`bill:number:${billNumber}`
`bill:sponsor:${sponsorId}`
`bill:counties:${counties.sort().join(',')}`
`user:email:${email}`
`user:verification:${token}`

// Bad cache keys
`bill:${id}`
`user:${id}`
```

### Cache Invalidation

Invalidate caches after write operations:

```typescript
// Invalidate specific key
await this.executeWrite(operation, [`bill:id:${id}`]);

// Invalidate pattern (all bills)
await this.executeWrite(operation, ['bill:*']);

// Invalidate multiple keys
await this.executeWrite(operation, [
  `bill:id:${id}`,
  `bill:sponsor:${sponsorId}`,
  'bill:*'
]);
```

### Cache TTL

Configure cache TTL based on data volatility:

```typescript
// Frequently changing data (1 minute)
super({ entityName: 'Bill', enableCache: true, cacheTTL: 60 });

// Moderately changing data (5 minutes)
super({ entityName: 'User', enableCache: true, cacheTTL: 300 });

// Rarely changing data (1 hour)
super({ entityName: 'County', enableCache: true, cacheTTL: 3600 });
```

---

## Testing Repositories

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BillRepository } from './bill-repository';
import { assertionHelpers } from '@server/infrastructure/database/repository/test-utils';

describe('BillRepository', () => {
  let repository: BillRepository;

  beforeEach(() => {
    repository = new BillRepository();
  });

  it('should find bill by bill number', async () => {
    const result = await repository.findByBillNumber('BILL-2024-001');
    
    assertionHelpers.assertOk(result);
    const bill = result.value;
    
    if (bill !== null) {
      expect(bill.billNumber).toBe('BILL-2024-001');
    }
  });
});
```

### Property Tests

```typescript
import * as fc from 'fast-check';
import { billArbitrary, propertyTestHelpers } from '@server/infrastructure/database/repository/test-utils';

it('Property: Create-read round trip', async () => {
  await propertyTestHelpers.runPropertyTest(
    'Create-read round trip',
    billArbitrary,
    async (bill) => {
      // Create
      const createResult = await repository.create(bill);
      if (!createResult.isOk) return false;
      
      // Read
      const readResult = await repository.findByBillNumber(bill.billNumber);
      if (!readResult.isOk) return false;
      
      // Verify
      return readResult.value?.billNumber === bill.billNumber;
    }
  );
});
```

---

## Anti-Patterns to Avoid

### 1. Generic Repository Anti-Pattern

❌ **DON'T:**
```typescript
class GenericRepository<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  create(data: T): Promise<T>;
  update(id: string, data: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

**Why:** Generic CRUD methods don't reflect business operations and lead to anemic domain models.

### 2. Leaking Database Details

❌ **DON'T:**
```typescript
class BillRepository {
  // Exposes Drizzle query builder
  getQueryBuilder() {
    return db.select().from(bills);
  }
}
```

**Why:** Breaks encapsulation and couples consumers to database implementation.

### 3. Business Logic in Repositories

❌ **DON'T:**
```typescript
class BillRepository {
  async approveBill(id: string) {
    // Business logic should be in domain service
    const bill = await this.findById(id);
    if (bill.status !== 'pending') {
      throw new Error('Bill not pending');
    }
    return this.update(id, { status: 'approved' });
  }
}
```

**Why:** Repositories should only handle data access, not business logic.

### 4. Using 'any' Type

❌ **DON'T:**
```typescript
async findByCriteria(criteria: any): Promise<any> {
  // ...
}
```

**Why:** Loses type safety and makes code harder to maintain.

---

## Migration Guide

### From Direct Database Access

**Before (Week 1 pattern):**
```typescript
import { readDatabase, withTransaction } from '@server/infrastructure/database';

async function findBillByNumber(billNumber: string) {
  return readDatabase(async (db) => {
    const results = await db
      .select()
      .from(bills)
      .where(eq(bills.billNumber, billNumber))
      .limit(1);
    return results[0] ?? null;
  });
}
```

**After (Repository pattern):**
```typescript
class BillRepository extends BaseRepository<Bill> {
  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(bills)
          .where(eq(bills.billNumber, billNumber))
          .limit(1);
        return results[0] ?? null;
      },
      `bill:number:${billNumber}`
    );
  }
}
```

**Benefits:**
- ✅ Caching support
- ✅ Performance logging
- ✅ Explicit error handling
- ✅ Consistent patterns

---

## Summary

### Key Takeaways

1. **Infrastructure Only** - BaseRepository provides infrastructure, NOT generic CRUD
2. **Domain-Specific** - Repository methods reflect business operations
3. **Explicit Errors** - Use Result<T, Error> for explicit error handling
4. **Caching** - Optional caching with configurable TTL
5. **Testing** - Comprehensive unit and property tests

### Best Practices

- ✅ Define domain-specific methods that reflect business operations
- ✅ Use Result<T, Error> for explicit error handling
- ✅ Use Maybe<T> for nullable values
- ✅ Cache read operations with descriptive keys
- ✅ Invalidate caches after write operations
- ✅ Write comprehensive tests (unit + property)
- ✅ Keep business logic in domain services

### Resources

- [BaseRepository Source](../server/infrastructure/database/repository/base-repository.ts)
- [Error Types](../server/infrastructure/database/repository/errors.ts)
- [Result Type](../shared/core/result.ts)
- [Maybe Type](../shared/core/maybe.ts)
- [Test Utils](../server/infrastructure/database/repository/test-utils.ts)

---

**Prepared by:** Kiro AI Assistant  
**Date:** 2026-02-27  
**Version:** 1.0  
**Status:** Phase 1 Complete
