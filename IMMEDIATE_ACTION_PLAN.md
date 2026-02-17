# Immediate Action Plan - Fix Failing Metrics

**Date**: 2026-02-17  
**Status**: 2/7 metrics met (28.6%)

## Executive Summary

Current state analysis shows:
- ✅ TypeScript Suppressions: 0 (GOOD)
- ✅ Syntax Errors: 0 (GOOD)
- ❌ Type Safety Violations: 395 remaining (49.9% improvement from 788)
- ❌ TODO/FIXME Comments: 9 remaining (95.3% improvement from 191)
- ❌ ESLint Suppressions: 91 remaining (8.1% improvement from 99)
- ❌ Commented Imports: 80 found (REGRESSION from 33 baseline!)
- ❌ Property Tests: 21 failed | 211 passed (90.9% pass rate)

## Priority 1: Fix Property Test Failures (21 tests)

### Test Results Summary
- **Total**: 232 tests
- **Passed**: 211 (90.9%)
- **Failed**: 21 (9.1%)
- **Errors**: 20 unhandled errors

### Failed Tests by Category

1. **Migration Type Generation** (2 failures)
   - Missing type definitions for core tables (users, bills, comments, sponsors, committees)
   - Type generation consistency issues

2. **WebSocket Message Batching** (6 failures)
   - Re-render count issues (expected 1, got 2)
   - Batch timer clearing issues
   - Empty batch handling

3. **Serialization Consistency** (2 failures)
   - Invalid Date (NaN) handling in ISO 8601 format
   - Empty string validation in deserialization

4. **Analytics Service** (1 failure)
   - Invalid time value error in trackEvent

5. **Dashboard Config Validation** (1 failure)
   - __proto__ pollution in widget config

6. **Error Structure Consistency** (1 failure)
   - Whitespace-only error messages
   - __proto__ in field names

7. **API Retry Logic** (2 failures + unhandled errors)
   - Timer mocking issues
   - Timeout errors

8. **Unhandled Errors** (20 errors)
   - Vitest worker timeouts
   - Timer mocking issues

### Action Items

#### A. Fix Date Validation Issues
```bash
# Files to fix:
- shared/utils/serialization/json.ts
- shared/utils/transformers/base.ts
```
**Issue**: Invalid Date (NaN) not being rejected before serialization
**Fix**: Add validation to reject NaN dates with descriptive error

#### B. Fix WebSocket Batching
```bash
# Files to fix:
- client/src/core/websocket/manager.ts (or wherever batching is implemented)
```
**Issue**: Re-render count and timer management
**Fix**: Ensure proper batching and single re-render per batch

#### C. Fix Migration Type Generation
```bash
# Files to fix:
- scripts/database/generate-types-simple.ts
- scripts/database/post-generate-transform.ts
```
**Issue**: Missing type definitions for core tables
**Fix**: Ensure all tables have generated types

#### D. Fix Dashboard Config Validation
```bash
# Files to fix:
- client/src/features/dashboard/validation/config.ts
```
**Issue**: __proto__ pollution vulnerability
**Fix**: Add validation to reject __proto__ in config objects

#### E. Fix API Retry Logic Tests
```bash
# Files to fix:
- tests/properties/api-retry-logic.property.test.ts
```
**Issue**: Timer mocking not set up correctly
**Fix**: Add vi.useFakeTimers() in test setup

#### F. Fix Error Structure Validation
```bash
# Files to fix:
- shared/utils/errors/context.ts
- shared/validation/schemas/*.ts
```
**Issue**: Whitespace-only strings and __proto__ not rejected
**Fix**: Add validation for whitespace and dangerous property names

## Priority 2: Fix Commented Imports Regression (80 → 0)

This is a REGRESSION - we've made it worse!

### Action Items
1. Run scan to identify all 80 commented imports
2. For each import:
   - Check if module exists
   - If missing: implement stub or remove import
   - If exists: fix import path
3. Verify all imports resolve

```bash
npm run scan:todos
# Then manually review and fix each commented import
```

## Priority 3: Fix Remaining TODO/FIXME (9 → 0)

Only 9 remaining - quick wins!

### Action Items
1. Identify the 9 remaining comments
2. Fix each one or convert to issue tracker
3. Verify all resolved

```bash
npm run scan:todos
```

## Priority 4: Reduce Type Safety Violations (395 → 0)

Good progress (49.9% reduction) but need to finish.

### Action Items
1. Run type safety scanner
2. Fix in batches using automated templates
3. Focus on server/ and shared/ first

```bash
npm run scan:type-violations
npm run fix:enum-conversions
npm run fix:api-responses
npm run fix:database-operations
```

## Priority 5: Reduce ESLint Suppressions (91 → 10)

Need to reduce by 81 suppressions.

### Action Items
1. Scan for all suppressions
2. Fix underlying issues
3. Keep only justified ones (<10)

```bash
npm run scan:eslint-suppressions
npm run fix:eslint-suppressions
```

## Execution Timeline

### Day 1 (Today)
- [ ] Fix property test failures (Priority 1A-F)
- [ ] Run property tests again to verify fixes
- [ ] Target: 100% pass rate

### Day 2
- [ ] Fix commented imports regression (Priority 2)
- [ ] Fix remaining TODO/FIXME (Priority 3)
- [ ] Target: 0 commented imports, 0 TODO/FIXME

### Day 3
- [ ] Reduce type safety violations (Priority 4)
- [ ] Target: <100 violations

### Day 4
- [ ] Continue type safety fixes
- [ ] Reduce ESLint suppressions (Priority 5)
- [ ] Target: 0 type safety violations, <10 ESLint suppressions

### Day 5
- [ ] Final verification
- [ ] Run all metrics
- [ ] Target: 7/7 metrics met

## Success Criteria

- ✅ Property Tests: 100% pass rate (232/232)
- ✅ Commented Imports: 0
- ✅ TODO/FIXME: 0
- ✅ Type Safety: 0
- ✅ ESLint Suppressions: <10 with justification
- ✅ TypeScript Suppressions: 0 (already met)
- ✅ Syntax Errors: 0 (already met)

## Commands to Run

```bash
# Check current status
npm run verify:metrics

# Fix property tests
npx vitest run --config tests/properties/vitest.config.ts

# Scan for issues
npm run scan:type-violations
npm run scan:todos
npm run scan:eslint-suppressions

# Apply automated fixes
npm run fix:eslint-suppressions
npm run fix:enum-conversions
npm run fix:api-responses
npm run fix:database-operations

# Track progress
npm run track:progress

# Final verification
npm run verify:metrics
npm test
npm run build
```

## Notes

- Property tests are the blocker - fix these first
- Commented imports regression needs immediate attention
- Type safety violations are decreasing but need final push
- Most metrics are close to target - achievable in 5 days
