# Client Error System Consistency Audit

**Date**: January 21, 2026  
**Status**: INCONSISTENT - Multiple Competing Systems  
**Priority**: HIGH - Requires Immediate Migration  

---

## Executive Summary

The client has **6 competing error systems** across different domains instead of using the unified `client/src/core/error/` system. This creates maintenance burden, inconsistent behavior, and makes error handling unpredictable.

**Goal**: Consolidate all client error handling to use the single unified core error system.

---

## Current State: Competing Error Systems

### 1. **Core Error System** (CANONICAL)
**Location**: `client/src/core/error/`  
**Status**: ✅ Production-ready, comprehensive  
**Architecture**: 
- BaseError (root class)
- Domain-specific errors (Dashboard, Navigation, etc.)
- Full recovery strategies
- Multiple reporters (Console, Sentry, API)
- Error boundaries & UI components
- Error analytics bridge

**Key Exports**: BaseError, ValidationError, NetworkError, DashboardError, etc.

---

### 2. **Service Errors** (LEGACY - DEPRECATED)
**Location**: `client/src/lib/services/errors.ts`  
**Status**: ❌ Legacy, should be removed  
**Architecture**: ServiceError hierarchy (17 classes)  
**Problems**:
- No connection to core error system
- Parallel class hierarchy
- No integration with error recovery
- Not using ErrorContext or ErrorMetadata

**Classes**: AuthenticationError, ValidationError, NetworkError, CacheError, BusinessLogicError, SystemError, etc.

---

### 3. **API Errors** (LEGACY - DEPRECATED)
**Location**: `client/src/core/api/errors.ts`  
**Status**: ❌ Explicitly marked deprecated  
**Architecture**: APIErrorCode union + error classes  
**Problems**:
- Explicitly deprecated in file
- Duplicate of core error system
- No integration with modern handlers

**Classes**: NetworkError, TimeoutError, ValidationError, UnauthorizedError, etc.

---

### 4. **Loading Errors** (CUSTOM - SHOULD CONSOLIDATE)
**Location**: `client/src/lib/ui/loading/errors.ts`  
**Status**: ⚠️ Functional but standalone  
**Architecture**: LoadingError + LoadingTimeoutError  
**Problems**:
- Custom error hierarchy
- Not using core error types
- Duplicate classification logic
- No recovery integration

**Classes**: LoadingError, LoadingTimeoutError, LoadingNetworkError, LoadingValidationError, LoadingOperationFailedError, LoadingStageError

---

### 5. **Dashboard Errors** (CUSTOM - INCOMPLETE)
**Location**: `client/src/lib/ui/dashboard/errors.ts`  
**Status**: ⚠️ Started migration but incomplete  
**Architecture**: Extends BaseError but missing imports  
**Problems**:
- References undefined types: `BaseError`, `ErrorDomain`, `ErrorSeverity`
- Missing imports from core error system
- Duplicate convenience functions
- Incomplete type definitions

**Classes**: DashboardError, DashboardDataFetchError, DashboardValidationError, DashboardConfigurationError, DashboardActionError, DashboardTopicError

---

### 6. **UI Component Errors** (CUSTOM - MINIMAL)
**Location**: `client/src/lib/design-system/interactive/errors.ts`  
**Status**: ⚠️ Very simple, should consolidate  
**Architecture**: UIComponentError hierarchy  
**Problems**:
- Not using core error system
- Very basic implementation
- Should use DashboardError instead

**Classes**: UIComponentError, UIDateError, UIDialogError

---

## Inconsistency Matrix

| File | Extends | Uses BaseError | Uses ErrorContext | Has Recovery | Connected to Reporters | Status |
|------|---------|---|---|---|---|---|
| core/error/classes.ts | BaseError | ✅ | ✅ | ✅ | ✅ | CANONICAL |
| shared/services/errors.ts | ServiceError | ❌ | ❌ | ❌ | ❌ | LEGACY |
| core/api/errors.ts | Error/APIError | ❌ | ❌ | ❌ | ❌ | DEPRECATED |
| shared/ui/loading/errors.ts | LoadingError | ❌ | ❌ | ❌ | ❌ | CUSTOM |
| shared/ui/dashboard/errors.ts | BaseError (broken) | ⚠️ | ✅ | ⚠️ | ⚠️ | INCOMPLETE |
| design-system/interactive/errors.ts | UIComponentError | ❌ | ❌ | ❌ | ❌ | CUSTOM |

---

## Migration Plan

### Phase 1: Remove Deprecated Files
- ✅ `client/src/lib/services/errors.ts` → Delete (replace with core imports)
- ✅ `client/src/core/api/errors.ts` → Delete (re-export from core)

### Phase 2: Consolidate Custom Systems
1. ✅ `client/src/lib/ui/loading/errors.ts` → Convert to core error types
   - LoadingError → Use BaseError with domain:LOADING, type:OPERATION_FAILED
   - LoadingTimeoutError → Use NetworkError with domain:LOADING

2. ✅ `client/src/lib/design-system/interactive/errors.ts` → Delete or convert
   - UIComponentError → Use DashboardError with context.component

3. ✅ `client/src/lib/ui/dashboard/errors.ts` → Fix imports & complete migration
   - Already partially migrated, fix broken imports
   - Remove duplicate convenience functions

### Phase 3: Update All Imports Across Codebase
- Find all imports from legacy systems
- Replace with core error imports
- Update error instantiation to use new types

### Phase 4: Validation
- Run full build
- Run linter
- Verify no TypeScript errors
- Run test suite

---

## Expected Outcomes

✅ **Single Source of Truth**: All client error handling through `client/src/core/error/`  
✅ **Consistent Recovery**: All errors support recovery strategies  
✅ **Unified Reporting**: All errors flow through core reporters  
✅ **Better Analytics**: All errors include proper context & metadata  
✅ **Type Safety**: Proper TypeScript types throughout  
✅ **Maintainability**: Single codebase to maintain  

---

## Risk Assessment

- **Low Risk**: Migrations are straightforward type/import changes
- **Backward Compatibility**: Core system is production-ready
- **Testing**: All changes can be validated with existing test suite

---

## Files to Create/Modify

### Create:
1. `error-consolidation-guide.md` - Developer guide for error usage

### Delete:
1. `client/src/lib/services/errors.ts` - Replace with core imports
2. `client/src/core/api/errors.ts` - Delete deprecated file

### Fix/Update:
1. `client/src/lib/ui/loading/errors.ts` - Convert to use core types
2. `client/src/lib/ui/dashboard/errors.ts` - Fix broken imports
3. `client/src/lib/design-system/interactive/errors.ts` - Convert or delete
4. All files importing from legacy error systems - Update imports

---

## Next Steps

1. Execute migration systematically
2. Validate with build & tests
3. Update documentation
4. Team training on unified system
