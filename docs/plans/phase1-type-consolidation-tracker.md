# Phase 1: Type System Consolidation - Implementation Tracker

**Start Date**: 2026-02-26  
**Target Completion**: Week 2  
**Status**: 🟡 In Progress

## Overview
Consolidate duplicate type definitions into single sources of truth, starting with Bill and User types.

## Progress Summary

### Bill Types
- [x] Document current state (6 definitions identified)
- [ ] Create canonical Bill type in shared/types/domains/legislative/bill.ts
- [ ] Update server/infrastructure/schema to derive from canonical
- [ ] Create client extensions (minimal)
- [ ] Update ~80 import statements
- [ ] Remove deprecated definitions
- [ ] Verify builds pass

### User Types  
- [x] Document current state (5 definitions identified)
- [ ] Consolidate into shared/types/domains/authentication/user.ts
- [ ] Update auth middleware
- [ ] Update ~60 import statements
- [ ] Remove deprecated definitions
- [ ] Verify builds pass

## Detailed Tasks

### Task 1.1: Consolidate Bill Types ✅ READY
**Priority**: CRITICAL  
**Estimated Time**: 4 hours  
**Dependencies**: None

#### Current Definitions
1. `shared/types/domains/legislative/bill.ts` - 150 lines, comprehensive
2. `client/src/lib/types/bill/bill-base.ts` - 600+ lines, extensive
3. `server/types/common.ts` - 50 lines, basic
4. `server/infrastructure/schema/foundation.ts` - Database schema
5. Ad-hoc in features (5+ locations)

#### Strategy
1. **Keep**: `shared/types/domains/legislative/bill.ts` as canonical
2. **Enhance**: Add missing fields from client/bill-base.ts
3. **Derive**: Database types from canonical
4. **Extend**: Client-specific UI state separately
5. **Remove**: server/types/common.ts Bill definition
6. **Update**: All imports to @shared/types

#### Files to Modify
- [ ] `shared/types/domains/legislative/bill.ts` - Enhance canonical
- [ ] `server/infrastructure/schema/foundation.ts` - Add re-export
- [ ] `server/types/common.ts` - Remove Bill, add re-export
- [ ] `client/src/lib/types/bill/bill-base.ts` - Convert to extensions only
- [ ] Update imports in:
  - [ ] `client/src/features/bills/**/*.ts` (~40 files)
  - [ ] `server/features/bills/**/*.ts` (~20 files)
  - [ ] `shared/validation/schemas/bill.schema.ts`

#### Validation
```bash
# Should find only 1 canonical definition
grep -r "^export interface Bill" shared/types/domains/legislative/

# Should find 0 feature-level definitions
grep -r "^interface Bill" client/src/features/ server/features/

# All imports should use @shared/types
grep -r "from '@shared/types'" | grep -i bill | wc -l
```

### Task 1.2: Consolidate User Types
**Priority**: HIGH  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.1 (pattern established)

#### Current Definitions
1. `shared/types/domains/authentication/user.ts` - Comprehensive
2. `shared/core/types/auth.types.ts` - Auth-specific
3. `server/infrastructure/schema/foundation.ts` - Database
4. `server/middleware/auth.ts` - Express.User extension

#### Strategy
1. **Merge**: auth.types.ts into domains/authentication/user.ts
2. **Keep**: Express.User extension in middleware (platform-specific)
3. **Derive**: Database types
4. **Update**: All imports

#### Files to Modify
- [ ] `shared/types/domains/authentication/user.ts` - Merge auth types
- [ ] `shared/core/types/auth.types.ts` - Convert to re-exports
- [ ] Update imports in:
  - [ ] `server/middleware/**/*.ts` (~10 files)
  - [ ] `client/src/features/users/**/*.ts` (~15 files)
  - [ ] `server/features/users/**/*.ts` (~10 files)

### Task 1.3: Update Import Patterns
**Priority**: MEDIUM  
**Estimated Time**: 2 hours  
**Dependencies**: Tasks 1.1, 1.2

#### Actions
- [ ] Create import pattern guide
- [ ] Add ESLint rules
- [ ] Update tsconfig paths if needed
- [ ] Document in code-organization-standards.md

### Task 1.4: Remove Deprecated Types
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  
**Dependencies**: Tasks 1.1, 1.2, 1.3

#### Files to Remove/Clean
- [ ] Remove Bill from `server/types/common.ts`
- [ ] Clean up `client/src/lib/types/bill/bill-base.ts` (keep extensions only)
- [ ] Remove ad-hoc Bill definitions in features
- [ ] Remove duplicate User definitions

## Risk Management

### High Risk Areas
1. **Database migrations**: Schema changes could break existing data
   - **Mitigation**: Only change TypeScript types, not schema
2. **Runtime type mismatches**: Different layers expecting different shapes
   - **Mitigation**: Incremental migration with type compatibility layer
3. **Breaking API contracts**: External consumers may depend on current types
   - **Mitigation**: Maintain API contract compatibility

### Rollback Plan
1. Git branch for all changes
2. Incremental commits per domain
3. Can revert individual domains if issues arise
4. Type aliases provide compatibility during transition

## Testing Strategy

### Unit Tests
- [ ] Verify type guards still work
- [ ] Test type inference
- [ ] Validate Zod schemas

### Integration Tests
- [ ] API contracts unchanged
- [ ] Database queries work
- [ ] Client-server communication intact

### Build Verification
```bash
# Server build
cd server && npm run build

# Client build  
cd client && npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Success Criteria

### Quantitative
- [ ] Bill type definitions: 6 → 1 canonical + derived
- [ ] User type definitions: 5 → 1 canonical + derived
- [ ] Import statements updated: ~140 files
- [ ] Zero TypeScript errors
- [ ] Zero test failures
- [ ] Build time unchanged or improved

### Qualitative
- [ ] Clear import patterns documented
- [ ] Team understands new structure
- [ ] ESLint enforces patterns
- [ ] Onboarding docs updated

## Timeline

### Week 1
- **Day 1-2**: Task 1.1 (Bill types)
- **Day 3**: Task 1.2 (User types)
- **Day 4**: Task 1.3 (Import patterns)
- **Day 5**: Task 1.4 (Cleanup) + Testing

### Week 2
- **Day 1-2**: Apply pattern to Comment, Sponsor, Committee
- **Day 3-4**: Documentation and ESLint rules
- **Day 5**: Final verification and team review

## Notes
- Keep database schema types separate - they're correctly derived
- Client extensions should be minimal - most UI state in React
- API contracts use Zod - maintain runtime validation
- Branded types (BillId, UserId) provide extra safety - keep them

## Next Steps
1. ✅ Create ADR-011
2. ✅ Create this tracker
3. ⏭️ Start Task 1.1: Consolidate Bill types
4. ⏭️ Update imports incrementally
5. ⏭️ Verify and test

---

**Last Updated**: 2026-02-26  
**Updated By**: Development Team
