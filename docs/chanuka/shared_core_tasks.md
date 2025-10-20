# **Shared Core Implementation Tasks \- Complete Document**

## **Document Information**

* **Version**: 2.0 \- Complete Edition  
* **Date**: October 20, 2025  
* **Status**: Final Implementation Guide  
* **Related Documents**:  
  * Requirements: `shared_core_requirements.md`  
  * Design: `shared_core_design.md`  
  * Original Tasks: `shared_core_tasks.md`

## **Executive Summary**

This document provides the complete implementation roadmap for refining the shared core infrastructure of the Chanuka platform. The refinement addresses critical architectural challenges that have emerged from organic growth, including fragmented caching implementations, inconsistent middleware patterns, and overlapping observability concerns. By establishing clear architectural layers and migration paths, this implementation plan enables the team to modernize the codebase incrementally while maintaining system stability throughout the transition.

The implementation follows a phased approach spanning ten weeks, beginning with foundational primitives and progressing through infrastructure consolidation, observability integration, and final migration. Each phase delivers concrete value while building toward the complete architectural vision outlined in the design document.

## **Phase 1: Foundation (Weeks 1-2)**

The foundation phase establishes the core building blocks that all subsequent work depends upon. By creating robust primitives and defining clear interfaces, this phase provides the type-safe, error-resistant foundation that makes the entire architecture possible.

### **Task 1.1: Implement Primitives Layer**

**Priority**: Critical | **Effort**: 3 days | **Requirements**: REQ-ERR-001

**Objective**: Create the foundational types and error classes that all other components will build upon.

This task represents the bedrock of the entire architecture. The primitives layer provides pure, framework-agnostic types that establish consistent patterns for error handling, optional values, and type safety throughout the application. By completing this work first, all subsequent tasks can leverage these primitives immediately, ensuring consistency from the ground up.

**Deliverables**:

* Result and Maybe monadic types with complete API  
* BaseError and specialized error classes  
* Branded type utilities for type-safe primitives  
* Shared constants for HTTP status codes and time units

**Subtask 1.1.1: Create Result Type**

Begin by creating the file `shared/core/src/primitives/types/result.ts`. The Result type represents operations that can succeed with a value or fail with an error, making error handling explicit in the type system. This eliminates the unpredictability of thrown exceptions and forces developers to consider both success and failure paths.

Implement the Result type as a discriminated union with two variants: Success containing the value, and Error containing the error details. The implementation should provide a rich API for working with Results, including transformation methods like map for transforming success values, flatMap for chaining operations that return Results, and mapError for transforming error values.

The unwrap method should return the success value or throw the error, providing an escape hatch when you know a Result must be successful. The unwrapOr method should provide a default value for error cases, enabling safe value extraction without exception handling.

Write comprehensive unit tests covering every method and edge case. Test that map only executes on success values. Test that flatMap correctly chains operations. Test that mapError transforms errors without affecting success values. Test that unwrap throws on error Results. Test that unwrapOr returns defaults for errors. Achieve one hundred percent test coverage to ensure the Result type behaves correctly in all scenarios.

**Acceptance**: The Result type compiles with strict TypeScript settings enabled. All tests pass. Coverage reaches one hundred percent. Documentation explains when to use Result versus throwing exceptions.

**Subtask 1.1.2: Create Maybe Type**

Create the file `shared/core/src/primitives/types/maybe.ts`. The Maybe type represents values that might be absent, providing a type-safe alternative to null and undefined. This eliminates null reference errors by making absence explicit and forcing developers to handle the missing value case.

Implement Maybe as a discriminated union with Some containing a value and None representing absence. Provide transformation methods including map for transforming present values, flatMap for chaining operations that return Maybes, and filter for conditionally keeping values based on predicates.

The unwrap method should return the value or throw if absent, while unwrapOr should provide a default value for the None case. This dual approach gives developers both strict and lenient ways to extract values based on their confidence about presence.

Write unit tests covering all methods and null or undefined handling. Test that operations on None values return None without executing transformation functions. Test that filter correctly converts Some to None when predicates fail. Test that unwrap throws on None. Test that unwrapOr returns defaults for None cases.

**Acceptance**: The Maybe type handles null and undefined safely. All tests pass. The type integrates smoothly with Result, allowing operations that might fail and might be absent to be composed cleanly.

**Subtask 1.1.3: Implement BaseError**

Create the file `shared/core/src/primitives/errors/base-error.ts`. The BaseError class establishes the standard structure for all errors throughout the application, ensuring consistency in error information, logging integration, and serialization.

Extend the native Error class to maintain compatibility with existing error handling mechanisms. Add properties for statusCode to indicate HTTP response codes, errorCode to provide machine-readable error identifiers, metadata to carry additional context, and isRetryable to indicate whether operations can be retried.

Implement automatic correlation ID capture in the constructor by reading from the correlation context. This ensures every error can be traced back to its originating request without developers needing to manually propagate correlation IDs.

Add a toJSON method that serializes the error for API responses. In production environments, filter out sensitive information like stack traces and internal metadata. In development, include full debugging information to aid troubleshooting.

Integrate with the logging system by automatically logging errors when they are created. This ensures no errors go unlogged while allowing specialized error handlers to add additional logging as needed.

Write tests verifying that all properties are set correctly, that correlation IDs are captured when available, that toJSON filters appropriately based on environment, and that logging integration works correctly.

**Acceptance**: BaseError captures all required fields. Logging integration works with a stub logger for now. Serialization correctly filters sensitive data. Tests cover all error creation scenarios.

**Subtask 1.1.4: Create Specialized Error Classes**

Create specialized error classes in `shared/core/src/primitives/errors/` that extend BaseError for specific error scenarios. Each specialized class should provide appropriate defaults and domain-specific fields while maintaining the consistent interface established by BaseError.

Implement ValidationError for data validation failures. Include a validationErrors array containing detailed information about each validation failure, including field name, invalid value, violated rule, and error message. Set statusCode to four hundred and isRetryable to false since validation errors require client corrections.

Implement AuthenticationError for authentication failures. Set statusCode to four hundred one and isRetryable to false. Include metadata about the authentication attempt while being careful not to leak sensitive information that could aid attackers.

Implement DatabaseError for database operation failures. Set statusCode to five hundred and isRetryable to true for transient database issues. Include the attempted query in metadata for debugging while sanitizing any sensitive values. Store the original database error for detailed investigation.

Implement ExternalServiceError for failures calling external APIs. Set statusCode to five hundred two and determine isRetryable based on the upstream status code, making five hundred series errors retryable while four hundred series errors are not. Include the service name and upstream status code in metadata.

Write tests for each error type verifying that inheritance works correctly, that defaults are set appropriately, that specialized fields are accessible, and that each error serializes correctly for API responses.

**Acceptance**: All error types work consistently. Tests verify inheritance and specialization. Error serialization produces appropriate responses for each error type. Documentation explains when to use each specialized error.

**Subtask 1.1.5: Create Branded Types**

Create the file `shared/core/src/primitives/types/branded.ts`. Branded types use TypeScript's type system to prevent accidental mixing of semantically different values that share the same underlying type.

Implement the Brand utility type that adds a compile-time-only brand to a base type. The brand exists only in the type system and has zero runtime overhead, but prevents accidentally using a UserId where a SessionId is expected, even though both might be strings at runtime.

Create common branded types used throughout the application including UserId, SessionId, Email, BillId, CommentId, and CorrelationId. Each branded type should be a string with an appropriate brand that makes the type's purpose clear.

Write tests demonstrating compile-time type safety. These tests intentionally fail to compile, proving that the type system prevents mistakes. Document these test cases so developers understand how branded types protect against errors.

**Acceptance**: Branded types prevent accidental type mixing at compile time. Tests demonstrate type safety. Documentation explains when and how to use branded types effectively.

**Subtask 1.1.6: Define Shared Constants**

Create shared constants in `shared/core/src/primitives/constants/` that establish standard values used throughout the application. Constants improve consistency, reduce magic numbers, and make code more maintainable.

In `http-status.ts`, define constants for all standard HTTP status codes using an object with descriptive names. Include common codes like OK with value two hundred, BAD\_REQUEST with value four hundred, UNAUTHORIZED with value four hundred one, INTERNAL\_SERVER\_ERROR with value five hundred, and so forth. These constants make HTTP response codes self-documenting.

In `time.ts`, define time constants for converting between time units. Define MILLISECOND as one, SECOND as one thousand milliseconds, MINUTE as sixty seconds, HOUR as sixty minutes, and DAY as twenty-four hours. These constants make time calculations readable and prevent errors from incorrect unit conversions.

Export all constants through an index file for convenient importing. Organize the exports logically so developers can import what they need without pulling in unnecessary constants.

**Acceptance**: Constants are type-safe using TypeScript's const assertions. The constants are well-organized and easily importable. Documentation explains the purpose of each constant group and provides usage examples.

**Dependencies**: This task has no dependencies and should be completed first to provide the foundation for all subsequent work.

**Testing Strategy**: Unit tests for each primitive type achieve one hundred percent coverage. Type-level tests use TypeScript's type system to verify compile-time behavior. Property-based tests exercise Result and Maybe combinators with randomly generated inputs to catch edge cases. Integration tests verify that primitives compose cleanly with each other.

---

### **Task 1.2: Design Cache Interface**

**Priority**: Critical | **Effort**: 2 days | **Requirements**: REQ-CACHE-001

**Objective**: Define the complete cache adapter interface that all implementations will conform to.

The cache interface establishes the contract that all cache implementations must fulfill, ensuring consistent behavior regardless of the underlying cache technology. This interface-first approach allows developers to write code against the interface while remaining agnostic to whether caching uses memory, Redis, or a multi-tier approach.

**Deliverables**:

* CacheAdapter interface with full type definitions  
* HealthStatus and CacheMetrics interfaces  
* Configuration types for all adapter variants  
* Interface documentation with usage examples

**Subtask 1.2.1: Create Core Interfaces**

Create the file `shared/core/src/caching/core/interfaces.ts` defining the CacheAdapter interface. This interface establishes the fundamental contract that all cache implementations must satisfy.

Define the core CRUD operations including get for retrieving values, set for storing values with optional time-to-live, delete for removing specific keys, clear for removing all cached data, and exists for checking key presence. Each method should return a Promise of Result wrapping the operation's value or void, ensuring error handling is explicit and type-safe.

Add lifecycle methods including initialize for setting up the cache adapter, healthCheck for verifying cache availability, shutdown for cleaning up resources, and getMetrics for retrieving performance statistics. These methods enable proper cache lifecycle management and observability integration.

Include comprehensive JSDoc comments explaining each method's purpose, parameters, return values, and error conditions. Document expected behavior for edge cases like what happens when getting non-existent keys, setting null values, or operating on a shutdown cache.

**Acceptance**: The interface compiles with strict TypeScript. All methods use Result types for explicit error handling. JSDoc comments thoroughly document behavior. The interface is general enough to support all planned cache implementations.

**Subtask 1.2.2: Define Supporting Types**

Create the file `shared/core/src/caching/types.ts` defining supporting types used by the cache interface. These types provide the detailed structure for health checks, metrics, and configuration.

Define the HealthStatus interface representing the health of a cache adapter. Include status as a union of healthy, degraded, or unhealthy. Include latency in milliseconds for the health check operation itself. Include details as a record of string keys to unknown values for cache-specific diagnostics. Include timestamp for when the health check occurred.

Define the CacheMetrics interface tracking cache performance. Include hits for successful retrievals, misses for failed retrievals, hitRate as a calculated percentage, averageLatency for operation timing, and errors for failed operations. These metrics enable performance monitoring and optimization.

Define the CacheConfig union type encompassing all possible cache configurations. Each configuration variant should include a type discriminator enabling type-safe configuration handling. Include MemoryCacheConfig, RedisCacheConfig, MultiTierConfig, and AICacheConfig as union members.

Document each type thoroughly explaining the purpose of each field, valid value ranges, and how the types relate to each other.

**Acceptance**: All types are well-documented with clear explanations. Types use appropriate primitives from the primitives layer. Configuration types enable type-safe cache instantiation. Health and metrics types support comprehensive observability.

**Subtask 1.2.3: Create Base Adapter Class**

Create the file `shared/core/src/caching/base-adapter.ts` implementing an abstract BaseAdapter class. This base class provides common functionality that all cache adapters can inherit, reducing duplication and ensuring consistent behavior.

Implement metrics tracking that subclasses inherit automatically. Track hits, misses, and operation latencies in a way that subclasses can update simply by calling protected methods. Calculate hit rate dynamically from hits and misses. Provide getMetrics as a concrete implementation that subclasses inherit without modification.

Implement a default healthCheck that subclasses can override. The default implementation should check basic adapter state like whether initialize has been called and whether shutdown has been executed. Subclasses can override to add implementation-specific checks while calling the super implementation first.

Provide utility methods for common operations like validating keys, handling TTL normalization, and managing initialization state. These utilities ensure consistent behavior across all adapters without requiring each implementation to handle these concerns independently.

**Acceptance**: The base adapter reduces code duplication. Metrics tracking works consistently. The default health check provides sensible baseline behavior. Subclasses can extend the base adapter naturally using inheritance.

**Subtask 1.2.4: Document Interface Contracts**

Create comprehensive documentation in `shared/core/src/caching/README.md` explaining the cache adapter interface, implementation requirements, and usage patterns.

Explain when to use each cache type. Memory caches work best for frequently accessed data with limited size. Redis caches suit distributed applications needing cache sharing across instances. Multi-tier caches combine fast local caching with shared distributed caching. AI caches add specialized features like token counting and embedding storage.

Provide usage examples for common scenarios including basic key-value storage, caching with time-to-live, handling cache misses, implementing read-through and write-through patterns, and monitoring cache health and performance.

Document expected behavior for edge cases. Explain what happens when getting non-existent keys, setting null or undefined values, operating on shutdown caches, and handling errors during cache operations. This documentation prevents misunderstandings about adapter behavior.

Include architecture diagrams showing how the cache interface relates to implementations and how applications interact with caches through the interface. Visual documentation helps developers understand the overall structure quickly.

**Acceptance**: Documentation is clear and comprehensive. Examples cover common use cases. Edge case behavior is well-documented. Architecture diagrams aid understanding. New developers can implement cache adapters by following the documentation.

**Dependencies**: This task requires Task 1.1 completion to use Result types and error classes in the interface definition.

**Testing Strategy**: Interface compliance tests verify that adapters implement all required methods with correct signatures. Contract tests verify that different adapter implementations produce equivalent behavior for the same operations. Edge case tests verify that documented behavior matches actual implementation for boundary conditions.

---

### **Task 1.3: Design Observability Stack**

**Priority**: High | **Effort**: 2 days | **Requirements**: REQ-OBS-001

**Objective**: Define the observability stack interface and correlation ID propagation strategy.

The observability stack coordinates logging, metrics, tracing, and health checks into a cohesive system where all signals work together to provide comprehensive system visibility. By designing this integration point carefully, the implementation ensures that correlation IDs propagate automatically, metrics aggregate consistently, and health checks reflect true system state.

**Deliverables**:

* ObservabilityStack class interface  
* Logger, MetricsCollector, Tracer, HealthChecker interfaces  
* CorrelationContext and propagation strategy  
* Configuration types for all observability components

**Subtask 1.3.1: Create Observability Interfaces**

Create observability interfaces in `shared/core/src/observability/` defining the contracts for each observability component.

Define the Logger interface with methods for debug, info, warn, and error log levels. Each method should accept a message string and an optional metadata object containing structured data. The logger should automatically include correlation IDs in all log entries without requiring developers to pass them explicitly.

Define the MetricsCollector interface with methods for counter to track occurrences, gauge to record instantaneous values, and histogram to measure distributions of values like latencies. Each method should accept a metric name, value, and optional tags for dimensionality. Metric names should follow the pattern service dot component dot metric-name for consistency.

Define the Tracer interface with methods for startSpan to begin a new trace span, currentSpan to access the active span, inject to serialize trace context for propagation, and extract to deserialize trace context from incoming requests. The tracer should integrate with AsyncLocalStorage to maintain trace context across asynchronous operations automatically.

Define the HealthChecker interface with methods for registerCheck to add new health checks, checkHealth to execute all checks and aggregate results, and getHealthStatus to retrieve the current health state. Health checks should support caching to prevent expensive checks from running too frequently.

Document each interface thoroughly with JSDoc comments explaining the purpose of each method, expected parameters, return values, and integration points with other observability components.

**Acceptance**: All interfaces follow industry standards like OpenTelemetry for tracing and Prometheus for metrics. Interfaces are well-documented with clear contracts. Integration points between components are explicitly defined.

**Subtask 1.3.2: Design ObservabilityStack**

Create the file `shared/core/src/observability/index.ts` defining the ObservabilityStack class that coordinates all observability components.

Design the ObservabilityStack to accept an ObservabilityConfig object in its constructor that contains nested configuration for logging, metrics, tracing, and health checking. The stack should validate this configuration and fail fast if required settings are missing or invalid.

Define the initialization flow that sets up all components in the correct order. Initialize the correlation manager first since other components depend on correlation ID propagation. Initialize logging next so that subsequent initialization can be logged. Initialize metrics and tracing in parallel since they do not depend on each other. Initialize health checking last since it may reference other components in its checks.

Design correlation ID propagation using Node.js AsyncLocalStorage. The stack should provide methods for startRequest that generates a new correlation ID and stores it in AsyncLocalStorage, getCorrelationId that retrieves the current correlation ID from AsyncLocalStorage, and getContext that returns all correlation context including user information and request metadata.

Ensure thread-safe context propagation across async boundaries by leveraging AsyncLocalStorage's built-in async context management. Test that correlation IDs propagate correctly through Promise chains, async functions, and event callbacks.

Provide accessor methods including getLogger, getMetrics, getTracer, and getHealth that return initialized components. These accessors allow dependent code to access observability services through the stack rather than managing separate component references.

**Acceptance**: The stack coordinates initialization correctly. Correlation IDs propagate through async operations. All components integrate cohesively. The stack provides a single entry point for observability services. Tests verify async behavior.

**Subtask 1.3.3: Define Configuration Types**

Create the file `shared/core/src/observability/types.ts` defining configuration types for all observability components.

Define ObservabilityConfig as an object containing nested configuration objects for each component. Include logging configuration with fields for level choosing among debug, info, warn, or error, format selecting json or pretty printing, destination choosing stdout, file, or both, and optional rotation settings for log file management.

Include metrics configuration with fields for prefix to namespace all metrics, enabled flag for toggling metrics collection, exportInterval for how often to export metrics, and exporters array choosing among prometheus, statsd, or cloudwatch.

Include tracing configuration with fields for enabled flag for toggling tracing, serviceName identifying the service in traces, samplingRate controlling what percentage of traces to record, and exporters array choosing among jaeger, zipkin, or otlp.

Include health configuration with fields for enabled flag for toggling health checks, checkInterval for how often to run checks, cacheTTL for how long to cache health results, and checks object mapping check names to HealthCheckConfig objects.

Define sensible defaults for development and production environments. Development defaults should favor verbose logging, local exporters, and generous sampling. Production defaults should favor structured logging, production-ready exporters, and conservative sampling to manage overhead.

Include validation schemas for configuration using Zod or Joi. Configuration validation should occur at application startup, preventing invalid configurations from causing runtime failures.

**Acceptance**: Configuration is type-safe with full TypeScript support. Defaults are appropriate for each environment. Validation catches configuration errors at startup. Documentation explains each configuration option with examples.

**Subtask 1.3.4: Create Correlation Manager**

Create the file `shared/core/src/observability/correlation.ts` implementing the CorrelationManager class responsible for correlation ID generation and propagation.

Implement CorrelationManager using AsyncLocalStorage to maintain correlation context throughout asynchronous execution. The AsyncLocalStorage instance should be private and accessed only through manager methods, preventing external code from bypassing the manager's context management.

Implement the startRequest method that generates a new correlation ID using a UUID library, creates a correlation context object containing the ID plus request metadata like user ID and client IP, and stores this context in AsyncLocalStorage. This method should be called at the entry point of each request.

Implement the getCorrelationId method that retrieves the current correlation ID from AsyncLocalStorage. If no context exists, generate a default correlation ID to prevent null reference errors. Log a warning when no context exists to identify places where context initialization is missing.

Implement the getContext method that retrieves the entire correlation context from AsyncLocalStorage. Return a frozen object to prevent accidental context mutation. If no context exists, return a default context with a generated correlation ID.

Ensure thread-safe context propagation by relying on AsyncLocalStorage's guarantee that context stays associated with the correct asynchronous execution path. Test extensively with Promise.all, async functions, setTimeout callbacks, and event emitters to verify correct propagation.

**Acceptance**: Correlation IDs propagate correctly across async boundaries. Tests verify propagation through various async patterns including promises, async/await, callbacks, and event emitters. The manager prevents accidental context loss. Default behavior prevents null reference errors when context is missing.

**Dependencies**: This task requires Task 1.1 for error classes used in logging. The observability interfaces provide the foundation for subsequent observability implementation.

**Testing Strategy**: Unit tests verify each interface implementation in isolation. Integration tests verify correlation ID propagation through complex async operations. Tests simulate request handling to verify end-to-end observability integration. Performance tests ensure observability overhead remains acceptable.

---

### **Task 1.4: Set Up Project Structure**

**Priority**: High | **Effort**: 1 day | **Requirements**: All Requirements

**Objective**: Create the directory structure and build configuration for the refined shared core.

The project structure task establishes the physical organization of code, build configuration, test infrastructure, and documentation templates. This foundation ensures that all subsequent development follows consistent patterns and that code organization reflects the architectural design.

**Deliverables**:

* Complete directory structure following design document  
* TypeScript configuration with strict settings  
* Test configuration with appropriate test runners  
* Documentation templates and contribution guidelines

**Subtask 1.4.1: Create Directory Structure**

Create the complete directory structure for the refined shared core matching the architectural layers defined in the design document.

Create `shared/core/src/primitives/` as the foundation layer. Within primitives, create subdirectories for `types/` containing Result, Maybe, and branded types, `errors/` containing BaseError and specialized errors, and `constants/` containing shared constants. Each subdirectory should have an index file for convenient importing.

Create `shared/core/src/caching/` for the unified caching system. Within caching, create subdirectories for `core/` containing interfaces and base adapter, `adapters/` containing concrete implementations, `legacy-adapters/` for backward compatibility, and `patterns/` for caching patterns like single-flight. Include `__tests__/` directories alongside implementation files for co-locating tests with code.

Create `shared/core/src/observability/` for the observability stack. Within observability, create subdirectories for `logging/` containing logger implementations, `metrics/` containing metrics collectors, `tracing/` containing tracer implementations, `health/` containing health checker, and `legacy-adapters/` for backward compatibility bridges.

Create `shared/core/src/middleware/` for the unified middleware factory. Within middleware, create subdirectories for `providers/` containing middleware providers, `legacy-adapters/` for old factory compatibility, and `__tests__/` for middleware tests.

Create `shared/core/src/validation/` for the validation system. Within validation, create subdirectories for `schemas/` containing reusable validation schemas, `adapters/` containing validator adapters for Zod and Joi, `middleware/` containing validation middleware, and `legacy-adapters/` for backward compatibility.

Create `shared/core/src/patterns/` for reusable design patterns. Within patterns, create files for circuit-breaker, retry-logic, single-flight, and other patterns built on top of the infrastructure layer.

Create `shared/core/src/services/` for high-level service abstractions. Within services, create files for cache-service, logging-service, health-service, and other orchestrations of infrastructure components.

**Acceptance**: The structure matches the design document exactly. Directories follow consistent naming conventions. Test directories are co-located with code. Index files enable convenient importing. The structure scales naturally as new components are added.

**Subtask 1.4.2: Configure TypeScript**

Create `shared/core/tsconfig.json` configuring TypeScript for the shared core package with strict settings that catch potential errors at compile time.

Enable strict mode which activates all strict type-checking options. Set noImplicitAny to true requiring explicit type annotations rather than inferring any. Set strictNullChecks to true preventing null and undefined from being valid values of every type. Set strictFunctionTypes to true enabling stricter checking of function type compatibility. Set strictBindCallApply to true checking that bind, call, and apply are invoked with correct arguments.

Configure module resolution to use Node's resolution algorithm. Set moduleResolution to node allowing TypeScript to find npm packages correctly. Set esModuleInterop to true enabling better interoperability between CommonJS and ES modules. Set resolveJsonModule to true allowing import of JSON files.

Configure path aliases to simplify imports within the shared core. Map `@primitives/*` to `./src/primitives/*`, `@caching/*` to `./src/caching/*`, `@observability/*` to `./src/observability/*`, and so forth for each major directory. These aliases prevent brittle relative path imports like `../../../primitives/types`.

Set output options including declaration to true for generating type definition files, declarationMap to true for enabling jump-to-definition to work across packages, sourceMap to true for debugging support, and outDir to specify where compiled files are written.

Configure exclusions to prevent compiling test files and node\_modules. Exclude patterns for `**/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`, and `node_modules/**`.

**Acceptance**: All code compiles without errors. Strict type checking catches potential issues. Path aliases work correctly in imports. Generated type definitions support consumers of the shared core package. The configuration supports both development and production builds.

**Subtask 1.4.3: Configure Testing**

Set up the test infrastructure using Jest as the test runner since it provides excellent TypeScript support, comprehensive mocking capabilities, and great developer experience.

Create `shared/core/jest.config.js` configuring Jest for the shared core tests. Set preset to ts-jest for TypeScript support. Configure testMatch to find test files following patterns like `**/__tests__/**/*.test.ts` and `**/*.spec.ts`. Configure collectCoverageFrom to track coverage for all source files except index files and type definitions.

Set coverage thresholds requiring ninety percent coverage across branches, functions, lines, and statements. These thresholds prevent coverage regression and ensure comprehensive testing. Configure the coverage reporter to generate HTML reports for detailed coverage analysis and text-summary reports for quick terminal feedback.

Configure test environment to use node since shared core code runs on the server. Set up module name mapper to handle path aliases matching those in tsconfig, ensuring test imports work correctly. Configure setup files to run before tests for initializing test utilities, configuring mocks, and setting up test infrastructure.

Create `shared/core/src/__tests__/setup.ts` containing global test setup. Configure jest.setTimeout to increase timeout for integration tests that make real network calls or database queries. Set up global test utilities like mock logger and mock metrics that tests can use without importing. Configure cleanup hooks to reset mocks between tests preventing test pollution.

Create test utilities in `shared/core/src/__tests__/test-utils.ts` providing reusable testing helpers. Implement functions for creating test cache instances, mock observability components, and test correlation contexts. These utilities reduce test boilerplate and ensure consistent test setup.

**Acceptance**: Tests run successfully using npm test. Coverage reports generate correctly. Coverage thresholds are enforced. Test utilities reduce boilerplate. Tests run in isolation without affecting each other. Configuration supports both unit and integration tests.

**Subtask 1.4.4: Create Documentation Structure**

Establish the documentation structure with templates and guidelines that ensure comprehensive, consistent documentation throughout the shared core.

Create `shared/core/README.md` as the main documentation entry point. Include an architecture overview explaining the four-layer structure and how layers relate. Document the design principles guiding the architecture including explicit error handling, interface-first design, incremental migration, and observability integration. Provide quick-start examples showing common usage patterns. Link to detailed documentation for each subsystem.

Create `shared/core/CONTRIBUTING.md` with contribution guidelines explaining how developers should contribute to the shared core. Document the pull request process including required reviews, testing expectations, and documentation requirements. Explain coding standards including naming conventions, file organization, and comment style. Provide guidelines for writing tests including what to test, how to organize tests, and coverage expectations.

Create a template for architecture decision records in `shared/core/docs/adr/template.md`. Architecture decision records document significant decisions including the context motivating the decision, the decision itself, the consequences of the decision, and alternatives that were considered. This template ensures consistent documentation of architectural choices.

Create initial architecture decision records documenting foundational decisions. Write ADR-001 explaining the choice of Result types over exceptions. Write ADR-002 documenting the interface-first cache design. Write ADR-003 explaining the observability stack coordination strategy. These initial ADRs establish the pattern and document early key decisions.

Create `shared/core/docs/migration-guide.md` with a migration guide helping teams transition from legacy patterns to refined architecture. Provide side-by-side examples comparing old and new patterns for common operations. Document the feature flag strategy for controlled rollout. Explain the deprecation timeline and sunset dates for legacy code.

**Acceptance**: Documentation structure is clear and navigable. Templates are usable and promote consistency. Architecture decision records document key choices. Migration guide provides actionable guidance. README gives newcomers a clear starting point.

**Dependencies**: This task has no code dependencies but should be completed early to establish infrastructure for subsequent work.

**Testing Strategy**: Verify that the TypeScript configuration compiles all source code successfully. Test that path aliases resolve correctly in both source and test code. Verify that test runner finds and executes all tests. Validate that coverage reporting works correctly. Check that documentation builds and links work properly.

---

## **Phase 2: Core Infrastructure (Weeks 3-5)**

Phase two builds upon the foundation to implement the unified caching system and middleware factory. This phase delivers concrete, usable infrastructure that teams can begin adopting immediately while maintaining backward compatibility through legacy adapters. By completing this phase, the project demonstrates the viability of the new architecture with working implementations that teams can evaluate and provide feedback on.

### **Task 2.1: Implement Memory Cache Adapter**

**Priority**: Critical | **Effort**: 3 days | **Requirements**: REQ-CACHE-001

**Objective**: Create a fully-functional memory cache adapter implementing the CacheAdapter interface.

The memory cache adapter provides fast, in-process caching using a Map-based implementation with LRU eviction. This adapter serves as both a production-ready caching solution for single-instance deployments and as the reference implementation demonstrating how to properly implement the CacheAdapter interface.

**Deliverables**:

* MemoryCacheAdapter with LRU eviction  
* Complete test suite with one hundred percent coverage  
* Performance benchmarks  
* Usage documentation

**Subtask 2.1.1: Implement Core Adapter**

Create the file `shared/core/src/caching/adapters/memory-adapter.ts` implementing the MemoryCacheAdapter class that extends BaseAdapter and implements the CacheAdapter interface.

Use a Map to store cached values since Map provides efficient key-value storage with O(1) lookup time. Each map entry should contain the cached value plus metadata including the expiration timestamp for TTL support and an access timestamp for LRU eviction.

Implement the get method to retrieve values by key. Check if the key exists in the map. If the entry has expired based on TTL, delete it and return null wrapped in a successful Result. If the entry is valid, update its access timestamp for LRU tracking, increment the hit counter in metrics, and return the value wrapped in a successful Result. If the key does not exist, increment the miss counter and return null wrapped in a successful Result.

Implement the set method to store values with optional TTL. If maxSize is configured and the cache is full, evict the least recently used entry by finding the entry with the oldest access timestamp. Store the value in the map along with metadata including the expiration timestamp calculated from the current time plus TTL. Update metrics tracking the set operation. Return void wrapped in a successful Result.

Implement the delete method to remove specific keys. Check if the key exists and delete it from the map. Return void wrapped in a successful Result whether or not the key existed, making delete idempotent.

Implement the clear method to remove all entries. Call the Map's clear method to remove all entries at once. Reset metrics counters since the cache state has been completely reset. Return void wrapped in a successful result.

Implement the exists method to check key presence without retrieving values. Check if the key exists in the map and has not expired. Return a boolean wrapped in a successful Result. This method allows checking presence without the overhead of retrieving and deserializing large values.

Implement TTL handling with automatic expiration. In the get method, check if the current time exceeds the entry's expiration timestamp. If expired, delete the entry and treat it as a cache miss. Consider implementing a background cleanup timer that periodically sweeps expired entries to prevent memory growth from expired but unaccessed entries.

Implement LRU eviction respecting the maxSize configuration. When the cache reaches maxSize and a new entry needs to be added, iterate through all entries to find the one with the oldest access timestamp. Delete that entry to make room for the new one. For better performance with large caches, consider maintaining a separate data structure tracking access order.

Handle error cases by wrapping exceptions in Result.error. Catch any unexpected errors during operations and return them as error Results rather than throwing exceptions. This maintains the explicit error handling contract of the CacheAdapter interface.

**Acceptance**: All interface methods work correctly without throwing exceptions. TTL expiration removes entries automatically. LRU eviction maintains the size limit. All operations return Result types. The implementation extends BaseAdapter correctly.

**Subtask 2.1.2: Add Metrics Tracking**

Implement comprehensive metrics tracking by calling the BaseAdapter's protected metrics methods from each operation.

Track cache hits by incrementing the hit counter when get operations find valid, non-expired entries. Track cache misses by incrementing the miss counter when get operations find no entry or find expired entries. Calculate hit rate as hits divided by total operations (hits plus misses), handling the case where total operations is zero by returning zero hit rate.

Track operation latencies using high-resolution timers. At the start of each operation, record the start time using process.hrtime.bigint(). At the end of the operation, calculate the duration and add it to a rolling average. Store the last N latency measurements in a circular buffer to calculate accurate average latency without storing unbounded history.

Implement the getMetrics method by aggregating metrics from the base adapter. Return a CacheMetrics object containing the current hit count, miss count, calculated hit rate, average latency in milliseconds, and error count. This method should be fast since it returns already-calculated values rather than computing metrics on demand.

Ensure metrics tracking has minimal performance impact. Avoid expensive operations in the critical path. Use efficient data structures for storing metrics. Consider using atomic operations if metrics will be updated from multiple concurrent operations.

**Acceptance**: Metrics accurately reflect cache behavior. Hit rate calculations are correct. Latency measurements use high-resolution timers. Performance impact of metrics tracking is negligible (less than one percent overhead). getMetrics returns current statistics quickly.

**Subtask 2.1.3: Implement Health Check**

Implement the healthCheck method to verify the cache adapter is operating correctly.

Override the BaseAdapter's healthCheck method, first calling the super implementation to check basic initialization state. The base health check verifies that initialize has been called and shutdown has not been called.

Check memory usage against configured limits. Calculate the current number of entries in the cache. If maxSize is configured, calculate the percentage of capacity used. Report degraded status if usage exceeds ninety percent of maxSize, warning that evictions will occur frequently. Report unhealthy status if attempting to operate beyond configured capacity.

Measure health check latency by timing a test set and get operation. Create a unique test key, set a test value, retrieve it, and delete it. Time this sequence to verify that cache operations complete quickly. Report degraded status if operations take longer than ten milliseconds, indicating potential performance issues.

Include detailed diagnostics in the health response details field. Include the current entry count, memory usage percentage if maxSize is configured, current hit rate, average operation latency, and time since last eviction. These diagnostics help operators understand cache health beyond the simple healthy or degraded status.

Handle errors during health checks gracefully. If the health check itself fails, return unhealthy status with details about the failure. Do not allow health check failures to crash the adapter or the application.

**Acceptance**: Health checks accurately reflect cache state. Degraded status warnings appear before critical failures. Detailed diagnostics provide actionable information. Health checks complete quickly (under one hundred milliseconds). Health check errors do not crash the adapter.

**Subtask 2.1.4: Write Comprehensive Tests**

Create the file `shared/core/src/caching/adapters/__tests__/memory-adapter.test.ts` containing comprehensive tests for the memory cache adapter.

Test all CRUD operations with basic happy-path scenarios. Test that set followed by get returns the same value. Test that get for non-existent keys returns null without errors. Test that delete removes entries. Test that clear removes all entries. Test that exists correctly reports presence without retrieving values.

Test TTL expiration timing with precise timing assertions. Set entries with short TTLs (one second). Immediately verify the entry exists. Wait for the TTL to expire using a timer. Verify the entry no longer exists and that get returns null. Verify that expired entries do not contribute to hit counts but do contribute to miss counts.

Test LRU eviction when maxSize is reached. Configure a cache with maxSize of three. Add four entries sequentially. Verify that the first entry was evicted since it was least recently used. Access the second entry to make it recently used. Add a fifth entry and verify that the third entry was evicted since the second entry was accessed. This test verifies the LRU algorithm works correctly.

Test metrics accuracy by performing known operations and verifying metrics match. Perform ten set operations followed by five gets (three hits, two misses). Verify metrics show ten sets, three hits, two misses, and a sixty percent hit rate. Test that metrics reset correctly after clear operations.

Test error handling by simulating error conditions. Test behavior when operating on a shutdown cache. Test handling of invalid keys or values if applicable. Verify that all errors return error Results rather than throwing exceptions.

Test concurrent operations using Promise.all to execute multiple operations simultaneously. Verify that concurrent sets, gets, and deletes work correctly without race conditions. Verify that metrics remain accurate under concurrent access. Use large numbers of concurrent operations to stress test the implementation.

Test edge cases including setting null or undefined values, using empty strings as keys, setting entries with zero or negative TTLs, and operating on an empty cache. Verify behavior matches documentation for each edge case.

Achieve one hundred percent test coverage by ensuring every code path executes in at least one test. Use coverage reports to identify untested branches and add tests for them.

**Acceptance**: All tests pass consistently. Tests cover all methods and edge cases. Coverage reaches one hundred percent. Tests verify thread safety under concurrent access. Tests serve as documentation of expected behavior.

**Subtask 2.1.5: Create Performance Benchmarks**

Create performance benchmarks demonstrating the memory cache adapter meets performance requirements.

Benchmark single-threaded read and write performance by executing a large number of sequential operations. Set ten thousand entries sequentially. Get ten thousand entries sequentially (both hits and misses). Calculate operations per second for both set and get operations. Verify performance meets or exceeds ten thousand operations per second as specified in requirements.

Benchmark concurrent operation performance by executing operations in parallel. Use Promise.all to execute one hundred concurrent operations. Measure total time and calculate operations per second. Verify that concurrent performance scales reasonably with available CPU cores.

Benchmark TTL overhead by comparing performance of caches with and without TTL. Measure the overhead of TTL checking during get operations. Verify that TTL support adds less than ten percent overhead compared to caches without TTL.

Benchmark LRU eviction performance by measuring the time for evictions to occur. Fill the cache to capacity. Measure the time to add additional entries that trigger evictions. Verify that eviction time is bounded and does not grow with cache size (should be O(N) for the current implementation but ideally would be O(1) with a better data structure).

Compare against baseline targets established in requirements. Document any performance characteristics that differ from baselines. If performance falls short of targets, identify bottlenecks and optimization opportunities.

Create benchmark reports showing results in an easy-to-read format. Include operations per second, latency percentiles (p50, p95, p99), and memory usage. Commit benchmark results to documentation so future changes can detect performance regressions.

**Acceptance**: Performance meets or exceeds ten thousand operations per second target. Concurrent operations scale appropriately. TTL overhead is acceptable. LRU eviction is bounded. Benchmark results are documented.

**Dependencies**: Task 1.1 (Result type and error classes), Task 1.2 (CacheAdapter interface and BaseAdapter)

**Testing Strategy**: Unit tests verify correctness of each method in isolation. Integration tests verify the adapter works correctly with the cache factory. Performance tests verify efficiency requirements are met. Concurrent tests verify thread safety. Property-based tests could verify invariants like cache size never exceeds maxSize.

---

### **Task 2.2: Implement Redis Cache Adapter**

**Priority**: High | **Effort**: 4 days | **Requirements**: REQ-CACHE-001

**Objective**: Create a production-ready Redis cache adapter with robust connection management and error handling.

The Redis cache adapter provides distributed caching that scales across multiple application instances. This adapter demonstrates production-grade implementation patterns including connection pooling, automatic reconnection, circuit breaking for failed connections, and proper error handling for network failures.

**Deliverables**:

* RedisCacheAdapter with robust connection management  
* Complete test suite including connection failure scenarios  
* Performance benchmarks comparing to memory adapter  
* Docker compose configuration for testing

**Subtask 2.2.1: Implement Adapter**

Create the file `shared/core/src/caching/adapters/redis-adapter.ts` implementing the RedisCacheAdapter class that extends BaseAdapter.

Use the ioredis library as the Redis client since it provides excellent TypeScript support, connection pooling, automatic reconnection, and cluster support. Initialize the ioredis client in the initialize method using configuration from RedisCacheConfig. Configure connection options including host, port, password, database number, connection timeout, and retry strategy.

Implement connection pooling with the ioredis client's built-in pool. Configure maxRetriesPerRequest to limit retries for individual operations. Configure retryStrategy that implements exponential backoff for connection retries. Configure reconnectOnError that determines when to reconnect based on error types.

Implement the get method using the Redis GET command. Retrieve the value as a string from Redis. If the key does not exist, Redis returns null which should be wrapped in a successful Result. If a value exists, parse it as JSON to reconstruct the original object. Handle JSON parsing errors by returning error Results with details about the malformed data. Wrap all operations in try-catch blocks to catch network errors and return them as error Results.

Implement the set method using the Redis SETEX command when TTL is specified or SET when no TTL is provided. Serialize values to JSON before storing since Redis only stores strings. If serialization fails, return an error Result without attempting the Redis operation. If the Redis operation fails due to connection issues, return an error Result with the connection error.

Implement the delete method using the Redis DEL command. The command returns the number of keys deleted but the method should return void wrapped in Result, making delete idempotent like the memory adapter.

Implement the clear method carefully since Redis FLUSHDB clears the entire database which may affect other applications. If keyPrefix is configured, use Redis SCAN with pattern matching to find all keys with the prefix and delete them in batches. If no keyPrefix is configured, document that clear affects the entire database and consider requiring explicit confirmation.

Implement the exists method using the Redis EXISTS command which efficiently checks presence without retrieving values.

Handle Redis-specific errors gracefully. Catch connection errors, timeout errors, and Redis errors. Classify errors as retryable or non-retryable. Connection errors and timeouts are retryable. Authentication errors and syntax errors are not retryable. Include error classification in the Result's error metadata to guide retry logic.

Implement proper serialization and deserialization of complex objects. Support dates by detecting Date objects during serialization and reconstructing them during deserialization. Support other complex types like Maps, Sets, and typed arrays if needed for the application. Document any types that cannot be cached due to serialization limitations.

**Acceptance**: All operations work correctly against real Redis. Connection failures are handled gracefully. Operations return error Results rather than throwing. Serialization handles complex objects correctly. The adapter reconnects automatically after temporary connection failures.

**Subtask 2.2.2: Add Key Prefix Support**

Implement configurable key prefixes to namespace caches, preventing collisions when multiple applications share a Redis instance.

Add keyPrefix to RedisCacheConfig as an optional string field. In the adapter constructor, store the keyPrefix if provided. Create a private method prefixKey that prepends the prefix to keys if configured. If no prefix is configured, return the key unchanged. Use prefixKey in all methods that accept keys: get, set, delete, exists.

For the clear method, use the prefix to construct a pattern for SCAN. If prefix is "myapp:", use the pattern "myapp:\*" to find all keys belonging to this application. This approach prevents clear from affecting other applications' data.

Test prefix isolation by creating two cache instances with different prefixes. Set the same key in both instances with different values. Verify that get returns the correct value for each instance. Verify that clear in one instance does not affect the other instance.

Document the prefix feature explaining that it enables safe multi-tenancy on a single Redis instance. Recommend using prefixes in production to prevent accidental collisions. Suggest prefix patterns like "appname:environment:" to namespace by application and environment.

**Acceptance**: Key prefixes prevent collisions between cache instances. All operations respect prefixes consistently. Clear operations only affect keys with the correct prefix. Tests verify prefix isolation. Documentation explains prefix usage.

**Subtask 2.2.3: Implement Connection Health Monitoring**

Implement comprehensive connection health monitoring to track connection state and enable proactive failure handling.

Track connection state through ioredis events. Listen for the "connect" event to detect successful connections. Listen for the "ready" event to detect when the client is ready to accept commands. Listen for the "close" event to detect disconnections. Listen for the "error" event to detect connection errors. Maintain a state variable reflecting the current connection status: connected, connecting, or disconnected.

Implement a circuit breaker for repeated connection failures. If connection attempts fail repeatedly within a time window, open the circuit to prevent further attempts for a cooling-off period. After the cooling-off period, allow a single probe attempt to test if the connection has recovered. If the probe succeeds, close the circuit and resume normal operation. If the probe fails, extend the cooling-off period exponentially.

Return appropriate health status based on connection state. Return healthy when connected and operations succeed. Return degraded when reconnecting or when recent operations experience high latency. Return unhealthy when the circuit breaker is open or the client is disconnected without active reconnection.

Include connection diagnostics in health check details. Report the current connection state, time since last successful operation, number of failed connection attempts, circuit breaker state, and recent error messages. These diagnostics help operators understand connection issues quickly.

Emit metrics for connection events. Increment a counter when connections fail. Record gauges for connection state. Track histograms for connection establishment time. These metrics enable monitoring of Redis connectivity independent of cache operations.

**Acceptance**: Health checks accurately reflect connection state. Circuit breakers prevent cascading failures. Connection state tracking is reliable. Diagnostics provide actionable debugging information. Metrics enable proactive monitoring.

**Subtask 2.2.4: Write Tests**

Create the file `shared/core/src/caching/adapters/__tests__/redis-adapter.test.ts` containing comprehensive tests against a real Redis instance.

Set up a test Redis instance using the Testcontainers library which automatically starts a Docker container with Redis for testing. Configure the container to use an ephemeral port to avoid conflicts with local Redis instances. Initialize the Redis adapter with the container's connection details. Clean up the container after tests complete.

Test all CRUD operations against the real Redis instance. These tests verify that serialization, network communication, and Redis commands work correctly. Test set followed by get. Test get for non-existent keys. Test delete removes entries. Test clear removes all entries with the correct prefix. Test exists reports presence accurately.

Test connection failure and recovery by stopping the Redis container, attempting operations to trigger connection errors, then restarting the container and verifying operations resume successfully. This test verifies automatic reconnection and retry logic.

Test serialization of complex objects including nested objects, arrays, dates, and special values like null, undefined, and NaN. Verify that deserialized objects match the original objects. Test that unsupported types produce helpful error messages rather than silent data corruption.

Test concurrent operations by running multiple operations in parallel using Promise.all. Verify that ioredis handles concurrent operations correctly. Verify that the adapter's metrics remain accurate under concurrent load.

Test key prefix isolation by creating multiple adapter instances with different prefixes. Verify that operations on one instance do not affect the other. Verify that clear only removes keys with the correct prefix.

Test TTL functionality by setting entries with short TTLs and verifying they expire. Redis handles TTL internally so this test verifies that the adapter passes TTL parameters correctly.

Test error handling by simulating various failure scenarios including network errors, authentication failures, and invalid commands. Verify that all failures return error Results with appropriate error details.

**Acceptance**: All tests pass consistently against real Redis. Connection failure tests verify reconnection logic. Serialization tests cover complex objects. Concurrent operation tests verify thread safety. Prefix tests verify isolation. Tests provide confidence in production readiness.

**Subtask 2.2.5: Create Docker Test Environment**

Set up a Docker Compose configuration that provides Redis for local testing and CI/CD pipelines.

Create `docker-compose.test.yml` in the project root defining a Redis service for testing. Use the official Redis image from Docker Hub. Configure the service to expose Redis on port 6379\. Set up a volume for Redis data to enable persistence between runs if desired for local development.

Configure Redis with appropriate test settings. Disable persistence in test environments since test data does not need durability. Enable verbose logging to aid debugging test failures. Configure maxmemory with an eviction policy to prevent tests from consuming unlimited memory.

Update package.json test scripts to start Docker Compose before running tests and stop it afterward. Create a "test:redis" script that runs docker-compose up, waits for Redis to be ready, runs the Redis adapter tests, and finally runs docker-compose down for cleanup.

Configure CI/CD pipelines to use the Docker Compose configuration. In GitHub Actions or similar, add a step to start Docker Compose before running tests. Configure the test environment to connect to the containerized Redis. Ensure containers are cleaned up even if tests fail.

Document how developers run tests locally. Explain that Docker and Docker Compose must be installed. Provide commands to start Redis manually for development. Explain how to connect to the test Redis for debugging failed tests.

**Acceptance**: Docker Compose successfully starts Redis for testing. Tests connect to the containerized Redis reliably. CI/CD pipelines run tests with Docker Compose. Local testing documentation is clear. Redis containers clean up after tests.

**Dependencies**: Task 1.1 (Result type), Task 1.2 (CacheAdapter interface), Task 2.1 (memory adapter patterns can inform Redis implementation)

**Testing Strategy**: Integration tests against real Redis verify correctness. Chaos tests simulating network failures verify resilience. Performance benchmarks verify efficiency. Load tests verify connection pool handles high concurrency. All tests use real Redis rather than mocks to provide high confidence.

---

### **Task 2.3: Implement Multi-Tier Cache Adapter**

**Priority**: Medium | **Effort**: 3 days | **Requirements**: REQ-CACHE-001

**Objective**: Create a multi-tier cache that combines memory and Redis for optimal performance.

The multi-tier cache adapter combines fast local memory caching with shared distributed Redis caching. This adapter demonstrates composition of existing adapters to create higher-level caching strategies. By caching frequently accessed data locally while maintaining a shared cache, the multi-tier approach achieves both fast access and cross-instance consistency.

**Deliverables**:

* MultiTierCacheAdapter coordinating multiple cache tiers  
* Write-through and write-behind strategies  
* Test suite verifying tier coordination  
* Performance comparison showing tier benefits

**Subtask 2.3.1: Implement Adapter**

Create the file `shared/core/src/caching/adapters/multi-tier-adapter.ts` implementing the MultiTierCacheAdapter class.

Accept an array of CacheAdapter instances in the constructor representing the cache tiers ordered from fastest to slowest. Typically this would be memory cache as the first tier and Redis cache as the second tier, but the adapter should support arbitrary numbers and types of tiers.

Implement read cascade logic in the get method. Iterate through tiers from fastest to slowest attempting to get the value. If a tier returns a value, promote the value to all faster tiers to optimize subsequent accesses. This promotion ensures frequently accessed data migrates to faster tiers naturally. If no tier has the value, return null wrapped in a successful Result.

Implement write-through strategy by default in the set method. Write to all tiers synchronously using Promise.all. Wait for all writes to complete before returning. If any tier fails, decide whether to return success if the primary tier succeeded or return failure if any tier failed. Document this behavior clearly since different applications may have different requirements.

Implement optional write-behind strategy for better write performance. When write-behind is enabled, write to the fastest tier synchronously and write to slower tiers asynchronously without waiting. Use a work queue to manage asynchronous writes. Handle failures of asynchronous writes by logging errors and potentially removing entries from failed tiers to maintain consistency.

Implement the delete method by deleting from all tiers. Use Promise.all to delete in parallel. Since delete is idempotent, it doesn't matter if some tiers don't have the entry.

Implement the clear method by clearing all tiers. Use Promise.all to clear in parallel. Be cautious if any tier uses a shared cache without prefix isolation, as clearing might affect other applications.

Implement the exists method by checking tiers in order, returning true as soon as any tier has the entry. This avoids checking all tiers unnecessarily.

Handle tier failures gracefully. If a tier is unhealthy, continue operating with remaining healthy tiers. Track unhealthy tiers and periodically retry them to detect recovery. Emit metrics when operating in degraded mode with some tiers unavailable.

**Acceptance**: Tier coordination works correctly. Read cascade promotes values to faster tiers. Write-through and write-behind strategies both work. Tier failures don't prevent operation with healthy tiers. The adapter composition is transparent to consumers.

**Subtask 2.3.2: Add Tier Health Aggregation**

Implement health aggregation that combines health from all tiers into an overall health status.

Override the healthCheck method to check all tiers. Execute health checks for all tiers in parallel using Promise.all. Aggregate the results to determine overall health status.

Define aggregation rules for health status. The overall status is healthy only if all tiers are healthy. The overall status is degraded if any tier is degraded but all tiers are at least degraded. The overall status is unhealthy if any tier is unhealthy. This conservative approach ensures that tier issues surface in monitoring.

Include per-tier health in the details field of the aggregated health response. Report the status, latency, and details for each tier individually. This granular information helps operators diagnose which tier is causing problems.

Measure health check latency as the maximum latency across all tiers since health checks run in parallel. Include aggregate latency and per-tier latency in the health response.

Consider implementing a circuit breaker per tier. If a tier's health checks fail repeatedly, mark that tier as unavailable and exclude it from operations until it recovers. This prevents operations from repeatedly attempting to use failed tiers.

**Acceptance**: Health accurately reflects all tier states. Aggregation rules make sense for monitoring. Per-tier details enable debugging. Circuit breakers prevent repeated failures. Health checks complete quickly.

**Subtask 2.3.3: Implement Metrics Aggregation**

Implement metrics aggregation that combines metrics from all tiers while also tracking tier-specific statistics.

Override getMetrics to aggregate metrics from all tiers. Sum hit counts across all tiers to get total hits. Sum miss counts across all tiers to get total misses. Calculate overall hit rate from total hits and misses.

Track tier-specific hit rates to show cache effectiveness at each tier. A high hit rate in the memory tier indicates effective local caching. A high hit rate in the Redis tier but low in memory indicates frequently accessed data that should be in memory.

Track promotion and demotion statistics. Count how many values are promoted from slower to faster tiers. Count how many values are demoted from faster to slower tiers due to eviction. These statistics show how effectively data migrates between tiers.

Include tier-specific metrics in the returned CacheMetrics object. Extend the interface if necessary to include per-tier breakdown alongside aggregate metrics. This detailed view helps tune tier sizes and TTLs for optimal performance.

Calculate average latency as the weighted average across tiers based on operation count at each tier. This provides an accurate picture of overall cache performance.

**Acceptance**: Metrics accurately reflect multi-tier behavior. Aggregate metrics show overall cache performance. Tier-specific metrics show per-tier effectiveness. Promotion statistics show tier interaction. Metrics help optimize tier configuration.

**Subtask 2.3.4: Write Tests**

Create the file `shared/core/src/caching/adapters/__tests__/multi-tier-adapter.test.ts` containing tests verifying tier coordination.

Test read cascade behavior by setting a value in only the Redis tier. Perform a get operation and verify it returns the value. Verify the value is now in both memory and Redis tiers after promotion. This test verifies that read cascade correctly promotes values.

Test write propagation by setting a value through the multi-tier adapter. Verify the value appears in all tiers. Update the value and verify all tiers receive the update. This test verifies write-through propagation works correctly.

Test tier promotion on cache hits. Set a value in Redis but not memory. Access the value repeatedly. Verify that subsequent accesses hit the memory tier, shown by memory tier metrics increasing. This test verifies promotion improves subsequent access performance.

Test behavior when tiers fail. Mock one tier to return errors. Verify that operations still succeed using the remaining healthy tier. Verify that metrics reflect degraded operation. Verify that the failed tier is retried eventually. This test verifies graceful degradation.

Test write-behind mode if implemented. Enable write-behind and set a value. Verify the value appears immediately in the fast tier. Wait briefly and verify it propagates to slower tiers. This test verifies asynchronous write propagation works correctly.

Test clear propagates to all tiers. Set values in multiple tiers with different prefixes. Clear the multi-tier cache. Verify all tiers are cleared. This test verifies coordinated cleanup works correctly.

**Acceptance**: Tests verify tier coordination is correct. Read cascade tests verify promotion works. Write propagation tests verify synchronization. Failure tests verify graceful degradation. Tests cover both write-through and write-behind modes.

**Subtask 2.3.5: Create Performance Comparison**

Create performance benchmarks comparing multi-tier cache to single-tier alternatives, demonstrating the benefits of combining tiers.

Benchmark single-tier memory cache as a baseline. Measure operations per second and latency for get and set operations. This establishes the upper bound for local-only performance.

Benchmark single-tier Redis cache as another baseline. Measure operations per second and latency. This shows the performance characteristics of distributed caching without local acceleration.

Benchmark multi-tier cache with memory and Redis tiers. Measure initial access performance when values are only in Redis. Measure subsequent access performance after promotion to memory. Calculate the percentage of accesses that hit memory tier versus Redis tier.

Compare hit rates across configurations. The multi-tier cache should achieve higher effective hit rates than either single tier alone because it combines fast local caching with shared distributed caching.

Measure the performance benefit of promotion. Show that after promotion, accesses are as fast as pure memory cache. Calculate how many accesses need to occur before promotion cost is recovered by faster subsequent accesses.

Document optimal tier configurations based on benchmark results. Recommend memory tier size as a percentage of working set size. Recommend when multi-tier caching provides significant benefits versus when single-tier is sufficient.

Create visualizations showing performance characteristics across different access patterns including uniform access, skewed access with hot keys, and temporal locality where recently accessed keys are accessed again soon.

**Acceptance**: Benchmarks show multi-tier benefits clearly. Comparisons include single-tier baselines. Hit rate improvements are measurable. Configuration recommendations are data-driven. Results are visualized clearly.

**Dependencies**: Task 2.1 (memory adapter), Task 2.2 (Redis adapter) must be complete to compose them in multi-tier

**Testing Strategy**: Integration tests with real memory and Redis tiers verify correctness. Performance tests measure tier benefits quantitatively. Failure mode tests with mocked failed tiers verify resilience. Tests should use representative access patterns that demonstrate multi-tier advantages.

---

### **Task 2.4: Implement Cache Factory**

**Priority**: Critical | **Effort**: 2 days | **Requirements**: REQ-CACHE-002

**Objective**: Create centralized cache factory for consistent instantiation and lifecycle management.

The cache factory provides the single entry point for creating cache instances throughout the application. By centralizing cache creation, the factory enables consistent configuration validation, automatic observability integration, and coordinated lifecycle management. This factory consolidates the various ad-hoc cache creation patterns currently scattered throughout the codebase.

**Deliverables**:

* CacheFactory with methods for all adapter types  
* Cache registry for lifecycle coordination  
* Configuration validation  
* Factory tests

**Subtask 2.4.1: Implement Factory**

Create the file `shared/core/src/caching/factory.ts` implementing the CacheFactory class.

Define create methods for each adapter type. Implement createMemoryCache accepting MemoryCacheConfig and returning MemoryCacheAdapter. Implement createRedisCache accepting RedisCacheConfig and returning RedisCacheAdapter. Implement createMultiTierCache accepting MultiTierConfig and returning MultiTierCacheAdapter. Implement createAICache accepting AICacheConfig and returning specialized AI cache adapter.

Implement configuration validation before instantiation. For each create method, validate that the configuration contains all required fields with valid values. Check that TTL is positive, maxSize is positive if specified, Redis connection parameters are present for Redis caches, and tier configurations are valid for multi-tier caches. If validation fails, return an error Result describing what configuration is invalid and why.

Register created caches in an internal registry implemented as a Map keyed by cache name. When a cache is created, store it in the registry. This registry enables coordinated shutdown of all caches and prevents duplicate cache creation with the same name.

Implement a shutdownAll method that coordinates cleanup of all registered caches. Iterate through the registry calling shutdown on each cache. Use Promise.all to shut down caches in parallel. Handle shutdown failures gracefully by logging errors but continuing to shut down remaining caches. Return a Result indicating whether all shutdowns succeeded.

Implement a getCacheByName method allowing retrieval of previously created caches. This supports cache reuse across different parts of the application without passing cache instances through many layers.

Handle initialization errors by returning error Results. If cache adapter initialization fails, do not register the cache and return the initialization error. This ensures only successfully initialized caches appear in the registry.

**Acceptance**: Factory creates all adapter types correctly. Configuration validation catches invalid configs before attempting creation. Cache registry tracks all instances. shutdownAll coordinates cleanup. Factory methods return error Results for failures rather than throwing.

**Subtask 2.4.2: Add Observability Integration**

Integrate the cache factory with the observability stack so that all created caches automatically emit metrics and logs.

Accept an ObservabilityStack instance in the factory constructor. Store the observability stack and use it to instrument created caches.

When creating a cache, wrap the adapter with observability instrumentation. For each cache operation, emit metrics indicating cache name, operation type (get, set, delete), success or failure, and latency. For errors, emit error logs with full context including cache name, operation, key, and error details. For significant events like initialization, shutdown, and health check failures, emit appropriate log levels (info for initialization, error for failures).

Ensure correlation IDs propagate through cache operations. When cache operations execute as part of a request, include the current correlation ID in emitted logs and metrics. This enables tracing cache behavior back to specific requests.

Add cache-specific metrics to the metrics collector. Emit counters for cache operations with tags for cache name and operation type. Emit histograms for operation latency with the same tags. Emit gauges for cache size if the adapter supports size reporting. These metrics enable comprehensive monitoring of caching behavior across all cache instances.

Create a cache-specific logger from the observability stack's logger. Use a structured logging format that includes cache name and adapter type in every log entry. This makes filtering cache-related logs easy in log aggregation systems.

**Acceptance**: Created caches integrate with observability automatically without adapter changes. Metrics include cache name, operation, and outcome. Logs include correlation IDs and cache context. Developers don't need to manually instrument caches. Observability integration works consistently across all adapter types.

**Subtask 2.4.3: Implement Dependency Injection Support**

Add dependency injection support to the factory, enabling testing with mock adapters and supporting custom adapter implementations.

Allow providing custom adapter implementations through factory configuration. Accept an optional adapters configuration object mapping adapter types to factory functions. When creating a cache, check if a custom factory is registered for that type. If so, use the custom factory instead of the default implementation. This enables testing with mock adapters and supports extending the factory with new adapter types without modifying the core factory.

Implement an injectAdapter method that registers custom adapter factories. Accept an adapter type string and a factory function that creates adapters of that type. Store the mapping in the factory. Subsequent calls to create methods of that type will use the injected factory.

Document dependency injection patterns for testing. Show examples of creating mock cache adapters that record calls for verification. Show examples of creating spy adapters that delegate to real adapters while tracking invocations. Show examples of creating adapters with injected failures for testing error handling.

Support providing a pre-configured ObservabilityStack for testing. Accept ObservabilityStack in the factory constructor as optional. If not provided, create a default no-op observability stack. This allows tests to run without setting up full observability infrastructure.

Create helper functions for common test scenarios. Provide createTestFactory that returns a factory configured with no-op observability. Provide createMockCache that returns a cache adapter that records all calls. These helpers reduce test boilerplate.

**Acceptance**: Factory supports dependency injection of custom adapters. Tests can provide mock implementations. Documentation shows testing patterns. Helper functions reduce test boilerplate. DI support doesn't complicate production usage.

**Subtask 2.4.4: Write Tests**

Create the file `shared/core/src/caching/__tests__/factory.test.ts` containing comprehensive factory tests.

Test factory creates all adapter types correctly. Call each create method with valid configuration. Verify the returned adapter is of the expected type. Verify the adapter initializes successfully. Verify the adapter is registered in the factory's cache registry.

Test configuration validation catches errors. Call create methods with invalid configurations including missing required fields, negative values where positive is required, invalid connection strings, and malformed nested configurations. Verify that each invalid configuration returns an error Result with helpful error messages describing what is wrong and how to fix it.

Test cache registry tracks instances correctly. Create multiple caches with different names. Verify getCacheByName returns the correct cache for each name. Verify that attempting to create a cache with a duplicate name either returns the existing instance or returns an error, depending on the desired behavior.

Test shutdownAll coordinates cleanup properly. Create multiple caches. Call shutdownAll. Verify that shutdown is called on each cache exactly once. Verify that the factory waits for all shutdowns to complete. Verify that shutdown failures don't prevent other caches from shutting down.

Test observability integration works correctly. Inject a mock ObservabilityStack that records all calls. Create a cache and perform operations. Verify that metrics are emitted for each operation. Verify that logs include the cache name and correlation IDs. Verify that no observability calls throw exceptions or interfere with cache operations.

Test dependency injection enables mocking. Inject a mock adapter factory. Create a cache of that type. Verify the mock factory is called. Verify the returned adapter is the mock. This test confirms that testing with mocks works as designed.

Test concurrent factory usage. Create multiple caches concurrently using Promise.all. Verify all caches initialize correctly. Verify the registry contains all caches. Verify no race conditions occur during concurrent initialization.

**Acceptance**: All factory features have test coverage. Tests verify creation of all adapter types. Configuration validation tests cover common errors. Registry tests verify tracking and retrieval. Shutdown tests verify coordination. Observability integration tests verify instrumentation. Tests achieve one hundred percent coverage of factory code.

**Dependencies**: Task 2.1 (memory adapter), Task 2.2 (Redis adapter), Task 2.3 (multi-tier adapter), Task 1.3 (observability interfaces)

**Testing Strategy**: Unit tests verify factory methods with mocked adapters. Integration tests verify factory creates real adapters correctly. Tests use dependency injection to avoid real Redis for most tests. Configuration validation tests use invalid configs to verify error handling. Observability integration tests use mock observability stack to verify instrumentation.

---

### **Task 2.5: Consolidate Middleware Factory**

**Priority**: Critical | **Effort**: 5 days | **Requirements**: REQ-MIDDLEWARE-001, REQ-MIDDLEWARE-002

**Objective**: Consolidate factory.ts, enhanced-factory.ts, and unified.ts into single MiddlewareFactory with dependency injection and provider-based extensibility.

The middleware consolidation addresses one of the most visible pain points in the current architecture. Three different factory patterns coexist, creating confusion about which to use and duplicating logic. The unified MiddlewareFactory establishes a single pattern that supports all current use cases while providing clear extension points for custom middleware.

**Deliverables**:

* Unified MiddlewareFactory supporting all patterns  
* Dependency injection through ServiceContainer  
* Provider-based extensibility  
* Migration guide from old factories

**Subtask 2.5.1: Create ServiceContainer**

Create the file `shared/core/src/middleware/container.ts` defining the ServiceContainer interface and default implementation.

Define the ServiceContainer interface with getter methods for all services that middleware commonly needs. Include getLogger returning a Logger instance for logging middleware actions. Include getMetrics returning a MetricsCollector for emitting middleware metrics. Include getCache returning a CacheAdapter for middleware that implements caching. Include getConfig returning a ConfigManager for accessing application configuration. Include getCorrelationManager returning the correlation manager for accessing request context.

Implement DefaultServiceContainer class that implements ServiceContainer. Accept actual service instances in the constructor. Services can be provided explicitly or created with defaults. Store services in private fields. Implement getters that return stored services.

Support lazy initialization of services to avoid creating services that aren't used. For each service, check if it has been initialized. If not, initialize it on first access using a factory function. Store the initialized service for subsequent accesses. This lazy approach reduces startup time and memory usage when some middleware don't use all services.

Document which services are required versus optional. Logger and metrics are required since all middleware should emit observability signals. Cache is optional since only caching middleware needs it. Config is required for accessing feature flags and environment-specific settings. CorrelationManager is required for request tracking.

Implement a builder pattern for constructing ServiceContainers. Provide withLogger, withMetrics, withCache, withConfig, and withCorrelationManager methods that return a new container with the specified service. This fluent interface makes constructing containers readable and flexible.

**Acceptance**: ServiceContainer provides all required services. Default implementation works with real services. Lazy initialization avoids unnecessary setup. Builder pattern makes construction clear. Documentation explains service purposes.

**Subtask 2.5.2: Implement MiddlewareFactory**

Create the file `shared/core/src/middleware/factory.ts` implementing the unified MiddlewareFactory class that replaces all existing factory implementations.

Accept a ServiceContainer in the constructor providing access to shared services. Store the container and use it throughout middleware creation to inject dependencies.

Implement createAuth method accepting AuthConfig and returning authentication middleware. Use the service container to access the logger for logging authentication events, metrics for tracking authentication attempts and failures, and config for accessing JWT secrets or session settings. Create middleware that validates authentication tokens or sessions, attaching user information to the request object on success, and returning 401 Unauthorized on failure.

Implement createRateLimit method accepting RateLimitConfig and returning rate limiting middleware. Use the service container to access cache for storing rate limit counters and metrics for tracking rate limit hits. Support multiple rate limiting algorithms including fixed window, sliding window, and token bucket by delegating to the unified rate limiting service. Create middleware that checks rate limits before allowing requests to proceed and returns 429 Too Many Requests when limits are exceeded.

Implement createValidation method accepting ValidationConfig and returning validation middleware. Use the validation service to validate request body, query parameters, or path parameters based on configuration. Create middleware that runs validation, returns 400 Bad Request with detailed errors if validation fails, and attaches validated data to the request on success.

Implement createErrorHandler method accepting ErrorHandlerConfig and returning error handling middleware. Use the logger to log errors with full context and correlation IDs. Create middleware that catches errors thrown by route handlers, converts them to appropriate HTTP responses, and ensures errors are logged for monitoring.

Implement createCache method accepting CacheMiddlewareConfig and returning response caching middleware. Use the cache adapter from the service container. Create middleware that checks cache before executing the route handler, returns cached responses when available, and caches successful responses based on configuration.

Support middleware ordering and dependencies. Accept an optional dependencies array in configurations specifying which other middleware must run first. Validate that dependencies are satisfied when middleware is registered with the application. Provide clear error messages when dependency requirements are not met.

Document each create method thoroughly with JSDoc. Explain what each middleware does, what configuration options are available, what dependencies are required, and what the middleware attaches to the request object. Include usage examples showing common configurations.

**Acceptance**: Factory creates all middleware types. Dependency injection works correctly. Middleware uses services from the container. Ordering dependencies are validated. All methods are well-documented with examples. The factory supports all use cases from the three legacy factories.

**Subtask 2.5.3: Create Provider System**

Create the file `shared/core/src/middleware/registry.ts` implementing the middleware provider system that enables custom middleware registration.

Define the MiddlewareProvider interface representing middleware creation logic. Include a name field identifying the provider. Include a dependencies array listing services from ServiceContainer that the middleware needs. Include a create method accepting configuration and a ServiceContainer and returning middleware. Include a validate method accepting configuration and returning a Result indicating whether the configuration is valid.

Implement MiddlewareRegistry class that stores and manages providers. Implement registerProvider accepting a MiddlewareProvider and adding it to an internal Map keyed by name. Check for duplicate names and return an error if a provider with that name is already registered.

Implement getProvider accepting a name and returning the registered MiddlewareProvider or null if not found. Implement hasProvider accepting a name and returning a boolean indicating whether a provider is registered.

Implement createMiddleware accepting a provider name, configuration, and ServiceContainer. Look up the provider by name. Validate the configuration using the provider's validate method. If validation fails, return an error with details. If validation succeeds, call the provider's create method passing the configuration and service container. Return the created middleware.

Integrate the registry with MiddlewareFactory. In the factory's create methods, check if a custom provider is registered for the requested middleware type. If so, delegate to the provider instead of using the built-in implementation. This allows applications to override built-in middleware with custom implementations.

Provide standard providers for all built-in middleware types. Create AuthProvider, RateLimitProvider, ValidationProvider, ErrorHandlerProvider, and CacheProvider. Implement each provider with appropriate validation and creation logic. Register these providers by default so the factory works out of the box.

**Acceptance**: Provider interface enables custom middleware. Registry stores and retrieves providers. Factory delegates to providers when available. Standard providers implement built-in middleware. Custom providers can override built-ins. Provider system is extensible and well-documented.

**Subtask 2.5.4: Implement Standard Providers**

Create standard providers in `shared/core/src/middleware/providers/` implementing all built-in middleware types.

Create `auth-provider.ts` implementing AuthProvider. In the validate method, check that configuration includes required fields like secret for JWT auth or sessionStore for session auth. In the create method, return middleware that validates authentication based on the configured auth type. Support JWT tokens in Authorization headers and session cookies. Extract user information and attach it to req.user. Log authentication attempts and emit metrics for successes and failures.

Create `rate-limit-provider.ts` implementing RateLimitProvider. In the validate method, check that configuration includes required fields like maxRequests and windowMs. In the create method, return middleware that implements the specified rate limiting algorithm. Use the cache adapter for storing counters. Generate keys from request IP or custom key extractors. Return 429 when limits are exceeded with a Retry-After header. Emit metrics for rate limit hits.

Create `validation-provider.ts` implementing ValidationProvider. In the validate method, check that configuration includes schemas for validating request parts. In the create method, return middleware that validates the specified request part (body, query, or params) against the schema. Use the validation service to perform validation. Return 400 with structured error details on failure. Attach validated data to req.validated on success.

Create `error-handler-provider.ts` implementing ErrorHandlerProvider. In the validate method, check for any configuration requirements. In the create method, return middleware that catches errors from downstream handlers. Convert BaseError instances to appropriate HTTP responses using their statusCode and toJSON methods. Log all errors with correlation IDs and stack traces. Return generic 500 responses for unexpected errors, filtering details in production.

Create `cache-provider.ts` implementing CacheProvider. In the validate method, check that configuration includes cache and keyGenerator. In the create method, return middleware that checks cache before executing handlers. Generate cache keys using the keyGenerator function. Return cached responses when available. Cache successful responses based on TTL configuration. Respect cache-control headers and conditional requests.

Export all providers through an index file. Document each provider explaining its purpose, configuration options, dependencies, and behavior. Include examples showing common usage patterns.

**Acceptance**: All standard middleware types have providers. Providers implement proper validation. Created middleware works correctly. Providers use ServiceContainer for dependencies. Documentation covers all providers with examples. Providers integrate seamlessly with the factory.

**Subtask 2.5.5: Create Legacy Adapters**

Create legacy adapters in `shared/core/src/middleware/legacy-adapters/` that wrap old factory implementations.

Create `factory-adapter.ts` wrapping exports from the old factory.ts. Export functions matching the old factory's API signature. Internally, delegate to the new MiddlewareFactory. Accept old-style configuration objects and convert them to the new configuration format. Return middleware created by the new factory. This adapter allows code using the old factory to work without changes.

Create `enhanced-factory-adapter.ts` wrapping exports from enhanced-factory.ts. Follow the same pattern of matching the old API while delegating to new implementations. Convert enhanced-factory's configuration format to the unified format. Handle any enhanced-factory-specific features by implementing them in the new factory or providing equivalent alternatives.

Create `unified-adapter-adapter.ts` (yes, adapter for the unified module) wrapping exports from unified.ts. Match the unified.ts API exactly while delegating to the new MiddlewareFactory. Since unified.ts was already attempting to unify patterns, its adapter should be straightforward.

Add deprecation warnings to all legacy adapters. Use the deprecation system from the primitives layer to log warnings when legacy functions are called. Include the sunset date and migration path in warnings. Track deprecation usage through metrics to understand migration progress.

Create a migration guide in `shared/core/src/middleware/MIGRATION.md` explaining how to migrate from each legacy factory to the new MiddlewareFactory. Provide side-by-side code examples showing old and new patterns. Explain the benefits of migrating including better type safety, dependency injection, and extensibility. Link to detailed documentation for each provider.

Test legacy adapters extensively. For each adapter, test that it produces middleware equivalent to what the old factory produced. Run existing tests against both old and new implementations to verify behavioral equivalence. This testing provides confidence that migration won't break existing functionality.

**Acceptance**: Legacy adapters match old API signatures exactly. Delegation to new factory works correctly. Deprecation warnings guide migration. Migration guide is comprehensive with examples. Tests verify behavioral equivalence. Existing code works without modification.

**Subtask 2.5.6: Write Tests**

Create comprehensive tests in `shared/core/src/middleware/__tests__/` verifying the unified middleware factory.

Test factory creates all middleware types correctly. For each middleware type, provide valid configuration and verify the created middleware functions correctly. Test authentication middleware with valid and invalid tokens. Test rate limiting middleware with requests under and over the limit. Test validation middleware with valid and invalid data. Test error handling middleware with various error types. Test cache middleware with cold and warm cache scenarios.

Test dependency injection works as expected. Create a mock ServiceContainer with mock services. Create middleware using the factory with the mock container. Verify the created middleware uses the mocked services by checking that mock methods are called appropriately.

Test provider registration and custom providers. Register a custom provider for a middleware type. Create middleware of that type. Verify the custom provider's create method is called. Verify the returned middleware is the custom implementation. This confirms extensibility works as designed.

Test configuration validation catches errors. Provide invalid configuration to each create method. Verify validation errors are returned as Results with helpful messages. Test validation of required fields, type checking, and value constraints.

Test middleware ordering and dependency validation. Configure middleware with dependency requirements. Verify the factory validates dependencies are satisfied. Test that missing dependencies produce clear error messages.

Test legacy adapter equivalence. For each legacy adapter, test that it produces middleware functionally equivalent to the old implementation. Run the same test cases against both old and new implementations. This regression testing ensures migration safety.

Test error handling throughout the factory. Simulate failures in service creation, provider registration, and middleware instantiation. Verify all failures are handled gracefully with appropriate error Results and logging.

Test concurrent factory usage. Create multiple middleware instances concurrently. Verify thread safety and that no race conditions occur.

**Acceptance**: Tests cover all factory methods. Dependency injection tests verify service usage. Provider tests verify extensibility. Validation tests cover common errors. Legacy adapter tests verify equivalence. Error handling tests verify robustness. Tests achieve high coverage of middleware factory code.

**Dependencies**: Task 1.3 (observability interfaces for ServiceContainer), Task 1.2 (cache interface for cache middleware), Task 2.4 (cache factory for obtaining cache instances)

**Testing Strategy**: Unit tests verify factory methods with mocked dependencies. Integration tests verify middleware works with real services. Equivalence tests verify legacy adapters produce same behavior as old factories. End-to-end tests verify middleware integrates correctly in a real Express application. Tests use dependency injection extensively to avoid complex test setup.

---

## **Phase 3: Observability & Validation (Weeks 6-7)**

Phase three completes the observability stack integration and consolidates the validation system. This phase ensures that all infrastructure components emit appropriate signals and that validation follows consistent patterns throughout the application. By the end of this phase, the shared core provides comprehensive observability and type-safe validation for all consuming services.

### **Task 3.1: Implement Observability Stack**

**Priority**: Critical | **Effort**: 4 days | **Requirements**: REQ-OBS-001, REQ-OBS-002

**Objective**: Implement the complete ObservabilityStack class that coordinates logging, metrics, tracing, and health checks.

**Deliverables**:

* Complete ObservabilityStack implementation  
* Logger, MetricsCollector, Tracer, and HealthChecker implementations  
* Correlation ID propagation working across async boundaries  
* Observability integration tests

**Subtask 3.1.1: Implement Logger**

Create the file `shared/core/src/observability/logging/logger.ts` implementing the Logger interface defined in Task 1.3.

Implement log methods for each level: debug, info, warn, and error. Each method should accept a message string and optional metadata object. Format log entries as structured JSON in production or pretty-printed text in development based on configuration.

Automatically include correlation IDs in every log entry by reading from the correlation manager. Include timestamp, log level, message, correlation ID, and metadata in each entry. Never log sensitive information like passwords or tokens.

Support log levels that filter messages based on configured threshold. If log level is set to warn, only warn and error messages are emitted. Implement efficient level checking to avoid expensive formatting when messages will be filtered.

Implement log rotation for file-based logging. When log files reach configured size limits, rotate to a new file. Keep a configured number of old log files before deleting. Ensure rotation happens atomically to prevent log loss.

Integrate with external logging services. Support exporting logs to Elasticsearch, Splunk, or CloudWatch Logs based on configuration. Buffer log entries and batch export to reduce overhead. Handle export failures gracefully by falling back to local logging.

Implement structured logging that makes logs easily query-able. Use consistent field names across all log entries. Use nested objects for related fields. Include contextual information like service name, host name, and environment in every entry.

**Acceptance**: Logger implements all required methods. Correlation IDs appear in all entries. Log levels work correctly. File rotation works reliably. Structured logging produces query-able output. Integration with external services works.

**Subtask 3.1.2: Implement MetricsCollector**

Create the file `shared/core/src/observability/metrics/registry.ts` implementing the MetricsCollector interface.

Implement counter method for tracking occurrences. Accept a metric name and optional tags. Increment an internal counter. Support atomic updates for thread safety. Emit counters as deltas or cumulative totals based on exporter requirements.

Implement gauge method for recording instantaneous values. Accept a metric name, value, and optional tags. Store the current value, replacing any previous value. Gauges represent current state like queue depth or connection count.

Implement histogram method for measuring distributions. Accept a metric name, value, and optional tags. Track value distribution using quantiles or histograms. Calculate common percentiles like p50, p95, p99 for latency measurements. Use efficient histogram implementations to avoid unbounded memory growth.

Support metric naming conventions that organize metrics hierarchically. Use the pattern service.component.metric\_name. Validate metric names match the pattern. Reject invalid names with helpful error messages.

Implement metric tagging for multi-dimensional metrics. Accept tags as key-value pairs. Include common tags like environment, host, and service\_name automatically. Support tag filtering in queries to drill down into specific dimensions.

Integrate with metric exporters. Support Prometheus exposition format for pull-based metrics. Support StatsD protocol for push-based metrics. Support CloudWatch metrics API for AWS deployments. Buffer metrics and export periodically based on configuration.

Implement metric aggregation for efficiency. When exporting, aggregate metrics across time windows rather than exporting every individual measurement. Calculate sums, averages, minimums, maximums as appropriate for each metric type.

**Acceptance**: MetricsCollector implements all metric types. Counters, gauges, and histograms work correctly. Naming conventions are enforced. Tags enable multi-dimensional analysis. Exporters work with external systems. Aggregation reduces export overhead.

**Subtask 3.1.3: Implement Tracer**

Create the file `shared/core/src/observability/tracing/tracer.ts` implementing the Tracer interface.

Implement startSpan method to begin new trace spans. Accept a span name and optional parent span. Generate a unique span ID. Record the start timestamp. Store the span in AsyncLocalStorage to make it accessible to child operations. Return a span object that can be used to add attributes and end the span.

Implement currentSpan method to access the active span. Read from AsyncLocalStorage to get the span for the current async context. Return null if no span is active. This allows code to add attributes to the current span without explicitly passing span objects.

Implement inject method to serialize trace context for propagation. Accept a span and return headers representing the trace context. Support W3C Trace Context standard for interoperability. Include trace ID, span ID, and sampling decision in serialized context.

Implement extract method to deserialize trace context from incoming requests. Accept headers and reconstruct the parent span context. Use the parent context when starting spans for the request. This enables distributed tracing across service boundaries.

Integrate with AsyncLocalStorage to maintain trace context across async operations. Store the current span in AsyncLocalStorage. Ensure spans are accessible within callbacks, promises, and async functions. Test extensively to verify context propagates correctly.

Support span attributes for adding context. Allow attaching key-value pairs to spans. Include common attributes like http.method, http.status\_code, and error information automatically. Support custom attributes for domain-specific context.

Implement sampling to control overhead. Support probability-based sampling where only a percentage of traces are recorded. Support rate-based sampling where a maximum number of traces per second are recorded. Always sample error traces regardless of sampling configuration.

Integrate with trace exporters. Support Jaeger for open-source tracing. Support Zipkin for compatibility. Support OTLP (OpenTelemetry Protocol) for vendor-neutral export. Buffer spans and export in batches for efficiency.

**Acceptance**: Tracer creates and manages spans correctly. Trace context propagates across async boundaries. Inject and extract enable distributed tracing. Sampling controls overhead appropriately. Exporters send traces to external systems. Integration tests verify end-to-end tracing.

**Subtask 3.1.4: Implement HealthChecker**

Create the file `shared/core/src/observability/health/health-checker.ts` implementing the HealthChecker interface.

Implement registerCheck method to add health checks. Accept a check name and a function that performs the check. Store checks in a Map. Validate that check names are unique. Health check functions should return HealthStatus or throw errors.

Implement checkHealth method to execute all checks and aggregate results. Execute all registered checks in parallel using Promise.all. Collect results and determine overall health status. Cache results based on configured TTL to prevent expensive checks from running too frequently.

Implement health status aggregation logic. Overall status is healthy only if all checks are healthy. Overall status is degraded if any check is degraded but no checks are unhealthy. Overall status is unhealthy if any check is unhealthy. Include per-check details in the aggregated response.

Implement circuit breakers for checks that fail repeatedly. Track failures for each check. After a configured number of consecutive failures, open the circuit to prevent further check attempts. After a cooling-off period, allow a probe attempt. If the probe succeeds, close the circuit and resume normal checking.

Support disabling and enabling checks dynamically. Implement disableCheck and enableCheck methods. Disabled checks are skipped and don't contribute to overall health status. This enables temporarily bypassing problematic checks without unregistering them.

Implement built-in health checks for common dependencies. Provide database health check that tests connectivity and query execution. Provide cache health check that tests read and write operations. Provide external service health check that tests endpoint availability. Register these standard checks automatically based on configuration.

Include version information in health responses. Include application version, build timestamp, and commit hash. This information helps operators understand which version is running and whether deployments succeeded.

**Acceptance**: HealthChecker registers and executes checks correctly. Aggregation logic produces appropriate overall status. Circuit breakers prevent cascading failures. Built-in checks cover common dependencies. Health responses include useful diagnostics. Caching prevents excessive check execution.

**Subtask 3.1.5: Implement ObservabilityStack**

Create the file `shared/core/src/observability/index.ts` implementing the ObservabilityStack class that coordinates all observability components.

In the constructor, accept ObservabilityConfig and create instances of Logger, MetricsCollector, Tracer, and HealthChecker based on configuration. Validate configuration and fail fast if required settings are missing.

Implement initialization flow that sets up components in the correct order. First initialize the correlation manager since other components depend on it. Then initialize the logger so subsequent initialization can be logged. Initialize metrics and tracing in parallel. Finally initialize health checking with checks for other components.

Implement wire correlation Propagation method that ensures correlation IDs propagate through all observability signals. Hook into the correlation manager's context storage to automatically include correlation IDs in logs, add them as span attributes in traces, and include them as metric tags when appropriate. Test propagation extensively with nested async operations to ensure context never gets lost.

Implement getter methods that provide access to initialized components. The getLogger method returns the logger instance. The getMetrics method returns the metrics collector. The getTracer method returns the tracer. The getHealth method returns the health checker. These methods enable other parts of the system to access observability services through the stack rather than managing separate references.

Implement request lifecycle methods that applications call at request boundaries. The startRequest method generates a new correlation ID, stores it in AsyncLocalStorage, and starts a trace span for the request. The endRequest method finalizes the trace span and clears the correlation context. These methods ensure proper initialization and cleanup of request-scoped observability state.

Implement coordinated shutdown method that cleans up all observability components gracefully. Close log file handles to flush buffered writes. Export final metrics to ensure no data is lost. Flush trace spans to exporters. Mark the application as shutting down in health checks. Wait for cleanup to complete with a timeout to prevent hanging during shutdown.

Integrate all components so they work together cohesively. When the logger emits error logs, increment an error metric automatically. When traces include error spans, emit error logs with trace context. When health checks fail, emit both logs and metrics. This integration ensures comprehensive visibility without requiring manual coordination in application code.

Document the ObservabilityStack thoroughly explaining its role as the central coordination point for all observability concerns. Provide examples showing how to initialize the stack at application startup, how to access observability services through the stack, and how to properly shut down the stack during application termination.

**Acceptance**: The ObservabilityStack coordinates all components successfully. Initialization happens in the correct order. Correlation IDs propagate through all signals. Request lifecycle methods manage context appropriately. Shutdown coordinates cleanup without data loss. Components integrate cohesively. Integration tests verify end-to-end observability functionality.

**Subtask 3.1.6: Write Integration Tests**

Create comprehensive integration tests in `shared/core/src/observability/__tests__/integration.test.ts` verifying that all observability components work together correctly.

Test correlation ID propagation through a complete request lifecycle. Initialize the observability stack. Start a request using startRequest. Emit logs from nested functions. Record metrics from nested operations. Create trace spans for nested calls. Verify that all logs, metrics, and spans include the same correlation ID. This test confirms that correlation context maintains integrity throughout complex async operations.

Test distributed tracing across simulated service boundaries. Start a span and inject trace context into headers. Simulate sending a request to another service by extracting context from headers and creating a child span. Verify the child span correctly references the parent. Verify the complete trace reconstructs properly when exported. This test confirms distributed tracing works correctly.

Test health check aggregation with mixed component states. Register health checks that return different statuses. Some return healthy, some return degraded, some return unhealthy. Verify overall health status aggregates correctly according to the defined rules. Verify per-check details are included in the response. This test confirms health aggregation logic works as designed.

Test metric collection and export. Record counters, gauges, and histograms through the metrics collector. Trigger metric export. Verify exported metrics include all recorded values with correct formats for each exporter type. This test confirms the complete metrics pipeline works end to end.

Test log output and rotation. Emit logs at various levels with different metadata. Verify logs are formatted correctly for configured output format. Fill log files to trigger rotation. Verify rotation happens correctly and old files are managed according to configuration. This test confirms logging infrastructure works reliably under load.

Test observability under error conditions. Simulate failures in exporters, file systems, and external services. Verify the observability stack continues operating and falls back gracefully. Verify errors in observability infrastructure do not crash the application. This test confirms robustness and graceful degradation.

Test performance overhead of observability. Measure request throughput and latency with and without observability enabled. Verify that observability adds acceptable overhead, typically less than five percent for most operations. Identify any performance hotspots and optimize them. This test ensures observability does not significantly impact application performance.

**Acceptance**: Integration tests verify all components work together. Correlation propagation tests cover complex async scenarios. Distributed tracing tests verify cross-service context propagation. Health aggregation tests verify status logic. Metric export tests verify the complete pipeline. Log tests verify output and rotation. Error handling tests verify robustness. Performance tests verify acceptable overhead.

**Dependencies**: Task 1.3 provided the interfaces. This task implements those interfaces completely.

**Testing Strategy**: Integration tests use real implementations rather than mocks to verify actual behavior. Tests simulate realistic request patterns including nested operations and error conditions. Performance tests establish baseline overhead measurements. Tests run in CI/CD to catch regressions. Docker containers provide external dependencies like metric collectors for testing.

---

### **Task 3.2: Implement Unified Validation System**

**Priority**: High | **Effort**: 3 days | **Requirements**: REQ-VAL-001, REQ-VAL-002

**Objective**: Consolidate validation schemas and create consistent validation middleware that works identically across all endpoints.

The validation system currently uses multiple validators in different patterns across the codebase. This consolidation establishes a single validation service that supports multiple validator libraries while providing consistent error handling and type safety. By centralizing validation, the implementation ensures predictable behavior and makes validation schemas easily discoverable and reusable.

**Deliverables**:

* ValidationService supporting multiple validators  
* Centralized validation schemas organized by domain  
* Consistent validation middleware  
* Validation error handling

**Subtask 3.2.1: Implement ValidationService**

Create the file `shared/core/src/validation/core/validation-service.ts` implementing the ValidationService interface.

Implement the validate method that accepts a ValidationSchema and data to validate. The method should determine which validator to use based on the schema type discriminator. For Zod schemas, use Zod's parse or safeParse methods. For Joi schemas, use Joi's validate method. For custom schemas, call the provided validate function. Return validated data wrapped in a successful Result if validation passes. Return validation errors wrapped in an error Result if validation fails.

Implement consistent error transformation that converts validator-specific errors into the standard ValidationError format. Zod errors contain an issues array that needs to be mapped to the ValidationError format. Joi errors contain a details array requiring similar mapping. Extract the field path, invalid value, violated rule, and error message from each validator's error format. Create ValidationError instances that present errors consistently regardless of which validator produced them.

Implement type inference for validated data. When validation succeeds, the returned Result should contain data typed according to the schema. Zod provides excellent TypeScript integration with automatic type inference. Joi requires manual type annotations. Custom validators should accept a generic type parameter. Ensure type safety throughout the validation pipeline so developers get compile-time checking of validated data access.

Implement the createMiddleware method that generates Express middleware from validation schemas. The middleware should extract the target data from the request based on configuration, typically the request body, query parameters, or path parameters. Run validation using the validate method. If validation fails, return a four hundred Bad Request response with structured error details. If validation succeeds, attach the validated data to the request object at req.validated to provide type-safe access in route handlers.

Implement schema registry methods for managing reusable schemas. The registerSchema method accepts a name and schema, storing them in an internal Map. The getSchema method retrieves schemas by name. The registry enables centralized schema definitions that can be referenced throughout the application without duplication.

Support validation options that control validator behavior. Implement stripUnknown option that removes unrecognized fields from validated data, useful for security. Implement abortEarly option that controls whether validation stops at the first error or collects all errors. Implement strict mode that rejects additional properties not defined in the schema.

Document the validation service thoroughly explaining when to use each validator type. Zod works best for schemas that need tight TypeScript integration and type inference. Joi works better for complex asynchronous validation rules. Custom validators handle domain-specific validation logic that built-in validators cannot express.

**Acceptance**: ValidationService validates data using multiple validators. Error transformation produces consistent error structures. Type inference works correctly for TypeScript. Middleware generation creates working Express middleware. Schema registry enables reuse. Validation options control behavior. Documentation explains validator selection.

**Subtask 3.2.2: Create Common Validation Schemas**

Create reusable validation schemas in `shared/core/src/validation/schemas/` organized by domain.

Create `auth.ts` containing authentication-related schemas. Define email schema that validates email format with strict regex. Define password schema that enforces length requirements, character diversity, and common password checks. Define username schema with allowed characters and length limits. Define registration schema combining email, password, and username with additional fields like name. Define login schema with email and password. These schemas ensure consistent validation of authentication data throughout the application.

Create `common.ts` containing frequently used validation building blocks. Define UUID schema that validates UUID format. Define date schema that validates and parses date strings. Define pagination schema with page number and page size. Define sort schema with field and direction. Define ID schema for database identifiers. These common schemas are imported and composed into larger schemas.

Create `property.ts` containing domain-specific schemas for the bill tracking system. Define bill status schema limiting values to valid statuses. Define comment schema with text, author, and timestamps. Define vote schema with direction and reasoning. Define tag schema with name and color. These schemas encode domain knowledge about valid values and combinations.

Implement schema composition that builds complex schemas from simpler building blocks. For example, a bill creation schema combines title, description, status from property schemas with author from auth schemas. Composition reduces duplication and ensures consistency when the same field appears in multiple schemas.

Add helpful error messages to all schemas. Rather than generic "invalid value" messages, provide specific guidance like "password must be at least eight characters with one uppercase, one lowercase, and one number". Good error messages improve developer experience during development and user experience when validation errors reach end users.

Document each schema file explaining its purpose and providing usage examples. Show how to use individual schemas and how to compose them into larger schemas. Include examples of validating data and handling validation errors. This documentation makes schemas discoverable and encourages reuse.

Export all schemas through a central index file that organizes exports by domain. This makes importing schemas convenient and provides a clear entry point for discovering available schemas.

**Acceptance**: Schemas cover authentication, common patterns, and domain-specific validation. Schema composition enables building complex validators from simple parts. Error messages are helpful and specific. Documentation explains schema purpose and usage. Schemas are easily discoverable through organized exports.

**Subtask 3.2.3: Implement Validation Middleware**

Create validation middleware in `shared/core/src/validation/middleware/` that provides consistent validation behavior across all endpoints.

Create `middleware.ts` implementing the validation middleware factory. The createValidationMiddleware function should accept a schema and target (body, query, or params) and return Express middleware. The middleware extracts data from the specified target, validates it using the ValidationService, and returns errors or attaches validated data appropriately.

Implement request body validation that parses and validates POST and PUT request bodies. Handle JSON parsing errors gracefully, returning clear error messages when request bodies contain invalid JSON. Validate parsed data against the schema. Return four hundred Bad Request with detailed field errors when validation fails. Attach validated data to req.validated.body when validation succeeds, providing type-safe access in handlers.

Implement query parameter validation for GET requests. Parse query parameters handling type coercion for numbers and booleans since query parameters arrive as strings. Validate parsed parameters. Return errors for invalid query parameters. Attach validated query parameters to req.validated.query.

Implement path parameter validation for route parameters like user IDs in paths. Extract parameters from req.params. Validate against schemas, typically checking that IDs are valid UUIDs or integers. Return four hundred for invalid path parameters. Attach validated params to req.validated.params.

Implement validation error responses that follow a consistent structure. Return JSON responses with an error object containing a validation error code, human-readable message, and an errors array with details for each validation failure. Each error detail includes the field path, invalid value, violated rule, and specific error message. This structure enables clients to display field-specific errors in forms.

Support conditional validation where validation rules change based on request context. For example, update requests might make some required fields optional, or admin users might have different validation rules than regular users. Implement this through validator composition or dynamic schema selection based on middleware configuration.

Implement validation performance optimizations. Compile and cache validation schemas rather than recompiling on every request. For Zod, this means reusing parsed schema objects. For Joi, this means compiling schemas once. For custom validators, this means avoiding expensive setup on each invocation. These optimizations ensure validation adds minimal overhead.

**Acceptance**: Validation middleware works for body, query, and params. Error responses follow a consistent structure. Validated data attaches to req.validated with proper types. Conditional validation supports context-dependent rules. Performance optimizations minimize overhead. Middleware integrates smoothly with Express.

**Subtask 3.2.4: Write Validation Tests**

Create comprehensive validation tests in `shared/core/src/validation/__tests__/` verifying the validation system works correctly.

Test the ValidationService with all supported validator types. Test Zod schemas with valid and invalid data. Test Joi schemas with synchronous and asynchronous rules. Test custom validators with domain-specific logic. Verify that all validators produce consistent ValidationError structures despite their different native error formats.

Test schema composition building complex validators from simple parts. Create a schema that composes multiple smaller schemas. Validate data against the composed schema. Verify that errors correctly indicate which nested schema failed and which specific field violated constraints. This test confirms composition works correctly.

Test validation middleware with various request types. Send valid and invalid request bodies, query parameters, and path parameters. Verify middleware returns appropriate responses. Verify validated data attaches to req.validated correctly. Verify type safety of validated data. These tests confirm middleware integration works end to end.

Test error message quality and specificity. Trigger various validation failures and examine error messages. Verify messages provide actionable guidance rather than generic errors. Verify field paths correctly identify nested fields in complex objects. Verify error messages are suitable for displaying to end users.

Test validation performance with large and complex data. Validate objects with many fields, deeply nested structures, and arrays. Measure validation latency. Verify validation completes within acceptable time budgets, typically under ten milliseconds for common schemas. Identify performance bottlenecks and optimize them.

Test edge cases in validation including null values, undefined values, empty strings, empty arrays, deeply nested data, and very long strings. Verify validation handles edge cases appropriately according to schema definitions. Verify no crashes or unexpected behavior with pathological inputs.

Test validation options controlling validator behavior. Test stripUnknown removes unrecognized fields. Test abortEarly stops at first error versus collecting all errors. Test strict mode rejects additional properties. Verify each option works correctly with all validator types.

**Acceptance**: Tests cover all validator types. Schema composition tests verify correct error attribution. Middleware tests verify integration. Error message tests verify quality. Performance tests establish benchmarks. Edge case tests verify robustness. Option tests verify configuration works correctly.

**Dependencies**: Task 1.1 provides Result types and ValidationError. Task 1.3 provides observability for logging validation failures.

**Testing Strategy**: Unit tests verify ValidationService logic with mocked validators. Integration tests verify middleware works in Express applications. Type tests verify TypeScript inference works correctly. Performance tests establish validation overhead baselines. Tests use both valid and invalid data to exercise success and error paths thoroughly.

---

### **Task 3.3: Implement Error Management System**

**Priority**: High | **Effort**: 2 days | **Requirements**: REQ-ERR-001

**Objective**: Complete the error management system with error boundary components, error handler middleware, and error tracking integration.

The error management system built on the BaseError foundation from Phase One now requires completion with error handlers, React error boundaries, and integration with error tracking services. This task ensures all errors flow through consistent handling logic that logs appropriately, tracks for monitoring, and presents appropriately to users.

**Deliverables**:

* Express error handler middleware  
* React error boundary components  
* Error tracking integration  
* Error recovery patterns

**Subtask 3.3.1: Implement Express Error Handler**

Create comprehensive error handling middleware in `shared/core/src/observability/error-management/middleware/express-error-middleware.ts`.

Implement error handler middleware that catches all errors thrown by route handlers. Use Express's four-parameter middleware signature to register as error handling middleware. The middleware receives the error, request, response, and next function.

Handle BaseError instances by extracting their statusCode, errorCode, and message. Call the error's toJSON method to generate an appropriate response, filtering sensitive data based on environment. Log the error with full context including correlation ID, request details, and stack trace. Emit error metrics tracking error types and frequencies.

Handle non-BaseError exceptions as unexpected internal errors. Convert them to generic five hundred Internal Server Error responses. Log these errors with high severity since they represent unexpected conditions. Include stack traces in logs but never expose them to clients. Emit metrics tracking unexpected error rates to detect new error types.

Implement error response formatting that follows the consistent structure defined in requirements. Return JSON responses with an error object containing code, message, and optionally details. Use appropriate HTTP status codes matching the error type. Include correlation IDs in responses to enable users to reference specific errors when reporting issues.

Handle specific error types with custom logic. For ValidationErrors, include detailed field errors in the response to enable client-side form validation displays. For AuthenticationErrors, include WWW-Authenticate headers when appropriate. For RateLimitErrors, include Retry-After headers indicating when requests can resume.

Implement request context capture that includes relevant information in error logs. Capture request method, path, headers (sanitizing authorization headers), query parameters, body (sanitizing sensitive fields), user information if authenticated, and IP address. This context helps debug errors that only occur with specific request patterns.

Support error recovery strategies for retryable errors. For errors marked as retryable, include retry guidance in responses. For transient database errors, suggest retrying after a delay. For upstream service errors, indicate when the service might recover. This guidance helps clients implement appropriate retry logic.

**Acceptance**: Error handler catches all route handler errors. BaseError instances are handled with proper status codes and messages. Unexpected errors are logged and converted to generic responses. Error responses follow consistent structure. Specific error types receive appropriate handling. Request context is captured in logs. Retry guidance is provided for retryable errors.

**Subtask 3.3.2: Implement React Error Boundaries**

Create React error boundary components in `shared/core/src/observability/error-management/handlers/error-boundary.tsx`.

Implement a base ErrorBoundary component that catches errors in child component trees. Use React's componentDidCatch lifecycle method to handle errors. Log errors with full stack traces and component stacks. Emit error metrics tracking frontend error rates. Display fallback UI when errors occur, preventing the entire application from crashing.

Implement specialized error boundaries for different UI sections. Create PageErrorBoundary for wrapping entire pages, displaying friendly error messages with options to retry or navigate home. Create FormErrorBoundary for forms, preserving form data and offering retry without losing user input. Create AsyncBoundary for loading states, providing retry capabilities for failed async operations.

Implement error recovery mechanisms that allow users to recover from errors. Provide a "Try Again" button that resets the error boundary state and re-renders children. Provide navigation options to move to known-good pages. Preserve application state where possible so recovery doesn't lose user work.

Integrate error boundaries with the observability stack. When errors are caught, log them with correlation IDs linking frontend errors to backend requests. Emit metrics tracking error rates by page and component. If error tracking services are configured, send error reports with stack traces and user context.

Implement fallback UI that provides good user experience during errors. Display friendly error messages explaining what went wrong in user terms rather than technical jargon. Show helpful actions users can take like refreshing, going back, or contacting support. Include correlation IDs in error displays so users can reference them when reporting issues.

Support error boundary configuration that controls error handling behavior. Allow customizing fallback UI per boundary instance. Allow configuring whether errors propagate to parent boundaries or get caught. Allow configuring automatic recovery attempts for transient errors.

Document error boundary usage explaining when and where to use boundaries. Recommend placing boundaries at page level to prevent entire application crashes. Recommend placing boundaries around async operations that might fail. Provide examples of common boundary patterns.

**Acceptance**: Error boundaries catch React component errors. Specialized boundaries provide appropriate handling for different scenarios. Recovery mechanisms enable users to recover gracefully. Observability integration logs and tracks errors. Fallback UI provides good user experience. Configuration enables customization. Documentation explains usage patterns.

**Subtask 3.3.3: Integrate Error Tracking**

Integrate with error tracking services like Sentry or Rollbar in `shared/core/src/observability/error-management/tracking/`.

Implement error tracking client that sends errors to configured error tracking services. Initialize the client during observability stack setup. Configure the client with environment, release version, and sampling rates.

Implement automatic error capture that sends errors to the tracking service. Hook into the error handler middleware to capture backend errors. Hook into error boundaries to capture frontend errors. Send error reports including stack traces, request context, user information, and correlation IDs.

Implement user context tracking that associates errors with specific users. Include user ID, email, and roles in error reports while respecting privacy requirements. This context helps prioritize errors affecting many users or important users. Support anonymizing user information in compliance with privacy regulations.

Implement breadcrumb tracking that captures events leading up to errors. Record navigation events, user interactions, API calls, and state changes. When errors occur, include recent breadcrumbs in error reports. This timeline helps reproduce and debug errors by understanding the sequence of events that triggered them.

Implement error grouping that aggregates similar errors. Use stack trace fingerprinting to group errors with the same root cause. Use error messages and codes as secondary grouping criteria. Configure grouping rules to balance between having too many distinct error groups and losing important distinctions.

Implement release tracking that associates errors with specific application versions. Tag errors with release version and git commit hash. Track error rates before and after releases to detect regressions. Support source map uploading for frontend code to get unminified stack traces in production.

Configure sampling rates to control error reporting volume. Sample frequent errors more aggressively while always reporting rare errors. This approach keeps error tracking costs manageable while ensuring visibility into all error types.

**Acceptance**: Error tracking client initializes correctly. Backend errors are captured and sent. Frontend errors are captured and sent. User context associates errors with users. Breadcrumbs provide error context. Error grouping works effectively. Release tracking enables regression detection. Sampling controls volume.

**Subtask 3.3.4: Write Error Management Tests**

Create tests in `shared/core/src/observability/error-management/__tests__/` verifying error handling works correctly.

Test Express error handler middleware with various error types. Throw BaseError instances with different status codes and verify appropriate responses. Throw unexpected errors and verify they convert to generic five hundred responses. Verify all errors are logged with correct severity and context. Verify error metrics are emitted.

Test React error boundaries with component errors. Throw errors from child components and verify boundaries catch them. Verify fallback UI renders correctly. Verify recovery mechanisms work. Verify errors are logged and tracked. Test error boundaries at different levels and verify error propagation works correctly.

Test error tracking integration with mocked tracking service. Trigger various errors and verify error reports are sent with correct structure. Verify user context is included. Verify breadcrumbs capture relevant events. Verify error grouping produces consistent fingerprints.

Test error recovery patterns including retry logic, fallback strategies, and graceful degradation. Simulate transient errors and verify retry logic works. Simulate permanent errors and verify fallback strategies activate. Verify applications continue operating despite errors in non-critical components.

Test error handling under various conditions including high error rates, tracking service unavailability, and errors in error handling code itself. Verify error handling remains robust. Verify no infinite loops or cascading failures occur.

**Acceptance**: Tests cover all error handler functionality. Error boundary tests verify React integration. Tracking integration tests verify error reporting. Recovery pattern tests verify resilience. Stress tests verify robustness under failure conditions.

**Dependencies**: Task 1.1 provides BaseError and specialized errors. Task 3.1 provides observability infrastructure for logging and metrics.

**Testing Strategy**: Unit tests verify error handler logic with mocked responses. Integration tests verify end-to-end error flow from error occurrence through logging, metrics, and tracking. React tests use React Testing Library to trigger and verify error boundary behavior. Tests intentionally trigger various error types to exercise all handling paths.

---

## **Phase 4: Migration & Cleanup (Weeks 8-10)**

Phase four focuses on migrating consuming services to the refined shared core and removing deprecated code. This phase ensures the architectural improvements deliver value across the entire codebase and that legacy code is removed safely after successful migration. By completing this phase, the project achieves its goals of reduced complexity, improved maintainability, and better developer experience.

### **Task 4.1: Migrate Services to New Cache**

**Priority**: Critical | **Effort**: 4 days | **Requirements**: REQ-MIG-001, REQ-MIG-002

**Objective**: Migrate all services using legacy cache implementations to the unified cache system with feature flags and validation.

**Deliverables**:

* Feature flags controlling cache implementation  
* Migration validation comparing old and new implementations  
* Service-by-service migration plan  
* Rollback procedures

**Subtask 4.1.1: Implement Feature Flags**

Create feature flag configuration in `shared/core/src/config/` controlling which cache implementation each service uses.

Define cache feature flags in the configuration schema. Create flags for useModernMemoryCache, useModernRedisCache, and useModernMultiTierCache. Initialize flags from environment variables to enable runtime control without code changes.

Implement feature flag service that evaluates flags based on configuration and context. Support per-service flags so different services can migrate independently. Support percentage-based rollouts so new implementations can be tested with a subset of traffic. Support user-based targeting so specific users can test new implementations.

Integrate feature flags with the cache factory. When creating caches, check the relevant feature flag. If the flag indicates using the modern implementation, create a cache using the new factory. If the flag indicates using the legacy implementation, create a cache using the old patterns. This integration makes migration transparent to application code.

Document feature flag usage explaining how to enable modern implementations. Provide examples of environment variable configuration. Explain rollout strategies like canary deployments where new implementations are tested with small traffic percentages before full rollout.

Implement feature flag monitoring that tracks flag states and usage. Emit metrics showing what percentage of cache operations use modern versus legacy implementations. Log flag evaluations for audit trails. This monitoring provides visibility into migration progress.

**Acceptance**: Feature flags control cache implementation selection. Per-service flags enable independent migration. Percentage-based rollouts support gradual migration. Integration with cache factory makes migration transparent. Documentation explains flag usage. Monitoring tracks migration progress.

**Subtask 4.1.2: Create Migration Validator**

Implement migration validation tools in `shared/core/src/migration/` that verify behavioral equivalence between old and new cache implementations.

Create MigrationValidator class that runs operations against both old and new implementations. Implement shadow mode where primary operations use the legacy implementation while the new implementation runs in parallel for comparison. Compare results and log discrepancies for investigation. This approach tests new implementations with real traffic while maintaining safety of existing implementations.

Implement result comparison logic that determines if old and new implementations produced equivalent results. For cache hits, compare returned values using deep equality. For cache misses, verify both implementations returned miss results. For errors, compare error types and messages. Log detailed differences when results diverge.

Implement validation reporting that aggregates comparison results. Track success rates, discrepancy rates, and error rates. Generate reports showing validation progress. Include examples of discrepancies to aid debugging. These reports guide migration by highlighting issues before full rollout.

Create validation test suite that exercises caches comprehensively. Test all CRUD operations with various data types. Test TTL functionality with time-based assertions. Test concurrent operations. Test error conditions. Run tests against both old and new implementations and verify identical behavior.

Implement automated validation in CI/CD pipelines. Run validation tests on every code change. Fail builds if validation detects behavioral differences. This automation catches regressions early and ensures implementations remain equivalent throughout migration.

Document validation usage explaining how to run validators, interpret results, and investigate discrepancies. Provide debugging guidance for common issues. Show examples of fixing implementation differences to achieve equivalence.

**Acceptance**: Migration validator compares old and new implementations. Shadow mode tests with real traffic safely. Result comparison detects behavioral differences. Validation reporting tracks progress. Automated tests ensure equivalence. Documentation explains validation process.

**Subtask 4.1.3: Execute Service Migration**

Migrate services one by one to the modern cache implementation following a structured process that minimizes risk.

Create service migration checklist defining steps for each migration. First, enable feature flag to start shadow mode testing. Monitor for discrepancies and fix any implementation differences. Gradually increase rollout percentage from one percent to ten percent to fifty percent to one hundred percent. After successful full rollout at one hundred percent, remove legacy code. This methodical approach catches issues early when they affect few users.

Begin with low-risk services that have good test coverage and monitoring. Migrate internal tools and admin interfaces before customer-facing features. This strategy builds confidence with migrations that have limited blast radius before tackling critical services.

Implement rollback procedures for each service. Document how to roll back by changing feature flag configuration. Test rollback procedures before needing them. This preparation ensures quick recovery if issues arise during migration.

Monitor services closely during migration. Watch error rates, latency percentiles, cache hit rates, and user-reported issues. Set up alerts for degradation. Compare metrics before and after migration to verify no performance regression. This monitoring detects issues quickly.

Coordinate migrations across teams. Communicate migration schedule. Provide support during migrations. Share learnings from early migrations to help later migrations. This coordination ensures smooth migration across the entire codebase.

Document each service migration with outcomes and lessons learned. Record what went smoothly and what encountered issues. Capture solutions to common problems. This documentation guides remaining migrations and provides historical record.

**Acceptance**: Services migrate methodically with controlled rollout. Low-risk services migrate first. Rollback procedures enable quick recovery. Monitoring detects issues early. Cross-team coordination ensures smooth process. Documentation captures learnings.

**Subtask 4.1.4: Remove Legacy Cache Code**

After successful migration of all services, remove legacy cache implementations to complete the consolidation.

Verify all services have migrated completely. Check that all feature flags are set to use modern implementations. Verify no code paths reference legacy cache modules. Run comprehensive tests to ensure nothing depends on legacy code. This verification prevents breaking changes from removing legacy code prematurely.

Create deprecation warnings in legacy modules. Mark all legacy exports as deprecated with clear messages explaining they are no longer supported and will be removed. Set a sunset date giving teams final notice. Emit metrics when deprecated code is called to catch any remaining usage. These warnings provide grace period for stragglers to complete migration.

Remove legacy cache implementations after the sunset date. Delete old cache files. Remove imports of legacy modules. Update documentation removing references to old patterns. Create a pull request with the removal for review and approval. This cleanup eliminates technical debt and reduces maintenance burden.

Update all documentation referencing caching. Remove sections about old cache patterns. Update examples to use modern cache factory. Refresh architecture diagrams showing unified cache system. This documentation update prevents confusion and guides new developers to current patterns.

Announce completion of migration to the team. Celebrate the successful consolidation. Share metrics showing improvements in code quality, performance, and developer experience. This communication provides closure and recognizes team effort.

**Acceptance**: All services have migrated. Legacy code has deprecation warnings. After sunset date, legacy code is removed. Documentation is updated. Migration completion is announced.

**Dependencies**: Tasks 2.1-2.4 provide modern cache implementations. This task migrates consumers to those implementations.

**Testing Strategy**: Feature flags enable gradual rollout with easy rollback. Shadow mode testing validates equivalence with real traffic. Comprehensive monitoring detects issues quickly. Service-by-service migration limits blast radius. Automated tests verify no regressions.

---

### **Task 4.2: Migrate Services to New Middleware**

**Priority**: Critical | **Effort**: 3 days | **Requirements**: REQ-MIG-001, REQ-MIG-002

**Objective**: Migrate all services from legacy middleware factories to the unified MiddlewareFactory.

This migration follows similar patterns to cache migration but focuses on middleware consolidation. The goal is to replace all usage of factory.ts, enhanced-factory.ts, and unified.ts with the new MiddlewareFactory while maintaining identical behavior.

**Deliverables**:

* Middleware feature flags  
* Automated migration tools for common patterns  
* Service migration tracking  
* Legacy middleware removal

**Subtask 4.2.1: Create Migration Tooling**

Implement automated migration tools that mechanical refactor code from old factories to new MiddlewareFactory.

Create codemods using jscodeshift that transform old factory patterns to new patterns. Implement transforms for each legacy factory. Transform factory.ts imports to MiddlewareFactory imports. Transform createAuth calls to match new signature. Transform configuration objects to new format. Run transforms automatically across the codebase.

Create validation scripts that verify migrations are correct. Parse migrated code with TypeScript compiler. Verify all imports resolve. Verify all function calls type check. Verify configuration objects match expected schemas. These checks catch migration errors automatically.

Implement migration progress tracking that shows which files have been migrated. Scan codebase for legacy imports. Generate reports showing migration status by file, directory, and service. Update reports as migrations complete. This tracking provides visibility into remaining work.

Create migration documentation explaining the automated tools and manual migration for complex cases. Provide examples of common patterns and their migrations. Document edge cases requiring manual intervention. Include troubleshooting guidance for migration issues.

**Acceptance**: Codemods successfully transform common patterns. Validation scripts catch errors. Progress tracking shows migration status. Documentation guides both automated and manual migration.

**Subtask 4.2.2: Execute Middleware Migration**

Migrate services systematically using feature flags and validation similar to cache migration.

Enable middleware feature flags per service. Start with internal services before customer-facing. Use shadow mode where available to validate new middleware produces identical behavior. Monitor metrics comparing old and new middleware performance. Roll out gradually from ten percent to full traffic.

Run automated codemods to transform straightforward patterns. Review codemod output to verify correctness. Handle edge cases manually where codemods cannot correctly transform. Test migrated services thoroughly to verify behavior is unchanged.

Update tests to use new middleware patterns. Replace test setup that created old middleware with setup using new factory. Update mocks to match new interfaces. Verify all tests pass after migration.

Remove legacy middleware imports after service migration completes. Update documentation and examples. Mark old factories as deprecated. Set sunset dates for legacy code removal.

**Acceptance**: Services migrate systematically. Automated tools handle common cases. Manual migration handles edge cases. Tests updated to new patterns. Legacy imports removed after migration.

**Dependencies**: Task 2.5 provides unified MiddlewareFactory. This task migrates consumers to that factory.

**Testing Strategy**: Automated transformation with validation\*\*Testing Strategy\*\*: Automated transformation with validation catches most migration errors. Manual review catches edge cases that codemods cannot handle. Comprehensive test suites verify behavior equivalence after migration.

\*\*Subtask 4.2.3: Document Migration Patterns\*\*

Create comprehensive migration documentation in \`shared/core/src/middleware/MIGRATION.md\` that guides teams through the middleware consolidation process.

Document the mapping from each legacy factory to the unified MiddlewareFactory. For factory.ts, explain how simple middleware creation patterns map directly to equivalent MiddlewareFactory methods. For enhanced-factory.ts, show how enhanced features like dependency injection now work through the ServiceContainer. For unified.ts, demonstrate how the unified patterns are preserved in the new factory while gaining additional capabilities.

Provide side-by-side code examples comparing old and new patterns for each middleware type. Show authentication middleware creation using the old factory.createAuth and the new MiddlewareFactory.createAuth, highlighting differences in configuration structure and dependency injection. Include examples for rate limiting, validation, error handling, and caching middleware. Each example should demonstrate not just the syntax change but also the conceptual improvements in the new approach.

Explain common migration challenges and their solutions. Address situations where old factories used implicit dependencies that must now be explicit. Explain how to handle middleware that combined multiple concerns and should now use composition. Document strategies for migrating custom middleware to the provider pattern. These explanations help teams navigate the subtle aspects of migration that automated tools cannot handle.

Include a troubleshooting section addressing frequent migration issues. Explain how to debug dependency injection problems when middleware cannot access required services. Show how to verify middleware ordering when converting from implicit to explicit dependencies. Provide guidance for handling circular dependencies that might emerge when making dependencies explicit. This troubleshooting guidance reduces the time teams spend solving migration problems.

Create a migration checklist that teams can follow systematically. The checklist should include steps for identifying all middleware usage, running automated codemods, manually reviewing transformed code, updating tests, verifying behavior in staging environments, and deploying to production. Each step should have clear acceptance criteria so teams know when they have completed it successfully.

\*\*Acceptance\*\*: Documentation maps all legacy patterns to modern equivalents. Side-by-side examples make migration clear. Troubleshooting guidance addresses common problems. Migration checklist provides systematic approach. Teams can self-serve migration without extensive support.

\*\*Subtask 4.2.4: Remove Legacy Factories\*\*

After all services complete migration, remove the legacy middleware factories to complete the consolidation.

Verify complete migration by scanning the codebase for imports from legacy factory modules. Use grep or similar tools to find any remaining references to factory.ts, enhanced-factory.ts, or unified.ts. Check feature flags to confirm all services use modern middleware. Review monitoring dashboards to verify no unexpected errors appeared after migrations. This verification ensures removal is safe.

Add deprecation warnings to legacy factory exports as a final grace period. Configure warnings to be verbose, logging stack traces to identify any remaining usage. Monitor deprecation metrics for several weeks to catch any edge cases missed during verification. Set a firm sunset date after the grace period. These warnings provide a safety net before final removal.

Remove legacy factory files after the sunset date passes with no usage. Delete factory.ts, enhanced-factory.ts, and unified.ts from the codebase. Remove their exports from package indexes. Update TypeScript compiler configuration to exclude the deleted files. Run the full test suite to verify nothing broke. This cleanup eliminates the technical debt from multiple factory patterns.

Update all documentation removing references to legacy factories. Revise architecture documents to show only the unified MiddlewareFactory. Update API documentation removing deprecated methods. Refresh examples and tutorials using only modern patterns. Archive old documentation with clear notices that it describes deprecated approaches. This documentation update prevents confusion for developers joining the project after consolidation.

Archive legacy factory code in version control with clear commit messages explaining the removal. Tag the last commit containing legacy factories so teams can reference old implementations if needed. Document the removal in release notes explaining what was removed and why. This historical record preserves knowledge about the old system without cluttering the active codebase.

\*\*Acceptance\*\*: All services verified to use modern middleware. Deprecation warnings provided grace period. Legacy factories removed cleanly. Documentation updated throughout. Version control preserves history appropriately.

\*\*Dependencies\*\*: Task 2.5 provides the unified MiddlewareFactory. This task migrates all consumers and removes legacy code.

\*\*Testing Strategy\*\*: Automated scanning detects legacy usage. Feature flags enable controlled rollout. Comprehensive test suites verify no regressions. Monitoring tracks migration progress and detects issues early.

\---

\#\#\# \*\*Task 4.3: Consolidate Observability Infrastructure\*\*

\*\*Priority\*\*: High | \*\*Effort\*\*: 3 days | \*\*Requirements\*\*: REQ-MIG-001

\*\*Objective\*\*: Migrate all logging, metrics, tracing, and health checks to use the unified ObservabilityStack.

This migration consolidates the various observability implementations scattered throughout the codebase. The unified ObservabilityStack ensures consistent correlation ID propagation, coordinated initialization, and cohesive integration of all observability signals.

\*\*Deliverables\*\*:

\* Feature flags for observability migration

\* Migration tools for updating logging calls

\* Service-by-service observability migration

\* Legacy observability adapter removal

\*\*Subtask 4.3.1: Create Observability Adapters\*\*

Create legacy observability adapters in \`shared/core/src/observability/legacy-adapters/\` that bridge old logging and metrics APIs to the new ObservabilityStack.

Implement a legacy logger adapter that wraps the new Logger interface while exposing the old logging API. Map old log method signatures to new structured logging methods. Convert unstructured log messages to structured format by parsing common patterns. Ensure correlation IDs are added automatically even when calling old logging methods. This adapter allows existing logging code to work immediately while providing time for systematic migration.

Implement a legacy metrics adapter that wraps the new MetricsCollector while exposing old metrics APIs. Map old metric method names to new standardized names. Convert old metric formats to new formats automatically where possible. Preserve existing metric tags and labels through the translation layer. This adapter ensures metrics continuity during migration so dashboards continue working throughout the transition.

Create adapter factory functions that instantiate legacy adapters from the ObservabilityStack. The createLegacyLogger function should accept the ObservabilityStack and return a legacy logger adapter. The createLegacyMetrics function should work similarly for metrics. These factories make it easy for services to adopt the new stack while maintaining old APIs temporarily.

Document adapter usage explaining how services can use adapters during migration. Provide examples showing how to replace old logger and metrics instantiation with adapter creation. Explain that adapters are temporary bridges and should eventually be replaced with direct ObservabilityStack usage. Include migration timelines so teams know when adapters will be deprecated.

\*\*Acceptance\*\*: Legacy adapters successfully bridge old APIs to new implementations. Existing logging and metrics code works without changes. Adapters provide automatic correlation ID propagation. Documentation explains adapter usage during migration.

\*\*Subtask 4.3.2: Migrate Logging Infrastructure\*\*

Systematically migrate all logging to use the unified Logger from ObservabilityStack.

Create automated migration tools that transform old logging patterns to new structured logging. Implement AST transformations that convert console.log calls to logger method calls. Convert string concatenation in log messages to structured metadata objects. Extract variables from template strings and place them in metadata fields. These automated transformations handle the mechanical aspects of migration.

Handle special logging cases that require manual migration. Identify logging that includes sensitive data and ensure proper sanitization in the new format. Find conditional logging that should use log level checks instead. Locate error logging that should use the error management system rather than raw logging. Document these special cases in migration guides so developers handle them correctly.

Update all services to initialize and use the Logger from ObservabilityStack. Replace standalone logger initialization with ObservabilityStack initialization. Pass the logger to components that need it rather than using global logger instances. Ensure all log calls automatically include correlation IDs through the stack's integration. This systematic approach ensures consistent logging behavior across all services.

Verify logging continuity during migration by monitoring log aggregation systems. Ensure log volumes remain consistent before and after migration. Check that log formats parse correctly in log analysis tools. Verify that correlation IDs appear in all logs and enable request tracing. Monitor for missing logs that might indicate incomplete migration. These checks ensure the new logging works as well as the old system.

\*\*Acceptance\*\*: Automated tools migrate common logging patterns. Special cases have documented manual migration procedures. All services use Logger from ObservabilityStack. Log aggregation systems confirm continuity. Correlation IDs propagate through all logs.

\*\*Subtask 4.3.3: Migrate Metrics Infrastructure\*\*

Migrate all metrics collection to use the unified MetricsCollector from ObservabilityStack.

Standardize metric naming across all services following the convention service.component.metric\\\_name. Create a metric name registry documenting all metrics with their meanings, types, and tags. Implement automated checking that validates metric names match the registry. Generate migration scripts that rename metrics to follow the standard convention. This standardization ensures metrics are organized logically and discoverable.

Convert custom metrics collection code to use MetricsCollector methods. Replace counter implementations with calls to MetricsCollector.counter. Replace gauge implementations with calls to MetricsCollector.gauge. Replace histogram implementations with calls to MetricsCollector.histogram. Ensure metric tags are preserved during migration. This conversion consolidates metrics collection through the standard interface.

Update dashboards and alerts to reference standardized metric names. Find all dashboard configurations that reference old metric names. Update them to use new standardized names. Update alert definitions similarly. Test dashboards and alerts to verify they still work with renamed metrics. This update ensures monitoring continues working after metric migration.

Verify metrics completeness by comparing metrics before and after migration. Check that all metrics that existed before migration still exist after, even if renamed. Verify metric values are similar between old and new collection methods. Investigate any significant discrepancies to ensure they result from improvements rather than bugs. This verification confirms the new metrics system provides equivalent or better visibility.

\*\*Acceptance\*\*: Metric naming follows standardized convention. All metrics collection uses MetricsCollector. Dashboards and alerts updated to new metric names. Verification confirms metrics completeness and correctness.

\*\*Subtask 4.3.4: Remove Legacy Observability Code\*\*

After successful migration, remove legacy logging and metrics code to complete the consolidation.

Identify all legacy observability implementations scattered throughout the codebase. Find custom logger implementations, standalone metrics collectors, and ad-hoc correlation ID management. Create an inventory of all legacy code that needs removal. Prioritize removal based on how much duplication and maintenance burden each legacy implementation represents.

Deprecate legacy observability exports with clear warnings. Mark old logger and metrics exports as deprecated in their module definitions. Log warnings when deprecated code is called including the call site to help identify remaining usage. Set sunset dates for each deprecated export. Monitor deprecation usage through metrics to understand migration progress.

Remove legacy code after sunset dates with no remaining usage. Delete old logger implementations, metrics collectors, and correlation ID managers. Remove their exports from package indexes. Update imports throughout the codebase to reference ObservabilityStack components. Run comprehensive tests to verify nothing broke. This cleanup eliminates observability duplication.

Update documentation removing all references to legacy observability approaches. Revise guides to show only ObservabilityStack usage. Update API documentation removing deprecated observability methods. Refresh examples to use modern observability patterns. Archive old observability documentation with notices that it describes deprecated systems.

\*\*Acceptance\*\*: Legacy observability code inventory complete. Deprecation warnings guide remaining migration. After sunset dates, legacy code removed. Documentation updated to show only modern observability. Tests verify no regressions from removal.

\*\*Dependencies\*\*: Task 3.1 provides the unified ObservabilityStack. This task migrates all consumers and removes legacy observability code.

\*\*Testing Strategy\*\*: Adapters enable gradual migration. Monitoring confirms logging and metrics continuity. Automated tools handle mechanical transformation. Feature flags control rollout. Comprehensive tests verify behavior equivalence.

\---

\#\#\# \*\*Task 4.4: Final Integration and Documentation\*\*

\*\*Priority\*\*: High | \*\*Effort\*\*: 2 days | \*\*Requirements\*\*: All Requirements

\*\*Objective\*\*: Complete final integration testing, update all documentation, and conduct knowledge transfer sessions.

This final task ensures the refined shared core is thoroughly documented, well-tested end-to-end, and that the team understands how to use and maintain the new architecture.

\*\*Deliverables\*\*:

\* End-to-end integration test suite

\* Complete architecture documentation

\* API reference documentation

\* Developer guides and tutorials

\* Knowledge transfer presentations

\*\*Subtask 4.4.1: Create Integration Test Suite\*\*

Implement comprehensive end-to-end tests that verify the complete refined shared core works together correctly.

Create integration tests that exercise the full stack from primitives through services. Test scenarios where caching, observability, validation, and error management all interact. Verify correlation IDs flow through the entire request lifecycle from entry to response. Test error scenarios where failures in one component affect others appropriately. These tests verify the architecture works as a cohesive system rather than isolated components.

Test real-world usage patterns that consuming services commonly implement. Create test scenarios simulating authenticated API requests with caching, validation, rate limiting, and observability. Verify middleware chains work correctly with multiple middleware types. Test concurrent requests to verify thread safety throughout the stack. These tests ensure the architecture handles actual usage patterns well.

Implement performance regression tests that establish baselines for the refined architecture. Measure request latency with various middleware combinations. Measure cache operation throughput. Measure observability overhead. Compare results to baselines from the legacy implementation. Document any performance changes and ensure they meet requirements. These tests prevent performance regressions and verify improvements.

Create load tests that stress the system with high concurrency and volume. Simulate many concurrent requests using all shared core features. Monitor for resource leaks, deadlocks, or performance degradation under load. Verify error handling remains robust under stress. Verify observability continues working correctly with high throughput. These tests ensure the architecture scales appropriately.

\*\*Acceptance\*\*: Integration tests cover end-to-end scenarios. Real-world usage patterns are tested. Performance regression tests establish baselines. Load tests verify scalability. All tests pass consistently.

\*\*Subtask 4.4.2: Complete Architecture Documentation\*\*

Create comprehensive architecture documentation that explains the refined shared core design, rationale, and usage.

Update the architecture overview documenting the four-layer structure of primitives, infrastructure, patterns, and services. Explain the responsibilities of each layer and the dependencies between layers. Include architecture diagrams showing how components relate. Document the design principles that guided architectural decisions including explicit error handling, interface-first design, and observability integration. This overview helps developers understand the big picture.

Document each major component thoroughly explaining its purpose, interface, implementation, and usage. Create detailed documentation for the cache system covering all adapter types, the cache factory, and caching patterns. Document the middleware factory explaining the provider system, dependency injection, and standard middleware types. Document the observability stack covering logging, metrics, tracing, and health checking. Document the validation system and error management. These component guides enable deep understanding.

Create architecture decision records for significant design choices. Document why Result types were chosen over exceptions. Explain the rationale for the adapter pattern in caching. Document the provider pattern decision for middleware. Explain correlation ID propagation architecture. These ADRs preserve the reasoning behind design decisions for future maintainers.

Document common patterns and best practices for using the shared core. Explain when to use different cache adapters. Show how to properly structure middleware chains. Demonstrate error handling patterns. Provide observability integration examples. These patterns guide developers toward correct usage.

\*\*Acceptance\*\*: Architecture overview explains the four-layer structure. Component documentation covers all major systems. Architecture decision records preserve design rationale. Pattern documentation guides correct usage.

\*\*Subtask 4.4.3: Create Developer Guides\*\*

Write practical developer guides that help teams effectively use the refined shared core.

Create a quick-start guide that gets developers productive quickly. Show how to set up observability for a new service. Demonstrate implementing caching for common scenarios. Walk through creating and registering middleware. Provide example code that developers can copy and adapt. This guide accelerates developer onboarding.

Write detailed how-to guides for common tasks. Create guides for implementing authentication middleware, setting up multi-tier caching, configuring structured logging, creating custom validation schemas, and handling errors gracefully. Each guide should explain the task, show complete code examples, and highlight common pitfalls. These guides serve as references during feature development.

Document troubleshooting procedures for common problems. Explain how to debug correlation ID propagation issues. Show how to investigate cache miss rates. Demonstrate debugging validation failures. Provide guidance for interpreting health check failures. These troubleshooting guides reduce time spent resolving problems.

Create migration guides for teams adopting the refined shared core. Provide step-by-step migration instructions for each legacy pattern. Show before and after code examples. Explain how to use feature flags during migration. Document rollback procedures. These guides make migration less risky and more efficient.

\*\*Acceptance\*\*: Quick-start guide enables rapid onboarding. How-to guides cover common development tasks. Troubleshooting guides help resolve problems. Migration guides support smooth transitions.

\*\*Subtask 4.4.4: Generate API Reference\*\*

Generate comprehensive API reference documentation from code comments and type definitions.

Configure documentation generation tools like TypeDoc to extract documentation from TypeScript source code. Ensure all public APIs have complete JSDoc comments. Generate HTML documentation with search, navigation, and examples. Host the generated documentation in an accessible location. Set up automated regeneration when code changes. This API reference provides definitive information about interfaces and methods.

Document all configuration options with descriptions, types, defaults, and validation rules. Show configuration examples for common scenarios. Explain how configuration affects behavior. This configuration reference helps developers use the system correctly without trial and error.

Include code examples in API documentation showing typical usage. For each major class or interface, provide example code demonstrating instantiation and common operations. Include examples showing error handling and integration with other components. These examples make the API reference more practical and easier to understand.

Cross-reference related APIs throughout the documentation. Link cache adapters to the cache factory. Link middleware providers to the middleware factory. Link observability components to the observability stack. These cross-references help developers discover related functionality.

\*\*Acceptance\*\*: API reference generated from source code. All public APIs documented. Configuration options fully described. Code examples demonstrate usage. Cross-references connect related APIs.

\*\*Subtask 4.4.5: Conduct Knowledge Transfer\*\*

Organize knowledge transfer sessions to ensure the team understands the refined architecture.

Prepare presentation materials covering architecture overview, component details, and usage patterns. Create slides explaining the four-layer architecture. Develop demonstrations showing real usage scenarios. Prepare code walk-throughs of key components. These materials structure the knowledge transfer effectively.

Conduct architecture overview sessions explaining the high-level design. Present the architectural vision and how it addresses current pain points. Walk through the four layers and their responsibilities. Explain the migration strategy and timeline. These sessions ensure the team understands the overall approach.

Run hands-on workshops where developers practice using the refined shared core. Have developers implement caching for a sample service. Guide them through creating custom middleware. Walk through setting up observability. These workshops build practical skills through doing.

Create video tutorials covering common tasks and workflows. Record screencasts showing how to implement features using the shared core. Create videos explaining troubleshooting procedures. Publish videos in a shared location where developers can reference them asynchronously. These videos provide ongoing training resources.

Establish office hours where developers can get help with adoption questions. Schedule regular times when architecture experts are available for consultation. Create a channel for asynchronous questions. Document common questions and answers. This ongoing support ensures teams succeed with adoption.

\*\*Acceptance\*\*: Presentation materials explain architecture thoroughly. Overview sessions communicate the vision. Workshops build practical skills. Video tutorials provide reference materials. Office hours support ongoing adoption.

\*\*Dependencies\*\*: All previous tasks must be complete to conduct final integration testing and create complete documentation.

\*\*Testing Strategy\*\*: Integration tests verify end-to-end functionality. Load tests verify scalability. Documentation is reviewed for accuracy and completeness. Knowledge transfer is evaluated through developer feedback.

\---

\#\# \*\*Appendix A: Risk Management\*\*

\#\#\# \*\*Technical Risks\*\*

\*\*Performance Regression Risk\*\*: The unified interfaces may introduce performance overhead compared to specialized legacy implementations. Mitigation involves comprehensive performance testing during Phase Two comparing new implementations to baselines. If regressions are detected, profiling identifies bottlenecks for optimization. Performance requirements define acceptable overhead limits.

\*\*Migration Complexity Risk\*\*: Migrating consuming services while maintaining system stability poses coordination challenges. Mitigation involves the incremental migration strategy with feature flags enabling controlled rollout. Legacy adapters provide safety nets during migration. Comprehensive testing at each migration step catches issues early when they affect limited users.

\*\*Breaking Changes Risk\*\*: Consolidating multiple patterns into unified interfaces may require breaking changes in consuming code. Mitigation involves the structured deprecation process with clear timelines and migration paths. Legacy adapters maintain backward compatibility during transition periods. Automated migration tools reduce manual effort for mechanical transformations.

\*\*Integration Risk\*\*: Components that work correctly in isolation may have issues when integrated. Mitigation involves integration testing throughout development rather than only at the end. The architecture layers with clear dependencies reduce coupling and integration complexity. Comprehensive end-to-end testing in Phase Four catches integration issues.

\#\#\# \*\*Process Risks\*\*

\*\*Timeline Risk\*\*: The ten-week timeline may be optimistic given complexity and migration scope. Mitigation involves prioritizing critical functionality first so the minimum viable refinement delivers value even if later phases are delayed. Regular progress reviews identify delays early enabling replanning. Buffer time is built into estimates for unexpected complexity.

\*\*Coordination Risk\*\*: Multiple team members working on related components may face coordination challenges. Mitigation involves clear work breakdown with minimized dependencies between tasks. Regular standups ensure teams stay aligned. The phased approach sequences work to reduce concurrent modifications to the same areas.

\*\*Knowledge Transfer Risk\*\*: Team members may lack context about legacy implementations making migration difficult. Mitigation involves thorough documentation of legacy systems before beginning work. Pairing experienced developers with those less familiar accelerates knowledge transfer. The code walk-throughs and workshops in Phase Four ensure knowledge spreads throughout the team.

\#\#\# \*\*Adoption Risks\*\*

\*\*Resistance to Change Risk\*\*: Developers may resist adopting new patterns due to familiarity with legacy approaches. Mitigation involves demonstrating concrete benefits through early wins. The gradual migration approach allows teams to adopt at comfortable pace. Developer guides and office hours reduce adoption friction by providing support.

\*\*Incomplete Migration Risk\*\*: Some services may fail to complete migration leaving legacy code indefinitely. Mitigation involves setting clear deprecation deadlines and tracking migration progress. Automated tools detect legacy usage so stragglers are visible. The grace period before removal provides time while maintaining pressure to complete migration.

\---

\#\# \*\*Appendix B: Success Criteria Summary\*\*

The refined shared core is successfully implemented when:

\*\*Code Quality Metrics\*\*: Code duplication in shared/core reduces by fifty percent or more. Test coverage reaches ninety percent across all components. Zero high-severity linting or type errors remain. Technical debt metrics show measurable improvement.

\*\*Developer Experience Metrics\*\*: Time to implement features using shared/core decreases by thirty percent. Onboarding time for new developers decreases by thirty percent measured by time to first contribution. Developer satisfaction surveys show improved perceptions of code clarity and maintainability. Support requests related to shared/core decrease.

\*\*System Reliability Metrics\*\*: Bugs originating from shared/core decrease by forty percent. Mean time to resolution for shared/core issues decreases by fifty percent. Production incidents related to caching, middleware, or observability decrease. Service level objectives for uptime and error rates are maintained or improved.

\*\*Performance Metrics\*\*: Cache hit rates maintain or exceed ninety percent for cached endpoints. Request latencies stay within five percent of current baselines across all percentiles. Memory usage stays within current limits. CPU usage shows no significant increase. Observability overhead remains under five percent of total request time.

\*\*Migration Metrics\*\*: All services successfully migrate within the planned ten-week timeline. Zero critical incidents occur during migration. Feature flags successfully control rollout with no unintended behavior changes. All legacy code is removed on schedule after successful migration. Migration validation confirms behavioral equivalence between old and new implementations.

\---

\#\# \*\*Conclusion\*\*

This implementation plan provides a comprehensive roadmap for refining the shared core architecture. The phased approach balances the need for rapid improvement with the reality of maintaining system stability during change. By establishing clear foundations, implementing robust infrastructure, integrating observability throughout, and executing careful migration, the plan delivers significant architectural improvements while minimizing risk.

The refined shared core will significantly improve developer productivity through clearer patterns, better documentation, and more intuitive interfaces. System reliability will improve through consistent error handling, comprehensive observability, and reduced code duplication. The architecture will be more maintainable with clear layering, explicit dependencies, and well-documented design decisions.

Success requires commitment from the entire team to follow the plan, maintain discipline during implementation, and support one another through migration challenges. The investment in this refinement will pay dividends through faster feature development, fewer bugs, and a more maintainable codebase for years to come.

