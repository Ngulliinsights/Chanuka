# Implementation Plan

- [x] 1. Fix database schema import and connection issues


  - [x] 1.1 Update database connection to import from correct schema location

    - ✅ Database connection already imports from `../schema` correctly
    - ✅ Database pool uses schema exports correctly
    - ✅ All table definitions are accessible
    - _Requirements: 1.2, 1.3_

  - [x] 1.2 Add missing strategic table exports to schema index

    - ✅ Strategic tables (userProgress, contentAnalysis, verification, stakeholder, socialShare) are already exported from `shared/schema/index.ts`
    - ✅ All table definitions are properly exported for database operations
    - ✅ Schema barrel exports are consistent
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Create missing strategic database tables
    - ✅ Database migration 0021 creates all required tables including strategic tables
    - ✅ All tables exist in database schema
    - ✅ Strategic tables are properly implemented
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 2. Resolve validation system type conflicts

  - [ ] 2.1 Audit and consolidate ValidationError implementations

    - Analyze existing ValidationError interface in `shared/types/errors.ts` vs specialized ValidationError class
    - Identify strategic value of specialized error infrastructure (observability, error domains, HTTP status codes)
    - Create migration plan to leverage existing comprehensive error management system
    - Deprecate simple interface in favor of feature-rich specialized error classes
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ] 2.2 Update validation adapters to use specialized ValidationError class

    - Modify all validation adapters to use ValidationError from `shared/core/src/observability/error-management/errors/specialized-errors`
    - Leverage existing error handling infrastructure with rich error context and observability
    - Update error formatting functions to use specialized error class methods
    - Ensure all validation failures return standardized error structure with proper error domains and severity
    - Maintain backward compatibility with existing error interfaces
    - _Requirements: 2.3, 8.2_
-
- [ ] 3. Fix runtime reference errors and variable shadowing

  - [ ] 3.1 Resolve notification scheduler variable shadowing

    - Fix "users is not defined" error in NotificationSchedulerService.getUsersWithDigestEnabled()
    - Update import in notification-scheduler.ts to include `bills` (plural) alias
    - Replace `bills.title` references with correct table alias
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ] 3.2 Fix database table name mismatch errors
    - Resolve "relation 'bill' does not exist" errors by using correct table names
    - Database uses "bills" (plural) but schema imports "bill" (singular)
    - Update all database queries to use correct table references
    - _Requirements: 4.3, 4.5, 1.1_

- [x] 4. Preserve and validate @shared/core architecture

  - [x] 4.1 Validate TypeScript path mapping configuration

    - ✅ `@shared/core` path mapping correctly configured in tsconfig.json
    - ✅ Path resolves to `./shared/core/src/index.ts`
    - ✅ Import resolution working for `@shared/core` imports
    - _Requirements: 3.1, 3.3, 5.1_
 

  - [-] 4.2 Create import path validation script




    - Build automated script to detect incorrect import paths
    - Validate that `@shared/core` imports are used consistently
    - Check for any remaining relative path imports that should use aliases
    - _Requirements: 7.1, 7.4, 5.2_

  - [x] 4.3 Fix build system module resolution
    - ✅ Build configuration supports `@shared/core` imports correctly
    - ✅ TypeScript path mapping resolves aliases properly
    - ✅ Module resolution working in development builds
    - _Requirements: 3.2, 3.4, 5.4_

- [ ] 5. Standardize error handling across modules

  - [ ] 5.1 Consolidate error handling to use existing specialized error classes

    - Audit and consolidate usage of existing error classes from `shared/core/src/observability/error-management/errors/specialized-errors`
    - Ensure all modules use appropriate specialized error classes (ValidationError, DatabaseError, AuthenticationError, etc.)
    - Remove duplicate error type definitions and leverage existing comprehensive error infrastructure
    - Update error handling patterns to use established error domains and severity levels
    - _Requirements: 8.1, 8.4_

  - [ ] 5.2 Standardize API error responses using existing error infrastructure

    - Leverage existing BaseError class properties (statusCode, correlationId, timestamp) for API responses
    - Update all API endpoints to use specialized error classes for consistent error formatting
    - Ensure error responses include proper HTTP status codes, error domains, and severity levels
    - Maintain existing ApiErrorResponse patterns while enhancing with specialized error context
    - _Requirements: 8.2, 8.5_

  - [ ] 5.3 Enhance database error handling with specialized DatabaseError class
    - Update all database operations to use existing DatabaseError class from specialized-errors
    - Leverage built-in error context, operation tracking, and retry logic
    - Ensure database errors include proper error domains, severity levels, and operational flags
    - Add comprehensive error logging using existing error management infrastructure
    - _Requirements: 8.3, 8.5_

- [ ] 6. Create automated validation and prevention

  - [ ] 6.1 Implement pre-commit validation hooks

    - Create git hooks to validate import paths before commits
    - Add TypeScript compilation checks to prevent type conflicts
    - Implement automated architectural consistency checks
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 6.2 Add build-time architectural validation
    - Create build scripts to enforce import path consistency
    - Add validation for schema export completeness
    - Implement checks for error type consistency
    - _Requirements: 7.2, 7.5_

- [ ] 7. Update tests and validation

  - [ ] 7.1 Create import path consistency tests

    - Write tests to validate `@shared/core` import usage
    - Test schema import consistency across modules
    - Verify no incorrect relative path imports exist
    - _Requirements: 5.3, 7.1_

  - [ ] 7.2 Add database schema validation tests

    - Test that all strategic tables are properly exported
    - Validate database connection uses correct schema imports
    - Ensure all table operations work without "relation does not exist" errors
    - _Requirements: 1.1, 6.5_

  - [ ] 7.3 Create error handling consistency tests
    - Test that all validation errors use specialized ValidationError class with proper error domains
    - Validate API error response format consistency using BaseError infrastructure
    - Ensure error handling patterns leverage existing specialized error classes
    - Test error observability features (correlation IDs, severity levels, retry flags)
    - _Requirements: 2.5, 8.4_

- [ ] 8. Strategic architectural consolidation

  - [ ] 8.1 Conduct comprehensive error handling infrastructure audit

    - Map all existing error handling patterns and identify redundancies
    - Analyze specialized error classes vs simple interfaces for strategic value
    - Document migration path from simple interfaces to comprehensive error infrastructure
    - Create consolidation plan that preserves existing functionality while enhancing capabilities
    - _Requirements: 8.1, 8.4, 2.1_

  - [ ] 8.2 Implement strategic error handling consolidation

    - Migrate validation adapters to use specialized ValidationError class
    - Consolidate API error responses to leverage BaseError infrastructure
    - Update database error handling to use specialized DatabaseError class
    - Ensure backward compatibility during transition period
    - _Requirements: 2.3, 8.2, 8.3_

- [ ] 9. Eliminate redundant shared/types directory

  - [x] 9.1 Audit shared/types directory for redundancy



    - Analyze all files in `shared/types/` directory for functionality overlap with `shared/core/src`
    - Identify which types are superseded by better implementations in specialized error classes
    - Map all import references to `shared/types/` across the codebase
    - Document migration strategy for domain-specific types to appropriate modules
    - _Requirements: 9.1, 9.2, 9.3_



  - [ ] 9.2 Migrate domain-specific types to appropriate modules

    - Move `bill.ts`, `expert.ts`, `legal-analysis.ts` types to respective feature modules
    - Update imports to reference types from their appropriate domain modules
    - Ensure auth types use existing `shared/core/src/types/auth.types.ts` implementation



    - Verify common utility types are available in `shared/core/src/types/`
    - _Requirements: 9.3, 9.4_

  - [ ] 9.3 Update all imports referencing shared/types



    - Replace all `shared/types/errors` imports with specialized error class imports
    - Update validation error imports to use comprehensive ValidationError class
    - Fix all references to moved domain-specific types
    - Update build scripts and configuration files that reference the directory
    - _Requirements: 9.4, 9.5_

  - [ ] 9.4 Delete shared/types directory

    - Remove the entire `shared/types/` directory after successful migration
    - Update any remaining configuration references
    - Verify no broken imports remain in the codebase
    - Update documentation to reflect the new type organization
    - _Requirements: 9.2, 9.5_

- [ ] 10. Final integration and validation

  - [ ] 10.1 Perform comprehensive application startup test

    - Test that application starts without database schema errors
    - Validate all services initialize without reference errors
    - Ensure all `@shared/core` imports resolve correctly at runtime
    - Verify specialized error classes work correctly in production scenarios
    - Confirm no import errors from shared/types directory removal
    - _Requirements: 1.1, 3.1, 4.5, 9.5_

  - [ ] 10.2 Execute full test suite validation
    - Run complete test suite to ensure no regressions
    - Validate all database operations work correctly
    - Test error handling consistency across all modules using specialized error classes
    - Verify observability features (correlation IDs, error domains, severity levels) work correctly
    - Confirm all type imports resolve correctly after directory removal
    - _Requirements: 2.5, 6.5, 8.5, 9.5_
