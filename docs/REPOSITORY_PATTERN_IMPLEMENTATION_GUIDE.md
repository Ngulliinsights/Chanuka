# Repository Pattern Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing feature-specific repositories using the BaseRepository infrastructure. It includes code examples, common patterns, cache integration, and error handling best practices.

## Table of Contents

1. [Basic Repository Setup](#basic-repository-setup)
2. [Domain-Specific Methods](#domain-specific-methods)
3. [Cache Integration](#cache-integration)
4. [Error Handling](#error-handling)
5. [Transaction Management](#transaction-management)
6. [Testing Repositories](#testing-repositories)
7. [Common Patterns](#common-patterns)
8. [Best Practices](#best-practices)

## Basic Repository Setup

### Step 1: Create Repository File

Create a new repository file in your feature's infrastructure directory:

```
server/features/{feature-name}/infrastructure/repositories/{FeatureName}Repository.ts
```

### Step 2: Import Dependencies

```typescript
import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { {table_name} } from '@server/infrastructure/schema';
import { eq, and, inArray, desc, asc, sql, like } from 'drizzle-orm';
```

### Step 3: Define Types

```typescript
/**
 * Entity type (inferred from schema)
 */
export type {EntityName} = typeof {table_name}.$inferSelect;

/**
 * Insert type (for creating new entities)
 */
export type Insert{EntityName} = typeof {table_name}.$inferInsert;

/**
 * Query options for searches
 */
export interface {EntityName}QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}
```

### Step 4: Create Repository Class

```typescript
/**
 * {EntityName} repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new {EntityName}Repository();
 * 
 * // Find by ID
 * const result = await repository.findById('entity-uuid');
 * if (result.isOk && result.value !== null) {
 *   console.log('Found:', result.value);
 * }
 * ```
 */
export class {EntityName}Repository extends BaseRepository<{EntityName}> {
  constructor() {
    super({
      entityName: '{EntityName}',
      enableCache: true,
      cacheTTL: 600, // 10 minutes (adjust based on data volatility)
      enableLogging: true,
    });
  }

  // Domain-specific methods go here
}
```

## Domain-Specific Methods

### Read Operations

#### Simple Find by ID

```typescript
/**
 * Find entity by ID
 * 
 * @param id - Entity ID
 * @returns Result containing Maybe<Entity>
 */
async findById(id: string): Promise<Result<Maybe<{EntityName}>, Error>> {
  return this.executeRead(
    async (db) => {
      const results = await db
        .select()
        .from({table_name})
        .where(eq({table_name}.id, id))
        .limit(1);
      return results[0] ?? null;
    },
    `{entity}:id:${id}` // Cache key
  );
}
```

#### Find by Unique Field

```typescript
/**
 * Find entity by email (unique identifier)
 * 
 * @param email - Entity email
 * @returns Result containing Maybe<Entity>
 */
async findByEmail(email: string): Promise<Result<Maybe<{EntityName}>, Error>> {
  return this.executeRead(
    async (db) => {
      const results = await db
        .select()
        .from({table_name})
        .where(eq({table_name}.email, email.toLowerCase()))
        .limit(1);
      return results[0] ?? null;
    },
    `{entity}:email:${email.toLowerCase()}`
  );
}
```

#### Find Many with Filters

```typescript
/**
 * Find entities by status
 * 
 * @param status - Entity status
 * @param options - Query options (pagination, sorting)
 * @returns Result containing array of entities
 */
async findByStatus(
  status: string,
  options?: {EntityName}QueryOptions
): Promise<Result<{EntityName}[], Error>> {
  return this.executeRead(
    async (db) => {
      const baseQuery = db
        .select()
        .from({table_name})
        .where(eq({table_name}.status, status));

      // Apply sorting
      const sortedQuery = options?.sortBy
        ? (options.sortOrder === 'asc' 
            ? baseQuery.orderBy(asc({table_name}[options.sortBy]))
            : baseQuery.orderBy(desc({table_name}[options.sortBy])))
        : baseQuery.orderBy(desc({table_name}.created_at));

      // Apply pagination
      const limitedQuery = options?.limit 
        ? sortedQuery.limit(options.limit)
        : sortedQuery;
      
      const finalQuery = options?.offset
        ? limitedQuery.offset(options.offset)
        : limitedQuery;

      return await finalQuery;
    },
    `{entity}:status:${status}`
  );
}
```

#### Complex Search

```typescript
/**
 * Search entities by keywords with filters
 * 
 * @param keywords - Search keywords
 * @param filters - Search filters
 * @returns Result containing array of entities
 */
async search(
  keywords: string,
  filters?: {
    status?: string;
    category?: string;
    is_active?: boolean;
  }
): Promise<Result<{EntityName}[], Error>> {
  return this.executeRead(
    async (db) => {
      const searchPattern = `%${keywords.toLowerCase()}%`;
      
      // Build conditions
      const conditions = [
        like(sql`LOWER(${{table_name}.title})`, searchPattern)
      ];

      // Add filters
      if (filters?.status) {
        conditions.push(eq({table_name}.status, filters.status));
      }

      if (filters?.category) {
        conditions.push(eq({table_name}.category, filters.category));
      }

      if (filters?.is_active !== undefined) {
        conditions.push(eq({table_name}.is_active, filters.is_active));
      }

      return db
        .select()
        .from({table_name})
        .where(and(...conditions))
        .orderBy(desc({table_name}.created_at));
    }
    // No caching for search results (too many variations)
  );
}
```

#### Find by Multiple IDs

```typescript
/**
 * Find entities by IDs
 *
 * @param ids - Array of entity IDs
 * @returns Result containing array of entities
 */
async findByIds(ids: string[]): Promise<Result<{EntityName}[], Error>> {
  if (ids.length === 0) {
    return new Ok([]);
  }

  return this.executeRead(
    async (db) => {
      return db
        .select()
        .from({table_name})
        .where(inArray({table_name}.id, ids));
    }
    // No caching for ID-based queries (too many variations)
  );
}
```

### Write Operations

#### Create Entity

```typescript
/**
 * Create new entity
 * 
 * @param data - Entity data
 * @returns Result containing created entity
 */
async create(data: Insert{EntityName}): Promise<Result<{EntityName}, Error>> {
  return this.executeWrite(
    async (tx) => {
      const results = await tx
        .insert({table_name})
        .values(data)
        .returning();
      return results[0];
    },
    ['{entity}:*'] // Invalidate all entity caches
  );
}
```

#### Update Entity

```typescript
/**
 * Update entity
 * 
 * @param id - Entity ID
 * @param data - Partial entity data
 * @returns Result containing updated entity
 */
async update(
  id: string,
  data: Partial<Insert{EntityName}>
): Promise<Result<{EntityName}, Error>> {
  return this.executeWrite(
    async (tx) => {
      const results = await tx
        .update({table_name})
        .set({ ...data, updated_at: new Date() })
        .where(eq({table_name}.id, id))
        .returning();
      
      if (results.length === 0) {
        throw new Error(`{EntityName} not found: ${id}`);
      }
      
      return results[0];
    },
    [`{entity}:id:${id}`, '{entity}:*'] // Invalidate specific and all caches
  );
}
```

#### Delete Entity (Soft Delete)

```typescript
/**
 * Delete entity (soft delete by setting is_active to false)
 * 
 * @param id - Entity ID
 * @returns Result containing void
 */
async delete(id: string): Promise<Result<void, Error>> {
  return this.executeWrite(
    async (tx) => {
      const result = await tx
        .update({table_name})
        .set({ 
          is_active: false,
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .where(eq({table_name}.id, id));
      
      if (!result || result.rowCount === 0) {
        throw new Error(`{EntityName} not found: ${id}`);
      }
      return undefined;
    },
    [`{entity}:id:${id}`, '{entity}:*']
  );
}
```

#### Batch Operations

```typescript
/**
 * Create multiple entities in batch
 * 
 * @param data - Array of entity data
 * @returns Result containing created entities
 */
async createBatch(data: Insert{EntityName}[]): Promise<Result<{EntityName}[], Error>> {
  return this.executeBatchWrite(
    async (tx) => {
      const results = await tx
        .insert({table_name})
        .values(data)
        .returning();
      return results;
    },
    '{entity}:*'
  );
}

/**
 * Update multiple entities in batch
 * 
 * @param updates - Array of updates with entity ID and data
 * @returns Result containing updated entities
 */
async updateBatch(
  updates: Array<{ id: string; data: Partial<Insert{EntityName}> }>
): Promise<Result<{EntityName}[], Error>> {
  return this.executeBatchWrite(
    async (tx) => {
      const updatedEntities: {EntityName}[] = [];

      for (const update of updates) {
        const results = await tx
          .update({table_name})
          .set({ ...update.data, updated_at: new Date() })
          .where(eq({table_name}.id, update.id))
          .returning();
        
        if (results.length > 0) {
          updatedEntities.push(results[0]);
        }
      }

      return updatedEntities;
    },
    '{entity}:*'
  );
}
```

## Cache Integration

### Cache Key Patterns

```typescript
// Entity by ID
`{entity}:id:${id}`

// Entity by unique field
`{entity}:email:${email}`
`{entity}:username:${username}`

// List by filter
`{entity}:status:${status}`
`{entity}:category:${category}`

// Complex queries
`{entity}:search:${query}:${JSON.stringify(filters)}`

// Wildcard for invalidation
`{entity}:*` // Invalidates all entity caches
```

### Cache TTL Guidelines

```typescript
// High volatility (3-5 minutes)
cacheTTL: 300 // Real-time data, frequently changing

// Medium volatility (5-15 minutes)
cacheTTL: 600 // Moderate changes, bills, analytics

// Low volatility (30-60 minutes)
cacheTTL: 1800 // Rarely changes, users, sponsors

// Very low volatility (1-24 hours)
cacheTTL: 86400 // Configuration, feature flags
```

### Selective Caching

```typescript
// Cache expensive queries
async findByComplexCriteria(criteria: ComplexCriteria): Promise<Result<Entity[], Error>> {
  return this.executeRead(
    async (db) => {
      // Expensive query with joins
      return db
        .select()
        .from(table)
        .leftJoin(related_table, eq(table.id, related_table.entity_id))
        .where(/* complex conditions */);
    },
    `entity:complex:${JSON.stringify(criteria)}` // Cache it
  );
}

// Don't cache real-time data
async getLiveCount(): Promise<Result<number, Error>> {
  return this.executeRead(
    async (db) => {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(table);
      return Number(result[0]?.count ?? 0);
    }
    // No cache key - always fetch fresh
  );
}
```

### Cache Invalidation Strategies

```typescript
// Invalidate specific entity
async update(id: string, data: Partial<InsertEntity>): Promise<Result<Entity, Error>> {
  return this.executeWrite(
    async (tx) => { /* update logic */ },
    [
      `entity:id:${id}`,           // Specific entity
      `entity:email:${data.email}`, // If email changed
      'entity:*'                    // All lists
    ]
  );
}

// Invalidate related caches
async updateWithRelations(id: string, data: any): Promise<Result<Entity, Error>> {
  return this.executeWrite(
    async (tx) => { /* update logic */ },
    [
      `entity:id:${id}`,
      `related:entity:${id}`,
      'entity:*',
      'related:*'
    ]
  );
}

// Invalidate pattern
async createBatch(data: InsertEntity[]): Promise<Result<Entity[], Error>> {
  return this.executeBatchWrite(
    async (tx) => { /* batch create logic */ },
    'entity:*' // Invalidate all entity caches
  );
}
```

## Error Handling

### Using Result Type

```typescript
// In repository method
async findById(id: string): Promise<Result<Maybe<Entity>, Error>> {
  return this.executeRead(
    async (db) => {
      const results = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      return results[0] ?? null;
    },
    `entity:id:${id}`
  );
}

// In service layer
async getEntity(id: string): Promise<Entity | null> {
  const result = await this.repository.findById(id);
  
  if (result.isErr) {
    logger.error({ error: result.error }, 'Failed to find entity');
    throw result.error;
  }
  
  return result.value;
}
```

### Custom Error Handling

```typescript
async findByIdOrThrow(id: string): Promise<Result<Entity, Error>> {
  return this.executeRead(
    async (db) => {
      const results = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      
      if (!results[0]) {
        throw new NotFoundError('Entity', id);
      }
      
      return results[0];
    },
    `entity:id:${id}`
  );
}
```

## Transaction Management

### Simple Transaction

```typescript
async createWithRelation(
  entityData: InsertEntity,
  relationData: InsertRelation
): Promise<Result<Entity, Error>> {
  return this.executeWrite(
    async (tx) => {
      // Create entity
      const entityResults = await tx
        .insert(entities)
        .values(entityData)
        .returning();
      
      const entity = entityResults[0];
      
      // Create relation
      await tx
        .insert(relations)
        .values({
          ...relationData,
          entity_id: entity.id
        });
      
      return entity;
    },
    ['entity:*', 'relation:*']
  );
}
```

### Complex Transaction with Multiple Operations

```typescript
async transferOwnership(
  fromUserId: string,
  toUserId: string,
  entityIds: string[]
): Promise<Result<void, Error>> {
  return this.executeWrite(
    async (tx) => {
      // Update all entities
      await tx
        .update(entities)
        .set({ 
          owner_id: toUserId,
          updated_at: new Date()
        })
        .where(
          and(
            inArray(entities.id, entityIds),
            eq(entities.owner_id, fromUserId)
          )
        );
      
      // Log transfer
      await tx
        .insert(audit_logs)
        .values({
          action: 'transfer_ownership',
          from_user_id: fromUserId,
          to_user_id: toUserId,
          entity_ids: entityIds,
          timestamp: new Date()
        });
      
      return undefined;
    },
    ['entity:*', 'audit:*']
  );
}
```

## Testing Repositories

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityRepository } from './EntityRepository';

describe('EntityRepository', () => {
  let repository: EntityRepository;

  beforeEach(() => {
    repository = new EntityRepository();
  });

  describe('findById', () => {
    it('should find entity by ID', async () => {
      const mockEntity = { id: '1', name: 'Test' };
      
      // Mock database operation
      const result = await repository.findById('1');
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockEntity);
      }
    });

    it('should return null when entity not found', async () => {
      const result = await repository.findById('nonexistent');
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle errors gracefully', async () => {
      // Mock database error
      const result = await repository.findById('error-id');
      
      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('create', () => {
    it('should create entity successfully', async () => {
      const data = { name: 'New Entity' };
      
      const result = await repository.create(data);
      
      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toHaveProperty('id');
        expect(result.value.name).toBe('New Entity');
      }
    });
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EntityRepository } from './EntityRepository';
import { setupTestDatabase, teardownTestDatabase } from '@server/test-utils';

describe('EntityRepository Integration Tests', () => {
  let repository: EntityRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repository = new EntityRepository();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should perform full CRUD cycle', async () => {
    // Create
    const createResult = await repository.create({ name: 'Test Entity' });
    expect(createResult.isOk).toBe(true);
    const entity = createResult.value!;

    // Read
    const readResult = await repository.findById(entity.id);
    expect(readResult.isOk).toBe(true);
    expect(readResult.value).toEqual(entity);

    // Update
    const updateResult = await repository.update(entity.id, { name: 'Updated' });
    expect(updateResult.isOk).toBe(true);
    expect(updateResult.value!.name).toBe('Updated');

    // Delete
    const deleteResult = await repository.delete(entity.id);
    expect(deleteResult.isOk).toBe(true);

    // Verify deletion
    const verifyResult = await repository.findById(entity.id);
    expect(verifyResult.isOk).toBe(true);
    expect(verifyResult.value).toBeNull();
  });
});
```

## Common Patterns

### Pagination Pattern

```typescript
async findPaginated(
  filters: EntityFilters,
  page: number = 1,
  limit: number = 20
): Promise<Result<{ data: Entity[]; total: number; page: number; totalPages: number }, Error>> {
  return this.executeRead(
    async (db) => {
      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(table)
        .where(/* filters */);
      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated data
      const offset = (page - 1) * limit;
      const data = await db
        .select()
        .from(table)
        .where(/* filters */)
        .limit(limit)
        .offset(offset);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    },
    `entity:page:${page}:${limit}:${JSON.stringify(filters)}`
  );
}
```

### Aggregation Pattern

```typescript
async getStatistics(): Promise<Result<EntityStatistics, Error>> {
  return this.executeRead(
    async (db) => {
      const result = await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
          inactive: sql<number>`COUNT(*) FILTER (WHERE is_active = false)`,
          avgValue: sql<number>`AVG(value)`
        })
        .from(table);

      return {
        total: Number(result[0]?.total ?? 0),
        active: Number(result[0]?.active ?? 0),
        inactive: Number(result[0]?.inactive ?? 0),
        avgValue: Number(result[0]?.avgValue ?? 0)
      };
    },
    'entity:statistics'
  );
}
```

### Relationship Pattern

```typescript
async findWithRelations(id: string): Promise<Result<EntityWithRelations, Error>> {
  return this.executeRead(
    async (db) => {
      const entity = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);

      if (!entity[0]) {
        return null;
      }

      const relations = await db
        .select()
        .from(related_table)
        .where(eq(related_table.entity_id, id));

      return {
        ...entity[0],
        relations
      };
    },
    `entity:with-relations:${id}`
  );
}
```

## Best Practices

### 1. Use Domain-Specific Method Names

```typescript
// ✅ Good: Reflects business operation
async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>>

// ❌ Bad: Generic CRUD
async findById(id: string): Promise<Result<Maybe<Entity>, Error>>
```

### 2. Cache Expensive Operations

```typescript
// ✅ Good: Cache expensive query
async searchWithComplexFilters(filters: ComplexFilters): Promise<Result<Entity[], Error>> {
  return this.executeRead(
    async (db) => { /* expensive query */ },
    `entity:search:${JSON.stringify(filters)}` // Cache it
  );
}
```

### 3. Invalidate Related Caches

```typescript
// ✅ Good: Invalidate all related caches
async update(id: string, data: Partial<InsertEntity>): Promise<Result<Entity, Error>> {
  return this.executeWrite(
    async (tx) => { /* update */ },
    [`entity:id:${id}`, 'entity:*', 'related:*']
  );
}
```

### 4. Use Transactions for Multi-Step Operations

```typescript
// ✅ Good: Wrap in transaction
async createWithRelations(data: CreateData): Promise<Result<Entity, Error>> {
  return this.executeWrite(
    async (tx) => {
      const entity = await tx.insert(entities).values(data.entity).returning();
      await tx.insert(relations).values(data.relations);
      return entity[0];
    },
    ['entity:*', 'relation:*']
  );
}
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Good: Return Result type
async findById(id: string): Promise<Result<Maybe<Entity>, Error>> {
  return this.executeRead(
    async (db) => { /* query */ },
    `entity:id:${id}`
  );
}

// In service layer
const result = await repository.findById(id);
if (result.isErr) {
  logger.error({ error: result.error }, 'Failed to find entity');
  throw result.error;
}
```

### 6. Document Public Methods

```typescript
/**
 * Find entity by unique identifier
 * 
 * @param identifier - Unique identifier
 * @returns Result containing Maybe<Entity>
 * 
 * @example
 * ```typescript
 * const result = await repository.findByIdentifier('ABC123');
 * if (result.isOk && result.value !== null) {
 *   console.log('Found:', result.value);
 * }
 * ```
 */
async findByIdentifier(identifier: string): Promise<Result<Maybe<Entity>, Error>>
```

### 7. Use Type-Safe Queries

```typescript
// ✅ Good: Type-safe with Drizzle ORM
const results = await db
  .select()
  .from(entities)
  .where(eq(entities.status, 'active'));

// ❌ Bad: Raw SQL strings
const results = await db.execute(sql`SELECT * FROM entities WHERE status = 'active'`);
```

### 8. Optimize for Common Use Cases

```typescript
// ✅ Good: Separate methods for common queries
async findActive(): Promise<Result<Entity[], Error>>
async findByStatus(status: string): Promise<Result<Entity[], Error>>
async findRecent(limit: number): Promise<Result<Entity[], Error>>

// ❌ Bad: One generic method with many options
async find(options: ComplexOptions): Promise<Result<Entity[], Error>>
```

## Summary

- Extend `BaseRepository` for all feature repositories
- Use domain-specific method names that reflect business operations
- Implement caching for expensive queries with appropriate TTL
- Invalidate related caches on write operations
- Use transactions for multi-step operations
- Return `Result` type for type-safe error handling
- Document public methods with examples
- Test repositories with unit and integration tests
- Follow naming conventions and best practices

## References

- [BaseRepository Implementation](../server/infrastructure/database/repository/base-repository.ts)
- [Repository Pattern Decision Matrix](./REPOSITORY_PATTERN_DECISION_MATRIX.md)
- [Database Connection Management](../server/infrastructure/database/connection-manager.ts)
- [Error Handling Guide](./ERROR_HANDLING_GUIDE.md)
