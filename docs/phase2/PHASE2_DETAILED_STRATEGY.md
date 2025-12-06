# Phase 2: Test Location Standardization - Detailed Strategy

## Current State Analysis

**Test File Inventory**:
- Total test files: **475**
- Currently in `__tests__` directories: **84**
- Unit tests colocated with source: **1** (minimal)
- A11y tests: **11**
- Server/shared tests: **~379** (estimated in server/ and shared/)

**Test Location Patterns**:
```
Current (fragmented):
├── client/src/components/analytics/__tests__/
│   ├── AnalyticsCard.test.tsx
│   ├── Analytics.test.tsx
│   └── ...
├── client/src/features/auth/__tests__/
├── client/src/pages/__tests__/
└── server/src/__tests__/

Target (colocated):
├── client/src/components/analytics/
│   ├── AnalyticsCard.tsx
│   ├── AnalyticsCard.test.tsx  ← colocated
│   ├── Analytics.tsx
│   ├── Analytics.test.tsx       ← colocated
│   ├── __integration__/         ← integration tests
│   └── ...
```

## Phase 2 Implementation Plan

### Stage 1: Analysis & Categorization (Week 1)

**Objectives**:
1. Categorize all 475 tests into 4 groups:
   - **Unit tests**: Component/function-level tests (current location varies)
   - **Integration tests**: Multi-component interaction tests (__tests__ dirs)
   - **A11y tests**: Accessibility compliance tests (*.a11y.test.tsx)
   - **Server/Shared tests**: Backend and utility tests (server/, shared/)

2. Identify migration dependencies:
   - Which tests import from other __tests__ directories
   - Shared test utilities and fixtures
   - Common setup requirements

**Analysis Output**:
```
UNIT TESTS (colocate with source):
- client/src/components/*/[ComponentName].test.tsx
- client/src/features/*/[FeatureName].test.tsx
- client/src/pages/*/[PageName].test.tsx
- client/src/hooks/use[HookName].test.ts

INTEGRATION TESTS (standardize __integration__ structure):
- client/src/components/analytics/__integration__/
- client/src/features/auth/__integration__/
- server/src/features/*/[Feature].integration.test.ts

A11Y TESTS (standardize naming):
- client/src/components/*/[Component].a11y.test.tsx
- client/src/pages/*/[Page].a11y.test.tsx

SERVER TESTS (colocate):
- server/src/routes/*/[route].test.ts
- server/src/services/*/[service].test.ts
- server/src/middleware/*/[middleware].test.ts
```

### Stage 2: Test File Migration (Week 2)

**Migration Strategy**:

**Batch 1: Client Unit Tests (Week 2, Day 1-2)**
- Identify: All .test.tsx files in client/src/components, features, pages, hooks
- Strategy: Move to colocation with source file
- Pattern: `components/Button/Button.tsx` + `components/Button/Button.test.tsx`
- Validation: Update import paths in test files
- Expected: ~150+ tests moved

**Batch 2: Client Integration Tests (Week 2, Day 2-3)**
- Identify: All `__tests__` directories in client/src
- Strategy: Rename to `__integration__` within component directories
- Pattern: `components/Auth/__integration__/login.integration.test.tsx`
- Validation: Ensure paths relative to source still work
- Expected: ~84 __tests__ dirs → reorganized

**Batch 3: A11y Tests (Week 2, Day 3)**
- Identify: 11 accessibility tests
- Strategy: Colocate with components, use .a11y.test.tsx naming
- Pattern: `components/Button/Button.a11y.test.tsx`
- Note: Keep separate from unit tests for Vitest configuration
- Expected: All 11 tests renamed and colocated

**Batch 4: Server/Shared Tests (Week 2, Day 4)**
- Identify: Tests in server/ and shared/ directories
- Strategy: Colocate with feature/service source
- Pattern: `server/src/services/BillService.ts` + `server/src/services/BillService.test.ts`
- Validation: Update database/dependency setup
- Expected: ~150+ tests organized

### Stage 3: Update Import Paths (Week 2-3)

**Objectives**:
1. Fix all test file imports after moves
2. Update fixture and mock imports
3. Validate all test utilities are accessible

**Common Patterns to Update**:
```typescript
// Before (from __tests__ directory):
import { Button } from '../../Button'
import { mockUser } from '../../../__tests__/mocks'

// After (colocated):
import { Button } from './Button'
import { mockUser } from '../../../__tests__/mocks'
// OR if test utils moved
import { mockUser } from '@/test-utils'
```

**Automated Update Strategy**:
1. Use grep to find all relative imports in moved files
2. Calculate new relative path depth
3. Generate sed/replace commands
4. Test each batch with `pnpm test`

### Stage 4: Standardize Naming (Week 3)

**Naming Convention**:
```
file.test.ts/tsx       → Unit test
file.integration.test.ts/tsx  → Integration test
file.a11y.test.tsx     → Accessibility test (React Testing Library + jest-axe)
```

**Actions**:
1. Rename all test files to match convention
2. Update any explicit test runner configurations
3. Verify Vitest still recognizes all patterns

### Stage 5: Validation & Cleanup (Week 3)

**Validation Steps**:
1. Run full test suite: `pnpm test`
2. Verify no broken imports: `pnpm run validate:imports`
3. Check coverage hasn't decreased
4. Remove empty `__tests__` directories
5. Update documentation with new structure

**Cleanup**:
- Remove now-empty `__tests__` directories
- Remove any deprecated config references
- Update .gitignore if needed
- Document new testing structure

## Implementation Timeline

| Week | Stage | Focus | Deliverables |
|------|-------|-------|--------------|
| W1 | Analysis | Categorize 475 tests | Migration plan, dependency map |
| W2 | Migration | Move all test files (4 batches) | All 475 tests relocated |
| W2-3 | Import Updates | Fix all import paths | Zero broken imports |
| W3 | Naming | Standardize test naming | Convention applied to all tests |
| W3 | Validation | Full test suite passes | Green test run, 0 errors |

## Risk Mitigation

**Potential Issues**:

1. **Broken Imports During Migration**
   - Mitigation: Run tests after each batch
   - Fallback: Keep git history for easy rollback

2. **Test Utilities Not Found**
   - Mitigation: Verify test-utils/index.ts exports properly
   - Fallback: Update import paths in setup files

3. **Circular Dependencies**
   - Mitigation: Use absolute paths (@/) where possible
   - Fallback: Create shared test-utils module

4. **CI/CD Breaking**
   - Mitigation: Test locally before pushing
   - Fallback: Keep old test locations temporarily

## Success Criteria

- ✅ All 475 tests relocated to standardized locations
- ✅ All tests pass with new structure
- ✅ No broken imports or path issues
- ✅ A11y tests properly isolated in Vitest config
- ✅ Empty `__tests__` directories cleaned up
- ✅ Documentation updated with new structure
- ✅ Zero regressions in test coverage

## Example: Component Test Migration

**Before** (Fragmented):
```
client/src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── __tests__/
│           ├── Button.test.tsx
│           ├── Button.a11y.test.tsx
│           └── Button.integration.test.tsx
```

**After** (Standardized):
```
client/src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       ├── Button.test.tsx              ← unit test colocated
│       ├── Button.a11y.test.tsx         ← a11y test colocated
│       └── __integration__/             ← integration tests grouped
│           └── Button.integration.test.tsx
```

**Import Path Updates**:
```typescript
// Button.test.tsx
// Before: import Button from '../../Button'
// After:
import { Button } from './Button'
import { render, screen } from '@testing-library/react'
import { testUtils } from '@/test-utils'

describe('Button', () => {
  // ... tests
})
```

## Next Steps

1. **Immediate** (Today):
   - Review this strategy
   - Confirm batch order priorities
   - Identify any special cases

2. **Tomorrow** (Stage 1):
   - Run detailed analysis script
   - Create dependency map
   - Generate migration commands

3. **This Week** (Stages 2-5):
   - Execute migrations batch by batch
   - Fix imports after each batch
   - Run tests continuously
   - Document any issues found

## Key Metrics to Track

- Number of tests migrated
- Number of import paths fixed
- Test pass rate after each batch
- Build time changes
- Coverage percentage maintained
