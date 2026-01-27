# Quick Migration Reference - Phase 2B

## Status Overview
- **Phase 2B Progress**: 40% (2/5+ features complete)
- **Routes Migrated**: 32 / 107+ (30%)
- **Session 2 Work**: Auth Router - ✅ COMPLETE

---

## Session 2 Achievements

### Auth Router Migrated
- **Routes**: 20/20 (100%)
- **Lines**: 673 (reduced from 891)
- **File**: `server/core/auth/auth.ts`
- **Backup**: `server/core/auth/auth.OLD.ts`
- **Documentation**: 3 comprehensive reports created

---

## Migration Pattern Reference

```typescript
// TEMPLATE FOR MIGRATING NEW ROUTERS

import { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES } from '@shared/constants';
import { createErrorContext } from '@server/infrastructure/error-handling';
import { asyncHandler } from '@server/middleware/error-management';

router.post('/endpoint', asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'POST /endpoint');
  
  // Validation
  if (!validInput) {
    throw new ValidationError('Invalid input', [
      {
        field: 'fieldName',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Description',
      },
    ]);
  }
  
  // Business logic
  try {
    const result = await service.operation();
    res.json(result);
  } catch (error) {
    throw new BaseError(error.message, {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
    });
  }
}));
```

---

## Error Domains Available

```typescript
ErrorDomain.SYSTEM              // System-level failures
ErrorDomain.VALIDATION          // Input validation errors
ErrorDomain.AUTHENTICATION      // Auth/token failures
ErrorDomain.AUTHORIZATION       // Permission failures
ErrorDomain.DATABASE           // DB operation failures
ErrorDomain.CACHE              // Cache operation failures
ErrorDomain.NETWORK            // Network operation failures
ErrorDomain.EXTERNAL_SERVICE   // External API failures
ErrorDomain.BUSINESS_LOGIC     // Business rule violations
```

---

## Error Severity Levels

```typescript
ErrorSeverity.LOW      // Non-critical, recoverable
ErrorSeverity.MEDIUM   // Moderate, user-facing
ErrorSeverity.HIGH     // Critical, requires attention
```

---

## Common Error Codes

```typescript
ERROR_CODES.NOT_AUTHENTICATED              // 401 - Auth token invalid/missing
ERROR_CODES.VALIDATION_ERROR               // 400 - Input validation failed
ERROR_CODES.INTERNAL_SERVER_ERROR          // 500 - Server error
ERROR_CODES.RESOURCE_NOT_FOUND             // 404 - Resource missing
ERROR_CODES.ACCESS_DENIED                  // 403 - Permission denied
ERROR_CODES.DUPLICATE_RESOURCE             // 409 - Resource conflicts
```

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Completed Features | 2 (Bills, Auth) |
| Migrated Routes | 32 |
| Remaining Features | 3+ |
| Remaining Routes | 75+ |
| Estimated Phase 2B Time | 35-40 hours |
| Pattern Reusability | ✅ 100% |
| Breaking Changes | 0 |

---

## Next Priority Features

### 1. Admin Router (3-4 hours)
- **Lines**: 794
- **Routes**: 50+
- **Complexity**: HIGH (role-based access control)
- **Status**: Analysis complete, ready to start

### 2. Users Feature (2-3 hours)
- **Routes**: 15+
- **Complexity**: MEDIUM
- **Dependency**: Auth (already done ✓)

### 3. Search Feature (1-2 hours)
- **Routes**: 10+
- **Complexity**: LOW-MEDIUM

---

## Files To Know

### Core Error Classes
- `shared/core/observability/error-management/errors/base-error.ts`
- `shared/core/observability/error-management/errors/specialized-errors.ts`

### Error Constants
- `shared/constants/error-codes.ts`

### Middleware
- `server/middleware/error-management.ts` (asyncHandler, createUnifiedErrorMiddleware)
- `server/infrastructure/error-handling.ts` (createErrorContext)

### Examples
- `server/features/bills/bills-router.ts` (Bills - 12 routes, ✅ migrated)
- `server/core/auth/auth.ts` (Auth - 20 routes, ✅ migrated)

---

## Migration Checklist (For Each Router)

- [ ] Identify all routes (use grep)
- [ ] Read entire router file
- [ ] Create new `-complete.ts` file
- [ ] Wrap all routes with asyncHandler()
- [ ] Add createErrorContext() call
- [ ] Replace ApiError/ApiSuccess/ApiValidationError/ApiUnauthorized
- [ ] Use ValidationError for input validation
- [ ] Use BaseError for system/auth/business errors
- [ ] Preserve rate limiters, security logging, auth checks
- [ ] Test TypeScript compilation
- [ ] Use `mv` to replace old file
- [ ] Create migration documentation
- [ ] Verify no breaking changes
- [ ] Move to next feature

---

## Time Saving Tips

1. **Copy Auth Router Template**: The auth router is a perfect template with 20 diverse routes
2. **Grep for Routes**: `grep -E "router\.(get|post|put|delete|patch)" filename.ts` to count routes
3. **Compare Patterns**: Use side-by-side view of auth.ts and target router to spot patterns
4. **Batch Similar Routes**: Process all GET routes together, then POST, etc.
5. **Documentation Can Wait**: Create detailed docs only for first router per feature type

---

## Communication

**Key Stakeholders**:
- Implementation: Complete ✅
- Documentation: Complete ✅
- Validation: Ready for testing ✅
- Deployment: Ready for integration ✅

**Next Sync**: When Admin Router migration begins

---

## Quick Links to Documentation

1. **Detailed Auth Report**: `AUTH_ROUTER_MIGRATION_COMPLETE.md`
2. **Session 2 Status**: `PHASE_2B_SESSION_2_STATUS.md`
3. **Progress Tracker**: `MIGRATION_PROGRESS_TRACKER.txt`
4. **Execution Summary**: `SESSION_2_EXECUTION_SUMMARY.md`
5. **This Reference**: `QUICK_MIGRATION_REFERENCE.md`

---

**Last Updated**: January 14, 2025 - Session 2
**Status**: ✅ Auth Router Complete, Admin Router Ready
