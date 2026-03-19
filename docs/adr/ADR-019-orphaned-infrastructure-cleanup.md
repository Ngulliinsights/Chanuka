# ADR-019: Orphaned Infrastructure Cleanup

**Status**: Accepted
**Date**: 2026-03-19

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Infrastructure Architecture Audit

---

## Context

Infrastructure audit revealed several orphaned, under-utilized, or misplaced components:

**Truly Orphaned:**
- `infrastructure/delivery/` - Empty directory
- `infrastructure/integration/feature-integration-helper.ts` - Single file, unclear usage

**Under-Utilized:**
- `infrastructure/config/` - Sophisticated config management, rarely used
- `infrastructure/external-data/` - Only used by government-data feature
- `infrastructure/websocket/` - Complete infrastructure, minimal usage
- `infrastructure/messaging/` - Only used by notifications feature

**Misplaced (Facades):**
- `infrastructure/privacy/privacy-facade.ts` - Actual logic in `features/privacy`
- `infrastructure/safeguards/safeguards-facade.ts` - Actual logic in `features/safeguards`

**Unclear Purpose:**
- `infrastructure/adapters/` - Overlaps with repository pattern

## Decision

### Remove Orphaned Components

1. **Delete `infrastructure/delivery/`**
   - Empty directory with no purpose
   - Action: Remove immediately

2. **Remove or Document `infrastructure/integration/`**
   - Single helper file with unclear usage
   - Action: Audit usage, then remove or document purpose

### Deprecate Misplaced Components

3. **Remove Infrastructure Facades**
   - `infrastructure/privacy/privacy-facade.ts` → Delete
   - `infrastructure/safeguards/safeguards-facade.ts` → Delete
   - Rationale: Violates dependency direction (Infrastructure → Features)
   - Keep all logic in `features/privacy` and `features/safeguards`

4. **Deprecate Adapter Pattern**
   - `infrastructure/adapters/` → Deprecate
   - Migrate to Repository pattern or direct Drizzle
   - Rationale: Overlaps with repository pattern, adds unnecessary abstraction

### Promote Under-Utilized Components

5. **Promote `infrastructure/config`**
   - Create migration guide for features to use config manager
   - Replace direct environment variable usage
   - Add examples and documentation

6. **Promote `infrastructure/external-data`**
   - Standardize external API integration across features
   - Document usage patterns
   - Encourage adoption beyond government-data

7. **Audit `infrastructure/websocket`**
   - Determine actual usage
   - If unused: Deprecate and remove
   - If used: Document and promote

8. **Enhance `infrastructure/messaging`**
   - Expand as cross-feature notification hub
   - Enable features to publish events
   - Notification system handles delivery

## Consequences

### Positive
- Cleaner infrastructure layer
- Clear component purposes
- No orphaned code
- Better discoverability
- Correct dependency direction

### Negative
- Need to migrate code using deprecated components
- Some features may temporarily lose functionality
- Documentation updates required

### Neutral
- Phased approach minimizes disruption
- Can maintain backward compatibility during transition

## Implementation

### Immediate Actions
1. Delete `infrastructure/delivery/`
2. Audit and remove/document `infrastructure/integration/`
3. Remove privacy and safeguards facades
4. Document adapter pattern deprecation

### Short-Term Actions
5. Create config manager migration guide
6. Document external-data usage patterns
7. Audit websocket usage
8. Plan messaging infrastructure enhancement

### Long-Term Actions
9. Migrate all features from adapters to repositories
10. Migrate features to config manager
11. Promote external-data across features
12. Implement enhanced messaging hub

## Related

- ADR-017: Repository Pattern Standardization
- Infrastructure Architecture Audit
- Feature Modernization Audit
