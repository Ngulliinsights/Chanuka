# Testing Infrastructure Migration Checklist

## 🚀 Phase 1: Configuration Unification

### ✅ Completed Tasks

- [x] Created unified `vitest.workspace.unified.ts` 
  - Single source of truth for all test configuration
  - 7 test projects defined with consistent setup
  - Location: `/vitest.workspace.unified.ts`

- [x] Consolidated setup files into `/test-utils/setup/`
  - [x] `client.ts` - Unit tests with jsdom
  - [x] `client-integration.ts` - MSW + integration
  - [x] `client-a11y.ts` - Accessibility testing
  - [x] `server.ts` - Server unit tests
  - [x] `server-integration.ts` - Database integration
  - [x] `shared.ts` - Shared library tests
  - [x] `e2e.ts` - Playwright E2E tests

- [x] Created global test utilities
  - [x] `global.testUtils` - Available in all tests
  - [x] `global.integrationTestUtils` - Integration helpers
  - [x] `global.a11yTestUtils` - Accessibility helpers
  - [x] `global.e2eTestUtils` - E2E test helpers

- [x] Created test-utils directory structure
  - [x] `/test-utils/setup/` - All setup files
  - [x] `/test-utils/mocks/` - Placeholder for MSW
  - [x] `/test-utils/factories/` - Placeholder for factories
  - [x] `/test-utils/helpers/` - Placeholder for helpers
  - [x] `/test-utils/index.ts` - Barrel exports
  - [x] `/test-utils/README.md` - Comprehensive guide

- [x] Created documentation
  - [x] `/test-utils/README.md` - Setup guide
  - [x] `/docs/testing/TESTING_CONSOLIDATION_PHASE1.md` - Phase 1 summary
  - [x] This checklist

### 🔄 Next: Validation & Activation

- [ ] **Validate new config works**
  ```bash
  # Test that new workspace config loads
  cp vitest.workspace.unified.ts vitest.workspace.ts
  pnpm test --project=client-unit
  ```

- [ ] **Run all test projects**
  ```bash
  pnpm test    # Should run all 7 projects
  ```

- [ ] **Check coverage reports**
  ```bash
  pnpm test --coverage
  # Verify reports in coverage/ directory
  ```

- [ ] **Verify no errors**
  - [ ] No configuration errors
  - [ ] All polyfills working
  - [ ] Global utilities accessible
  - [ ] MSW server starting in integration tests

---

## 📋 Phase 2: Test Location Standardization (Planned)

### Goal: Colocate tests with source files

### Tasks

- [ ] **Create test file migration plan**
  - [ ] List all current test locations
  - [ ] Design feature-sliced structure
  - [ ] Create automation script for migration

- [ ] **Standardize naming conventions**
  - [ ] `*.test.ts` - Unit tests
  - [ ] `*.integration.test.ts` - Integration tests
  - [ ] `*.a11y.test.ts` - Accessibility tests
  - [ ] `*.spec.ts` - E2E tests

- [ ] **Migrate client tests**
  - [ ] Move from `src/__tests__/` to colocated locations
  - [ ] Update import paths
  - [ ] Verify tests still pass

- [ ] **Migrate server tests**
  - [ ] Move from `features/**/__tests__/` to consistent location
  - [ ] Align with client structure
  - [ ] Update database connection logic

- [ ] **Migrate shared tests**
  - [ ] Organize by functionality
  - [ ] Remove duplicate test files
  - [ ] Consolidate test utilities

- [ ] **Update CI/CD**
  - [ ] Ensure CI uses correct test patterns
  - [ ] Update artifact collection
  - [ ] Test on CI pipeline

### Estimated Time: 1-2 weeks
### Risk Level: Low (non-breaking change)

---

## 📋 Phase 3: Jest → Vitest Migration (Planned)

### Goal: Eliminate last Jest config

### Tasks

- [ ] **Identify Jest-specific code**
  ```bash
  grep -r "jest\." --include="*.ts" --include="*.tsx" .
  grep -r "require.resolve" --include="*.config.*" .
  ```

- [ ] **Convert jest.a11y.config.js**
  - [ ] Migrate to Vitest format
  - [ ] Update setup files
  - [ ] Test with `client-a11y` project

- [ ] **Update A11y test files**
  - [ ] Replace `expect.extend()` patterns
  - [ ] Update mock syntax
  - [ ] Verify tests pass

- [ ] **Remove Jest configs**
  - [ ] Delete `jest.a11y.config.js`
  - [ ] Delete `jest.config.js` (if exists)
  - [ ] Remove Jest from package.json

- [ ] **Verify all tests pass**
  - [ ] `pnpm test` should pass all suites
  - [ ] No warnings about Jest

### Estimated Time: 3-5 days
### Risk Level: Medium (config-only change)

---

## 📋 Phase 4: Performance & CI Optimization (Planned)

### Goal: Sub-5-minute test runs

### Tasks

- [ ] **Implement test sharding**
  - [ ] Configure GitHub Actions for parallel runs
  - [ ] Split tests across multiple workers
  - [ ] Track shard performance

- [ ] **Create performance budgets**
  ```typescript
  // test-utils/performance-budgets.ts
  export const TEST_BUDGETS = {
    unit: 100,        // ms per test
    integration: 5000,
    e2e: 30000
  }
  ```

- [ ] **Set up flaky test detection**
  ```bash
  ./scripts/detect-flaky-tests.ts --runs=5
  ```

- [ ] **Optimize slow tests**
  - [ ] Identify bottlenecks
  - [ ] Fix or skip slow tests
  - [ ] Add skip markers for slow E2E tests

- [ ] **Update CI/CD pipeline**
  - [ ] Implement test sharding
  - [ ] Add performance tracking
  - [ ] Create test performance dashboard

- [ ] **Document test performance**
  - [ ] Create performance baseline
  - [ ] Track improvements over time
  - [ ] Update CI documentation

### Estimated Time: 1 week
### Risk Level: Low (optimization only)

---

## 🛑 Critical Blockers to Address

### Before enabling new config:

- [ ] **Verify MSW setup**
  - [ ] MSW server starts without errors
  - [ ] Handlers properly registered
  - [ ] Integration tests intercept requests

- [ ] **Check polyfill completeness**
  - [ ] All browser APIs mocked
  - [ ] No "is not defined" errors
  - [ ] Tests run in jsdom environment

- [ ] **Validate global utilities**
  - [ ] All `global.testUtils` accessible
  - [ ] Mock data factories working
  - [ ] Test patterns available

- [ ] **Database connection (server tests)**
  - [ ] Test database accessible
  - [ ] Migrations run
  - [ ] Cleanup works between tests

---

## 📊 Success Metrics

### Phase 1 (Current)
- [x] Single workspace config created
- [x] Setup files consolidated (12 → 7)
- [x] Global utilities standardized
- [x] Documentation complete
- [ ] New config validated and active

### Phase 2 (Planned)
- [ ] 100% of tests colocated
- [ ] Naming conventions standardized
- [ ] No scattered `__tests__` directories
- [ ] Test organization clear

### Phase 3 (Planned)
- [ ] 0 Jest configs remaining
- [ ] All tests run with Vitest
- [ ] No Jest dependencies in package.json

### Phase 4 (Planned)
- [ ] Test suite runs in < 5 minutes
- [ ] 0% flaky tests (retries succeed)
- [ ] Performance dashboard active
- [ ] CI pipeline optimized

---

## 📌 Important Notes

### Deprecation Timeline

**Now (Phase 1 Complete)**:
- Keep old config files for reference
- Both configs coexist during validation

**After Validation**:
- Remove old config files
- Use only unified workspace config
- Update CI/CD to reference new paths

### Migration Best Practices

1. **Test incrementally** - Enable new config, run one project at a time
2. **Keep backups** - Don't delete old configs immediately
3. **Update CI early** - Validate in CI before local changes
4. **Document changes** - Update team on new test structure
5. **Watch for errors** - Monitor first runs carefully

### Team Communication

When ready to activate:
1. Announce in team chat
2. Share `/test-utils/README.md`
3. Update development guide
4. Schedule Q&A session if needed

---

## 🎯 Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1 (Config Unification) | 2 days | ✅ **COMPLETE** |
| Phase 2 (Test Organization) | 1-2 weeks | 📋 Planned |
| Phase 3 (Jest Migration) | 3-5 days | 📋 Planned |
| Phase 4 (Performance) | 1 week | 📋 Planned |
| **Total** | **3-4 weeks** | **In Progress** |

---

## 🚀 Quick Start After Validation

```bash
# 1. Enable unified config
cp vitest.workspace.unified.ts vitest.workspace.ts

# 2. Run all tests
pnpm test

# 3. Run specific project
pnpm test --project=client-unit

# 4. Run with coverage
pnpm test --coverage

# 5. Watch mode
pnpm test --watch

# 6. One file
pnpm test client/src/components/BillCard.test.tsx
```

---

**Last Updated**: December 6, 2024
**Phase Status**: Phase 1 ✅ Complete | Ready for Phase 2 Planning
