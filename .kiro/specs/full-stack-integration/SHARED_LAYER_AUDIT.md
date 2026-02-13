# Shared Layer Audit Report

## Executive Summary

This audit identifies server-only code currently residing in the shared layer that violates the principle of client-server separation. The shared layer should only contain code that is safe for use in both client and server contexts.

**Date**: 2026-02-12  
**Spec**: Full-Stack Integration  
**Task**: 11.1 - Audit shared layer for server-only code  
**Requirements**: 7.3

## Findings

### 1. Caching Infrastructure (HIGH PRIORITY)

**Location**: `shared/core/caching/`

**Issue**: Complete caching infrastructure including Redis adapters, clustering, compression, and monitoring.

**Files Identified**:
- `shared/core/caching/` (entire directory - 50+ files)
  - `adapters/` - Cache adapters (Redis, Memory, etc.)
  - `clustering/` - Distributed cache clustering
  - `compression/` - Cache compression utilities
  - `monitoring/` - Cache monitoring and metrics
  - `patterns/` - Cache patterns (write-through, write-behind, etc.)
  - `serialization/` - Cache serialization
  - `tagging/` - Cache tagging system
  - `warming/` - Cache warming strategies
  - Core files: `cache.ts`, `caching-service.ts`, `cache-factory.ts`, etc.

**Reason**: Caching is server-only infrastructure. Clients don't need cache adapters, clustering, or monitoring.

**Migration Target**: `server/infrastructure/cache/`

**Impact**: HIGH - Many files reference caching utilities

---

### 2. Middleware (HIGH PRIORITY)

**Location**: `shared/core/middleware/`

**Issue**: Express middleware including authentication, rate limiting, error handling, and validation middleware.

**Files Identified**:
- `shared/core/middleware/` (entire directory - 20+ files)
  - `auth/` - Authentication middleware
  - `cache/` - Cache middleware
  - `error-handler/` - Error handling middleware
  - `rate-limit/` - Rate limiting middleware
  - `validation/` - Validation middleware
  - Core files: `ai-middleware.ts`, `ai-deduplication.ts`, `unified.ts`, `registry.ts`, etc.

**Dependencies**: All files import from `express` (Request, Response, NextFunction)

**Reason**: Middleware is server-only. Express middleware cannot run in browser contexts.

**Migration Target**: `server/middleware/`

**Impact**: HIGH - Middleware is referenced throughout the codebase

---

### 3. Configuration Management (MEDIUM PRIORITY)

**Location**: `shared/core/config/`

**Issue**: Server configuration management including environment-specific settings.

**Files Identified**:
- `shared/core/config/manager.ts` - Configuration manager
- `shared/core/config/schema.ts` - Configuration schemas
- `shared/core/config/types.ts` - Configuration types
- `shared/core/config/utilities.ts` - Configuration utilities

**Reason**: Server configuration management is server-only. Clients should receive configuration through API endpoints, not direct access to server config.

**Migration Target**: `server/infrastructure/config/`

**Impact**: MEDIUM - Configuration is used by server-side code

---

### 4. Observability References (HIGH PRIORITY)

**Location**: Multiple files in `shared/core/`

**Issue**: References to non-existent `shared/core/observability/` directory. The observability code has been moved to `server/infrastructure/observability/` but imports haven't been updated.

**Files with Broken Imports**:
- `shared/core/index.ts` - Exports from observability
- `shared/core/utils/api-utils.ts` - Imports logger
- `shared/core/utils/cache-utils.ts` - Imports logger
- `shared/core/utils/data-utils.ts` - Imports logger
- `shared/core/utils/performance-utils.ts` - Imports logger
- `shared/core/utils/security-utils.ts` - Imports logger
- `shared/core/utils/response-helpers.ts` - Imports ErrorDomain
- `shared/core/utils/browser-logger.ts` - Imports logging types
- `shared/core/caching/caching-service.ts` - Imports BaseError
- `shared/core/caching/single-flight-cache.ts` - Imports logger
- `shared/core/caching/validation.ts` - Imports logger
- `shared/core/caching/key-generator.ts` - Imports logger
- `shared/core/middleware/unified.ts` - Imports error handlers and logger
- `shared/core/middleware/ai-middleware.ts` - Imports logger
- `shared/core/middleware/ai-deduplication.ts` - Imports logger
- `shared/core/middleware/error-handler/provider.ts` - Imports error middleware
- `shared/core/types/index.ts` - Exports observability types

**Reason**: Observability (logging, error management, tracing, metrics) is server-only infrastructure.

**Migration Target**: Already moved to `server/infrastructure/observability/` - need to update imports

**Impact**: HIGH - Broken imports causing compilation issues

---

### 5. Server-Only Utilities (MEDIUM PRIORITY)

**Location**: `shared/core/utils/`

**Issue**: Several utilities that are server-specific or have server-only dependencies.

**Files Identified**:
- `shared/core/utils/response-helpers.ts` - Express Response helpers
- `shared/core/utils/correlation-id.ts` - Express middleware for correlation IDs
- `shared/core/utils/api-utils.ts` - Server API utilities with logging
- `shared/core/utils/cache-utils.ts` - Cache utilities with server dependencies
- `shared/core/utils/anonymity-service.ts` - Server-side anonymity service

**Reason**: These utilities depend on Express or server-only infrastructure.

**Migration Target**: `server/utils/` or appropriate server subdirectories

**Impact**: MEDIUM - Some utilities may be used by server code

---

### 6. Express Type Dependencies (HIGH PRIORITY)

**Location**: Multiple files in `shared/core/`

**Issue**: Direct imports of Express types (Request, Response, NextFunction) in shared layer.

**Files Identified**:
- `shared/core/types/auth.types.ts` - Imports Request from express
- All middleware files (see section 2)
- All utility files with Express dependencies (see section 5)

**Reason**: Express is a server-only framework. Importing Express types makes code non-portable to client.

**Migration Target**: Move files with Express dependencies to server layer

**Impact**: HIGH - Indicates server-only code in shared layer

---

### 7. Database References (LOW PRIORITY)

**Location**: `shared/types/database/`

**Issue**: Database type definitions are in shared layer, which is acceptable for type definitions but should be verified.

**Files Identified**:
- `shared/types/database/tables.ts` - Database table types
- `shared/types/database/generated-tables.ts` - Generated database types
- `shared/types/database/generated-domains.ts` - Generated domain types

**Reason**: Type definitions are acceptable in shared layer as they're compile-time only. However, ensure no runtime database code exists.

**Migration Target**: No migration needed - types are acceptable

**Impact**: LOW - Types are compile-time only

---

## Summary Statistics

| Category | Files Affected | Priority | Status |
|----------|---------------|----------|--------|
| Caching Infrastructure | 50+ | HIGH | Needs Migration |
| Middleware | 20+ | HIGH | Needs Migration |
| Configuration | 4 | MEDIUM | Needs Migration |
| Observability References | 15+ | HIGH | Needs Import Updates |
| Server-Only Utilities | 5 | MEDIUM | Needs Migration |
| Express Dependencies | 25+ | HIGH | Needs Migration |
| Database Types | 3 | LOW | No Action Needed |

**Total Files Requiring Action**: ~100+ files

---

## Migration Plan

### Phase 1: Fix Broken Observability Imports (IMMEDIATE)
1. Update all imports from `shared/core/observability/` to `server/infrastructure/observability/`
2. Remove observability exports from `shared/core/index.ts`
3. Verify compilation after changes

### Phase 2: Move Caching Infrastructure (HIGH PRIORITY)
1. Create `server/infrastructure/cache/` directory
2. Move all files from `shared/core/caching/` to `server/infrastructure/cache/`
3. Update all imports throughout codebase
4. Remove caching exports from `shared/core/index.ts`

### Phase 3: Move Middleware (HIGH PRIORITY)
1. Create `server/middleware/` directory structure
2. Move all files from `shared/core/middleware/` to `server/middleware/`
3. Update all imports throughout codebase
4. Remove middleware exports from `shared/core/index.ts`

### Phase 4: Move Configuration (MEDIUM PRIORITY)
1. Create `server/infrastructure/config/` directory (if not exists)
2. Move all files from `shared/core/config/` to `server/infrastructure/config/`
3. Update all imports throughout codebase

### Phase 5: Move Server-Only Utilities (MEDIUM PRIORITY)
1. Identify which utilities are truly server-only
2. Move server-only utilities to `server/utils/`
3. Keep client-safe utilities in `shared/core/utils/`
4. Update all imports throughout codebase

### Phase 6: Verify Shared Layer Purity (FINAL)
1. Scan shared layer for any remaining server-only code
2. Verify no Express, Redis, PostgreSQL, or other server-only dependencies
3. Document which utilities are client-safe
4. Update documentation

---

## Client-Safe Code (Can Remain in Shared)

The following code is safe to remain in the shared layer:

### Types (All Safe)
- `shared/types/` - All type definitions (compile-time only)
- `shared/constants/` - Constants and enums

### Utilities (Client-Safe)
- `shared/core/utils/string-utils.ts` - String manipulation
- `shared/core/utils/number-utils.ts` - Number utilities
- `shared/core/utils/data-utils.ts` - Data transformation (after removing logger)
- `shared/core/utils/type-guards.ts` - Type guard functions
- `shared/core/utils/regex-patterns.ts` - Regex patterns
- `shared/core/utils/async-utils.ts` - Async utilities
- `shared/core/utils/common-utils.ts` - Common utilities
- `shared/core/utils/http-utils.ts` - HTTP utilities (after removing logger)
- `shared/core/utils/loading-utils.ts` - Loading state utilities
- `shared/core/utils/navigation-utils.ts` - Navigation utilities
- `shared/core/utils/dashboard-utils.ts` - Dashboard utilities
- `shared/core/utils/browser-logger.ts` - Browser-safe logger

### Validation
- `shared/validation/` - Zod validation schemas (can run in browser)

### Transformers
- `shared/utils/transformers/` - Data transformation utilities

### Error Types
- `shared/utils/errors/` - Error type definitions (after removing server-specific code)

---

## Recommendations

1. **Immediate Action**: Fix broken observability imports to restore compilation
2. **High Priority**: Move caching and middleware to server layer
3. **Medium Priority**: Move configuration and server-only utilities
4. **Documentation**: Update shared layer documentation to clearly indicate client-safe vs server-only code
5. **Linting**: Add ESLint rules to prevent importing server-only packages in shared layer
6. **Testing**: Add tests to verify shared layer can be imported in browser context

---

## Next Steps

This audit document will be used to guide:
- **Task 11.2**: Move server-only code to server layer
- **Task 11.3**: Consolidate shared utilities and document client-safety

---

## Notes

- The observability directory has already been moved to `server/infrastructure/observability/` but imports haven't been updated
- Cache infrastructure should be moved to `server/infrastructure/cache/` (directory doesn't exist yet)
- Middleware should be moved to `server/middleware/` (may need to create directory)
- Many files have commented-out imports indicating previous cleanup attempts
- Some utilities have both client-safe and server-only functionality that may need to be split
