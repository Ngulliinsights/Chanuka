# Baseline Error Analysis - Import Resolution Audit

**Date**: 2026-02-21  
**Spec**: `.kiro/specs/import-resolution-audit`  
**Phase**: Phase 0 - Baseline Capture

## Executive Summary

This document provides a comprehensive analysis of TypeScript compilation errors across the Chanuka monorepo before any remediation work begins. This baseline serves as the ground truth for measuring progress and detecting regressions during the import resolution audit.

### Total Error Count: 8,797 errors

| Package | Total Errors | Module Resolution Errors | % Module Resolution |
|---------|--------------|--------------------------|---------------------|
| **client** | 2,571 | 115 | 4.5% |
| **server** | 5,167 | 1,266 | 24.5% |
| **shared** | 1,059 | 55 | 5.2% |
| **root** | 0 | 0 | 0% |
| **TOTAL** | **8,797** | **1,436** | **16.3%** |

### Key Findings

1. **Module Resolution Issues**: 1,436 errors (16.3% of total) are module resolution failures - the primary target of this audit
2. **Server Package Most Affected**: Server has 5,167 errors (58.7% of total), with 1,266 module resolution errors
3. **Type Safety Issues Dominant**: 1,564 TS18046 (unknown type) errors indicate widespread type safety problems
4. **Unused Code**: 1,570 TS6133 errors (declared but never read) suggest significant dead code
5. **Regression Canaries**: 1,121 files have zero errors and will serve as regression detectors

## Error Distribution by Category

### Module Resolution Errors (Primary Target)

These are the errors this audit specifically aims to resolve:

| Error Code | Description | Client | Server | Shared | Total |
|------------|-------------|--------|--------|--------|-------|
| **TS2307** | Cannot find module | 16 | 1,004 | 33 | **1,053** |
| **TS2305** | Module has no exported member | 79 | 115 | 18 | **212** |
| **TS2614** | Module has no exported member (alternative) | 1 | 96 | 0 | **97** |
| **TS2724** | Module has no exported member (named) | 19 | 51 | 4 | **74** |
| **SUBTOTAL** | | **115** | **1,266** | **55** | **1,436** |

**Analysis**: 
- TS2307 (module not found) dominates with 1,053 errors (73% of module resolution errors)
- Server package has 88% of all module resolution errors
- This aligns with the design document's estimate of ~1,200 module resolution errors

### Type Safety Errors (Out of Scope)

These errors are documented but not addressed in this audit:

| Error Code | Description | Client | Server | Shared | Total |
|------------|-------------|--------|--------|--------|-------|
| **TS18046** | Type is 'unknown' | 390 | 793 | 381 | **1,564** |
| **TS18048** | Possibly undefined | 106 | 125 | 13 | **244** |
| **TS18047** | Possibly null | 1 | 2 | 9 | **12** |
| **TS7006** | Implicit any type | 14 | 492 | 3 | **509** |
| **TS2304** | Cannot find name | 146 | 453 | 12 | **611** |
| **TS2339** | Property does not exist | 390 | 305 | 81 | **776** |
| **TS2322** | Type not assignable | 102 | 112 | 49 | **263** |
| **SUBTOTAL** | | **1,149** | **2,282** | **548** | **3,979** |

**Analysis**:
- Type safety errors represent 45% of all errors
- These will be addressed in separate specs (type-system-standardization, server-typescript-errors-remediation)

### Code Quality Errors (Out of Scope)

| Error Code | Description | Client | Server | Shared | Total |
|------------|-------------|--------|--------|--------|-------|
| **TS6133** | Declared but never read | 639 | 810 | 121 | **1,570** |
| **TS6138** | Property declared but never read | 2 | 6 | 2 | **10** |
| **TS7030** | Not all code paths return value | 34 | 35 | 0 | **69** |
| **TS2353** | Object literal unknown property | 124 | 9 | 52 | **185** |
| **SUBTOTAL** | | **799** | **860** | **175** | **1,834** |

**Analysis**:
- Unused code errors (TS6133/TS6138) represent 18% of all errors
- These indicate incomplete migrations and dead code

### Other Errors

Remaining 1,548 errors across various categories (TS2416, TS2345, TS2769, TS2459, etc.)

## Regression Canaries

Files with zero TypeScript errors serve as regression detectors. If any of these files gain errors during remediation, it indicates a regression that must be investigated immediately.

### Canary Summary

| Package | Total TS Files | Files with Errors | Canaries (Zero Errors) | Canary % |
|---------|----------------|-------------------|------------------------|----------|
| **client** | 1,235 | 547 | 724 | 58.6% |
| **server** | 746 | 472 | 274 | 36.7% |
| **shared** | 233 | 110 | 123 | 52.8% |
| **TOTAL** | **2,214** | **1,129** | **1,121** | **50.6%** |

### Critical Canaries (High-Risk Areas)

These canary files are in areas likely to be affected by import fixes and should be monitored closely:

#### Client Package (Sample - 20 of 724)
```
client/src/app/providers/AppProviders.tsx
client/src/app/shell/AppRouter.tsx
client/src/app/shell/ProtectedRoute.tsx
client/src/core/analytics/AnalyticsProvider.tsx
client/src/core/api/authentication.ts
client/src/core/api/bills.ts
client/src/core/api/cache-manager.ts
client/src/core/api/circuit-breaker/core.ts
client/src/core/api/config.ts
client/src/core/error/ErrorBoundary.tsx
client/src/features/bills/components/BillCard.tsx
client/src/features/bills/hooks/useBills.ts
client/src/features/users/components/UserProfile.tsx
client/src/lib/hooks/useDebounce.ts
client/src/lib/utils/format.ts
client/src/pages/BillDetailPage.tsx
client/src/pages/DashboardPage.tsx
client/src/pages/HomePage.tsx
client/src/pages/LoginPage.tsx
client/src/pages/NotFoundPage.tsx
```

#### Server Package (Sample - 20 of 274)
```
server/config/development.ts
server/config/index.ts
server/config/production.ts
server/features/admin/index.ts
server/features/advocacy/domain/errors/advocacy-errors.ts
server/features/advocacy/domain/events/advocacy-events.ts
server/features/alert-preferences/domain/repositories/alert-preference-repository.ts
server/features/analysis/application/coverage-analyzer.service.ts
server/features/bills/domain/entities/bill.ts
server/features/bills/domain/value-objects/bill-status.ts
server/features/community/domain/entities/comment.ts
server/features/notifications/domain/entities/notification.ts
server/features/users/domain/entities/user.ts
server/infrastructure/cache/redis-client.ts
server/infrastructure/database/migrations/index.ts
server/infrastructure/logging/logger.ts
server/infrastructure/security/encryption.ts
server/middleware/error-handler.ts
server/middleware/validation.ts
server/routes/index.ts
```

#### Shared Package (Sample - 20 of 123)
```
shared/constants/error-codes.ts
shared/constants/feature-flags.ts
shared/constants/index.ts
shared/constants/limits.ts
shared/core/middleware/index.ts
shared/core/middleware/types.ts
shared/core/primitives/constants/http-status.ts
shared/core/primitives/types/branded.ts
shared/core/primitives/types/maybe.ts
shared/core/primitives/types/result.ts
shared/core/types/feature-flags.ts
shared/core/types/index.ts
shared/core/types/realtime.ts
shared/core/types/services.ts
shared/core/types/validation-types.ts
shared/types/api/index.ts
shared/types/domains/authentication/index.ts
shared/types/domains/bills/index.ts
shared/types/domains/users/index.ts
shared/utils/validation.ts
```

**Full canary lists available in**: `regression_canaries.json`

## Package-Specific Analysis

### Client Package (2,571 errors)

**Error Breakdown**:
- Module resolution: 115 errors (4.5%)
- Type safety: 1,149 errors (44.7%)
- Code quality: 799 errors (31.1%)
- Other: 508 errors (19.7%)

**Top Error Types**:
1. TS6133 (unused declarations): 639 errors
2. TS18046 (unknown type): 390 errors
3. TS2339 (property does not exist): 390 errors
4. TS2353 (unknown property in object literal): 124 errors
5. TS18048 (possibly undefined): 106 errors

**Affected Areas** (based on error file paths):
- `client/src/core/api/` - API client type mismatches (skipCache property, ApiRequest types)
- `client/src/core/auth/` - Auth types and RBAC (User type not exported, UserRole not found)
- `client/src/core/analytics/` - AnalyticsEvent type issues
- `client/src/features/` - Various feature-specific type issues

### Server Package (5,167 errors)

**Error Breakdown**:
- Module resolution: 1,266 errors (24.5%) ⚠️ **HIGHEST**
- Type safety: 2,282 errors (44.2%)
- Code quality: 860 errors (16.6%)
- Other: 759 errors (14.7%)

**Top Error Types**:
1. TS2307 (module not found): 1,004 errors ⚠️ **PRIMARY TARGET**
2. TS6133 (unused declarations): 810 errors
3. TS18046 (unknown type): 793 errors
4. TS7006 (implicit any): 492 errors
5. TS2304 (cannot find name): 453 errors

**Affected Areas** (based on error file paths):
- `server/features/` - Most features have broken imports to infrastructure modules
- `server/infrastructure/` - Missing or moved modules (observability, database, error-handling)
- `server/middleware/` - Auth middleware imports broken
- `server/demo/` and `server/examples/` - Outdated example code with broken imports

**Critical Import Patterns** (from sample errors):
```
Cannot find module '@server/infrastructure/observability'
Cannot find module '@server/infrastructure/error-handling'
Cannot find module '@server/infrastructure/database'
Cannot find module '@server/middleware/auth'
Cannot find module '@shared/database'
Cannot find module '@shared/schema'
Cannot find module '@workspace/types/...'
```

### Shared Package (1,059 errors)

**Error Breakdown**:
- Module resolution: 55 errors (5.2%)
- Type safety: 548 errors (51.7%)
- Code quality: 175 errors (16.5%)
- Other: 281 errors (26.5%)

**Top Error Types**:
1. TS18046 (unknown type): 381 errors
2. TS6133 (unused declarations): 121 errors
3. TS2339 (property does not exist): 81 errors
4. TS2353 (unknown property in object literal): 52 errors
5. TS2322 (type not assignable): 49 errors

**Affected Areas**:
- `shared/core/middleware/` - Middleware provider type mismatches
- `shared/core/types/` - Auth types (User type not found)
- `shared/core/utils/` - Various utility type issues
- `shared/ml/models/` - ML model type safety issues
- `shared/index.ts` - Re-export ambiguities and missing modules

**Critical Import Patterns**:
```
Cannot find module './database/index'
Cannot find module './schema/index'
Cannot find module '@shared/core/src/...' (incorrect path structure)
Cannot find module '../../../schema/foundation'
```

## Cross-Reference with Project Structure

Based on the design document's structural hotspot investigation, the following areas are confirmed as high-risk:

### Confirmed Hotspots

1. **Compiled Output in Source Tree** ✅
   - `client/src/core/websocket/` has `.js`, `.d.ts` files alongside `.ts`
   - Risk: Imports may resolve to stale compiled artifacts

2. **Duplicated Security UI Components** ✅
   - `client/src/core/security/ui/` vs `client/src/features/security/ui/`
   - Both locations exist with similar file structures

3. **Duplicated useAuth Hook** ✅
   - `client/src/core/auth/hooks/useAuth.tsx` vs `client/src/features/users/hooks/useAuth.tsx`
   - Both have errors related to User type not being exported

4. **Empty server/infrastructure/errors/** ✅
   - Imports to `@server/infrastructure/errors` fail
   - Likely moved to `@server/infrastructure/error-handling`

5. **FSD Migration Boundary** ✅
   - `client/src/lib/` still contains substantial code
   - `client/src/features/` has overlapping functionality

### Module Resolution Error Patterns

From the baseline, we can identify these import failure patterns:

#### Pattern 1: Workspace Alias Not Recognized
```
Cannot find module '@workspace/types/...'
```
**Count**: ~50 errors  
**Category**: C (Alias Not Recognized)  
**Fix**: Add @workspace/* alias to all tool configs

#### Pattern 2: Moved Infrastructure Modules
```
Cannot find module '@server/infrastructure/observability'
Cannot find module '@server/infrastructure/error-handling'
Cannot find module '@server/infrastructure/database'
```
**Count**: ~300 errors  
**Category**: A (Stale Path) or B (Deleted/Superseded)  
**Fix**: Update import paths or map to new locations

#### Pattern 3: Missing Shared Modules
```
Cannot find module '@shared/database'
Cannot find module '@shared/schema'
```
**Count**: ~100 errors  
**Category**: B (Deleted/Superseded)  
**Fix**: Map to actual locations or remove if deprecated

#### Pattern 4: Incorrect Path Structure
```
Cannot find module '@shared/core/src/...'
```
**Count**: ~20 errors  
**Category**: A (Stale Path)  
**Fix**: Remove '/src/' from path

#### Pattern 5: Named Export Missing
```
Module has no exported member 'User'
Module has no exported member 'BaseError'
Module has no exported member 'NewBill'
```
**Count**: ~383 errors  
**Category**: E (Named Export Renamed/Removed)  
**Fix**: Find new export location or name

## Baseline Artifacts

The following files capture the complete baseline state:

1. **baseline_tsc_root.txt** - Root package errors (0 errors)
2. **baseline_tsc_client.txt** - Client package errors (2,571 errors)
3. **baseline_tsc_server.txt** - Server package errors (5,167 errors)
4. **baseline_tsc_shared.txt** - Shared package errors (1,059 errors)
5. **baseline_vitest.txt** - Test runner errors (captured but not analyzed in detail)
6. **baseline_error_counts.json** - Structured error data by category
7. **regression_canaries.json** - Complete list of zero-error files

## Success Criteria for This Audit

Based on this baseline, the import resolution audit will be considered successful when:

1. **Module resolution errors reduced from 1,436 to 0** (100% reduction)
2. **Zero regressions in canary files** (1,121 files must remain error-free)
3. **Total errors reduced by at least 1,400** (from 8,797 to ≤7,397)
4. **All broken imports categorized** (A/B/C/D/E classification complete)
5. **Structural ambiguities documented** (canonical versions identified for all duplicates)

## Next Steps

With this baseline established, proceed to:

1. **Phase 1**: Fix alias resolution root cause (config changes)
2. **Phase 2**: Investigate structural hotspots (duplicates, compiled artifacts)
3. **Phase 3**: Full import scan and categorization
4. **Phase 4**: Manual fix protocol (one file at a time)
5. **Phase 5**: Validation and error delta report

## Notes

- This baseline was captured on 2026-02-21 before any remediation work
- No source code changes were made during baseline capture
- Error counts may include some transitive errors (fixing one import may resolve multiple errors)
- Some errors may be newly visible after import fixes (previously unreachable code)
- The baseline represents the "ground truth" for regression detection

---

**Generated by**: analyze_baseline.cjs and find_canaries.cjs  
**Spec Reference**: `.kiro/specs/import-resolution-audit/design.md`  
**Requirements**: TR-1, US-1
