# Phase 2 Execution Plan - Ready for Deployment

## Current Status

✅ **Phase 1 Complete**:
- Unified vitest workspace config created: `vitest.workspace.unified.ts`
- 7 coordinated test setup files in `/test-utils/setup/`
- Global test utilities standardized
- Comprehensive documentation provided

✅ **Phase 2 Analysis Complete**:
- Test file inventory: **475 files** across monorepo
- Test locations identified: 84 `__tests__` directories
- Unit tests: ~370 files to be colocated
- Integration tests: ~84 to be organized under `__integration__/`
- A11y tests: 11 files to be standardized

✅ **Build Issue Resolved**:
- Created missing `client/src/components/mobile/index.ts`
- Fixed App.tsx broken import
- Ready to proceed with test migration

## Phase 2 Strategy: Test Location Standardization

### Timeline: 1-2 Weeks

**Goal**: Move all 475 tests to standardized, colocated locations with clear naming conventions.

### Implementation Plan

#### Step 1: Prepare (Today)
```bash
# Review the generated migration script
cat phase2-migration-commands.sh | head -50

# Verify key directories exist
ls -la client/src/components/auth/__tests__/ | head -5
```

#### Step 2: Execute Batch 1 - Unit Tests (Day 1)
```bash
# Backup current state
git add -A && git commit -m "Pre-Phase2: Backup testing structure"

# Run the generated migration script
bash phase2-migration-commands.sh 2>&1 | tee phase2-migration.log

# This will:
# - Move all unit tests from __tests__ to component directories
# - Create __integration__ directories for integration tests
# - Move a11y tests to colocate with components
# - Clean up empty __tests__ directories
```

#### Step 3: Fix Import Paths (Day 2)
```bash
# After migration, some test files will have broken imports
# Run validation to identify issues
pnpm run validate:imports 2>&1 | grep "ERROR\|WARN" | head -20

# Common pattern to fix:
# Before: import { Button } from '../../Button'
# After:  import { Button } from './Button'
```

**Expected Import Fixes**:
```typescript
// If test file moved from __tests__ to component directory:
// Before: import { Component } from '../Component'  ← from __tests__ up to parent
// After:  import { Component } from './Component'   ← now in same directory

// If fixture path changed:
// Before: import { mockData } from '../../__tests__/fixtures'
// After:  import { mockData } from '@/test-utils'  ← use centralized utilities
```

#### Step 4: Run Tests & Validate (Day 2-3)
```bash
# Run full test suite
pnpm test 2>&1 | tail -50

# Expected output:
# ✓ Vitest: all 475 tests pass
# ✓ No broken imports
# ✓ Coverage maintained or improved

# If tests fail, identify root cause:
pnpm test -- --reporter=verbose 2>&1 | grep "FAIL\|PASS" | head -20
```

#### Step 5: Cleanup & Documentation (Day 3)
```bash
# Verify all __tests__ directories removed
find client/src -type d -name "__tests__" -o -type d -name "__tests__/__archive__"

# Update documentation
# - Update README with new test structure
# - Update testing guidelines in docs/testing/TESTING_QUICK_START.md
# - Add examples of new test location pattern
```

### Test File Structure After Migration

**Current (Fragmented)**:
```
client/src/
├── components/
│   └── auth/
│       ├── Login.tsx
│       ├── Register.tsx
│       ├── useAuthForm.ts
│       └── __tests__/                    ← Everything in one directory
│           ├── Login.test.tsx
│           ├── Register.test.tsx
│           ├── auth-integration.test.tsx
│           ├── useAuthForm.test.ts
│           └── auth-accessibility.test.tsx
```

**After Phase 2 (Standardized)**:
```
client/src/
├── components/
│   └── auth/
│       ├── Login.tsx
│       ├── Login.test.tsx                ← Unit test colocated
│       ├── Login.a11y.test.tsx           ← A11y test colocated
│       ├── Register.tsx
│       ├── Register.test.tsx             ← Unit test colocated
│       ├── useAuthForm.ts
│       ├── useAuthForm.test.ts           ← Hook test colocated
│       └── __integration__/              ← Integration tests grouped
│           ├── auth-integration.test.tsx
│           └── accessibility.integration.test.tsx
```

### Test Naming Convention

After Phase 2, all tests follow this pattern:

```
[SourceFile].test.ts/tsx              → Unit test
[SourceFile].integration.test.ts/tsx  → Integration test
[SourceFile].a11y.test.tsx            → Accessibility test

Examples:
- Button.test.tsx
- Button.integration.test.tsx
- Button.a11y.test.tsx
- useAuthForm.test.ts
- api.integration.test.ts
```

### Import Path Updates

**Common scenarios after file moves**:

**Scenario 1: Test moved to component directory**
```typescript
// File: client/src/components/Button/Button.test.tsx

// BEFORE (from __tests__ directory):
import { Button } from '../../Button'     // Go up from __tests__, then into Button
import { render } from '@testing-library/react'

// AFTER (colocated):
import { Button } from './Button'         // In same directory now
import { render } from '@testing-library/react'
```

**Scenario 2: Fixture moved to test-utils**
```typescript
// File: client/src/components/auth/auth-integration.test.tsx

// BEFORE:
import { mockUser } from '../../../__tests__/fixtures'

// AFTER:
import { mockUser } from '@/test-utils'   // Centralized utilities
```

**Scenario 3: Integration test in subdirectory**
```typescript
// File: client/src/components/auth/__integration__/auth-flow.integration.test.tsx

// Test can import from parent:
import { Auth } from '../Auth'            // Go up one level to auth directory
import { mockUser } from '@/test-utils'   // Centralized utilities
```

### Risk Mitigation

**Potential Issues & Solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| Broken imports | Test files moved but imports not updated | Run `pnpm run validate:imports` after migration, fix paths |
| Tests don't run | Vitest config doesn't recognize new locations | Verify `vitest.workspace.unified.ts` includes all patterns |
| Circular dependencies | Tests import from moved utilities | Use centralized `@/test-utils` instead of relative paths |
| CI/CD failures | Production build not aware of test files | Test files shouldn't affect build (only in test environment) |
| Slow tests | File relocation caused performance issue | Rare - run `pnpm test --reporter=verbose` to identify slow tests |

**Rollback Plan**:
```bash
# If something goes wrong, rollback to pre-migration state:
git reset --hard HEAD~1    # Undo all changes
git log --oneline | head   # Verify reset to backup commit
```

## Phase 2 Deliverables

By end of Phase 2 (Target: Next 1-2 weeks):

✅ All 475 tests relocated to standardized locations
✅ Test naming convention applied (*.test.ts, *.integration.test.ts, *.a11y.test.ts)
✅ All `__tests__` directories consolidated into `__integration__` subdirectories
✅ All import paths updated and validated
✅ Full test suite passes with zero failures
✅ Documentation updated with new structure
✅ Performance baseline established for Phase 3

## Phase 3 Preparation

After Phase 2, we're ready for Phase 3: **Jest → Vitest Migration**
- Removes Jest A11y config
- Fully consolidates to Vitest
- Expected: 3-5 days of work
- Benefit: Single test runner, faster CI/CD

## Current Ready-to-Run Scripts

```bash
# Review what will be migrated
bash scripts/analyze-phase2.sh

# Generate migration commands (already done)
# Output: phase2-migration-commands.sh

# Execute the migration (when ready)
bash phase2-migration-commands.sh

# Validate imports (after migration)
pnpm run validate:imports

# Run full test suite
pnpm test
```

## Recommended Action Plan

**Today**:
1. Review this execution plan
2. Review Phase 2 detailed strategy: `docs/phase2/PHASE2_DETAILED_STRATEGY.md`
3. Verify migration script: `cat phase2-migration-commands.sh | head -100`
4. Create backup branch: `git checkout -b phase2-implementation`

**Tomorrow - Day 1**:
1. Run migration script: `bash phase2-migration-commands.sh`
2. Review migration log: `cat phase2-migration.log`
3. Verify key directories moved: `ls -la client/src/components/auth/ | grep test`
4. Run test suite: `pnpm test`

**Day 2**:
1. Fix broken imports: `pnpm run validate:imports`
2. Update test-utils imports where needed
3. Re-run full test suite
4. Commit changes: `git add -A && git commit -m "Phase 2: Colocate test files"`

**Day 3**:
1. Update documentation
2. Verify no empty `__tests__` directories remain
3. Performance baseline test: `pnpm test -- --reporter=verbose`
4. Prepare for Phase 3

## Success Criteria

- ✅ All 475 test files relocated
- ✅ Test structure matches colocated pattern
- ✅ All imports valid (zero broken paths)
- ✅ Full test suite passes
- ✅ Test coverage unchanged or improved
- ✅ Documentation updated
- ✅ No empty `__tests__` directories remain
- ✅ Ready to proceed to Phase 3 (Jest → Vitest)

## Key Resources

- Migration script: `phase2-migration-commands.sh` (1176 lines, fully generated)
- Migration log: `phase2-migration.log` (will be created during execution)
- Detailed strategy: `docs/phase2/PHASE2_DETAILED_STRATEGY.md`
- Phase 1 docs: `test-utils/README.md`, `docs/testing/TESTING_IMPLEMENTATION_SUMMARY.md`

---

**Next Step**: Ready to execute Phase 2 test file migration when you give the go-ahead!
