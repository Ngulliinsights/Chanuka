# Chanuka Platform Centralized Architecture Implementation Plan

## Document Control

**Version**: 1.0  
**Date**: October 13, 2025  
**Status**: Active Implementation Roadmap  
**Optimized For**: GenAI Coding Agents  
**Based On**: Requirements v4.0, Design Document v1.0

## Plan Structure and Navigation

This implementation plan organizes work into five major phases that respect technical dependencies and minimize risk. Each phase builds upon the previous phase's foundation, ensuring system stability throughout the transformation. Tasks within each phase can proceed in parallel where dependencies permit, enabling efficient resource utilization.

**Phase Dependencies**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

**Progress Tracking**: Each task includes completion checkboxes and explicit acceptance criteria that GenAI agents can validate programmatically.

---

## Phase 1: Shared Infrastructure Foundation

**Phase Goal**: Establish the complete shared infrastructure layer in `shared/core/src` with full test coverage and legacy adapters for backward compatibility.

**Duration Estimate**: 3-4 weeks  
**Parallel Capacity**: High - most tasks can proceed independently  
**Risk Level**: Low - additive changes with no breaking modifications

### Task 1.1: Cache Service Implementation

**Requirements Fulfilled**: R1.1 (Cache Service Centralization)  
**Dependencies**: None - can start immediately  
**Priority**: Critical Path

**Deliverables**:
- [ ] Complete cache adapter interface in `shared/core/src/cache/base-adapter.ts`
- [ ] Memory cache adapter with LRU eviction in `shared/core/src/cache/adapters/memory-adapter.ts`
- [ ] Redis cache adapter with connection pooling in `shared/core/src/cache/adapters/redis-adapter.ts`
- [ ] Multi-tier adapter with automatic fallback in `shared/core/src/cache/adapters/multi-tier-adapter.ts`
- [ ] Single-flight cache for request deduplication in `shared/core/src/cache/single-flight-cache.ts`
- [ ] Legacy infrastructure cache adapter in `shared/core/src/cache/adapters/legacy/infrastructure-cache-adapter.ts`
- [ ] Barrel export file in `shared/core/src/cache/index.ts` exposing all public interfaces

**Subtasks**:

1. **Define Core Cache Interfaces**
   - Create TypeScript interface `CacheAdapter` with methods: get, set, delete, clear, has
   - Include generic type support: `get<T>(key: string): Promise<T | null>`
   - Define TTL parameter type: `ttl?: number` in milliseconds
   - Add metadata interface for cache statistics: hits, misses, size

2. **Implement Memory Adapter**
   - Use Map data structure for in-memory storage
   - Implement LRU eviction policy with configurable max entries (default 1000)
   - Add setTimeout-based TTL expiration with automatic cleanup
   - Include memory usage monitoring with configurable thresholds
   - Handle edge cases: undefined values, null values, expired entries

3. **Implement Redis Adapter**
   - Use ioredis library for Redis connection
   - Implement connection pooling with max 10 connections
   - Add automatic reconnection with exponential backoff (base 100ms, max 5 seconds)
   - Handle Redis command failures with circuit breaker pattern
   - Support Redis cluster mode for horizontal scaling
   - Implement serialization: JSON for objects, direct storage for primitives

4. **Implement Multi-Tier Adapter**
   - Primary tier: memory cache for hot data (last 100 accessed keys)
   - Secondary tier: Redis for distributed caching
   - Fallback logic: if Redis unavailable, use memory-only mode
   - Write-through strategy: write to both tiers simultaneously
   - Read strategy: check memory first, then Redis, update memory on Redis hit

5. **Implement Single-Flight Cache**
   - Deduplicate concurrent identical requests using Promise tracking
   - Use Map<string, Promise<T>> for in-flight request storage
   - Automatic cleanup of completed requests after 100ms
   - Handle request failures: don't cache errors, allow retry
   - Add metrics: deduplication rate, wait time distribution

6. **Create Legacy Adapter**
   - Wrap existing `server/infrastructure/cache` implementation
   - Map old method names to new interface
   - Log deprecation warnings with migration path instructions
   - Track usage metrics for migration planning
   - No functional changes to ensure compatibility

7. **Write Comprehensive Tests**
   - Unit tests for each adapter: 95%+ coverage target
   - Integration tests: memory↔Redis synchronization
   - Performance tests: 10ms p95 for memory, 50ms p95 for Redis
   - Concurrency tests: 100 simultaneous operations
   - Failure tests: Redis connection loss, memory exhaustion

**Acceptance Criteria**:
- All cache adapters pass unit tests with 95%+ coverage
- Single-flight cache reduces duplicate requests by 90%+ under concurrent load
- Legacy adapter provides drop-in replacement with deprecation warnings
- Performance benchmarks meet NFR1 constraints (10ms cache hit response time)
- Documentation includes JSDoc comments with usage examples

---

### Task 1.2: Error Handling System Implementation

**Requirements Fulfilled**: R1.2 (Error Handling Centralization)  
**Dependencies**: None  
**Priority**: Critical Path

**Deliverables**:
- [ ] Base error class hierarchy in `shared/core/src/error-handling/base-error.ts`
- [ ] Specialized error classes in `shared/core/src/error-handling/errors/enhanced-errors.ts`
- [ ] Circuit breaker implementation in `shared/core/src/error-handling/circuit-breaker.ts`
- [ ] Error middleware for Express in `shared/core/src/error-handling/middleware.ts`
- [ ] Legacy error adapter in `shared/core/src/error-handling/adapters/legacy/error-messages-adapter.ts`
- [ ] Barrel export in `shared/core/src/error-handling/index.ts`

**Subtasks**:

1. **Create Base Error Class**
   - Extend JavaScript Error class
   - Add properties: code (string), statusCode (number), context (Record<string, any>)
   - Include timestamp for error tracking
   - Implement toJSON() for serialization
   - Preserve stack traces properly

2. **Implement Specialized Errors**
   - ValidationError: extends BaseError, includes field-level errors array
   - AuthenticationError: statusCode 401, includes attempted action
   - AuthorizationError: statusCode 403, includes required permission
   - DatabaseError: statusCode 500, includes query context (sanitized)
   - ExternalServiceError: includes service name, original error, retry info
   - NotFoundError: statusCode 404, includes resource type and identifier

3. **Build Circuit Breaker**
   - States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
   - Configurable failure threshold: default 5 failures in 60 seconds
   - Reset timeout: wait 30 seconds before attempting recovery
   - Success threshold in HALF_OPEN: 2 successful requests to close circuit
   - Track metrics: failure rate, state transitions, current state duration
   - Emit events: stateChange, failureThreshold, successfulReset

4. **Create Error Middleware**
   - Catch all uncaught errors in Express request pipeline
   - Transform BaseError instances to HTTP responses
   - Handle unexpected errors: log stack trace, return generic 500 message
   - Include correlation ID in error responses
   - Sanitize sensitive data from error messages
   - Format response: `{ error: { code, message, details?, correlationId } }`

5. **Build Legacy Adapter**
   - Map old error formats to new BaseError hierarchy
   - Maintain backward compatibility with existing error handlers
   - Log deprecation warnings for old error types
   - Provide migration guide in JSDoc

6. **Write Comprehensive Tests**
   - Unit tests for each error type
   - Circuit breaker state machine tests: all transitions
   - Middleware tests: various error scenarios
   - Integration tests: error flow from service → middleware → response

**Acceptance Criteria**:
- Circuit breaker prevents cascade failures under load
- Error middleware produces consistent HTTP error responses
- All errors include correlation IDs for distributed tracing
- Sensitive data is never exposed in error messages
- Legacy adapter maintains 100% backward compatibility
- Test coverage exceeds 90% for error handling components

---

### Task 1.3: Logging Service Implementation

**Requirements Fulfilled**: R1.3 (Logging Service Centralization)  
**Dependencies**: None  
**Priority**: Critical Path

**Deliverables**:
- [ ] Core logger interface in `shared/core/src/logging/logger.ts`
- [ ] Structured JSON formatter in `shared/core/src/logging/types.ts`
- [ ] Log rotation service in `shared/core/src/logging/log-rotation.ts`
- [ ] Middleware for request logging in `shared/core/src/logging/middleware.ts`
- [ ] Legacy logger adapter in `shared/core/src/logging/adapters/legacy/fraud-detection-logger-adapter.ts`
- [ ] Barrel export in `shared/core/src/logging/index.ts`

**Subtasks**:

1. **Define Logger Interface**
   - Methods: debug, info, warn, error, fatal
   - Each method signature: `(message: string, meta?: Record<string, any>) => void`
   - Support child loggers: `child(context: Record<string, any>): Logger`
   - Include context merging for child loggers
   - Define log levels enum: DEBUG=0, INFO=1, WARN=2, ERROR=3, FATAL=4

2. **Implement Structured Logging**
   - Output format: JSON with fields: level, timestamp, message, correlationId, context
   - ISO 8601 timestamps with millisecond precision
   - Automatic correlation ID injection from async context
   - Merge metadata from child loggers
   - Support nested context objects

3. **Build Sensitive Data Redaction**
   - Regex patterns for: passwords, tokens, API keys, SSN, credit cards
   - Replace matched patterns with `[REDACTED]`
   - Apply redaction to all log metadata recursively
   - Configurable redaction patterns via environment variables
   - Preserve log structure while removing sensitive values

4. **Implement Log Rotation**
   - Daily rotation by default
   - Configurable max file size: default 100MB
   - Configurable max age: default 30 days
   - Configurable max files: default 10
   - Optional gzip compression of archived logs
   - Automatic cleanup of old logs

5. **Create Logging Middleware**
   - Log all HTTP requests: method, path, status code, duration
   - Include request ID in all logs
   - Log request body for errors (sanitized)
   - Skip logging for health check endpoints
   - Configurable log level per route

6. **Build Legacy Adapter**
   - Wrap existing logger implementations
   - Maintain console.log compatibility
   - Log migration notices
   - Provide gradual migration path

7. **Write Comprehensive Tests**
   - Unit tests for logger methods
   - Redaction tests: verify all sensitive patterns removed
   - Rotation tests: verify file management
   - Middleware tests: request/response logging
   - Performance tests: logging overhead < 1ms p95

**Acceptance Criteria**:
- All logs output structured JSON format
- Sensitive data is automatically redacted from all logs
- Log rotation maintains disk space within configured limits
- Correlation IDs enable distributed request tracing
- Legacy adapter provides backward compatibility
- Test coverage exceeds 85%

---

### Task 1.4: Validation Service Implementation

**Requirements Fulfilled**: R1.4 (Validation Service Centralization)  
**Dependencies**: None  
**Priority**: High

**Deliverables**:
- [ ] Validation schema interface in `shared/core/src/validation/types.ts`
- [ ] Common validation schemas in `shared/core/src/validation/schemas/common.ts`
- [ ] Auth validation schemas in `shared/core/src/validation/schemas/auth.ts`
- [ ] Validation middleware in `shared/core/src/validation/middleware.ts`
- [ ] Sanitization utilities in `shared/core/src/validation/sanitization.ts`
- [ ] Legacy validation adapter in `shared/core/src/validation/adapters/legacy/validation-service-adapter.ts`
- [ ] Barrel export in `shared/core/src/validation/index.ts`

**Subtasks**:

1. **Setup Zod Integration**
   - Install zod: `npm install zod`
   - Create base schema types using Zod
   - Define validation error format
   - Setup TypeScript type inference from schemas

2. **Create Common Schemas**
   - Email: RFC 5322 compliant, max 254 characters
   - Phone: E.164 format, support US and international
   - URL: validate protocol, domain, path structure
   - UUID: v4 format validation
   - Date ranges: start before end, reasonable bounds
   - Pagination: page >= 1, limit between 1-100

3. **Create Auth Schemas**
   - Login: email + password (min 8 chars)
   - Registration: email, password, confirm password match
   - Password reset: email validation
   - Token validation: JWT format

4. **Implement Validation Middleware**
   - validateBody: validate request.body against schema
   - validateQuery: validate request.query with coercion
   - validateParams: validate request.params with type conversion
   - Return 400 with field-level errors on validation failure
   - Include which fields failed and why

5. **Build Sanitization Utilities**
   - trim: remove leading/trailing whitespace
   - escape: HTML entity encoding
   - lowercase: normalize email addresses
   - maxLength: truncate with ellipsis
   - stripTags: remove HTML/XML tags
   - normalizePhone: convert to E.164 format

6. **Create Legacy Adapter**
   - Wrap old validation functions
   - Map old error formats to new structure
   - Deprecation warnings

7. **Write Comprehensive Tests**
   - Unit tests for each schema
   - Middleware integration tests
   - Sanitization tests for edge cases
   - Performance tests: validation overhead < 5ms p95

**Acceptance Criteria**:
- All validation schemas use Zod for type safety
- Validation errors include field-level details
- Sanitization prevents XSS and injection attacks
- Middleware rejects invalid requests before reaching handlers
- Legacy adapter maintains compatibility
- Test coverage exceeds 90%

---

### Task 1.5: Rate Limiting Service Implementation

**Requirements Fulfilled**: R1.5 (Rate Limiting Centralization)  
**Dependencies**: Task 1.1 (needs cache service)  
**Priority**: High

**Deliverables**:
- [ ] Rate limiting interface in `shared/core/src/rate-limiting/types.ts`
- [ ] Token bucket algorithm in `shared/core/src/rate-limiting/algorithms/token-bucket.ts`
- [ ] Memory store in `shared/core/src/rate-limiting/stores/memory-store.ts`
- [ ] Redis store in `shared/core/src/rate-limiting/stores/redis-store.ts`
- [ ] AI rate limiter in `shared/core/src/rate-limiting/ai-rate-limiter.ts`
- [ ] Rate limiting middleware in `shared/core/src/rate-limiting/middleware.ts`
- [ ] Legacy adapter in `shared/core/src/rate-limiting/adapters/legacy-store-adapter.ts`
- [ ] Barrel export in `shared/core/src/rate-limiting/index.ts`

**Subtasks**:

1. **Define Rate Limiting Interface**
   - `RateLimiter.check(key: string): Promise<{ allowed: boolean, remaining: number, resetAt: Date }>`
   - Support burst allowance: consume multiple tokens at once
   - Include rate limit info in response headers

2. **Implement Token Bucket Algorithm**
   - Refill rate: tokens per second
   - Bucket capacity: max tokens
   - Initial tokens: full bucket
   - Refill on check: calculate elapsed time, add tokens
   - Consume tokens atomically

3. **Build Memory Store**
   - Use Map for token bucket state
   - Automatic cleanup of expired buckets every 60 seconds
   - Thread-safe operations using mutex
   - Memory limit: max 10,000 buckets

4. **Build Redis Store**
   - Store bucket state in Redis hash
   - Use Redis transactions for atomic operations
   - Set TTL on buckets: auto-expire after 2x refill period
   - Handle Redis connection failures gracefully

5. **Create AI Rate Limiter**
   - Specialized rate limits for AI API calls
   - Track costs: different rates for different models
   - Cost-aware token bucket: GPT-4 costs more tokens
   - Per-user and global rate limits
   - Include retry-after calculation

6. **Implement Rate Limiting Middleware**
   - Apply rate limits by: IP, user ID, API key
   - Return 429 with Retry-After header when exceeded
   - Include rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
   - Skip rate limiting for health checks

7. **Write Comprehensive Tests**
   - Algorithm tests: token refill calculations
   - Concurrency tests: no race conditions
   - Redis failover tests
   - AI rate limiter tests: cost calculations

**Acceptance Criteria**:
- Rate limits enforce max requests per time window
- Distributed rate limiting works across multiple servers using Redis
- AI rate limiter prevents cost overruns
- 429 responses include Retry-After header
- Test coverage exceeds 85%

---

### Task 1.6: Health Check System Implementation

**Requirements Fulfilled**: R1.6 (Health Check Centralization)  
**Dependencies**: Task 1.1 (cache), Task 1.2 (error handling)  
**Priority**: Medium

**Deliverables**:
- [ ] Health checker interface in `shared/core/src/health/health-checker.ts`
- [ ] Database health check in `shared/core/src/health/checks/database-check.ts`
- [ ] Redis health check in `shared/core/src/health/checks/redis-check.ts`
- [ ] Memory health check in `shared/core/src/health/checks/memory-check.ts`
- [ ] Health check middleware in `shared/core/src/health/middleware.ts`
- [ ] Barrel export in `shared/core/src/health/index.ts`

**Subtasks**:

1. **Define Health Check Interface**
   - `HealthCheck.check(): Promise<HealthStatus>`
   - Status types: healthy, degraded, unhealthy
   - Include details: latency, error message, last check time
   - Support dependencies: mark service degraded if dependency unhealthy

2. **Implement Database Check**
   - Execute simple query: `SELECT 1`
   - Measure query latency
   - Healthy: < 100ms, Degraded: 100-500ms, Unhealthy: > 500ms or error
   - Check connection pool: warn if > 80% utilized

3. **Implement Redis Check**
   - Execute PING command
   - Measure latency
   - Healthy: < 50ms, Degraded: 50-200ms, Unhealthy: > 200ms or error
   - Check memory usage: warn if > 90%

4. **Implement Memory Check**
   - Read process.memoryUsage()
   - Calculate heap usage percentage
   - Healthy: < 70%, Degraded: 70-85%, Unhealthy: > 85%
   - Trigger garbage collection if > 80%

5. **Create Aggregator**
   - Run all health checks in parallel
   - Overall status: worst individual status
   - Include timestamps and durations
   - Cache results for 30 seconds

6. **Implement Health Endpoint**
   - GET /health returns aggregated status
   - GET /health/live returns 200 if process running
   - GET /health/ready returns 200 if ready to serve traffic
   - Include individual check details in response

7. **Write Comprehensive Tests**
   - Unit tests for each check
   - Integration tests: database connection
   - Timeout tests: checks complete within deadline

**Acceptance Criteria**:
- Health checks complete within 1 second
- Unhealthy status triggers alerts
- Kubernetes probes can use health endpoints
- Individual check failures don't crash health endpoint
- Test coverage exceeds 85%

---

## Phase 2: Database Layer Consolidation

**Phase Goal**: Centralize all database access through `shared/database` with connection pooling, schema management, and query building.

**Duration Estimate**: 2-3 weeks  
**Dependencies**: Phase 1 complete  
**Risk Level**: Medium - requires careful migration

### Task 2.1: Database Connection Pool Implementation

**Requirements Fulfilled**: R2.1 (Connection Management)  
**Dependencies**: Phase 1 complete  
**Priority**: Critical Path

**Deliverables**:
- [ ] Connection pool interface in `shared/database/connection.ts`
- [ ] Pool configuration in `shared/database/config.ts`
- [ ] Health monitoring in `shared/database/monitoring.ts`
- [ ] Transaction support in `shared/database/pool.ts`
- [ ] Example usage in `shared/database/example-usage.ts`

**Subtasks**:

1. **Setup Drizzle ORM Integration**
   - Install drizzle-orm and drizzle-kit
   - Configure PostgreSQL adapter
   - Setup connection string from environment

2. **Implement Connection Pool**
   - Use pg-pool for connection pooling
   - Configure pool size: min 5, max 20 connections
   - Connection timeout: 5 seconds
   - Idle timeout: 30 seconds
   - Validation query: SELECT 1

3. **Add Health Monitoring**
   - Track active connections
   - Monitor connection wait time
   - Log slow connections (> 1 second to acquire)
   - Alert on pool exhaustion

4. **Implement Transaction Support**
   - Begin transaction: acquire connection, BEGIN
   - Commit: COMMIT, release connection
   - Rollback: ROLLBACK, release connection
   - Automatic rollback on error
   - Nested transaction support via savepoints

5. **Create Connection Helpers**
   - withConnection: execute query with auto-release
   - withTransaction: execute multiple queries atomically
   - Retry logic: exponential backoff on connection failure

6. **Write Comprehensive Tests**
   - Pool lifecycle tests
   - Transaction tests: commit, rollback, nested
   - Connection exhaustion tests
   - Concurrent access tests

**Acceptance Criteria**:
- Connection pool maintains 5-20 active connections
- Queries acquire connections within 1 second
- Transactions provide ACID guarantees
- Failed connections retry automatically
- Test coverage exceeds 90%

---

### Task 2.2: Schema Consolidation

**Requirements Fulfilled**: R2.2 (Schema Management)  
**Dependencies**: Task 2.1  
**Priority**: Critical Path

**Deliverables**:
- [ ] Consolidated schema in `shared/schema.ts`
- [ ] Migration files in `db/migrations/`
- [ ] Schema documentation
- [ ] Type exports for all tables

**Subtasks**:

1. **Audit Existing Schemas**
   - Scan for schema definitions in: server/features/, server/infrastructure/
   - Document all tables, columns, relationships
   - Identify duplicates and inconsistencies

2. **Consolidate to shared/schema.ts**
   - Move all table definitions to single file
   - Use Drizzle schema DSL
   - Define relationships: foreignKey, references
   - Add indexes for frequently queried columns
   - Include timestamps: createdAt, updatedAt

3. **Generate TypeScript Types**
   - Run drizzle-kit generate
   - Export types for each table
   - Create union types for related tables
   - Document complex types with JSDoc

4. **Create Migration Scripts**
   - Generate initial migration from consolidated schema
   - Test migration on empty database
   - Test migration on database with existing data
   - Create rollback scripts

5. **Update All Imports**
   - Search for imports from old schema locations
   - Replace with imports from shared/schema.ts
   - Verify TypeScript compilation succeeds

6. **Write Comprehensive Tests**
   - Schema validation tests
   - Migration tests: up and down
   - Type inference tests

**Acceptance Criteria**:
- All schema definitions exist only in shared/schema.ts
- Migrations apply successfully
- All TypeScript types are exported
- No compilation errors
- Test coverage for schema validation

---

### Task 2.3: Query Builder Implementation

**Requirements Fulfilled**: R2.3 (Query Building)  
**Dependencies**: Task 2.2  
**Priority**: High

**Deliverables**:
- [ ] Query builder utilities in `shared/database/query-builder.ts`
- [ ] Parameterized query helpers
- [ ] Query performance monitoring

**Subtasks**:

1. **Create Query Builder Interface**
   - Select: columns, where, join, orderBy, limit, offset
   - Insert: values, returning
   - Update: set, where, returning
   - Delete: where, returning
   - Type-safe: infer return types from schema

2. **Implement Common Query Patterns**
   - Pagination: limit + offset helpers
   - Search: full-text search with tsvector
   - Filtering: dynamic where clause building
   - Sorting: multi-column ordering

3. **Add SQL Injection Prevention**
   - Always use parameterized queries
   - Validate identifiers (table/column names)
   - Escape special characters
   - Reject raw SQL strings

4. **Implement Query Monitoring**
   - Log slow queries (> 100ms)
   - Track query patterns
   - Identify N+1 queries
   - Alert on missing indexes

5. **Write Comprehensive Tests**
   - Query builder unit tests
   - SQL injection prevention tests
   - Performance tests

**Acceptance Criteria**:
- All queries use parameterized statements
- No SQL injection vulnerabilities
- Slow queries are logged and monitored
- Type safety enforced at compile time
- Test coverage exceeds 85%

---

## Phase 3: Server Domain Organization

**Phase Goal**: Restructure server features into domain-oriented directories with clear boundaries.

**Duration Estimate**: 4-5 weeks  
**Dependencies**: Phase 2 complete  
**Risk Level**: Medium-High - significant refactoring

### Task 3.1: Bills Domain Restructuring

**Requirements Fulfilled**: R3.1 (Bills Domain Boundaries)  
**Dependencies**: Phase 2 complete  
**Priority**: Critical Path

**Deliverables**:
- [ ] Bill service in `server/features/bills/bill-service.ts`
- [ ] Sponsor service in `server/features/bills/sponsor-service.ts`
- [ ] Bill tracking in `server/features/bills/bill-tracking.ts`
- [ ] Bills router in `server/features/bills/index.ts`

**Subtasks**:

1. **Create Bills Directory Structure**
   ```
   server/features/bills/
   ├── bill-service.ts
   ├── sponsor-service.ts
   ├── bill-tracking.ts
   ├── sponsorship-analysis.ts
   ├── index.ts (barrel exports)
   └── __tests__/
   ```

2. **Migrate Bill Service**
   - Move from server/features/bills/bills.ts
   - Refactor to use shared database layer
   - Implement interface: getBillById, searchBills, analyzeBill
   - Add caching for frequently accessed bills

3. **Migrate Sponsor Service**
   - Move from server/features/bills/sponsor-service.ts (already exists)
   - Enhance with conflict detection
   - Add financial disclosure integration
   - Implement sponsorship pattern analysis

4. **Migrate Bill Tracking**
   - Move from server/features/bills/bill-tracking.ts (already exists)
   - Integrate with notification system
   - Add real-time updates via WebSocket
   - Implement user preferences for tracking

5. **Create Public API**
   - Define clear service interfaces
   - Export only public methods
   - Keep implementation details private
   - Add JSDoc documentation

6. **Write Comprehensive Tests**
   - Unit tests for each service
   - Integration tests for workflows
   - Performance tests for search

**Acceptance Criteria**:
- All bill functionality in server/features/bills/
- Services use shared database and cache layers
- Public API is documented and typed
- No breaking changes to existing functionality
- Test coverage exceeds 85%

---

### Task 3.2: Users Domain Restructuring

**Requirements Fulfilled**: R3.2 (Users Domain Boundaries)  
**Dependencies**: Phase 2 complete  
**Priority**: High

**Deliverables**:
- [ ] User profile service in `server/features/users/user-profile.ts`
- [ ] Citizen verification in `server/features/users/citizen-verification.ts`
- [ ] Expert verification in `server/features/users/ExpertVerificationService.ts`
- [ ] User preferences in `server/features/users/user-preferences.ts`
- [ ] Users router in `server/features/users/index.ts`

**Subtasks**:

1. **Create Users Directory Structure**
   - Already exists, consolidate functionality

2. **Enhance User Profile Service**
   - Integrate with shared validation
   - Add profile photo upload
   - Implement privacy settings
   - Add audit logging for profile changes

3. **Enhance Verification Services**
   - Standardize verification workflow
   - Add document upload and validation
   - Implement approval queue
   - Add verification expiration

4. **Migrate User Preferences**
   - Consolidate preference storage
   - Add preference validation
   - Implement preference inheritance
   - Add default preferences

5. **Create Public API**
   - Define clear interfaces
   - Add authentication requirements
   - Document all endpoints

6. **Write Comprehensive Tests**
   - Verification workflow tests
   - Profile update tests
   - Preference tests

**Acceptance Criteria**:
- All user functionality consolidated
- Verification process is streamlined
- Preferences are validated and typed
- Test coverage exceeds 85%

---

### Task 3.3: Analytics Domain Restructuring

**Requirements Fulfilled**: R3.3 (Analytics Domain Boundaries)  
**Dependencies**: Phase 2 complete  
**Priority**: High

**Deliverables**:
- [ ] Engagement service in `server/features/analytics/services/engagement.service.ts`
- [ ] Financial disclosure monitoring in `server/features/analytics/financial-disclosure/monitoring.ts`
- [ ] Conflict detection in `server/features/analytics/conflict-detection.ts`
- [ ] Analytics dashboard in `server/features/analytics/dashboard.ts`

**Subtasks**:

1. **Consolidate Analytics Services**
   - Already well-organized, enhance functionality
   - Add real-time analytics
   - Implement analytics aggregation
   - Add caching for expensive queries

2. **Enhance Financial Disclosure**
   - Integrate with government data APIs
   - Add automated monitoring
   - Implement alert thresholds
   - Add visualization data preparation

3. **Enhance Conflict Detection**
   - Implement ML-based detection
   - Add confidence scoring
   - Create conflict report generation
   - Add manual review workflow

4. **Create Analytics Dashboard**
   - Aggregate key metrics
   - Add time-series data
   - Implement real-time updates
   - Add data export functionality

5. **Write Comprehensive Tests**
   - Analytics calculation tests
   - Conflict detection accuracy tests
   - Dashboard data tests

**Acceptance Criteria**:
- Analytics provide actionable insights
- Financial disclosure monitoring is automated
- Conflict detection has > 90% accuracy
- Test coverage exceeds 80%

---

### Task 3.4: Community Domain Restructuring

**Requirements Fulfilled**: R3.4 (Community Domain Boundaries)  
**Dependencies**: Phase 2 complete  
**Priority**: Medium

**Deliverables**:
- [ ] Comment service in `server/features/community/comment.ts`
- [ ] Social integration in `server/features/community/social-integration.ts`
- [ ] Community router in `server/features/community/index.ts`

**Subtasks**:

1. **Enhance Comment System**
   - Add threading support
   - Implement voting
   - Add moderation queue
   - Implement spam detection

2. **Enhance Social Integration**
   - Add share tracking
   - Implement Open Graph tags
   - Add social authentication
   - Track social engagement

3. **Create Community API**
   - Define clear interfaces
   - Add rate limiting
   - Document all endpoints

4. **Write Comprehensive Tests**
   - Comment workflow tests
   - Moderation tests
   - Social sharing tests

**Acceptance Criteria**:
- Comment system supports threading
- Social sharing tracks engagement
- Moderation prevents spam
- Test coverage exceeds 80%

---

### Task 3.5: Search Domain Restructuring

**Requirements Fulfilled**: R3.5 (Search Domain Boundaries)  
**Dependencies**: Phase 2 complete  
**Priority**: Medium

**Deliverables**:
- [ ] Search service in `server/features/search/application/SearchService.ts`
- [ ] Search indexing in `server/features/search/infrastructure/SearchIndexManager.ts`
- [ ] Search suggestions in `server/features/search/application/SearchSuggestionsService.ts`
- [ ] Search router in `server/features/search/index.ts`

**Subtasks**:

1. **Enhance Search Service**
   - Already well-organized
   - Add full-text search with tsvector
   - Implement faceted search
   - Add relevance scoring

2. **Enhance Search Indexing**
   - Add incremental indexing
   - Implement index optimization
   - Add search analytics

3. **Enhance Search Suggestions**
   - Implement autocomplete
   - Add popular searches
   - Track suggestion clicks

4. **Write Comprehensive Tests**
   - Search accuracy tests
   - Performance tests
   - Suggestion relevance tests

**Acceptance Criteria**:
- Search returns relevant results
- Indexing is fast and incremental
- Suggestions improve user experience
- Test coverage exceeds 80%

---

## Phase 4: Client Feature Organization

**Phase Goal**: Reorganize client features to mirror server domains with clear component, hook, and service boundaries.

**Duration Estimate**: 3-4 weeks  
**Dependencies**: Phase 3 complete  
**Risk Level**: Medium - UI refactoring

### Task 4.1: Client Feature Structure

**Requirements Fulfilled**: R4.1 (Client Feature Structure)  
**Dependencies**: Phase 3 complete  
**Priority**: High

**Deliverables**:
- [ ] Bills feature in `client/src/features/bills/`
- [ ] Users feature in `client/src/features/users/`
- [ ] Analytics feature in `client/src/features/analytics/`
- [ ] Community feature in `client/src/features/community/`
- [ ] Search feature in `client/src/features/search/`

**Subtasks**:

1. **Create Feature Directory Template**
   ```
   client/src/features/[domain]/
   ├── components/
   ├── hooks/
   ├── services/
   ├── types/
   └── index.ts
   ```

2. **Migrate Bills Feature**
   - Move components from client/src/components/bills/
   - Create hooks: useBills, useBillTracking
   - Create services: bill-api.ts
   - Add types: bill.types.ts

3. **Migrate Users Feature**
   - Move profile components
   - Create hooks: useProfile, usePreferences
   - Create services: user-api.ts
   - Add types: user.types.ts

4. **Migrate Analytics Feature**
   - Move analytics components
   - Create hooks: useEngagement, useConflicts
   - Create services: analytics-api.ts
   - Add types: analytics.types.ts

5. **Migrate Community Feature**
   - Move comment components
   - Create hooks: useComments, useSocial
   - Create services: community-api.ts
   - Add types: community.types.ts

6. **Migrate Search Feature**
   - Move search components
   - Create hooks: useSearch, useSuggestions
   - Create services: search-api.ts
   - Add types: search.types.ts

7. **Write Comprehensive Tests**
   - Component tests for each feature
   - Hook tests with React Testing Library
   - Integration tests for workflows

**Acceptance Criteria**:
- All features follow consistent structure
- Components are properly typed
- Hooks handle loading and error states
- Test coverage exceeds 80%

---

### Task 4.2: Shared UI Components

**Requirements Fulfilled**: R4.2 (Shared UI Components)  
**Dependencies**: Task 4.1  
**Priority**: Medium

**Deliverables**:
- [ ] Consolidated UI components in `client/src/components/ui/`
- [ ] Component documentation
- [ ] Storybook stories (optional)

**Subtasks**:

1. **Audit Existing Components**
   - Identify reusable components
   - Document component props
   - Identify duplicate components

2. **Consolidate UI Components**
   - Already well-organized in client/src/components/ui/
   - Add missing components
   - Standardize prop interfaces
   - Add consistent styling

3. **Create Component Documentation**
   - Add JSDoc comments
   - Include usage examples
   - Document accessibility features

4. **Write Comprehensive Tests**
   - Component rendering tests
   - Interaction tests
   - Accessibility tests

**Acceptance Criteria**:
- All reusable components in ui/ directory
- Components are well-documented
- Components are accessible
- Test coverage exceeds 85%

---

### Task 4.3: Client Service Layer

**Requirements Fulfilled**: R4.3 (Client Service Layer)  
**Dependencies**: Task 4.1  
**Priority**: High

**Deliverables**:
- [ ] Authenticated API client in `client/src/utils/authenticated-api.ts`
- [ ] WebSocket hooks in `client/src/hooks/useWebSocket.ts`
- [ ] API error handling

**Subtasks**:

1. **Enhance Authenticated API**
   - Already exists, improve functionality
   - Add request interceptors
   - Add response interceptors
   - Implement retry logic
   - Add request cancellation

2. **Enhance WebSocket Integration**
   - Already exists in useWebSocket.ts
   - Add reconnection logic
   - Add message queuing
   - Add connection status

3. **Improve Error Handling**
   - Standardize error responses
   - Add user-friendly messages
   - Implement error recovery
   - Add error reporting

4. **Write Comprehensive Tests**
   - API client tests
   - WebSocket tests
   - Error handling tests

**Acceptance Criteria**:
- API client handles authentication
- WebSocket reconnects automatically
- Errors are user-friendly
- Test coverage exceeds 85%

---

## Phase 5: Navigation, Security, and Polish

**Phase Goal**: Complete navigation system, enhance security, and finalize all remaining features.

**Duration Estimate**: 2-3 weeks  
**Dependencies**: Phase 4 complete  
**Risk Level**: Low - refinement phase

### Task 5.1: Navigation System Completion

**Requirements Fulfilled**: R5.1, R5.2, R5.3 (Navigation System)  
**Dependencies**: Phase 4 complete  
**Priority**: Medium

**Deliverables**:
- [ ] Enhanced navigation context
- [ ] Improved navigation components
- [ ] Navigation performance optimization

**Subtasks**:

1. **Enhance Navigation Context**
   - Already well-implemented
   - Add navigation analytics
   - Improve state persistence
   - Add breadcrumb generation

2. **Optimize Navigation Performance**
   - Implement route preloading
   - Add navigation caching
   - Optimize component rendering

3. **Complete Navigation Components**
   - Already implemented: DesktopSidebar, MobileNavigation
   - Add missing features
   - Improve accessibility
   - Add keyboard navigation

4. **Write Comprehensive Tests**
   - Navigation flow tests
   - Accessibility tests
   - Performance tests

**Acceptance Criteria**:
- Navigation is fast and responsive
- Breadcrumbs update correctly
- Mobile navigation works well
- Test coverage exceeds 80%

---

### Task 5.2: Security Enhancement

**Requirements Fulfilled**: R10 (Security Requirements)  
**Dependencies**: Phase 3 complete  
**Priority**: High

**Deliverables**:
- [ ] Enhanced authentication
- [ ] Improved authorization
- [ ] Security monitoring

**Subtasks**:

1. **Enhance Authentication**
   - Already in server/core/auth/
   - Add 2FA support
   - Improve session management
   - Add login rate limiting

2. **Enhance Authorization**
   - Implement RBAC
   - Add resource-level permissions
   - Add permission caching

3. **Implement Security Monitoring**
   - Already in server/features/security/
   - Add intrusion detection
   - Implement audit logging
   - Add security alerts

4. **Write Comprehensive Tests**
   - Authentication tests
   - Authorization tests
   - Security monitoring tests

**Acceptance Criteria**:
- Authentication is secure
- Authorization is granular
- Security events are monitored
- Test coverage exceeds 90%

---

### Task 5.3: Configuration and Deployment

**Requirements Fulfilled**: R12 (Configuration Management), R16 (Build and Deployment)  
**Dependencies**: All previous phases  
**Priority**: Critical Path

**Deliverables**:
- [ ] Environment configuration
- [ ] Build optimization
- [ ] Deployment automation

**Subtasks**:

1. **Consolidate Configuration**
   - Already in server/config/
   - Add environment validation
   - Implement feature flags
   - Add configuration documentation

2. **Optimize Build Process**
   - Improve bundle size
   - Add code splitting
   - Optimize assets
   - Add bundle analysis

3. **Automate Deployment**
   - Create deployment scripts
   - Add health checks
   - Implement blue-green deployment
   - Add rollback procedures

4. **Write Deployment Documentation**
   - Document deployment process
   - Add troubleshooting guide
   - Create runbooks

**Acceptance Criteria**:
- Configuration is validated
- Build is optimized
- Deployment is automated
- Documentation is complete

---

## Success Metrics and Validation

### Code Quality Metrics

**Test Coverage**: Minimum 80% across all modules, 90%+ for critical paths (authentication, payment processing, data validation)

**Type Safety**: Zero TypeScript errors in production build, all any types justified with JSDoc comments

**Code Duplication**: Less than 3% code duplication measured by jscpd, no duplicated business logic

**Cyclomatic Complexity**: Maximum complexity of 10 per function, maximum of 30 per file

### Performance Metrics

**API Response Time**: p95 < 200ms for all endpoints, p99 < 500ms

**Database Query Time**: p95 < 100ms, identify and optimize queries exceeding 50ms

**Cache Hit Rate**: > 80% for frequently accessed data (bills, user profiles)

**Bundle Size**: Initial load < 500KB gzipped, code splitting for routes > 100KB

### Architecture Validation

**Import Validation**: Automated script verifies all imports use shared infrastructure, no direct imports of drizzle-orm outside shared/database

**Dependency Graph**: No circular dependencies, clear layer separation (shared → server → client)

**Migration Completion**: All legacy adapters have deprecation warnings, usage metrics tracked for removal planning

**Feature Flag Coverage**: All new infrastructure behind feature flags with rollback capability

### Testing Strategy Per Phase

**Phase 1-2**: Focus on unit tests for shared infrastructure, integration tests for database layer

**Phase 3**: Integration tests for domain workflows, API endpoint tests

**Phase 4**: Component tests, user interaction tests, visual regression tests

**Phase 5**: End-to-end tests, security tests, performance tests

---

## Risk Mitigation Strategies

### Technical Risks

**Database Migration Failures**: Backup before migration, test migrations on staging, implement rollback scripts, use feature flags for gradual rollout

**Breaking Changes**: Use semantic versioning, maintain legacy adapters, deprecate gradually over 3 release cycles

**Performance Regression**: Establish performance baselines, automated performance testing in CI/CD, monitor key metrics post-deployment

**Security Vulnerabilities**: Regular security audits, automated dependency scanning, penetration testing before major releases

### Process Risks

**Scope Creep**: Strict adherence to requirements document, change requests require formal approval, track scope changes in separate backlog

**Resource Constraints**: Parallel task execution where possible, clear task dependencies, buffer time in estimates

**Testing Bottlenecks**: Automated testing from day one, continuous integration, parallel test execution

**Documentation Lag**: Document as you code, JSDoc for all public APIs, update architecture docs with each phase

---

## Post-Implementation Checklist

- [ ] All requirements (R1-R17) have corresponding completed tasks
- [ ] Test coverage exceeds minimum thresholds
- [ ] Performance benchmarks meet NFR1 constraints
- [ ] Security audit completed and issues resolved
- [ ] Documentation updated: architecture, API, deployment
- [ ] Legacy adapters identified with deprecation timeline
- [ ] Feature flags configured for rollback capability
- [ ] Monitoring dashboards created for key metrics
- [ ] Team training completed on new architecture
- [ ] Runbooks created for operational procedures

---

## Appendix: Task Dependencies Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1.1 Cache | None | 1.5, 2.1 |
| 1.2 Errors | None | 2.1, All |
| 1.3 Logging | None | All |
| 1.4 Validation | None | 3.x |
| 1.5 Rate Limiting | 1.1 | 3.x |
| 1.6 Health | 1.1, 1.2 | 5.3 |
| 2.1 Connection | Phase 1 | 2.2, 2.3 |
| 2.2 Schema | 2.1 | 2.3, 3.x |
| 2.3 Query Builder | 2.2 | 3.x |
| 3.1 Bills | Phase 2 | 4.1 |
| 3.2 Users | Phase 2 | 4.1 |
| 3.3 Analytics | Phase 2 | 4.1 |
| 3.4 Community | Phase 2 | 4.1 |
| 3.5 Search | Phase 2 | 4.1 |
| 4.1 Client Features | Phase 3 | 4.2, 4.3 |
| 4.2 Shared UI | 4.1 | 5.1 |
| 4.3 Client Services | 4.1 | 5.1 |
| 5.1 Navigation | Phase 4 | 5.3 |
| 5.2 Security | Phase 3 | 5.3 |
| 5.3 Deployment | All | None |

---

**Document Version**: 1.0  
**Last Updated**: October 13, 2025  
**Next Review**: Upon Phase 1 Completion
