# Infrastructure Integration - Quick Reference

**Last Updated:** 2026-02-27  
**Current Phase:** Phase 2 - Performance & Reliability

---

## 🎯 Current Status

### ✅ Completed
- **Phase 0:** Foundation (100%)
- **Phase 1:** Critical Security (100%)
- **Bills Caching:** (100%)
- **Bills Validation Schemas:** (100%)
- **Bills Validation Application:** (100%)
- **Validation Consistency Analysis:** (100%)
- **Validation Consolidation Phase 1:** (100%)

### 🔄 In Progress
- **Phase 2:** Performance & Reliability (~45%)
- **Bills Testing:** (~60%)
- **Validation Consolidation Phase 2:** (0% - ready to start)

### ⏳ Next Up
1. Add Bills validation middleware to routes
2. Write Bills integration tests
3. **Phase 2:** Update features to use shared validation (4-6 hours)
4. Community integration
5. Search completion
6. Analytics deployment

---

## 📁 Key Files

### Implementation Guides
- `PHASE2_PHASE3_IMPLEMENTATION_GUIDE.md` - Complete patterns
- `TESTING_GUIDE.md` - Testing strategies
- `IMPLEMENTATION_SUMMARY.md` - Foundation summary

### Progress Tracking
- `PHASE2_DEPLOYMENT_LOG.md` - Overall progress
- `BILLS_INTEGRATION_COMPLETE.md` - Bills completion
- `SESSION_COMPLETE_SUMMARY.md` - Latest session

### Reference Implementations
- `server/features/analytics/application/analytics-service-integrated.ts`
- `server/features/bills/application/bill-service.ts`
- `server/features/bills/application/bill-validation.schemas.ts`

### Infrastructure Utilities
- `server/infrastructure/cache/cache-keys.ts`
- `server/infrastructure/validation/validation-helpers.ts`
- `server/infrastructure/integration/feature-integration-helper.ts`

---

## 🔧 Quick Patterns

### Cache Integration
```typescript
// 1. Import utilities
import { cacheKeys, CACHE_TTL, createCacheInvalidation } from '@server/infrastructure/cache/cache-keys';
import { cacheService } from '@server/infrastructure/cache';

// 2. Create invalidation service
const cacheInvalidation = createCacheInvalidation(cacheService);

// 3. Use in methods
const cacheKey = cacheKeys.entity('type', id);
const cached = await cacheService.get<T>(cacheKey);
if (cached) {
  logger.debug({ cacheKey }, 'Cache hit');
  return cached;
}
// ... query database ...
await cacheService.set(cacheKey, result, CACHE_TTL.APPROPRIATE);
```

### Validation Schemas
```typescript
// 1. Import
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// 2. Define schema
export const CreateEntitySchema = z.object({
  name: CommonSchemas.title,
  description: CommonSchemas.description,
});

// 3. Use in service
const validation = await validateData(CreateEntitySchema, data);
if (!validation.success) {
  return err(new Error(validation.errors?.map(e => e.message).join(', ')));
}
```

### Cache Invalidation
```typescript
// Single entity
await cacheInvalidation.invalidateEntity('type', id);

// Multiple patterns
await Promise.all([
  cacheInvalidation.invalidateList('type'),
  cacheInvalidation.invalidateSearch()
]);
```

---

## 📊 Metrics Targets

| Metric | Target | Current |
|--------|--------|---------|
| Cache Hit Rate | >70% | TBD |
| Error Rate | <0.1% | TBD |
| Validation Coverage | >90% | ~30% |
| Transaction Success | >99.9% | TBD |
| Test Coverage | >85% | ~60% |

---

## 🚀 Next Actions

### Immediate
1. Add validation middleware to Bills routes
2. Write Bills integration tests

### This Week
3. **Phase 2:** Update features to use shared validation (4-6 hours)
   - Audit all feature services
   - Replace deprecated schemas
   - Test all features
4. Community integration
5. Search completion

### Next 2 Weeks
6. Analytics deployment
7. Pretext Detection
8. Recommendation
9. Argument Intelligence
10. Constitutional Intelligence

---

## 📞 Need Help?

### Documentation
- Start with `PHASE2_PHASE3_IMPLEMENTATION_GUIDE.md`
- Check `BILLS_INTEGRATION_COMPLETE.md` for working example
- Review `SESSION_COMPLETE_SUMMARY.md` for latest progress

### Code Examples
- Analytics: `server/features/analytics/application/analytics-service-integrated.ts`
- Bills: `server/features/bills/application/bill-service.ts`
- Validation: `server/features/bills/application/bill-validation.schemas.ts`

### Utilities
- Cache: `server/infrastructure/cache/cache-keys.ts`
- Validation: `server/infrastructure/validation/validation-helpers.ts`
- Integration: `server/infrastructure/integration/feature-integration-helper.ts`

---

**Quick Start:** Read `PHASE2_PHASE3_IMPLEMENTATION_GUIDE.md` → Review Bills integration → Apply patterns to next feature
