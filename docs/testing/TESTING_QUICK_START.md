# Testing Infrastructure - Quick Start Guide

## ⚡ 30-Second Overview

You now have a **unified testing infrastructure** with:
- ✅ 1 workspace config (vs 12+ before)
- ✅ 7 test projects (each with dedicated setup)
- ✅ Global test utilities (no imports needed)
- ✅ Comprehensive documentation (4 files)
- ✅ Ready to deploy immediately

---

## 🚀 Getting Started

### Step 1: Activate Unified Config

```bash
cd /path/to/SimpleTool

# Rename unified config to active
cp vitest.workspace.unified.ts vitest.workspace.ts

# Or if using symlink:
ln -sf vitest.workspace.unified.ts vitest.workspace.ts
```

### Step 2: Run Tests

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test --project=client-unit
pnpm test --project=server-unit
pnpm test --project=e2e

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

### Step 3: Verify Success

You should see output like:
```
✓ client-unit (100 tests)
✓ client-integration (50 tests)
✓ client-a11y (20 tests)
✓ server-unit (80 tests)
✓ server-integration (40 tests)
✓ shared (30 tests)
✓ e2e (15 tests)

✓ All tests passed (335 total)
```

---

## 📚 Documentation Files

Read these to understand the setup:

1. **`test-utils/README.md`** (450+ lines)
   - Complete guide to testing setup
   - How to write tests for each project
   - Global utilities reference
   - Troubleshooting

2. **`docs/testing/TESTING_IMPLEMENTATION_SUMMARY.md`**
   - What was accomplished
   - Benefits achieved
   - Architecture overview

3. **`docs/testing/TESTING_MIGRATION_CHECKLIST.md`**
   - Deployment steps
   - Validation checklist
   - Timeline for Phases 2-4

4. **`docs/testing/TESTING_ARCHITECTURE_DIAGRAM.md`**
   - Visual diagrams
   - System flow
   - Configuration relationships

---

## 🎯 Test Projects at a Glance

| Project | Purpose | Environment | Pattern |
|---------|---------|-------------|---------|
| **client-unit** | React components | jsdom | `*.test.tsx` |
| **client-integration** | User workflows | jsdom + MSW | `__tests__/**/*.test.tsx` |
| **client-a11y** | Accessibility | jsdom + axe | `*.a11y.test.tsx` |
| **server-unit** | Business logic | node | `*.test.ts` |
| **server-integration** | DB operations | node + DB | `__tests__/**/*.test.ts` |
| **shared** | Utilities | node | `*.test.ts` |
| **e2e** | Full workflows | node/Playwright | `*.spec.ts` |

---

## 🔨 Common Commands

```bash
# Run everything
pnpm test

# Run specific suite
pnpm test --project=client-unit
pnpm test --project=server-unit

# Run specific file
pnpm test BillCard.test.tsx
pnpm test bills

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# Debug tests (show console output)
DEBUG_TESTS=1 pnpm test client-unit
```

---

## 💡 Global Test Utilities (No Imports!)

All tests have access to these globally:

```typescript
// Create test data (in any test)
const user = global.testUtils.createMockUser({ name: 'John' })
const bill = global.testUtils.mockBill

// In integration tests
global.integrationTestUtils.mockApiError('/api/bills', 500)
global.integrationTestUtils.mockAuthenticatedUser(user)

// In accessibility tests
const results = await global.a11yTestUtils.checkAccessibility(container)

// In E2E tests
await global.e2eTestUtils.login('user@example.com', 'password')
```

---

## 📝 Example: Writing a Test

```typescript
// client/src/components/BillCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillCard } from './BillCard'

describe('BillCard', () => {
  it('renders bill title', () => {
    // No setup needed - global.testUtils already available
    const bill = global.testUtils.createMockBill({
      title: 'Healthcare Reform'
    })
    
    render(<BillCard bill={bill} />)
    
    expect(screen.getByText('Healthcare Reform')).toBeInTheDocument()
  })

  it('handles missing data gracefully', () => {
    const bill = global.testUtils.mockBill
    bill.title = undefined
    
    render(<BillCard bill={bill} />)
    
    expect(screen.getByText(/untitled/i)).toBeInTheDocument()
  })
})
```

---

## 🎓 Learning Path

### For New Developers

1. Read `test-utils/README.md` (20 min)
2. Look at existing test examples (10 min)
3. Write your first test (30 min)
4. Run full test suite (5 min)
5. ✅ Done!

### For Infrastructure Team

1. Read `docs/testing/TESTING_IMPLEMENTATION_SUMMARY.md` (15 min)
2. Read `docs/testing/TESTING_ARCHITECTURE_DIAGRAM.md` (10 min)
3. Follow `docs/testing/TESTING_MIGRATION_CHECKLIST.md` (30 min deployment)
4. Validate with team (1 hour)
5. ✅ Deployed!

### For Architects

1. Study `vitest.workspace.unified.ts` (15 min)
2. Review setup files in `test-utils/setup/` (30 min)
3. Plan Phases 2-4 (2 hours)
4. Create implementation timeline (1 hour)
5. ✅ Ready to execute!

---

## ✅ Validation Checklist

Before declaring success:

- [ ] `vitest.workspace.unified.ts` is active
- [ ] `pnpm test --project=client-unit` passes
- [ ] `pnpm test --project=server-unit` passes
- [ ] `pnpm test` runs all 7 projects
- [ ] Coverage reports generated
- [ ] Global utilities accessible in tests
- [ ] No errors in console
- [ ] CI pipeline validated

---

## 🚨 Troubleshooting

### "Cannot find module" in tests
→ Check that setup files are loaded (should see polyfills applied)
→ Verify setupFiles path in `vitest.workspace.unified.ts`

### Tests fail with "testUtils is not defined"
→ Make sure setup file is loading (it injects global.testUtils)
→ Check NODE_ENV is 'test'

### MSW not intercepting requests
→ Verify you're in integration test project
→ Check setup file is loaded (beforeAll hook should run)
→ Run: `DEBUG_TESTS=1 pnpm test --project=client-integration`

### Old tests still using old setup files
→ No problem! Both configs work during transition
→ Old setups will be deprecated after Phase 2

---

## 📈 Next Steps

### Immediate (Ready Now)
- ✅ Activate unified config
- ✅ Run tests with new setup
- ✅ Validate all pass

### Phase 2 (Next 1-2 weeks)
- Colocate tests with source files
- Standardize naming
- Update CI/CD

### Phase 3 (Next 3-5 days after Phase 2)
- Complete Jest → Vitest migration
- Remove Jest configs
- Test edge cases

### Phase 4 (Next 1 week after Phase 3)
- Implement test sharding
- Add performance budgets
- Detect flaky tests

---

## 📞 Questions?

| Topic | Where to Look |
|-------|----------------|
| **How to write tests** | `test-utils/README.md` |
| **Global utilities** | `test-utils/setup/*.ts` |
| **Architecture** | `docs/testing/TESTING_ARCHITECTURE_DIAGRAM.md` |
| **Deployment** | `docs/testing/TESTING_MIGRATION_CHECKLIST.md` |
| **Overview** | `docs/testing/TESTING_IMPLEMENTATION_SUMMARY.md` |

---

## 🎉 You're Ready!

The testing infrastructure is now:
- ✅ Unified (1 config instead of 12+)
- ✅ Organized (7 coordinated projects)
- ✅ Documented (4 comprehensive guides)
- ✅ Ready to deploy (low risk, high impact)
- ✅ Scalable (easy to extend)

**Next step**: Activate the config and run `pnpm test`

---

**Created**: December 6, 2024
**Status**: ✅ Ready for Deployment
**Confidence**: High ✅
