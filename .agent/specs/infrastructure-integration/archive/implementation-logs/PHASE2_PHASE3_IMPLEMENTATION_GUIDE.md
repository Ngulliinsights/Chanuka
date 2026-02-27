# Phase 2 & Phase 3 Infrastructure Integration - Implementation Guide

**Status:** Implementation Guide  
**Created:** 2026-02-27  
**Purpose:** Comprehensive guide for completing infrastructure integration across all features

---

## Executive Summary

This guide provides step-by-step instructions for integrating infrastructure services (security, caching, error handling, validation) into all remaining features. The integration has been standardized through helper utilities that make adoption consistent and straightforward.

### New Infrastructure Utilities Created

1. **`server/infrastructure/cache/cache-keys.ts`**
   - Centralized cache key generation
   - Cache invalidation service
   - TTL constants for all feature types

2. **`server/infrastructure/validation/validation-helpers.ts`**
   - Common validation schemas (pagination, search, dates, etc.)
   - Validation helper functions
   - Feature-specific schemas (bills, users, comments, analytics)

3. **`server/infrastructure/integration/feature-integration-helper.ts`**
   - Unified integration interface
   - Decorators for caching and cache invalidation
   - Feature-specific helper factory

---

## Phase 2: Performance & Reliability

### TASK-2.1: Cache Deployment

#### Status by Feature

| Feature | Current Status | Cache Hit Rate Target | Priority |
|---------|---------------|----------------------|----------|
| Bills | Partial | 70% | High |
| Users | ✅ Complete | 70% | - |
| Search | ✅ Complete | 70% | - |
| Analytics | Not Started | 70% | High |
| Recommendation | ✅ Complete | 60% | - |
| Pretext Detection | Not Started | 60% | Medium |
| Constitutional Intelligence | Not Started | 60% | Medium |
| Argument Intelligence | Not Started | 60% | Medium |
| Sponsors | Not Started | 60% | Medium |
| Government Data | Not Started | 60% | Medium |
| Advocacy | Not Started | 60% | Low |
| USSD | Not Started | 60% | Low |
| Notifications | Not Started | 60% | Low |
| Community | Not Started | 70% | High |

#### Implementation Pattern

```typescript
import { cacheKeys, CACHE_TTL } from '@server/infrastructure/cache/cache-keys';
import { cacheService } from '@server/infrastructure/cache';
import { Cacheable, InvalidateCache } from '@server/infrastructure/integration/feature-integration-helper';

export class FeatureService {
  /**
   * Get entity with caching
   */
  @Cacheable(
    (id: string) => cacheKeys.entity('feature-name', id),
    CACHE_TTL.MEDIUM
  )
  async getById(id: string): Promise<Entity> {
    // Implementation
    return await db.query.entities.findFirst({
      where: eq(entities.id, id)
    });
  }

  /**
   * Update entity with cache invalidation
   */
  @InvalidateCache((id: string) => [
    cacheKeys.entity('feature-name', id),
    cacheKeys.list('feature-name')
  ])
  async update(id: string, data: Partial<Entity>): Promise<Entity> {
    // Implementation
    return await db.update(entities)
      .set(data)
      .where(eq(entities.id, id));
  }

  /**
   * Search with caching
   */
  async search(query: string, page: number, limit: number): Promise<Entity[]> {
    const cacheKey = cacheKeys.search(query, { page, limit });
    
    // Check cache
    const cached = await cacheService.get<Entity[]>(cacheKey);
    if (cached) return cached;

    // Execute search
    const results = await db.query.entities.findMany({
      where: ilike(entities.name, `%${query}%`),
      limit,
      offset: (page - 1) * limit
    });

    // Cache results
    await cacheService.set(cacheKey, results, CACHE_TTL.SEARCH);
    
    return results;
  }
}
```

#### Cache TTL Recommendations

```typescript
// From cache-keys.ts
export const CACHE_TTL = {
  BILLS: 300,             // 5 minutes (frequently updated)
  USERS: 1800,            // 30 minutes (moderately stable)
  SEARCH: 300,            // 5 minutes (dynamic)
  ANALYTICS: 900,         // 15 minutes (aggregated data)
  RECOMMENDATIONS: 1800,  // 30 minutes (ML-based)
  COMMUNITY: 180,         // 3 minutes (highly dynamic)
  SPONSORS: 3600,         // 1 hour (stable)
  GOVERNMENT_DATA: 3600,  // 1 hour (external API)
};
```

---

### TASK-2.2: Error Handling Deployment

#### Status by Feature

| Feature | Current Status | Target Coverage | Priority |
|---------|---------------|-----------------|----------|
| Bills | Partial | 90% | High |
| Users | ✅ Complete | 90% | - |
| Community | Not Started | 90% | High |
| Search | Not Started | 90% | High |
| Analytics | Not Started | 90% | Medium |
| All Others | Not Started | 90% | Medium |

#### Implementation Pattern

```typescript
import { Result, ok, err } from 'neverthrow';
import { logger } from '@server/infrastructure/observability';

export class FeatureService {
  /**
   * Get entity with Result type
   */
  async getById(id: string): Promise<Result<Entity, Error>> {
    try {
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, id)
      });

      if (!entity) {
        return err(new Error(`Entity not found: ${id}`));
      }

      return ok(entity);
    } catch (error) {
      logger.error('Failed to get entity', { error, id });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create entity with Result type
   */
  async create(data: CreateEntityDTO): Promise<Result<Entity, Error>> {
    try {
      const entity = await db.insert(entities).values(data).returning();
      return ok(entity[0]);
    } catch (error) {
      logger.error('Failed to create entity', { error, data });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update entity with Result type
   */
  async update(id: string, data: Partial<Entity>): Promise<Result<Entity, Error>> {
    try {
      const updated = await db.update(entities)
        .set(data)
        .where(eq(entities.id, id))
        .returning();

      if (updated.length === 0) {
        return err(new Error(`Entity not found: ${id}`));
      }

      return ok(updated[0]);
    } catch (error) {
      logger.error('Failed to update entity', { error, id, data });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

#### Error Handling in Routes

```typescript
import { sendResult } from '@server/infrastructure/error-handling';

router.get('/:id', async (req, res) => {
  const result = await featureService.getById(req.params.id);
  sendResult(res, result);
});

router.post('/', async (req, res) => {
  const result = await featureService.create(req.body);
  sendResult(res, result);
});
```

---

### TASK-2.3: Validation Deployment

#### Status by Feature

| Feature | Current Status | Target Coverage | Priority |
|---------|---------------|-----------------|----------|
| Bills | Partial | 90% | High |
| Users | Partial | 90% | High |
| Community | Not Started | 90% | High |
| Search | Not Started | 90% | High |
| All Others | Not Started | 90% | Medium |

#### Implementation Pattern

```typescript
import { z } from 'zod';
import { CommonSchemas, validateData } from '@server/infrastructure/validation/validation-helpers';
import { validateBody, validateQuery } from '@server/infrastructure/validation';

// Define schemas
const CreateEntitySchema = z.object({
  name: CommonSchemas.title,
  description: CommonSchemas.description,
  status: z.enum(['active', 'inactive']).default('active'),
});

const UpdateEntitySchema = CreateEntitySchema.partial();

const SearchEntitySchema = z.object({
  query: CommonSchemas.searchQuery,
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
  status: z.enum(['active', 'inactive']).optional(),
});

// Use in routes
router.post('/', validateBody(CreateEntitySchema), async (req, res) => {
  // req.body is now typed and validated
  const result = await featureService.create(req.body);
  sendResult(res, result);
});

router.get('/search', validateQuery(SearchEntitySchema), async (req, res) => {
  // req.query is now typed and validated
  const result = await featureService.search(req.query);
  sendResult(res, result);
});

// Use in services
export class FeatureService {
  async create(data: unknown): Promise<Result<Entity, Error>> {
    // Validate input
    const validation = await validateData(CreateEntitySchema, data);
    if (!validation.success) {
      return err(new Error(validation.errors?.map(e => e.message).join(', ')));
    }

    // Use validated data
    const validatedData = validation.data!;
    return await this.createInternal(validatedData);
  }
}
```

---

### TASK-2.4: Transaction Audit

#### Multi-Step Operations Requiring Transactions

1. **User Registration**
   ```typescript
   await withTransaction(async (tx) => {
     const user = await tx.insert(users).values(userData);
     await tx.insert(user_profiles).values({ user_id: user.id, ...profileData });
     await tx.insert(user_permissions).values({ user_id: user.id, ...permissions });
     return user;
   });
   ```

2. **Bill Creation**
   ```typescript
   await withTransaction(async (tx) => {
     const bill = await tx.insert(bills).values(billData);
     await tx.insert(bill_metadata).values({ bill_id: bill.id, ...metadata });
     await tx.insert(bill_relationships).values(relationships);
     return bill;
   });
   ```

3. **Comment with Vote**
   ```typescript
   await withTransaction(async (tx) => {
     const comment = await tx.insert(comments).values(commentData);
     await tx.insert(votes).values({ comment_id: comment.id, ...voteData });
     await tx.insert(notifications).values({ user_id: targetUserId, ...notifData });
     return comment;
   });
   ```

4. **Bill Status Update**
   ```typescript
   await withTransaction(async (tx) => {
     await tx.update(bills).set({ status: newStatus }).where(eq(bills.id, billId));
     await tx.insert(bill_history).values({ bill_id: billId, status: newStatus });
     await tx.insert(notifications).values(notificationData);
   });
   ```

---

## Phase 3: Remaining Features

### TASK-3.1: Security Rollout

#### Features Requiring Security Integration

1. **Pretext Detection** - Priority: High
2. **Recommendation** - Priority: High
3. **Argument Intelligence** - Priority: High
4. **Constitutional Intelligence** - Priority: High
5. **Advocacy** - Priority: Medium
6. **Government Data** - Priority: Medium
7. **USSD** - Priority: Medium
8. **Sponsors** - Priority: Medium
9. **Analytics** - Priority: High
10. **Notifications** - Priority: Medium

#### Security Integration Pattern

```typescript
import { secureQueryBuilderService } from '@server/features/security';
import { inputSanitizationService, queryValidationService } from '@server/features/security';

export class FeatureService {
  /**
   * Get entity with security
   */
  async getById(id: string): Promise<Result<Entity, Error>> {
    try {
      // Validate input
      const validation = queryValidationService.validateInputs([id]);
      if (validation.hasErrors()) {
        return err(new Error(validation.getErrorMessage()));
      }

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        'SELECT * FROM entities WHERE id = ${id}',
        { id }
      );

      // Execute query
      const entity = await db.execute(query.sql, query.params);

      // Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(entity);

      return ok(sanitized);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Search with security
   */
  async search(searchTerm: string, page: number, limit: number): Promise<Result<Entity[], Error>> {
    try {
      // Sanitize search term
      const sanitized = inputSanitizationService.sanitizeString(searchTerm);

      // Create safe LIKE pattern
      const pattern = secureQueryBuilderService.createSafeLikePattern(sanitized);

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        `SELECT * FROM entities 
         WHERE name ILIKE \${pattern} 
         LIMIT \${limit} OFFSET \${offset}`,
        {
          pattern,
          limit,
          offset: (page - 1) * limit
        }
      );

      // Execute query
      const results = await db.execute(query.sql, query.params);

      // Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(results);

      return ok(sanitized);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create with security
   */
  async create(data: CreateEntityDTO): Promise<Result<Entity, Error>> {
    try {
      // Sanitize inputs
      const sanitizedName = inputSanitizationService.sanitizeString(data.name);
      const sanitizedDescription = inputSanitizationService.sanitizeHtml(data.description);

      // Validate inputs
      const validation = queryValidationService.validateInputs([
        sanitizedName,
        sanitizedDescription
      ]);

      if (validation.hasErrors()) {
        return err(new Error(validation.getErrorMessage()));
      }

      // Create entity
      const entity = await db.insert(entities).values({
        name: sanitizedName,
        description: sanitizedDescription
      });

      return ok(entity);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

---

### TASK-3.2: Cache Rollout (Remaining Features)

Apply caching pattern from TASK-2.1 to:
- Pretext Detection (TTL: 1800s)
- Constitutional Intelligence (TTL: 1800s)
- Argument Intelligence (TTL: 1800s)
- Sponsors (TTL: 3600s)
- Government Data (TTL: 3600s)

---

### TASK-3.3: Error Rollout (Remaining Features)

Apply Result type pattern from TASK-2.2 to all remaining features.

---

### TASK-3.4: Validation Rollout (Remaining Features)

Apply validation pattern from TASK-2.3 to all remaining features.

---

## Implementation Checklist

### For Each Feature

- [ ] **Security Integration**
  - [ ] Replace raw SQL with `secureQueryBuilderService`
  - [ ] Add input sanitization
  - [ ] Add input validation
  - [ ] Add output sanitization
  - [ ] Add security audit logging

- [ ] **Caching Integration**
  - [ ] Identify cacheable operations
  - [ ] Add cache keys using `cacheKeys` helper
  - [ ] Set appropriate TTLs
  - [ ] Add cache invalidation on writes
  - [ ] Monitor cache hit rates

- [ ] **Error Handling Integration**
  - [ ] Convert to Result types
  - [ ] Add error context
  - [ ] Add error logging
  - [ ] Use `sendResult` in routes

- [ ] **Validation Integration**
  - [ ] Define Zod schemas
  - [ ] Add validation middleware to routes
  - [ ] Add validation in services
  - [ ] Return validation errors clearly

- [ ] **Testing**
  - [ ] Write security tests (SQL injection, XSS)
  - [ ] Write cache tests (hit/miss, invalidation)
  - [ ] Write error handling tests
  - [ ] Write validation tests
  - [ ] Achieve >85% coverage

---

## Priority Order

### Week 1: High-Traffic Features
1. Analytics (caching, error handling, validation)
2. Community (security, caching, error handling)
3. Bills (complete remaining integration)

### Week 2: Security-Critical Features
4. Pretext Detection (full integration)
5. Recommendation (complete remaining integration)
6. Argument Intelligence (full integration)
7. Constitutional Intelligence (full integration)

### Week 3: Remaining Features
8. Advocacy (full integration)
9. Government Data (full integration)
10. USSD (full integration)
11. Sponsors (complete remaining integration)
12. Notifications (full integration)

### Week 4: Testing & Documentation
13. Comprehensive testing
14. Performance testing
15. Security audit
16. Documentation

---

## Success Metrics

### Phase 2 Targets
- Cache hit rate > 70% for high-traffic endpoints
- Error rate < 0.1%
- Validation coverage > 90%
- Transaction success rate > 99.9%

### Phase 3 Targets
- 100% security integration
- Zero SQL injection vulnerabilities
- Zero XSS vulnerabilities
- All tests passing (>85% coverage)

---

## Next Steps

1. **Immediate**: Start with Analytics feature (high traffic, clear boundaries)
2. **Week 1**: Complete high-traffic features
3. **Week 2**: Complete security-critical features
4. **Week 3**: Complete remaining features
5. **Week 4**: Testing, audit, documentation

---

## Support Resources

- **Helper Utilities**: `server/infrastructure/integration/feature-integration-helper.ts`
- **Cache Keys**: `server/infrastructure/cache/cache-keys.ts`
- **Validation Helpers**: `server/infrastructure/validation/validation-helpers.ts`
- **Security Services**: `server/features/security/`
- **Error Handling**: `server/infrastructure/error-handling/`

---

**Document Status:** ✅ Complete  
**Last Updated:** 2026-02-27  
**Next Review:** After Week 1 implementation
