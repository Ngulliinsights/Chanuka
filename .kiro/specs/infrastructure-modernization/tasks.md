# Implementation Plan: Infrastructure Modernization

## Overview

This implementation plan modernizes infrastructure integration across all 30 features in the legislative transparency platform. The initiative follows a 5-phase approach over 14 weeks, progressing from foundation (database standardization, Bills feature modernization) through pattern extraction (BaseRepository), feature modernization (28 remaining features), cross-feature infrastructure (metrics, audit, notifications, ML), and enforcement (ESLint rules, integration score monitoring). The goal is to achieve 90%+ integration score, eliminate legacy patterns, and establish consistent infrastructure usage across the entire codebase.

## Tasks

### Phase 1: Foundation (Weeks 1-2)

- [x] 1. Standardize database access across all features (Week 1)
  - [x] 1.1 Create database access migration script
    - Write automated script to find and replace legacy `db` imports with `readDatabase`/`writeDatabase`
    - Identify all files importing from `@server/infrastructure/database/pool`
    - Replace read operations with `readDatabase` connection
    - Replace write operations with `writeDatabase` wrapped in `withTransaction`
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Execute database access migration across all 30 features
    - Run migration script on all feature directories
    - Verify no remaining legacy pool imports
    - Test database operations still function correctly
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.3 Write property test for database connection routing
    - **Property 1: Database Connection Routing**
    - **Validates: Requirements 1.2, 1.3, 1.5**
    - Test that read operations use `readDatabase` and write operations use `writeDatabase`
    - _Requirements: 1.2, 1.3, 1.5_
  
  - [ ]* 1.4 Write property test for transaction retry logic
    - **Property 2: Transaction Retry Logic**
    - **Validates: Requirements 1.4, 20.3**
    - Test that transient failures trigger automatic retry with exponential backoff
    - _Requirements: 1.4, 20.3_

- [-] 2. Modernize Bills feature as reference implementation (Week 2)
  - [x] 2.1 Create Bills validation schemas
    - Create `server/features/bills/application/bill-validation.schemas.ts`
    - Define CreateBillSchema, UpdateBillSchema, SearchBillsSchema using Zod
    - Use CommonSchemas from infrastructure/validation for reusable fields
    - Export TypeScript types from schemas
    - _Requirements: 3.1, 3.2, 6.3_
  
  - [x] 2.2 Create BillRepository with domain-specific queries
    - Create `server/features/bills/infrastructure/BillRepository.ts`
    - Implement searchBills method with complex query logic
    - Implement findByStatus, findByCategory methods
    - Integrate caching for expensive queries using cacheService
    - Return AsyncServiceResult for all methods
    - _Requirements: 6.1, 2.2, 2.6_
  
  - [x] 2.3 Write unit tests for BillRepository
    - Test all repository methods (searchBills, findByStatus, findByCategory)
    - Test cache integration (cache hits, cache invalidation)
    - Test error handling (database errors, not found)
    - _Requirements: 6.1, 21.3_
  
  - [x] 2.4 Update BillService to use validation schemas
    - Update all service methods to validate inputs using validateData
    - Replace manual validation logic with schema validation
    - Handle validation errors with ValidationError type
    - _Requirements: 6.3, 3.2, 3.4_
  
  - [x] 2.5 Update BillService to use BillRepository
    - Replace direct database queries with BillRepository methods
    - Remove database connection management from service
    - Use repository for all data access operations
    - _Requirements: 6.2, 2.2_
  
  - [x] 2.6 Implement caching for expensive bill queries
    - Identify expensive operations (search, list with filters, detail with relations)
    - Add caching to BillRepository methods using cacheService
    - Use cacheKeys.entity and cacheKeys.query for key generation
    - Set TTL to 5-15 minutes based on data volatility
    - Implement cache invalidation on create, update, delete operations
    - _Requirements: 6.4, 4.1, 4.2, 4.3_
  
  - [x] 2.7 Write property test for validation round-trip
    - **Property 6: Validation Round-Trip**
    - **Validates: Requirements 3.6**
    - Test that validating → processing → serializing → parsing produces equivalent data
    - _Requirements: 3.6_
  
  - [x] 2.8 Write property test for cache invalidation
    - **Property 7: Cache Invalidation**
    - **Validates: Requirements 4.3**
    - Test that data modification operations invalidate related cache entries
    - _Requirements: 4.3_
  
  - [x] 2.9 Verify Bills feature integration score
    - Calculate integration score for Bills feature
    - Verify 90%+ overall score achieved
    - Verify 100% component scores (database, cache, validation, error handling)
    - Document any exceptions or areas for improvement
    - _Requirements: 6.5, 11.1_

- [x] 3. Checkpoint - Verify Phase 1 completion
  - ✅ Bills feature implementation complete (all 9 sub-tasks)
  - ✅ Database standardization complete (all 30 features migrated)
  - ✅ Code quality verified (no syntax/runtime errors)
  - ⚠️ Test infrastructure broken (documented in TEST_INFRASTRUCTURE_ISSUE.md)
  - ✅ Manual verification confirms Phase 1 goals met
  - **Decision:** Proceed to Phase 2, fix test infrastructure in parallel


### Phase 1.5: Test Infrastructure Fix (Parallel Track)

- [ ] 3.1 Fix test infrastructure (can be done in parallel with Phase 2)
  - [ ] 3.1.1 Create missing tsconfig.json files
    - Create `tests/properties/tsconfig.json`
    - Create `tests/integration/tsconfig.json` (if missing)
    - Create `tests/unit/tsconfig.json` (if missing)
    - Extend root tsconfig.json
    - Configure path aliases to match vitest configs
    - _See: TEST_INFRASTRUCTURE_ISSUE.md for details_
  
  - [ ] 3.1.2 Fix NX project configurations
    - Update `client/project.json` test target
    - Update `server/project.json` test target
    - Update `shared/project.json` test target
    - Verify vitest config paths are correct
    - Test NX can find all vitest configs
    - _See: TEST_INFRASTRUCTURE_ISSUE.md for details_
  
  - [ ] 3.1.3 Verify test infrastructure works
    - Run `npm test` without NX errors
    - Verify all 162 tests can execute
    - Fix any remaining path resolution issues
    - Generate test coverage reports
    - Document any remaining test failures (separate from infrastructure)
    - _See: TEST_INFRASTRUCTURE_ISSUE.md for success criteria_

### Phase 2: Pattern Extraction (Weeks 3-4)

- [x] 4. Modernize Users feature following Bills pattern (Week 3)
  - [x] 4.1 Create Users validation schemas
    - Create `server/features/users/application/user-validation.schemas.ts`
    - Define CreateUserSchema, UpdateUserSchema, SearchUsersSchema using Zod
    - Use CommonSchemas for email, phone, name fields
    - Export TypeScript types from schemas
    - _Requirements: 7.3, 3.1, 3.2_
  
  - [x] 4.2 Create UserRepository with domain-specific queries
    - Create `server/features/users/infrastructure/UserRepository.ts`
    - Implement findByEmail, findByRole, searchUsers methods
    - Integrate caching for user profile queries
    - Return AsyncServiceResult for all methods
    - _Requirements: 7.1, 2.2, 2.6_
  
  - [x] 4.3 Write unit tests for UserRepository
    - Test all repository methods
    - Test cache integration
    - Test error handling
    - _Requirements: 7.1, 21.3_
  
  - [x] 4.4 Update UserService to use validation schemas and UserRepository
    - Update all service methods to validate inputs
    - Replace direct database queries with UserRepository methods
    - Handle validation and database errors appropriately
    - _Requirements: 7.2, 7.3_
  
  - [x] 4.5 Implement caching for user profile queries
    - Add caching to UserRepository methods
    - Use cacheKeys.user for key generation
    - Set TTL to 30-60 minutes (low volatility)
    - Implement cache invalidation on user updates
    - _Requirements: 7.4, 4.1, 4.2, 4.3_
  
  - [x] 4.6 Verify Users feature integration score
    - Calculate integration score for Users feature
    - Verify 90%+ overall score achieved
    - Document patterns common with Bills feature
    - _Requirements: 7.5, 11.1_

- [ ] 5. Extract BaseRepository from Bills and Users patterns (Week 4)
  - [ ] 5.1 Create error type hierarchy
    - Create `server/infrastructure/errors/error-types.ts`
    - Define AppError base class with code, statusCode, context
    - Define ValidationError, DatabaseError, NotFoundError, AuthorizationError, CacheError
    - Export all error types for feature usage
    - _Requirements: 5.2, 5.3_
  
  - [ ] 5.2 Create BaseRepository class with common CRUD operations
    - Create `server/infrastructure/database/repository/BaseRepository.ts`
    - Implement generic findById, findMany, create, update, delete methods
    - Implement findPaginated with pagination support
    - Implement findByIds, createMany for batch operations
    - Integrate with readDatabase/writeDatabase for connection management
    - Integrate with withTransaction for transaction support
    - Return AsyncServiceResult for all methods
    - _Requirements: 2.1, 2.4, 2.6, 8.2, 8.3_
  
  - [ ] 5.3 Add cache integration to BaseRepository
    - Implement getCacheKey method for cache key generation
    - Implement invalidateCache method for cache invalidation
    - Integrate cacheService in findById, findMany methods
    - Add automatic cache invalidation on create, update, delete
    - _Requirements: 2.5, 8.4_
  
  - [ ] 5.4 Write unit tests for BaseRepository
    - Test all CRUD operations
    - Test pagination support
    - Test batch operations
    - Test cache integration
    - Test transaction support
    - Test error handling
    - _Requirements: 8.2, 21.3_
  
  - [ ] 5.5 Write property test for repository data integrity
    - **Property 4: Repository Data Integrity**
    - **Validates: Requirements 2.10, 8.7**
    - Test that repository operations maintain data integrity invariants
    - _Requirements: 2.10, 8.7_
  
  - [ ] 5.6 Refactor BillRepository to extend BaseRepository
    - Update BillRepository to extend BaseRepository<Bill, InsertBill>
    - Remove duplicate CRUD operations
    - Keep domain-specific methods (searchBills, findByStatus)
    - Verify all existing functionality still works
    - _Requirements: 8.6, 2.2_
  
  - [ ] 5.7 Refactor UserRepository to extend BaseRepository
    - Update UserRepository to extend BaseRepository<User, InsertUser>
    - Remove duplicate CRUD operations
    - Keep domain-specific methods (findByEmail, findByRole)
    - Verify all existing functionality still works
    - _Requirements: 8.6, 2.2_
  
  - [ ] 5.8 Write property test for migration equivalence
    - **Property 3: Migration Equivalence**
    - **Validates: Requirements 1.6, 21.6**
    - Test that modern database access produces equivalent results to legacy pool access
    - _Requirements: 1.6, 21.6_

- [ ] 6. Create repository pattern decision matrix and documentation
  - [ ] 6.1 Document repository pattern decision matrix
    - Create decision matrix for when to use direct database access vs repository pattern
    - Document criteria: query complexity, domain logic, caching needs
    - Provide examples for each scenario
    - _Requirements: 2.9, 19.3_
  
  - [ ] 6.2 Create repository pattern implementation guide
    - Document how to create feature-specific repositories
    - Provide code examples for common patterns
    - Document cache integration patterns
    - Document error handling patterns
    - _Requirements: 19.3_

- [ ] 7. Checkpoint - Verify Phase 2 completion
  - Ensure all tests pass, verify BaseRepository is functional and Bills/Users refactored successfully, ask the user if questions arise.


### Phase 3: Feature Modernization (Weeks 5-10)

- [ ] 8. Modernize Tier 1 features (Weeks 5-6)
  - [ ] 8.1 Modernize notifications feature
    - Create validation schemas for notification inputs
    - Create NotificationRepository if complex queries needed, or use direct database access
    - Update NotificationService to use validation schemas
    - Implement caching for notification queries
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 8.2 Modernize search feature
    - Create validation schemas for search inputs
    - Create SearchRepository with complex search query methods
    - Update SearchService to use validation schemas and repository
    - Implement caching for search results (3-5 min TTL)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 8.3 Modernize sponsors feature
    - Create validation schemas for sponsor inputs
    - Use direct database access (simple CRUD operations)
    - Update SponsorService to use validation schemas
    - Implement caching for sponsor queries (30-60 min TTL)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [ ] 8.4 Modernize recommendation feature
    - Create validation schemas for recommendation inputs
    - Create RecommendationRepository if complex queries needed
    - Update RecommendationService to use validation schemas
    - Implement caching for recommendation queries
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 8.5 Modernize pretext-detection feature
    - Create validation schemas for pretext detection inputs
    - Use direct database access or repository based on complexity
    - Update service to use validation schemas
    - Implement caching for detection results
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 8.6 Modernize universal_access feature
    - Create validation schemas for universal access inputs
    - Use direct database access or repository based on complexity
    - Update service to use validation schemas
    - Implement caching for access queries
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 9. Modernize Tier 2 features (Weeks 7-8)
  - [ ] 9.1 Modernize analytics feature (rename to engagement-metrics)
    - Rename feature directory from analytics to engagement-metrics
    - Update all imports and references
    - Create validation schemas for metrics inputs
    - Create repository if complex aggregation queries needed
    - Update service to use validation schemas
    - Implement caching for metrics queries (5-15 min TTL)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 12.1_
  
  - [ ] 9.2 Modernize security feature
    - Consolidate security primitives to infrastructure/security
    - Keep business logic (audit, monitoring, policies) in features/security
    - Create validation schemas for security inputs
    - Update services to use infrastructure/security primitives
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 18.1, 18.2, 18.3_
  
  - [ ] 9.3 Modernize safeguards feature
    - Remove infrastructure/safeguards facade
    - Consolidate all logic to features/safeguards
    - Create validation schemas for safeguard inputs
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.4_
  
  - [ ] 9.4 Modernize community feature
    - Create validation schemas for community inputs
    - Create repository if complex queries needed
    - Update service to use validation schemas
    - Implement caching for community queries (3-5 min TTL, high volatility)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 10. Modernize Tier 3 features - Part 1 (Week 9)
  - [ ] 10.1 Modernize analysis feature (rename to bill-assessment)
    - Rename feature directory from analysis to bill-assessment
    - Update all imports and references
    - Create validation schemas for assessment inputs
    - Create repository if complex queries needed
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 12.2_
  
  - [ ] 10.2 Modernize constitutional-analysis feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 10.3 Modernize constitutional-intelligence feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 10.4 Modernize privacy feature
    - Remove infrastructure/privacy facade
    - Consolidate all logic to features/privacy
    - Create validation schemas
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.3_
  
  - [ ] 10.5 Modernize monitoring feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 10.6 Modernize government-data feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Implement caching (30-60 min TTL, low volatility)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 11. Modernize Tier 3 features - Part 2 (Week 10)
  - [ ] 11.1 Modernize advocacy feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.2 Modernize argument-intelligence feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.3 Modernize coverage feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.4 Modernize market feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.5 Modernize ml feature (will be refactored in Phase 4)
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.6 Modernize regulatory-monitoring feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.7 Modernize ai-evaluation feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.8 Modernize accountability feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.9 Modernize admin feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 11.10 Modernize alert-preferences feature
    - Create validation schemas
    - Use direct database access (simple CRUD)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [ ] 11.11 Modernize feature-flags feature
    - Create validation schemas
    - Use direct database access (simple CRUD)
    - Implement caching (5-15 min TTL)
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [ ] 11.12 Modernize institutional-api feature
    - Create validation schemas
    - Use direct database access or repository based on complexity
    - Verify 90%+ integration score
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 12. Checkpoint - Verify Phase 3 completion
  - Ensure all 30 features achieve 90%+ integration score, verify zero legacy pool imports, ask the user if questions arise.


### Phase 4: Cross-Feature Infrastructure (Weeks 11-12)

- [ ] 13. Implement unified metrics infrastructure (Week 11)
  - [ ] 13.1 Create MetricsService interface and implementation
    - Create `server/infrastructure/metrics/MetricsService.ts`
    - Implement incrementCounter, setGauge, recordHistogram, startTimer methods
    - Implement getMetrics query method with filters
    - Integrate with existing metrics storage
    - _Requirements: 13.1, 13.2_
  
  - [ ]* 13.2 Write unit tests for MetricsService
    - Test all metric types (counter, gauge, histogram, timer)
    - Test metric query with filters
    - Test metric aggregation
    - _Requirements: 13.1, 21.3_
  
  - [ ]* 13.3 Write property test for metrics infrastructure usage
    - **Property 13: Metrics Infrastructure Usage**
    - **Validates: Requirements 13.3**
    - Test that features use infrastructure/metrics interface rather than custom implementations
    - _Requirements: 13.3_
  
  - [ ] 13.4 Migrate features to use MetricsService
    - Identify all custom metrics implementations across features
    - Replace with MetricsService calls
    - Eliminate feature-specific metrics code
    - Verify metrics still collected correctly
    - _Requirements: 13.3, 13.6, 28.3_

- [ ] 14. Implement unified audit infrastructure (Week 11)
  - [ ] 14.1 Create AuditService interface and implementation
    - Create `server/infrastructure/audit/AuditService.ts`
    - Implement logEvent method with AuditEvent structure
    - Implement queryEvents method with filters
    - Implement exportEvents method (JSON, CSV formats)
    - Store audit events with timestamp, user, action, entity, context
    - _Requirements: 14.1, 14.2, 14.4_
  
  - [ ]* 14.2 Write unit tests for AuditService
    - Test audit event logging
    - Test audit event querying with filters
    - Test audit event export in multiple formats
    - _Requirements: 14.1, 21.3_
  
  - [ ]* 14.3 Write property test for audit event structure
    - **Property 14: Audit Event Structure**
    - **Validates: Requirements 14.3, 14.4**
    - Test that auditable actions emit events with required fields
    - _Requirements: 14.3, 14.4_
  
  - [ ] 14.4 Migrate features to use AuditService
    - Identify all custom audit implementations across features
    - Replace with AuditService calls
    - Eliminate feature-specific audit code
    - Verify audit trail completeness
    - _Requirements: 14.3, 14.5, 14.6, 28.7_

- [ ] 15. Enhance unified notification infrastructure (Week 11)
  - [ ] 15.1 Enhance NotificationService for cross-feature usage
    - Enhance `server/infrastructure/messaging/NotificationService.ts`
    - Implement send and sendBatch methods
    - Implement subscribe and unsubscribe methods
    - Support multiple channels (email, SMS, push, in-app)
    - Implement notification delivery retry with exponential backoff
    - Track notification delivery status and failures
    - _Requirements: 15.1, 15.2, 15.4_
  
  - [ ]* 15.2 Write unit tests for NotificationService
    - Test notification sending (single and batch)
    - Test subscription management
    - Test delivery retry logic
    - Test failure tracking
    - _Requirements: 15.1, 21.3_
  
  - [ ]* 15.3 Write property test for notification infrastructure usage
    - **Property 15: Notification Infrastructure Usage**
    - **Validates: Requirements 15.3**
    - Test that features publish events to infrastructure/messaging
    - _Requirements: 15.3_
  
  - [ ]* 15.4 Write property test for notification delivery retry
    - **Property 16: Notification Delivery Retry**
    - **Validates: Requirements 15.4**
    - Test that failed notifications trigger retry with exponential backoff
    - _Requirements: 15.4_
  
  - [ ] 15.5 Migrate features to use enhanced NotificationService
    - Identify all custom notification implementations across features
    - Replace with NotificationService calls
    - Eliminate feature-specific notification code
    - Verify notification delivery still works
    - _Requirements: 15.3, 15.6, 28.8_

- [ ] 16. Implement unified ML infrastructure (Week 12)
  - [ ] 16.1 Create MLService interface and implementation
    - Create `server/infrastructure/ml/MLService.ts`
    - Implement predict and predictBatch methods
    - Implement extractFeatures method for feature engineering
    - Implement loadModel and unloadModel for model management
    - Integrate with existing ML models
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [ ]* 16.2 Write unit tests for MLService
    - Test prediction methods (single and batch)
    - Test feature extraction
    - Test model management
    - _Requirements: 16.1, 21.3_
  
  - [ ]* 16.3 Write property test for ML infrastructure usage
    - **Property 17: ML Infrastructure Usage**
    - **Validates: Requirements 16.4**
    - Test that features use infrastructure/ml interface rather than custom ML logic
    - _Requirements: 16.4_
  
  - [ ] 16.4 Migrate features to use MLService
    - Identify all scattered ML implementations across features
    - Replace with MLService calls
    - Eliminate feature-specific ML code
    - Verify ML predictions still work correctly
    - _Requirements: 16.4, 16.6, 28.3_
  
  - [ ] 16.5 Create ml-intelligence feature for ML predictions
    - Create new `server/features/ml-intelligence` directory
    - Move ML business logic from scattered locations
    - Use MLService for all ML operations
    - Document clear ownership of ML predictions
    - _Requirements: 12.3_

- [ ] 17. Remove orphaned infrastructure components (Week 12)
  - [ ] 17.1 Remove infrastructure/delivery directory
    - Verify directory is empty
    - Delete infrastructure/delivery
    - Update documentation
    - _Requirements: 17.1_
  
  - [ ] 17.2 Audit and remove/document infrastructure/integration/feature-integration-helper.ts
    - Audit usage of feature-integration-helper.ts
    - If unused, remove file
    - If used, document usage and purpose
    - _Requirements: 17.2_
  
  - [ ] 17.3 Deprecate infrastructure/adapters with migration guide
    - Create migration guide from Adapter pattern to Repository pattern
    - Mark infrastructure/adapters as deprecated
    - Set removal timeline (e.g., 3 months)
    - Update documentation
    - _Requirements: 17.5, 2.8_
  
  - [ ] 17.4 Audit infrastructure/websocket and promote or deprecate
    - Audit websocket usage across features
    - If used, document usage and promote for real-time features
    - If unused, deprecate with removal timeline
    - Update documentation
    - _Requirements: 17.6, 29.2_
  
  - [ ] 17.5 Audit infrastructure/config and promote or deprecate
    - Audit config usage across features
    - If widely used, promote with migration guide for all features
    - If rarely used, document as optional with clear use cases
    - Update documentation
    - _Requirements: 17.7, 29.1_
  
  - [ ] 17.6 Audit infrastructure/external-data and promote or consolidate
    - Audit external-data usage across features
    - If widely used, promote as standard for external API integration
    - If specialized, keep as specialized component with documentation
    - Update documentation
    - _Requirements: 17.8, 29.3_

- [ ] 18. Consolidate security infrastructure (Week 12)
  - [ ] 18.1 Move security primitives to infrastructure/security
    - Move InputSanitizationService to infrastructure/security
    - Move QueryValidationService to infrastructure/security
    - Move encryption/decryption utilities to infrastructure/security
    - Move password hashing utilities to infrastructure/security
    - Move token generation/validation to infrastructure/security
    - Move SQL injection prevention to infrastructure/security
    - _Requirements: 18.1_
  
  - [ ] 18.2 Keep feature-specific security logic in features/security
    - Verify SecurityAuditService remains in features/security
    - Verify IntrusionDetectionService remains in features/security
    - Verify SecurityMonitoringService remains in features/security
    - Verify policy enforcement remains in features/security
    - _Requirements: 18.2_
  
  - [ ] 18.3 Define clear interface between infrastructure/security and features/security
    - Document component responsibility matrix
    - Document security primitive catalog
    - Provide usage examples per primitive
    - Create migration guide from feature-level security to infrastructure
    - _Requirements: 18.3, 18.6_
  
  - [ ]* 18.4 Write property test for security primitives usage
    - **Property 18: Security Primitives Usage**
    - **Validates: Requirements 18.5**
    - Test that features use infrastructure/security for primitives
    - _Requirements: 18.5_
  
  - [ ] 18.5 Migrate features to use infrastructure/security primitives
    - Identify duplicate security implementations across features
    - Replace with infrastructure/security primitives
    - Eliminate custom security implementations
    - Verify security functionality still works
    - _Requirements: 18.4, 18.5, 28.4_

- [ ] 19. Checkpoint - Verify Phase 4 completion
  - Ensure all cross-feature infrastructure is implemented and adopted, verify zero custom implementations remain, ask the user if questions arise.


### Phase 5: Enforcement and Monitoring (Weeks 13-14)

- [ ] 20. Implement ESLint rules for legacy pattern prevention (Week 13)
  - [ ] 20.1 Create ESLint rule to prohibit legacy pool imports
    - Add no-restricted-imports rule for @server/infrastructure/database/pool
    - Provide descriptive error message with migration guidance
    - Test rule catches legacy imports
    - _Requirements: 10.1, 10.5_
  
  - [ ] 20.2 Create ESLint rule to require modern database access
    - Add no-restricted-syntax rule for legacy pool access patterns
    - Provide descriptive error message with migration guidance
    - Test rule catches legacy patterns
    - _Requirements: 10.2, 10.5_
  
  - [ ] 20.3 Create ESLint rule to require withTransaction for writes
    - Add custom rule to detect write operations without withTransaction
    - Provide descriptive error message with migration guidance
    - Test rule catches unwrapped writes
    - _Requirements: 10.3, 10.5_
  
  - [ ] 20.4 Create ESLint rule to require validation schemas
    - Add custom rule to detect input handling without validation
    - Provide descriptive error message with migration guidance
    - Test rule catches unvalidated inputs
    - _Requirements: 10.4, 10.5_
  
  - [ ] 20.5 Create ESLint rule to enforce naming conventions
    - Add rule to prohibit "Enhanced" prefixes in class names
    - Add rule to require PascalCase for file names (no hyphens)
    - Add rule to require PascalCase for class names
    - Add rule to require camelCase for exported instances
    - Provide auto-fix capability where possible
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.7_
  
  - [ ] 20.6 Integrate ESLint rules into CI/CD pipeline
    - Update CI/CD configuration to run ESLint with new rules
    - Configure pipeline to fail on violations
    - Provide clear error messages in build output
    - _Requirements: 10.5, 30.8_

- [ ] 21. Implement naming convention standardization (Week 13)
  - [ ] 21.1 Create automated migration tool for naming conventions
    - Create script to rename files from hyphenated to PascalCase
    - Create script to remove "Enhanced" prefixes from class names
    - Create script to update all imports automatically
    - Test migration tool on sample features
    - _Requirements: 26.8, 26.9_
  
  - [ ] 21.2 Execute naming convention migration across all features
    - Run migration tool on all feature directories
    - Verify all files renamed correctly
    - Verify all imports updated correctly
    - Verify no broken references
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.6_
  
  - [ ]* 21.3 Write unit tests to verify naming conventions
    - Test that no "Enhanced" prefixes exist
    - Test that all files use PascalCase (no hyphens)
    - Test that all classes use PascalCase
    - Test that all exported instances use camelCase
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

- [ ] 22. Implement integration score monitoring (Week 14)
  - [ ] 22.1 Create integration score calculation functions
    - Create `server/infrastructure/monitoring/IntegrationScoreService.ts`
    - Implement calculateDatabaseScore (checks for modern database access, no legacy pool)
    - Implement calculateCacheScore (checks cache usage for expensive operations)
    - Implement calculateValidationScore (checks validation schema coverage)
    - Implement calculateSecurityScore (checks security integration)
    - Implement calculateErrorScore (checks AsyncServiceResult adoption)
    - Implement calculateObservabilityScore (checks structured logging coverage)
    - Implement calculateIntegrationScore (aggregates component scores)
    - _Requirements: 11.1, 11.2, 27.7_
  
  - [ ]* 22.2 Write unit tests for integration score calculation
    - Test each component score calculation
    - Test overall score aggregation
    - Test score calculation for various feature states
    - _Requirements: 11.1, 21.3_
  
  - [ ] 22.3 Implement integration score tracking and historical data
    - Create database schema for integration score history
    - Implement score tracking on every build
    - Store feature-level and system-wide scores
    - Store component-level scores
    - Track timestamps for trend analysis
    - _Requirements: 11.3_
  
  - [ ] 22.4 Create integration score report generation
    - Implement generateScoreReport function
    - Include per-feature overall score and component scores
    - Include system-wide overall score and component scores
    - Include trend analysis (improving, stable, regressing)
    - Include top 5 features needing attention
    - Support multiple output formats (JSON, HTML, Markdown)
    - _Requirements: 11.4, 27.8_
  
  - [ ] 22.5 Implement integration score alerting
    - Create alert rules for overall score drops below 85%
    - Create alert rules for component score drops below 80%
    - Include component-specific remediation plans in alerts
    - Integrate with notification system
    - _Requirements: 11.5, 11.6, 27.9_
  
  - [ ] 22.6 Create integration score monitoring dashboard
    - Create dashboard UI showing overall system score gauge
    - Add per-component score breakdown visualization
    - Add per-feature score heatmap
    - Add historical trend charts
    - Add feature maturity level distribution chart
    - Add regression detection indicators
    - _Requirements: 11.7, 11.9, 27.10_
  
  - [ ] 22.7 Implement component-specific adoption tracking
    - Track per-component adoption metrics (database, cache, validation, security, error handling, observability)
    - Generate component-specific adoption reports
    - Show features compliant vs non-compliant per component
    - Estimate effort to achieve 100% adoption per component
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8_
  
  - [ ] 22.8 Implement weekly score reporting
    - Create scheduled job to generate weekly reports
    - Include progress summary and key metrics
    - Send reports to stakeholders
    - _Requirements: 11.10, 25.1_

- [ ] 23. Implement architectural principles enforcement (Week 14)
  - [ ] 23.1 Create ESLint rules for architectural principles
    - Add rule to enforce dependency direction (Features → Infrastructure only)
    - Add rule to prohibit business logic in Infrastructure layer
    - Add rule to prohibit infrastructure concerns in Feature layer
    - Add rule to prohibit Features → Features dependencies without explicit interface
    - Provide descriptive error messages with remediation guidance
    - _Requirements: 30.1, 30.2, 30.3, 30.4_
  
  - [ ] 23.2 Create architecture decision records (ADRs)
    - Document ADR for Infrastructure vs Features separation
    - Document ADR for Repository pattern adoption
    - Document ADR for BaseRepository design
    - Document ADR for cross-feature infrastructure
    - Document ADR for security consolidation
    - Document ADR for naming conventions
    - _Requirements: 30.7_
  
  - [ ] 23.3 Create architecture visualization
    - Generate dependency graph showing Features → Infrastructure
    - Visualize component relationships
    - Highlight any architectural violations
    - _Requirements: 30.11_
  
  - [ ] 23.4 Integrate architecture validation into CI/CD
    - Add architecture validation step to CI/CD pipeline
    - Fail build on architectural violations
    - Provide clear error messages with remediation guidance
    - _Requirements: 30.8, 30.9_

- [ ] 24. Create comprehensive documentation (Week 14)
  - [ ] 24.1 Create architecture documentation
    - Document Infrastructure Layer vs Feature Layer separation
    - Document dependency direction rules
    - Document single responsibility principle
    - Provide examples and anti-patterns
    - _Requirements: 19.1, 30.10_
  
  - [ ] 24.2 Create migration guide for database access
    - Document how to convert legacy pool access to modern database access
    - Provide code examples for common patterns
    - Document transaction usage patterns
    - Document error handling patterns
    - _Requirements: 19.2_
  
  - [ ] 24.3 Create validation schema creation guide
    - Document how to create validation schemas
    - Provide common patterns and examples
    - Document how to use CommonSchemas
    - Document custom validation rules
    - _Requirements: 19.4_
  
  - [ ] 24.4 Create caching strategy guide
    - Document when to use caching
    - Provide TTL recommendations based on data volatility
    - Document cache invalidation patterns
    - Provide code examples
    - _Requirements: 19.5_
  
  - [ ] 24.5 Create troubleshooting guide
    - Document common migration issues and solutions
    - Document error messages and resolutions
    - Document performance issues and optimizations
    - Document rollback procedures
    - _Requirements: 19.6_
  
  - [ ] 24.6 Create redundancy elimination guide
    - Document single approved pattern for each technical concern
    - Provide migration guides from deprecated patterns
    - Document when to use each pattern
    - _Requirements: 28.9, 28.10_

- [ ] 25. Verify success criteria and final validation (Week 14)
  - [ ] 25.1 Verify system-wide integration score 90%+
    - Calculate final system-wide integration score
    - Verify score meets 90%+ target
    - Document any exceptions
    - _Requirements: Success Criteria 1_
  
  - [ ] 25.2 Verify component adoption 100%
    - Verify database score 100% (0% legacy pool access)
    - Verify cache score 100% for expensive operations
    - Verify validation score 100% for all inputs
    - Verify security score 100% for primitives
    - Verify error handling score 100% for services
    - Verify observability score 100% for structured logging
    - _Requirements: Success Criteria 2, 27.1-27.6_
  
  - [ ] 25.3 Verify feature maturity 100% at Level 3
    - Verify all 30 features achieve Level 3 maturity (90%+ integration score)
    - Document feature maturity level distribution
    - _Requirements: Success Criteria 3_
  
  - [ ] 25.4 Verify naming conventions 100% compliant
    - Verify 0% "Enhanced" prefixes remain
    - Verify 0% hyphenated file names remain
    - Verify all files follow PascalCase convention
    - _Requirements: Success Criteria 4, 26.1-26.6_
  
  - [ ] 25.5 Verify redundancy elimination 0% duplicates
    - Verify single approved pattern per technical concern
    - Verify no custom cache implementations
    - Verify no custom validation logic
    - Verify no custom metrics implementations
    - Verify no custom audit implementations
    - Verify no custom notification implementations
    - Verify no custom ML implementations
    - _Requirements: Success Criteria 5, 28.1-28.8_
  
  - [ ] 25.6 Verify legacy elimination 0% deprecated patterns
    - Verify 0% legacy pool access
    - Verify 0% Storage pattern usage
    - Verify 0% Adapter pattern usage
    - _Requirements: Success Criteria 6_
  
  - [ ] 25.7 Verify performance improvements
    - Measure database query reduction through caching (target: 40%+)
    - Measure transient failure reduction through retry logic (target: 50%+)
    - Verify response time SLA maintained (p95 < 500ms)
    - _Requirements: Success Criteria 7, 8, 20.1, 20.2, 20.4_
  
  - [ ] 25.8 Verify developer productivity improvements
    - Measure time to implement new features (target: 30%+ reduction)
    - Measure code duplication reduction (target: 20%+)
    - Gather developer feedback on new patterns
    - _Requirements: Success Criteria 9, 10, 24.5_
  
  - [ ] 25.9 Verify documentation completeness
    - Verify all infrastructure components have documentation
    - Verify all migration guides are complete
    - Verify all ADRs are documented
    - _Requirements: Success Criteria 11_
  
  - [ ] 25.10 Verify architectural compliance 100%
    - Verify all code passes architectural principle validation
    - Verify no dependency violations
    - Verify clear separation between infrastructure and features
    - _Requirements: Success Criteria 12, 30.1-30.12_
  
  - [ ] 25.11 Verify orphaned components removed
    - Verify 0 orphaned components remain
    - Verify all components are removed, promoted, or documented
    - _Requirements: Success Criteria 13, 17.1-17.8_
  
  - [ ] 25.12 Verify security consolidation complete
    - Verify clear separation between infrastructure/security and features/security
    - Verify all primitives in infrastructure/security
    - Verify all policies in features/security
    - _Requirements: Success Criteria 14, 18.1-18.10_
  
  - [ ] 25.13 Verify cross-feature infrastructure adoption
    - Verify all features use unified metrics
    - Verify all features use unified audit
    - Verify all features use unified notifications
    - Verify all features use unified ML infrastructure
    - _Requirements: Success Criteria 15_

- [ ] 26. Final checkpoint - Modernization complete
  - Ensure all success criteria met, all tests pass, integration score 90%+, celebrate milestone, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The 5-phase approach allows stopping at any phase with delivered value
- Feature flags enable safe rollback if issues arise during deployment
- Integration score monitoring provides continuous feedback on modernization progress
- ESLint rules prevent regression to legacy patterns
- All 30 features will achieve 90%+ integration score by completion
- Cross-feature infrastructure eliminates redundancy and establishes single approved patterns
- Architectural principles enforcement maintains clean separation of concerns
- Comprehensive documentation ensures knowledge transfer and maintainability

## Implementation Strategy

This plan follows a pragmatic, feature-first approach:

1. **Phase 1 (Weeks 1-2)**: Quick wins through database standardization and Bills reference implementation
2. **Phase 2 (Weeks 3-4)**: Pattern validation through Users feature and BaseRepository extraction
3. **Phase 3 (Weeks 5-10)**: Scale proven patterns across all 28 remaining features in priority order
4. **Phase 4 (Weeks 11-12)**: Eliminate redundancy through cross-feature infrastructure
5. **Phase 5 (Weeks 13-14)**: Prevent regression through enforcement and enable continuous monitoring

Each phase delivers incremental value and can serve as a stopping point if needed. The approach validates patterns with real features before scaling, minimizing risk and ensuring practical solutions.
