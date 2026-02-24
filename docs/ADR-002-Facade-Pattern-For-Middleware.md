# ADR-002: Facade Pattern for Middleware Layer

**Status**: Accepted  
**Date**: 2026-02-24  
**Decision Makers**: Architecture Team  
**Related**: ADR-001 (DDD Structure), ADR-003 (Layer Import Rules)

---

## Context

During Phase 1 of the architecture migration, we discovered that middleware components were directly importing from feature modules:

```typescript
// middleware/safeguards.ts
import { rateLimitService } from '@server/features/safeguards/application/rate-limit-service';
import { moderationService } from '@server/features/safeguards/application/moderation-service';
import { cibDetectionService } from '@server/features/safeguards/application/cib-detection-service';

// middleware/privacy-middleware.ts
import { privacyService } from '@server/features/privacy/privacy-service';
```

This created **layer violations** because:
1. Middleware is infrastructure-level (cross-cutting concerns)
2. Features are domain-level (business logic)
3. Infrastructure should not depend on features

We needed a solution that:
- Maintains proper layer boundaries
- Enables middleware functionality
- Doesn't require moving services to infrastructure (they contain business logic)
- Provides a stable interface for middleware

---

## Decision

We will use the **Facade Pattern** to provide infrastructure-level access to feature services for middleware components.

### Implementation

Create facade classes in `infrastructure/` that delegate to feature services:

```typescript
// infrastructure/safeguards/safeguards-facade.ts
import { rateLimitService } from '@server/features/safeguards/application/rate-limit-service';
import { moderationService } from '@server/features/safeguards/application/moderation-service';
import { cibDetectionService } from '@server/features/safeguards/application/cib-detection-service';

export class SafeguardsFacade {
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    return rateLimitService.checkAndRecordRateLimit(context);
  }

  async queueForModeration(context: ModerationContext) {
    return moderationService.queueForModeration(context);
  }

  async logSuspiciousActivity(context: SuspiciousActivityContext): Promise<void> {
    return cibDetectionService.logSuspiciousActivity(context);
  }
}

export const safeguardsFacade = new SafeguardsFacade();
```

Middleware then imports from infrastructure:

```typescript
// middleware/safeguards.ts
import { safeguardsFacade } from '@server/infrastructure/safeguards';

const rateLimitResult = await safeguardsFacade.checkRateLimit(context);
```

---

## Rationale

### Why Facade Pattern?

1. **Maintains Layer Separation**
   - Middleware depends on infrastructure ✅
   - Infrastructure delegates to features internally
   - Clear dependency flow: middleware → infrastructure → features

2. **Provides Stable Interface**
   - Facade interface doesn't change even if feature internals do
   - Middleware is insulated from feature refactoring
   - Breaking changes are contained

3. **Enables Future Refactoring**
   - Can move services to infrastructure later if needed
   - Can swap implementations without changing middleware
   - Provides flexibility for architectural evolution

4. **Clear Delegation**
   - Explicit delegation makes dependencies visible
   - Easy to understand what middleware uses
   - Simple to test (mock the facade)

5. **Minimal Code**
   - Facade is thin wrapper (no business logic)
   - Just delegates to existing services
   - Low maintenance overhead

### Why Not Move Services to Infrastructure?

Services like `rateLimitService`, `moderationService`, and `privacyService` contain **business logic**:
- Rate limiting rules (progressive penalties, escalation)
- Moderation policies (content analysis, priority scoring)
- Privacy preferences (consent management, data retention)

Moving them to infrastructure would:
- Mix business logic with technical primitives
- Violate DDD principles
- Make testing harder
- Reduce cohesion

---

## Consequences

### Positive

1. **Proper Layer Boundaries**
   - Middleware → Infrastructure → Features ✅
   - No layer violations
   - Clear dependency hierarchy

2. **Stable Middleware Interface**
   - Facade provides consistent API
   - Feature changes don't break middleware
   - Easier to maintain

3. **Better Testability**
   - Mock facade in middleware tests
   - Test feature services independently
   - Clear test boundaries

4. **Flexibility**
   - Can change feature implementation
   - Can add caching in facade
   - Can add logging/metrics

5. **Documentation**
   - Facade documents what middleware needs
   - Clear contract between layers
   - Easy to understand dependencies

### Negative

1. **Extra Layer**
   - One more file to maintain
   - Slight indirection
   - More code to navigate

2. **Duplication**
   - Facade methods mirror service methods
   - Type definitions may be duplicated
   - Maintenance overhead

3. **Potential Confusion**
   - Developers might not understand why facade exists
   - Might bypass facade and import directly
   - Requires documentation and enforcement

### Neutral

1. **Performance**
   - Negligible overhead (simple delegation)
   - No significant impact
   - Could add caching if needed

2. **Code Size**
   - Small increase in total code
   - Facades are typically 50-100 lines
   - Minimal impact

---

## Implementation

### Facades Created

1. **SafeguardsFacade** (`infrastructure/safeguards/`)
   - Delegates to rate limiting, moderation, CIB detection
   - Used by `middleware/safeguards.ts`

2. **PrivacyFacade** (`infrastructure/privacy/`)
   - Delegates to privacy service
   - Used by `middleware/privacy-middleware.ts`

### Facade Structure

```
infrastructure/<domain>/
├── <domain>-facade.ts    # Facade implementation
└── index.ts              # Exports facade and types
```

### Usage Pattern

```typescript
// 1. Create facade in infrastructure
export class MyFacade {
  async doSomething(params: Params): Promise<Result> {
    return myFeatureService.doSomething(params);
  }
}

// 2. Export from infrastructure index
export { MyFacade, myFacade } from './<domain>-facade';

// 3. Use in middleware
import { myFacade } from '@server/infrastructure/<domain>';
const result = await myFacade.doSomething(params);
```

---

## Alternatives Considered

### 1. Move Services to Infrastructure
**Pros**: No facade needed, direct access  
**Cons**: Mixes business logic with infrastructure, violates DDD  
**Decision**: Rejected - services contain business logic

### 2. Dependency Injection
**Pros**: Very flexible, testable  
**Cons**: Complex setup, overkill for our needs  
**Decision**: Rejected - facade is simpler

### 3. Allow Middleware → Features Imports
**Pros**: Simplest, no extra code  
**Cons**: Violates layer boundaries, creates coupling  
**Decision**: Rejected - breaks architecture principles

### 4. Event-Driven Architecture
**Pros**: Complete decoupling  
**Cons**: Too complex, async issues, harder to debug  
**Decision**: Rejected - synchronous facade is sufficient

---

## Compliance

### Automated Checks
```javascript
// .dependency-cruiser.cjs
{
  name: 'no-middleware-to-features',
  severity: 'error',
  from: { path: 'server/middleware' },
  to: { path: 'server/features' }
}
```

### Code Review Checklist
- [ ] Middleware imports from infrastructure only
- [ ] Facade delegates to feature services
- [ ] Facade has no business logic
- [ ] Types are re-exported from facade
- [ ] Facade is documented

### Testing Strategy
```typescript
// Test middleware with mocked facade
jest.mock('@server/infrastructure/safeguards', () => ({
  safeguardsFacade: {
    checkRateLimit: jest.fn(),
    queueForModeration: jest.fn(),
    logSuspiciousActivity: jest.fn()
  }
}));

// Test facade delegates correctly
describe('SafeguardsFacade', () => {
  it('delegates to rate limit service', async () => {
    const result = await safeguardsFacade.checkRateLimit(context);
    expect(rateLimitService.checkAndRecordRateLimit).toHaveBeenCalledWith(context);
  });
});
```

---

## Examples

### Good: Using Facade
```typescript
// middleware/safeguards.ts
import { safeguardsFacade } from '@server/infrastructure/safeguards';

export const safeguardsMiddleware = async (req, res, next) => {
  const result = await safeguardsFacade.checkRateLimit(context);
  if (!result.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  next();
};
```

### Bad: Direct Feature Import
```typescript
// middleware/safeguards.ts ❌
import { rateLimitService } from '@server/features/safeguards/application/rate-limit-service';

export const safeguardsMiddleware = async (req, res, next) => {
  const result = await rateLimitService.checkAndRecordRateLimit(context);
  // ...
};
```

---

## Future Considerations

### When to Create a Facade

Create a facade when:
1. Middleware needs to access feature services
2. Infrastructure needs to access feature services
3. Multiple consumers need the same feature functionality
4. You want to provide a stable interface

Don't create a facade when:
1. Features import from other features (use direct imports or events)
2. Application layer accesses domain layer (direct imports are fine)
3. Only one consumer exists (might be premature)

### Facade Evolution

Facades can evolve to:
1. **Add Caching**: Cache results in facade
2. **Add Metrics**: Track usage in facade
3. **Add Logging**: Log calls in facade
4. **Add Retry Logic**: Retry failed calls
5. **Add Circuit Breaker**: Protect against failures

---

## References

- [Facade Pattern - Gang of Four](https://en.wikipedia.org/wiki/Facade_pattern)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-24 | 1.0 | Initial ADR | Architecture Team |

---

**Status**: ✅ Accepted and Implemented  
**Next Review**: Q2 2026
