# Implementation Plan: Shared Directory Reorganization (UPDATED 2026-02-16)

## Current Status Summary

### ✅ Completed Work
- **Import Resolution Fixed**: All TS2307 and TS6059 errors resolved
- **Middleware Relocated**: Moved from `server/middleware` to `shared/core/middleware`
- **Loading Types Centralized**: Created framework-agnostic types in `shared/types/domains/loading`
- **Database Schema**: Using `@server/infrastructure/schema` path alias (proper architecture)
- **Shared Structure**: Already has organized directories (types, validation, constants, utils, i18n)

### 📊 Current Architecture
```
shared/
├── types/          ✅ Well-organized domain types
├── validation/     ✅ Zod schemas with framework integration
├── constants/      ✅ Error codes, limits, feature flags
├── utils/          ✅ Shared utilities
├── i18n/           ✅ Internationalization (en, sw)
├── core/           ⚠️  Needs review (middleware, primitives, types, utils)
├── ml/             ✅ Machine learning models
└── platform/       ✅ Kenya-specific features
```

## Phase 0: Core Module Audit & Cleanup (NEW)

### Task 0.1: Audit shared/core Directory
**Priority**: High | **Risk**: Low | **Impact**: Architecture clarity

**Current State**:
```
shared/core/
├── middleware/     (recently moved from server)
├── primitives/     (unknown content)
├── types/          (may overlap with shared/types)
└── utils/          (may overlap with shared/utils)
```

**Subtasks**:
- [ ] List all files in `shared/core/middleware/`
- [ ] List all files in `shared/core/primitives/`
- [ ] List all files in `shared/core/types/`
- [ ] List all files in `shared/core/utils/`
- [ ] Identify overlaps with top-level directories
- [ ] Document what should stay in core/ vs move to top-level

**Success Criteria**: Clear understanding of shared/core contents

---

### Task 0.2: Verify Abandoned Modules Are Gone
**Priority**: Immediate | **Risk**: None | **Impact**: Confirm cleanup

**Modules to Verify Deleted**:
- `shared/core/rate-limiting/` (38/70 quality, inferior to server implementation)
- `shared/core/repositories/` (empty stubs)
- `shared/core/services/` (unused interfaces)
- `shared/core/modernization/` (dev-only tooling)

**Subtasks**:
- [ ] Verify `shared/core/rate-limiting/` does not exist
- [ ] Verify `shared/core/repositories/` does not exist
- [ ] Verify `shared/core/services/` does not exist
- [ ] Verify `shared/core/modernization/` does not exist
- [ ] If any exist, document why and decide: keep or delete

**Success Criteria**: Confirmed these modules are removed or documented as intentionally kept

---

## Phase 1: Types & Validation (MOSTLY COMPLETE)

### Task 1.1: Verify Type System
**Status**: ✅ Mostly Complete | **Remaining Work**: Validation

**Current State**:
- ✅ `shared/types/` has well-organized domain types
- ✅ `shared/types/domains/loading/` has framework-agnostic types
- ✅ `shared/types/database/` uses `@server/infrastructure/schema` correctly
- ⚠️  Need to verify client and server are using these types

**Subtasks**:
- [ ] Search for duplicate type definitions in `client/src/types/`
- [ ] Search for duplicate type definitions in `server/types/`
- [ ] Verify all imports use `@shared/types` path alias
- [ ] Document any remaining local types and why they exist

**Success Criteria**: Single source of truth for types, no duplicates

---

### Task 1.2: Verify Validation System
**Status**: ✅ Mostly Complete | **Remaining Work**: Usage audit

**Current State**:
- ✅ `shared/validation/schemas/` has Zod schemas
- ✅ Validation framework exists
- ⚠️  Need to verify server and client are using these schemas

**Subtasks**:
- [ ] Search for duplicate Zod schemas in server
- [ ] Search for duplicate Zod schemas in client
- [ ] Verify server uses `@shared/validation` imports
- [ ] Verify client uses `@shared/validation` imports
- [ ] Document validation coverage (which entities have schemas)

**Success Criteria**: Consistent validation across client and server

---

## Phase 2: Constants & Configuration (NEEDS WORK)

### Task 2.1: Audit Constants Usage
**Status**: ⚠️ Partially Complete | **Remaining Work**: Consolidation

**Current State**:
- ✅ `shared/constants/` exists with error-codes, limits, feature-flags
- ⚠️  May have duplicate constants in server and client

**Subtasks**:
- [ ] Search for ERROR_CODES definitions in server
- [ ] Search for ERROR_CODES definitions in client
- [ ] Search for LIMITS definitions in server and client
- [ ] Search for feature flag definitions in server and client
- [ ] Create migration plan for duplicate constants

**Success Criteria**: All constants imported from `@shared/constants`

---

### Task 2.2: Configuration Management
**Status**: ❌ Not Started | **Priority**: Medium

**Current State**:
- Configuration likely scattered across server and client
- No centralized config management in shared

**Decision Needed**:
- Should configuration be in shared? (Probably NO - server-specific)
- Document why config stays in server/infrastructure/config

**Subtasks**:
- [ ] Document current configuration architecture
- [ ] Decide: shared config or server-only config?
- [ ] If server-only, document rationale
- [ ] If shared, create migration plan

**Success Criteria**: Clear configuration strategy documented

---

## Phase 3: Infrastructure Boundaries (CRITICAL)

### Task 3.1: Enforce Shared vs Server Boundaries
**Status**: ⚠️ Needs Enforcement | **Priority**: High

**Current Issues**:
- `shared/types/database/generated-tables.ts` imports from `@server/infrastructure/schema` ✅ (This is correct!)
- Need to ensure no other boundary violations

**Subtasks**:
- [ ] Search for `server/` imports in `shared/` (excluding database types)
- [ ] Search for `client/` imports in `shared/`
- [ ] Document intentional cross-boundary imports (like database types)
- [ ] Add ESLint rules to prevent future violations

**Success Criteria**: Clear boundaries with documented exceptions

---

### Task 3.2: Database Schema Architecture
**Status**: ✅ Correct | **Action**: Document

**Current Architecture** (CORRECT):
```
server/infrastructure/schema/  ← Schema definitions (Drizzle)
shared/types/database/         ← Generated types from schema
```

**Rationale**:
- Schema is server-side concern (database structure)
- Types are shared concern (used by client and server)
- Types are generated from schema, not duplicated

**Subtasks**:
- [ ] Document this architecture in README
- [ ] Explain why schema stays in server
- [ ] Explain why types are in shared
- [ ] Document type generation process

**Success Criteria**: Architecture documented and understood

---

## Phase 4: Client-Specific Utilities (PRESERVE)

### Task 4.1: Audit Client Utilities
**Status**: ❌ Not Started | **Priority**: Medium

**Known Client-Specific Utilities**:
- `client/src/lib/utils/logger.ts` (React lifecycle tracking)
- `client/src/lib/utils/security.ts` (Browser CSP, DOM sanitizer)
- `client/src/lib/utils/i18n.ts` (Kenya-specific, Swahili, KES currency)

**Subtasks**:
- [ ] List all utilities in `client/src/lib/utils/`
- [ ] Identify which are React/browser-specific
- [ ] Identify which could be shared
- [ ] Document why specialized utilities stay in client

**Success Criteria**: Clear separation of client-specific vs shared utilities

---

### Task 4.2: Verify No Duplicate Utilities
**Status**: ❌ Not Started | **Priority**: Medium

**Subtasks**:
- [ ] Compare `client/src/lib/utils/` with `shared/utils/`
- [ ] Identify any duplicate functionality
- [ ] Decide: consolidate or keep separate?
- [ ] Document decision rationale

**Success Criteria**: No unnecessary duplication

---

## Phase 5: Documentation & Standards

### Task 5.1: Create Architecture Documentation
**Status**: ❌ Not Started | **Priority**: High

**Deliverables**:
- [ ] `shared/README.md` - Purpose, structure, usage guidelines
- [ ] `shared/ARCHITECTURE.md` - Design decisions, boundaries
- [ ] `shared/MIGRATION_GUIDE.md` - How to migrate code to shared
- [ ] Update root `README.md` with shared package info

**Success Criteria**: Clear documentation for developers

---

### Task 5.2: Establish Import Standards
**Status**: ❌ Not Started | **Priority**: High

**Standards to Document**:
- When to use `@shared/*` vs local imports
- When code belongs in shared vs server vs client
- How to add new shared modules
- Path alias conventions

**Subtasks**:
- [ ] Document import patterns
- [ ] Create examples for common scenarios
- [ ] Add to onboarding documentation
- [ ] Create ESLint rules to enforce standards

**Success Criteria**: Consistent import patterns across codebase

---

## Phase 6: Testing & Validation

### Task 6.1: Verify Build System
**Status**: ⚠️ Needs Verification | **Priority**: High

**Subtasks**:
- [ ] Run `tsc --noEmit` in shared workspace
- [ ] Run `tsc --noEmit` in server workspace
- [ ] Run `tsc --noEmit` in client workspace
- [ ] Verify no TS2307 (Cannot find module) errors
- [ ] Verify no TS6059 (File not under rootDir) errors
- [ ] Verify no circular dependency errors

**Success Criteria**: All workspaces compile without errors

---

### Task 6.2: Verify Test Coverage
**Status**: ❌ Not Started | **Priority**: Medium

**Subtasks**:
- [ ] Run test suite for shared package
- [ ] Verify shared utilities have tests
- [ ] Verify shared types have validation tests
- [ ] Document test coverage percentage
- [ ] Identify gaps in test coverage

**Success Criteria**: Adequate test coverage for shared code

---

## Phase 7: Performance & Optimization

### Task 7.1: Measure Bundle Impact
**Status**: ❌ Not Started | **Priority**: Low

**Subtasks**:
- [ ] Measure client bundle size before/after shared imports
- [ ] Verify tree-shaking works for shared modules
- [ ] Check for unintended dependencies in client bundle
- [ ] Optimize imports if needed

**Success Criteria**: No negative impact on bundle size

---

### Task 7.2: Verify Import Resolution Performance
**Status**: ❌ Not Started | **Priority**: Low

**Subtasks**:
- [ ] Measure TypeScript compilation time
- [ ] Verify path alias resolution is fast
- [ ] Check for any import resolution warnings
- [ ] Optimize tsconfig if needed

**Success Criteria**: Fast compilation times maintained

---

## Summary

### Priority Order
1. **Phase 0**: Core module audit (understand current state)
2. **Phase 3**: Enforce boundaries (prevent future issues)
3. **Phase 1**: Verify types & validation (mostly done)
4. **Phase 5**: Documentation (critical for team)
5. **Phase 2**: Constants consolidation
6. **Phase 4**: Client utilities audit
7. **Phase 6**: Testing & validation
8. **Phase 7**: Performance optimization

### Key Decisions Needed
1. What should stay in `shared/core/` vs top-level directories?
2. Should configuration be shared or server-only?
3. Which client utilities should remain client-specific?
4. What ESLint rules should enforce boundaries?

### Success Metrics
- ✅ Zero TypeScript compilation errors (ACHIEVED)
- ✅ No TS2307 import resolution errors (ACHIEVED)
- ✅ No TS6059 rootDir violations (ACHIEVED)
- ⚠️  Single source of truth for types (NEEDS VERIFICATION)
- ⚠️  Clear architecture boundaries (NEEDS DOCUMENTATION)
- ❌ Comprehensive documentation (NOT STARTED)
- ❌ Test coverage >80% (NOT MEASURED)

### Estimated Timeline
- Phase 0: 1 day (audit)
- Phase 1-2: 2 days (verification & consolidation)
- Phase 3: 1 day (boundary enforcement)
- Phase 4: 1 day (client utilities)
- Phase 5: 2 days (documentation)
- Phase 6-7: 1 day (testing & optimization)

**Total**: 8 days (was 10-12 days, reduced due to completed work)

---

**Plan Status**: Updated - Reflects Current State  
**Created**: 2026-02-16  
**Last Updated**: 2026-02-16  
**Previous Work**: Import resolution fixes completed  
**Next Steps**: Phase 0 audit of shared/core directory
