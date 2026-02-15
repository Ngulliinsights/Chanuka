# Implementation Plan: Comprehensive Bug Fixes

## Overview

This implementation plan addresses **1,114+ identified bugs** across the codebase through a systematic, phased approach over **8 weeks**. The massive scope increase (21x larger than originally estimated) requires a completely different strategy focused on incremental progress, automated tooling, and clear phase boundaries.

### Reality Check

- **Original estimate**: 53 bugs, 5 days (37 hours)
- **Actual count**: 1,114+ bugs, 8 weeks (167 hours)
- **Scope increase**: 21x larger than originally estimated

### Bug Distribution

- **Type Safety Violations**: 788 instances of `as any` (71%)
- **Code Quality Issues**: 191 TODO/FIXME/HACK comments (17%)
- **ESLint Suppressions**: 99 instances (9%)
- **Commented Imports**: 33 instances (3%)
- **TypeScript Suppressions**: 3 instances (<1%)
- **Original Critical Bugs**: 53 bugs (transformation, services, validation, etc.)

### Phased Approach

**Phase 1 (Week 1)**: Critical bugs, syntax errors, property test failures, commented imports
**Phase 2 (Weeks 2-3)**: High-impact type safety (~200 most dangerous `as any` instances)
**Phase 3 (Week 4)**: TODO/FIXME resolution (191 incomplete implementations)
**Phase 4 (Weeks 5-7)**: Remaining type safety (~588 remaining `as any` instances)
**Phase 5 (Week 8)**: Code quality (ESLint suppressions, final verification)

## Phase 1: Critical Bugs (Week 1)

### Goal: Stabilize the codebase, fix blocking issues

- [x] 1. Fix Syntax Errors (CRITICAL - Blocks Compilation)
  - [x] 1.1 Fix unterminated string literal in regulatory-change-monitoring.ts
    - Fix line 4 in `server/features/analytics/regulatory-change-monitoring.ts`
    - Add closing quote to unterminated string
    - _Requirements: 19.1, 19.3_

  - [x] 1.2 Fix unterminated string literal in transparency-dashboard.ts
    - Fix line 5 in `server/features/analytics/transparency-dashboard.ts`
    - Add closing quote to unterminated string
    - _Requirements: 19.1, 19.3_

  - [x] 1.3 Fix unterminated template literal in integration-extended.ts
    - Fix line 772 in `server/infrastructure/schema/integration-extended.ts`
    - Add closing backtick to unterminated template literal
    - _Requirements: 19.2, 19.3_

  - [x] 1.4 Verify TypeScript compilation succeeds
    - Run `tsc --noEmit` in all packages
    - Verify zero syntax errors
    - _Requirements: 19.4_

- [x] 2. Fix Critical Transformation Layer Bugs
  - [x] 2.1 Enhance date transformers with validation
    - Update `dateToStringTransformer` in `shared/utils/transformers/base.ts`
    - Add `isValidDate` helper function
    - Throw descriptive errors for invalid dates (include value in error message)
    - Update `optionalDateToStringTransformer` with same validation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write property test for date validation
    - **Property 1: Date Validation in Transformers**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.3 Add missing fields to UserPreferences domain model
    - Update `UserPreferences` interface in `shared/types/domains/authentication/user.ts`
    - Add `userId: UserId` field
    - Add `createdAt: Date` and `updatedAt: Date` fields
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Add missing fields to UserProfile domain model
    - Update `UserProfile` interface in `shared/types/domains/authentication/user.ts`
    - Add `userId: UserId` field (if not present)
    - Add `createdAt: Date` and `updatedAt: Date` fields (if not present)
    - _Requirements: 2.1, 2.2_

  - [x] 2.5 Update UserPreferences transformer to preserve all fields
    - Update transformer in `shared/utils/transformers/entities/user.ts`
    - Ensure `userId` is preserved in reverse transformation
    - Ensure `createdAt` and `updatedAt` are preserved in reverse transformation
    - _Requirements: 2.1, 2.2_

  - [x] 2.6 Update UserProfile transformer to preserve all fields
    - Update transformer in `shared/utils/transformers/entities/user.ts`
    - Ensure `userId` is preserved in reverse transformation
    - Ensure `createdAt` and `updatedAt` are preserved in reverse transformation
    - _Requirements: 2.1, 2.2_

  - [x] 2.7 Write property test for round-trip transformations
    - **Property 2: Round-Trip Transformation Preserves Data**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    
- [x] 3. Fix Property Test Failures
  - [x] 3.1 Run transformation pipeline property tests
    - Run tests in `tests/properties/transformation-pipeline-correctness.property.test.ts`
    - Identify specific failures in User, UserProfile, UserPreferences, Sponsor, BillCommitteeAssignment tests
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 3.2 Fix User transformation property test
    - Address issues found in test run
    - Verify test passes with 100 iterations
    - _Requirements: 9.1_

  - [x] 3.3 Fix UserProfile transformation property test
    - Address issues found in test run
    - Verify test passes with 100 iterations
    - _Requirements: 9.2_

  - [x] 3.4 Fix UserPreferences transformation property test
    - Address issues found in test run
    - Verify test passes with 100 iterations
    - _Requirements: 9.3_

  - [x] 3.5 Fix Sponsor transformation property test
    - Address issues found in test run
    - Verify test passes with 100 iterations
    - _Requirements: 9.4_

  - [x] 3.6 Fix BillCommitteeAssignment transformation property test
    - Address issues found in test run
    - Verify test passes with 100 iterations
    - _Requirements: 9.5_

  - [x] 3.7 Fix skipped validation tests
    - Unskip 3 tests in `validation-at-integration-points.property.test.ts`
    - Fix any issues causing tests to be skipped
    - _Requirements: 9.6_

- [x] 4. Implement Missing Modules (33 Commented Imports)
  - [x] 4.1 Create Analytics Service implementation
    - Create `client/src/core/analytics/service.ts`
    - Implement `AnalyticsService` interface with all methods
    - Integrate with `analyticsApiService` from `@/core/api`
    - Add error handling (log and return failure result, don't throw)
    - _Requirements: 3.1, 3.3, 18.2, 18.3_

  - [x] 4.2 Write property test for analytics service
    - **Property 3: Service API Contracts**
    - **Property 9: Analytics API Failure Handling**
    - **Validates: Requirements 3.3, 6.3**

  - [x] 4.3 Create Telemetry Service implementation
    - Create `client/src/core/telemetry/` directory
    - Create `client/src/core/telemetry/service.ts`
    - Implement `TelemetryService` interface with all methods
    - Collect browser performance metrics (LCP, FID, CLS)
    - _Requirements: 3.2, 3.4, 18.2, 18.3_

  - [x] 4.4 Write property test for telemetry service
    - **Property 3: Service API Contracts**
    - **Validates: Requirements 3.4**

  - [x] 4.5 Create errorAnalyticsBridge module
    - Create `client/src/services/errorAnalyticsBridge.ts`
    - Implement bridge between error handling and analytics
    - Track errors as analytics events
    - _Requirements: 8.1, 18.2, 18.3_

  - [x] 4.6 Implement missing server services (stubs for now, full implementation in Phase 3)
    - Create stub for performanceMonitoring service
    - Create stub for inputValidationService
    - Create stub for secureSessionService
    - Create stub for securityMiddleware
    - Create stub for advancedCachingService
    - Create stub for enhancedNotificationService
    - Add TODO comments for full implementation in Phase 3
    - _Requirements: 18.2, 18.3, 18.5_

  - [x] 4.7 Verify all imports resolve
    - Run TypeScript compilation (`tsc --noEmit`)
    - Fix any remaining import resolution errors
    - Ensure all paths in tsconfig resolve correctly
    - _Requirements: 8.4, 8.5, 18.4_

- [x] 5. Checkpoint - Phase 1 Complete
  - Ensure all syntax errors fixed (0 errors)
  - Ensure all property tests pass (100% pass rate)
  - Ensure all imports resolve (0 commented imports)
  - Ensure all critical transformation bugs fixed
  - Ask the user if questions arise before proceeding to Phase 2

## Phase 2: High-Impact Type Safety (Weeks 2-3)

### Goal: Eliminate type safety violations in critical paths (~200 most dangerous `as any` instances)

- [x] 6. Create Automated Tooling for Type Safety
  - [x] 6.1 Create type safety violation scanner
    - Create `scripts/scan-type-violations.ts`
    - Implement scanner to find all `as any` instances
    - Categorize by type (enum, dynamic property, API response, database, etc.)
    - Assign severity based on location (server/shared = high, client = medium, tests = low)
    - Generate JSON report and HTML dashboard
    - _Requirements: 21.1, 21.5_

  - [x] 6.2 Run scanner and generate initial report
    - Run `npm run scan:type-violations`
    - Review report to identify ~200 most dangerous instances
    - Prioritize: server/ and shared/ data transformation, API boundaries, database operations, authentication
    - _Requirements: 16.4, 21.5_

  - [x] 6.3 Create bulk fix templates
    - Create `scripts/fix-templates.ts`
    - Implement templates for common patterns (enum conversion, API response, etc.)
    - Add verification step (ensure TypeScript still compiles after fix)
    - _Requirements: 21.3_


- [x] 7. Fix Type Safety in server/ (Critical Path)
  - [x] 7.1 Create type-safe enum converter utility
    - Create `shared/utils/type-guards.ts` (if not exists)
    - Implement `createEnumConverter<T>` function
    - Add type guards for common enums (UserRole, UserStatus, BillStatus, etc.)
    - _Requirements: 4.2, 16.2_

  - [x] 7.2 Fix enum conversions in government data integration
    - Replace `as any` in `server/features/government-data/services/government-data-integration.service.ts`
    - Use `createEnumConverter` for type-safe conversions
    - _Requirements: 4.2, 16.2, 16.4_

  - [x] 7.3 Fix type safety in database operations
    - Find all `as any` in `server/infrastructure/database/`
    - Replace with proper type guards and Zod validation
    - Focus on row normalization and error handling
    - _Requirements: 16.2, 16.4_

  - [x] 7.4 Fix type safety in API boundaries
    - Find all `as any` in server API routes and controllers
    - Replace with Zod schema validation
    - Ensure request/response types are properly typed
    - _Requirements: 16.2, 16.3, 16.4_

  - [x] 7.5 Fix recommendation repository return types
    - Update recommendation repository to return properly typed arrays
    - Replace `as any[]` with specific types
    - Add type definitions for recommendation results
    - _Requirements: 4.3, 16.2_

  - [x] 7.6 Write unit tests for enum converters
    - Test valid enum conversions
    - Test invalid enum values (should throw descriptive errors)
    - Test type guards
    - _Requirements: 4.2_

- [x] 8. Fix Type Safety in shared/ (Critical Path)
  - [x] 8.1 Fix type safety in transformers
    - Find all `as any` in `shared/utils/transformers/`
    - Replace with proper type guards and validation
    - Ensure transformers are fully typed
    - _Requirements: 16.2, 16.4_

  - [x] 8.2 Fix type safety in ML models
    - Find all `as any` in `shared/ml/models/`
    - Replace with proper type guards for dynamic property access
    - Create type guard functions where needed
    - _Requirements: 4.1, 16.2_

  - [x] 8.3 Fix Window and Request augmentation
    - Update Window augmentation in `shared/core/utils/browser-logger.ts` to use proper TypeScript declaration merging
    - Update Request augmentation in `shared/core/middleware/auth/provider.ts` to use proper TypeScript declaration merging
    - Remove `as any` type assertions
    - _Requirements: 4.4, 16.2_

- [x] 9. Fix Type Safety in Authentication and Security
  - [x] 9.1 Fix type safety in authentication middleware
    - Find all `as any` in authentication-related code
    - Replace with proper type guards and Zod validation
    - Ensure user objects are properly typed
    - _Requirements: 16.2, 16.4_

  - [x] 9.2 Fix type safety in security middleware
    - Find all `as any` in `server/features/security/` and `server/middleware/`
    - Replace with proper types (IP masking, request data replacement, etc.)
    - _Requirements: 16.2, 16.4_

- [x] 10. Checkpoint - Phase 2 Complete
  - Ensure ~200 high-impact `as any` instances fixed
  - Ensure 0 type safety violations in server/ and shared/ critical paths
  - Ensure TypeScript compilation succeeds with strict settings
  - Run all tests to verify no regressions
  - Ask the user if questions arise before proceeding to Phase 3

## Phase 3: TODO/FIXME Resolution (Week 4)

### Goal: Complete incomplete implementations, fix known bugs (191 TODO/FIXME/HACK comments)

- [ ] 11. Scan and Categorize TODO/FIXME Comments
  - [ ] 11.1 Create TODO scanner script
    - Create `scripts/scan-todos.ts`
    - Find all TODO/FIXME/HACK/XXX comments
    - Categorize by type (missing feature, known bug, workaround, documentation)
    - Generate prioritized list
    - _Requirements: 17.1, 17.4, 17.5, 17.6_

  - [ ] 11.2 Run scanner and generate report
    - Run `npm run scan:todos`
    - Review report to identify bugs vs documentation TODOs
    - Prioritize: bugs > missing features > workarounds > documentation
    - _Requirements: 17.1_

- [ ] 12. Implement Missing Services (Full Implementation)
  - [ ] 12.1 Implement performanceMonitoring service
    - Replace stub with full implementation
    - Integrate with metrics collection
    - _Requirements: 18.5_

  - [ ] 12.2 Implement inputValidationService
    - Replace stub with full implementation
    - Add comprehensive input validation
    - _Requirements: 18.5_

  - [ ] 12.3 Implement secureSessionService
    - Replace stub with full implementation
    - Add session management and security
    - _Requirements: 18.5_

  - [ ] 12.4 Implement securityMiddleware
    - Replace stub with full implementation
    - Add security checks and rate limiting
    - _Requirements: 18.5_

  - [ ] 12.5 Implement advancedCachingService
    - Replace stub with full implementation
    - Add caching strategies and invalidation
    - _Requirements: 18.5_

  - [ ] 12.6 Implement enhancedNotificationService
    - Replace stub with full implementation
    - Add notification delivery and scheduling
    - _Requirements: 18.5_

- [ ] 13. Fix Known Bugs (FIXME Comments)
  - [ ] 13.1 Fix performance metrics aggregation
    - Enable aggregation in `server/utils/metrics.ts`
    - Remove TODO comment
    - _Requirements: 17.5_

  - [ ] 13.2 Complete security middleware setup
    - Implement missing setup in `server/features/security/security-initialization-service.ts`
    - Remove TODO comments
    - _Requirements: 17.5_

  - [ ] 13.3 Fix test helpers
    - Uncomment schema imports in `server/tests/utils/test-helpers.ts`
    - Enable test data creation
    - _Requirements: 17.5_

  - [ ] 13.4 Enable XSS validation tests
    - Enable tests in `server/tests/utils/test-helpers.ts`
    - Ensure tests pass
    - _Requirements: 17.5_

  - [ ] 13.5 Enable SQL injection tests
    - Enable tests in `server/tests/utils/test-helpers.ts`
    - Ensure tests pass
    - _Requirements: 17.5_

  - [ ] 13.6 Enable concurrent response validation
    - Enable validation in `server/tests/utils/test-helpers.ts`
    - Ensure validation works correctly
    - _Requirements: 17.5_

  - [ ] 13.7 Fix cache stats and clear functionality
    - Enable cache stats in `server/features/admin/admin-router.OLD.ts`
    - Enable cache clear in `server/features/admin/admin-router.OLD.ts`
    - Remove TODO comments
    - _Requirements: 17.5_

- [ ] 14. Implement Missing Features (TODO Comments)
  - [ ] 14.1 Complete analytics type definitions
    - Update `client/src/features/analytics/types.ts`
    - Add all missing type definitions
    - Remove TODO comments
    - _Requirements: 3.7, 11.1, 17.4_

  - [ ] 14.2 Complete telemetry type definitions
    - Create `client/src/core/telemetry/types.ts`
    - Add all type definitions
    - Remove TODO comments
    - _Requirements: 11.2, 17.4_

  - [ ] 14.3 Complete dashboard config validation
    - Implement missing validation in `client/src/lib/ui/dashboard/utils/dashboard-config-utils.ts`
    - Remove TODO comments
    - _Requirements: 7.4, 15.4, 17.4_

- [ ] 15. Replace Workarounds (HACK Comments)
  - [ ] 15.1 Scan for HACK comments
    - Find all HACK comments in codebase
    - Identify workarounds that need proper solutions
    - _Requirements: 17.6_

  - [ ] 15.2 Replace workarounds with proper solutions
    - For each HACK comment, implement proper solution
    - Remove HACK comments
    - Verify functionality still works
    - _Requirements: 17.6_

- [ ] 16. Implement Error Handling Infrastructure
  - [ ] 16.1 Create ErrorContext builder
    - Create `shared/utils/errors/context.ts`
    - Implement `ErrorContext` interface
    - Implement `ErrorContextBuilder` class with fluent API
    - _Requirements: 6.1_

  - [ ] 16.2 Create error type definitions
    - Create `shared/utils/errors/types.ts`
    - Define `TransformationError`, `ValidationError`, `NetworkError` classes
    - Add `ErrorContext` to all error types
    - _Requirements: 11.3_

  - [ ] 16.3 Update transformers to include error context
    - Update all transformers to use `ErrorContextBuilder`
    - Include operation, layer, field, and value in errors
    - _Requirements: 1.4, 6.1_

  - [ ] 16.4 Write property test for error context enrichment
    - **Property 6: Error Context Enrichment**
    - **Validates: Requirements 1.4, 6.1**

  - [ ] 16.5 Standardize validation error messages
    - Create error message formatter in `shared/validation/errors.ts`
    - Format: "{field}: {rule} - {description}"
    - Update all validators to use consistent format
    - _Requirements: 5.4, 6.4_

  - [ ] 16.6 Write property test for consistent error message format
    - **Property 7: Consistent Error Message Format**
    - **Validates: Requirements 5.4, 6.4**

  - [ ] 16.7 Create error logging utility
    - Create `shared/utils/errors/logger.ts`
    - Implement logging with timestamp, severity, stack trace, and context
    - Integrate with error tracking service (if configured)
    - _Requirements: 6.5, 6.6_

  - [ ]* 16.8 Write property test for error logging completeness
    - **Property 8: Error Logging Completeness**
    - **Validates: Requirements 6.5**

- [ ] 17. Implement Client-Side Enhancements
  - [ ] 17.1 Create WebSocket manager with reconnection
    - Create `client/src/core/websocket/manager.ts`
    - Implement `WebSocketManager` interface
    - Add exponential backoff reconnection (1s, 2s, 4s, 8s, 16s, max 30s)
    - Add connection state tracking and error logging
    - _Requirements: 7.2, 13.1_

  - [ ]* 17.2 Write property test for WebSocket reconnection
    - **Property 10: WebSocket Reconnection with Backoff**
    - **Validates: Requirements 7.2, 13.1**

  - [ ] 17.3 Create API retry utility
    - Create `client/src/core/api/retry.ts`
    - Implement `withRetry` function with configurable retry logic
    - Retry network errors up to 3 times
    - Retry 5xx errors with exponential backoff
    - Don't retry 4xx errors
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]* 17.4 Write property test for API retry logic
    - **Property 13: API Retry Logic**
    - **Validates: Requirements 13.2, 13.3, 13.4**

  - [ ] 17.5 Create VirtualList component
    - Create `client/src/lib/ui/virtual-list/VirtualList.tsx`
    - Implement virtual scrolling with configurable item height
    - Add overscan for smooth scrolling
    - _Requirements: 12.1, 12.2_

  - [ ] 17.6 Update ActivityFeed to use VirtualList
    - Update `client/src/features/community/ui/activity/ActivityFeed.tsx`
    - Replace standard list rendering with VirtualList
    - _Requirements: 7.1, 12.1_

  - [ ]* 17.7 Write property test for state synchronization
    - **Property 11: State Synchronization Without Conflicts**
    - **Validates: Requirements 7.3**

  - [ ]* 17.8 Write property test for WebSocket message batching
    - **Property 12: WebSocket Message Batching**
    - **Validates: Requirements 12.4**

  - [ ] 17.9 Update bills-dashboard to use VirtualList
    - Update `client/src/features/bills/ui/bills-dashboard.tsx`
    - Replace standard list rendering with VirtualList
    - _Requirements: 12.2_

  - [ ] 17.10 Create reusable ErrorBoundary component
    - Create `client/src/lib/ui/error-boundary/ErrorBoundary.tsx`
    - Implement React error boundary with fallback UI and "Try Again" button
    - Log errors to error tracking service
    - _Requirements: 7.5, 13.5_

- [ ] 18. Implement Validation Improvements
  - [ ] 18.1 Add empty string validation to Zod schemas
    - Update all string schemas in `shared/validation/schemas/` to reject empty and whitespace-only strings
    - Use `.min(1)` and custom refinement for whitespace check
    - _Requirements: 5.1_

  - [ ]* 18.2 Write property test for empty string validation
    - **Property 4: Empty String Validation**
    - **Validates: Requirements 5.1**

  - [ ] 18.3 Create validation middleware for transformers
    - Create `shared/utils/transformers/validation.ts`
    - Implement `createValidatingTransformer` wrapper
    - Add validation before transformation (both directions)
    - _Requirements: 5.2, 5.3_

  - [ ]* 18.4 Write property test for validation before transformation
    - **Property 5: Validation Before Transformation**
    - **Validates: Requirements 5.2, 5.3**

  - [ ] 18.5 Update API endpoints to validate before processing
    - Audit all API endpoints in `server/` and `client/src/core/api/`
    - Ensure Zod validation occurs before any processing
    - Add validation error handling
    - _Requirements: 5.6_

- [ ] 19. Implement Serialization
  - [ ] 19.1 Create JSON serialization utilities
    - Create `shared/utils/serialization/json.ts`
    - Implement `serializeDomainModel` function (handles Date → ISO string)
    - Implement `deserializeDomainModel` function (validates structure, converts ISO string → Date)
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ]* 19.2 Write property test for date serialization consistency
    - **Property 14: Date Serialization Consistency**
    - **Validates: Requirements 14.1, 14.3, 14.4, 14.5**

  - [ ]* 19.3 Write property test for JSON deserialization validation
    - **Property 15: JSON Deserialization Validation**
    - **Validates: Requirements 14.2**

  - [ ] 19.4 Update API client to use serialization utilities
    - Update request serialization to use `serializeDomainModel`
    - Update response deserialization to use `deserializeDomainModel`
    - Ensure consistent date handling (ISO 8601)
    - _Requirements: 14.3, 14.4_

- [ ] 20. Implement Dashboard Config Validation
  - [ ] 20.1 Create dashboard config validator
    - Create `client/src/features/dashboard/validation/config.ts`
    - Implement Zod schema for dashboard configuration
    - Add validation for widget types, layout, and widget position references
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 20.2 Write property test for dashboard config validation
    - **Property 16: Dashboard Config Validation**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.5**

- [ ] 21. Checkpoint - Phase 3 Complete
  - Ensure 0 TODO/FIXME comments indicating bugs (documentation TODOs acceptable)
  - Ensure all missing features implemented
  - Ensure all known bugs fixed
  - Ensure all workarounds replaced with proper solutions
  - Run all tests to verify no regressions
  - Ask the user if questions arise before proceeding to Phase 4

## Phase 4: Remaining Type Safety (Weeks 5-7)

### Goal: Achieve 100% type safety (~588 remaining `as any` instances)

- [ ] 22. Fix Type Safety in client/src/ (~400 instances)
  - [ ] 22.1 Scan client/ for type safety violations
    - Run type safety scanner on `client/src/`
    - Generate report grouped by category and file
    - Prioritize by severity
    - _Requirements: 16.1, 16.5_

  - [ ] 22.2 Fix type safety in client/src/features/ (Week 5)
    - [ ] 22.2.1 Fix analytics feature type safety
      - Replace all `as any` in `client/src/features/analytics/`
      - Use Zod validation for API responses
      - _Requirements: 16.2, 16.3_

    - [ ] 22.2.2 Fix bills feature type safety
      - Replace all `as any` in `client/src/features/bills/`
      - Use proper types for bill data
      - _Requirements: 16.2, 16.3_

    - [ ] 22.2.3 Fix community feature type safety
      - Replace all `as any` in `client/src/features/community/`
      - Use proper types for user interactions
      - _Requirements: 16.2, 16.3_

    - [ ] 22.2.4 Fix other features type safety
      - Replace all `as any` in remaining features
      - Use proper types throughout
      - _Requirements: 16.2, 16.3_

  - [ ] 22.3 Fix type safety in client/src/core/ (Week 6)
    - [ ] 22.3.1 Fix API client type safety
      - Replace all `as any` in `client/src/core/api/`
      - Use Zod validation for all API responses
      - _Requirements: 16.2, 16.3_

    - [ ] 22.3.2 Fix state management type safety
      - Replace all `as any` in state management code
      - Use proper types for Redux/Zustand stores
      - _Requirements: 16.2, 16.3_

    - [ ] 22.3.3 Fix utilities type safety
      - Replace all `as any` in `client/src/core/utils/`
      - Use proper type guards and validation
      - _Requirements: 16.2, 16.3_

  - [ ] 22.4 Fix type safety in client/src/lib/ (Week 6)
    - Replace all `as any` in `client/src/lib/`
    - Use proper types for UI components and utilities
    - _Requirements: 16.2, 16.3_

  - [ ] 22.5 Fix type safety in client/src/services/ (Week 6)
    - Replace all `as any` in `client/src/services/`
    - Use proper types for service interfaces
    - _Requirements: 16.2, 16.3_

- [ ] 23. Fix Remaining Type Safety in server/ (~50 instances)
  - [ ] 23.1 Fix type safety in server/features/ (Week 7)
    - Replace all remaining `as any` in `server/features/`
    - Use Zod validation and type guards
    - _Requirements: 16.2, 16.3_

  - [ ] 23.2 Fix type safety in server/infrastructure/ (Week 7)
    - Replace all remaining `as any` in `server/infrastructure/`
    - Use proper types for infrastructure code
    - _Requirements: 16.2, 16.3_

  - [ ] 23.3 Fix type safety in server/middleware/ (Week 7)
    - Replace all remaining `as any` in `server/middleware/`
    - Use proper types for middleware
    - _Requirements: 16.2, 16.3_

  - [ ] 23.4 Fix type safety in server/tests/ (Week 7)
    - Replace all remaining `as any` in `server/tests/`
    - Use proper types for test code (where necessary)
    - Note: Some `as any` in tests may be acceptable for mocking
    - _Requirements: 16.2, 16.3_

- [ ] 24. Fix Remaining Type Safety in shared/ (~50 instances)
  - [ ] 24.1 Fix type safety in shared/utils/ (Week 7)
    - Replace all remaining `as any` in `shared/utils/`
    - Use proper types and type guards
    - _Requirements: 16.2, 16.3_

  - [ ] 24.2 Fix type safety in shared/types/ (Week 7)
    - Replace all remaining `as any` in `shared/types/`
    - Ensure all type definitions are complete
    - _Requirements: 16.2, 16.3_

  - [ ] 24.3 Fix type safety in shared/validation/ (Week 7)
    - Replace all remaining `as any` in `shared/validation/`
    - Use Zod schemas properly
    - _Requirements: 16.2, 16.3_

- [ ] 25. Verify Zero Type Safety Violations
  - [ ] 25.1 Run final type safety scan
    - Run `npm run scan:type-violations`
    - Verify 0 `as any` in production code (excluding tests where absolutely necessary)
    - _Requirements: 16.1, 16.6_

  - [ ] 25.2 Enable strict TypeScript settings
    - Update tsconfig.json to enable all strict settings
    - Fix any new errors that appear
    - _Requirements: 16.6_

  - [ ] 25.3 Run TypeScript compilation with strict settings
    - Run `tsc --noEmit` with strict settings
    - Verify 0 errors
    - _Requirements: 16.6_

- [ ] 26. Checkpoint - Phase 4 Complete
  - Ensure 0 `as any` in production code (all 788 instances fixed)
  - Ensure TypeScript compiles with strict settings
  - Ensure all tests pass
  - Ask the user if questions arise before proceeding to Phase 5

## Phase 5: Code Quality (Week 8)

### Goal: Meet all quality standards, final verification

- [ ] 27. Address ESLint Suppressions (99 instances)
  - [ ] 27.1 Scan for ESLint suppressions
    - Find all `eslint-disable` and `eslint-disable-next-line` comments
    - Categorize by rule being disabled
    - Generate report
    - _Requirements: 17.2_

  - [ ] 27.2 Fix underlying issues instead of suppressing
    - For each suppression, try to fix the underlying issue
    - Only keep suppressions where absolutely necessary
    - Add justification comments for remaining suppressions
    - Target: <10 suppressions with clear justification
    - _Requirements: 17.2_

  - [ ] 27.3 Verify ESLint passes
    - Run ESLint on all modified files
    - Verify 0 errors (warnings acceptable)
    - _Requirements: 17.2_

- [ ] 28. Address TypeScript Suppressions (3 instances)
  - [ ] 28.1 Find all TypeScript suppressions
    - Find all `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` comments
    - Identify why they were added
    - _Requirements: 17.3_

  - [ ] 28.2 Fix underlying type issues
    - For each suppression, fix the underlying type issue
    - Remove all TypeScript suppressions
    - Target: 0 suppressions
    - _Requirements: 17.3_

  - [ ] 28.3 Verify TypeScript compilation
    - Run `tsc --noEmit` with strict settings
    - Verify 0 errors, 0 suppressions
    - _Requirements: 17.3_

- [ ] 29. Create Progress Tracking Dashboard
  - [ ] 29.1 Create progress tracking script
    - Create `scripts/track-progress.ts`
    - Implement metrics collection (type safety violations, TODOs, ESLint suppressions, etc.)
    - Compare with baseline (BUG_BASELINE.md)
    - Calculate progress percentage and velocity
    - _Requirements: 22.1, 22.4_

  - [ ] 29.2 Generate final progress report
    - Run `npm run track:progress`
    - Generate HTML dashboard with charts
    - Verify all metrics meet targets
    - _Requirements: 22.1, 22.2, 22.3_

- [ ] 30. Final Verification
  - [ ] 30.1 Run full test suite
    - Run all unit tests
    - Run all property tests
    - Run all integration tests
    - Verify 100% pass rate
    - _Requirements: 22.3_

  - [ ] 30.2 Run TypeScript compilation
    - Run `tsc --noEmit` in all packages with strict settings
    - Verify zero compilation errors
    - _Requirements: 16.6, 22.3_

  - [ ] 30.3 Run linter
    - Run ESLint on all modified files
    - Verify 0 errors (warnings acceptable)
    - Verify <10 suppressions with justification
    - _Requirements: 17.2, 22.3_

  - [ ] 30.4 Verify metrics meet targets
    - Type safety violations: 0 (was 788)
    - TODO/FIXME comments indicating bugs: 0 (was 191)
    - ESLint suppressions: <10 with justification (was 99)
    - Commented imports: 0 (was 33)
    - TypeScript suppressions: 0 (was 3)
    - Syntax errors: 0 (was 3)
    - Property test pass rate: 100% (was 67%)
    - _Requirements: 22.1, 22.3_

  - [ ] 30.5 Build application
    - Run production build
    - Verify build completes without errors
    - Verify no missing module errors
    - Verify build time <2 minutes
    - _Requirements: 8.5, 22.3_

  - [ ] 30.6 Performance verification
    - Test ActivityFeed with 10,000 items (should render smoothly)
    - Test dashboard load time (should be <2 seconds)
    - Test WebSocket reconnection (should reconnect in <5 seconds)
    - Test API calls (p95 should be <500ms)
    - _Requirements: 12.1, 12.2, 13.1, 22.3_

- [ ] 31. Final Checkpoint - Production Ready
  - Ensure all 1,114+ bugs fixed
  - Ensure all tests pass (100% pass rate)
  - Ensure build succeeds
  - Ensure all quality metrics meet targets
  - Ensure no critical issues remain
  - Document any remaining minor issues as future work
  - Ask the user to confirm production readiness

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation follows a phased approach: fix critical bugs first, then high-impact type safety, then complete implementations, then remaining type safety, then final quality
- All property tests should be tagged with: `// Feature: comprehensive-bug-fixes, Property N: [Property Title]`
- Automated tooling is essential for tracking progress on 1,114+ bugs
- Each phase has clear goals and success criteria
- Phases can be parallelized where appropriate (e.g., multiple developers working on different categories)

## Success Criteria

✅ All 1,114+ bugs fixed (was 53)
✅ All 16 property tests pass (covering all correctness properties from design)
✅ Zero runtime crashes from invalid dates
✅ Zero missing module errors
✅ Zero `as any` type assertions in production code (was 788)
✅ Zero TODO/FIXME comments indicating bugs (was 191)
✅ <10 ESLint suppressions with justification (was 99)
✅ Zero commented imports (was 33)
✅ Zero TypeScript suppressions (was 3)
✅ Zero syntax errors (was 3)
✅ TypeScript compilation: 0 errors with strict settings
✅ Test coverage: >80% overall
✅ Property tests: 100% pass rate (16/16 tests)
✅ Build completes successfully in <2 minutes
✅ ActivityFeed renders 10,000 items smoothly
✅ WebSocket reconnects automatically with exponential backoff
✅ API calls retry appropriately based on error type

## Timeline

- **Original estimate**: 5 days (37 hours)
- **Revised estimate**: 8 weeks (167 hours)
- **Reality**: 21x larger scope than originally estimated

## Phase Breakdown

| Phase | Duration | Focus | Bug Count | Success Criteria |
|-------|----------|-------|-----------|------------------|
| Phase 1 | Week 1 | Critical bugs | ~50 | 0 syntax errors, 0 commented imports, 100% property test pass rate |
| Phase 2 | Weeks 2-3 | High-impact type safety | ~200 | 0 type safety violations in critical paths |
| Phase 3 | Week 4 | TODO/FIXME resolution | ~191 | 0 TODO/FIXME indicating bugs, all features complete |
| Phase 4 | Weeks 5-7 | Remaining type safety | ~588 | 0 `as any` in production code |
| Phase 5 | Week 8 | Code quality | ~85 | <10 ESLint suppressions, 0 TypeScript suppressions |
| **Total** | **8 weeks** | **All bugs** | **1,114+** | **All quality metrics met** |
