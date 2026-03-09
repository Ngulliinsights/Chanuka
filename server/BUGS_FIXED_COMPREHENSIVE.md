# Comprehensive Server Bug Fixes - March 2026

## Executive Summary

The server codebase has **hundreds of TypeScript compilation errors** across multiple categories. This document provides a comprehensive analysis and action plan.

## Current Status

### Type Check Results
- **Total Errors**: 500+ TypeScript errors
- **Critical**: Module resolution failures, missing dependencies
- **High**: Type mismatches, property access errors
- **Medium**: Duplicate exports, circular dependencies
- **Low**: Unused variables, deprecated warnings

## Critical Issues Fixed

### 1. Missing Dependencies ✅ FIXED
**Status**: RESOLVED

**Problem**: Three npm packages were missing:
- `pdf-parse` - PDF parsing functionality
- `limiter` - Rate limiting utilities
- `isomorphic-dompurify` - XSS sanitization

**Solution**: Installed via pnpm
```bash
pnpm add pdf-parse limiter isomorphic-dompurify --filter server
```

### 2. Module Resolution Issues ⚠️ PARTIAL
**Status**: PARTIALLY RESOLVED

**Problem**: Missing module `@server/infrastructure/monitoring/index`

**Root Cause**: Runtime module resolution issue, not TypeScript error. The file exists and exports correctly.

**Workaround**: Use `simple-server.ts` for development until circular dependencies are resolved.

### 3. Drizzle ORM Type Issues ✅ FIXED (Previously)
**Status**: RESOLVED

**Problem**: Using `float()` which doesn't exist in drizzle-orm

**Solution**: Replaced with `real()` throughout `ml_intelligence.ts`

## Remaining Issues by Category

### Category 1: Missing Exports (TS2305) - 100+ errors
**Priority**: HIGH

**Examples**:
- `@shared/types` missing: `TransparencyDashboard`, `RelationshipMapping`, `FinancialDisclosure`
- `@shared/core` missing: `performanceMonitor`, `NotFoundError`, `ERROR_CODES`
- Feature modules missing various exports

**Impact**: Prevents compilation, blocks development

**Recommended Fix**:
1. Audit all barrel exports (`index.ts` files)
2. Add missing exports or remove invalid imports
3. Use explicit imports instead of barrel exports where possible

### Category 2: Invalid Module Paths (TS2307) - 50+ errors
**Priority**: HIGH

**Examples**:
- `@shared/monitoring/performance-monitor` (doesn't exist)
- `@shared/infrastructure/nlp/sentence-classifier` (wrong path)
- `@server/infrastructure/websocket-adapter.ts` (wrong extension)

**Impact**: Prevents compilation

**Recommended Fix**:
1. Search and replace invalid paths
2. Update import statements to match actual file structure
3. Remove references to deleted/moved files

### Category 3: Property Access Errors (TS2339) - 200+ errors
**Priority**: MEDIUM

**Examples**:
- Accessing `.success`, `.error`, `.data` on `ServiceResult` without type guards
- Accessing properties on `ValidationResult` without checking
- Accessing non-existent methods on services

**Impact**: Runtime errors, type safety issues

**Recommended Fix**:
1. Add type guards before property access
2. Use discriminated unions for Result types
3. Update service interfaces to match implementations

### Category 4: Type Mismatches (TS2322) - 100+ errors
**Priority**: MEDIUM

**Examples**:
- `Promise<string>` assigned to `string`
- `unknown[]` assigned to typed arrays
- Enum mismatches

**Impact**: Type safety issues, potential runtime errors

**Recommended Fix**:
1. Add `await` where needed
2. Add type assertions with validation
3. Fix enum definitions

### Category 5: Logger Usage Errors (TS2769) - 50+ errors
**Priority**: LOW

**Location**: Primarily in `demo/real-time-tracking-demo.ts`

**Problem**: Incorrect logger.info() call signature
```typescript
// Wrong
logger.info('message', { component: 'X' });

// Correct
logger.info({ component: 'X' }, 'message');
```

**Impact**: Demo files only, doesn't affect production

**Recommended Fix**: Update all logger calls to use correct signature

### Category 6: Duplicate Exports (TS2308) - 20+ errors
**Priority**: LOW

**Examples**:
- `router` exported multiple times from bills module
- `ValidationError` exported from multiple locations

**Impact**: Ambiguous imports, potential confusion

**Recommended Fix**: Use explicit re-exports or rename duplicates

## Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ Install missing dependencies
2. Fix invalid module paths (search & replace)
3. Add missing exports to shared modules
4. Fix ServiceResult/ValidationResult usage patterns

### Phase 2: Type Safety (Week 2)
1. Add type guards for Result types
2. Fix Promise/async mismatches
3. Update service interfaces
4. Fix enum definitions

### Phase 3: Cleanup (Week 3)
1. Fix logger usage in demo files
2. Resolve duplicate exports
3. Remove unused imports
4. Update deprecated APIs

### Phase 4: Architecture (Week 4)
1. Break up circular dependencies
2. Refactor barrel exports
3. Implement dependency injection
4. Add integration tests

## Development Workflow

### Current Recommendation
**Use `simple-server.ts` for development:**
```bash
cd server
npm run dev:simple
```

This bypasses complex infrastructure modules with circular dependencies.

### Future Goal
**Full server with all features:**
```bash
cd server
npm run dev:full
```

This requires resolving circular dependencies in database infrastructure.

## Testing Strategy

### Unit Tests
```bash
cd server
npm test
```

### Type Checking
```bash
cd server
npm run type-check
```

### Startup Tests
```bash
cd server
npm run test:startup
```

## Files Requiring Immediate Attention

### High Priority
1. `server/infrastructure/schema/index.ts` - Fix exports
2. `server/features/*/index.ts` - Fix barrel exports
3. `shared/types/index.ts` - Add missing exports
4. `shared/core/index.ts` - Add missing exports

### Medium Priority
1. `server/features/*/application/*.ts` - Fix ServiceResult usage
2. `server/infrastructure/database/*.ts` - Resolve circular deps
3. `server/middleware/*.ts` - Fix ValidationResult usage

### Low Priority
1. `demo/*.ts` - Fix logger usage
2. `server/scripts/*.ts` - Update deprecated APIs

## Metrics

### Before Fixes
- TypeScript Errors: 500+
- Compilation: FAIL
- Runtime: PARTIAL (simple-server works)

### After Phase 1 (Target)
- TypeScript Errors: <200
- Compilation: PASS (with warnings)
- Runtime: FULL (all features work)

### After Phase 4 (Target)
- TypeScript Errors: 0
- Compilation: PASS (no warnings)
- Runtime: FULL (production-ready)
- Test Coverage: >80%

## Conclusion

The server has significant type safety issues but is functionally operational using `simple-server.ts`. A phased approach over 4 weeks can resolve all issues and make the codebase production-ready.

**Immediate Action**: Continue using `simple-server.ts` for development while systematically fixing type errors.

**Long-term Goal**: Refactor infrastructure to eliminate circular dependencies and achieve 100% type safety.
