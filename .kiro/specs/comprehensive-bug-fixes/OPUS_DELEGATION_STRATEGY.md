# Claude Opus Delegation Strategy
## Comprehensive Bug Fixes - Task Distribution

**Date**: February 16, 2026  
**Current Status**: Phase 4 in progress (438 violations remaining, down from 788 baseline)  
**Strategic Goal**: Leverage Opus for complex, high-volume tasks while Sonnet handles incremental fixes

---

## 🎯 DELEGATION RATIONALE

### Why Split the Work?

1. **Volume**: 438 remaining type safety violations across 1,224+ files
2. **Complexity**: Server-side violations require deep architectural understanding
3. **Velocity**: Parallel execution can complete Phase 4 faster
4. **Specialization**: Opus excels at large-scale refactoring; Sonnet at incremental fixes

---

## 🔥 HIGH-FIREPOWER TASKS FOR OPUS

### Priority 1: Server-Side Type Safety (Task 23.1) - CRITICAL
**Estimated Violations**: ~150-200 in `server/features/`  
**Complexity**: HIGH  
**Why Opus**: Complex business logic, database operations, API boundaries

#### Scope:
```
server/features/
├── bills/                    (30+ violations - bill-service.ts has 12 alone)
├── analytics/                (20+ violations - complex data aggregation)
├── alert-preferences/        (10+ violations - service layer)
├── argument-intelligence/    (5+ violations)
├── admin/                    (5+ violations)
├── advocacy/                 (3+ violations)
├── analysis/                 (5+ violations)
├── community/                (10+ violations)
└── users/                    (3+ violations)
```

**Key Challenges**:
- `server/features/bills/application/bill-service.ts` - 12 violations (complex business logic)
- `server/features/analytics/` - Multiple files with data transformation
- Database query result typing
- API response typing with Zod validation
- Enum conversions in government data integration

**Deliverables**:
1. Replace all `as any` with proper type guards
2. Add Zod schemas for all API responses
3. Create type-safe enum converters
4. Document any architectural issues discovered
5. Run `npm run scan:type-violations` to verify 0 violations in server/features/

---

### Priority 2: Test Code Cleanup (Tasks 23.4 + scattered test violations)
**Estimated Violations**: ~51 low-severity test violations  
**Complexity**: MEDIUM  
**Why Opus**: Can batch-process similar patterns across many test files

#### Scope:
```
- server/tests/                           (10+ violations)
- server/infrastructure/websocket/core/__tests__/  (20+ violations)
- client/src/__tests__/strategic/         (20+ violations)
- shared/__tests__/                       (7+ violations)
```

**Key Challenges**:
- `server/infrastructure/websocket/core/__tests__/message-handler.test.ts` - 14 violations
- `client/src/__tests__/strategic/error-handling/error-context-metadata.test.ts` - 11 violations
- Consistent pattern: `as any` for mock data and invalid test inputs

**Strategy**:
- Create type-safe test fixtures
- Use proper type guards for mock data
- Document which `as any` are acceptable (intentionally invalid test data)
- Add comments explaining why certain test violations are acceptable

**Deliverables**:
1. Reduce test violations from 51 to <10
2. Document acceptable test violations with justification comments
3. Create reusable test fixture types

---

### Priority 3: Complex Client Libraries (Task 22.4 - partial)
**Estimated Violations**: ~80 in `client/src/lib/`  
**Complexity**: HIGH  
**Why Opus**: Performance monitoring, hooks utilities, design system - complex patterns

#### Scope (High-Complexity Files Only):
```
client/src/lib/
├── hooks/utils/performance.ts           (11 violations - complex perf monitoring)
├── infrastructure/monitoring/           (6 violations - cross-system analytics)
├── design-system/utils/performance.ts   (4 violations)
└── hooks/                               (20+ violations across multiple files)
```

**Key Challenges**:
- Performance monitoring with browser APIs
- Complex hook patterns with dynamic types
- Design system token validation
- Cross-system error analytics

**Deliverables**:
1. Fix high-complexity lib files (performance, monitoring, complex hooks)
2. Create type-safe wrappers for browser performance APIs
3. Document patterns for future hook development

---

## 🎨 INCREMENTAL TASKS FOR SONNET (CONTINUE HERE)

### Priority 1: Simple Client Libraries (Task 22.4 - partial)
**Estimated Violations**: ~40 in `client/src/lib/` (simple files)  
**Complexity**: LOW-MEDIUM  
**Why Sonnet**: Straightforward type fixes, good for incremental progress

#### Scope:
```
client/src/lib/
├── data/mock/                (11 violations - simple mock data typing)
├── components/               (2 violations - simple component props)
├── templates/                (2 violations - template generation)
└── demo/                     (1 violation - demo code)
```

**Strategy**: Fix file-by-file, verify with scanner after each batch

---

### Priority 2: Client Services (Task 22.5)
**Estimated Violations**: ~10-15 in `client/src/services/`  
**Complexity**: LOW  
**Why Sonnet**: Small scope, straightforward service interfaces

---

### Priority 3: Remaining Server Infrastructure (Tasks 23.2, 23.3)
**Estimated Violations**: ~50 in `server/infrastructure/` and `server/middleware/`  
**Complexity**: MEDIUM  
**Why Sonnet**: After Opus handles server/features/, these will be clearer

#### Scope:
```
server/infrastructure/
├── cache/                    (15+ violations)
├── notifications/            (8+ violations)
├── migration/                (14+ violations)
├── observability/            (7+ violations)
├── errors/                   (12+ violations)
└── config/                   (2+ violations)
```

---

### Priority 4: Shared Utilities (Tasks 24.1, 24.2, 24.3)
**Estimated Violations**: ~20 in `shared/`  
**Complexity**: LOW-MEDIUM  
**Why Sonnet**: Small, focused files with clear patterns

---

## 📋 OPUS HANDOFF PROMPT

```markdown
# Task: Server-Side Type Safety Cleanup (Task 23.1)

## Context
You're working on Phase 4 of a comprehensive bug fix initiative. We've reduced type safety violations from 788 to 438. Your task is to eliminate ~150-200 violations in `server/features/` - the most complex part of the codebase.

## Current State
- **Total violations**: 438 (down from 788)
- **Your scope**: server/features/ directory
- **Baseline**: See `.kiro/specs/comprehensive-bug-fixes/BUG_BASELINE.md`
- **Scanner tool**: `npm run scan:type-violations`

## Files to Read First
1. `.kiro/specs/comprehensive-bug-fixes/tasks.md` - Task 23.1 details
2. `.kiro/specs/comprehensive-bug-fixes/design.md` - Requirements context
3. `analysis-results/type-violations.json` - Current violations
4. `shared/utils/type-guards.ts` - Existing type guard utilities

## High-Priority Files (Most Violations)
1. `server/features/bills/application/bill-service.ts` (12 violations)
2. `server/features/bills/bills-router.OLD.ts` (11 violations)
3. `server/features/alert-preferences/application/alert-preferences-service.ts` (9 violations)
4. `server/features/community/community.ts` (9 violations)
5. `server/features/analytics/` (multiple files, 20+ total)

## Your Mission
1. **Scan**: Run `npm run scan:type-violations` to see current state
2. **Fix**: Replace all `as any` in server/features/ with:
   - Proper type guards (use/extend `shared/utils/type-guards.ts`)
   - Zod validation for API responses
   - Type-safe enum converters
   - Proper TypeScript type narrowing
3. **Verify**: Run scanner again - target 0 violations in server/features/
4. **Document**: Note any architectural issues in a summary

## Patterns to Use

### Enum Conversion (156 violations total)
```typescript
// BAD
const status = data.status as any;

// GOOD
import { createEnumConverter } from '@/shared/utils/type-guards';
const statusConverter = createEnumConverter(BillStatus);
const status = statusConverter(data.status);
```

### Database Operations (22 violations)
```typescript
// BAD
const result = await db.query(...) as any;

// GOOD
const resultSchema = z.object({ id: z.string(), ... });
const result = resultSchema.parse(await db.query(...));
```

### API Responses (10 violations)
```typescript
// BAD
const response = await fetch(...);
const data = await response.json() as any;

// GOOD
const responseSchema = z.object({ ... });
const data = responseSchema.parse(await response.json());
```

## Success Criteria
- [ ] 0 violations in server/features/ (run scanner to verify)
- [ ] All tests still pass: `npx vitest run --config client/vitest.config.ts`
- [ ] TypeScript compiles: `tsc --noEmit`
- [ ] Summary document created with any architectural concerns

## Tools Available
- `npm run scan:type-violations` - Scan for violations
- `npx vitest run --config client/vitest.config.ts` - Run tests
- `tsc --noEmit` - Check TypeScript compilation

## Notes
- Some `as any` in test files are acceptable (for invalid test data)
- Focus on production code in server/features/
- Use existing patterns from `shared/utils/type-guards.ts`
- Create new type guards if needed
- Zod schemas should be co-located with the code that uses them

## Estimated Time
4-6 hours for ~150-200 violations across complex business logic

## Questions?
- Check design.md for requirements context
- Check existing fixes in client/src/core/ for patterns
- Type guard utilities are in shared/utils/type-guards.ts
```

---

## 📊 PROGRESS TRACKING

### Current Status (Sonnet)
- ✅ Phase 1: Complete (critical bugs, syntax errors)
- ✅ Phase 2: Complete (high-impact type safety)
- ✅ Phase 3: Complete (TODO/FIXME resolution)
- 🔄 Phase 4: In Progress
  - ✅ Task 22.1: Scanned violations
  - ✅ Task 22.2: Fixed client/src/features/
  - ✅ Task 22.3.1: Fixed API client
  - ✅ Task 22.3.2: Fixed state management
  - ✅ Task 22.3.3: Fixed utilities (dashboard, error, browser, analytics)
  - 🔄 Task 22.4: Fix client/src/lib/ (IN PROGRESS)
  - ⏳ Task 22.5: Fix client/src/services/
  - ⏳ Task 23.1: Fix server/features/ (DELEGATE TO OPUS)
  - ⏳ Task 23.2-23.4: Fix remaining server/
  - ⏳ Task 24.1-24.3: Fix shared/
  - ⏳ Task 25.1-25.3: Final verification

### Delegation Checkpoints
1. **After Opus completes Task 23.1**: Verify server/features/ has 0 violations
2. **After Opus completes test cleanup**: Verify test violations <10
3. **After Opus completes complex lib files**: Sonnet continues with simple lib files
4. **Final**: Both agents verify 0 violations in production code

---

## 🎯 SUCCESS METRICS

### Opus Targets
- Server/features/: 0 violations (from ~150-200)
- Test code: <10 violations (from 51)
- Complex lib files: 0 violations (from ~30)
- **Total reduction**: ~200-250 violations

### Sonnet Targets (Continuing)
- Simple lib files: 0 violations (from ~40)
- Client services: 0 violations (from ~15)
- Server infrastructure: 0 violations (from ~50)
- Shared utilities: 0 violations (from ~20)
- **Total reduction**: ~125 violations

### Combined Goal
- **Final state**: 0 violations in production code (test code <10 with justification)
- **From**: 788 baseline → 438 current → 0 target
- **Remaining**: 438 violations to fix
- **Opus**: ~250 violations (57%)
- **Sonnet**: ~188 violations (43%)

---

## 📝 COORDINATION PROTOCOL

1. **Opus starts with**: Task 23.1 (server/features/)
2. **Sonnet continues with**: Task 22.4 (simple lib files), Task 22.5 (services)
3. **After Opus finishes 23.1**: Sonnet picks up Tasks 23.2-23.4 (server infrastructure)
4. **After Opus finishes test cleanup**: Both verify final state
5. **Final sync**: Run scanner, verify 0 violations, update tasks.md

---

## 🚀 NEXT STEPS

### For Opus (Start Immediately)
1. Read the handoff prompt above
2. Start with Task 23.1 (server/features/)
3. Create summary document when complete
4. Move to test cleanup (Priority 2)

### For Sonnet (Continue)
1. Complete Task 22.4 (simple lib files)
2. Complete Task 22.5 (client services)
3. Wait for Opus to finish server/features/
4. Pick up Tasks 23.2-23.4 (server infrastructure)
5. Complete Tasks 24.1-24.3 (shared utilities)

---

## 📞 HANDOFF CHECKLIST

### Before Delegating to Opus
- [x] Create this delegation strategy document
- [x] Identify high-complexity tasks
- [x] Create detailed handoff prompt
- [x] Document current state (438 violations)
- [x] Define success criteria
- [ ] User approval to proceed with delegation

### After Opus Completes
- [ ] Verify server/features/ has 0 violations
- [ ] Review Opus summary document
- [ ] Update tasks.md with completion status
- [ ] Run full test suite to verify no regressions
- [ ] Continue with remaining Sonnet tasks

---

**END OF DELEGATION STRATEGY**