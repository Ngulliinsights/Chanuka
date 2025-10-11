**Subtasks:**
- [ ] Create `server/features/analytics/config/analytics.config.ts`
- [ ] Define configuration interface with:
  - [ ] Cache TTL values for different data types
  - [ ] Database timeout settings
  - [ ] Feature flags for gradual rollout
  - [ ] Performance thresholds (slow request timing)
  - [ ] Logging levels and preferences
- [ ] Create Zod schema for configuration validation
- [ ] Implement configuration loading from environment variables with defaults
- [ ] Implement validation that runs at application startup
- [ ] Configure validation to fail fast with clear error messages on invalid config
- [ ] Add unit tests for configuration validation:
  - [ ] Valid configuration passes
  - [ ] Missing required values fail with clear errors
  - [ ] Invalid types fail with clear errors
  - [ ] Out-of-range values fail with clear errors
- [ ] Document each configuration option with JSDoc comments
- [ ] Create example `.env.example` entries for analytics configuration
- [ ] Add configuration to main application startup sequence

**Acceptance Criteria:**
- Application fails to start with invalid configuration
- Error messages clearly indicate which configuration values are problematic
- All configuration options are documented
- Valid configuration loads successfully
- Tests verify validation logic

**Requirements Fulfilled:** REQ-1.4

**Verification Method:**
- Start application with invalid config and verify failure
- Start application with valid config and verify success
- Review error messages for clarity
- Documentation review confirms completeness

---

### Task A.5: Core Error Tracking Integration

**Objective:** Integrate analytics services with centralized error tracking infrastructure.

**Deliverables:**
- 2-3 services updated to use `core/errors/error-tracker`
- Consistent error context patterns established
- Error tracking verified in monitoring system

**Subtasks:**
- [ ] Review `core/errors/error-tracker.ts` API and usage patterns
- [ ] Update `engagement-analytics.ts` error handling:
  - [ ] Replace console.error calls with errorTracker.capture
  - [ ] Add analytics component identifier to error context
  - [ ] Add operation names to distinguish error sources
  - [ ] Include relevant context (userId, timeframe, etc.)
- [ ] Update `ml-analysis.ts` error handling with same patterns
- [ ] Update one method in `financial-disclosure/analytics.ts` as example
- [ ] Create error context helper that standardizes analytics error reporting
- [ ] Add tests verifying error tracker is called with correct context
- [ ] Deploy to staging and verify errors appear in monitoring system
- [ ] Document error tracking patterns for team reference

**Acceptance Criteria:**
- Console.error calls replaced with errorTracker.capture in updated services
- Error context includes component, operation, and relevant parameters
- Errors appear in centralized monitoring system with analytics tag
- Error tracking patterns are documented

**Requirements Fulfilled:** REQ-1.3

**Verification Method:**
- Code review confirms errorTracker usage
- Trigger errors in staging and verify they appear in monitoring
- Review error context for completeness

---

### Phase A Completion Checklist

- [ ] All Task A.1 subtasks completed and verified
- [ ] All Task A.2 subtasks completed and verified
- [ ] All Task A.3 subtasks completed and verified
- [ ] All Task A.4 subtasks completed and verified
- [ ] All Task A.5 subtasks completed and verified
- [ ] `npm run type-check` passes
- [ ] `npm test` passes all tests
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] Changes deployed to staging and verified
- [ ] Phase retrospective conducted and lessons documented

---

## Phase B: Controller Standardization and Request Handling

**Duration:** 2-3 hours  
**Dependencies:** Phase A complete  
**Requirements Fulfilled:** REQ-2.1, REQ-2.2, REQ-2.3

### Task B.1: Controller Wrapper Implementation

**Objective:** Create standardized wrapper for consistent request/response handling across all endpoints.

**Deliverables:**
- Controller wrapper utility in `server/utils/analytics-controller-wrapper.ts`
- Comprehensive unit tests with 90%+ coverage
- Integration with core validation services

**Subtasks:**
- [ ] Create `server/utils/analytics-controller-wrapper.ts`
- [ ] Define `ControllerWrapperOptions` interface with optional Zod schemas for body, query, params
- [ ] Define `ControllerHandler<TInput, TOutput>` type for handler functions
- [ ] Implement `controllerWrapper` function that:
  - [ ] Validates body using bodySchema if provided
  - [ ] Validates query using querySchema if provided
  - [ ] Validates params using paramsSchema if provided
  - [ ] Merges validated inputs into single input object
  - [ ] Catches ZodError and returns ApiValidationError
  - [ ] Calls handler function with merged input and request
  - [ ] Wraps successful results in ApiSuccess
  - [ ] Catches handler exceptions and translates to ApiError
  - [ ] Integrates with core validation for domain-level rules
  - [ ] Propagates request context through handler
- [ ] Create `__tests__/analytics-controller-wrapper.test.ts` with tests for:
  - [ ] Successful validation and execution
  - [ ] Body validation failure returns ApiValidationError
  - [ ] Query validation failure returns ApiValidationError
  - [ ] Params validation failure returns ApiValidationError
  - [ ] Handler exception returns ApiError
  - [ ] Input merging works correctly
  - [ ] Request context is available to handler
  - [ ] Core validation integration works
- [ ] Add TypeScript type tests to verify type safety
- [ ] Document wrapper usage with JSDoc and inline examples

**Acceptance Criteria:**
- `npm test -- analytics-controller-wrapper.test` passes with 90%+ coverage
- Type system ensures type-safe input/output
- Wrapper handles all error scenarios gracefully
- Integration with core validation works correctly

**Requirements Fulfilled:** REQ-2.1

**Verification Method:**
- Unit test suite passes with high coverage
- Type-check confirms type safety
- Manual testing of error scenarios

---

### Task B.2: Request Context Middleware

**Objective:** Implement middleware for trace ID generation and context propagation.

**Deliverables:**
- Request context middleware in `middleware/analytics-context.ts`
- Trace ID generation and propagation
- Integration tests verifying context availability

**Subtasks:**
- [ ] Create `server/features/analytics/middleware/analytics-context.ts`
- [ ] Implement trace ID generation (check for existing header first)
- [ ] Define RequestContext interface with traceId, timestamp, userId, metadata
- [ ] Implement middleware that:
  - [ ] Generates or extracts trace ID
  - [ ] Creates RequestContext object
  - [ ] Attaches context to req.analyticsContext
  - [ ] Adds trace ID to response headers
  - [ ] Calls next() to continue request processing
- [ ] Extend Express Request type to include analyticsContext
- [ ] Create tests for:
  - [ ] Trace ID generated when not present in request
  - [ ] Existing trace ID preserved when present
  - [ ] Context available to downstream handlers
  - [ ] Trace ID appears in response headers
  - [ ] Timestamp is set correctly
- [ ] Update logger to include trace ID from context automatically
- [ ] Document middleware usage and context structure

**Acceptance Criteria:**
- Trace IDs generated for all requests
- Existing trace IDs preserved from request headers
- Context available throughout request lifecycle
- Trace IDs appear in logs and response headers

**Requirements Fulfilled:** REQ-2.2

**Verification Method:**
- Unit tests pass
- Integration tests show trace ID in logs
- Manual testing confirms header propagation

---

### Task B.3: Performance Tracking Middleware

**Objective:** Implement automatic performance measurement and slow request logging.

**Deliverables:**
- Performance tracking middleware in `middleware/performance-tracking.ts`
- Metrics export for endpoint latency
- Slow request logging with configurable thresholds

**Subtasks:**
- [ ] Create `server/features/analytics/middleware/performance-tracking.ts`
- [ ] Implement middleware that:
  - [ ] Records start time when request begins
  - [ ] Calculates duration when response finishes
  - [ ] Logs slow requests exceeding threshold (configurable, default 500ms)
  - [ ] Exports latency metrics to monitoring system
  - [ ] Tags metrics with endpoint and method
  - [ ] Includes trace ID in slow request logs
- [ ] Create tests for:
  - [ ] Fast requests are not logged
  - [ ] Slow requests are logged with duration and context
  - [ ] Metrics are exported correctly
  - [ ] Multiple requests don't interfere with each other
  - [ ] Async handlers are measured correctly
- [ ] Integrate with existing performance monitoring infrastructure
- [ ] Configure thresholds in analytics configuration
- [ ] Document performance tracking behavior

**Acceptance Criteria:**
- Request duration measured accurately
- Slow requests logged at warning level with context
- Metrics exported in format compatible with monitoring system
- Minimal overhead (< 1ms per request)

**Requirements Fulfilled:** REQ-2.3

**Verification Method:**
- Unit tests pass
- Performance tests show minimal overhead
- Slow request logging verified with deliberate delays
- Metrics appear in monitoring dashboards

---

### Task B.4: Example Route Refactoring

**Objective:** Refactor 2 existing routes to demonstrate full pattern and serve as templates.

**Deliverables:**
- 2 routes refactored to use controller wrapper and middleware
- Integration tests verifying end-to-end behavior
- Documentation of refactoring pattern

**Subtasks:**
- [ ] Select `/engagement/metrics` and `/engagement/trends` endpoints for refactoring
- [ ] Create controller class if not already exists
- [ ] Define Zod schemas for request validation
- [ ] Refactor `/engagement/metrics` handler:
  - [ ] Move logic to controller method
  - [ ] Use controller wrapper with query schema
  - [ ] Call service method with validated input
  - [ ] Return domain object (wrapper handles response formatting)
- [ ] Refactor `/engagement/trends` handler with same pattern
- [ ] Apply analytics-context middleware to routes
- [ ] Apply performance-tracking middleware to routes
- [ ] Create integration tests for refactored routes:
  - [ ] Valid requests return expected data
  - [ ] Invalid requests return validation errors
  - [ ] Trace IDs appear in response headers
  - [ ] Slow requests are logged (using deliberate delay)
  - [ ] Errors are handled correctly
- [ ] Measure code reduction percentage
- [ ] Document the refactoring pattern with before/after examples
- [ ] Add inline comments explaining the pattern for future developers

**Acceptance Criteria:**
- Refactored routes reduce code by at least 60%
- All existing tests pass without modification
- Integration tests verify complete behavior
- Pattern is clearly documented with examples

**Requirements Fulfilled:** REQ-2.1, REQ-2.2, REQ-2.3

**Verification Method:**
- Code metrics show significant reduction
- Test suite passes completely
- Integration tests demonstrate end-to-end functionality
- Code review confirms pattern clarity

---

### Phase B Completion Checklist

- [ ] All Task B.1 subtasks completed and verified
- [ ] All Task B.2 subtasks completed and verified
- [ ] All Task B.3 subtasks completed and verified
- [ ] All Task B.4 subtasks completed and verified
- [ ] `npm run type-check` passes
- [ ] `npm test` passes all tests
- [ ] Integration tests pass
- [ ] Code review completed and approved
- [ ] Documentation updated with patterns
- [ ] Changes deployed to staging and verified
- [ ] Performance verified (no regression)
- [ ] Phase retrospective conducted and lessons documented

---

## Phase C: Service and Storage Relocation

**Duration:** 4-6 hours  
**Dependencies:** Phase B complete  
**Requirements Fulfilled:** REQ-3.1, REQ-3.2, REQ-3.3

### Task C.1: Service Layer Reorganization

**Objective:** Move all service classes to dedicated services folder with updated imports.

**Deliverables:**
- All services relocated to `services/` folder
- All imports updated throughout codebase
- Migration checklist documenting every change

**Subtasks:**
- [ ] Create `server/features/analytics/services/` folder
- [ ] Create `services/index.ts` for organized exports
- [ ] Move EngagementAnalyticsService:
  - [ ] Create `services/engagement.service.ts`
  - [ ] Copy EngagementAnalyticsService class to new location
  - [ ] Search codebase for imports of EngagementAnalyticsService
  - [ ] Update all imports to use new path
  - [ ] Run `npm run type-check` to verify
  - [ ] Run `npm test` to verify behavior preserved
  - [ ] Remove old file after verification
  - [ ] Update `services/index.ts` to export EngagementService
- [ ] Move ML Analysis Service:
  - [ ] Create `services/ml.service.ts`
  - [ ] Move MLAnalysisService class to new location
  - [ ] Update all imports throughout codebase
  - [ ] Verify compilation and tests
  - [ ] Update services index
- [ ] Move Financial Disclosure Service:
  - [ ] Create `services/financial-disclosure.service.ts`
  - [ ] Move service class to new location
  - [ ] Update all imports throughout codebase
  - [ ] Verify compilation and tests
  - [ ] Update services index
- [ ] Create migration checklist tracking:
  - [ ] Original file paths
  - [ ] New file paths
  - [ ] Files with updated imports
  - [ ] Verification steps completed
- [ ] Update main analytics index.ts to export from new locations
- [ ] Verify no broken imports remain (search for old paths)

**Acceptance Criteria:**
- All services located in `services/` folder
- TypeScript compilation succeeds with no errors
- All tests pass without modification
- No references to old paths remain in codebase
- Services exported through organized index

**Requirements Fulfilled:** REQ-3.1

**Verification Method:**
- `npm run type-check` passes
- `npm test` passes all tests
- Global search for old paths returns no results
- Migration checklist complete with all verifications

---

### Task C.2: Storage Layer Reorganization

**Objective:** Move all storage classes to dedicated storage folder with updated imports.

**Deliverables:**
- All storage relocated to `storage/` folder
- All imports updated throughout codebase
- Storage exports organized in index file

**Subtasks:**
- [ ] Create `server/features/analytics/storage/` folder
- [ ] Create `storage/index.ts` for organized exports
- [ ] Move Progress Storage:
  - [ ] Rename `progress-storage.ts` to `storage/progress.storage.ts`
  - [ ] Search codebase for imports of ProgressStorage
  - [ ] Update all imports to use new path
  - [ ] Run `npm run type-check` to verify
  - [ ] Run `npm test` to verify behavior preserved
  - [ ] Update `storage/index.ts` to export ProgressStorage
- [ ] Move or Create Dashboard Storage:
  - [ ] Create `storage/dashboard.storage.ts` if extracting from existing files
  - [ ] Move dashboard-related database operations
  - [ ] Update all imports throughout codebase
  - [ ] Verify compilation and tests
  - [ ] Update storage index
- [ ] Extract any other storage operations scattered in services
- [ ] Ensure all storage classes have clear interfaces
- [ ] Update services to import from new storage locations
- [ ] Add to migration checklist
- [ ] Verify no broken imports remain

**Acceptance Criteria:**
- All storage classes located in `storage/` folder
- TypeScript compilation succeeds with no errors
- All tests pass without modification
- Services only import from storage folder (no direct ORM usage in services)
- Storage exports organized through index

**Requirements Fulfilled:** REQ-3.2

**Verification Method:**
- `npm run type-check` passes
- `npm test` passes all tests
- Code review verifies storage isolation
- Migration checklist updated and complete

---

### Task C.3: Import Path Verification and Cleanup

**Objective:** Systematically verify all import paths are correct and no dead code remains.

**Deliverables:**
- Verified import paths throughout codebase
- Removed old files after successful migration
- Updated barrel exports for clean imports

**Subtasks:**
- [ ] Run global search for old import paths and verify none remain
- [ ] Search for `from '../analytics'` patterns that should now be specific
- [ ] Search for `from './engagement-analytics'` and similar old patterns
- [ ] Verify all barrel exports (index.ts files) are correct
- [ ] Test importing from barrel exports in sample code
- [ ] Remove old files that have been successfully migrated:
  - [ ] Only remove after verifying tests pass
  - [ ] Only remove after verifying no remaining imports
  - [ ] Document removal in migration checklist
- [ ] Update main analytics `index.ts` with organized exports:
  - [ ] Group routes exports
  - [ ] Group services exports
  - [ ] Group storage exports
  - [ ] Group types exports
  - [ ] Add comments explaining organization
- [ ] Verify IDE autocomplete works with new structure
- [ ] Update any imports in test files
- [ ] Run full test suite one final time

**Acceptance Criteria:**
- No old import paths remain anywhere in codebase
- All barrel exports work correctly
- Old files removed after verification
- Main index.ts provides clean, organized API
- Full test suite passes

**Requirements Fulfilled:** REQ-3.3

**Verification Method:**
- Multiple global searches for old patterns return no results
- Test suite passes completely
- Manual verification of imports in various files
- Code review confirms clean structure

---

### Phase C Completion Checklist

- [ ] All Task C.1 subtasks completed and verified
- [ ] All Task C.2 subtasks completed and verified
- [ ] All Task C.3 subtasks completed and verified
- [ ] Migration checklist complete with all file moves documented
- [ ] `npm run type-check` passes
- [ ] `npm test` passes all tests
- [ ] No old import paths remain (verified by search)
- [ ] Folder structure matches target architecture
- [ ] Code review completed and approved
- [ ] Changes deployed to staging and verified
- [ ] Phase retrospective conducted and lessons documented

---

## Phase D: Utility Standardization and Pattern Application

**Duration:** 2-3 hours  
**Dependencies:** Phase C complete  
**Requirements Fulfilled:** REQ-4.1, REQ-4.2, REQ-4.3

### Task D.1: Database Helper Implementation

**Objective:** Create standardized helpers for date calculations and result formatting.

**Deliverables:**
- Database helpers in `server/utils/db-helpers.ts`
- Comprehensive unit tests covering edge cases
- Documentation of supported formats

**Subtasks:**
- [ ] Create `server/utils/db-helpers.ts`
- [ ] Implement `buildTimeThreshold(timeframe: string): Date`:
  - [ ] Parse "Xd" format (e.g., "7d", "30d") for days
  - [ ] Parse "Xh" format (e.g., "1h", "24h") for hours
  - [ ] Parse special values ("month-start", "week-start", "year-start")
  - [ ] Handle all calculations in UTC to avoid timezone issues
  - [ ] Throw clear errors for invalid formats
  - [ ] Handle edge cases (month boundaries, leap years, DST)
- [ ] Implement `normalizeRowNumbers(rows: any[]): any[]`:
  - [ ] Convert row number formats consistently
  - [ ] Handle null values appropriately
  - [ ] Preserve all other row data unchanged
- [ ] Implement `groupByTime<T>()` helper for time-based grouping
- [ ] Create `__tests__/db-helpers.test.ts` with tests for:
  - [ ] Each supported timeframe format
  - [ ] Edge cases (month-end, leap year, DST transition)
  - [ ] Invalid format errors with clear messages
  - [ ] Special values work correctly
  - [ ] Timezone handling is correct (always UTC)
- [ ] Document each function with JSDoc including:
  - [ ] Supported formats
  - [ ] Examples of usage
  - [ ] Edge case behavior
  - [ ] Error conditions

**Acceptance Criteria:**
- All supported timeframe formats work correctly
- Edge cases are handled correctly (verified by tests)
- Invalid inputs produce clear error messages
- Functions are pure (no side effects)
- 95%+ test coverage

**Requirements Fulfilled:** REQ-4.1

**Verification Method:**
- `npm test -- db-helpers.test` passes all tests
- Coverage report shows 95%+ coverage
- Edge case tests verify correct behavior
- Documentation reviewed for clarity

---

### Task D.2: Cache Operations Standardization

**Objective:** Replace all remaining cache operations with standardized utility throughout services.

**Deliverables:**
- Comprehensive audit of cache usage
- 90%+ cache operations using `getOrSetCache`
- Verified behavior preservation

**Subtasks:**
- [ ] Audit all cache operations across services:
  - [ ] Document current implementation in each service
  - [ ] Document cache key format used
  - [ ] Document TTL value used
  - [ ] Document any special behavior (conditional caching, etc.)
  - [ ] Create audit spreadsheet tracking all cache operations
- [ ] Standardize cache operations in EngagementService:
  - [ ] Replace each cache operation with `getOrSetCache`
  - [ ] Preserve exact cache key format
  - [ ] Preserve exact TTL value
  - [ ] Add tests verifying cache keys constructed correctly
  - [ ] Verify cache behavior unchanged
- [ ] Standardize cache operations in MLService:
  - [ ] Follow same process as EngagementService
  - [ ] Verify all cache operations migrated
  - [ ] Run tests to verify behavior
- [ ] Standardize cache operations in FinancialDisclosureService:
  - [ ] Follow same process
  - [ ] Handle any unique caching patterns appropriately
- [ ] Document any operations that can't use standard pattern:
  - [ ] Explain why standard pattern doesn't fit
  - [ ] Consider if pattern should be extended
  - [ ] Keep exceptional cases minimal (< 5%)
- [ ] Add tests for cache behavior:
  - [ ] Cache hits work correctly
  - [ ] Cache misses trigger computation
  - [ ] TTL values applied correctly
  - [ ] Error handling works as expected

**Acceptance Criteria:**
- 90%+ of cache operations use `getOrSetCache`
- Cache keys and TTLs preserved exactly
- All tests pass (behavior unchanged)
- Exceptional cases documented with rationale
- Audit document complete

**Requirements Fulfilled:** REQ-4.2, REQ-4.3

**Verification Method:**
- Audit spreadsheet shows 90%+ adoption
- Tests verify behavior preservation
- Code review confirms standardization
- Cache metrics show expected hit rates

---

### Task D.3: Date Calculation Standardization

**Objective:** Replace all date calculations with standardized helpers throughout services.

**Deliverables:**
- All time thresholds use `buildTimeThreshold`
- Consistent timezone handling across all queries
- Tests verifying calculation correctness

**Subtasks:**
- [ ] Audit date calculations across all services:
  - [ ] Identify all places time thresholds are calculated
  - [ ] Identify all places date grouping occurs
  - [ ] Document current calculation methods
  - [ ] Note any edge case handling
- [ ] Replace date calculations in EngagementService:
  - [ ] Replace threshold calculations with `buildTimeThreshold`
  - [ ] Update time grouping to use helpers
  - [ ] Verify results match previous calculations
  - [ ] Add tests for edge cases
- [ ] Replace date calculations in MLService:
  - [ ] Follow same process
  - [ ] Ensure consistent timezone handling
  - [ ] Verify behavior preserved
- [ ] Replace date calculations in FinancialDisclosureService:
  - [ ] Follow same process
  - [ ] Test edge cases specific to financial data
- [ ] Update storage layer if date calculations exist there:
  - [ ] Move date logic to services if found in storage
  - [ ] Storage should receive Date objects, not calculate them
- [ ] Add comprehensive tests for date edge cases:
  - [ ] Month boundaries
  - [ ] Leap years
  - [ ] DST transitions
  - [ ] Year boundaries

**Acceptance Criteria:**
- All date threshold calculations use `buildTimeThreshold`
- Time grouping uses standardized helpers
- Timezone handling consistent (UTC throughout)
- Edge case tests pass
- Behavior preserved (verified by tests)

**Requirements Fulfilled:** REQ-4.1, REQ-4.3

**Verification Method:**
- Code search shows all calculations use helpers
- Tests verify edge cases handled correctly
- Integration tests show unchanged behavior
- Code review confirms standardization

---

### Task D.4: Logging Standardization

**Objective:** Standardize logging patterns with consistent context throughout analytics.

**Deliverables:**
- Consistent log format across all services
- Trace IDs included in all logs automatically
- Helper functions for analytics-specific logging

**Subtasks:**
- [ ] Review current logging patterns across services
- [ ] Extend logger in `server/utils/logger.ts` with analytics helpers if needed:
  - [ ] Helper to add trace ID from request context
  - [ ] Helper to add analytics component identifier
  - [ ] Helper to add operation name
  - [ ] Structured logging for consistent format
- [ ] Update EngagementService logging:
  - [ ] Replace console.log with logger calls
  - [ ] Use appropriate log levels (debug, info, warn, error)
  - [ ] Include trace IDs and operation context
  - [ ] Ensure errors include stack traces
- [ ] Update MLService logging with same patterns
- [ ] Update FinancialDisclosureService logging with same patterns
- [ ] Update storage classes if they have logging
- [ ] Verify logs appear correctly in log aggregation system
- [ ] Test log querying by trace ID
- [ ] Document logging standards for team

**Acceptance Criteria:**
- All console.log calls replaced with logger
- Log format consistent across all analytics code
- Trace IDs automatically included in logs
- Log levels used appropriately
- Logs queryable by trace ID in aggregation system

**Requirements Fulfilled:** REQ-4.2, REQ-4.3

**Verification Method:**
- Code search shows no console.log calls
- Log samples show consistent format
- Query logs by trace ID successfully
- Code review confirms standards followed

---

### Phase D Completion Checklist

- [ ] All Task D.1 subtasks completed and verified
- [ ] All Task D.2 subtasks completed and verified
- [ ] All Task D.3 subtasks completed and verified
- [ ] All Task D.4 subtasks completed and verified
- [ ] Audit documents complete for cache and date operations
- [ ] `npm run type-check` passes
- [ ] `npm test` passes all tests
- [ ] 90%+ pattern adoption verified
- [ ] Code review completed and approved
- [ ] Changes deployed to staging and verified
- [ ] Monitoring shows expected cache behavior
- [ ] Phase retrospective conducted and lessons documented

---

## Phase E: Finalization, Documentation, and Operational Readiness

**Duration:** 2-3 hours  
**Dependencies:** Phase D complete  
**Requirements Fulfilled:** REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5

### Task E.1: Comprehensive Feature Documentation

**Objective:** Create complete documentation enabling new developers to contribute effectively.

**Deliverables:**
- Comprehensive README with architecture explanation and examples
- Troubleshooting guide
- Configuration documentation

**Subtasks:**
- [ ] Create `server/features/analytics/README.md` with sections:
  - [ ] Overview of analytics feature purpose and scope
  - [ ] Architecture explanation with layer descriptions
  - [ ] Folder structure guide with visual tree
  - [ ] Integration points with core infrastructure
  - [ ] Code organization principles
- [ ] Add "Getting Started" section:
  - [ ] How to run analytics locally
  - [ ] How to run tests
  - [ ] How to view metrics and logs
- [ ] Add "Common Tasks" section with examples:
  - [ ] Adding a new endpoint (complete example with all layers)
  - [ ] Adding a new service method
  - [ ] Adding a storage operation
  - [ ] Adding a new domain type
- [ ] Add "Testing" section:
  - [ ] Testing patterns for each layer
  - [ ] How to write unit tests
  - [ ] How to write integration tests
  - [ ] Running and debugging tests
- [ ] Add "Troubleshooting" section:
  - [ ] Common issues and solutions
  - [ ] Cache miss debugging
  - [ ] Slow query debugging
  - [ ] Validation error debugging
  - [ ] Using trace IDs to follow requests
- [ ] Add "Configuration" section:
  - [ ] All configuration options documented
  - [ ] Example values for different scenarios
  - [ ] How to override in different environments
- [ ] Add "Monitoring" section:
  - [ ] Key metrics to watch
  - [ ] Dashboard locations
  - [ ] How to interpret metrics
  - [ ] Alerting setup
- [ ] Include code snippets throughout as examples
- [ ] Add diagrams showing request flow
- [ ] Review with team and incorporate feedback

**Acceptance Criteria:**
- README covers all common development tasks
- Examples are complete and runnable
- Troubleshooting guide addresses known issues
- New developers can use documentation to contribute
- Documentation reviewed and approved by team

**Requirements Fulfilled:** REQ-5.1

**Verification Method:**
- Documentation review by multiple team members
- New developer attempts to use documentation
- Feedback incorporated and validated
- Examples tested to ensure they work

---

### Task E.2: API Documentation Generation

**Objective:** Generate comprehensive API documentation from code and schemas.

**Deliverables:**
- OpenAPI/Swagger specification for all endpoints
- Request/response examples
- Error documentation

**Subtasks:**
- [ ] Set up OpenAPI documentation generation
- [ ] Document each endpoint with:
  - [ ] Path and HTTP method
  - [ ] Purpose and description
  - [ ] Request parameters (path, query, body)
  - [ ] Request examples
  - [ ] Response schema for success
  - [ ] Response examples for success
  - [ ] Error responses with status codes
  - [ ] Error examples
  - [ ] Authentication requirements
- [ ] Generate schemas from Zod where possible
- [ ] Add JSDoc comments to controllers for documentation generation
- [ ] Generate OpenAPI spec file
- [ ] Set up Swagger UI for interactive documentation
- [ ] Add examples for all endpoints
- [ ] Document rate limits and quotas
- [ ] Document pagination patterns
- [ ] Review API docs for completeness and accuracy
- [ ] Deploy API documentation to accessible location

**Acceptance Criteria:**
- All analytics endpoints documented
- Request and response schemas complete
- Examples provided for all endpoints
- Error responses documented
- OpenAPI spec validates correctly
- Interactive documentation accessible

**Requirements Fulfilled:** REQ-5.2

**Verification Method:**
- OpenAPI validator confirms spec is valid
- Manual review of generated documentation
- Test API calls using documentation examples
- Team review confirms accuracy and completeness

---

### Task E.3: Test Coverage Enhancement

**Objective:** Achieve comprehensive test coverage across all refactored code.

**Deliverables:**
- 80%+ overall code coverage
- 90%+ coverage for utilities
- Comprehensive integration tests

**Subtasks:**
- [ ] Run coverage report and identify gaps
- [ ] Add missing unit tests for utilities:
  - [ ] Cache utility edge cases
  - [ ] Database helpers edge cases
  - [ ] Controller wrapper scenarios
- [ ] Add missing unit tests for services:
  - [ ] All public methods covered
  - [ ] Error paths tested
  - [ ] Business logic edge cases
- [ ] Add missing unit tests for storage:
  - [ ] All queries covered
  - [ ] Error handling tested
  - [ ] Edge cases like empty results
- [ ] Add missing unit tests for controllers:
  - [ ] All endpoints covered
  - [ ] Validation scenarios
  - [ ] Error translation
- [ ] Add integration tests for critical workflows:
  - [ ] End-to-end request flows
  - [ ] Error propagation
  - [ ] Performance characteristics
- [ ] Add performance tests for key endpoints:
  - [ ] Latency benchmarks
  - [ ] Concurrent request handling
  - [ ] Cache effectiveness
- [ ] Configure coverage thresholds in test configuration
- [ ] Set up CI to fail if coverage drops below threshold
- [ ] Document test strategy and patterns

**Acceptance Criteria:**
- Overall coverage reaches 80%+
- Utility coverage reaches 90%+
- Critical paths have 95%+ coverage
- Coverage reports generated in CI
- CI fails if coverage drops below threshold

**Requirements Fulfilled:** REQ-5.3

**Verification Method:**
- Coverage report shows threshold met
- CI enforces coverage requirements
- Test suite runs successfully
- Code review verifies test quality

---

### Task E.4: Monitoring Dashboard Setup

**Objective:** Create operational dashboards for monitoring analytics health.

**Deliverables:**
- Dashboards showing key analytics metrics
- Alerts configured for anomalies
- Runbooks for common issues

**Subtasks:**
- [ ] Design dashboard layout showing:
  - [ ] Endpoint latency (p50, p95, p99)
  - [ ] Error rate by endpoint
  - [ ] Cache hit rate by prefix
  - [ ] Request volume over time
  - [ ] Slow request count
  - [ ] Database query performance
  - [ ] Service dependency health
- [ ] Create dashboard in monitoring system (Grafana/DataDog/CloudWatch)
- [ ] Configure metric collection:
  - [ ] Verify metrics are being exported correctly
  - [ ] Test metric queries return expected data
  - [ ] Set appropriate time ranges and aggregations
- [ ] Configure alerts:
  - [ ] Alert on error rate spike (> 5% for 5 minutes)
  - [ ] Alert on latency degradation (p95 > 1000ms for 5 minutes)
  - [ ] Alert on cache hit rate drop (< 50% for 10 minutes)
  - [ ] Alert on slow request spike (> 10 in 5 minutes)
  - [ ] Configure alert routing to appropriate channels
  - [ ] Test alerts trigger correctly
- [ ] Create runbooks for common scenarios:
  - [ ] High error rate response
  - [ ] Slow performance response
  - [ ] Cache issues response
  - [ ] Database connection issues
  - [ ] Include diagnostic steps
  - [ ] Include remediation steps
  - [ ] Include escalation criteria
- [ ] Document dashboard usage for operations team
- [ ] Train operations team on dashboards and alerts
- [ ] Schedule regular dashboard review cadence

**Acceptance Criteria:**
- Dashboards display all key metrics correctly
- Alerts trigger appropriately for anomalies
- Runbooks provide clear guidance for incidents
- Operations team trained on monitoring tools
- Alerts routing to correct channels

**Requirements Fulfilled:** REQ-5.4

**Verification Method:**
- Dashboard review shows metrics updating
- Trigger test alerts and verify delivery
- Runbooks reviewed by operations team
- Training session completed with feedback

---

### Task E.5: Code Quality Automation

**Objective:** Implement automated checks enforcing architectural boundaries and coding standards.

**Deliverables:**
- Pre-commit hooks for quality checks
- CI pipeline enforcing architecture rules
- Code review checklist

**Subtasks:**
- [ ] Create code review checklist in `CODE_REVIEW_CHECKLIST.md`:
  - [ ] General checks (tests pass, types check, no console.log)
  - [ ] Route-specific checks (thin handlers, middleware applied)
  - [ ] Controller-specific checks (wrapper used, no storage access)
  - [ ] Service-specific checks (no HTTP imports, caching used)
  - [ ] Storage-specific checks (focused methods, DTOs returned)
  - [ ] Documentation checks (JSDoc, README updated)
- [ ] Set up pre-commit hooks:
  - [ ] Run TypeScript compilation
  - [ ] Run linting (ESLint)
  - [ ] Run fast unit tests (< 5 seconds)
  - [ ] Format code (Prettier)
  - [ ] Configure to allow bypass with warning
- [ ] Create architectural boundary checks:
  - [ ] Script to detect HTTP imports in services
  - [ ] Script to detect business logic in routes
  - [ ] Script to detect ORM usage outside storage
  - [ ] Script to detect missing tests
  - [ ] Add scripts to CI pipeline
- [ ] Configure CI pipeline to:
  - [ ] Run full test suite
  - [ ] Generate coverage report
  - [ ] Fail if coverage below threshold
  - [ ] Run architectural checks
  - [ ] Fail on boundary violations
  - [ ] Generate build artifacts
- [ ] Set up complexity monitoring:
  - [ ] Track cyclomatic complexity per file
  - [ ] Alert on files exceeding thresholds
  - [ ] Track complexity trends over time
- [ ] Document automation setup:
  - [ ] How to run checks locally
  - [ ] How to bypass for emergencies
  - [ ] How to update rules
- [ ] Test all automated checks work correctly

**Acceptance Criteria:**
- Pre-commit hooks catch common issues
- CI pipeline enforces all quality gates
- Architectural violations detected automatically
- Code review checklist comprehensive
- Documentation explains automation

**Requirements Fulfilled:** REQ-5.5

**Verification Method:**
- Test hooks with intentional violations
- CI pipeline runs successfully
- Architectural checks detect test violations
- Team trained on automation tools

---

### Task E.6: Deployment and Rollout Planning

**Objective:** Prepare safe deployment strategy with rollback procedures.

**Deliverables:**
- Deployment runbook
- Rollback procedures
- Feature flag configuration
- Monitoring checklist

**Subtasks:**
- [ ] Create deployment runbook:
  - [ ] Pre-deployment checklist
  - [ ] Deployment steps for each phase
  - [ ] Post-deployment verification steps
  - [ ] Smoke tests to run after deployment
  - [ ] Metrics to monitor during rollout
- [ ] Document rollback procedures for each phase:
  - [ ] How to identify need for rollback
  - [ ] Steps to rollback each phase
  - [ ] How to verify rollback success
  - [ ] Communication plan during rollback
- [ ] Set up feature flags if using gradual rollout:
  - [ ] Configure flags for refactored endpoints
  - [ ] Set initial percentage (e.g., 10%)
  - [ ] Document flag progression plan
  - [ ] Set up flag monitoring
- [ ] Create monitoring checklist for deployment:
  - [ ] Error rate monitoring
  - [ ] Latency monitoring
  - [ ] Cache hit rate monitoring
  - [ ] Request volume monitoring
  - [ ] Database performance monitoring
  - [ ] Alert verification
- [ ] Create communication templates:
  - [ ] Deployment announcement
  - [ ] Issue notification
  - [ ] Rollback notification
  - [ ] Success announcement
- [ ] Schedule deployment windows:
  - [ ] Choose low-traffic periods
  - [ ] Ensure team availability
  - [ ] Coordinate with stakeholders
- [ ] Conduct deployment dry-run in staging
- [ ] Review deployment plan with team

**Acceptance Criteria:**
- Deployment runbook complete and tested
- Rollback procedures documented and tested
- Feature flags configured if needed
- Monitoring checklist comprehensive
- Team trained on deployment process

**Requirements Fulfilled:** All requirements (final deployment)

**Verification Method:**
- Dry-run in staging successful
- Team review of deployment plan
- Rollback procedure tested in staging
- All stakeholders briefed

---

### Phase E Completion Checklist

- [ ] All Task E.1 subtasks completed and verified
- [ ] All Task E.2 subtasks completed and verified
- [ ] All Task E.3 subtasks completed and verified
- [ ] All Task E.4 subtasks completed and verified
- [ ] All Task E.5 subtasks completed and verified
- [ ] All Task E.6 subtasks completed and verified
- [ ] README documentation complete and reviewed
- [ ] API documentation generated and accessible
- [ ] Test coverage reaches 80%+
- [ ] Monitoring dashboards operational
- [ ] Automated checks enforced in CI
- [ ] Deployment plan reviewed and approved
- [ ] `npm run type-check` passes
- [ ] `npm test` passes all tests
- [ ] Code review completed and approved
- [ ] Changes deployed to staging and verified
- [ ] Production deployment ready
- [ ] Phase retrospective conducted and lessons documented

---

## Post-Implementation Activities

### Production Deployment

**Timeline:** After Phase E completion

**Activities:**
- [ ] Execute deployment according to runbook
- [ ] Monitor metrics closely for 24-48 hours
- [ ] Address any issues immediately
- [ ] Gradually increase feature flag percentages if using gradual rollout
- [ ] Collect feedback from operations team
- [ ] Verify all acceptance criteria met in production

### Post-Deployment Monitoring

**Week 1:**
- [ ] Daily metric review
- [ ] Daily error rate analysis
- [ ] Cache performance analysis
- [ ] User feedback collection
- [ ] Issue triage and resolution

**Week 2-4:**
- [ ] Weekly metric review
- [ ] Trend analysis for key metrics
- [ ] Performance optimization opportunities
- [ ] Documentation updates based on learnings

### Success Metrics Review

**After 1 Month:**
- [ ] Measure development velocity improvement
- [ ] Measure bug rate change
- [ ] Measure time to implement new features
- [ ] Measure mean time to resolve issues
- [ ] Measure code review cycle time
- [ ] Measure developer satisfaction
- [ ] Measure operational stability
- [ ] Document benefits realized
- [ ] Present results to stakeholders

### Retrospective and Lessons Learned

**After 1 Month:**
- [ ] Conduct comprehensive retrospective
- [ ] Document what went well
- [ ] Document what could improve
- [ ] Document unexpected challenges
- [ ] Document solutions that worked
- [ ] Update refactoring playbook for future efforts
- [ ] Share learnings with broader team

---

## Risk Management

### Identified Risks and Mitigation

**Risk: Import Path Errors**
- **Mitigation:** Move files one at a time with immediate verification
- **Detection:** TypeScript compilation, automated tests
- **Response:** Rollback specific file move, fix imports, reverify

**Risk: Behavioral Regressions**
- **Mitigation:** Comprehensive test suite, integration tests
- **Detection:** Automated tests, production monitoring
- **Response:** Rollback phase, investigate, add tests for regression

**Risk: Performance Degradation**
- **Mitigation:** Performance tests, benchmarking, monitoring
- **Detection:** Latency metrics, slow request logs
- **Response:** Profile bottleneck, optimize, or rollback if severe

**Risk: Cache Invalidation**
- **Mitigation:** Preserve exact cache key formats, gradual rollout
- **Detection:** Cache hit rate monitoring
- **Response:** Fix key format, warm cache, or rollback

**Risk: Team Bandwidth**
- **Mitigation:** Incremental phases, clear task breakdown
- **Detection:** Velocity tracking, standup updates
- **Response:** Adjust timeline, redistribute work, or reduce scope

**Risk: Production Issues**
- **Mitigation:** Staging verification, gradual rollout, monitoring
- **Detection:** Error monitoring, alerts, user reports
- **Response:** Execute rollback procedure, investigate, fix, redeploy

---

## Resource Allocation

### Team Assignment

**Phase A-B:** 1 senior developer (establish patterns)
**Phase C:** 2-3 developers (parallelizable file moves)
**Phase D:** 1-2 developers (pattern application)
**Phase E:** 1 senior developer + documentation specialist

### Time Commitment

**Total Effort:** 11-18 hours development time
**Calendar Time:** 2-3 weeks (accounting for reviews, testing, deployment)
**Buffer:** 20% additional time for unexpected issues

### Support Requirements

**Code Review:** Tech lead or senior developer
**QA:** Manual testing of critical workflows
**Operations:** Dashboard setup, monitoring configuration
**Documentation:** Technical writer if available

---

## Success Criteria Summary

### Technical Success Criteria

- [ ] Zero type duplication across analytics module
- [ ] 90%+ cache operations using standard utility
- [ ] 80%+ overall test coverage
- [ ] All TypeScript compilation passes
- [ ] All tests pass
- [ ] API contract completely preserved
- [ ] Performance metrics maintained or improved
- [ ] Architectural boundaries enforced by automation

### Process Success Criteria

- [ ] All phases completed on schedule
- [ ] No production incidents caused by refactoring
- [ ] Rollback procedures tested and ready
- [ ] Team trained on new patterns
- [ ] Documentation complete and reviewed
- [ ] Monitoring operational

### Business Success Criteria

- [ ] Developer velocity increases by 30%+ (measured after 1 month)
- [ ] Bug rate decreases by 40%+ (measured after 1 month)
- [ ] New feature development time decreases by 40%+ (measured after 1 month)
- [ ] Code review cycle time decreases by 30%+ (measured after 1 month)
- [ ] Developer satisfaction improves (measured by survey)
- [ ] Operational stability maintained or improved

---

## Dependencies and Prerequisites

### Before Starting Phase A

- [ ] Current test suite passing
- [ ] No critical production issues
- [ ] Team capacity allocated
- [ ] Stakeholder approval obtained
- [ ] Backup and rollback procedures verified

### Before Starting Each Phase

- [ ] Previous phase completed and verified
- [ ] Phase retrospective completed
- [ ] Lessons learned documented
- [ ] Team ready for next phase
- [ ] No blocking production issues

### Before Production Deployment

- [ ] All phases completed
- [ ] Staging deployment successful
- [ ] Monitoring configured
- [ ] Operations team briefed
- [ ] Rollback plan ready
- [ ] Communication plan ready
- [ ] Deployment window scheduled

---

## Continuous Improvement

### Pattern Evolution

**Monthly Review:**
- Review utility usage patterns
- Identify opportunities for new utilities
- Gather developer feedback on patterns
- Update documentation with learnings

**Quarterly Review:**
- Assess architectural health
- Review metrics and trends
- Plan architecture improvements
- Update coding standards

### Documentation Maintenance

**Ongoing:**
- Update documentation with code changes
- Add examples from real implementations
- Address documentation issues reported
- Keep troubleshooting guide current

**Quarterly:**
- Comprehensive documentation review
- Update based on team feedback
- Refresh examples with current code
- Verify all links and references

### Knowledge Sharing

**During Implementation:**
- Pair programming sessions
- Code review discussions
- Pattern demonstration sessions
- Brown bag lunch talks

**After Implementation:**
- Internal tech talk on refactoring
- Blog post about lessons learned
- Update team onboarding materials
- Share patterns with other teams

---

## Conclusion

This implementation plan provides a clear, actionable roadmap for refactoring the analytics feature module. The five-phase approach balances ambition with pragmatism, delivering value incrementally while managing risk through careful verification at each step.

The detailed task breakdown with subtasks, acceptance criteria, and verification methods ensures that every team member understands exactly what needs to be done and how success will be measured. The comprehensive checklists and tracking mechanisms enable transparent progress monitoring and early issue detection.

By following this plan, the team will transform the analytics module into a well-architected system that enables faster development, reduces bugs, and provides a solid foundation for future growth. The investment in architecture today will pay dividends in velocity, quality, and team satisfaction for months and years to come.# Analytics Feature Refactoring - Implementation Plan

## Overview

This implementation plan breaks down the analytics feature refactoring into five dependency-aware phases, each delivering concrete value while maintaining system stability. Each task includes specific deliverables, clear acceptance criteria, and references to requirements being fulfilled. The plan enables incremental progress with verification at each step, ensuring that issues are caught early and rollback is straightforward if needed.

## Phase A: Foundation and Core Integration

**Duration:** 2-3 hours  
**Dependencies:** None  
**Requirements Fulfilled:** REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4

### Task A.1: Core Infrastructure Integration Analysis

**Objective:** Document how analytics will integrate with existing core infrastructure to guide all subsequent development.

**Deliverables:**
- Integration mapping document listing core utilities to be reused
- Decision matrix for feature-local vs. shared utilities
- Import path conventions documented

**Subtasks:**
- [ ] Review `server/core/errors/error-tracker.ts` and document error reporting patterns
- [ ] Review `server/core/types.ts` and identify types analytics should reuse
- [ ] Review `server/core/validation` and document validation integration points
- [ ] Review `server/utils/logger.ts` and document logging patterns
- [ ] Review `server/utils/cache.ts` and document existing cache infrastructure
- [ ] Create integration mapping document in `docs/analytics-core-integration.md`
- [ ] Document conventions for when to create feature-local vs. shared utilities

**Acceptance Criteria:**
- Integration document lists all core modules analytics will use
- Clear guidelines exist for utility placement decisions
- Document reviewed and approved by tech lead

**Verification Method:**
- Documentation review confirms completeness
- Team meeting validates integration approach

---

### Task A.2: Type System Consolidation

**Objective:** Create centralized type definitions that eliminate duplication and establish clear domain model.

**Deliverables:**
- Complete `types/` folder structure with all domain types
- Zero type duplication across analytics services
- All existing code compiles with new type imports

**Subtasks:**
- [ ] Create `server/features/analytics/types/` folder structure
- [ ] Create `types/common.ts` with shared analytics types (TimeSeriesDataPoint, DateRange, PaginationParams, PaginatedResult)
- [ ] Extract engagement types from `engagement-analytics.ts` into `types/engagement.ts` (EngagementMetrics, ActionSummary, EngagementTrend, UserEngagementProfile)
- [ ] Extract ML types from `ml-analysis.ts` into `types/ml.ts` (MLAnalysisResult, PredictionFactor, ModelPerformanceMetrics)
- [ ] Extract financial types from `financial-disclosure/analytics.ts` into `types/financial-disclosure.ts` (FinancialMetric, DisclosureAggregation, TypeBreakdown)
- [ ] Create `types/index.ts` with organized re-exports grouped by domain
- [ ] Update `engagement-analytics.ts` to import from `types/engagement`
- [ ] Update `ml-analysis.ts` to import from `types/ml`
- [ ] Update `financial-disclosure/analytics.ts` to import from `types/financial-disclosure`
- [ ] Run TypeScript compilation to verify all imports work
- [ ] Search codebase for duplicate type definitions and consolidate
- [ ] Add JSDoc comments to complex types explaining usage

**Acceptance Criteria:**
- `npm run type-check` passes with no errors
- Zero duplicate type definitions exist (verified by search)
- All type files include index exports for convenient importing
- Complex types have JSDoc documentation

**Requirements Fulfilled:** REQ-1.1

**Verification Method:**
- TypeScript compilation succeeds
- Static analysis confirms zero duplication
- Code review verifies organization and documentation

---

### Task A.3: Enhanced Cache Utility Implementation

**Objective:** Create standardized cache utility with error handling, metrics, and comprehensive tests.

**Deliverables:**
- `getOrSetCache` function in `server/utils/cache.ts`
- Comprehensive unit tests with 90%+ coverage
- Cache metrics tracking implementation
- 2-3 existing cache operations migrated to use utility

**Subtasks:**
- [ ] Implement `getOrSetCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>` in `server/utils/cache.ts`
- [ ] Add error handling for cache get failures (log but continue to computation)
- [ ] Add error handling for cache set failures (log but return computed value)
- [ ] Implement cache hit/miss metrics tracking with counters
- [ ] Add logging for cache operations at appropriate levels
- [ ] Create `__tests__/cache.test.ts` with tests for:
  - [ ] Cache hit scenario (cached value returned, computation not called)
  - [ ] Cache miss scenario (computation called, result cached)
  - [ ] Cache get failure scenario (computation proceeds despite error)
  - [ ] Cache set failure scenario (computed value returned despite error)
  - [ ] Metrics recording for hits and misses
  - [ ] TTL parameter is passed correctly to cache.set
- [ ] Identify 2-3 cache operations in `engagement-analytics.ts` to migrate
- [ ] Replace identified cache operations with `getOrSetCache` calls
- [ ] Verify cache keys and TTL values match exactly to preserve behavior
- [ ] Add integration tests for migrated cache operations
- [ ] Document cache utility usage in inline comments

**Acceptance Criteria:**
- `npm test -- cache.test` passes all tests with 90%+ coverage
- Migrated cache operations preserve exact key format and TTL
- Cache metrics are exported and queryable
- Error scenarios are handled gracefully without request failures

**Requirements Fulfilled:** REQ-1.2

**Verification Method:**
- Unit test suite passes
- Coverage report shows 90%+ coverage
- Integration tests verify behavior preservation
- Manual testing confirms error handling works

---

### Task A.4: Configuration Management Setup

**Objective:** Create validated configuration infrastructure for analytics settings.

**Deliverables:**
- Configuration file with typed settings
- Startup validation using Zod schemas
- Documentation of all configuration options

**Subtasks:**
- [ ] Create `server/features/analytics/config/analytics.config.ts`
- [ ] Define configuration interface with:
  - [ ] Cache TTL values for different data types
  - [ ] Database timeout settings
  - [ ] Feature flags for gradual rollout
  - [ ] Performance thresholds (slow request timing