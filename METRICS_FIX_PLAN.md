# Metrics Fix Plan - Immediate Action

**Date**: 2026-02-17  
**Current Status**: 2 out of 7 metrics met (28.6%)

## Current Metrics

| Metric | Current | Target | Baseline | Status | Improvement |
|--------|---------|--------|----------|--------|-------------|
| TypeScript Suppressions | 0 | 0 | 3 | ✅ | 100% |
| Syntax Errors | 0 | 0 | 3 | ✅ | 100% |
| Type Safety Violations | 395 | 0 | 788 | ❌ | 49.9% |
| TODO/FIXME Comments | 9 | 0 | 191 | ❌ | 95.3% |
| ESLint Suppressions | 91 | 10 | 99 | ❌ | 8.1% |
| Commented Imports | 80 | 0 | 33 | ❌ | -142.4% (regression!) |
| Property Tests | Not running | 100% | 67% | ❌ | N/A |

## Priority 1: Fix Property Tests (CRITICAL)

Property tests are not running at all. This is blocking verification.

**Actions:**
1. Run property tests to identify failures
2. Fix any test infrastructure issues
3. Fix failing tests
4. Verify 100% pass rate

**Command:**
```bash
npm run test:integration
```

## Priority 2: Fix Commented Imports (REGRESSION)

This has regressed from 33 to 80 - we've made it worse!

**Actions:**
1. Scan for all commented imports
2. Identify which modules are missing
3. Either:
   - Implement missing modules
   - Remove commented imports if not needed
   - Fix import paths

**Command:**
```bash
npm run scan:todos
```

## Priority 3: Reduce Type Safety Violations (395 → 0)

We've made good progress (49.9% reduction) but need to eliminate all 395 remaining instances.

**Actions:**
1. Run type safety scanner to identify remaining violations
2. Prioritize by severity (server/shared first)
3. Fix in batches of 50-100
4. Use automated templates where possible

**Commands:**
```bash
npm run scan:type-violations
npm run fix:enum-conversions
npm run fix:api-responses
npm run fix:database-operations
```

## Priority 4: Eliminate TODO/FIXME Comments (9 → 0)

Only 9 remaining - should be quick to fix.

**Actions:**
1. Identify the 9 remaining TODO/FIXME comments
2. Fix each one or convert to proper issue tracking
3. Verify all are resolved

**Command:**
```bash
npm run scan:todos
```

## Priority 5: Reduce ESLint Suppressions (91 → 10)

Need to reduce by 81 suppressions.

**Actions:**
1. Scan for all ESLint suppressions
2. Fix underlying issues instead of suppressing
3. Keep only justified suppressions (<10)

**Commands:**
```bash
npm run scan:eslint-suppressions
npm run fix:eslint-suppressions
```

## Execution Order

1. **Property Tests** - Fix immediately (blocking)
2. **Commented Imports** - Fix regression (80 → 0)
3. **TODO/FIXME** - Quick wins (9 → 0)
4. **Type Safety** - Systematic reduction (395 → 0)
5. **ESLint Suppressions** - Final cleanup (91 → 10)

## Success Criteria

- ✅ Property Tests: 100% pass rate
- ✅ Commented Imports: 0
- ✅ TODO/FIXME: 0
- ✅ Type Safety: 0 (or <10 with justification)
- ✅ ESLint Suppressions: <10 with justification

## Estimated Time

- Property Tests: 2-4 hours
- Commented Imports: 2-3 hours
- TODO/FIXME: 1-2 hours
- Type Safety: 8-12 hours
- ESLint Suppressions: 3-4 hours

**Total: 16-25 hours (2-3 days)**
