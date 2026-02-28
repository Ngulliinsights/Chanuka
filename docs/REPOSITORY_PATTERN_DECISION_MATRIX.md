# Repository Pattern Decision Matrix

## Overview

This document provides guidance on when to use different data access patterns in the legislative transparency platform. The goal is to help developers choose the right pattern based on query complexity, domain logic, and caching needs.

## Decision Matrix

| Scenario | Pattern | Rationale | Example |
|----------|---------|-----------|---------|
| **Simple CRUD (single table, no joins)** | Direct `readDatabase`/`writeDatabase` | Minimal overhead, no abstraction needed | Feature flags, alert preferences, simple lookup tables |
| **Complex queries (joins, aggregations)** | Repository Pattern | Encapsulates complexity, testable, cacheable | Bills search, user search with filters |
| **Domain logic in queries** | Repository Pattern | Domain logic belongs in repository methods | Bill status transitions, user role management |
| **Multiple related entities** | Repository Pattern | Manages relationships, ensures consistency | Bill with sponsors, user with profile |
| **High-frequency queries** | Repository Pattern + Caching | Cache at repository level for performance | Bill details, user profiles |
| **Write-heavy operations** | Direct `writeDatabase` + `withTransaction` | Transaction support, retry logic | Audit logs, metrics collection |
| **Read-heavy operations** | Repository Pattern + Caching | Maximize cache hits | Government data, sponsor information |
| **Simple lookups by ID** | Direct `readDatabase` | No need for repository abstraction | Configuration values, feature flags |
| **Batch operations** | Repository Pattern | Encapsulates batch logic, transaction management | Bulk bill imports, user batch updates |
| **Real-time data** | Direct `readDatabase` | Avoid caching stale data | Live vote counts, real-time notifications |

## Pattern Details

### Pattern 1: Direct Database Access

**When to use:**
- Simple CRUD operations on a single table
- No complex business logic
- No caching requirements
- Minimal query complexity

**Implementation:**
```typescript
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';

// Read operation
async function getFeatureFlag(key: string) {
  const db = await readDatabase();
  const results = await db
    .select()
    .from(feature_flags)
    .where(eq(feature_flags.key, key))
    .limit(1);
  return results[0] || null;
}

// Write operation
async function updateFeatureFlag(key: string, enabled: boolean) {
  return withTransaction(async (tx) => {
    const results = await tx
      .update(feature_flags)
      .set({ enabled, updated_at: new Date() })
      .where(eq(feature_flags.key, key))
      .returning();
    return results[0];
  });
}
```

**Advantages:**
- Minimal code overhead
- Direct control over queries
- No abstraction layer to maintain
- Fast for simple operations

**Disadvantages:**
- No built-in caching
- No query reusability
- Harder to test in isolation
- No centralized error handling

### Pattern 2: Repository Pattern

**When to use:**
- Complex queries with joins or aggregations
- Domain-specific business logic
- Caching requirements
- Query reusability across services
- Need for testability

**Implementation:**
```typescript
import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';

export class BillRepository extends BaseRepository<Bill> {
  constructor() {
    super({
      entityName: 'Bill',
      enableCache: true,
      cacheTTL: 600, // 10 minutes
      enableLogging: true,
    });
  }

  /**
   * Find bills by status with caching
   */
  async findByStatus(status: string): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(bills)
          .where(eq(bills.status, status))
          .orderBy(desc(bills.introduced_date));
      },
      `bill:status:${status}` // Cache key
    );
  }

  /**
   * Search bills with complex filters
   */
  async searchBills(query: string, filters: BillFilters): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = [
          like(sql`LOWER(${bills.title})`, `%${query.toLowerCase()}%`)
        ];

        if (filters.status) {
          conditions.push(eq(bills.status, filters.status));
        }

        if (filters.category) {
          conditions.push(eq(bills.category, filters.category));
        }

        return db
          .select()
          .from(bills)
          .where(and(...conditions))
          .orderBy(desc(bills.introduced_date));
      },
      `bill:search:${query}:${JSON.stringify(filters)}` // Cache key
    );
  }

  /**
   * Create bill with transaction
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
}
```

**Advantages:**
- Built-in caching with automatic invalidation
- Centralized error handling
- Transaction support with retry logic
- Testable in isolation
- Query reusability
- Domain-specific methods

**Disadvantages:**
- Additional abstraction layer
- More code to maintain
- Slight performance overhead for simple queries

### Pattern 3: Repository Pattern with Advanced Caching

**When to use:**
- High-frequency read operations
- Expensive queries (joins, aggregations)
- Low data volatility
- Performance-critical operations

**Implementation:**
```typescript
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super({
      entityName: 'User',
      enableCache: true,
      cacheTTL: 1800, // 30 minutes (low volatility)
      enableLogging: true,
    });
  }

  /**
   * Find user by email with aggressive caching
   */
  async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        return results[0] ?? null;
      },
      `user:email:${email.toLowerCase()}` // Cache key
    );
  }

  /**
   * Get user profile with related data
   */
  async getUserProfile(userId: string): Promise<Result<Maybe<UserProfile>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, userId))
          .limit(1);
        return results[0] ?? null;
      },
      `user:profile:${userId}` // Cache key
    );
  }

  /**
   * Update user with cache invalidation
   */
  async update(id: string, data: Partial<InsertUser>): Promise<Result<User, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(users)
          .set({ ...data, updated_at: new Date() })
          .where(eq(users.id, id))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`User not found: ${id}`);
        }
        
        return results[0];
      },
      [`user:id:${id}`, `user:email:*`, `user:profile:${id}`, 'user:*'] // Invalidate related caches
    );
  }
}
```

**Cache TTL Recommendations:**
- **High volatility** (community, search, real-time data): 3-5 minutes
- **Medium volatility** (bills, analytics, notifications): 5-15 minutes
- **Low volatility** (users, sponsors, government data): 30-60 minutes
- **Very low volatility** (configuration, feature flags): 1-24 hours

## Decision Flowchart

```
┌─────────────────────────────────────┐
│ Need to access database?            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Is it a simple CRUD operation       │
│ on a single table?                  │
└────────┬────────────────────────┬───┘
         │ YES                    │ NO
         ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Use Direct Database │  │ Does it involve     │
│ Access              │  │ complex queries or  │
│                     │  │ domain logic?       │
└─────────────────────┘  └────────┬────────┬───┘
                                  │ YES    │ NO
                                  ▼        ▼
                         ┌─────────────────────┐
                         │ Use Repository      │
                         │ Pattern             │
                         └────────┬────────────┘
                                  │
                                  ▼
                         ┌─────────────────────┐
                         │ Is it read-heavy    │
                         │ or expensive?       │
                         └────────┬────────┬───┘
                                  │ YES    │ NO
                                  ▼        ▼
                         ┌─────────────────────┐
                         │ Enable Caching      │
                         │ (set appropriate    │
                         │ TTL)                │
                         └─────────────────────┘
```

## Examples by Feature

### Feature Flags (Direct Database Access)
```typescript
// Simple CRUD, no caching needed
async function getFeatureFlag(key: string) {
  const db = await readDatabase();
  const results = await db
    .select()
    .from(feature_flags)
    .where(eq(feature_flags.key, key))
    .limit(1);
  return results[0] || null;
}
```

### Bills (Repository Pattern with Caching)
```typescript
// Complex queries, domain logic, caching
export class BillRepository extends BaseRepository<Bill> {
  async searchBills(query: string, filters: BillFilters): Promise<Result<Bill[], Error>> {
    // Complex search with caching
  }
  
  async findByStatus(status: string): Promise<Result<Bill[], Error>> {
    // Domain-specific query with caching
  }
}
```

### Users (Repository Pattern with Aggressive Caching)
```typescript
// High-frequency reads, low volatility
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super({
      entityName: 'User',
      enableCache: true,
      cacheTTL: 1800, // 30 minutes
    });
  }
  
  async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
    // Cached user lookup
  }
}
```

### Audit Logs (Direct Database Access for Writes)
```typescript
// Write-heavy, no caching, transaction support
async function logAuditEvent(event: AuditEvent) {
  return withTransaction(async (tx) => {
    await tx.insert(audit_logs).values(event);
  });
}
```

## Anti-Patterns to Avoid

### ❌ Generic Repository Anti-Pattern
```typescript
// DON'T: Generic CRUD methods that don't reflect domain
class GenericRepository<T> {
  findById(id: string) { }
  findAll() { }
  create(data: T) { }
  update(id: string, data: T) { }
  delete(id: string) { }
}
```

**Why it's bad:**
- Doesn't reflect domain operations
- Encourages anemic domain models
- No business logic encapsulation
- Hard to optimize for specific use cases

### ✅ Domain-Specific Repository
```typescript
// DO: Domain-specific methods that reflect business operations
class BillRepository extends BaseRepository<Bill> {
  findByBillNumber(billNumber: string) { }
  findByAffectedCounties(counties: string[]) { }
  findPendingReview() { }
  markAsReviewed(id: string) { }
}
```

### ❌ Over-Caching
```typescript
// DON'T: Cache real-time or frequently changing data
async function getLiveVoteCount(billId: string) {
  return this.executeRead(
    async (db) => { /* query */ },
    `vote:count:${billId}` // BAD: Caching live data
  );
}
```

### ✅ Selective Caching
```typescript
// DO: Cache stable data, skip caching for real-time data
async function getLiveVoteCount(billId: string) {
  return this.executeRead(
    async (db) => { /* query */ }
    // No cache key - always fetch fresh data
  );
}
```

### ❌ Repository for Everything
```typescript
// DON'T: Use repository for simple lookups
class ConfigRepository extends BaseRepository<Config> {
  async getValue(key: string) { /* simple lookup */ }
}
```

### ✅ Direct Access for Simple Operations
```typescript
// DO: Use direct database access for simple operations
async function getConfigValue(key: string) {
  const db = await readDatabase();
  const results = await db
    .select()
    .from(config)
    .where(eq(config.key, key))
    .limit(1);
  return results[0]?.value || null;
}
```

## Migration Guide

### From Direct Database Access to Repository

**Before:**
```typescript
async function getBillsByStatus(status: string) {
  const db = await readDatabase();
  return db
    .select()
    .from(bills)
    .where(eq(bills.status, status));
}
```

**After:**
```typescript
class BillRepository extends BaseRepository<Bill> {
  async findByStatus(status: string): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(bills)
          .where(eq(bills.status, status));
      },
      `bill:status:${status}`
    );
  }
}
```

### From Storage Pattern to Repository

**Before (Deprecated):**
```typescript
class BillStorage {
  async getBill(id: string) { }
  async saveBill(bill: Bill) { }
}
```

**After:**
```typescript
class BillRepository extends BaseRepository<Bill> {
  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> { }
  async create(data: InsertBill): Promise<Result<Bill, Error>> { }
}
```

## Summary

- **Use Direct Database Access** for simple CRUD operations on single tables
- **Use Repository Pattern** for complex queries, domain logic, and caching needs
- **Enable Caching** for read-heavy operations with appropriate TTL based on data volatility
- **Avoid Generic Repositories** - use domain-specific methods instead
- **Don't Over-Cache** - skip caching for real-time or frequently changing data
- **Follow the Decision Flowchart** when in doubt

## References

- [BaseRepository Implementation](../server/infrastructure/database/repository/base-repository.ts)
- [BillRepository Example](../server/features/bills/infrastructure/repositories/BillRepository.ts)
- [UserRepository Example](../server/features/users/infrastructure/UserRepository.ts)
- [Database Connection Management](../server/infrastructure/database/connection-manager.ts)
