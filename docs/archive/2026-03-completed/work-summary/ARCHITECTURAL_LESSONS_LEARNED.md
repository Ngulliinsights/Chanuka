# Architectural Lessons Learned

**Last Updated:** March 6, 2026  
**Purpose:** Preserve strategic insights from historical audits and migrations

## Overview

This document consolidates key lessons learned from the Chanuka platform's evolution, extracted from archived audits and migration reports. These insights inform current architectural decisions and prevent repeating past mistakes.

## Code Organization Principles

### Where Does Code Belong? (Quick Reference)

**Decision Tree:**
```
Is it a React component used by 3+ features?
├─ YES → lib/ui/
└─ NO → Is it feature-specific UI?
    ├─ YES → features/{feature}/ui/
    └─ NO → Is it infrastructure/cross-cutting?
        ├─ YES → infrastructure/
        └─ NO → Is it a pure utility function?
            ├─ YES → lib/utils/
            └─ NO → features/{feature}/lib/
```

**Quick Reference:**

| What You're Building | Where It Goes | Example |
|---------------------|---------------|---------|
| Reusable UI component (3+ features) | `lib/ui/` | Button, Input, Modal |
| Design tokens/theme | `lib/design-system/` | colors, spacing, theme |
| Pure utility (no deps) | `lib/utils/` | cn(), formatDate(), debounce() |
| Shared TypeScript type | `lib/types/` | ApiResponse<T> |
| UI hook | `lib/hooks/` | useMediaQuery(), useDebounce() |
| HTTP client/interceptor | `infrastructure/api/` | Axios setup, retry logic |
| Auth infrastructure | `infrastructure/auth/` | Token manager, session |
| Error handling system | `infrastructure/error/` | Error boundary, reporter |
| Feature business logic | `features/{feature}/model/` | State management |
| Feature API calls | `features/{feature}/api/` | getBills(), updateProfile() |
| Feature UI components | `features/{feature}/ui/` | BillCard, UserProfileForm |
| Feature pages | `features/{feature}/pages/` | BillDetailPage |

**Key Principle:** If you're unsure, ask: "How many features use this?" 
- 3+ features → lib/ or infrastructure/
- 1-2 features → features/{feature}/

## Historical Architectural Mistakes

### 1. Incomplete Migrations

**Problem:** Multiple migrations started but never completed, leaving codebase in inconsistent state.

**Evidence:**
- Repository pattern: Cleanup script created, but repositories still exist in some places
- Client architecture: Three overlapping systems (lib/, core/, features/) with no clear boundaries
- Shared/core misplacement: 80% server code in "shared" module

**Lesson:** **Never start a migration without:**
1. Complete migration plan with verification steps
2. Automated migration script (not manual)
3. Clear completion criteria
4. Rollback plan if migration fails
5. Single-session completion (don't leave half-migrated)

**Current Policy:** All migrations must be completed in single session or rolled back entirely.

### 2. Premature "Completion" Declarations

**Problem:** 141 archived "completion" documents, many declaring completion prematurely.

**Evidence:**
- PHASE_1_COMPLETE.md through PHASE_4_COMPLETE.md
- Multiple FINAL_SUMMARY.md files
- CONSOLIDATION_COMPLETE.md files for incomplete consolidations

**Lesson:** **Completion means:**
- All code migrated (verified by automated check)
- All tests passing
- No TODO comments related to migration
- Documentation updated
- Team trained on new pattern

**Current Policy:** No "COMPLETE" documents. Use living README.md with current status.

### 3. Overlapping Feature Boundaries

**Problem:** Analytics vs Analysis features had unclear boundaries, causing duplication.

**Evidence:**
- Conflict detection in both features
- Transparency concerns duplicated
- ML services split across features
- Developer confusion about where to add code

**Lesson:** **Feature boundaries must be:**
- Clearly documented (single responsibility)
- Non-overlapping (no shared concerns)
- Validated before implementation
- Reviewed when adding new functionality

**Resolution:** ADR-018 restructured into 4 focused features with clear boundaries.

### 4. Infrastructure Adoption Inconsistency

**Problem:** Infrastructure components (caching, validation, error handling) adopted inconsistently across features.

**Evidence:**
- Some features use caching, others don't
- Some features use Result<T>, others use try/catch
- Some features use validation schemas, others do manual validation

**Lesson:** **Infrastructure adoption requires:**
- Clear adoption plan per feature
- Migration guide with examples
- Automated checks (ESLint rules)
- Team training
- Gradual rollout with metrics

**Current Policy:** New features must use all infrastructure components. Legacy features migrate gradually.

### 5. Shared Module Misuse

**Problem:** shared/core/ contains 80% server-only code despite "shared" name.

**Evidence:**
- observability/ (server-only logging)
- caching/ (server-only Redis)
- middleware/ (server-only Express)
- validation/ (server-side schemas)

**Lesson:** **Shared modules must be:**
- Actually shared by both client and server
- Zero server-specific dependencies
- Zero client-specific dependencies
- Truly generic utilities

**Current Policy:** If only server imports it, it belongs in server/infrastructure/, not shared/.

**Future Plan:** Move server-only code from shared/core/ to server/infrastructure/ (requires updating 30+ imports).

## Successful Patterns

### 1. ADR-Driven Decisions

**What Worked:** Creating ADRs before major architectural changes.

**Evidence:**
- 19 ADRs documenting major decisions
- Clear rationale and alternatives considered
- Consistent format and structure

**Lesson:** **Before any major change:**
1. Write ADR documenting decision
2. Review with team
3. Get approval
4. Implement
5. Reference ADR in code comments

### 2. Feature-Sliced Design (FSD)

**What Worked:** Clear feature boundaries with internal organization.

**Evidence:**
- Features have clear domain/application/infrastructure layers
- Easy to find code
- Easy to test in isolation

**Lesson:** **FSD works when:**
- Features are truly independent
- Boundaries are clear
- Cross-feature dependencies are explicit
- Each feature has README

### 3. Repository Pattern (When Used Correctly)

**What Worked:** Repository pattern for complex data access.

**Evidence:**
- Clear separation of data access from business logic
- Easy to test (mock repositories)
- Consistent error handling

**Lesson:** **Use repositories for:**
- Complex queries (joins, aggregations)
- Cross-table operations
- Transaction management

**Don't use repositories for:**
- Simple CRUD (use direct Drizzle)
- Single-table queries
- Read-only operations

**See:** ADR-017 for decision matrix.

## Anti-Patterns to Avoid

### 1. "Enhanced" Naming

**Problem:** Files named "Enhanced{Service}" indicate incomplete migration.

**Example:** `enhanced-analytics-service.ts` alongside `analytics-service.ts`

**Why It's Bad:**
- Unclear which is canonical
- Suggests temporary state that becomes permanent
- Confuses developers

**Solution:** Complete migration and delete old file, or use versioning (v1/v2).

### 2. Multiple Service Patterns

**Problem:** Same feature has multiple service patterns (enhanced vs non-enhanced, repository vs direct).

**Why It's Bad:**
- Inconsistent error handling
- Inconsistent caching
- Developer confusion

**Solution:** Standardize on one pattern per feature, migrate all code.

### 3. Orphaned Infrastructure

**Problem:** Infrastructure components created but never adopted.

**Example:** Adapter pattern created but only used in 1 place.

**Why It's Bad:**
- Maintenance burden
- Confuses developers
- Dead code

**Solution:** Delete if <3 usages, or document why it exists.

### 4. Facade Over Facade

**Problem:** Creating facades over existing facades.

**Example:** SecurityFacade wrapping SecurityMiddleware wrapping SecurityService.

**Why It's Bad:**
- Adds complexity without value
- Makes debugging harder
- Obscures actual implementation

**Solution:** Use direct imports or single facade layer.

## Current Architectural State (March 2026)

### What's Working Well ✅

1. **Database Infrastructure** (95%)
   - Clean schema organization
   - Consistent migration patterns
   - Good transaction handling

2. **ADR System** (100%)
   - 19 ADRs documenting decisions
   - Consistent format
   - Referenced in code

3. **Feature Structure** (90%)
   - Clear DDD layers
   - Good separation of concerns
   - Easy to navigate

4. **Error Handling** (95%)
   - Unified error system
   - Result<T> monad available
   - Consistent patterns

### What Needs Work ⚠️

1. **Shared/Core Misplacement** (20% complete)
   - 80% server code in "shared"
   - Needs migration to server/infrastructure/
   - Blocked by 30+ import updates

2. **Infrastructure Adoption** (60% complete)
   - Inconsistent caching adoption
   - Inconsistent validation adoption
   - Some features still use old patterns

3. **Client Architecture** (70% complete)
   - lib/ vs core/ vs features/ boundaries unclear
   - Some duplication remains
   - Needs consolidation

## Recommendations for Future Work

### Short Term (Next 3 Months)

1. **Complete Infrastructure Adoption**
   - Migrate all features to use caching
   - Migrate all features to use validation schemas
   - Add ESLint rules to enforce patterns

2. **Clarify Client Architecture**
   - Document lib/ vs infrastructure/ boundaries
   - Consolidate duplicates
   - Update WHERE_DOES_CODE_BELONG guide

3. **Clean Up Shared/Core**
   - Create migration script for shared → server
   - Execute migration in single session
   - Verify no client imports server code

### Long Term (6-12 Months)

1. **Automated Architecture Validation**
   - ESLint rules for import patterns
   - CI checks for boundary violations
   - Automated ADR compliance checks

2. **Feature Boundary Enforcement**
   - Dependency graph visualization
   - Cross-feature dependency limits
   - Automated boundary violation detection

3. **Migration Automation**
   - Codemods for common migrations
   - Automated verification scripts
   - Rollback automation

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Current architecture overview
- [docs/adr/](./adr/) — All architectural decisions
- [STATUS_VOCABULARY.md](./STATUS_VOCABULARY.md) — Status dimensions
- [FEATURE_README_TEMPLATE.md](./FEATURE_README_TEMPLATE.md) — Feature documentation template

---

**Note:** This document consolidates insights from 100+ archived audit and migration documents. For current state, see ARCHITECTURE.md and ADRs.
