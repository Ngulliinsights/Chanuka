/**
 * PHASE 2B & 3 IMPLEMENTATION PLAN
 * =================================
 * 
 * Goals:
 * 1. Update server features to use new error types from @shared/core
 * 2. Migrate type imports to use @shared/types path
 * 3. Share validation/constants with client
 * 4. Ensure zero strategic functionality loss
 * 5. Use mv commands for reorganization, only recreate for merging
 * 
 * STRATEGY: Rather than massive simultaneous refactors, we'll:
 * - Create "migration adapter" files that map old error patterns to new
 * - Incrementally move files using mv when safe
 * - Test compilation after each migration
 * - Keep old files as reference until 100% confident
 * 
 * ============================================================
 * PHASE 2B: Server Feature Error Migration
 * ============================================================
 * 
 * Current Status:
 * - shared/validation/ ✅ Complete (305 lines)
 * - shared/constants/ ✅ Complete (601 lines)
 * - server/infrastructure/error-handling/ ✅ Complete (420 lines)
 * - server/middleware/error-management.ts ✅ Complete (220 lines)
 * - server/index.ts ✅ Updated with new middleware
 * 
 * Priority Features to Migrate (in order):
 * 1. server/features/bills/ - High visibility, heavily used
 * 2. server/features/auth/ - Critical for security
 * 3. server/features/users/ - User-facing feature
 * 4. server/features/community/ - Public feature
 * 5. server/features/search/ - Data access feature
 * 
 * Migration Pattern:
 * OLD:
 *   throw new Error('message');
 *   throw new ValidationError('message');
 *   throw ApiNotFound(res, 'message');
 * 
 * NEW:
 *   throw new BaseError('message', {
 *     statusCode: 404,
 *     code: ERROR_CODES.RESOURCE_NOT_FOUND,
 *     domain: 'BUSINESS',
 *     severity: 'LOW',
 *     context: createErrorContext(req, 'GET /api/resource/:id'),
 *   });
 * 
 * ============================================================
 * PHASE 3: Type Migration
 * ============================================================
 * 
 * Current Status:
 * - shared/types/ exists with multiple type definitions
 * - Various imports still use relative paths
 * 
 * Tasks:
 * 1. Identify all shared types in shared/types/
 * 2. Set up @shared/types path mapping if not exists
 * 3. Migrate server imports: import { User } from '../../../types' → import { User } from '@shared/types'
 * 4. Identify duplicate types between client and server
 * 5. Move duplicates to shared/types/
 * 6. Update both client and server imports
 * 7. Delete local type copies where appropriate
 * 
 * ============================================================
 * PHASE 4: Client Integration
 * ============================================================
 * 
 * Current Status:
 * - client/ imports validation locally (if at all)
 * - client/ imports constants locally (if at all)
 * - client/ imports types locally
 * 
 * Tasks:
 * 1. Update client imports to use @shared/validation
 * 2. Update client imports to use @shared/constants
 * 3. Update client imports to use @shared/types
 * 4. Remove duplicate validation/constants/types from client
 * 5. Set up error boundary in client using @shared/core
 * 6. End-to-end testing of error handling
 * 
 * ============================================================
 * IMMEDIATE NEXT STEPS (Today)
 * ============================================================
 * 
 * 1. ✅ Create MIGRATION_EXAMPLES.ts (showing patterns)
 * 2. ✅ Create this plan file
 * 3. Create migration adapter for bills feature
 * 4. Test bills adapter compilation
 * 5. If successful, move bills-router-migrated.ts to bills-router.ts (using mv)
 * 6. Verify bills feature still works
 * 7. Repeat for other features
 * 
 * ============================================================
 * FILES TO CHECK
 * ============================================================
 * 
 * Bills:
 * - /server/features/bills/bills-router.ts (524 lines - uses old error patterns)
 * - /server/features/bills/bills-router-migrated.ts (already exists?)
 * - /server/features/bills/domain/services/bill-domain-service.ts
 * - /server/features/bills/application/bill-service.ts
 * 
 * Auth:
 * - /server/features/auth/auth-router.ts
 * - /server/features/auth/middleware/auth-middleware.ts
 * - /server/features/auth/services/auth-service.ts
 * 
 * Users:
 * - /server/features/users/users-router.ts
 * - /server/features/users/services/user-service.ts
 * 
 * Community:
 * - /server/features/community/*
 * 
 * Search:
 * - /server/features/search/search-router.ts
 * 
 * ============================================================
 * COMPILATION VERIFICATION STEPS
 * ============================================================
 * 
 * After each change, run:
 * npx tsc --noEmit --skipLibCheck
 * 
 * Expect: Zero TypeScript errors
 * 
 * ============================================================
 * FILE OPERATION RULES (from user)
 * ============================================================
 * 
 * ✅ Use mv commands for moving/reorganizing when safe
 * ✅ Recreate/merge only when necessary
 * ✅ Always ensure no strategic functionality is lost before deleting
 * ✅ Verify compilation and tests before any mv operation
 * 
 * This means:
 * - Don't recreate bills-router.ts if bills-router-migrated.ts is ready
 * - Use: mv bills-router-migrated.ts bills-router.ts (after tests pass)
 * - Keep bill.js as reference until 100% sure new router covers all functionality
 * 
 * ============================================================
 */
