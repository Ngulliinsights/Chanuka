# Tasks Document: Infrastructure-Feature Integration

## Overview

This document defines implementation tasks for systematically integrating all application features with the modernized database infrastructure through domain-specific repositories. The tasks build on Week 1's completed database access standardization.

**Week 1 Status (COMPLETE - 2026-02-27):**
- ✅ Integration score: 18% → 50% (+178%)
- ✅ 20 files migrated (Bills, Users, Sponsors, Alert Preferences, Search feature, Analysis, Constitutional Analysis, Argument Intelligence, Safeguards, Base Storage)
- ✅ 200+ methods using `readDatabase`/`withTransaction`
- ✅ Zero legacy pool imports remaining
- ✅ Modern patterns established and proven

**Current State (Starting Week 2):**
- Integration score: 50%
- Schema utilization: 35%
- Type consistency: 40%
- All features use modern database access patterns
- Ready for repository pattern implementation

**Target State:**
- Integration score: 90%+
- Schema utilization: 80%+
- Type consistency: 95%+
- All features use domain-specific repositories with business logic in domain services

**Timeline:** 14 weeks (4 phases - Week 1 complete, starting Week 2)

## Task Organization

Tasks are organized by phase, with each phase building on the previous:
- **Week 1 (COMPLETE):** Database Access Standardization ✅
- **Phase 1 (Weeks 2-3):** Repository Infrastructure (builds on Week 1 patterns)
- **Phase 2 (Weeks 4-6):** Core Entity Repositories (Bills, Users, Sponsors)
- **Phase 3 (Weeks 7-9):** Domain Services & Application Services
- **Phase 4 (Weeks 10-13):** Feature Migration (leveraging Week 1 foundation)
- **Phase 5 (Weeks 14-15):** Enforcement & Monitoring

Each task includes:
- Requirements mapping
- Design component reference
- Acceptance criteria
- Testing requirements
- Dependencies
- Time estimate

---

## Phase 1: Repository Infrastructure (Weeks 2-3)

**Objective:** Create base repository infrastructure that builds on Week 1's modern database access patterns.

**Requirements:** Requirement 1 (Repository Pattern Foundation), Requirement 5 (Type Safety), Requirement 6 (Transaction Management), Requirement 7 (Error Handling)

**Design Components:** BaseRepository, Error Type Hierarchy, Result/Maybe Types

**BUILDING ON WEEK 1:**
- Week 1 established: `readDatabase`, `withTransaction`, modern error handling, read/write separation
- Phase 1 wraps these patterns in BaseRepository infrastructure
- All repositories will use Week 1's proven patterns internally

**CRITICAL DESIGN PRINCIPLES:**
- BaseRepository provides **infrastructure only** (wraps `readDatabase`/`withTransaction`, adds caching, logging)
- BaseRepository does **NOT** enforce generic CRUD methods (no findById, findMany, create, update, delete)
- Domain-specific repositories extend BaseRepository and define their **own domain methods**
- Example: `BillRepository.findByBillNumber()`, `BillRepository.findByAffectedCounties()` - NOT generic `findById()`
- This avoids the "generic repository anti-pattern" and ensures domain-specific, meaningful interfaces

### Task 1.1: Create BaseRepository Class

**Status:** `completed`

**Description:** Implement the abstract BaseRepository class providing common infrastructure for all repositories.

**Requirements Mapping:**
- Requirement 1.2: Wrap all write operations in transactions
- Requirement 1.3: Implement retry logic for transient errors
- Requirement 1.4: Use read/write separation for query routing
- Requirement 1.6: Log all database operations with execution time
- Requirement 1.7: Throw standardized errors with context
- Requirement 1.8: Support optional caching with configurable TTL
- **NOTE:** Requirement 1.1 in requirements doc mentions generic CRUD methods, but design clarifies BaseRepository should provide infrastructure only, NOT enforce generic CRUD. Domain-specific repositories define their own methods.

**Design Reference:** Design Section "Base Repository"

**Acceptance Criteria:**
- [ ] BaseRepository provides `executeRead()` method with caching support
- [ ] BaseRepository provides `executeWrite()` method with transaction wrapping
- [ ] BaseRepository provides `executeBatchWrite()` method for batch operations
- [ ] BaseRepository does NOT enforce generic CRUD methods (findById, findMany, etc.)
- [ ] BaseRepository provides infrastructure only (transactions, caching, logging, error handling)
- [ ] Domain-specific repositories extend BaseRepository and define their own methods
- [ ] All write operations use `withTransaction()` from existing infrastructure
- [ ] Read operations route to `readDatabase`, write operations to `writeDatabase`
- [ ] Operations log execution time and status
- [ ] Errors include entity name, operation type, and context
- [ ] Caching is optional and configurable per repository
- [ ] Retry logic handles transient errors with exponential backoff

**Implementation Steps:**
1. Create `server/infrastructure/database/repository/base-repository.ts`
2. Define `RepositoryOptions` interface
3. Implement `executeRead()` that wraps `readDatabase` (from Week 1) with cache checking
4. Implement `executeWrite()` that wraps `withTransaction` (from Week 1)
5. Implement `executeBatchWrite()` that wraps `withTransaction` with extended timeout
6. Implement cache operations (getFromCache, setInCache, invalidateCache) - Redis integration
7. Implement logging helper with performance tracking (builds on Week 1's logging)
8. Add JSDoc documentation with examples showing domain-specific methods
9. **IMPORTANT:** Do NOT implement generic CRUD methods (findById, findMany, etc.) - these should be defined by domain-specific repositories
10. **LEVERAGE WEEK 1:** Use existing `readDatabase`, `withTransaction`, error handling from Week 1

**Testing Requirements:**
- Unit tests for each method (executeRead, executeWrite, executeBatchWrite)
- Property test: Write operations transaction wrapping (Property 1)
- Property test: Transient error retry (Property 2)
- Property test: Read/write routing (Property 3)
- Property test: Operation logging (Property 4)
- Property test: Error context (Property 5)
- Property test: Cache-then-database (Property 6)

**Dependencies:** None

**Time Estimate:** 3 days


### Task 1.2: Extend Error Type Hierarchy for Repositories

**Status:** `completed`

**Description:** Extend Week 1's error handling with repository-specific error types.

**Requirements Mapping:**
- Requirement 7.3: Throw validation error for constraint violations
- Requirement 7.5: Throw reference error for foreign key violations
- Requirement 7.6: Categorize errors as transient, validation, or fatal
- Requirement 7.7: Include stack traces in development
- Requirement 7.8: Sanitize error messages in production

**Design Reference:** Design Section "Error Type Hierarchy"

**BUILDING ON WEEK 1:**
- Week 1 created: `server/infrastructure/database/repository/errors.ts` with RepositoryError, TransientError, ValidationError, FatalError, ConstraintError, NotFoundError, TimeoutError
- Phase 1 extends these with repository-specific context and helpers

**Acceptance Criteria:**
- [ ] Extend existing error types with repository context
- [ ] Add helper methods for common error scenarios
- [ ] Integrate with BaseRepository error handling
- [ ] Maintain compatibility with Week 1 error handling
- [ ] Add repository-specific error codes

**Implementation Steps:**
1. Review existing `server/infrastructure/database/repository/errors.ts` from Week 1
2. Add repository-specific context fields (entityName, operation, etc.)
3. Add helper methods (isRetryable, shouldCache, etc.)
4. Add repository-specific error codes
5. Update JSDoc documentation with repository examples
6. Ensure compatibility with Week 1 error handling

**Testing Requirements:**
- Unit tests for extended error types
- Test integration with Week 1 error handling
- Test repository-specific context
- Property test: Error categorization (Property 25)
- Property test: Database constraint error handling (Property 24)

**Dependencies:** Week 1 error types (already complete)

**Time Estimate:** 0.5 days (extending existing, not creating from scratch)

### Task 1.3: Create Result and Maybe Type Utilities

**Status:** `completed`

**Description:** Implement Result<T, Error> and Maybe<T> type utilities for explicit error handling.

**Requirements Mapping:**
- Requirement 5.4: Define result types for all query operations
- Requirement 5.5: Define error types for all failure scenarios
- Requirement 5.6: Prohibit use of 'any' type

**Design Reference:** Design Section "Result Type Pattern" and "Maybe Type Pattern"

**Acceptance Criteria:**
- [ ] `Result<T, E>` type with Ok and Err variants
- [ ] `Ok<T>` class with isOk/isErr flags
- [ ] `Err<E>` class with isOk/isErr flags
- [ ] `Maybe<T>` type alias for T | null
- [ ] Type-safe pattern matching support
- [ ] No use of 'any' type

**Implementation Steps:**
1. Create `shared/core/result.ts`
2. Define `Result<T, E>` type
3. Implement `Ok<T>` class
4. Implement `Err<E>` class
5. Add helper functions (isOk, isErr, unwrap, unwrapOr)
6. Create `shared/core/maybe.ts`
7. Define `Maybe<T>` type alias
8. Add JSDoc documentation with usage examples

**Testing Requirements:**
- Unit tests for Ok and Err classes
- Unit tests for helper functions
- Test type inference
- Test pattern matching
- Property test: Round-trip property (Property 10)

**Dependencies:** None

**Time Estimate:** 1 day

### Task 1.4: Create Repository Testing Utilities

**Status:** `completed`

**Description:** Create testing utilities and generators for property-based testing of repositories.

**Requirements Mapping:**
- Requirement 11.1: Verify repositories extend BaseRepository
- Requirement 11.4: Verify repositories implement required methods
- Requirement 11.5: Verify repository types match schema definitions

**Design Reference:** Design Section "Property-Based Testing Configuration"

**Acceptance Criteria:**
- [ ] fast-check generators for common entity types
- [ ] Mock repository factory for testing services
- [ ] Test database setup/teardown utilities
- [ ] Property test helpers
- [ ] Test data builders

**Implementation Steps:**
1. Create `server/infrastructure/database/repository/test-utils.ts`
2. Install fast-check library
3. Create generators for Bill, User, Sponsor, Committee
4. Create mock repository factory
5. Create test database utilities
6. Create property test helpers
7. Add documentation with examples

**Testing Requirements:**
- Unit tests for generators
- Unit tests for mock factory
- Test database utilities work correctly

**Dependencies:** Task 1.1, Task 1.2, Task 1.3

**Time Estimate:** 2 days

### Task 1.5: Write BaseRepository Tests

**Status:** `completed`

**Description:** Write comprehensive unit and property tests for BaseRepository.

**Requirements Mapping:**
- Requirement 1.9: Repository extension produces functional repository
- Requirement 1.10: Create-read round trip returns equivalent object

**Design Reference:** Design Section "Testing Strategy"

**Acceptance Criteria:**
- [ ] Unit tests for executeRead with caching
- [ ] Unit tests for executeWrite with transactions
- [ ] Unit tests for executeBatchWrite
- [ ] Unit tests for error handling
- [ ] Unit tests for retry logic
- [ ] Property test: Write operations transaction wrapping
- [ ] Property test: Transient error retry
- [ ] Property test: Read/write routing
- [ ] Property test: Operation logging
- [ ] Property test: Error context
- [ ] Property test: Cache-then-database
- [ ] All tests pass with 100 iterations

**Implementation Steps:**
1. Create `server/infrastructure/database/repository/__tests__/base-repository.test.ts`
2. Write unit tests for each method
3. Write property tests using fast-check
4. Configure test to run 100 iterations
5. Ensure 80%+ code coverage

**Testing Requirements:**
- 80%+ code coverage
- All property tests run 100 iterations
- All tests pass

**Dependencies:** Task 1.1, Task 1.2, Task 1.3, Task 1.4

**Time Estimate:** 2 days

### Task 1.6: Document Repository Pattern

**Status:** `completed`

**Description:** Create comprehensive documentation for the repository pattern.

**Requirements Mapping:**
- Requirement 13.1: Provide examples of repository implementation
- Requirement 13.3: Document all BaseRepository methods
- Requirement 13.4: Document error types and handling strategies
- Requirement 13.10: Include architecture diagrams

**Design Reference:** Design Section "Components and Interfaces"

**Acceptance Criteria:**
- [ ] Documentation explains repository vs service separation
- [ ] Documentation shows domain-specific vs generic patterns
- [ ] Documentation includes BaseRepository API reference
- [ ] Documentation includes error handling guide
- [ ] Documentation includes code examples
- [ ] Documentation includes architecture diagrams
- [ ] Documentation includes when NOT to use repositories

**Implementation Steps:**
1. Create `docs/REPOSITORY_PATTERN.md`
2. Write overview and principles
3. Document BaseRepository API
4. Document error types
5. Add code examples
6. Add architecture diagrams
7. Document anti-patterns
8. Add version and date

**Testing Requirements:**
- Documentation reviewed and approved
- Examples compile and run

**Dependencies:** Task 1.1, Task 1.2, Task 1.3

**Time Estimate:** 1 day

**Phase 1 Total Time:** 7 days (1.4 weeks, rounded to 2 weeks with buffer)

**Note:** Phase 1 is significantly faster than originally planned because Week 1 already established:
- Modern database access patterns (`readDatabase`, `withTransaction`)
- Error type hierarchy
- Logging and monitoring infrastructure
- Proven patterns across 20 files

Phase 1 now focuses on wrapping these patterns in BaseRepository infrastructure rather than creating from scratch.

---

## Phase 2: Core Entity Repositories (Weeks 4-6)

**Objective:** Implement domain-specific repositories for core entities (bills, users, sponsors, committees).

**Requirements:** Requirement 2 (Core Entity Repositories), Requirement 4 (Schema Integration), Requirement 5 (Type Safety)

**Design Components:** Repository Interfaces, Repository Implementations

**BUILDING ON WEEK 1:**
- Week 1 migrated these features to use `readDatabase`/`withTransaction`
- Phase 2 wraps this access in domain-specific repository methods
- Example: Bills feature already uses modern patterns, now add `BillRepository.findByBillNumber()`
- No migration adapters needed - Week 1 already handled the migration


### Task 2.1: Create User Repository Interface

**Status:** `not_started`

**Description:** Define the User repository interface with domain-specific methods.

**Requirements Mapping:**
- Requirement 2.1: Provide methods for user CRUD, profile management, and authentication queries
- Requirement 2.8: Define TypeScript interfaces matching schema table structures
- Requirement 5.1: Export TypeScript interfaces for all schema tables
- Requirement 5.2: Use Drizzle ORM type inference

**Design Reference:** Design Section "Repository Interface Pattern"

**Acceptance Criteria:**
- [ ] Interface defines domain-specific query methods
- [ ] Methods return Result<T, Error> for error handling
- [ ] Uses Maybe<T> for nullable results
- [ ] Supports pagination, filtering, sorting
- [ ] Types inferred from Drizzle schema
- [ ] No generic CRUD methods (findOne, findAll)
- [ ] Includes batch operations
- [ ] Includes aggregation methods

**Implementation Steps:**
1. Create `server/features/users/domain/repositories/user.repository.interface.ts`
2. Define `IUserRepository` interface
3. Add domain-specific query methods (findByEmail, findByVerificationToken, etc.)
4. Add write operations (create, update, delete)
5. Add batch operations (createBatch, updateBatch, deleteBatch)
6. Add aggregation methods (count)
7. Define supporting types (QueryOptions, SearchOptions, etc.)
8. Add JSDoc documentation

**Testing Requirements:**
- Type checking passes
- Interface compiles without errors

**Dependencies:** Task 1.1, Task 1.3

**Time Estimate:** 1 day

### Task 2.2: Implement User Repository

**Status:** `not_started`

**Description:** Implement the User repository extending BaseRepository.

**Requirements Mapping:**
- Requirement 2.5: Use Database Orchestrator for connection management
- Requirement 2.6: Use withTransaction for write operations
- Requirement 2.7: Use readDatabase for read operations
- Requirement 2.9: Validate input data before database operations

**Design Reference:** Design Section "Repository Implementation Pattern"

**Acceptance Criteria:**
- [ ] Extends BaseRepository<User>
- [ ] Implements IUserRepository interface
- [ ] Uses Drizzle ORM for queries
- [ ] Leverages read/write separation
- [ ] Implements caching for frequently accessed data
- [ ] Validates input before database operations
- [ ] Uses proper cache keys and invalidation

**Implementation Steps:**
1. Create `server/features/users/infrastructure/repositories/user.repository.ts`
2. Implement UserRepository class extending BaseRepository
3. Implement all interface methods
4. Add input validation using Zod
5. Configure caching strategy
6. Add proper error handling
7. Add JSDoc documentation

**Testing Requirements:**
- Unit tests for each method
- Property test: Create-read round trip (Property 10)
- Property test: Create-delete idempotence (Property 13)
- Property test: Database orchestrator usage (Property 11)
- Property test: Input validation (Property 12)
- 80%+ code coverage

**Dependencies:** Task 2.1

**Time Estimate:** 3 days

### Task 2.3: Write User Repository Tests

**Status:** `not_started`

**Description:** Write comprehensive tests for User repository.

**Requirements Mapping:**
- Requirement 2.10: Create-delete operations leave database in original state
- Requirement 11.3: Verify write operations use transactions
- Requirement 11.5: Verify repository types match schema definitions

**Design Reference:** Design Section "Testing Strategy"

**Acceptance Criteria:**
- [ ] Unit tests for all methods
- [ ] Property tests run 100 iterations
- [ ] Tests verify transaction usage
- [ ] Tests verify type consistency
- [ ] Tests verify error handling
- [ ] 80%+ code coverage

**Implementation Steps:**
1. Create `server/features/users/infrastructure/repositories/__tests__/user.repository.test.ts`
2. Write unit tests for each method
3. Write property tests using fast-check
4. Test edge cases (empty inputs, null values, etc.)
5. Test error conditions
6. Ensure coverage requirements met

**Testing Requirements:**
- All tests pass
- 80%+ code coverage
- Property tests run 100 iterations

**Dependencies:** Task 2.2, Task 1.4

**Time Estimate:** 2 days

### Task 2.4: Create Bill Repository Interface

**Status:** `not_started`

**Description:** Define the Bill repository interface with domain-specific methods.

**Requirements Mapping:**
- Requirement 2.2: Provide methods for bill CRUD, status tracking, and engagement metrics
- Requirement 4.1-4.12: Integrate with relevant schema tables

**Design Reference:** Design Section "Repository Interface Pattern"

**Acceptance Criteria:**
- [ ] Interface defines domain-specific query methods
- [ ] Methods for finding by bill number, sponsor, counties, status
- [ ] Methods for updating engagement metrics
- [ ] Supports pagination and filtering
- [ ] Returns Result<T, Error>
- [ ] Uses Maybe<T> for nullable results

**Implementation Steps:**
1. Create `server/features/bills/domain/repositories/bill.repository.interface.ts`
2. Define `IBillRepository` interface
3. Add domain-specific query methods
4. Add write operations
5. Add batch operations
6. Add aggregation methods
7. Define supporting types
8. Add JSDoc documentation

**Testing Requirements:**
- Type checking passes
- Interface compiles without errors

**Dependencies:** Task 1.1, Task 1.3

**Time Estimate:** 1 day

### Task 2.5: Implement Bill Repository

**Status:** `not_started`

**Description:** Implement the Bill repository extending BaseRepository.

**Requirements Mapping:**
- Requirement 2.5-2.7: Use Database Orchestrator, transactions, read/write separation
- Requirement 4.3: Integrate with argument_intelligence schema
- Requirement 4.7: Integrate with impact_measurement schema

**Design Reference:** Design Section "Repository Implementation Pattern"

**Acceptance Criteria:**
- [ ] Extends BaseRepository<Bill>
- [ ] Implements IBillRepository interface
- [ ] Uses Drizzle ORM for type-safe queries
- [ ] Implements caching strategy
- [ ] Validates input data
- [ ] Proper error handling

**Implementation Steps:**
1. Create `server/features/bills/infrastructure/repositories/bill.repository.ts`
2. Implement BillRepository class
3. Implement all interface methods
4. Add input validation
5. Configure caching
6. Add error handling
7. Add JSDoc documentation

**Testing Requirements:**
- Unit tests for each method
- Property tests (round-trip, idempotence, etc.)
- 80%+ code coverage

**Dependencies:** Task 2.4

**Time Estimate:** 3 days

### Task 2.6: Write Bill Repository Tests

**Status:** `not_started`

**Description:** Write comprehensive tests for Bill repository.

**Requirements Mapping:**
- Requirement 11.1-11.7: Integration test requirements

**Design Reference:** Design Section "Testing Strategy"

**Acceptance Criteria:**
- [ ] Unit tests for all methods
- [ ] Property tests run 100 iterations
- [ ] Tests verify schema integration
- [ ] 80%+ code coverage

**Implementation Steps:**
1. Create `server/features/bills/infrastructure/repositories/__tests__/bill.repository.test.ts`
2. Write unit tests
3. Write property tests
4. Test edge cases
5. Test error conditions
6. Ensure coverage

**Testing Requirements:**
- All tests pass
- 80%+ code coverage
- Property tests run 100 iterations

**Dependencies:** Task 2.5, Task 1.4

**Time Estimate:** 2 days

### Task 2.7: Create Sponsor Repository Interface and Implementation

**Status:** `not_started`

**Description:** Create Sponsor repository interface and implementation.

**Requirements Mapping:**
- Requirement 2.3: Provide methods for sponsor CRUD, conflict analysis, and performance metrics

**Design Reference:** Design Section "Repository Interface Pattern" and "Repository Implementation Pattern"

**Acceptance Criteria:**
- [ ] Interface defines domain-specific methods
- [ ] Implementation extends BaseRepository
- [ ] Uses Drizzle ORM
- [ ] Implements caching
- [ ] Validates input

**Implementation Steps:**
1. Create interface at `server/features/sponsors/domain/repositories/sponsor.repository.interface.ts`
2. Create implementation at `server/features/sponsors/infrastructure/repositories/sponsor.repository.ts`
3. Implement all methods
4. Add validation and caching
5. Write tests
6. Add documentation

**Testing Requirements:**
- Unit and property tests
- 80%+ code coverage

**Dependencies:** Task 1.1, Task 1.3

**Time Estimate:** 4 days

### Task 2.8: Create Committee Repository Interface and Implementation

**Status:** `not_started`

**Description:** Create Committee repository interface and implementation.

**Requirements Mapping:**
- Requirement 2.4: Provide methods for committee CRUD, membership tracking, and bill assignments

**Design Reference:** Design Section "Repository Interface Pattern" and "Repository Implementation Pattern"

**Acceptance Criteria:**
- [ ] Interface defines domain-specific methods
- [ ] Implementation extends BaseRepository
- [ ] Uses Drizzle ORM
- [ ] Implements caching
- [ ] Validates input

**Implementation Steps:**
1. Create interface at `server/features/committees/domain/repositories/committee.repository.interface.ts`
2. Create implementation at `server/features/committees/infrastructure/repositories/committee.repository.ts`
3. Implement all methods
4. Add validation and caching
5. Write tests
6. Add documentation

**Testing Requirements:**
- Unit and property tests
- 80%+ code coverage

**Dependencies:** Task 1.1, Task 1.3

**Time Estimate:** 4 days

**Phase 2 Total Time:** 20 days (4 weeks)

---

## Phase 3: Domain Services (Weeks 6-8)

**Objective:** Create domain services that consume repositories through dependency injection.

**Requirements:** Requirement 3 (Feature Module Migration), Requirement 15 (Cross-Feature Integration)

**Design Components:** Domain Services, Application Services, Factory Functions


### Task 3.1: Create Bill Domain Service

**Status:** `not_started`

**Description:** Implement Bill domain service with business logic consuming repositories through dependency injection.

**Requirements Mapping:**
- Requirement 3.1: Replace direct schema imports with repository imports
- Requirement 3.4: Implement proper error handling using repository error types
- Requirement 15.1-15.3: Integrate with argument_intelligence, constitutional_intelligence, impact_measurement

**Design Reference:** Design Section "Domain Service Pattern"

**Acceptance Criteria:**
- [ ] Consumes IBillRepository through constructor injection
- [ ] Consumes ISponsorRepository through constructor injection
- [ ] Implements business logic (validation, scoring, etc.)
- [ ] NO direct database access
- [ ] Returns Result<T, Error>
- [ ] Orchestrates multiple repository calls
- [ ] Handles domain events

**Implementation Steps:**
1. Create `server/features/bills/domain/services/bill-domain.service.ts`
2. Define BillDomainService class with injected repositories
3. Implement createBill with validation
4. Implement updateEngagement with business rules
5. Implement calculateEngagementScore
6. Implement calculateControversyScore
7. Add error handling
8. Add JSDoc documentation

**Testing Requirements:**
- Unit tests with mock repositories
- Test business logic independently
- Test error handling
- 80%+ code coverage

**Dependencies:** Task 2.5, Task 2.7

**Time Estimate:** 3 days

### Task 3.2: Create Bill Factory Function

**Status:** `not_started`

**Description:** Create factory function for Bill services with dependency injection.

**Requirements Mapping:**
- Requirement 3.1: Replace direct instantiation with dependency injection
- Requirement 15.7: Share repositories instead of duplicating data access logic

**Design Reference:** Design Section "Dependency Injection Pattern"

**Acceptance Criteria:**
- [ ] Factory function creates all bill services
- [ ] Repositories injected as dependencies
- [ ] Services depend on interfaces, not concrete classes
- [ ] Single source of truth for dependency wiring
- [ ] Enables testing with mock repositories

**Implementation Steps:**
1. Create `server/features/bills/bill-factory.ts`
2. Implement createBillServices function
3. Create repository instances
4. Create domain service with injected repositories
5. Create application service with injected domain services
6. Export singleton instance
7. Add JSDoc documentation

**Testing Requirements:**
- Unit tests for factory function
- Test dependency wiring
- Test singleton behavior

**Dependencies:** Task 3.1

**Time Estimate:** 1 day

### Task 3.3: Write Bill Domain Service Tests

**Status:** `not_started`

**Description:** Write comprehensive tests for Bill domain service using mock repositories.

**Requirements Mapping:**
- Requirement 11.6: Verify features use repositories instead of direct schema access
- Requirement 11.7: Verify error handling follows standardized patterns

**Design Reference:** Design Section "Testing Strategy"

**Acceptance Criteria:**
- [ ] Unit tests with mock repositories
- [ ] Tests verify business logic
- [ ] Tests verify error handling
- [ ] Tests verify repository usage
- [ ] 80%+ code coverage

**Implementation Steps:**
1. Create `server/features/bills/domain/services/__tests__/bill-domain.service.test.ts`
2. Create mock repositories
3. Write unit tests for each method
4. Test business logic calculations
5. Test error scenarios
6. Ensure coverage

**Testing Requirements:**
- All tests pass
- 80%+ code coverage
- Mock repositories used correctly

**Dependencies:** Task 3.1, Task 1.4

**Time Estimate:** 2 days

### Task 3.4: Create User Domain Service

**Status:** `not_started`

**Description:** Implement User domain service with authentication and profile management logic.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 15.4: Integrate with other features

**Design Reference:** Design Section "Domain Service Pattern"

**Acceptance Criteria:**
- [ ] Consumes IUserRepository through constructor injection
- [ ] Implements authentication logic
- [ ] Implements profile management logic
- [ ] NO direct database access
- [ ] Returns Result<T, Error>

**Implementation Steps:**
1. Create `server/features/users/domain/services/user-domain.service.ts`
2. Define UserDomainService class
3. Implement authentication methods
4. Implement profile management methods
5. Add validation and business rules
6. Add error handling
7. Add JSDoc documentation

**Testing Requirements:**
- Unit tests with mock repositories
- 80%+ code coverage

**Dependencies:** Task 2.2

**Time Estimate:** 3 days

### Task 3.5: Create User Factory Function

**Status:** `not_started`

**Description:** Create factory function for User services with dependency injection.

**Requirements Mapping:**
- Requirement 3.1: Dependency injection pattern

**Design Reference:** Design Section "Dependency Injection Pattern"

**Acceptance Criteria:**
- [ ] Factory function creates all user services
- [ ] Repositories injected as dependencies
- [ ] Enables testing with mocks

**Implementation Steps:**
1. Create `server/features/users/user-factory.ts`
2. Implement createUserServices function
3. Wire dependencies
4. Export singleton
5. Add documentation

**Testing Requirements:**
- Unit tests for factory
- Test dependency wiring

**Dependencies:** Task 3.4

**Time Estimate:** 1 day

### Task 3.6: Write User Domain Service Tests

**Status:** `not_started`

**Description:** Write comprehensive tests for User domain service.

**Requirements Mapping:**
- Requirement 11.6-11.7: Integration test requirements

**Design Reference:** Design Section "Testing Strategy"

**Acceptance Criteria:**
- [ ] Unit tests with mock repositories
- [ ] Tests verify business logic
- [ ] 80%+ code coverage

**Implementation Steps:**
1. Create test file
2. Create mock repositories
3. Write unit tests
4. Test error scenarios
5. Ensure coverage

**Testing Requirements:**
- All tests pass
- 80%+ code coverage

**Dependencies:** Task 3.4, Task 1.4

**Time Estimate:** 2 days

### Task 3.7: Create Sponsor and Committee Domain Services

**Status:** `not_started`

**Description:** Create domain services for Sponsor and Committee features.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements

**Design Reference:** Design Section "Domain Service Pattern"

**Acceptance Criteria:**
- [ ] Both services consume repositories through DI
- [ ] Implement business logic
- [ ] NO direct database access
- [ ] Return Result<T, Error>

**Implementation Steps:**
1. Create SponsorDomainService
2. Create CommitteeDomainService
3. Create factory functions
4. Write tests
5. Add documentation

**Testing Requirements:**
- Unit tests with mock repositories
- 80%+ code coverage

**Dependencies:** Task 2.7, Task 2.8

**Time Estimate:** 5 days

### Task 3.8: Create Notification Domain Service

**Status:** `not_started`

**Description:** Create domain service for Notification feature (already well-integrated).

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements

**Design Reference:** Design Section "Domain Service Pattern"

**Acceptance Criteria:**
- [ ] Consumes repositories through DI
- [ ] Implements notification logic
- [ ] Returns Result<T, Error>

**Implementation Steps:**
1. Create NotificationDomainService
2. Create factory function
3. Write tests
4. Add documentation

**Testing Requirements:**
- Unit tests with mock repositories
- 80%+ code coverage

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

**Phase 3 Total Time:** 20 days (4 weeks)

---

## Phase 4: Feature Migration (Weeks 9-14)

**Objective:** Migrate features from legacy patterns to repository-based access.

**Requirements:** Requirement 3 (Feature Module Migration), Requirement 4 (Schema Integration), Requirement 10 (Linting and Enforcement)

**Design Components:** Feature Migration Process, Integration Tests

**IMPORTANT MIGRATION GUIDANCE:**
- **NOT every table needs a repository** - use repositories for core domain entities with complex business logic
- **Simple read-only queries** can use query services directly (e.g., analytics, reporting)
- **One-off migrations** can use direct database access
- **Analytics/reporting** should use specialized query services, not repositories
- Focus repository creation on: core entities, entities with caching needs, entities with multiple access patterns, entities shared across features

### Task 4.1: Migrate Bills Feature (High Priority)

**Status:** `not_started`

**Description:** Migrate Bills feature to use repositories and domain services.

**Requirements Mapping:**
- Requirement 3.1: Replace direct schema imports with repository imports
- Requirement 3.2: Replace direct pool access with repository methods
- Requirement 3.3: Remove duplicate type definitions
- Requirement 3.4: Implement proper error handling
- Requirement 3.10: Integration score increases by 50+ percentage points

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] All direct schema imports removed
- [ ] All direct pool access removed
- [ ] Uses BillDomainService for business logic
- [ ] Uses Result<T, Error> for error handling
- [ ] Integration tests pass
- [ ] Integration score increases by 50+ points
- [ ] Documentation updated

**Implementation Steps:**
1. Audit current bills feature data access patterns
2. Identify all files with direct schema/pool access
3. Update presentation layer to use application services
4. Update application layer to use domain services
5. Remove direct database access
6. Update error handling
7. Write/update integration tests
8. Update documentation
9. Code review
10. Deploy with feature flag
11. Monitor metrics
12. Remove feature flag after validation

**Testing Requirements:**
- All existing tests pass
- New integration tests pass
- Integration score measured and validated
- No direct schema/pool imports remain

**Dependencies:** Task 3.1, Task 3.2

**Time Estimate:** 5 days


### Task 4.2: Migrate Users Feature (High Priority)

**Status:** `not_started`

**Description:** Migrate Users feature to use repositories and domain services.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 3.10: Integration score improvement

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] All direct schema imports removed
- [ ] All direct pool access removed
- [ ] Uses UserDomainService
- [ ] Uses Result<T, Error>
- [ ] Integration tests pass
- [ ] Integration score increases by 50+ points

**Implementation Steps:**
1. Audit users feature
2. Update to use domain services
3. Remove direct database access
4. Update error handling
5. Write integration tests
6. Update documentation
7. Deploy with feature flag
8. Monitor and validate

**Testing Requirements:**
- All tests pass
- Integration score validated
- No legacy patterns remain

**Dependencies:** Task 3.4, Task 3.5

**Time Estimate:** 5 days

### Task 4.3: Migrate Notifications Feature (High Priority)

**Status:** `not_started`

**Description:** Migrate Notifications feature (already well-integrated, good example).

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses NotificationDomainService
- [ ] Follows modern patterns
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit notifications feature
2. Update to use domain services
3. Ensure consistency with patterns
4. Write integration tests
5. Update documentation

**Testing Requirements:**
- All tests pass
- Pattern compliance verified

**Dependencies:** Task 3.8

**Time Estimate:** 3 days

### Task 4.4: Migrate Search Feature (High Priority)

**Status:** `not_started`

**Description:** Migrate Search feature to use repositories and integrate with search_system schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.8: Use search_system schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses search_system schema
- [ ] Uses repositories
- [ ] Integration tests pass
- [ ] Integration score increases by 50+ points

**Implementation Steps:**
1. Audit search feature
2. Create search repository if needed
3. Update to use repositories
4. Integrate with search_system schema
5. Write integration tests
6. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 4 days

### Task 4.5: Migrate Sponsors Feature (Medium Priority)

**Status:** `not_started`

**Description:** Migrate Sponsors feature to use repositories and domain services.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses SponsorDomainService
- [ ] Integration tests pass
- [ ] Integration score increases by 50+ points

**Implementation Steps:**
1. Audit sponsors feature
2. Update to use domain services
3. Write integration tests
4. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Integration score validated

**Dependencies:** Task 3.7

**Time Estimate:** 4 days

### Task 4.6: Migrate Community Feature (Medium Priority)

**Status:** `not_started`

**Description:** Migrate Community feature to use citizen_participation schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.1: Use citizen_participation schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses citizen_participation schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit community feature
2. Create repository for citizen_participation
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 4 days

### Task 4.7: Migrate Analytics Feature (Medium Priority)

**Status:** `not_started`

**Description:** Migrate Analytics feature to use impact_measurement schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.7: Use impact_measurement schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses impact_measurement schema
- [ ] Uses repositories or query services
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit analytics feature
2. Determine if repository or query service needed
3. Update to use appropriate pattern
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 4 days

### Task 4.8: Migrate Safeguards Feature (Medium Priority)

**Status:** `not_started`

**Description:** Migrate Safeguards feature to fully use safeguards schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses all safeguards schema tables
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit safeguards feature
2. Create repositories for missing tables
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 4 days

### Task 4.9: Migrate Advocacy Feature (Low Priority)

**Status:** `not_started`

**Description:** Migrate Advocacy feature to use advocacy_coordination schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.4: Use advocacy_coordination schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses advocacy_coordination schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit advocacy feature
2. Create repository for advocacy_coordination
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

### Task 4.10: Migrate Constitutional Analysis Feature (Low Priority)

**Status:** `not_started`

**Description:** Migrate Constitutional Analysis feature to use constitutional_intelligence schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.2: Use constitutional_intelligence schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses constitutional_intelligence schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit constitutional analysis feature
2. Create repository for constitutional_intelligence
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

### Task 4.11: Migrate Argument Intelligence Feature (Low Priority)

**Status:** `not_started`

**Description:** Migrate Argument Intelligence feature to use argument_intelligence schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.3: Use argument_intelligence schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses argument_intelligence schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit argument intelligence feature
2. Create repository for argument_intelligence
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

### Task 4.12: Migrate Market Feature (Low Priority)

**Status:** `not_started`

**Description:** Migrate Market feature to use market_intelligence schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.9: Use market_intelligence schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses market_intelligence schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit market feature
2. Create repository for market_intelligence
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

### Task 4.13: Migrate Accountability Feature (Low Priority)

**Status:** `not_started`

**Description:** Migrate Accountability feature to use accountability_ledger schema.

**Requirements Mapping:**
- Requirement 3.1-3.4: Migration requirements
- Requirement 4.10: Use accountability_ledger schema tables

**Design Reference:** Design Section "Migration Strategy - Phase 4"

**Acceptance Criteria:**
- [ ] Uses accountability_ledger schema
- [ ] Uses repositories
- [ ] Integration tests pass

**Implementation Steps:**
1. Audit accountability feature
2. Create repository for accountability_ledger
3. Update to use repositories
4. Write integration tests
5. Deploy with feature flag

**Testing Requirements:**
- All tests pass
- Schema integration verified

**Dependencies:** Phase 2 repositories

**Time Estimate:** 3 days

**Phase 4 Total Time:** 48 days (9.6 weeks, rounded to 10 weeks for buffer)

---

## Phase 5: Enforcement & Monitoring (Weeks 15-16)

**Objective:** Establish linting rules and monitoring to prevent regression.

**Requirements:** Requirement 10 (Linting and Enforcement), Requirement 11 (Integration Testing), Requirement 12 (Monitoring and Metrics)

**Design Components:** ESLint Rules, Monitoring Dashboard, CI/CD Integration


### Task 5.1: Create ESLint Rule - No Direct Pool Imports

**Status:** `not_started`

**Description:** Create ESLint rule prohibiting direct imports from infrastructure/database/pool.

**Requirements Mapping:**
- Requirement 10.1: Prohibit imports from 'infrastructure/database/pool'
- Requirement 10.7: Display error with correction guidance

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Rule detects direct pool imports
- [ ] Rule provides helpful error message
- [ ] Rule suggests using Database Orchestrator
- [ ] Rule can be configured in .eslintrc.js

**Implementation Steps:**
1. Create custom ESLint rule at `.eslint/rules/no-direct-pool-import.js`
2. Implement rule logic to detect pool imports
3. Add helpful error message
4. Add auto-fix capability if possible
5. Add rule to .eslintrc.js
6. Test rule on codebase
7. Document rule

**Testing Requirements:**
- Rule detects violations
- Error message is clear
- Auto-fix works correctly

**Dependencies:** None

**Time Estimate:** 1 day

### Task 5.2: Create ESLint Rule - No Direct Schema Imports in Features

**Status:** `not_started`

**Description:** Create ESLint rule prohibiting direct schema imports in feature modules.

**Requirements Mapping:**
- Requirement 10.2: Prohibit direct imports from 'infrastructure/schema' in feature modules
- Requirement 10.7: Display error with correction guidance

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Rule detects direct schema imports in features
- [ ] Rule allows schema imports in repositories
- [ ] Rule provides helpful error message
- [ ] Rule suggests using repositories

**Implementation Steps:**
1. Create custom ESLint rule at `.eslint/rules/no-direct-schema-import.js`
2. Implement rule logic with path checking
3. Add helpful error message
4. Add auto-fix capability if possible
5. Add rule to .eslintrc.js
6. Test rule
7. Document rule

**Testing Requirements:**
- Rule detects violations in features
- Rule allows imports in repositories
- Error message is clear

**Dependencies:** None

**Time Estimate:** 1 day

### Task 5.3: Create ESLint Rule - Require Repository Imports

**Status:** `not_started`

**Description:** Create ESLint rule requiring repository imports for database access.

**Requirements Mapping:**
- Requirement 10.3: Require repository imports for database access

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Rule detects missing repository imports
- [ ] Rule provides helpful guidance
- [ ] Rule can be configured

**Implementation Steps:**
1. Create custom ESLint rule
2. Implement detection logic
3. Add error message
4. Add to .eslintrc.js
5. Test rule
6. Document rule

**Testing Requirements:**
- Rule detects violations
- Error message is helpful

**Dependencies:** None

**Time Estimate:** 1 day

### Task 5.4: Create ESLint Rule - No Any Type for Database Operations

**Status:** `not_started`

**Description:** Create ESLint rule prohibiting 'any' type for database operations.

**Requirements Mapping:**
- Requirement 10.4: Prohibit use of 'any' type for database operations
- Requirement 5.6: Prohibit use of 'any' type

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Rule detects 'any' type in database operations
- [ ] Rule provides type suggestions
- [ ] Rule can be configured

**Implementation Steps:**
1. Create custom ESLint rule
2. Implement detection logic
3. Add error message with type suggestions
4. Add to .eslintrc.js
5. Test rule
6. Document rule

**Testing Requirements:**
- Rule detects 'any' type violations
- Suggestions are helpful

**Dependencies:** None

**Time Estimate:** 1 day

### Task 5.5: Configure Pre-commit Hooks

**Status:** `not_started`

**Description:** Configure pre-commit hooks to run linting rules automatically.

**Requirements Mapping:**
- Requirement 10.8: Run automatically on pre-commit hooks

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Pre-commit hook runs ESLint
- [ ] Hook prevents commits with violations
- [ ] Hook provides clear feedback
- [ ] Hook can be bypassed in emergencies

**Implementation Steps:**
1. Update .husky/pre-commit
2. Add ESLint check
3. Configure to fail on violations
4. Add bypass mechanism
5. Test hook
6. Document usage

**Testing Requirements:**
- Hook runs on commit
- Hook prevents violations
- Bypass works

**Dependencies:** Task 5.1, Task 5.2, Task 5.3, Task 5.4

**Time Estimate:** 0.5 days

### Task 5.6: Configure CI/CD Pipeline Checks

**Status:** `not_started`

**Description:** Configure CI/CD pipeline to run linting rules and fail builds on violations.

**Requirements Mapping:**
- Requirement 10.9: Run in CI/CD pipeline and fail builds on violations

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] CI/CD runs ESLint
- [ ] Build fails on violations
- [ ] Clear error reporting
- [ ] Integration with PR checks

**Implementation Steps:**
1. Update CI/CD configuration
2. Add ESLint step
3. Configure to fail build on violations
4. Add reporting
5. Test pipeline
6. Document process

**Testing Requirements:**
- Pipeline runs ESLint
- Build fails on violations
- Reports are clear

**Dependencies:** Task 5.1, Task 5.2, Task 5.3, Task 5.4

**Time Estimate:** 0.5 days

### Task 5.7: Document Linting Rules

**Status:** `not_started`

**Description:** Create comprehensive documentation for all linting rules.

**Requirements Mapping:**
- Requirement 13.8: Document linting rules and how to fix violations

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Documentation explains each rule
- [ ] Documentation shows examples of violations
- [ ] Documentation shows how to fix violations
- [ ] Documentation includes auto-fix instructions

**Implementation Steps:**
1. Create `docs/LINTING_RULES.md`
2. Document each rule
3. Add violation examples
4. Add fix examples
5. Add auto-fix instructions
6. Add version and date

**Testing Requirements:**
- Documentation is clear and complete
- Examples are accurate

**Dependencies:** Task 5.1, Task 5.2, Task 5.3, Task 5.4

**Time Estimate:** 1 day

### Task 5.8: Create Integration Score Calculator

**Status:** `not_started`

**Description:** Create tool to calculate integration score for each feature.

**Requirements Mapping:**
- Requirement 11.8: Measure and report integration score for each feature
- Requirement 12.6: Track integration score for each feature

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Calculator analyzes feature code
- [ ] Calculator measures modern pattern usage
- [ ] Calculator measures schema utilization
- [ ] Calculator produces score 0-100
- [ ] Calculator can run on demand or automatically

**Implementation Steps:**
1. Create `server/infrastructure/monitoring/integration-score-calculator.ts`
2. Implement code analysis logic
3. Implement scoring algorithm
4. Add CLI interface
5. Add automated scheduling
6. Test calculator
7. Document usage

**Testing Requirements:**
- Calculator produces accurate scores
- CLI works correctly
- Automated runs work

**Dependencies:** None

**Time Estimate:** 2 days

### Task 5.9: Create Schema Utilization Tracker

**Status:** `not_started`

**Description:** Create tool to track schema table utilization.

**Requirements Mapping:**
- Requirement 11.9: Measure and report schema utilization percentage
- Requirement 12.7: Track schema utilization percentage

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Tracker identifies all schema tables
- [ ] Tracker identifies which features use each table
- [ ] Tracker calculates utilization percentage
- [ ] Tracker produces report

**Implementation Steps:**
1. Create `server/infrastructure/monitoring/schema-utilization-tracker.ts`
2. Implement schema analysis
3. Implement feature analysis
4. Implement utilization calculation
5. Add reporting
6. Test tracker
7. Document usage

**Testing Requirements:**
- Tracker produces accurate reports
- Utilization calculation is correct

**Dependencies:** None

**Time Estimate:** 2 days

### Task 5.10: Create Query Performance Monitor

**Status:** `not_started`

**Description:** Create monitoring for query execution time and performance.

**Requirements Mapping:**
- Requirement 12.1: Track query execution time for all repository operations
- Requirement 12.8: Log slow query warning when execution time exceeds 1000ms

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Monitor tracks all repository queries
- [ ] Monitor measures execution time
- [ ] Monitor logs slow queries
- [ ] Monitor exposes metrics

**Implementation Steps:**
1. Create `server/infrastructure/monitoring/query-performance-monitor.ts`
2. Implement query tracking
3. Implement execution time measurement
4. Implement slow query logging
5. Implement metrics exposure
6. Test monitor
7. Document usage

**Testing Requirements:**
- Monitor tracks queries correctly
- Slow query logging works
- Metrics are accurate

**Dependencies:** Task 1.1

**Time Estimate:** 2 days

### Task 5.11: Create Cache Hit Rate Monitor

**Status:** `not_started`

**Description:** Create monitoring for cache hit and miss rates.

**Requirements Mapping:**
- Requirement 12.3: Track cache hit and miss rates
- Requirement 8.7: Track cache hit rate and miss rate

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Monitor tracks cache operations
- [ ] Monitor calculates hit rate
- [ ] Monitor calculates miss rate
- [ ] Monitor exposes metrics

**Implementation Steps:**
1. Create `server/infrastructure/monitoring/cache-monitor.ts`
2. Implement cache operation tracking
3. Implement hit/miss rate calculation
4. Implement metrics exposure
5. Test monitor
6. Document usage

**Testing Requirements:**
- Monitor tracks cache operations
- Calculations are accurate
- Metrics are exposed

**Dependencies:** Task 1.1

**Time Estimate:** 1 day

### Task 5.12: Build Monitoring Dashboard

**Status:** `not_started`

**Description:** Build dashboard showing integration health metrics.

**Requirements Mapping:**
- Requirement 12.12: Provide dashboard showing integration health metrics

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Dashboard shows integration score
- [ ] Dashboard shows schema utilization
- [ ] Dashboard shows query performance
- [ ] Dashboard shows cache hit rate
- [ ] Dashboard shows transaction success rate
- [ ] Dashboard updates in real-time

**Implementation Steps:**
1. Create dashboard UI
2. Integrate with monitoring services
3. Add real-time updates
4. Add historical data
5. Add alerts
6. Test dashboard
7. Document usage

**Testing Requirements:**
- Dashboard displays all metrics
- Real-time updates work
- Historical data is accurate

**Dependencies:** Task 5.8, Task 5.9, Task 5.10, Task 5.11

**Time Estimate:** 3 days

### Task 5.13: Set Up Alerts

**Status:** `not_started`

**Description:** Configure alerts for integration score drops and performance issues.

**Requirements Mapping:**
- Requirement 12.9: Trigger alert when transaction failure rate exceeds 5%
- Requirement 12.10: Trigger alert when integration score falls below 80%

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Alert triggers on integration score drop
- [ ] Alert triggers on transaction failure rate
- [ ] Alert triggers on slow queries
- [ ] Alerts sent to appropriate channels
- [ ] Alerts include context and remediation steps

**Implementation Steps:**
1. Configure alerting system
2. Define alert thresholds
3. Configure alert channels
4. Add context to alerts
5. Test alerts
6. Document alert system

**Testing Requirements:**
- Alerts trigger correctly
- Alerts include helpful information
- Alerts reach appropriate channels

**Dependencies:** Task 5.8, Task 5.10

**Time Estimate:** 1 day

### Task 5.14: Document Monitoring System

**Status:** `not_started`

**Description:** Create comprehensive documentation for monitoring system.

**Requirements Mapping:**
- Requirement 13.11: Include version and date in documentation

**Design Reference:** Design Section "Migration Strategy - Phase 5"

**Acceptance Criteria:**
- [ ] Documentation explains all monitors
- [ ] Documentation explains dashboard
- [ ] Documentation explains alerts
- [ ] Documentation includes troubleshooting guide

**Implementation Steps:**
1. Create `docs/MONITORING_SYSTEM.md`
2. Document each monitor
3. Document dashboard
4. Document alerts
5. Add troubleshooting guide
6. Add version and date

**Testing Requirements:**
- Documentation is clear and complete

**Dependencies:** Task 5.8, Task 5.9, Task 5.10, Task 5.11, Task 5.12, Task 5.13

**Time Estimate:** 1 day

**Phase 5 Total Time:** 18 days (3.6 weeks, rounded to 4 weeks for buffer)

---

## Summary

### Total Timeline: 16 Weeks

- **Phase 1:** 2 weeks (Repository Infrastructure)
- **Phase 2:** 4 weeks (Core Entity Repositories)
- **Phase 3:** 4 weeks (Domain Services)
- **Phase 4:** 4 weeks (Feature Migration - prioritized subset)
- **Phase 5:** 2 weeks (Enforcement & Monitoring)

### Success Metrics

**Integration Score:**
- Week 1 Complete: 18% → 50% (+178%)
- Current: 50%
- Target: 90%+
- Measure after each feature migration

**Schema Utilization:**
- Week 1 Complete: 30% → 35%
- Current: 35%
- Target: 80%+
- Measure after Phase 4

**Type Consistency:**
- Week 1 Complete: 25% → 40%
- Current: 40%
- Target: 95%+
- Measure after Phase 3

**Query Performance:**
- Target: 30% reduction in average query time
- Measure after Phase 4

**Code Duplication:**
- Target: 40% reduction
- Measure after Phase 4

**Test Coverage:**
- Target: 80%+ unit test coverage
- Target: 100% property test coverage (30 properties)
- Measure continuously

### Risk Mitigation

**Breaking Changes:**
- Use migration adapters for backward compatibility
- Deploy with feature flags
- Comprehensive test suites
- Gradual rollout per feature

**Performance Degradation:**
- Benchmark before and after migration
- Monitor query execution times
- Implement caching strategically
- Use read/write separation

**Developer Resistance:**
- Comprehensive documentation
- Code examples and templates
- Pair programming sessions
- Clear benefits communication

**Timeline Overruns:**
- Prioritize high-impact features
- Parallel migration of independent features
- Buffer time in schedule
- Regular progress reviews

### Rollback Procedures

**Phase 1-2:**
- Repository infrastructure is additive
- Can be removed without affecting existing code
- No rollback needed if not yet used

**Phase 3:**
- Domain services are additive
- Features still use legacy patterns
- Can be removed without impact

**Phase 4 (per feature):**
- Deploy with feature flag
- Monitor integration score and error rates
- If issues detected:
  1. Disable feature flag
  2. Revert to legacy pattern
  3. Investigate and fix issues
  4. Re-deploy with feature flag
- Keep migration adapter for backward compatibility

**Phase 5:**
- Linting rules can be disabled in .eslintrc.js
- Monitoring is observability-only (no functional impact)
- No rollback needed

### Dependencies Between Phases

- Phase 2 depends on Phase 1 (BaseRepository, error types, Result/Maybe types)
- Phase 3 depends on Phase 2 (Repository interfaces and implementations)
- Phase 4 depends on Phase 3 (Domain services and factory functions)
- Phase 5 can run in parallel with Phase 4 (independent)

### Coherence Validation

This tasks document ensures coherence with requirements and design by:

1. **Requirements Mapping:** Each task explicitly maps to specific requirements with acceptance criteria numbers
2. **Design Reference:** Each task references specific design sections and components
3. **Acceptance Criteria:** Task acceptance criteria directly implement requirement acceptance criteria
4. **Testing Requirements:** Tasks include both unit tests and property tests as specified in design
5. **Dependencies:** Task dependencies match architectural layers (Infrastructure → Domain → Application → Presentation)
6. **Timeline:** Task timeline matches design migration strategy (16 weeks, 5 phases)
7. **Success Metrics:** Task success metrics match requirements success criteria
8. **Rollback Procedures:** Task rollback procedures match design risk mitigation strategies

**Critical Design Clarifications Integrated:**
- BaseRepository provides **infrastructure only** (transactions, caching, logging), NOT generic CRUD methods
- Domain-specific repositories define their own methods (e.g., `findByBillNumber()`, not generic `findById()`)
- Repository = data access ONLY; Domain Service = business logic; Application Service = use case orchestration
- Dependency injection required - repositories injected through constructors, never instantiated with `new`
- NOT every table needs a repository - use query services for simple reads, analytics, and reporting
- Leverage existing infrastructure: Drizzle ORM, `withTransaction()`, `readDatabase/writeDatabase`, Zod validation

All 15 requirements are covered across 60+ tasks, with each task contributing to the overall goal of achieving 90%+ integration score, 80%+ schema utilization, and 95%+ type consistency.

