/**
 * QUICK START FOR NEXT SESSION
 * ========================================
 * 
 * What was completed:
 * ✅ shared/validation/ module (305 lines) - DONE
 * ✅ shared/constants/ module (601 lines) - DONE
 * ✅ server/infrastructure/error-handling/ (420 lines) - DONE
 * ✅ server/middleware/error-management.ts (220 lines) - DONE
 * ✅ server/index.ts (updated with middleware) - DONE
 * ✅ server/features/bills/bills-router.ts (fully migrated) - DONE
 * 
 * What needs to be done (in priority order):
 * 
 * ========================================
 * IMMEDIATE NEXT STEP (Pick One)
 * ========================================
 * 
 * OPTION 1: Migrate Auth Feature (3-4 hours)
 * Benefits: Most critical for security, affects all authenticated routes
 * Files to update:
 * - server/features/auth/auth-router.ts (similar to bills)
 * - server/features/auth/middleware/auth-middleware.ts
 * - server/features/auth/services/auth-service.ts
 * 
 * OPTION 2: Migrate Users Feature (3-4 hours)
 * Benefits: User-facing, high visibility
 * Files to update:
 * - server/features/users/users-router.ts
 * - server/features/users/services/user-service.ts
 * 
 * OPTION 3: Migrate Search Feature (2-3 hours)
 * Benefits: High traffic, relatively self-contained
 * Files to update:
 * - server/features/search/search-router.ts
 * 
 * OPTION 4: Phase 3 - Type Migration (6-8 hours)
 * Benefits: Eliminates duplication, improves type safety
 * Steps:
 * - Set up @shared/types path mapping
 * - Migrate server imports to use @shared/types
 * - Migrate client imports to use @shared/types
 * 
 * RECOMMENDATION: Start with OPTION 1 (Auth)
 * Reason: Most critical, high impact, similar pattern to bills
 * 
 * ========================================
 * COPY-PASTE TEMPLATE FOR NEXT FEATURE
 * ========================================
 * 
 * Use this when migrating a new feature:
 * 
 * 1. Add imports:
 * ```typescript
 * import { BaseError, ValidationError } from '@shared/core/observability/error-management';
 * import { ERROR_CODES } from '@shared/constants';
 * import { createErrorContext } from '@server/infrastructure/error-handling';
 * ```
 * 
 * 2. Remove imports:
 * ```typescript
 * // REMOVE:
 * import { ApiError, ApiNotFound, ApiResponse, ApiSuccess, ApiValidationError } from '@shared/core';
 * ```
 * 
 * 3. Replace response calls:
 * ```typescript
 * // OLD:
 * return ApiSuccess(res, { data });
 * return ApiValidationError(res, [{ field: 'x', message: 'y' }]);
 * return ApiError(res, 'message', 500);
 * return ApiNotFound(res, 'message');
 * 
 * // NEW:
 * res.json({ data });
 * throw new ValidationError('message', { fields: { x: 'y' }, context });
 * throw new BaseError('message', { statusCode: 500, code: ERROR_CODES.INTERNAL_SERVER_ERROR, domain: 'SYSTEM', severity: 'HIGH', context });
 * throw new BaseError('message', { statusCode: 404, code: ERROR_CODES.RESOURCE_NOT_FOUND, domain: 'BUSINESS', severity: 'LOW', context });
 * ```
 * 
 * 4. Create context on each route:
 * ```typescript
 * router.get('/path', (req, res) => {
 *   const context = createErrorContext(req, 'GET /path');
 *   // Use context in all error throws
 * });
 * ```
 * 
 * 5. Use asyncHandler for error propagation:
 * ```typescript
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // Errors thrown here are caught and passed to middleware
 * }));
 * ```
 * 
 * ========================================
 * ERROR CODES TO USE
 * ========================================
 * 
 * From @shared/constants (already defined):
 * - ERROR_CODES.BILL_NOT_FOUND
 * - ERROR_CODES.RESOURCE_NOT_FOUND
 * - ERROR_CODES.INTERNAL_SERVER_ERROR
 * - ERROR_CODES.NOT_AUTHENTICATED
 * - ERROR_CODES.INSUFFICIENT_PERMISSIONS
 * - ERROR_CODES.VALIDATION_ERROR
 * - ERROR_CODES.DUPLICATE_ENTRY
 * - ERROR_CODES.RATE_LIMIT_EXCEEDED
 * - ERROR_CODES.SERVICE_UNAVAILABLE
 * - And 15+ more...
 * 
 * See: shared/constants/error-codes.ts for full list
 * 
 * ========================================
 * ERROR DOMAINS (Use Appropriate One)
 * ========================================
 * 
 * 'AUTHENTICATION' - Login/logout/session errors
 * 'AUTHORIZATION' - Permission/access errors (403)
 * 'VALIDATION' - Input validation errors
 * 'BUSINESS' - Business logic errors
 * 'SYSTEM' - Internal server errors
 * 'DATABASE' - Database operation errors
 * 'EXTERNAL_SERVICE' - 3rd party service errors
 * 'NETWORK' - Network/connectivity errors
 * 'RATE_LIMIT' - Rate limiting errors
 * 
 * ========================================
 * ERROR SEVERITY LEVELS
 * ========================================
 * 
 * 'LOW' - Not found, validation errors (recoverable)
 * 'MEDIUM' - Auth errors, config errors (retry needed)
 * 'HIGH' - Database errors, internal errors (investigation needed)
 * 'CRITICAL' - System down, cascading failures (immediate action needed)
 * 
 * ========================================
 * RESPONSE FORMAT (What Client Gets)
 * ========================================
 * 
 * Success response:
 * ```json
 * {
 *   "data": { ... },
 *   "success": true,
 *   "message": "Operation successful"
 * }
 * ```
 * 
 * Error response (formatted by middleware):
 * ```json
 * {
 *   "error": {
 *     "code": "RESOURCE_NOT_FOUND",
 *     "message": "Bill not found",
 *     "domain": "BUSINESS",
 *     "severity": "LOW",
 *     "details": { "billId": 123 },
 *     "correlationId": "req-uuid-here",
 *     "timestamp": "2026-01-14T22:50:00Z"
 *   },
 *   "success": false
 * }
 * ```
 * 
 * HTTP Status Codes (set by middleware based on error properties):
 * - 400: Validation errors
 * - 401: Authentication errors
 * - 403: Authorization errors
 * - 404: Not found errors
 * - 500: Internal/system errors
 * 
 * ========================================
 * VALIDATION PATTERN (Recommended)
 * ========================================
 * 
 * For simple ID validation:
 * ```typescript
 * const billId = parseInt(req.params.id, 10);
 * if (isNaN(billId) || billId <= 0) {
 *   throw new ValidationError('Invalid bill ID', {
 *     fields: { id: 'Must be a positive number' },
 *     context,
 *   });
 * }
 * // billId is guaranteed to be valid here
 * ```
 * 
 * For complex validation (use shared/validation):
 * ```typescript
 * import { validateBill } from '@shared/validation';
 * 
 * const result = validateBill(req.body);
 * if (!result.success) {
 *   throw new ValidationError('Invalid bill data', {
 *     fields: result.errors,
 *     context,
 *   });
 * }
 * // req.body is now validated and typed
 * const validBill = result.data;
 * ```
 * 
 * ========================================
 * TESTING YOUR CHANGES
 * ========================================
 * 
 * After migrating a feature:
 * 1. npm run build (or tsc)
 * 2. npm run test (if tests exist)
 * 3. npm run dev (and test manually)
 * 4. Check error responses are formatted correctly
 * 
 * ========================================
 * FILE NAMING CONVENTIONS
 * ========================================
 * 
 * When migrating, use:
 * - Original file: feature-name-router.ts
 * - New version: feature-name-router-complete.ts (new)
 * - Backup: feature-name-router.OLD.ts (after mv)
 * 
 * Then use: mv feature-name-router-complete.ts feature-name-router.ts
 * And: mv old file to .OLD backup
 * 
 * ========================================
 * QUICK COMMANDS FOR NEXT SESSION
 * ========================================
 * 
 * # Check current state
 * git status
 * 
 * # See what's been done
 * cat SESSION_2_COMPLETION_SUMMARY.ts
 * cat QUICK_START_FOR_NEXT_SESSION.ts (this file)
 * 
 * # Start with next feature
 * # 1. Copy bills-router pattern to auth-router
 * # 2. Update imports and error codes
 * # 3. Replace all ApiResponse calls
 * # 4. Test compilation
 * # 5. Use mv to move files
 * 
 * # Test compilation
 * npx tsc --noEmit --skipLibCheck
 * 
 * ========================================
 * EXPECTED TIME ESTIMATES
 * ========================================
 * 
 * Auth router: 3-4 hours
 * Users router: 2-3 hours
 * Search router: 1-2 hours
 * Community features (5 files): 5-7 hours
 * Other features: 3-5 hours
 * 
 * Phase 3 (Type migration): 6-8 hours
 * Phase 4 (Client integration): 9-14 hours
 * 
 * ========================================
 */
