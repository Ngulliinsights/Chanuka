# Testing Strategy: Unified Reference Guide

> **Quick Reference**: How all test types fit together into one coherent strategy

---

## 🎯 The Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│           COMPLETE TESTING PYRAMID (All Layers)                  │
└──────────────────────────────────────────────────────────────────┘

                           E2E TESTS
                      (5-30s per test)
                  Real user journeys
                in real browser
                    ↑
                    │
              INTEGRATION TESTS
            (500ms-2s per test)
          Component workflows
            + API interactions
                    ↑
                    │
            ┌───────────────────┐
            │  ACCESSIBILITY    │
            │  TESTS (A11Y)     │    UNIT TESTS
            │  (200-500ms)      │  (<100ms each)
            │  WCAG AA comp.    │
            │  Keyboard nav     │  Components
            │  Screen readers   │  in isolation
            │  Color contrast   │  (THIS PHASE ✅)
            └───────────────────┘
                    ↑
                    │
        ┌───────────────────────────┐
        │ VALIDATION TESTS          │
        │ Data validation           │ (Next: Phase 4 Step 3)
        │ Schema verification       │
        │ ~48 tests                 │
        └───────────────────────────┘
                    ↑
                    │
        ┌───────────────────────────┐
        │ UNIT TESTS                │
        │ Component behavior        │ ← YOU ARE HERE
        │ All variants & states     │    Phase 4 Step 2 ✅
        │ 323 tests (COMPLETE)      │
        └───────────────────────────┘
```

---

## 📍 Where Tests Live (Colocation Strategy)

### Same Directory (Colocated)
```
src/components/ui/
├── button.tsx                    ← Component
├── button.test.tsx              ← Unit test (COLOCATED)
├── button.stories.tsx           ← Storybook (COLOCATED)
└── button.module.css            ← Styles (COLOCATED)

src/hooks/
├── useUser.ts                   ← Hook
├── useUser.test.ts              ← Unit test (COLOCATED)
└── useUser.stories.tsx          ← Storybook (COLOCATED)

src/lib/
├── validation-schemas.ts        ← Schemas
├── validation-schemas.test.ts   ← Unit tests (COLOCATED)
└── form-builder.ts              ← Builder
    └── form-builder.test.ts     ← Unit test (COLOCATED)

src/services/
├── bill-service.ts              ← Service
└── bill-service.test.ts         ← Unit test (COLOCATED)

WHY: Developers see code and test together in their editor
```

### Separate Directory (__tests__)
```
src/components/ui/__tests__/
├── button-form.integration.test.tsx      ← Button in form context
├── button-validation-flow.test.tsx       ← Button → validation → error
└── card-list-loading.integration.test.tsx ← Card in list context

src/hooks/__tests__/
├── useUser-api.integration.test.ts       ← API + Redux + hook
└── useBill-form.integration.test.ts      ← Form + hook + validation

WHY: Integration tests test WORKFLOWS, not individual units
     Different concern = different directory
     Can use different setup (MSW, Redux mock store)
```

---

## 📋 Test Types at a Glance

### 1️⃣ Unit Tests (YOU ARE HERE ✅)

**What**: Individual components/hooks/functions in isolation
**Where**: Colocated (button.test.tsx next to button.tsx)
**Speed**: ⚡ Fast (<100ms per test)
**Count**: 323 tests (completed Phase 4 Step 2)
**Examples**:
  - Button renders with text
  - Input handles user typing
  - Dialog opens and closes
  - Label associates with input

**Files**: 
  - button.test.tsx
  - card.test.tsx
  - input.test.tsx
  - label.test.tsx
  - alert-badge.test.tsx
  - checkbox-switch-tooltip.test.tsx
  - dialog.test.tsx
  - avatar-tabs-progress.test.tsx

---

### 2️⃣ Validation Tests (NEXT: Phase 4 Step 3)

**What**: Data validation schemas with all edge cases
**Where**: Colocated (validation-schemas.test.ts next to validation-schemas.ts)
**Speed**: ⚡ Fast (<100ms per test)
**Count**: ~48 tests planned
**Examples**:
  - billSchema validates valid bill data
  - billSchema rejects invalid data
  - userSchema handles edge cases
  - formSchema verifies required fields

**Files**:
  - validation-schemas.test.ts
  - form-builder.test.ts

---

### 3️⃣ Accessibility Tests (NEXT: Phase 4 Step 4)

**What**: WCAG AA compliance (keyboard, screen readers, contrast)
**Where**: Colocated or separate (__tests__/accessibility/)
**Speed**: 🔴 Slow (200-500ms per test)
**Count**: ~100 tests planned
**Examples**:
  - Button keyboard accessible (Enter, Space)
  - Input works with screen readers
  - Dialog trap focus properly
  - Color contrast meets WCAG AA

**Files**:
  - *.a11y.test.tsx (colocated)
  - Or __tests__/accessibility/*.test.tsx

---

### 4️⃣ Integration Tests (NEXT: Phase 5)

**What**: Components working together + API interactions
**Where**: Separate (__tests__/)
**Speed**: 🟡 Medium (500ms-2s per test)
**Count**: ~100+ tests planned
**Examples**:
  - Button in form → submit handling
  - Input + validation → error display
  - Dialog with form → data submission
  - List with filters → API call + display

**Files**:
  - __tests__/button-form.integration.test.tsx
  - __tests__/input-validation-flow.test.tsx
  - __tests__/dialog-submit-flow.test.tsx

---

### 5️⃣ E2E Tests (NEXT: Phase 6)

**What**: Real user journeys in real browser
**Where**: Separate (tests/e2e/)
**Speed**: 🔴 Very Slow (5-30s per test)
**Count**: ~30+ tests planned
**Examples**:
  - User login → view bills → search
  - Create bill → edit → submit → confirm
  - User profile → edit → save → verify

**Files**:
  - tests/e2e/bill-creation.spec.ts
  - tests/e2e/user-auth-flow.spec.ts
  - tests/e2e/search-and-filter.spec.ts

---

## 🔄 How They Work Together (Complementarity)

```
                UNIT TEST FAILURE
                       │
                       ↓
    Component doesn't work in isolation
    └─ Fix the component
                       │
                       ↓
              UNIT TEST PASSES
                       │
                       ↓
          INTEGRATION TEST FAILURE
                       │
                       ↓
    Component works alone, but fails with other components
    └─ Fix the workflow/API handling
                       │
                       ↓
         INTEGRATION TEST PASSES
                       │
                       ↓
           ACCESSIBILITY TEST FAILURE
                       │
                       ↓
    Component works, but not accessible
    └─ Fix keyboard/ARIA/contrast
                       │
                       ↓
          ACCESSIBILITY TEST PASSES
                       │
                       ↓
              E2E TEST FAILURE
                       │
                       ↓
    All components work, but real users can't complete task
    └─ Fix the overall workflow
                       │
                       ↓
              E2E TEST PASSES ✅
                       │
                       ↓
            READY FOR PRODUCTION
```

---

## 📚 Documentation Files

### To Understand Testing Strategy

1. **Start**: `TESTING_QUICK_START.md` (5 min read)
   - Overview of test types
   - How to run tests
   - Quick reference commands

2. **Architecture**: `TESTING_ARCHITECTURE_DIAGRAM.md` (10 min read)
   - Visual system diagrams
   - How projects are organized
   - Configuration relationships

3. **Colocation**: `COMPONENT_TEST_COLOCATION_STRATEGY.md` (20 min read)
   - Why colocation works
   - Directory structure examples
   - Naming conventions
   - Test templates

4. **Consistency**: `CONSISTENCY_AND_COMPLEMENTARITY.md` (25 min read)
   - Unified testing matrix
   - Complementarity framework
   - How different layers work together
   - Consistency checklist

5. **Implementation**: `PHASE_4_STEP_2_COMPLETION.md` (10 min read)
   - What was delivered
   - Quality metrics
   - Next steps

---

## 🚀 Running Tests

```bash
# Run ALL tests
pnpm test

# Run UNIT tests only (current phase)
pnpm test:unit

# Run specific component tests
pnpm test button.test.tsx
pnpm test card
pnpm test input

# Run with coverage report
pnpm test:unit -- --coverage

# Watch mode (auto-rerun on changes)
pnpm test -- --watch

# Run specific test project
pnpm test -- --project=client-unit

# Debug mode (shows console output)
DEBUG_TESTS=1 pnpm test:unit
```

---

## ✅ Consistency Checklist

### For Every Test File

**NAMING**:
- [ ] File: ComponentName.test.tsx (matches component)
- [ ] Tests: Each has clear behavior description ("should X when Y")
- [ ] Describe blocks: Follow standard structure

**LOCATION**:
- [ ] Unit tests: Colocated with component/hook/service
- [ ] Integration tests: In __tests__/ subdirectory
- [ ] A11y tests: Colocated or separate (consistent)
- [ ] E2E tests: In tests/e2e/ directory

**STRUCTURE**:
- [ ] Documentation header present
- [ ] Imports organized (testing lib → component → mocks)
- [ ] Describe blocks nested logically
- [ ] Related tests grouped

**COVERAGE**:
- [ ] Rendering tests (does it render?)
- [ ] Props tests (different props?)
- [ ] State tests (state changes correctly?)
- [ ] Interaction tests (responds to users?)
- [ ] Accessibility tests (accessible?)
- [ ] Integration tests (works with others?)
- [ ] Edge case tests (weird things?)

**BEST PRACTICES**:
- [ ] Uses global.testUtils (no boilerplate imports)
- [ ] One assertion per test (or closely related)
- [ ] AAA pattern: Arrange, Act, Assert
- [ ] Uses userEvent (not fireEvent)
- [ ] Tests behavior (not implementation)

---

## 📊 Current Status

### Phase 4 Step 2: ✅ COMPLETE

```
✅ 323 unit tests created
✅ 8 test files (all colocated)
✅ 2,800+ lines of test code
✅ All 13 components covered
✅ Comprehensive testing strategy documented
✅ Best practices established
✅ Build passing
```

### Phase 4 Step 3: 🔄 UPCOMING

```
🎯 ~48 validation schema tests
🎯 All 16 schemas covered
🎯 Valid/invalid/edge cases tested
🎯 TypeScript inference verified
```

### Phase 4 Step 4: 🔄 UPCOMING

```
🎯 ~100 accessibility tests
🎯 WCAG AA compliance
🎯 Keyboard navigation
🎯 Screen reader compatibility
```

### Phase 5: 🔄 FUTURE

```
🎯 ~100+ integration tests
🎯 Component workflows
🎯 API interactions
🎯 Redux state management
```

### Phase 6: 🔄 FUTURE

```
🎯 ~30+ E2E tests
🎯 Real user journeys
🎯 Cross-browser testing
🎯 Visual regression
```

---

## 🎯 Key Takeaways

1. **Tests are colocated with code** (button.test.tsx next to button.tsx)
   - Easy to find and maintain
   - Industry standard practice
   - No cognitive overhead

2. **All tests follow same structure** (Rendering → Props → State → A11y → Integration → Edge Cases)
   - Consistent organization
   - Predictable layout
   - Easy to add new tests

3. **Consistent naming conventions** (ComponentName.test.tsx, .integration.test.tsx, .a11y.test.tsx)
   - Clear purpose of each test
   - No ambiguity
   - IDE autocomplete works well

4. **Different test layers complement each other** (Unit → Integration → A11y → E2E)
   - Each tests different concerns
   - No redundancy
   - Together = comprehensive coverage

5. **Global utilities eliminate boilerplate** (global.testUtils.createMockUser())
   - No import overhead
   - Consistent mock data
   - Available in all tests

---

## 📞 Quick Help

### "Where do I put tests?"
- **Components**: Colocated (button.test.tsx next to button.tsx)
- **Hooks**: Colocated (useUser.test.ts next to useUser.ts)
- **Services**: Colocated (service.test.ts next to service.ts)
- **Workflows**: In __tests__/ (__tests__/workflow.integration.test.tsx)

### "What structure should my tests follow?"
See COMPONENT_TEST_COLOCATION_STRATEGY.md for templates and examples

### "How do I use mock data?"
```typescript
// No import needed! Already available globally:
const user = global.testUtils.createMockUser({ name: 'John' });
const bill = global.testUtils.createMockBill({ status: 'passed' });
```

### "How do I test accessibility?"
Unit tests include basic a11y (ARIA, keyboard). Full WCAG AA testing in Phase 4 Step 4.

### "When do I run tests?"
- During development: `pnpm test -- --watch`
- Before committing: `pnpm test:unit`
- Before deployment: `pnpm test` (all types)

---

## 🔗 Related Documents

- `TESTING_QUICK_START.md` - Quick overview
- `TESTING_ARCHITECTURE_DIAGRAM.md` - Visual architecture
- `COMPONENT_TEST_COLOCATION_STRATEGY.md` - Detailed colocation strategy
- `CONSISTENCY_AND_COMPLEMENTARITY.md` - Framework and best practices
- `PHASE_4_STEP_2_COMPLETION.md` - What was delivered
- `vitest.workspace.ts` - Configuration (7 test projects)
- `vitest.setup.ts` - Global setup entry point
- `tests/setup/vitest.ts` - Global utilities

---

**Last Updated**: December 6, 2025  
**Status**: ✅ Phase 4 Step 2 Complete  
**Next**: Phase 4 Step 3 - Validation Schema Tests
