# Phase 2 Implementation Guide

**Created:** 2026-02-27  
**Status:** Active  
**Objective:** Systematic integration of validation, caching, and security across all features

---

## Overview

Phase 2 builds on Phase 1's validation consolidation by applying shared infrastructure (validation, caching, security) to all 13+ features systematically.

**Phase 1 Achievements:**
- ✅ Validation infrastructure consolidated
- ✅ Server imports from shared validation
- ✅ Deprecated schemas marked
- ✅ Architecture documented

**Phase 2 Goals:**
- Apply validation to all features (90%+ coverage)
- Apply caching to all features (70%+ hit rate)
- Ensure security across all features (100% compliance)
- Remove deprecated schemas
- Comprehensive testing

---

## Integration Pattern

Every feature follows this pattern:

### 1. Validation Integration

**Steps:**
1. Create feature-specific validation schemas in feature folder
2. Import primitive schemas from `@shared/validation/schemas/common`
3. Apply validation to service methods using `validateData()`
4. Add validation middleware to routes
5. Write validation tests

**Example:**
```typescript
// server/features/[feature]/application/[feature]-validation.schemas.ts
import { z } from 'zod';
import { uuidSchema, emailSchema } from '@shared/validation/schemas/common';

export const CreateFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema, // Import from shared
  userId: uuidSchema, // Import from shared
});

// In service method
const validation = await validateData(CreateFeatureSchema, input);
if (!validation.success) {
  return Err(new ValidationError('Invalid input', validation.errors));
}
```

### 2. Caching Integration

**Steps:**
1. Import cache utilities from `server/infrastructure/cache/cache-keys.ts`
2. Add caching to read methods
3. Add cache invalidation to write methods
4. Configure appropriate TTL
5. Write cache tests

**Example:**
```typescript
// In service method
import { cacheKeys } from '@server/infrastructure/cache/cache-keys';

async getById(id: string): Promise<Result<Feature, Error>> {
  const cacheKey = cacheKeys.feature(id);
  
  // Try cache first
  const cached = await this.cache.get(cacheKey);
  if (cached) return Ok(cached);
  
  // Query database
  const result = await readDatabase(async (db) => {
    return await db.query.features.findFirst({ where: eq(features.id, id) });
  });
  
  // Cache result
  if (result) {
    await this.cache.set(cacheKey, result, 3600); // 1 hour TTL
  }
  
  return Ok(result);
}

async update(id: string, data: UpdateData): Promise<Result<Feature, Error>> {
  const result = await withTransaction(async (tx) => {
    return await tx.update(features).set(data).where(eq(features.id, id));
  });
  
  // Invalidate cache
  await this.cache.delete(cacheKeys.feature(id));
  await this.cache.delete(cacheKeys.list('features'));
  
  return Ok(result);
}
```

### 3. Security Integration

**Steps:**
1. Use `secureQueryBuilder` for all queries
2. Sanitize all inputs
3. Sanitize all outputs
4. Add audit logging for sensitive operations
5. Write security tests

**Example:**
```typescript
import { secureQueryBuilderService } from '@server/features/security/application/services/secure-query-builder.service';

async search(query: string): Promise<Result<Feature[], Error>> {
  // Sanitize input
  const sanitizedQuery = sanitizeForLike(query);
  
  // Use secure query builder
  const result = await readDatabase(async (db) => {
    return await secureQueryBuilderService.executeSecureQuery(
      db,
      features,
      { name: like(features.name, `%${sanitizedQuery}%`) }
    );
  });
  
  // Sanitize outputs (if needed)
  const sanitized = result.map(sanitizeFeatureOutput);
  
  return Ok(sanitized);
}
```

### 4. Error Handling Integration

**Steps:**
1. Use `Result<T, Error>` for all service methods
2. Add error context
3. Use error factory for consistent errors
4. Add error monitoring
5. Write error handling tests

**Example:**
```typescript
import { Result, Ok, Err } from '@shared/core/result';
import { ValidationError, NotFoundError } from '@server/infrastructure/database/repository/errors';

async getById(id: string): Promise<Result<Feature, Error>> {
  try {
    const result = await readDatabase(async (db) => {
      return await db.query.features.findFirst({ where: eq(features.id, id) });
    });
    
    if (!result) {
      return Err(new NotFoundError('Feature', id));
    }
    
    return Ok(result);
  } catch (error) {
    return Err(new Error(`Failed to get feature: ${error.message}`));
  }
}
```

---

## Feature-by-Feature Checklist

### Bills (TASK-2.1) - In Progress

**Status:**
- [x] Caching complete
- [x] Validation schemas created
- [x] Validation applied to service methods
- [ ] Validation middleware for routes
- [ ] Integration tests
- [ ] Performance testing

**Next Steps:**
1. Add validation middleware to bill routes
2. Write integration tests
3. Measure cache hit rates
4. Document implementation

---

### Users (TASK-2.2) - Not Started

**Checklist:**
- [ ] Create user validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to user service methods
- [ ] Ensure PII encryption
- [ ] Add audit logging
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 5 points (1 day)

---

### Community (TASK-2.3) - Not Started

**Checklist:**
- [ ] Create community validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to community service methods
- [ ] Ensure HTML sanitization (XSS prevention)
- [ ] Add moderation hooks
- [ ] Add audit logging
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 5 points (1 day)

---

### Search (TASK-2.4) - Not Started

**Checklist:**
- [ ] Create search validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to search service methods
- [ ] Secure all search queries
- [ ] Add search result sanitization
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 5 points (1 day)

---

### Analytics (TASK-2.5) - Not Started

**Checklist:**
- [ ] Create analytics validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to analytics service methods (high TTL)
- [ ] Secure all analytics queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 5 points (1 day)

---

### Sponsors (TASK-2.6) - Not Started

**Checklist:**
- [ ] Create sponsor validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to sponsor service methods
- [ ] Secure all sponsor queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Notifications (TASK-2.7) - Not Started

**Checklist:**
- [ ] Create notification validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to notification service methods
- [ ] Secure all notification queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Pretext Detection (TASK-2.8) - Not Started

**Checklist:**
- [ ] Create pretext detection validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to detection service methods
- [ ] Secure all detection queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Recommendation (TASK-2.9) - Not Started

**Checklist:**
- [ ] Create recommendation validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to recommendation service methods (high TTL)
- [ ] Secure all recommendation queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Argument Intelligence (TASK-2.10) - Not Started

**Checklist:**
- [ ] Create argument intelligence validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to argument service methods
- [ ] Secure all argument queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Constitutional Intelligence (TASK-2.11) - Not Started

**Checklist:**
- [ ] Create constitutional intelligence validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to constitutional service methods
- [ ] Secure all constitutional queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 4 points (0.8 days)

---

### Advocacy (TASK-2.12) - Not Started

**Checklist:**
- [ ] Create advocacy validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to advocacy service methods
- [ ] Secure all advocacy queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 3 points (0.6 days)

---

### Government Data (TASK-2.13) - Not Started

**Checklist:**
- [ ] Create government data validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to government data service methods (very high TTL)
- [ ] Secure all data queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 3 points (0.6 days)

---

### USSD (TASK-2.14) - Not Started

**Checklist:**
- [ ] Create USSD validation schemas
- [ ] Apply validation to service methods
- [ ] Add validation middleware to routes
- [ ] Add caching to USSD service methods
- [ ] Secure all USSD queries
- [ ] Write integration tests
- [ ] Document implementation

**Estimated Effort:** 3 points (0.6 days)

---

## Common Patterns

### Validation Middleware Pattern

```typescript
// server/features/[feature]/presentation/middleware/validate-[feature].middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { CreateFeatureSchema } from '../../application/[feature]-validation.schemas';

export async function validateCreateFeature(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const validation = await validateData(CreateFeatureSchema, req.body);
  
  if (!validation.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
    return;
  }
  
  req.body = validation.data; // Use validated data
  next();
}
```

### Cache Key Pattern

```typescript
// Use centralized cache keys
import { cacheKeys } from '@server/infrastructure/cache/cache-keys';

// Single entity
const key = cacheKeys.feature(id);

// List
const key = cacheKeys.list('features', { status: 'active' });

// Search
const key = cacheKeys.search('features', query);

// Analytics
const key = cacheKeys.analytics('feature-stats', { period: 'month' });
```

### Security Pattern

```typescript
// Always use secureQueryBuilder for queries
import { secureQueryBuilderService } from '@server/features/security/application/services/secure-query-builder.service';

const result = await readDatabase(async (db) => {
  return await secureQueryBuilderService.executeSecureQuery(
    db,
    tableName,
    whereConditions
  );
});
```

---

## Testing Strategy

### Unit Tests

Test each service method independently:

```typescript
describe('FeatureService', () => {
  describe('create', () => {
    it('should validate input', async () => {
      const result = await service.create(invalidData);
      expect(result.isErr()).toBe(true);
    });
    
    it('should cache result', async () => {
      await service.create(validData);
      const cached = await cache.get(cacheKeys.feature(id));
      expect(cached).toBeDefined();
    });
  });
});
```

### Integration Tests

Test full request/response cycle:

```typescript
describe('Feature API', () => {
  it('should validate request body', async () => {
    const response = await request(app)
      .post('/api/features')
      .send(invalidData);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
  
  it('should return cached data', async () => {
    // First request
    await request(app).get('/api/features/123');
    
    // Second request (should be cached)
    const start = Date.now();
    await request(app).get('/api/features/123');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50); // Cache should be fast
  });
});
```

---

## Metrics Tracking

### Validation Coverage

Track percentage of endpoints with validation:

```typescript
const totalEndpoints = 150;
const validatedEndpoints = 135;
const coverage = (validatedEndpoints / totalEndpoints) * 100;
// Target: > 90%
```

### Cache Hit Rate

Track cache effectiveness:

```typescript
const cacheHits = 700;
const cacheMisses = 300;
const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
// Target: > 70%
```

### Security Compliance

Track security integration:

```typescript
const totalQueries = 500;
const secureQueries = 500;
const compliance = (secureQueries / totalQueries) * 100;
// Target: 100%
```

---

## Common Issues & Solutions

### Issue: Validation Too Strict

**Problem:** Validation rejects valid data

**Solution:**
- Review schema definitions
- Use `.optional()` for optional fields
- Use `.nullable()` for nullable fields
- Add `.transform()` for data normalization

### Issue: Cache Invalidation Not Working

**Problem:** Stale data returned from cache

**Solution:**
- Ensure all write operations invalidate cache
- Use consistent cache keys
- Consider cache key patterns (e.g., `feature:*`)
- Add cache versioning if needed

### Issue: Security Queries Too Slow

**Problem:** `secureQueryBuilder` adds overhead

**Solution:**
- Add database indexes
- Use caching for frequently accessed data
- Optimize query conditions
- Consider read replicas for heavy queries

---

## Progress Tracking

### Week 3 (Days 1-5)

**Day 1:**
- [ ] Complete Bills integration (TASK-2.1)
- [ ] Start Users integration (TASK-2.2)

**Day 2:**
- [ ] Complete Users integration (TASK-2.2)
- [ ] Start Community integration (TASK-2.3)

**Day 3:**
- [ ] Complete Community integration (TASK-2.3)
- [ ] Start Search integration (TASK-2.4)

**Day 4:**
- [ ] Complete Search integration (TASK-2.4)
- [ ] Start Analytics integration (TASK-2.5)

**Day 5:**
- [ ] Complete Analytics integration (TASK-2.5)
- [ ] Start Sponsors integration (TASK-2.6)

### Week 4 (Days 6-10)

**Day 6:**
- [ ] Complete Sponsors integration (TASK-2.6)
- [ ] Complete Notifications integration (TASK-2.7)

**Day 7:**
- [ ] Complete Pretext Detection integration (TASK-2.8)
- [ ] Complete Recommendation integration (TASK-2.9)

**Day 8:**
- [ ] Complete Argument Intelligence integration (TASK-2.10)
- [ ] Complete Constitutional Intelligence integration (TASK-2.11)

**Day 9:**
- [ ] Complete Advocacy integration (TASK-2.12)
- [ ] Complete Government Data integration (TASK-2.13)
- [ ] Complete USSD integration (TASK-2.14)

**Day 10:**
- [ ] Remove deprecated schemas (TASK-2.15)
- [ ] Integration testing (TASK-2.16)

---

## Success Criteria

### Phase 2 Complete When:

- ✅ All 13+ features have validation integration
- ✅ All 13+ features have caching integration
- ✅ All 13+ features have security integration
- ✅ Deprecated schemas removed
- ✅ Validation coverage > 90%
- ✅ Cache hit rate > 70%
- ✅ Security compliance 100%
- ✅ All integration tests pass
- ✅ Test coverage > 85%
- ✅ Documentation complete

---

**Last Updated:** 2026-02-27  
**Next Review:** After each feature completion  
**Owner:** Backend Team
