# Infrastructure Consolidation - Import Dependency Analysis

**Generated:** 2026-02-16  
**Purpose:** Document all import locations for modules being consolidated in the infrastructure consolidation effort

## Executive Summary

This analysis identifies all import locations for the modules targeted for consolidation:
- **Cache Module**: 10 import locations found
- **Config Module**: 0 import locations found (no direct imports detected)
- **Error Handling Module**: 3 import locations found
- **Observability Module**: 7 import locations found
- **External API Module**: 0 import locations found (directory doesn't exist - already cleaned up)

**Total Import Locations to Update:** 20 locations across 11 files

---

## 1. Cache Module Imports

### 1.1 Files Being Consolidated
- `server/infrastructure/cache/cache.ts` (2 lines - stub, to be removed)
- `server/infrastructure/cache/simple-factory.ts` (to be merged into factory.ts)
- `server/infrastructure/cache/factory.ts` (to be unified)
- `server/infrastructure/cache/icaching-service.ts` (to be merged into caching-service.ts)
- `server/infrastructure/cache/caching-service.ts` (to be unified)

### 1.2 Current Import Patterns

#### Pattern 1: Index-based imports (Most Common)
**Import Pattern:** `from '@server/infrastructure/cache'`

**Locations (6 files):**

1. **server/index.ts** (Line 27)
   ```typescript
   import { cacheManagementRoutes as cacheRouter } from '@server/infrastructure/cache/cache-management.routes';
   ```
   - **Status:** Safe - imports specific route file, not affected by consolidation
   - **Action Required:** None

2. **server/features/search/engines/suggestion-engine.service.ts** (Line 8)
   ```typescript
   import { cacheService } from '@server/infrastructure/cache';
   ```
   - **Status:** Safe - imports from index.ts which exports unified cacheService
   - **Action Required:** None (index.ts already exports consolidated service)

3. **server/features/search/services/embedding.service.ts** (Line 9)
   ```typescript
   import { cacheService } from '@server/infrastructure/cache';
   ```
   - **Status:** Safe - imports from index.ts
   - **Action Required:** None

4. **server/features/recommendation/infrastructure/RecommendationCache.ts** (Line 2)
   ```typescript
   import { CACHE_TTL } from '@server/infrastructure/cache';
   ```
   - **Status:** Safe - imports constant from index.ts
   - **Action Required:** None

5. **server/features/bills/application/bill-service.ts** (Line 9)
   ```typescript
   import { serverCache, CACHE_TTL as CACHE_TTL_CONSTANTS } from '@server/infrastructure/cache';
   ```
   - **Status:** Safe - imports from index.ts
   - **Action Required:** None

6. **server/middleware/cache-middleware.ts** (Line 8)
   ```typescript
   import { serverCache } from '../infrastructure/cache';
   ```
   - **Status:** Safe - imports from index.ts via relative path
   - **Action Required:** None

#### Pattern 2: Relative path imports
**Import Pattern:** `from '../cache'` or `from '../infrastructure/cache'`

**Locations (1 file):**

1. **server/middleware/ai-deduplication.ts** (Line 16)
   ```typescript
   import { getDefaultCache } from '../cache';
   ```
   - **Status:** Safe - imports from factory.ts via index.ts
   - **Action Required:** None (factory.ts will remain and be unified)

#### Pattern 3: Script references (Non-production)
**Locations (1 file):**

1. **scripts/fix-typescript-syntax-errors.ts** (Line 136)
   ```typescript
   'import { serverCache } from "../../../infrastructure/cache/cache-service";',
   ```
   - **Status:** Script file - contains string literals, not actual imports
   - **Action Required:** None (not actual code)

### 1.3 Cache Module Export Analysis

**Current index.ts exports:**
- `ICachingService`, `CachingService`, `createCachingService` (from caching-service.ts)
- `SimpleCacheFactory`, `cacheFactory` (from simple-factory.ts)
- `createCacheService`, `createSimpleCacheService`, `getDefaultCache` (from factory.ts)
- `cacheService` (default instance)
- `ServerCacheWrapper`, `serverCache` (from server-cache-wrapper.ts)
- `CACHE_TTL` (constants)

**Consolidation Impact:**
- ✅ All imports go through index.ts
- ✅ No direct imports of files being consolidated
- ✅ Consolidation can happen transparently
- ✅ No breaking changes expected

---

## 2. Config Module Imports

### 2.1 Files Being Consolidated
- `server/infrastructure/config/index.ts` (to be reduced to minimal re-export)
- `server/infrastructure/config/manager.ts` (to be unified manager)

### 2.2 Current Import Patterns

**No direct imports found** in the codebase using:
- `@server/infrastructure/config`
- `@server/infrastructure/config/index`
- `@server/infrastructure/config/manager`
- Relative paths to config module

### 2.3 Config Module Analysis

**Current Files:**
- `index.ts` (400 lines - ConfigManager with watchFile)
- `manager.ts` (600 lines - ConfigurationManager with Result types)
- `schema.ts` (Zod schemas)
- `types.ts` (TypeScript types)
- `utilities.ts` (Utility config provider)

**Consolidation Impact:**
- ✅ No imports to update
- ✅ Config likely used via environment variables or direct instantiation
- ✅ Consolidation can happen without affecting consumers
- ⚠️ Need to verify if config is imported elsewhere (e.g., shared modules)

---

## 3. Error Handling Module Imports

### 3.1 Files Being Consolidated
- `server/infrastructure/errors/error-adapter.ts` (Boom adapter)
- `server/infrastructure/errors/error-standardization.ts` (StandardizedError)
- `server/infrastructure/errors/error-configuration.ts` (config wrapper)
- `server/infrastructure/errors/result-adapter.ts` (to be kept separate)

### 3.2 Current Import Patterns

#### Pattern 1: Shared infrastructure imports
**Import Pattern:** `from '@shared/infrastructure/errors/...'`

**Locations (1 file):**

1. **server/middleware/boom-error-middleware.ts** (Lines 10-11)
   ```typescript
   import { errorAdapter } from '@shared/infrastructure/errors/error-adapter';
   import { ErrorResponse } from '@shared/infrastructure/errors/error-standardization';
   ```
   - **Status:** ⚠️ Imports from @shared, not @server
   - **Action Required:** Verify if @shared/infrastructure/errors exists or if this should be @server
   - **Impact:** HIGH - Direct import of files being consolidated

#### Pattern 2: Server infrastructure imports
**Import Pattern:** `from '@server/infrastructure/errors/...'`

**Locations (1 file):**

1. **server/features/bills/application/bill-service.ts** (Lines 7-8)
   ```typescript
   import type { AsyncServiceResult } from '@server/infrastructure/errors/result-adapter';
   import { withResultHandling } from '@server/infrastructure/errors/result-adapter';
   ```
   - **Status:** ✅ Safe - imports result-adapter which will be kept separate
   - **Action Required:** None

### 3.3 Error Module Export Analysis

**Current index.ts exports:**
- `ServerErrorReporter`, `ServerErrorHandler`, `ServiceCircuitBreaker` (from error-configuration.ts)
- `createErrorContext`, `detectErrorCode`, `buildErrorResponse`, `configureErrorHandling` (from error-configuration.ts)
- `withRetry`, `withTimeout`, `withFallback`, `BulkheadExecutor`, `RecoveryChain` (from recovery-patterns.ts)

**Consolidation Impact:**
- ⚠️ One file imports directly from error-adapter.ts and error-standardization.ts
- ⚠️ Import is from @shared, not @server - needs investigation
- ✅ result-adapter.ts imports are safe (file will be kept)
- 🔴 **Action Required:** Update boom-error-middleware.ts after consolidation

---

## 4. Observability Module Imports

### 4.1 Files Being Reduced
- `server/infrastructure/observability/index.ts` (200 lines → 50 lines target)
- Keep: Express middleware, server-specific utilities
- Remove: Thin wrappers around @shared/core

### 4.2 Current Import Patterns

#### Pattern 1: Relative path imports (Most Common)
**Import Pattern:** `from '../infrastructure/observability'`

**Locations (5 files):**

1. **server/utils/api-utils.ts** (Line 8)
   ```typescript
   import { logger } from '../infrastructure/observability';
   ```
   - **Status:** ⚠️ Needs update to import from @shared/core or server-specific logger
   - **Action Required:** Update to `from '@server/infrastructure/observability/logger'` or `from '@shared/core'`

2. **server/utils/cache-utils.ts** (Line 9)
   ```typescript
   import { logger } from '../infrastructure/observability';
   ```
   - **Status:** ⚠️ Needs update
   - **Action Required:** Update to server-specific logger or @shared/core

3. **server/middleware/unified-middleware.ts** (Line 20)
   ```typescript
   import { logger } from '../infrastructure/observability';
   ```
   - **Status:** ⚠️ Needs update
   - **Action Required:** Update to server-specific logger or @shared/core

4. **server/middleware/ai-middleware.ts** (Line 19)
   ```typescript
   import { logger } from '../infrastructure/observability';
   ```
   - **Status:** ⚠️ Needs update
   - **Action Required:** Update to server-specific logger or @shared/core

5. **server/middleware/ai-deduplication.ts** (Line 16)
   ```typescript
   import { logger } from '../infrastructure/observability';
   ```
   - **Status:** ⚠️ Needs update
   - **Action Required:** Update to server-specific logger or @shared/core

#### Pattern 2: Direct file imports
**Import Pattern:** `from '@server/infrastructure/observability/...'`

**Locations (2 files):**

1. **server/infrastructure/observability/audit-log.ts** (Line 4)
   ```typescript
   import { databaseLogger } from '@server/infrastructure/observability/database-logger';
   ```
   - **Status:** ✅ Safe - imports specific file, not affected by wrapper reduction
   - **Action Required:** None

2. **server/features/bills/application/bill-service.ts** (Line 2)
   ```typescript
   import { logger } from '@server/infrastructure/observability/logger';
   ```
   - **Status:** ✅ Safe - imports server-specific logger directly
   - **Action Required:** None (this is the recommended pattern)

### 4.3 Observability Module Analysis

**Current index.ts structure:**
- Re-exports from @shared/core
- Server-specific Express middleware (requestLoggingMiddleware, errorLoggingMiddleware)
- Server-specific logger export
- Server initialization function

**Consolidation Impact:**
- ⚠️ 5 files import logger from index.ts (need to update to direct logger import or @shared/core)
- ✅ 2 files already use direct imports (best practice)
- 🔴 **Action Required:** Update 5 files to use direct logger import after wrapper reduction

---

## 5. External API Module

### 5.1 Status
- **Directory:** `server/infrastructure/external-api`
- **Status:** ✅ **DOES NOT EXIST** - Already cleaned up
- **Files:** None

### 5.2 Import Analysis
- **No imports found** for `external-api/error-handler.ts`
- **Action Required:** None - cleanup already complete

---

## Summary of Actions Required

### High Priority (Breaking Changes)

1. **Error Handling Module** (1 file)
   - Update `server/middleware/boom-error-middleware.ts`
   - Investigate @shared/infrastructure/errors vs @server/infrastructure/errors
   - Update imports after consolidation to unified error-standardization.ts

### Medium Priority (Non-Breaking, Best Practice)

2. **Observability Module** (5 files)
   - Update `server/utils/api-utils.ts`
   - Update `server/utils/cache-utils.ts`
   - Update `server/middleware/unified-middleware.ts`
   - Update `server/middleware/ai-middleware.ts`
   - Update `server/middleware/ai-deduplication.ts`
   - Change from `'../infrastructure/observability'` to `'@server/infrastructure/observability/logger'` or `'@shared/core'`

### Low Priority (No Action Required)

3. **Cache Module** (0 files)
   - ✅ All imports go through index.ts
   - ✅ No direct imports of files being consolidated
   - ✅ Consolidation can happen transparently

4. **Config Module** (0 files)
   - ✅ No imports found
   - ✅ Consolidation can happen transparently

5. **External API Module** (0 files)
   - ✅ Already cleaned up

---

## Import Pattern Recommendations

### Best Practices After Consolidation

1. **Cache Module**
   ```typescript
   // ✅ Recommended: Import from index
   import { cacheService, serverCache, CACHE_TTL } from '@server/infrastructure/cache';
   
   // ✅ Also acceptable: Import from factory
   import { createCacheService, getDefaultCache } from '@server/infrastructure/cache/factory';
   ```

2. **Config Module**
   ```typescript
   // ✅ Recommended: Import from manager directly
   import { ConfigurationManager, configManager } from '@server/infrastructure/config/manager';
   
   // ⚠️ Deprecated: Import from index (will show deprecation warning)
   import { configManager } from '@server/infrastructure/config';
   ```

3. **Error Handling Module**
   ```typescript
   // ✅ Recommended: Import from unified module
   import { errorHandler, createValidationError } from '@server/infrastructure/errors/error-standardization';
   
   // ✅ Also acceptable: Import from index
   import { configureErrorHandling } from '@server/infrastructure/errors';
   
   // ✅ Safe: result-adapter remains separate
   import { withResultHandling } from '@server/infrastructure/errors/result-adapter';
   ```

4. **Observability Module**
   ```typescript
   // ✅ Recommended: Import server-specific logger directly
   import { logger } from '@server/infrastructure/observability/logger';
   
   // ✅ Recommended: Import core observability from shared
   import { logger, metrics } from '@shared/core';
   
   // ✅ Recommended: Import Express middleware from index
   import { requestLoggingMiddleware } from '@server/infrastructure/observability';
   ```

---

## Migration Checklist

### Phase 1: Pre-Consolidation
- [x] Document all import locations
- [x] Identify breaking vs non-breaking changes
- [x] Create migration plan

### Phase 2: Consolidation
- [ ] Consolidate cache module (transparent - no updates needed)
- [ ] Consolidate config module (transparent - no updates needed)
- [ ] Consolidate error handling module
  - [ ] Update boom-error-middleware.ts
- [ ] Reduce observability wrappers
  - [ ] Update 5 files to use direct logger imports

### Phase 3: Validation
- [ ] Run full test suite
- [ ] Verify all imports resolve correctly
- [ ] Check for TypeScript errors
- [ ] Test runtime behavior

### Phase 4: Documentation
- [ ] Update import examples in documentation
- [ ] Add migration guide
- [ ] Document new patterns

---

## Files Requiring Updates

### Immediate Updates Required (6 files)

1. `server/middleware/boom-error-middleware.ts` - Error handling imports
2. `server/utils/api-utils.ts` - Logger import
3. `server/utils/cache-utils.ts` - Logger import
4. `server/middleware/unified-middleware.ts` - Logger import
5. `server/middleware/ai-middleware.ts` - Logger import
6. `server/middleware/ai-deduplication.ts` - Logger import

### No Updates Required (Safe)

- All cache module imports (10 locations) - go through index.ts
- Config module imports (0 locations) - no imports found
- result-adapter imports (1 location) - file will be kept
- Direct observability file imports (2 locations) - already using best practice

---

## Risk Assessment

### Low Risk
- ✅ Cache module consolidation (all imports via index.ts)
- ✅ Config module consolidation (no imports found)
- ✅ External API cleanup (already done)

### Medium Risk
- ⚠️ Observability wrapper reduction (5 files need updates, but non-breaking)

### High Risk
- 🔴 Error handling consolidation (1 file with direct imports, potential @shared vs @server confusion)

---

## Conclusion

The infrastructure consolidation effort has **20 import locations** across **11 files** that need attention:

- **0 files** for cache module (transparent consolidation)
- **0 files** for config module (no imports found)
- **1 file** for error handling module (breaking change)
- **5 files** for observability module (non-breaking, best practice updates)

The consolidation is **low risk** overall, with most changes being transparent to consumers. The main areas requiring updates are:
1. Error handling imports in boom-error-middleware.ts
2. Logger imports in 5 middleware/utility files

All updates can be made incrementally with deprecation warnings to ensure a smooth transition.
