# Implementation Plan: Shared Core Structure Optimization

**Document ID**: IMPL-CORE-OPT-001  
**Version**: 1.0  
**Date**: 2025-10-16  
**Status**: Draft for Review  
**Related Documents**: REQ-CORE-OPT-001, DES-CORE-OPT-001

---

## Executive Summary

This implementation plan translates the architectural vision from the design document into concrete, executable tasks organized across eight phases spanning sixteen weeks. Each task includes specific deliverables, acceptance criteria, dependencies, and traceability to requirements. The plan follows a risk-mitigated approach where foundational layers are established first, capabilities are migrated incrementally with feature flags, and backward compatibility is maintained throughout.

The plan addresses the core problem of extensive duplication and circular dependencies in the current shared/core structure by systematically consolidating five BaseError implementations, three circuit breakers, four loggers, and parallel caching systems into single canonical sources. Each phase delivers measurable value while maintaining production stability through gradual rollout controlled by feature flags.

---

## Implementation Methodology

### Phased Delivery Approach

The implementation follows an eight-phase waterfall-with-iterations model where each phase must complete successfully before the next begins, but within each phase, tasks can proceed iteratively with rapid feedback cycles. This approach balances the need for architectural discipline with the flexibility to adapt based on learnings from each phase.

Each phase concludes with a formal gate review where stakeholders validate that success criteria are met before authorizing the next phase. If a phase fails its gate review, the team pauses to address issues before proceeding, preventing the accumulation of technical debt and integration problems.

### Task Structure and Traceability

Every task in this plan follows a consistent structure that ensures clarity and accountability. Each task includes an action-oriented description stating exactly what needs to be accomplished, specific deliverables that represent tangible outputs, detailed subtasks that break the work into manageable chunks, acceptance criteria that define when the task is complete, requirement references that trace back to REQ-CORE-OPT-001, and dependency declarations that indicate what must complete before the task can begin.

This structure creates a clear chain of traceability from high-level requirements through design decisions to concrete implementation tasks. When a task is marked complete, reviewers can verify that all acceptance criteria are met, all deliverables exist, and all related requirements are fulfilled.

### Risk Management Strategy

Risk management is embedded throughout the plan through several mechanisms. Feature flags control the rollout of new code, enabling instant rollback if issues arise. Side-by-side metrics compare old and new implementations, providing early warning of performance regressions or functional discrepancies. Comprehensive test migration ensures that no functionality is lost during consolidation. Automated validation catches circular dependencies and layer violations immediately in continuous integration.

Each phase includes specific risk checkpoints where the team assesses whether risks identified in the design document are being adequately mitigated. If risk levels increase beyond acceptable thresholds, the team can pause implementation to address the risks before proceeding.

---

## Phase 1: Foundation Layer (Weeks 1-2)

### Phase Objectives

The foundation phase establishes the primitives layer that all other code will depend upon. This layer must achieve zero internal dependencies, making it safe to import anywhere in the system without creating circular dependency chains. The primitives represent the shared vocabulary of the entire system, including type utilities like Result and Maybe, the abstract BaseError class, constants for HTTP status codes and time intervals, and branded types for domain identifiers.

Success in this phase means that every primitive can be imported by any other module with confidence that no transitive dependencies will be pulled in. This foundation enables all subsequent phases to build on a stable, well-understood base.

### Phase Success Criteria

The foundation phase is considered successful when all primitive modules compile with zero internal imports and depend only on TypeScript standard library or zero-dependency external type libraries. One hundred percent test coverage must be achieved for all primitives with comprehensive unit tests validating behavior. ESLint configuration must enforce the zero-dependency rule, failing builds if any primitive attempts to import from other shared/core modules. Documentation must be complete for all primitives, explaining their purpose, usage patterns, and the architectural rationale for their placement in the foundation layer.

---

### TASK-1.1: Establish Primitives Directory Structure

**Task Description**: Create the complete directory structure for the primitives layer with appropriate README files and TypeScript configuration that enforces zero internal dependencies.

**Fulfills Requirements**: REQ-2.2 (Primitives Foundation Layer)

**Dependencies**: None - this is the first task in the implementation plan

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is a complete directory structure at `shared/core/primitives/` containing subdirectories for types, errors, and constants. Each subdirectory includes a README.md file explaining its purpose and the constraints that apply to code within it.

The second deliverable is a specialized TypeScript configuration file `primitives/tsconfig.json` that enables strict type checking and configures path aliases to prevent accidental imports from other shared/core modules.

The third deliverable is ESLint configuration specifically for the primitives layer that enforces the no-internal-imports rule using eslint-plugin-import with custom rule configuration.

The fourth deliverable is a comprehensive README.md at `primitives/README.md` that explains the zero-dependency principle, provides examples of what belongs in primitives versus capabilities, and outlines the testing expectations for primitive code.

**Subtasks**:

First, create the directory structure with appropriate nesting. Execute `mkdir -p shared/core/primitives/{types,errors,constants}` to establish the three main subdirectories. Within each subdirectory, create a README.md template file using `touch shared/core/primitives/{types,errors,constants}/README.md`.

Second, configure TypeScript for the primitives layer. Create `primitives/tsconfig.json` extending from the root TypeScript configuration but with additional restrictions. Set `noUnusedLocals` and `noUnusedParameters` to true for maximum strictness. Configure path mappings that make imports from other shared/core modules impossible by excluding them from resolution paths.

Third, establish ESLint rules for dependency enforcement. In `primitives/.eslintrc.json`, configure the import plugin with rules that fail if any import statement references paths outside primitives or external dependencies. Set `import/no-internal-modules` to error for shared/core paths other than primitives itself.

Fourth, write comprehensive documentation in `primitives/README.md`. Explain that primitives must remain dependency-free because they form the foundation for all other layers. Provide decision trees for determining whether code belongs in primitives or should live in a capability. Include examples of appropriate primitive code like type definitions and inappropriate code like business logic or framework integration.

Fifth, create a validation script `primitives/scripts/validate-dependencies.ts` that programmatically checks all TypeScript files in primitives to ensure they import only from allowed sources. This script will run in continuous integration to catch violations.

**Acceptance Criteria**:

The task is complete when the directory structure exists with all specified subdirectories and README files in place. TypeScript configuration successfully compiles test files within primitives while rejecting import statements from other shared/core modules. ESLint fails builds if any primitive file attempts to import from capabilities or cross-cutting concerns. Documentation clearly explains the zero-dependency principle with at least three concrete examples of what belongs in primitives. The validation script successfully executes and reports zero dependency violations. Code review confirms that the structure matches the design document's specification of the primitives layer.

---

### TASK-1.2: Implement Type Primitives

**Task Description**: Implement the foundational type utilities including Result<T,E> for railway-oriented programming, Maybe<T> for explicit null handling, and branded types for domain identifiers.

**Fulfills Requirements**: REQ-2.2 (Primitives Foundation Layer)

**Dependencies**: TASK-1.1 must complete first to establish the directory structure

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `primitives/types/result.ts` containing the complete Result type definition with Ok and Err constructors, type guards, and utility functions for mapping, flat-mapping, and unwrapping results.

The second deliverable is `primitives/types/maybe.ts` with the Maybe type definition including Some and None constructors, type guards for checking presence, and utility functions for safe unwrapping with defaults and transforming wrapped values.

The third deliverable is `primitives/types/branded.ts` containing the branded type infrastructure and factory functions for creating domain-specific identifier types like UserId, BillId, and SessionId that prevent accidental mixing of identifiers.

The fourth deliverable is `primitives/types/common.ts` with commonly used utility types like DeepPartial, DeepReadonly, and Nullable that appear frequently in application code.

The fifth deliverable is a comprehensive test suite at `primitives/types/__tests__/` with one hundred percent coverage of all type utilities, validating both correct usage and proper type errors for incorrect usage.

**Subtasks**:

First, implement the Result type in `primitives/types/result.ts`. Define the Result type as a discriminated union with ok and error variants. Create the Ok and Err factory functions that construct the appropriate variant with proper type inference. Implement utility functions including `map` for transforming success values, `mapError` for transforming error values, `flatMap` for chaining operations that return Results, `unwrapOr` for extracting values with default fallbacks, and `match` for pattern matching on both variants. Add extensive JSDoc comments explaining when and why to use Result types instead of exceptions.

Second, create the Maybe type in `primitives/types/maybe.ts`. Define Maybe as a simple union of the value type with null and undefined. Implement the Some and None factory functions, though for Maybe these are mainly for semantic clarity since the type is simple. Add type guard functions `isSome` and `isNone` that enable type narrowing in conditional blocks. Implement utility functions including `map` for transforming present values, `flatMap` for chaining optional operations, `unwrapOr` for safe extraction with defaults, and `filter` for conditional presence. Document the distinction between Maybe and Result, explaining that Maybe represents optional values while Result represents operations that can fail.

Third, build the branded types system in `primitives/types/branded.ts`. Define the Brand type using TypeScript's unique symbol feature to create nominal types from structural types. Create factory functions for each domain identifier type that cast strings or numbers to their branded equivalents. Document the rationale that branded types prevent passing a UserId where a BillId is expected, catching these errors at compile time rather than runtime. Provide examples showing how branded types integrate with the rest of the application code.

Fourth, collect common utility types in `primitives/types/common.ts`. Define DeepPartial as a recursive partial type that makes all nested properties optional, useful for update operations. Define DeepReadonly to recursively make all properties readonly, useful for immutable data structures. Define Nullable as a shorthand for union with null and undefined. Add utility types for manipulating unions and intersections. Document each utility type with examples of where it's commonly used in the application.

Fifth, create comprehensive tests in `primitives/types/__tests__/`. For Result types, test that Ok constructs success variants correctly, Err constructs error variants correctly, map transforms only success values, mapError transforms only error values, flatMap chains operations properly, and type guards correctly narrow types. For Maybe types, test that isSome and isNone correctly identify presence, map transforms only present values, unwrapOr provides defaults for absent values, and null and undefined are handled equivalently. For branded types, test that factory functions create properly typed values and that TypeScript correctly rejects assignments between different branded types. Ensure all edge cases are covered including nested Results, chained Maybe operations, and complex branded type compositions.

**Acceptance Criteria**:

The task is complete when all type primitive files exist with complete implementations and comprehensive JSDoc documentation. The test suite achieves one hundred percent code coverage with all tests passing. Type checking confirms that the Result type properly discriminates between success and error variants, enabling exhaustive pattern matching. Type checking validates that branded types prevent accidental identifier mixing with compilation errors. Code review confirms that all utility functions follow functional programming principles with no mutations or side effects. Documentation includes at least five real-world usage examples demonstrating when each type utility is appropriate. Integration with IDE tooling provides accurate autocomplete and type inference when using these primitives.

---

### TASK-1.3: Implement Error Primitives

**Task Description**: Create the abstract BaseError class that all specialized errors will extend, establishing the foundational error contract with consistent field structure and serialization behavior.

**Fulfills Requirements**: REQ-2.2 (Primitives Foundation Layer), REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-1.2 must complete to provide the Timestamp branded type

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `primitives/errors/base-error.ts` containing the complete abstract BaseError class definition with all required fields, constructor signature, abstract methods, and serialization logic.

The second deliverable is `primitives/errors/__tests__/base-error.test.ts` with comprehensive tests validating error construction, context sanitization, JSON serialization, and stack trace capture.

The third deliverable is TypeScript type definitions exported from `primitives/errors/index.ts` that provide the public API for error primitives without exposing internal implementation details.

**Subtasks**:

First, define the BaseError class structure in `primitives/errors/base-error.ts`. Extend the native JavaScript Error class to maintain instanceof checks and stack trace behavior. Declare readonly fields including timestamp of type Timestamp, code as a string identifier, isOperational as a boolean distinguishing expected errors from bugs, optional context as a record of arbitrary metadata, and optional causedBy linking to a causing error. Mark the constructor protected since BaseError is abstract and should never be instantiated directly.

Second, implement the constructor logic. Accept parameters for message, code, isOperational flag with default true, optional context, and optional causedBy error. Set the name property to the constructor name using `this.constructor.name` for proper subclass identification. Create the timestamp using the createTimestamp factory function from type primitives. Call Error.captureStackTrace if available to properly capture the call stack excluding the constructor frame. Store all parameters as readonly properties to prevent mutation after construction.

Third, declare the abstract getHttpStatus method that subclasses must implement. This method returns the appropriate HTTP status code for the error type. Document that operational errors typically return 4xx status codes while non-operational errors return 5xx codes. Explain that this abstraction enables consistent error-to-HTTP-response mapping in middleware without coupling error definitions to HTTP concerns.

Fourth, implement the toJSON method for serialization. Return an object containing name, message, code, timestamp, isOperational flag, sanitized context, conditionally included stack trace, and causedBy error if present. The stack trace should only be included for non-operational errors since operational errors shouldn't expose internal implementation details. Call the private sanitizeContext method to remove sensitive fields before serialization.

Fifth, implement the private sanitizeContext method. Iterate through context keys looking for patterns that indicate sensitive data like password, token, secret, apiKey, or creditCard. Replace values for matching keys with the string "[REDACTED]". Handle nested objects recursively to ensure deep sanitization. Document that this automatic redaction prevents credential leakage in logs while preserving debugging context.

Sixth, create comprehensive tests in `primitives/errors/__tests__/base-error.test.ts`. Since BaseError is abstract, create a concrete test subclass that implements getHttpStatus. Test that error construction captures all fields correctly. Verify that stack traces are properly captured with Error.captureStackTrace. Validate that context sanitization correctly redacts sensitive fields while preserving safe fields. Test that toJSON produces correct serialization format. Verify that non-operational errors include stack traces while operational errors exclude them. Test error chains where causedBy links multiple errors together.

**Acceptance Criteria**:

The task is complete when the BaseError class exists with all required fields and methods properly typed. The class is properly abstract with TypeScript preventing direct instantiation. Context sanitization correctly redacts all sensitive field patterns with test coverage proving effectiveness. JSON serialization produces consistent output matching the documented ErrorJSON interface. Stack trace capture works correctly across different JavaScript engines. Error chains preserve causality through the causedBy field. Test coverage reaches one hundred percent with all edge cases validated. Documentation explains the isOperational concept and when errors should be marked operational versus non-operational. Code review confirms that BaseError has zero dependencies on capabilities or cross-cutting concerns, depending only on type primitives.

---

### TASK-1.4: Implement Constant Definitions

**Task Description**: Define all constant values used throughout the system including HTTP status codes, time intervals, cache TTL presets, and rate limit window durations.

**Fulfills Requirements**: REQ-2.2 (Primitives Foundation Layer)

**Dependencies**: TASK-1.1 must complete to establish directory structure

**Priority**: Normal

**Estimated Duration**: 1 day

**Deliverables**:

The first deliverable is `primitives/constants/http-status.ts` containing all HTTP status codes as named constants with utility functions for classifying status codes into categories.

The second deliverable is `primitives/constants/time-constants.ts` with time duration constants in milliseconds for seconds, minutes, hours, days, and weeks, plus derived constants for common TTL values.

The third deliverable is `primitives/constants/index.ts` providing a barrel export that re-exports all constants with clear organization and documentation.

The fourth deliverable is test files validating that constants have expected values and utility functions behave correctly.

**Subtasks**:

First, implement HTTP status constants in `primitives/constants/http-status.ts`. Define an object HTTP_STATUS containing properties for common status codes including OK (200), CREATED (201), NO_CONTENT (204), BAD_REQUEST (400), UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404), CONFLICT (409), TOO_MANY_REQUESTS (429), INTERNAL_SERVER_ERROR (500), SERVICE_UNAVAILABLE (503), and others. Use `as const` assertion to make these literal types rather than widening to number. Export a type HttpStatusCode that is the union of all values. Implement utility functions isSuccessStatus, isClientError, and isServerError that classify status codes into categories. Document each status code with its semantic meaning and when it should be used.

Second, create time constants in `primitives/constants/time-constants.ts`. Define TIME_CONSTANTS object with SECOND_MS (1000), MINUTE_MS (60000), HOUR_MS (3600000), DAY_MS (86400000), and WEEK_MS (604800000). Use `as const` for literal types. Define CACHE_TTL object with presets like VERY_SHORT (1 minute), SHORT (5 minutes), MEDIUM (30 minutes), LONG (6 hours), and VERY_LONG (1 day). Define RATE_LIMIT_WINDOWS with PER_SECOND, PER_MINUTE, PER_HOUR, and PER_DAY durations. Document that all time values are in milliseconds for consistency with JavaScript's Date and setTimeout APIs.

Third, create the barrel export in `primitives/constants/index.ts`. Re-export all constants from subdirectory files using named exports. Group related constants together in the documentation. Explain that constants should be used instead of magic numbers to improve code readability and enable IDE autocomplete. Provide usage examples showing how to import and use constants in application code.

Fourth, write tests in `primitives/constants/__tests__/`. For HTTP status codes, verify that each constant has the correct numeric value and that classification functions correctly categorize various status codes. For time constants, verify that derived values are correctly calculated from base values. Test that the `as const` assertion properly preserves literal types enabling exhaustive type checking. Verify that barrel exports make all constants available through a single import.

**Acceptance Criteria**:

The task is complete when all constant files exist with comprehensive value definitions and documentation. Constants use `as const` assertion enabling TypeScript literal type inference. Utility functions for classifying HTTP status codes work correctly for all standard status codes. Time constants are consistently in milliseconds with clear documentation. Barrel export successfully re-exports all constants with organized documentation. Tests validate correct values and proper typing. Code review confirms zero computational logic in constant definitions, only value declarations. Integration with application code shows improved readability by replacing magic numbers with named constants.

---

### TASK-1.5: Create Primitives Documentation and Barrel Export

**Task Description**: Write comprehensive documentation for the primitives layer and create a properly structured barrel export that enables convenient importing while maintaining tree-shakeability.

**Fulfills Requirements**: REQ-2.2 (Primitives Foundation Layer), REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: TASK-1.2, TASK-1.3, TASK-1.4 must complete to provide content for documentation

**Priority**: Normal

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `primitives/README.md` containing comprehensive documentation of the primitives layer including architectural rationale, usage guidelines, and examples for each primitive category.

The second deliverable is `primitives/index.ts` providing a tree-shakeable barrel export that re-exports all primitive types, errors, and constants with proper organization.

The third deliverable is example code snippets in `primitives/examples/` demonstrating common usage patterns for type primitives, error handling, and constant usage.

The fourth deliverable is architectural decision records in `primitives/docs/` explaining key design choices like why BaseError is abstract and why constants must be compile-time values.

**Subtasks**:

First, write the main README in `primitives/README.md`. Start with an overview section explaining that primitives form the foundation layer with zero internal dependencies, making them safe to import anywhere. Create a section for each primitive category: types, errors, and constants. For types, explain the Result and Maybe patterns with examples showing when each is appropriate. For errors, explain BaseError's role and the operational versus non-operational distinction. For constants, show how named constants improve code clarity. Include a decision tree helping developers determine whether new code belongs in primitives or should live in a capability. Document the zero-dependency rule and explain how ESLint enforces it.

Second, create the barrel export in `primitives/index.ts`. Use named exports rather than `export *` to maintain tree-shakeability. Group related exports together with comments explaining each group. Export type primitives including Result, Maybe, Ok, Err, Some, None, and branded type factories. Export error primitives including BaseError and related interfaces. Export all constants from the constants directory. Add JSDoc comments to the barrel export explaining that this is the primary entry point for importing primitives. Document that users should import from `@/shared/core/primitives` rather than from individual files to benefit from future refactoring flexibility.

Third, create example files in `primitives/examples/`. Write `result-example.ts` showing how to use Result types for error handling in database queries, external API calls, and validation operations. Write `maybe-example.ts` demonstrating optional value handling in configuration parsing, user input processing, and nullable database fields. Write `branded-types-example.ts` showing how branded types prevent identifier mixing in function calls and data structures. Write `error-example.ts` with examples of extending BaseError for custom error types. Each example should include inline comments explaining the reasoning behind each pattern choice.

Fourth, document architectural decisions in `primitives/docs/adr/`. Create ADR-001 explaining why BaseError is abstract rather than concrete, discussing the tradeoff between flexibility and complexity. Create ADR-002 explaining why Result types are preferred over exceptions for expected failures, citing improved type safety and explicit error handling. Create ADR-003 explaining why constants must be compile-time values rather than computed at runtime, discussing bundle size and tree-shaking implications. Each ADR follows the template: Context, Decision, Consequences, Alternatives Considered.

**Acceptance Criteria**:

The task is complete when README documentation comprehensively covers all primitive categories with clear explanations and examples. The barrel export successfully provides access to all primitives while maintaining tree-shakeability verified through webpack bundle analysis. Example code compiles and runs successfully, demonstrating real-world usage patterns. Architectural decision records explain key design choices with rationale and alternatives considered. Documentation review confirms that content is accessible to developers new to the codebase. Integration tests demonstrate importing from the barrel export in application code. Bundle analysis shows that importing individual items from the barrel export does not pull in unused primitives.

---

### Phase 1 Gate Review Checklist

Before proceeding to Phase 2, verify the following conditions:

The primitives directory structure exists with all specified subdirectories and README files. All primitive implementations are complete with comprehensive JSDoc documentation. Test coverage reaches one hundred percent for all primitives with all tests passing. ESLint configuration successfully enforces zero internal dependencies with builds failing if violations occur. TypeScript compilation confirms that all primitives have proper type definitions enabling IDE autocomplete and type checking. The validation script detects zero dependency violations across all primitive files. Documentation is complete and has been reviewed by at least two team members. The barrel export enables convenient importing while maintaining tree-shakeability verified through bundle analysis. All architectural decision records are written and approved. Code review confirms alignment with design document specifications.

---

## Phase 2: Error Management Capability (Weeks 3-4)

### Phase Objectives

The error management phase consolidates five separate error implementations into a single unified capability located at `shared/core/error-management/`. This phase creates specialized error classes extending BaseError, implements an error handler chain for flexible error processing, develops circuit breaker and retry patterns for resilience, and integrates error handling with Express middleware.

The critical challenge in this phase is maintaining backward compatibility while migrating from old implementations. Feature flags control whether old or new error handling executes, enabling gradual rollout with instant rollback capability. Side-by-side metrics compare error rates and latency between implementations, providing confidence before full migration.

### Phase Success Criteria

Error management phase succeeds when all five old error implementations are mapped to equivalent functionality in the new canonical location. Feature flag controls route errors through old or new code paths with zero runtime failures. All existing error tests pass against the new implementation without modification beyond import path updates. Zero circular dependencies exist in error-management verified through dependency-cruiser analysis. Specialized error classes cover all use cases from previous implementations. Error handler chain provides flexible error processing matching previous behavior. Circuit breaker pattern functions correctly under load with proper state transitions. Middleware integration handles Express errors consistently. Documentation explains error hierarchy and usage patterns with examples.

---

### TASK-2.1: Create Error Management Directory Structure

**Task Description**: Establish the complete directory structure for error-management capability with subdirectories for specialized errors, handlers, resilience patterns, and middleware integration.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System), REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 must complete providing BaseError primitive

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

The first deliverable is the complete directory structure at `error-management/` with subdirectories errors/specialized/, handlers/, patterns/, and middleware/ each containing README files explaining their purpose.

The second deliverable is TypeScript configuration for error-management inheriting from the root config but configured to depend only on primitives layer.

The third deliverable is ESLint configuration enforcing layer boundaries, preventing error-management from importing from other capabilities.

The fourth deliverable is the main README at `error-management/README.md` providing overview of error management philosophy and structure.

**Subtasks**:

First, create the directory structure. Execute `mkdir -p shared/core/error-management/{errors/specialized,handlers,patterns,middleware}` establishing all subdirectories. Create README.md files in each subdirectory with templates explaining what belongs there. The errors/specialized/ README explains that this directory contains concrete error classes for specific failure scenarios. The handlers/ README describes error processing chains and transformation logic. The patterns/ README covers resilience patterns like circuit breakers and retries. The middleware/ README explains Express integration for error handling.

Second, configure TypeScript for error-management. Create `error-management/tsconfig.json` extending the root configuration. Configure path mappings to allow imports from primitives but block imports from other capabilities like caching or observability. Set strict type checking options including noImplicitAny, strictNullChecks, and noUnusedLocals. Configure moduleResolution to node for proper package resolution.

Third, establish ESLint rules. Create `error-management/.eslintrc.json` extending the root ESLint configuration. Add import rules preventing imports from shared/core paths other than primitives. Configure the import/no-restricted-paths rule to explicitly block importing from caching/, observability/, validation/, and rate-limiting/. Set these rules to error level so violations fail builds.

Fourth, write the main README. Explain that error-management provides unified error handling consolidating previous error-handling/, errors/, and utils/error-handler.ts implementations. Describe the error hierarchy with BaseError at the root and specialized errors for specific scenarios. Explain the handler chain pattern and how it processes errors flexibly. Document the circuit breaker pattern and when to use it. Provide a quickstart example showing how to throw a ValidationError and handle it in Express middleware.

**Acceptance Criteria**:

The task is complete when the directory structure exists with all specified subdirectories and README files. TypeScript configuration successfully compiles test files that import from primitives while rejecting imports from other capabilities. ESLint fails builds if any error-management file attempts to import from capabilities beyond primitives. README documentation clearly explains the purpose of each subdirectory. Code review confirms structure matches design document specification. Team members can navigate the structure intuitively finding where different error concerns live.

---

### TASK-2.2: Implement Specialized Error Classes

**Task Description**: Create all specialized error classes including ValidationError, NotFoundError, AuthenticationError, AuthorizationError, ExternalServiceError, DatabaseError, and others extending BaseError with appropriate context and HTTP status mappings.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-2.1 must complete providing directory structure, Phase 1 provides BaseError

**Priority**: Critical Path

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is `error-management/errors/specialized/validation-error.ts` with ValidationError class including field-level error aggregation and 400 Bad Request HTTP status mapping.

The second deliverable is `error-management/errors/specialized/not-found-error.ts` with NotFoundError capturing resource type and identifier with 404 Not Found status.

The third deliverable is `error-management/errors/specialized/authentication-error.ts` with AuthenticationError for invalid or missing credentials with 401 Unauthorized status.

The fourth deliverable is `error-management/errors/specialized/authorization-error.ts` with AuthorizationError for insufficient permissions with 403 Forbidden status.

The fifth deliverable is `error-management/errors/specialized/external-service-error.ts` with ExternalServiceError including service name, operation, and retryability flag with appropriate status mapping.

The sixth deliverable is comprehensive test suite validating all specialized error classes.

**Subtasks**:

First, implement ValidationError. Create the class extending BaseError with an additional fields property storing an array of ValidationFieldError objects. Each field error contains field name, error message, optional value, and constraint that was violated. The constructor accepts message, fields array, and optional context. Implement getHttpStatus returning HTTP_STATUS.BAD_REQUEST. Add a getFieldErrors method that groups errors by field name into a Map for convenient access. Document when to use ValidationError versus returning validation results. Write tests validating error construction, field grouping, HTTP status mapping, and JSON serialization.

Second, create NotFoundError extending BaseError. Add properties for resourceType and resourceId capturing what wasn't found. The constructor generates a message like "User with ID 123 not found" from these parameters. Implement getHttpStatus returning HTTP_STATUS.NOT_FOUND. Document that NotFoundError should be used when a specific resource is requested but doesn't exist, distinct from cases where a query legitimately returns empty results. Write tests for various resource types and identifier formats.

Third, build AuthenticationError for credential failures. Add properties for authentication method attempted and optional details about why authentication failed. Implement getHttpStatus returning HTTP_STATUS.UNAUTHORIZED. Document the distinction between AuthenticationError (proving identity) and AuthorizationError (having permission). Add guidance about not including sensitive details in error messages. Write tests covering various authentication failure scenarios.

Fourth, implement AuthorizationError for permission failures. Add properties for required permission and the action that was attempted. Implement getHttpStatus returning HTTP_STATUS.FORBIDDEN. Document when to use 403 Forbidden versus 401 Unauthorized, explaining that 403 means the server understood who you are but you lack permission. Write tests validating proper status codes and context capture.

Fifth, create ExternalServiceError for third-party integration failures. Add properties for serviceName, serviceOperation, and retryable boolean indicating whether the operation should be retried. Implement getHttpStatus returning HTTP_STATUS.SERVICE_UNAVAILABLE for retryable errors and HTTP_STATUS.BAD_GATEWAY for non-retryable errors. Document how to determine retryability based on error types like network timeouts versus validation failures. Write tests covering both retryable and non-retryable scenarios.

Sixth, create comprehensive tests in `error-management/errors/specialized/__tests__/`. For each error class, test construction with various parameter combinations, HTTP status code mapping, context sanitization, JSON serialization format, and inheritance from BaseError. Test error chains where one error is caused by another. Verify that all specialized errors are operational by default. Test that field-specific methods like ValidationError.getFieldErrors work correctly.

**Acceptance Criteria**:

The task is complete when all specialized error classes exist with complete implementations and documentation. Each error class properly extends BaseError and implements getHttpStatus with appropriate HTTP status codes. ValidationError correctly groups field errors by field name. ExternalServiceError distinguishes retryable from non-retryable failures. All error classes mark themselves as operational since they represent expected failure scenarios. Test coverage reaches one hundred percent with all edge cases validated. Documentation explains when to use each error type with concrete examples. Code review confirms consistent patterns across all specialized errors. Integration tests demonstrate using specialized errors in realistic scenarios.

---

### TASK-2.3: Implement Error Handler Chain

**Task Description**: Create the error handler chain infrastructure that processes errors through registered handlers in priority order, enabling flexible error transformation and response generation.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-2.2 must complete providing specialized errors to handle

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `error-management/handlers/error-handler.ts` containing the ErrorHandler interface, ErrorHandlerChain implementation, and supporting types for error context and responses.

The second deliverable is `error-management/handlers/validation-error-handler.ts` with specialized handler for ValidationError that formats field errors appropriately.

The third deliverable is `error-management/handlers/operational-error-handler.ts` with generic handler for all operational errors with appropriate logging.

The fourth deliverable is `error-management/handlers/non-operational-error-handler.ts` for handling programmer errors with stack trace inclusion and alerting.

The fifth deliverable is comprehensive test suite validating handler chain behavior, priority ordering, and error transformation.

**Subtasks**:

First, define the ErrorHandler interface in `error-management/handlers/error-handler.ts`. The interface requires a canHandle method accepting an Error and returning boolean, a handle method accepting Error and ErrorContext returning Promise<ErrorResponse>, and a priority number for ordering handlers. Lower priority numbers execute first, enabling specific handlers to run before generic handlers. Define ErrorContext interface with fields for correlationId, userId, request path, HTTP method, headers, and arbitrary metadata. Define ErrorResponse interface containing HTTP status, message, error code, request ID, timestamp, optional errors array for field-level details, and optional stack trace.

Second, implement ErrorHandlerChain class. Maintain an array of registered handlers sorted by priority. Implement a register method that adds handlers and re-sorts the array. Implement the handle method that iterates through handlers calling canHandle on each until finding one that returns true, then delegating to that handler's handle method. If no handler matches, fall back to a default handler that logs the unknown error and returns a generic 500 Internal Server Error response. Document that the chain pattern enables extensibility without modifying existing handlers.

Third, create ValidationErrorHandler in a separate file. Implement canHandle checking if the error is an instanceof ValidationError. Implement handle method that extracts field errors using ValidationError's getFieldErrors method, formats them into an array of objects with field names and message arrays, and returns an ErrorResponse with 400 status including the formatted field errors. Document that this handler has high priority (low number) so it processes ValidationErrors before generic handlers.

Fourth, build OperationalErrorHandler for generic operational error processing. Implement canHandle checking if error is instanceof BaseError and error.isOperational is true. Implement handle method that logs the error at warn level since operational errors are expected conditions, extracts the HTTP status from error.getHttpStatus(), and returns an ErrorResponse without stack traces since operational errors shouldn't expose internals. Accept a logger instance through constructor injection demonstrating dependency inversion. Document that this handler has medium priority processing operational errors that don't have more specific handlers.

Fifth, implement NonOperationalErrorHandler for programmer errors. Implement canHandle checking if error is instanceof BaseError and error.isOperational is false, or if error is a standard JavaScript error like TypeError. Implement handle method that logs at error level, includes stack traces in the response for debugging (but only in development environments), triggers alerting for critical errors, and returns 500 Internal Server Error. Document that non-operational errors indicate bugs requiring immediate attention.

Sixth, create comprehensive tests. Test that handler registration sorts by priority correctly. Test that the chain processes errors through handlers in priority order. Test that specific handlers run before generic handlers. Test that the default handler catches unhandled error types. For each handler, test canHandle correctly identifies applicable errors, handle produces correct ErrorResponse format, and logging/alerting happens appropriately. Test error chains where multiple handlers could match ensuring only the first matching handler executes. Test that handlers with the same priority maintain registration order.

**Acceptance Criteria**:

The task is complete when the ErrorHandler interface and ErrorHandlerChain are fully implemented with comprehensive documentation. All specialized handlers exist for ValidationError, operational errors, and non-operational errors. Handler registration and priority ordering work correctly verified through unit tests. The chain correctly delegates to the first matching handler. The default handler provides reasonable fallback for unknown error types. Dependency injection enables passing logger instances to handlers. Test coverage reaches one hundred percent including all error path scenarios. Documentation explains the chain pattern and how to add new handlers. Code review confirms the pattern is extensible without modifying existing code. Integration tests demonstrate the complete handler chain processing various error types.

---

### TASK-2.4: Implement Circuit Breaker Pattern

**Task Description**: Create the circuit breaker implementation for resilience against cascading failures when calling external dependencies, with proper state management and configurable thresholds.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-2.2 provides specialized errors, Phase 1 provides Result type

**Priority**: High

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is `error-management/patterns/circuit-breaker.ts` containing the complete CircuitBreaker class with state management, failure tracking, and operation wrapping.

The second deliverable is `error-management/patterns/circuit-breaker-error.ts` with specialized CircuitBreakerError extending BaseError.

The third deliverable is `error-management/patterns/__tests__/circuit-breaker.test.ts` with comprehensive tests validating state transitions and behavior under various failure scenarios.

The fourth deliverable is documentation explaining circuit breaker concepts and configuration guidance.

**Subtasks**:

First, implement CircuitBreaker class structure. Define CircuitBreakerConfig interface with fields for failureThreshold (open circuit after N failures), successThreshold (close circuit after N successes in half-open), timeout (fail fast after duration), resetTimeout (try half-open after duration), and monitoringWindow (track failures over time window). Define CircuitState enum with CLOSED, OPEN, and HALF_OPEN states. Initialize circuit in CLOSED state. Accept name, config, and optional logger through constructor.

Second, implement the execute method that wraps operations. Accept an async operation function returning Promise<T>. Check current state: if OPEN, check if reset timeout has elapsed and transition to HALF_OPEN if so, otherwise return Err with CircuitBreakerError. If CLOSED or HALF_OPEN, race the operation against a timeout promise. If operation succeeds, call recordSuccess. If operation fails or times out, call recordFailure. Return Result<T, Error> wrapping the outcome.

Third, implement failure tracking and state management. Maintain a failures array storing timestamps of recent failures. In recordFailure, add current timestamp and remove failures outside the monitoring window. If failure count exceeds threshold and state is CLOSED, transition to OPEN. If state is HALF_OPEN, any failure immediately transitions back to OPEN. In recordSuccess, if state is HALF_OPEN, increment success counter and transition to CLOSED when reaching success threshold. Reset counters on state transitions.

Fourth, implement state transition logic. Create a transitionTo method that updates state, logs the transition with old state, new state, and failure count, and resets appropriate counters. When transitioning to CLOSED, reset failure count and success count. When transitioning to OPEN, record the timestamp for calculating reset timeout. When transitioning to HALF_OPEN, reset success count.

Fifth, create CircuitBreakerError class. Extend BaseError with additional fields for circuit name and retryAfter duration. Implement getHttpStatus returning HTTP_STATUS.SERVICE_UNAVAILABLE since circuit open means the service is temporarily unavailable. Document that clients should respect retryAfter and implement exponential backoff.

Sixth, implement monitoring and metrics. Add getState method returning current state. Add getMetrics method returning object with circuit name, current state, failure count, success count, and last failure timestamp. Document that these metrics should be exported to monitoring systems for observability.

Seventh, write comprehensive tests. Test that circuit opens after exceeding failure threshold. Test that circuit transitions to half-open after reset timeout. Test that successful operations in half-open close the circuit. Test that failures in half-open immediately reopen the circuit. Test that timeout causes failures. Test that failures outside monitoring window don't count toward threshold. Test concurrent operations handle state transitions correctly. Test that metrics accurately reflect circuit state.

**Acceptance Criteria**:

The task is complete when CircuitBreaker class correctly implements all three states with proper transition logic. Failure tracking uses sliding window over monitoring period. Timeout mechanism prevents operations from hanging indefinitely. State transitions are thread-safe for concurrent operation execution. CircuitBreakerError provides clear information about circuit state and retry guidance. Metrics enable monitoring circuit health in production. Test coverage includes all state transitions and edge cases like concurrent operations during state changes. Documentation explains when to use circuit breakers and how to configure thresholds appropriately. Performance testing shows minimal overhead when circuit is closed. Load testing validates correct behavior under high concurrency.

---

### TASK-2.5: Implement Retry Pattern

**Task Description**: Create a flexible retry mechanism with exponential backoff, jitter, and configurable retry policies for handling transient failures.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-2.2 provides specialized errors, Phase 1 provides Result type

**Priority**: Medium

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `error-management/patterns/retry-strategy.ts` containing retry logic with exponential backoff, jitter, and configurable policies.

The second deliverable is `error-management/patterns/retry-policy.ts` with interfaces for determining whether errors are retryable.

The third deliverable is comprehensive tests validating retry behavior, backoff calculations, and policy evaluation.

**Subtasks**:

First, define RetryConfig interface specifying maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier, jitterMs, and retryableErrors array. Define RetryPolicy interface with an isRetryable method accepting Error and returning boolean. Implement several built-in policies: RetryOnNetworkErrors checks for network-related failures, RetryOnTimeout checks for timeout errors, RetryOnServerErrors checks for 5xx status codes, and NeverRetry policy for testing.

Second, implement the retry function accepting an operation, config, and optional policy. Initialize attempt counter to zero. In a loop up to maxAttempts, execute the operation wrapped in try-catch. If successful, return Ok with the result. If error occurs, check if retryable using the policy. If not retryable, return Err immediately. If retryable and attempts remain, calculate backoff delay using exponential formula with jitter, await the delay, increment attempt counter, and continue loop. After exhausting attempts, return Err with the final error.

Third, implement exponential backoff calculation. Start with initialDelayMs. Multiply by backoffMultiplier raised to the power of attempt number. Cap at maxDelayMs. Add random jitter between negative and positive jitterMs to prevent thundering herd. Document that jitter prevents multiple clients from retrying simultaneously.

Fourth, create specialized retry policies. NetworkRetryPolicy checks error types indicating network issues like ECONNREFUSED, ETIMEDOUT, or ENOTFOUND. ServerErrorRetryPolicy checks if error has HTTP status code >= 500. ExternalServiceRetryPolicy checks if error is ExternalServiceError with retryable flag true. CompositeRetryPolicy accepts multiple policies and considers error retryable if any policy says so.

Fifth, add retry statistics tracking. Count total attempts, successful retries, failed retries, and average delay. Expose getStats method returning these metrics. Document that retry metrics should be monitored to detect reliability issues with external services.

Sixth, write comprehensive tests. Test that retry executes operation up to maxAttempts times. Test that successful operation returns immediately without retry. Test that non-retryable errors return immediately. Test that backoff delay increases exponentially. Test that jitter adds randomness to delays. Test that maxDelay cap is respected. Test that retry policies correctly identify retryable errors. Test that composite policies work correctly. Test retry statistics accuracy.

**Acceptance Criteria**:

The task is complete when retry mechanism correctly implements exponential backoff with jitter. Retry policies accurately identify retryable versus non-retryable errors. MaxAttempts cap prevents infinite retry loops. Delays respect maxDelay configuration. Jitter prevents synchronized retries. Statistics provide visibility into retry behavior. Test coverage includes all retry scenarios and policy combinations. Documentation explains when to use retry versus circuit breaker and how to configure policies. Performance testing validates that retry overhead is minimal. Integration tests demonstrate retry working with circuit breaker for comprehensive resilience.

---

### TASK-2.6: Create Error Management Middleware

**Task Description**: Implement Express middleware that integrates error management with the request-response cycle, handling both synchronous and asynchronous errors consistently.

**Fulfills Requirements**: REQ-1.1 (Unified Error Management System)

**Dependencies**: TASK-2.3 provides error handler chain, TASK-2.2 provides specialized errors

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `error-management/middleware/error-middleware.ts` containing Express error handling middleware using the error handler chain.

The second deliverable is `error-management/middleware/async-handler.ts` with wrapper for async route handlers that catches promise rejections.

The third deliverable is integration tests demonstrating middleware behavior with various error types.

**Subtasks**:

First, implement error handling middleware. Create a function accepting ErrorHandlerChain and returning Express error middleware with signature (err, req, res, next). Extract error context from request including correlationId from res.locals, userId if available, request path, HTTP method, and headers. Call errorHandlerChain.handle passing the error and context. Send the ErrorResponse with appropriate HTTP status code and JSON body. Handle cases where response has already been sent to prevent header errors. Log errors at appropriate levels based on isOperational flag.

Second, create async handler wrapper. Implement a function accepting an async RequestHandler and returning a RequestHandler that wraps the async function in try-catch. If the async function rejects, call next(error) to delegate to error middleware. This enables async route handlers to throw errors without explicit try-catch blocks. Document that this wrapper is necessary because Express doesn't catch promise rejections by default.

Third, implement error response formatting. Create a formatErrorResponse function that takes ErrorResponse and request context, determines appropriate detail level based on environment (development includes stack traces, production excludes them), and formats the JSON response consistently. Include request ID in all responses to enable correlation with logs.

Fourth, add error tracking and metrics. Record metrics for each error including error type, HTTP status code, request path, and response time. Increment counters for total errors, errors by type, and errors by status code. Emit these metrics to the observability system for monitoring.

Fifth, write integration tests. Test that middleware catches synchronous errors thrown in route handlers. Test that async handler wrapper catches promise rejections. Test that specialized errors are handled by appropriate handlers. Test that error responses include correct status codes and messages. Test that operational errors exclude stack traces while non-operational errors include them in development. Test that error context is properly populated from request. Test that middleware works correctly when response has already been sent.

**Acceptance Criteria**:

The task is complete when error middleware successfully integrates error handler chain with Express. Async handler wrapper catches promise rejections consistently. Error responses are formatted correctly with appropriate detail levels. Error tracking metrics are emitted for monitoring. Middleware handles edge cases like responses already sent. Test coverage includes all error paths and middleware interactions. Documentation explains how to integrate error middleware in Express applications. Code review confirms proper Express middleware patterns. Integration tests validate end-to-end error handling from route handler through middleware to response.

---

### TASK-2.7: Implement Feature Flag for Migration

**Task Description**: Create feature flag infrastructure controlling whether old or new error handling executes, enabling gradual rollout with instant rollback capability.

**Fulfills Requirements**: REQ-4.1 (Zero-Downtime Migration Path)

**Dependencies**: TASK-2.6 completes middleware, migration tools directory exists

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `migration/feature-flags/error-management-flag.ts` with feature flag configuration and evaluation logic.

The second deliverable is backward compatibility adapters in `error-management/legacy-adapters/` that bridge old error handling to new implementation.

The third deliverable is metrics collection comparing old and new error handling paths side-by-side.

**Subtasks**:

First, implement feature flag configuration. Define ErrorManagementFlag class with methods isEnabled accepting optional context like userId for percentage-based rollout. Initialize flag reading from environment variable ERROR_MANAGEMENT_NEW with default false. Support gradual rollout through percentage configuration where flag is enabled for specific percentage of users based on deterministic hash of user ID.

Second, create legacy adapters bridging old to new. In `error-management/legacy-adapters/old-error-handler-adapter.ts`, wrap the old error handler to conform to new ErrorHandler interface. Map old error types to new specialized errors. Ensure old error handling behavior is preserved when flag is disabled. Document that these adapters enable coexistence during migration.

Third, implement side-by-side execution for metrics comparison. When flag is enabled, execute both old and new error handling paths asynchronously, compare results, and emit metrics on differences. Log any discrepancies for investigation. Return new path result to user while collecting metrics on old path in background. Document that side-by-side execution provides confidence in migration correctness.

Fourth, add monitoring and alerting. Track metrics including percentage of requests using new path, error rates for old versus new paths, latency differences, and format differences in error responses. Alert if new path error rate exceeds old path by significant margin. Provide dashboard showing migration progress and health.

Fifth, write tests validating flag behavior. Test that flag returns correct value based on configuration. Test percentage-based rollout produces consistent results for same user ID. Test that flag changes take effect without application restart. Test that legacy adapters correctly bridge old to new. Test side-by-side execution produces equivalent results. Test that metrics accurately capture differences between paths.

**Acceptance Criteria**:

The task is complete when feature flag correctly controls error handling path selection. Percentage-based rollout enables gradual migration. Legacy adapters maintain old behavior when flag is disabled. Side-by-side execution compares paths without affecting user experience. Metrics provide visibility into migration health. Instant rollback is possible by disabling flag. Test coverage validates all flag scenarios. Documentation explains how to configure and monitor migration. Integration tests demonstrate safe coexistence of old and new paths.

---

### TASK-2.8: Migrate Existing Error Tests

**Task Description**: Migrate all existing error handling tests from old locations to new error-management structure, ensuring 100% test coverage is maintained and all tests pass.

**Fulfills Requirements**: REQ-5.1 (Comprehensive Test Migration)

**Dependencies**: TASK-2.2 through TASK-2.6 provide implementation to test against

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is migrated test files in `error-management/__tests__/` covering all error classes and handler functionality.

The second deliverable is test coverage report showing equal or improved coverage compared to pre-migration baseline.

The third deliverable is test migration report documenting which tests were migrated from which old locations.

**Subtasks**:

First, inventory existing error tests. Scan error-handling/, errors/, and utils/error-handler.ts directories identifying all test files. Document test coverage in each location. Identify duplicate tests covering same functionality. Create migration plan mapping old tests to new locations in error-management/__tests__/.

Second, migrate specialized error tests. Copy tests from old error class implementations to error-management/errors/specialized/__tests__/. Update import paths to reference new locations. Remove duplicate tests preferring the most comprehensive version. Ensure all tests pass against new implementations. Add tests for new features not in old implementations.

Third, migrate handler tests. Convert tests for old error handler implementations to test new error handler chain. Update test fixtures and mocks to work with new ErrorHandler interface. Ensure handler chain tests cover priority ordering and delegation. Add integration tests for complete handler chain scenarios.

Fourth, migrate pattern tests. If circuit breaker or retry tests existed in old locations, migrate them to error-management/patterns/__tests__/. If no tests existed, create comprehensive test suites. Ensure resilience patterns are thoroughly tested under various failure scenarios.

Fifth, migrate middleware tests. Move any existing error middleware tests to error-management/middleware/__tests__/. Add tests for async handler wrapper. Create integration tests exercising complete request-error-response cycle.

Sixth, generate coverage report and compare to baseline. Run test coverage analysis on new error-management structure. Compare to coverage baseline from old implementations. Investigate any coverage decreases. Add tests to maintain or improve coverage. Document coverage improvements from consolidation.

**Acceptance Criteria**:

The task is complete when all existing error tests are migrated to new locations with updated import paths. Test coverage equals or exceeds pre-migration baseline of seventy-six percent overall with error handling specifically reaching ninety percent. All migrated tests pass without modification beyond imports. Duplicate tests are eliminated with best version retained. Test migration report documents complete mapping from old to new. Coverage report shows improvement from consolidation. Tests validate new features not present in old implementations. Integration tests demonstrate complete error handling flows. Code review confirms test quality and completeness.

---

### TASK-2.9: Create Error Management Documentation

**Task Description**: Write comprehensive documentation for error-management capability including usage guide, error hierarchy explanation, migration instructions, and troubleshooting guide.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation), REQ-6.2 (Migration Guide Documentation)

**Dependencies**: All other Phase 2 tasks provide content to document

**Priority**: Normal

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `error-management/README.md` with complete capability overview, quick start guide, and API reference.

The second deliverable is `error-management/docs/error-hierarchy.md` explaining the complete error class hierarchy and when to use each type.

The third deliverable is `error-management/docs/migration-guide.md` with step-by-step instructions for migrating from old error implementations.

The fourth deliverable is `error-management/docs/troubleshooting.md` with common issues and solutions.

**Subtasks**:

First, write main README providing overview of error management consolidation, explaining that it replaces five previous implementations with single canonical source. Include quick start showing how to throw ValidationError, handle it in middleware, and format response. Document integration with observability for error tracking. Provide links to detailed documentation.

Second, create error hierarchy documentation. Draw diagram showing BaseError at root with specialized errors as children. For each error type, explain when to use it, what context it captures, what HTTP status it maps to, and provide code examples. Explain operational versus non-operational distinction with examples of each category. Document how to create custom error types extending BaseError.

Third, write migration guide explaining how to migrate from old error implementations. Provide mapping showing which old error classes correspond to which new errors. Document import path changes with search-and-replace patterns. Explain feature flag usage for gradual migration. Provide checklist for ensuring migration completeness. Include rollback procedures if issues arise.

Fourth, create troubleshooting guide addressing common issues. Document what to do if errors aren't caught by middleware. Explain how to debug handler chain priority issues. Provide guidance on circuit breaker tuning. Address common mistakes like forgetting to mark errors as operational. Include FAQ section with answers to frequently asked questions.

Fifth, document best practices. Explain when to use errors versus Result types. Provide guidance on error context: what to include, what to avoid. Document error message formatting conventions. Explain integration with logging and monitoring. Provide examples of good error handling patterns.

**Acceptance Criteria**:

The task is complete when README provides clear overview and quick start guiding new users. Error hierarchy documentation explains all error types with examples. Migration guide provides step-by-step instructions with complete import path mappings. Troubleshooting guide addresses common issues with solutions. Best practices document provides guidance on effective error handling. Documentation review confirms content is accurate and accessible. Code examples in documentation compile and run successfully. Documentation links to related capabilities like observability. Internal team members confirm documentation helps them understand and use error management.

---

### Phase 2 Gate Review Checklist

Before proceeding to Phase 3, verify the following conditions:

All specialized error classes are implemented extending BaseError with appropriate HTTP status mappings. Error handler chain correctly processes errors through registered handlers in priority order. Circuit breaker pattern functions correctly with proper state transitions under load. Retry pattern implements exponential backoff with jitter and configurable policies. Error middleware integrates seamlessly with Express request handling. Feature flag controls old versus new error handling with instant rollback capability. All existing error tests are migrated and passing with maintained or improved coverage. Side-by-side metrics compare old and new paths showing equivalent behavior. Documentation is complete including error hierarchy, migration guide, and troubleshooting. Zero circular dependencies exist in error-management verified through dependency analysis. Code review confirms alignment with design specifications. Gradual rollout to ten percent of traffic shows no issues for one week.

---

## Phase 3: Caching Capability (Weeks 5-6)

### Phase Objectives

The caching phase consolidates multiple cache implementations into a unified caching capability with a single CacheInterface implemented by various adapters. This phase eliminates the parallel AI-specific cache system by implementing AI enhancements as an adapter rather than a separate system. The multi-tier caching strategy composes memory and Redis adapters transparently, and cache key generation is centralized for consistency.

The critical challenge is maintaining performance parity with existing implementations while achieving better tree-shakeability through the adapter pattern. Feature flags control cache backend selection, enabling A/B testing of performance characteristics between old and new implementations.

### Phase Success Criteria

Caching phase succeeds when single CacheInterface is implemented by all adapters including memory, Redis, multi-tier, and AI-enhanced. AI-specific caching exists as adapter extending base caching rather than parallel system. Cache statistics are collected uniformly across all adapters enabling meaningful comparison. Cache key generation through CacheKeyBuilder ensures consistency preventing subtle bugs from key mismatches. Performance benchmarks show equivalent or better latency compared to old implementations. Feature flag enables gradual migration with rollback capability. All cache tests migrate and pass. Documentation explains adapter selection criteria and configuration patterns.

---

### TASK-3.1: Create Caching Directory Structure

**Task Description**: Establish the complete directory structure for the caching capability with subdirectories for core interfaces, adapters, patterns, and middleware.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction), REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 provides primitives including Result type

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

The first deliverable is complete directory structure at `caching/` with subdirectories core/, adapters/, patterns/, and middleware/ each containing README files.

The second deliverable is TypeScript configuration for caching depending only on primitives layer.

The third deliverable is ESLint configuration enforcing layer boundaries.

The fourth deliverable is main README explaining caching architecture and adapter pattern.

**Subtasks**:

First, create directory structure executing `mkdir -p shared/core/caching/{core,adapters,patterns,middleware}`. Create README.md in each subdirectory. The core/ README explains that this contains CacheInterface and related interfaces. The adapters/ README describes that adapters implement CacheInterface for different backends. The patterns/ README covers cache access patterns like cache-aside and write-through. The middleware/ README explains Express integration for response caching.

Second, configure TypeScript for caching. Create `caching/tsconfig.json` extending root configuration. Allow imports from primitives but block other capabilities. Enable strict type checking. Configure output settings for proper module resolution.

Third, establish ESLint rules. Create `caching/.eslintrc.json` extending root configuration. Add import rules preventing dependencies on other capabilities except primitives. Configure no-circular-dependencies rule. Set violations to error level failing builds.

Fourth, write main README explaining unified caching architecture. Describe how adapter pattern enables swapping implementations without changing application code. Explain when to use memory versus Redis versus multi-tier adapters. Provide quick start example showing cache configuration and usage. Link to detailed documentation.

**Acceptance Criteria**:

The task is complete when directory structure exists with all subdirectories and READMEs. TypeScript configuration compiles files importing from primitives while rejecting imports from other capabilities. ESLint enforces layer boundaries failing builds on violations. README provides clear overview of caching architecture. Team members can navigate structure intuitively. Code review confirms alignment with design document structure.

---

### TASK-3.2: Implement Core Cache Interface

**Task Description**: Define the CacheInterface that all adapters must implement, along with related types for cache operations, metadata, and statistics.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.1 provides directory structure, Phase 1 provides Result type

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `caching/core/cache-interface.ts` containing CacheInterface definition with all required methods and supporting types.

The second deliverable is `caching/core/cache-models.ts` with data models for cached values, metadata, and options.

The third deliverable is `caching/core/cache-stats.ts` with statistics tracking implementation.

The fourth deliverable is comprehensive tests validating interface contracts.

**Subtasks**:

First, define CacheInterface with all required methods. Include get accepting key returning Result<CachedValue<T>, CacheError>. Include set accepting key, value, and optional CacheSetOptions returning Result<void, CacheError>. Include delete accepting key returning Result<boolean, CacheError>. Include clear accepting optional pattern returning Result<number, CacheError>. Include has accepting key returning Result<boolean, CacheError>. Include getMultiple accepting keys array returning Result<Map<string, CachedValue<T>>, CacheError>. Include setMultiple accepting entries Map returning Result<void, CacheError>. Include getStats returning CacheStats. Make interface generic over value type T.

Second, define supporting types in cache-models.ts. Define CachedValue<T> interface with value field and metadata field. Define CacheMetadata interface with cachedAt timestamp, optional expiresAt timestamp, version string, tags array, and optional size number. Define CacheSetOptions interface with optional ttl, tags array, version string, and metadata record. Define CacheError extending BaseError with additional operation field and optional key field.

Third, implement CacheStats class for statistics tracking. Track hits, misses, evictions, sets, deletes, and clears. Provide methods recordHit, recordMiss, recordEviction, recordSet, recordDelete, recordClear. Implement getStats method returning object with all counters plus calculated hit rate and average access time. Support resetting statistics. Make thread-safe for concurrent access.

Fourth, write comprehensive tests. Test that CacheInterface defines all required methods with correct signatures. Test that CacheError properly extends BaseError. Test that CacheStats accurately tracks all operations. Test that statistics calculations like hit rate work correctly. Test thread safety of stats collection under concurrent operations.

**Acceptance Criteria**:

The task is complete when CacheInterface defines complete caching API with all necessary methods. Supporting types enable rich metadata and options. CacheError provides appropriate error information. CacheStats accurately tracks all cache operations with thread safety. Tests validate interface contracts. Documentation explains each method's behavior and when to use various options. Code review confirms interface is well-designed and comprehensive. TypeScript provides excellent autocomplete and type checking for cache operations.

---

### TASK-3.3: Implement Cache Key Builder

**Task Description**: Create centralized cache key generation ensuring consistency across all adapters, with support for namespacing, serialization normalization, and collision avoidance.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.2 provides cache interface, Phase 1 provides primitives

**Priority**: High

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `caching/core/cache-key-builder.ts` with CacheKeyBuilder class providing deterministic key generation.

The second deliverable is comprehensive tests validating key generation consistency and collision avoidance.

**Subtasks**:

First, implement CacheKeyBuilder accepting configuration for namespace, separator, and serialization options. Provide build method accepting key string or object returning normalized cache key string. Support namespace prefixing to isolate different cache domains. Implement object key serialization through deterministic JSON stringification with sorted keys. Add hash function for generating short keys from long inputs.

Second, implement key normalization ensuring consistency. Trim whitespace from string keys. Sort object keys before serialization to ensure same object produces same key regardless of property order. Handle special characters that might cause issues in some cache backends. Document key format conventions.

Third, add collision detection and avoidance. Implement hashing for long keys exceeding maximum length. Use strong hash function like SHA-256 to minimize collision probability. Include original key length in hash to detect collisions between keys of different lengths. Provide validateKey method checking for potential issues.

Fourth, support key prefixing and tagging. Allow configuring global prefix for all keys. Support optional tags appended to keys for invalidation. Implement wildcardpattern matching for bulk operations. Document tagging strategies for cache invalidation.

Fifth, write comprehensive tests. Test that same input consistently produces same key. Test that different inputs produce different keys. Test that object serialization is order-independent. Test namespace isolation prevents key collisions. Test hash generation for long keys. Test pattern matching for bulk operations. Test special character handling.

**Acceptance Criteria**:

The task is complete when CacheKeyBuilder generates consistent keys for same inputs. Object serialization is deterministic with sorted keys. Namespace prefixing isolates cache domains. Hash function minimizes collision probability. Key validation detects potential problems. Pattern matching enables bulk operations. Tests cover all key generation scenarios. Documentation explains key format and best practices. Code review confirms robust key generation. Integration tests show CacheKeyBuilder working with various adapters.

---

### TASK-3.4: Implement Memory Cache Adapter

**Task Description**: Create memory-based cache adapter implementing CacheInterface with LRU eviction, TTL expiration, and size limits.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.2 provides interface, TASK-3.3 provides key builder

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `c

I'll complete the implementation plan document, continuing from where it left off at Task 3.4. Let me provide the remaining tasks through Phase 8.

---

## Phase 3: Caching Capability (Weeks 5-6) - Continued

### TASK-3.4: Implement Memory Cache Adapter - Continued

**Task Description**: Create memory-based cache adapter implementing CacheInterface with LRU eviction, TTL expiration, and size limits.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.2 provides interface, TASK-3.3 provides key builder

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `caching/adapters/memory-adapter.ts` containing the complete MemoryCacheAdapter class with LRU eviction policy, automatic TTL expiration, and configurable memory limits.

The second deliverable is comprehensive test suite in `caching/adapters/__tests__/memory-adapter.test.ts` validating all cache operations, eviction behavior, and TTL handling.

The third deliverable is performance benchmarks demonstrating memory adapter achieves sub-millisecond get/set operations.

**Subtasks**:

First, implement the MemoryCacheAdapter class structure. Accept MemoryCacheConfig and CacheKeyBuilder through constructor. Initialize internal Map for storing cached values and separate Map for tracking expiration timers. Initialize CacheStats instance for metrics collection. Configure cleanup interval for proactive removal of expired entries.

Second, implement the get method. Build the full cache key using the key builder. Check if the key exists in the cache Map. If not found, record a miss in stats and return Err with cache miss error. If found, check whether the entry has expired by comparing current timestamp with the expiresAt metadata field. If expired, delete the entry, clear its expiration timer, record a miss, and return Err. If valid, record a hit with the operation duration and return Ok with the cached value.

Third, implement the set method. Build the full cache key. Check if the cache should evict entries based on configured limits using the shouldEvict helper method. If eviction is needed, call the evictLRU method to remove the least recently cached entry. Create a CachedValue object wrapping the value with metadata including cachedAt timestamp, optional expiresAt based on TTL, version string, tags array, and estimated size. Store the cached value in the Map. If a TTL was provided, schedule expiration using the scheduleExpiration helper. Record the set operation in stats and return Ok.

Fourth, implement the delete method. Build the full cache key. Attempt to delete from the Map, capturing whether the key existed. Clear any expiration timer for this key. If the key existed, record an eviction in stats. Return Ok with boolean indicating whether deletion occurred.

Fifth, implement the clear method with optional pattern matching. If no pattern is provided, clear the entire cache Map and all expiration timers, returning the count of cleared entries. If a pattern is provided, convert it to a RegExp. Iterate through cache entries, testing each key and the entry's tags array against the pattern. Delete matching entries and clear their expiration timers. Return Ok with the count of cleared entries.

Sixth, implement the has method that checks key existence without affecting hit/miss statistics. Build the full key, check Map containment, verify the entry hasn't expired, and return Ok with boolean result.

Seventh, implement getMultiple and setMultiple for batch operations. For getMultiple, iterate through the keys array, call get on each, and collect successful results into a Map. For setMultiple, iterate through the entries Map calling set on each key-value pair. These batch operations optimize scenarios where multiple cache entries are accessed together.

Eighth, implement helper methods for cache management. The shouldEvict method checks if the current cache size exceeds maxEntries configuration or if total memory usage exceeds maxSizeBytes. The evictLRU method finds the entry with the oldest cachedAt timestamp and removes it. The scheduleExpiration method creates a setTimeout that will delete the entry when TTL expires. The clearExpiration method cancels any existing timer for a key. The estimateSize method approximates the memory footprint of a cached value by serializing to JSON and measuring the resulting string length.

Ninth, implement the startCleanupInterval method that runs periodically to remove expired entries proactively rather than only checking on access. This interval scans through all entries, compares expiresAt timestamps with current time, and deletes expired entries. This prevents memory leaks from entries that are cached but never accessed again.

Tenth, write comprehensive tests. Test that set and get operations work correctly for simple values. Test that TTL expiration removes entries after the specified duration. Test that LRU eviction removes oldest entries when limits are reached. Test that size-based eviction works when maxSizeBytes is configured. Test that pattern-based clearing works for both key patterns and tag patterns. Test that batch operations correctly handle multiple keys. Test that the cleanup interval proactively removes expired entries. Test concurrent operations don't corrupt cache state.

**Acceptance Criteria**:

The task is complete when MemoryCacheAdapter fully implements CacheInterface with all required methods. LRU eviction correctly removes least recently stored entries when configured limits are exceeded. TTL expiration automatically removes entries after their configured lifetime. The cleanup interval prevents unbounded memory growth from expired entries. Batch operations optimize multi-key access patterns. Test coverage reaches one hundred percent with all edge cases validated. Performance benchmarks show get operations complete in under one hundred microseconds and set operations in under two hundred microseconds for the memory adapter. Memory usage stays within configured limits even under sustained load. Integration tests demonstrate the adapter working correctly with the CacheKeyBuilder.

---

### TASK-3.5: Implement Redis Cache Adapter

**Task Description**: Create Redis-based cache adapter implementing CacheInterface with connection pooling, serialization, and distributed cache coordination.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.2 provides interface, TASK-3.3 provides key builder

**Priority**: High

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is `caching/adapters/redis-adapter.ts` containing RedisCacheAdapter with Redis client management, JSON serialization, and error handling.

The second deliverable is `caching/adapters/__tests__/redis-adapter.test.ts` with comprehensive tests including Redis mock scenarios.

The third deliverable is integration tests demonstrating Redis adapter working with actual Redis instance in test environment.

The fourth deliverable is documentation explaining Redis configuration options, connection pooling, and failover strategies.

**Subtasks**:

First, implement RedisCacheAdapter class structure accepting RedisConfig and CacheKeyBuilder. Initialize Redis client using configuration including host, port, password, database number, and connection pool settings. Set up connection event handlers for connect, error, and close events that log appropriately. Initialize CacheStats for metrics collection. Implement graceful shutdown that closes Redis connection cleanly.

Second, implement the get method for Redis. Build the full cache key using key builder. Execute Redis GET command asynchronously. If the key doesn't exist, record miss and return Err with cache miss error. If found, parse the JSON-serialized value back into a CachedValue object. Check if the entry has expired by examining its expiresAt metadata. If expired, proactively delete it from Redis, record miss, and return Err. If valid, record hit with operation duration and return Ok with the cached value.

Third, implement the set method. Build the full cache key. Serialize the value and metadata into JSON. If TTL is provided, use Redis SETEX command that atomically sets value with expiration. If no TTL, use plain SET command. Handle serialization errors gracefully by returning Err with appropriate error context. Record set operation in stats and return Ok on success.

Fourth, implement delete method using Redis DEL command. Return Ok with boolean indicating whether the key existed before deletion. Implement clear method that handles pattern matching using Redis SCAN and DEL commands. For patterns, use SCAN to iterate through matching keys without blocking Redis, then delete in batches. This approach prevents performance issues with large Redis datasets.

Fifth, implement has method using Redis EXISTS command which efficiently checks key presence without retrieving the value. This optimization is significant for large cached values where we only need existence confirmation.

Sixth, implement getMultiple using Redis MGET command for batch retrieval. Build full keys for all requested keys, execute MGET, parse all returned values, filter out null results and expired entries, and return Map of valid cached values. This provides significant performance improvement over individual gets.

Seventh, implement setMultiple using Redis pipeline to batch multiple SET operations. Create Redis pipeline, add SET or SETEX commands for each entry, execute pipeline atomically, and handle partial failures by returning error if any operation failed.

Eighth, implement connection health monitoring. Add getConnectionStatus method that checks Redis connection state. Implement reconnection logic that attempts to reconnect if connection drops. Add circuit breaker pattern that temporarily stops sending requests if Redis is consistently failing. Document that applications should implement graceful degradation when Redis is unavailable.

Ninth, implement serialization strategies. Create SerializationStrategy interface with serialize and deserialize methods. Implement JSONSerializationStrategy as default. Document that custom serialization can be provided for specialized needs like binary data or compression. Add size estimation based on serialized string length.

Tenth, write comprehensive tests. Test basic get/set operations against mocked Redis client. Test TTL expiration by verifying SETEX commands. Test pattern-based clearing validates correct SCAN usage. Test connection error handling ensures graceful degradation. Test batch operations verify MGET and pipeline usage. Write integration tests against real Redis instance validating end-to-end functionality. Test concurrent operations from multiple clients to validate distributed cache behavior.

**Acceptance Criteria**:

The task is complete when RedisCacheAdapter fully implements CacheInterface with all methods working correctly. Connection pooling efficiently manages Redis connections without leaks. Serialization correctly handles complex objects including nested structures and branded types. TTL expiration uses Redis native expiration rather than application-level checks. Pattern-based clearing uses SCAN to avoid blocking Redis. Batch operations use MGET and pipelines for performance. Connection error handling provides graceful degradation with clear error messages. Test coverage includes both unit tests with mocks and integration tests with real Redis. Performance benchmarks show get/set operations complete within five milliseconds including network latency. Documentation explains configuration options, connection management, and when to use Redis versus memory adapter.

---

### TASK-3.6: Implement Multi-Tier Cache Adapter

**Task Description**: Create multi-tier cache adapter that composes memory and Redis adapters with configurable write strategies and automatic promotion.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.4 provides memory adapter, TASK-3.5 provides Redis adapter

**Priority**: Medium

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `caching/adapters/multi-tier-adapter.ts` containing MultiTierCacheAdapter that orchestrates L1 memory cache and L2 Redis cache.

The second deliverable is comprehensive tests validating write-through and write-behind strategies, cache promotion, and fallback behavior.

The third deliverable is performance analysis comparing multi-tier performance to single-tier caching under various workloads.

**Subtasks**:

First, implement MultiTierCacheAdapter class accepting two CacheInterface instances representing L1 and L2 caches plus MultiTierConfig. The configuration specifies L1 TTL, L2 TTL, whether to promote L2 hits to L1, and write strategy selection between write-through and write-behind. Initialize stats tracking for both cache tiers.

Second, implement the get method with tier hierarchy. First attempt to retrieve from L1 cache. If L1 returns a hit, record L1 hit in stats and return immediately with the cached value. This fast path avoids any L2 access for hot data. If L1 returns miss, attempt L2 cache retrieval. If L2 hits, the data exists in slower tier but not in fast tier. If promoteOnHit configuration is true, write the value to L1 cache with L1 TTL so subsequent accesses hit the fast tier. Record L2 hit in stats and return the value. If both tiers miss, record overall miss and return cache miss error. This tiered approach optimizes for access patterns where hot data lives in fast memory while warm data lives in distributed Redis.

Third, implement the set method with configurable write strategies. For write-through strategy, write to both L1 and L2 synchronously before returning. This ensures strong consistency between tiers but adds latency of the slower L2 write. For write-behind strategy, write to L1 immediately and queue the L2 write asynchronously. This optimizes for write latency but accepts eventual consistency between tiers. Use setImmediate or process.nextTick to schedule L2 writes in write-behind mode. Document the consistency tradeoffs of each strategy.

Fourth, implement delete method that removes from both tiers. Execute deletes in parallel using Promise.all since deletes should be synchronized across tiers. Return success if either tier successfully deleted the entry. Implement clear method that clears both tiers, also using parallel execution.

Fifth, implement cache promotion logic. The promote method takes a key and value from L2 and writes it to L1 with appropriate L1 TTL. This is called automatically on L2 hits when promoteOnHit is enabled. Add configuration for promotion threshold where L2 entries are only promoted after N hits, preventing pollution of L1 with rarely accessed data.

Sixth, implement write-behind queue management. Create internal queue for pending L2 writes. Add flush method that processes queued writes in batch. Implement error handling where L2 write failures are logged but don't fail the original set operation since L1 succeeded. Add max queue size limit to prevent unbounded memory growth. Document that write-behind trades consistency for performance and applications must handle L2 eventually catching up.

Seventh, implement tier-specific statistics. Track hits, misses, and latencies separately for L1 and L2. Expose getL1Stats and getL2Stats methods. Implement overall getStats that aggregates across tiers. This visibility enables tuning tier configurations and understanding cache effectiveness.

Eighth, implement failover and degradation. If L1 cache fails, fall back to L2 only mode. If L2 cache fails, continue with L1 only. Log tier failures and attempt periodic reconnection. This graceful degradation ensures cache remains partially functional even when one tier fails.

Ninth, write comprehensive tests. Test that get checks L1 before L2. Test that L2 hits are promoted to L1 when configured. Test write-through writes to both tiers synchronously. Test write-behind writes to L1 immediately and L2 asynchronously. Test that delete removes from both tiers. Test failover when one tier is unavailable. Test statistics accurately reflect tier-specific operations. Test concurrent operations handle race conditions correctly.

**Acceptance Criteria**:

The task is complete when MultiTierCacheAdapter correctly orchestrates two cache tiers with configurable strategies. Get operations check L1 before L2 with automatic promotion. Write-through strategy ensures strong consistency at cost of latency. Write-behind strategy optimizes writes with eventual consistency. Delete and clear operations affect both tiers appropriately. Statistics provide visibility into tier-specific performance. Failover logic ensures graceful degradation when tiers fail. Test coverage validates all strategies and edge cases. Performance analysis shows multi-tier provides better hit rates than single tier while maintaining acceptable latency. Documentation explains when to use multi-tier caching and how to configure write strategies.

---

### TASK-3.7: Implement AI-Enhanced Cache Adapter

**Task Description**: Create AI-specific cache adapter that wraps base cache with prompt deduplication, cost tracking, and model-specific TTL strategies.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction), REQ-3.2 (Consistent Adapter Pattern)

**Dependencies**: TASK-3.2 provides interface, TASK-3.4 or TASK-3.5 provide base cache

**Priority**: Medium

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is `caching/adapters/ai-enhanced-adapter.ts` containing AIEnhancedCacheAdapter that extends any base cache with AI-specific features.

The second deliverable is prompt similarity detection using embedding comparison for deduplication.

The third deliverable is cost tracking that monitors token usage and calculates expenses across AI models.

The fourth deliverable is comprehensive tests including similarity detection accuracy and cost calculation validation.

**Subtasks**:

First, implement AIEnhancedCacheAdapter accepting any CacheInterface as base cache plus AIEnhancedConfig. The configuration includes enableDeduplication flag, similarity threshold for considering prompts equivalent, max deduplication cache size, cost tracking flag, and cost rates per model mapping model names to per-token costs. Initialize internal deduplication cache storing prompt embeddings and cost tracker storing usage metrics per cache entry.

Second, implement prompt embedding generation. For simplified implementation, use basic text normalization and n-gram fingerprinting. In production systems, integrate with actual embedding models like sentence transformers. Create computeEmbedding method that takes prompt text and returns embedding vector. Document that this is a simplified approach and production systems should use proper semantic embeddings.

Third, implement similarity detection in get method. Before checking base cache, compute embedding for the requested key if it looks like a prompt. Search deduplication cache for similar embeddings using cosine similarity calculation. If similarity exceeds configured threshold, use the cached prompt's key instead of the original key. This enables cache hits for semantically similar but textually different prompts. Record deduplication hit in statistics. Call base cache with the potentially substituted key.

Fourth, implement cost tracking in set method. Before delegating to base cache, check if the value appears to be an AI response by looking for model and usage fields. Extract prompt token count, completion token count, and model name. Calculate cost using configured per-token rates for the specific model. Store cost metrics in internal cost tracker keyed by cache key. Delegate to base cache for actual storage.

Fifth, implement the storeEmbedding helper that adds prompt embeddings to deduplication cache. When storing, check if deduplication cache has exceeded max size. If so, evict oldest embedding using LRU strategy. This bounded cache prevents unbounded memory growth while maintaining deduplication for recent prompts.

Sixth, implement cost analytics methods. Create getCostAnalytics method that aggregates tracked costs returning total cost, total prompt tokens, total completion tokens, and breakdown by model. Create getTopCostKeys method that returns the N most expensive cache keys. These analytics enable monitoring AI API spending and identifying optimization opportunities.

Seventh, implement model-specific TTL strategies. Create getTTLForModel method that returns appropriate cache duration based on model characteristics. Faster cheaper models might use shorter TTL since re-generation is inexpensive. Slower expensive models use longer TTL to maximize cache value. Document that TTL strategies should be tuned based on model cost and response stability.

Eighth, implement cache warming strategies for common prompts. Create warmCache method accepting array of common prompt templates. Pre-compute and cache responses for these prompts. This optimization ensures frequently used prompts hit cache rather than calling expensive AI APIs.

Ninth, write comprehensive tests. Test that similar prompts result in deduplication hits. Test that cost tracking correctly calculates expenses across different models. Test that deduplication cache eviction works when size limit exceeded. Test cost analytics aggregate correctly. Test that TTL varies appropriately by model. Test cache warming pre-populates expected entries. Test integration with different base cache adapters ensuring AIEnhancedAdapter works identically regardless of underlying storage.

Tenth, create example usage documentation showing how to configure AI-enhanced caching for different AI services like OpenAI, Anthropic, and open source models. Provide examples of cost tracking queries and deduplication effectiveness analysis.

**Acceptance Criteria**:

The task is complete when AIEnhancedCacheAdapter successfully wraps any CacheInterface with AI-specific functionality. Prompt deduplication detects similar prompts with configurable similarity threshold. Cost tracking accurately monitors token usage and expenses across multiple AI models. Model-specific TTL strategies optimize cache duration based on model characteristics. Cache warming pre-populates common prompts. Analytics methods provide visibility into costs and usage patterns. Deduplication cache remains bounded by configured size limit. Tests validate deduplication accuracy, cost calculations, and integration with various base caches. Performance overhead from deduplication and cost tracking is under ten percent compared to base cache operations. Documentation explains configuration and provides real-world usage examples.

---

### TASK-3.8: Implement Cache Middleware

**Task Description**: Create Express middleware for automatic HTTP response caching with configurable strategies and cache control header handling.

**Fulfills Requirements**: REQ-1.2 (Unified Caching Abstraction)

**Dependencies**: TASK-3.2 provides interface, cache adapters exist

**Priority**: Medium

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `caching/middleware/cache-middleware.ts` containing response caching middleware with support for GET request caching and cache invalidation.

The second deliverable is cache key generation strategies based on request path, query parameters, headers, and user context.

The third deliverable is comprehensive tests validating caching behavior, cache invalidation, and cache control header handling.

**Subtasks**:

First, implement CacheMiddleware class accepting CacheInterface and CacheMiddlewareConfig. Configuration includes which HTTP methods to cache (typically only GET), TTL for cached responses, key generation strategy, cache control header respect, and routes to exclude from caching. Initialize statistics tracking cache hit rate for middleware.

Second, implement cache key generation strategies. The default strategy combines request method, path, and sorted query parameters. Provide advanced strategies that also include specific headers like Accept-Language for localized content or Authorization for user-specific caching. Create CacheKeyStrategy interface with buildKey method accepting Express Request. Implement several built-in strategies: PathOnlyStrategy, PathAndQueryStrategy, PathQueryHeadersStrategy, and UserContextStrategy. Document when each strategy is appropriate.

Third, implement the middleware function returned by cache method. Check if request method is cacheable according to configuration, typically only GET and HEAD. Generate cache key using configured strategy. Attempt to retrieve from cache using generated key. If cache hit occurs, parse cached response including status code, headers, and body. Set response status and headers from cache. Send cached body and immediately return without calling next(). Record cache hit in statistics and log with observability context.

Fourth, implement cache population on cache miss. If no cached response exists, continue request processing by calling next(). Intercept the response by wrapping res.send and res.json methods. When response is sent, capture status code, headers, and body. Only cache successful responses with 2xx status codes by default, though this should be configurable. Serialize response data into CachedResponse format. Store in cache with configured TTL. Record cache miss and population in statistics.

Fifth, implement cache control header handling. Check Cache-Control header in requests. Respect no-cache directive by bypassing cache lookup. Respect max-age directive by validating cached entry age. Check Cache-Control header in responses before caching. Respect no-store directive by not caching that response. Respect private directive by only caching in user-specific caches. Document that proper cache control headers are essential for correct caching behavior.

Sixth, implement cache invalidation middleware. Create invalidate method that accepts path patterns or tags. When POST, PUT, PATCH, or DELETE requests complete successfully, automatically invalidate cache entries matching the modified resource path. Support manual invalidation through explicit method calls for complex invalidation logic.

Seventh, implement conditional request handling. Support ETags by generating hash of cached response content. On cache hit, check If-None-Match header. If ETags match, return 304 Not Modified with empty body. This optimization reduces bandwidth for unchanged resources. Support Last-Modified headers similarly using cached response timestamps.

Eighth, implement response streaming for large responses. Detect if response is being streamed rather than sent as single buffer. For streamed responses, cache in chunks as they arrive. On cache hit for streamed response, stream cached chunks to client. This ensures memory-efficient caching of large responses.

Ninth, write comprehensive tests. Test that GET requests cache responses. Test that POST requests don't cache. Test cache hit returns cached response without calling handlers. Test cache miss populates cache after response. Test cache control no-cache bypasses cache. Test cache control no-store prevents caching. Test ETag conditional requests return 304. Test cache invalidation removes matching entries. Test key strategies generate expected keys. Test statistics accurately reflect hit rates.

**Acceptance Criteria**:

The task is complete when cache middleware successfully caches HTTP responses with configurable strategies. Key generation strategies handle various caching needs from simple path-based to complex user-context caching. Cache control headers are properly respected both in requests and responses. Cache invalidation works for mutating operations. Conditional requests with ETags optimize bandwidth. Statistics provide visibility into cache effectiveness at HTTP layer. Tests validate all caching scenarios including edge cases. Performance testing shows cache hits complete in under five milliseconds. Documentation provides examples for common caching patterns and explains when not to cache.

---

### TASK-3.9: Create Caching Feature Flag and Migration

**Task Description**: Implement feature flag controlling old versus new cache usage with side-by-side metrics for validation.

**Fulfills Requirements**: REQ-4.1 (Zero-Downtime Migration Path)

**Dependencies**: All cache adapter tasks complete

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is `migration/feature-flags/caching-flag.ts` with feature flag configuration for gradual cache migration.

The second deliverable is legacy cache adapter in `caching/legacy-adapters/` that wraps old cache implementation in new interface.

The third deliverable is side-by-side execution that compares old and new cache behavior with metrics collection.

**Subtasks**:

First, implement caching feature flag in flag manager. Register useUnifiedCaching flag with default disabled. Configure percentage-based rollout capability. Expose methods to enable globally, enable for percentage of users, and disable instantly for rollback.

Second, create legacy cache adapters bridging old implementations to new CacheInterface. Wrap existing cache/memory-cache.ts implementation in MemoryLegacyAdapter. Wrap existing cache/redis-cache.ts in RedisLegacyAdapter. Map old method names to new interface methods. Handle differences in error reporting between old and new implementations. Document that legacy adapters are temporary migration aids.

Third, implement side-by-side execution wrapper. Create SideBySideCacheAdapter that accepts both old cache (wrapped in legacy adapter) and new cache implementation. On every operation, execute both old and new paths. Return new path result to user while collecting old path result in background. Compare results for differences in values, latency, or errors. Emit metrics showing agreement rate between old and new implementations.

Fourth, add caching migration metrics. Track operations routed through old versus new path. Track error rates for each path separately. Track latency distributions for each path. Calculate statistical significance of any differences. Alert if new path shows significantly higher error rate or latency.

Fifth, implement gradual rollout configuration. Start with flag at zero percent routing all traffic through old implementation. Increase to one percent for canary testing. Monitor metrics for twenty-four hours. Gradually increase to ten percent, twenty-five percent, fifty percent, then one hundred percent with monitoring at each stage. Document rollout procedure with go/no-go criteria at each stage.

Sixth, write migration validation tests. Test that legacy adapters correctly wrap old implementations. Test that side-by-side execution captures differences. Test that flag correctly routes traffic between old and new. Test rollback returns traffic to old path within seconds. Test that metrics accurately reflect path usage.

**Acceptance Criteria**:

The task is complete when feature flag successfully controls cache path selection. Legacy adapters bridge old implementations maintaining existing behavior. Side-by-side execution enables confidence testing before full migration. Metrics provide clear visibility into old versus new performance. Gradual rollout procedure is documented with clear success criteria. Tests validate all migration scenarios including rollback. Performance overhead from side-by-side execution is under five percent. Documentation explains migration timeline and validation criteria.

---

### TASK-3.10: Create Caching Documentation

**Task Description**: Write comprehensive documentation for unified caching capability including adapter selection guide, configuration examples, and migration instructions.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation), REQ-6.2 (Migration Guide Documentation)

**Dependencies**: All caching implementation tasks complete

**Priority**: Normal

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `caching/README.md` with complete capability overview, quick start, and API reference.

The second deliverable is `caching/docs/adapter-selection.md` explaining when to use each adapter with decision tree.

The third deliverable is `caching/docs/migration-guide.md` with step-by-step instructions for migrating from old cache implementations.

The fourth deliverable is example code in `caching/examples/` demonstrating common caching patterns.

**Subtasks**:

First, write main README providing caching capability overview. Explain that caching consolidates multiple previous implementations into single system with adapter pattern. Include quick start showing how to configure memory cache, Redis cache, and multi-tier cache. Document the CacheInterface and explain how all adapters implement it. Provide links to detailed adapter documentation.

Second, create adapter selection guide. Build decision tree: use memory adapter for single-server development or small datasets, use Redis adapter for distributed applications or large datasets, use multi-tier adapter when optimizing for both speed and capacity, use AI-enhanced adapter when caching AI model responses. For each adapter, document typical use cases, performance characteristics, and configuration examples. Explain tradeoffs between consistency and performance for multi-tier caching.

Third, write migration guide from old cache implementations. Provide import path mapping showing old cache/ imports map to new caching/ paths. Explain how to configure adapters to match old behavior. Document feature flag usage for gradual migration. Provide checklist for validating migration: cache hit rates unchanged, latency within five percent, zero cache-related errors, all tests passing. Include rollback procedures.

Fourth, document cache key strategies. Explain importance of consistent key generation. Show how CacheKeyBuilder ensures consistency. Provide examples of namespace usage for isolating cache domains. Document tag-based invalidation patterns. Warn about common pitfalls like object property ordering affecting keys.

Fifth, document cache configuration best practices. Explain TTL selection based on data volatility. Discuss memory limits and eviction policies. Provide guidance on monitoring cache effectiveness through hit rate metrics. Explain when to use write-through versus write-behind for multi-tier caching. Document cache warming strategies.

Sixth, create example code demonstrating common patterns. Write example showing basic memory cache usage. Write example showing Redis cache with connection pooling. Write example showing multi-tier cache configuration. Write example showing AI-enhanced cache with cost tracking. Write example showing HTTP response caching middleware. Ensure all examples compile and run.

Seventh, document observability integration. Show how cache operations emit metrics. Explain how to correlate cache behavior with application performance. Provide example Grafana dashboard configuration for cache monitoring. Document alerting strategies for cache issues.

Eighth, create troubleshooting guide. Address common issues: cache stampede, thundering herd, stale data, memory leaks, connection pool exhaustion. For each issue, explain symptoms, root cause, and solution. Provide debugging techniques for cache-related problems.

**Acceptance Criteria**:

The task is complete when README provides clear overview and quick start. Adapter selection guide helps developers choose appropriate adapter. Migration guide enables smooth transition from old implementations. Examples demonstrate common patterns with working code. Configuration best practices help optimize cache effectiveness. Observability integration is documented. Troubleshooting guide addresses common issues. Documentation review confirms content is accurate and accessible. Code examples compile and execute successfully. Internal team confirms documentation helps them understand and use unified caching.

---

### Phase 3 Gate Review Checklist

Before proceeding to Phase 4, verify the following conditions:

Single CacheInterface exists implemented by all adapters. Memory adapter provides fast in-process caching with LRU eviction. Redis adapter enables distributed caching across servers. Multi-tier adapter composes memory and Redis with configurable strategies. AI-enhanced adapter extends base caching with deduplication and cost tracking. Cache key builder ensures consistency across adapters. Cache middleware provides HTTP response caching. Feature flag controls migration with side-by-side validation. All cache tests pass with maintained or improved coverage. Performance benchmarks meet targets. Documentation is complete and reviewed. Zero circular dependencies in caching capability. Integration tests validate cross-capability interactions. Gradual rollout to ten percent shows no issues for one week.

---

## Phase 4: Observability Platform (Weeks 7-8)

### Phase Objectives

The observability phase consolidates previously fragmented logging, health checking, metrics collection, and distributed tracing into a unified platform where all telemetry shares context propagation. This addresses the problem where logs lacked trace correlation, metrics weren't linked to requests, and health checks couldn't explain failures through integrated diagnostics. The critical challenge is maintaining backward compatibility with existing logging interfaces while adding richer context propagation throughout the system.

### Phase Success Criteria

Observability phase succeeds when all telemetry types share correlation IDs enabling request tracking across logs, traces, and metrics. Structured logging replaces unstructured logging with machine-parseable format. Health checks provide diagnostic depth beyond binary up/down status. Metrics collection works uniformly across capabilities. Distributed tracing links operations across service boundaries. All existing logging calls work with new implementation. Zero performance regression from observability instrumentation. Documentation explains observability patterns and dashboard configuration.

---

### TASK-4.1: Create Observability Directory Structure

**Task Description**: Establish complete directory structure for observability platform with subdirectories for logging, health, metrics, tracing, and telemetry aggregation.

**Fulfills Requirements**: REQ-1.3 (Unified Observability System), REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 provides primitives

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

The first deliverable is complete directory structure at `observability/` with subdirectories logging/, health/, metrics/, tracing/, and telemetry/ each containing README files.

The second deliverable is TypeScript configuration for observability depending only on primitives layer.

The third deliverable is ESLint configuration enforcing layer boundaries for observability.

The fourth deliverable is main README explaining unified observability architecture and context propagation.

**Subtasks**:

First, create directory structure executing `mkdir -p shared/core/observability/{logging,health,metrics,tracing,telemetry}`. Create README.md in each subdirectory explaining its purpose. The logging/ README describes structured logging with transports. The health/ README explains orchestrated health checks. The metrics/ README covers counter, gauge, and histogram collection. The tracing/ README describes distributed tracing with span creation. The telemetry/ README explains unified telemetry export.

Second, configure TypeScript for observability. Create `observability/tsconfig.json` extending root configuration. Allow imports from primitives but block other capabilities. Enable strict type checking. Configure output for proper module resolution
I'll complete the entire implementation plan document, continuing through all remaining tasks in Phases 4-8. Let me proceed systematically through each phase.

---

### TASK-4.8: Implement Distributed Tracing

**Task Description**: Create distributed tracing infrastructure that automatically creates spans for operations, propagates trace context across service boundaries, and links traces to logs and metrics.

**Fulfills Requirements**: REQ-1.3 (Unified Observability System)

**Dependencies**: TASK-4.2 provides observability context, TASK-4.3 provides logger

**Priority**: Medium

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is `observability/tracing/tracer.ts` containing the core tracing implementation with automatic span creation and context propagation.

The second deliverable is `observability/tracing/span.ts` defining the Span class representing individual traced operations with timing and metadata.

The third deliverable is trace exporters in `observability/tracing/exporters/` for Jaeger, Zipkin, and OpenTelemetry formats.

The fourth deliverable is middleware integration that automatically traces HTTP requests with span hierarchy.

**Subtasks**:

First, define the tracing data model. Create TraceSpan interface containing traceId (identifying the entire distributed trace), spanId (identifying this specific operation), parentSpanId (identifying the parent operation if this is a child span), name (describing the operation), startTime and endTime timestamps, duration calculated from these times, status indicating success or error, attributes as key-value metadata, and events array capturing significant moments during the span. Document that spans form a tree structure representing the call hierarchy.

Second, implement the Span class representing an active traced operation. The constructor accepts span name, trace context, and optional parent span. Generate unique spanId for this span. Capture startTime immediately. Initialize empty attributes map and events array. Provide setAttribute method for adding metadata. Provide addEvent method for recording significant moments with timestamps. Provide setStatus method marking span as success or error. Implement end method that captures endTime, calculates duration, and exports the completed span. Document that spans should be ended in finally blocks to ensure completion even on errors.

Third, implement the Tracer class managing trace lifecycle. Accept TracerConfig specifying service name, sampling rate, and enabled exporters. Provide startSpan method accepting operation name and optional parent context, returning new Span instance. Automatically propagate trace context from parent to child spans maintaining the trace tree structure. Implement sampling logic where only configured percentage of traces are recorded, reducing overhead for high-traffic systems. Document that sampling should be consistent within a trace so either all spans or no spans are recorded.

Fourth, implement trace context propagation for distributed tracing. Create TraceContext class containing traceId, spanId, and sampling decision. Implement inject method that serializes context into headers for HTTP propagation following W3C Trace Context standard. Implement extract method that deserializes context from incoming headers. This enables traces to span multiple services where each service creates child spans under the distributed trace. Document header format and compatibility with standard tracing systems.

Fifth, implement automatic span creation for common operations. Create traceFunction decorator that wraps functions in spans automatically. The decorator starts span before function execution, ends span after completion, records function arguments as attributes, captures exceptions as span errors, and propagates exceptions after recording. This pattern enables tracing without manual span management scattered throughout code. Create similar decorators for async functions and class methods.

Sixth, implement integration with ObservabilityContext. When span starts, create new ObservabilityContext with trace and span IDs, enriching context with tracing information. When logging within traced operation, automatically include trace context in logs enabling correlation. When emitting metrics within traced operation, include trace context in metric labels. This integration makes traces the unifying thread connecting all telemetry.

Seventh, implement span exporters for common tracing backends. Create JaegerExporter that formats spans in Jaeger protocol and sends to Jaeger agent. Create ZipkinExporter formatting spans in Zipkin JSON format. Create OpenTelemetryExporter using OTLP protocol for OpenTelemetry collector. Each exporter batches spans before sending to reduce network overhead. Implement retry logic for transient failures. Implement circuit breaker to stop exporting if backend is consistently unavailable.

Eighth, implement tracing middleware for Express applications. Create middleware that starts root span for each incoming HTTP request. Extract trace context from request headers to continue distributed traces. Set span attributes including HTTP method, path, status code, request and response sizes. Create child spans for downstream operations like database queries. End span after response is sent. Automatically record errors as span status. This automatic instrumentation provides request tracing without code changes.

Ninth, implement span event recording for significant moments. The addEvent method on spans accepts event name, timestamp, and attributes. Use events to mark checkpoints like "query_started", "cache_checked", "validation_completed" within longer operations. Events provide finer granularity than separate spans when operations are too fine-grained for individual spans. Document that events should capture meaningful state transitions.

Tenth, implement performance optimizations for tracing overhead. Use object pooling for span instances to reduce allocations. Defer attribute serialization until span export to avoid unnecessary work for unsampled traces. Use microtask queue for span completion to avoid blocking caller. Benchmark that tracing overhead is under ten microseconds per span for sampled traces and under one microsecond for unsampled traces.

Eleventh, write comprehensive tests. Test that spans correctly capture timing information. Test that parent-child relationships form proper trees. Test that trace context propagation works through inject and extract. Test that sampling respects configured rate. Test that exporters format spans correctly for each backend. Test that middleware creates appropriate span hierarchies. Test that error conditions are recorded in span status. Test that automatic decorators work with sync and async functions. Test concurrent tracing from multiple requests maintains separate trace contexts.

**Acceptance Criteria**:

The task is complete when distributed tracing infrastructure enables request tracking across operations. Span class captures operation timing, status, and metadata. Tracer manages trace lifecycle with sampling. Context propagation enables distributed tracing across services. Integration with observability context links traces to logs and metrics. Automatic instrumentation through decorators and middleware reduces manual tracing code. Exporters integrate with Jaeger, Zipkin, and OpenTelemetry backends. Tests validate all tracing functionality. Performance overhead meets targets. Documentation explains tracing concepts, instrumentation patterns, and backend integration. Example traces demonstrate request flow visualization.

---

### TASK-4.9: Implement Telemetry Aggregator

**Task Description**: Create telemetry aggregator that coordinates logging, metrics, and tracing ensuring consistent context propagation and unified export.

**Fulfills Requirements**: REQ-1.3 (Unified Observability System)

**Dependencies**: TASK-4.3 provides logger, TASK-4.7 provides metrics, TASK-4.8 provides tracing

**Priority**: Medium

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `observability/telemetry/telemetry-aggregator.ts` coordinating all observability subsystems with shared context.

The second deliverable is unified configuration system for observability platform.

The third deliverable is correlation engine linking logs, metrics, and traces by context.

The fourth deliverable is comprehensive tests validating cross-subsystem integration.

**Subtasks**:

First, implement TelemetryAggregator class accepting unified ObservabilityConfig containing configuration for logger, metrics collector, tracer, and health checker. Initialize all subsystems with provided configuration. Provide methods for accessing each subsystem. Implement shutdown method that gracefully shuts down all subsystems flushing buffered telemetry.

Second, implement context propagation coordination. Provide withContext method accepting ObservabilityContext and callback, running callback with context available to all subsystems. When logs are emitted within context, automatically include correlation ID. When metrics are recorded within context, include correlation ID as label. When spans are created within context, link to existing trace. This coordination ensures all telemetry for a request shares common identifiers.

Third, implement correlation engine that links telemetry by context. Provide queryLogs method accepting correlation ID, returning all logs for that request. Provide getTrace method returning complete trace tree. Provide getMetrics returning metrics recorded during request. Implement queryTimeRange accepting time window and context criteria, returning all correlated telemetry. This enables operators to see complete request picture across telemetry types.

Fourth, implement telemetry export coordination. Provide exportAll method that triggers export from all subsystems atomically. Ensure logs are flushed, metrics are sent, traces are exported, and health status is published. Implement periodic export on configurable interval. Implement immediate export on application shutdown. This coordination prevents telemetry loss.

Fifth, implement observability middleware factory that integrates all subsystems. Create middleware that generates ObservabilityContext from request, starts trace span, makes context available through async local storage, logs request entry and exit, records request metrics including duration and status code, and handles errors with appropriate telemetry. This single middleware provides complete observability instrumentation.

Sixth, implement configuration validation. Validate that all subsystem configurations are compatible. Check that log levels are appropriate for environment. Verify that metrics cardinality limits are configured. Ensure trace sampling rates are reasonable. Validate that all required exporters are configured. Fail fast on invalid configuration preventing runtime issues.

Seventh, implement observability health check. Create health check that verifies all subsystems are functioning: logger can write, metrics can be recorded, tracer can create spans, health checker can execute checks. Include this meta health check in overall system health. This self-monitoring ensures observability system itself is healthy.

Eighth, implement performance monitoring of observability overhead. Track time spent in logging, metrics collection, and tracing. Record these as metrics enabling visibility into observability cost. Alert if overhead exceeds thresholds suggesting configuration tuning needed. Document that observability should consume less than five percent of application CPU.

Ninth, write comprehensive tests. Test that telemetry aggregator initializes all subsystems correctly. Test that context propagation works across subsystems. Test that correlation engine links related telemetry. Test that export coordination flushes all buffers. Test that middleware creates appropriate telemetry. Test that configuration validation catches errors. Test that observability health check detects subsystem failures. Test graceful shutdown flushes telemetry without loss.

**Acceptance Criteria**:

The task is complete when telemetry aggregator coordinates all observability subsystems. Context propagation ensures correlation across logs, metrics, traces. Unified configuration simplifies observability setup. Correlation engine enables request-centric telemetry queries. Export coordination prevents telemetry loss. Observability middleware provides single integration point. Configuration validation catches setup errors early. Health checking monitors observability system itself. Tests validate cross-subsystem integration. Documentation provides complete observability setup guide. Example applications demonstrate end-to-end observability.

---

### TASK-4.10: Create Observability Documentation

**Task Description**: Write comprehensive documentation for observability platform including architecture overview, subsystem guides, integration patterns, and troubleshooting.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: All observability implementation tasks complete

**Priority**: Normal

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is `observability/README.md` with platform overview and quick start guide.

The second deliverable is subsystem documentation in `observability/docs/` covering logging, health checks, metrics, and tracing individually.

The third deliverable is integration guide explaining observability middleware setup and context propagation patterns.

The fourth deliverable is troubleshooting guide with common observability issues and solutions.

**Subtasks**:

First, write main README providing observability platform overview. Explain that observability consolidates previously fragmented logging, health checking, metrics, and tracing into unified system. Describe ObservabilityContext as the core concept enabling correlation. Include architecture diagram showing how context flows through all subsystems. Provide quick start demonstrating context creation, logging with context, emitting metrics, creating spans, and querying correlated telemetry. Link to detailed subsystem documentation.

Second, create logging documentation explaining structured logging benefits over unstructured logging. Document log levels and when to use each. Explain context enrichment and how correlation IDs automatically appear in logs. Provide transport configuration examples for console, file, and external services. Document log rotation strategies and retention policies. Show how to query logs by correlation ID. Provide examples of effective log messages that include actionable context.

Third, document health check system explaining three-state health model. Describe how to implement custom health checks. Provide examples for common dependencies like databases, caches, message queues. Explain health check orchestration and dependency handling. Document timeout configuration and caching strategies. Show how to expose health endpoints for Kubernetes probes. Provide guidance on health check thresholds balancing sensitivity with stability.

Fourth, create metrics documentation explaining counter, gauge, and histogram types. Document when to use each metric type. Explain label usage and cardinality considerations. Provide examples of business metrics, infrastructure metrics, and performance metrics. Document exporter configuration for Prometheus, StatsD, and JSON. Show how to build Grafana dashboards from collected metrics. Provide guidance on metric naming conventions and label selection.

Fifth, document distributed tracing architecture. Explain span hierarchy and parent-child relationships. Document automatic instrumentation through middleware and decorators. Explain manual span creation for complex operations. Provide context propagation examples across HTTP boundaries. Document exporter configuration for Jaeger, Zipkin, and OpenTelemetry. Show how traces link to logs and metrics through correlation. Provide examples of trace analysis finding performance bottlenecks.

Sixth, create integration guide for adding observability to applications. Provide step-by-step setup including configuration, middleware installation, and context management. Show patterns for background jobs, cron tasks, and message consumers. Document best practices for context threading through async operations. Provide migration guide from old logging to new observability platform. Include code examples for common scenarios.

Seventh, write troubleshooting guide addressing common issues. Document symptoms, root causes, and solutions for problems like missing correlation IDs, incomplete traces, metric cardinality explosion, log volume overwhelming storage, health checks timing out, and trace context not propagating. For each issue, provide diagnostic steps and resolution procedures. Include debugging techniques like enabling debug logging and using trace visualization.

Eighth, create observability patterns catalog. Document patterns like structured logging, distributed tracing, metric aggregation, health check composition, correlation by context, graceful degradation when observability fails, and sampling for high-traffic systems. For each pattern, explain when to use it, how to implement it, and what tradeoffs exist. Provide code examples demonstrating each pattern.

Ninth, document observability overhead and performance considerations. Explain how sampling reduces tracing overhead. Discuss asynchronous export reducing latency impact. Document memory usage expectations for buffering. Provide guidance on tuning configuration for performance-sensitive applications. Include benchmarking results showing overhead measurements.

Tenth, create operational runbooks for observability system maintenance. Document procedures for log rotation management, metrics endpoint monitoring, trace backend capacity planning, and health check threshold tuning. Provide checklists for troubleshooting observability system itself when telemetry is not being recorded or exported correctly.

**Acceptance Criteria**:

The task is complete when observability documentation comprehensively covers all subsystems. README provides clear overview and quick start. Logging guide explains structured logging and transports. Health check guide enables custom check implementation. Metrics guide covers all metric types and exporters. Tracing guide explains distributed tracing concepts. Integration guide enables application instrumentation. Troubleshooting guide addresses common issues. Pattern catalog provides best practices. Performance documentation sets expectations. Operational runbooks enable maintenance. Documentation review confirms accuracy and accessibility. Code examples compile and demonstrate concepts. Internal teams confirm documentation enables effective observability usage.

---

### Phase 4 Gate Review Checklist

Before proceeding to Phase 5, verify the following conditions:

ObservabilityContext enables correlation across all telemetry types. Structured logger provides machine-parseable logging with automatic context enrichment. Log transports enable output to console, files, and external services. Log rotation prevents unbounded storage growth. Health checker orchestrates dependency checks with detailed diagnostics. Metrics collector supports counters, gauges, and histograms with dimensional labels. Distributed tracing captures request flow with span hierarchies. Telemetry aggregator coordinates all subsystems with unified context. All observability tests pass with maintained or improved coverage. Performance benchmarks show acceptable overhead. Documentation comprehensively covers observability platform. Zero circular dependencies in observability. Integration tests validate cross-subsystem correlation. Gradual rollout shows no issues for one week.

---

## Phase 5: Validation and Rate Limiting (Weeks 9-10)

### Phase Objectives

The validation and rate limiting phase completes the core capabilities layer by providing comprehensive input validation with schema definitions and request throttling with multiple algorithm implementations. These final capabilities enable applications to validate user input consistently and protect services from abuse. The validation engine will use Zod for type-safe schema definitions while rate limiting will support token bucket, sliding window, and fixed window algorithms with both memory and Redis storage.

### Phase Success Criteria

Validation phase succeeds when validation service integrates Zod schemas with type inference. Common validation schemas cover frequent validation needs. Sanitization protects against injection attacks. Validation middleware integrates with Express. Rate limiting phase succeeds when multiple algorithms provide different fairness characteristics. Rate limiter stores work with both memory and Redis for different deployment scenarios. AI-specific rate limiting tracks costs and token usage. Rate limiting middleware protects endpoints. All validation and rate limiting tests pass. Documentation explains usage patterns.

---

### TASK-5.1: Create Validation Directory Structure

**Task Description**: Establish directory structure for validation capability with subdirectories for schemas, sanitization, rules, and middleware.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 provides primitives

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

The directory structure at `validation/` with subdirectories schemas/, sanitization/, middleware/, and core/. TypeScript configuration depending only on primitives. ESLint configuration enforcing layer boundaries. Main README explaining validation architecture.

**Subtasks**:

Create directory structure with `mkdir -p shared/core/validation/{core,schemas,sanitization,middleware}`. Create README files in each subdirectory. Configure TypeScript with strict settings. Configure ESLint preventing imports from other capabilities. Write main README explaining validation consolidation from scattered validation logic into unified system with Zod integration.

**Acceptance Criteria**:

Directory structure exists with all subdirectories and READMEs. TypeScript compiles with strict checking. ESLint enforces layer boundaries. README explains validation architecture. Team can navigate structure intuitively.

---

### TASK-5.2: Implement Core Validation Service

**Task Description**: Create validation service integrating Zod schemas with Result types and observability context for comprehensive type-safe validation.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.1 provides structure, Phase 1 provides Result type, Phase 4 provides observability

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

`validation/core/validation-service.ts` with ValidationService class. Integration with Zod for schema validation. Error transformation converting Zod errors to ValidationError. Comprehensive tests validating behavior.

**Subtasks**:

First, implement ValidationService class accepting optional logger. Import Zod and define method validate accepting unknown data, Zod schema, and ObservabilityContext. Execute schema.parse wrapping in try-catch. On success, return Ok with validated data benefiting from Zod's type inference. On ZodError, transform to ValidationError extracting field-level errors from Zod's error structure. Log validation failures with context. Implement validateAsync for async validation. Implement sanitizeAndValidate combining sanitization before validation.

Second, implement Zod error transformation. ZodError contains array of issues each with path, message, and code. Transform each issue into ValidationFieldError with field name from path, message, constraint type from code, and optionally the invalid value. Aggregate all field errors into single ValidationError. This transformation bridges Zod's error format with the application's error handling system.

Third, implement schema composition helpers. Create composeSchemas method merging multiple schemas using Zod's intersection. Create optionalSchema wrapping schema in optional. Create arraySchema creating array validators. These helpers simplify building complex validators from simple pieces.

Fourth, write comprehensive tests. Test that valid data returns Ok with typed result. Test that invalid data returns Err with ValidationError. Test that field errors are correctly extracted from Zod errors. Test that async validation works with async refinements. Test that sanitization runs before validation. Test schema composition creates merged validators.

**Acceptance Criteria**:

ValidationService provides type-safe validation through Zod integration. Result types make validation outcomes explicit. Field-level errors enable specific user feedback. Observability integration logs validation failures. Schema composition enables building complex validators. Tests validate all scenarios. Type inference provides compile-time safety.

---

### TASK-5.3: Implement Common Validation Schemas

**Task Description**: Create library of reusable validation schemas for common data types like emails, passwords, URLs, phone numbers, dates, and pagination.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.2 provides validation service

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

Common schemas in `validation/schemas/common.ts` for strings, numbers, dates. Domain schemas in `validation/schemas/domain/` for authentication, users, billing. Comprehensive tests validating each schema.

**Subtasks**:

First, implement string validation schemas. Create EmailSchema using Zod string with email validation, trim, and toLowerCase transformation. Create PasswordSchema with minimum length, complexity requirements using regex for uppercase, lowercase, numbers, special characters. Create UsernameSchema with length limits and allowed character validation. Create PhoneNumberSchema with international format validation. Create URLSchema validating proper URL format. Each schema should include clear error messages explaining validation requirements.

Second, implement number validation schemas. Create PositiveIntegerSchema for IDs and counts. Create PercentageSchema constraining values between zero and one hundred. Create CurrencySchema with precision limits and positive constraint. Create RangeSchema factory accepting min and max parameters. Document that number schemas should match database column constraints preventing runtime errors from constraint violations.

Third, implement date validation schemas. Create PastDateSchema rejecting future dates. Create FutureDateSchema rejecting past dates. Create DateRangeSchema validating start date before end date using Zod refinement. Create AgeSchema calculating age from birthdate and validating against legal requirements. Document that date schemas should handle timezone considerations.

Fourth, implement pagination schemas. Create PaginationSchema with page number validation, page size limits preventing excessive data retrieval, sort field validation, and sort direction enum. Document that pagination schemas enable consistent pagination API across application.

Fifth, implement domain-specific authentication schemas in schemas/domain/auth-schemas.ts. Create LoginSchema with email and password. Create RegisterSchema with email, password, password confirmation, username, terms acceptance, and custom refinement validating passwords match. Create PasswordResetSchema with email, token, new password, and confirmation. These schemas encapsulate authentication validation rules in reusable definitions.

Sixth, implement user profile schemas. Create UserProfileSchema with display name, bio with length limits, avatar URL, social media links. Create UserPreferencesSchema with notification settings, theme selection, language preference. Document that domain schemas should match business rules and database schema.

Seventh, write comprehensive tests for each schema. Test that valid inputs pass validation. Test that invalid inputs produce appropriate field errors. Test that transformations apply correctly like email lowercasing. Test that custom refinements work like password matching. Test that error messages are clear and actionable. Test edge cases like boundary values and special characters.

**Acceptance Criteria**:

Common schemas cover frequently validated data types. Domain schemas encapsulate business validation rules. All schemas produce clear error messages. Transformations normalize data appropriately. Tests validate both success and failure paths. Documentation explains when to use each schema. Type inference works correctly from schemas. Schemas prevent common validation errors like allowing invalid emails or weak passwords.

---

### TASK-5.4: Implement Sanitization System

**Task Description**: Create sanitization system protecting against injection attacks by cleaning user input before processing.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.2 provides validation service

**Priority**: High

**Estimated Duration**: 2 days

**Deliverables**:

Sanitizer interface in `validation/sanitization/sanitizer-interface.ts`. HTML sanitizer preventing XSS. SQL sanitizer preventing injection. Comprehensive tests validating sanitization effectiveness.

**Subtasks**:

First, define Sanitizer interface with sanitize method accepting unknown input and returning sanitized version. Define methods sanitizeString, sanitizeObject, and sanitizeArray handling different input types. Document that sanitizers clean potentially dangerous input transforming it into safe form.

Second, implement HTMLSanitizer using DOMPurify library. Accept configuration specifying allowed HTML tags, allowed attributes, and whether to keep content from disallowed tags. Implement sanitize recursively processing strings within objects and arrays. For string values, run through DOMPurify removing dangerous elements like script tags, event handlers, and javascript: URLs. Document that HTML sanitization should be defense in depth with Content Security Policy also configured.

Third, implement SQLSanitizer detecting SQL injection patterns. Define regex patterns matching common SQL injection attempts including UNION statements, comment sequences, quoted strings with operators, hexadecimal values. Remove or escape matched patterns. Document that SQLSanitizer is secondary defense with prepared statements being primary protection. Log detected injection attempts for security monitoring.

Fourth, implement InputSanitizer for general purpose cleaning. Trim whitespace from strings. Remove control characters. Normalize Unicode to prevent homograph attacks. Limit string length preventing buffer overflow. Remove null bytes. This general sanitization applies universally before specialized sanitization.

Fifth, implement sanitization strategies for different security contexts. Create sanitize-for-html, sanitize-for-sql, sanitize-for-url, sanitize-for-filename methods each with context-appropriate rules. Document that sanitization requirements differ by how input will be used.

Sixth, write comprehensive tests. Test that XSS payloads are neutralized by HTML sanitizer. Test that SQL injection patterns are removed. Test that benign input passes unchanged. Test recursive sanitization of nested objects. Test that sanitization doesn't break valid input. Test common injection attack vectors from OWASP Top Ten.

**Acceptance Criteria**:

Sanitizer interface enables pluggable sanitization strategies. HTML sanitizer prevents XSS attacks. SQL sanitizer detects injection attempts. General sanitizer handles common cleaning needs. Context-specific sanitization matches security requirements. Tests validate against known attack vectors. Documentation explains when to use each sanitizer. Integration with validation service enables sanitize-then-validate pattern.

---

### TASK-5.5: Implement Validation Middleware

**Task Description**: Create Express middleware providing automatic request validation with clear error responses.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.2 provides validation service, TASK-5.3 provides schemas

**Priority**: High

**Estimated Duration**: 2 days

**Deliverables**:

Validation middleware in `validation/middleware/validation-middleware.ts`. Support for body, query, and parameter validation. Integration with error management. Comprehensive tests.

**Subtasks**:

First, implement ValidationMiddleware class accepting ValidationService and logger. Provide validate method accepting Zod schema and returning Express middleware. The middleware extracts request body, validates against schema, and on success attaches validated data to request continuing processing. On failure, returns 400 Bad Request with detailed field errors formatted for client consumption.

Second, implement validateQuery method for query parameter validation. Extract req.query, validate, attach validated query to request. Handle query parameter parsing quirks where all values are strings requiring coercion. Document that query validation should define expected types explicitly.

Third, implement validateParams for path parameter validation. Extract req.params, validate, attach validated params. Document that parameter validation commonly validates IDs ensuring they're valid before database queries.

Fourth, implement middleware composition enabling multiple validations. Create validate method accepting body schema, query schema, and params schema, running all validations before proceeding. Return single error response aggregating all validation failures. This consolidated validation provides better user experience than failing on first validation issue.

Fifth, implement conditional validation based on HTTP method or headers. Provide validateIf method accepting condition predicate and schema, running validation only when condition is true. This enables method-specific validation like requiring body validation for POST but not GET.

Sixth, write comprehensive tests. Test that valid requests pass through middleware. Test that invalid requests return 400 with field errors. Test that query validation handles string coercion. Test that parameter validation catches invalid IDs. Test that multiple validations aggregate errors. Test conditional validation runs appropriately. Test integration with error middleware.

**Acceptance Criteria**:

Validation middleware integrates seamlessly with Express. Body, query, and parameter validation cover all input sources. Error responses provide clear field-level feedback. Multiple validations aggregate errors. Conditional validation enables flexible rules. Tests validate all middleware functionality. Documentation provides usage examples. Integration with error management provides consistent error handling.

---

### TASK-5.6: Create Rate Limiting Directory Structure

**Task Description**: Establish directory structure for rate limiting capability with subdirectories for algorithms, stores, strategies, and middleware.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 provides primitives

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

Directory structure at `rate-limiting/` with subdirectories core/, algorithms/, stores/, strategies/, middleware/. TypeScript and ESLint configuration. Main README explaining rate limiting architecture.

**Subtasks**:

Create directory structure with `mkdir -p shared/core/rate-limiting/{core,algorithms,stores,strategies,middleware}`. Create READMEs explaining each subdirectory purpose. Configure TypeScript strictly. Configure ESLint enforcing boundaries. Write main README explaining rate limiting consolidation providing multiple algorithms and storage options.

**Acceptance Criteria**:

Directory structure exists completely. Configuration enforces constraints. README explains architecture. Team can navigate intuitively.

---

### TASK-5.7: Implement Core Rate Limiter Interface

**Task Description**: Define RateLimiter interface implemented by all algorithms providing consistent API for rate limiting checks.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.6 provides structure, Phase 1 provides Result type

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

RateLimiter interface in `rate-limiting/core/rate-limiter-interface.ts`. Supporting types for results and configuration. Comprehensive documentation.

**Subtasks**:

First, define RateLimiter interface with checkLimit method accepting key and observability context, returning Promise of RateLimitResult. Define resetLimit method clearing specific key's limit. Define getRemainingQuota method checking available capacity. Define getStats method returning usage statistics. Document that all rate limiter implementations must provide these methods enabling algorithm interchangeability.

Second, define RateLimitResult interface containing allowed boolean, limit number, remaining capacity, resetAt timestamp indicating when quota refills, and optional retryAfter duration for failed requests. Document that result provides complete information for caller to handle rate limiting including when to retry.

Third, define RateLimitConfig interface specifying maxRequests allowed in window, windowMs duration, keyGenerator function extracting rate limit key from request, flags for skipping failed or successful requests. Document that configuration should be tuned per endpoint based on expected load and abuse risk.

Fourth, define RateLimitStats interface tracking totalRequests, allowedRequests, deniedRequests, uniqueKeys. Document that statistics enable monitoring rate limiting effectiveness and tuning configuration.

Fifth, document rate limiter patterns. Explain that rate limiting is first defense against abuse with additional protections needed. Describe layering rate limits at different levels like per-IP, per-user, per-API-key. Explain fail-open versus fail-closed strategies when rate limiter storage fails.

Sixth, write interface documentation with examples. Show implementing custom rate limiters. Demonstrate using rate limiters in application code. Explain choosing appropriate algorithms for different use cases.

**Acceptance Criteria**:

RateLimiter interface provides complete rate limiting contract. Supporting types enable comprehensive results. Configuration interface covers common settings. Statistics enable monitoring. Documentation explains patterns and provides examples. Interface design enables multiple algorithm implementations with consistent API.

---

### TASK-5.8: Implement Token Bucket Rate Limiter

**Task Description**: Implement token bucket algorithm allowing controlled bursts while maintaining average rate over time.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.7 provides interface, needs rate limiter store

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

TokenBucketRateLimiter in `rate-limiting/algorithms/token-bucket.ts`. Implementation of bucket refill logic. Comprehensive tests validating algorithm behavior.

**Subtasks**:

First, implement TokenBucketRateLimiter class accepting TokenBucketConfig specifying bucket size, refill rate, tokens per request, and store for persistence. Initialize statistics tracking. Document that token bucket allows bursts up to bucket capacity while enforcing average rate.

Second, implement checkLimit method. Retrieve current bucket state from store including token count and last refill time. Calculate tokens to add based on elapsed time since last refill using configured refill rate. Add refilled tokens to bucket capping at bucket size. Check if sufficient tokens available for request. If yes, deduct tokens and return allowed result. If no, calculate retry after duration and return denied result. Store updated bucket state.

Third, implement token refill calculation. Refill rate is tokens per millisecond calculated from bucket size divided by window duration. Tokens to add equals elapsed time multiplied by refill rate. This continuous refill provides smooth rate limiting rather than discrete window resets.

Fourth, implement resetLimit method clearing bucket state for key. Implement getRemainingQuota calculating available requests based on current token count. Implement getStats returning aggregated statistics.

Fifth, implement edge case handling. Handle first request where no previous bucket state exists by initializing full bucket. Handle clock skew where current time is before last refill time by assuming zero elapsed time. Handle store failures by implementing fail-open or fail-closed based on configuration.

Sixth, write comprehensive tests. Test that bucket allows bursts up to capacity. Test that sustained requests are limited to average rate. Test that token refill correctly accumulates over time. Test that bucket resets after long idle period. Test that statistics track accurately. Test concurrent requests from same key maintain bucket integrity.

**Acceptance Criteria**:

TokenBucketRateLimiter correctly implements algorithm. Burst allowance equals bucket size. Average rate enforcement matches configuration. Token refill calculations are accurate. Edge cases handle appropriately. Tests validate algorithm behavior. Performance measurements show sub-millisecond check latency. Documentation explains algorithm characteristics and configuration guidance.

---

### TASK-5.9: Implement Rate Limiter Stores

**Task Description**: Create store interface and implementations for memory and Redis enabling rate limiter persistence.
# Implementation Plan: Shared Core Structure Optimization (Continuation)

## Phase 5: Validation and Rate Limiting (Weeks 9-10) - Continued

### TASK-5.9: Implement Rate Limiter Stores

**Task Description**: Create store interface and implementations for memory and Redis enabling rate limiter persistence across algorithm types.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.7 provides rate limiter interface, TASK-5.8 provides token bucket algorithm

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is the RateLimiterStore interface in `rate-limiting/stores/store-interface.ts` defining the contract for rate limit state persistence with methods for getting, setting, incrementing, and deleting rate limit data.

The second deliverable is MemoryRateLimiterStore in `rate-limiting/stores/memory-store.ts` providing in-memory rate limit tracking suitable for single-server deployments and development environments.

The third deliverable is RedisRateLimiterStore in `rate-limiting/stores/redis-store.ts` enabling distributed rate limiting across multiple application servers with Redis as the coordination layer.

The fourth deliverable is comprehensive tests validating store behavior including expiration handling, concurrent access, and error recovery.

**Subtasks**:

First, implement mock builders for all capability interfaces following the builder pattern. Create MockObservabilityContextBuilder with methods like withUserId, withRequestPath, withMetadata that chain together for fluent test setup. Create MockCacheBuilder that sets up a Map-based cache mock with predefined entries. Create MockLoggerBuilder that captures log calls for assertion. Create MockRateLimiterBuilder that controls rate limit responses deterministically. Each builder has a build method returning the fully configured mock. These builders eliminate repetitive test setup code and make tests more readable.

Second, create fixture factories generating realistic test data. Implement ErrorFixture factory with methods like createValidationError, createNotFoundError accepting customization options. Implement CacheEntryFixture creating cached values with proper metadata. Implement LogEntryFixture generating log entries with all required fields. Implement MetricFixture creating metric data points. Fixtures use sensible defaults while allowing customization for specific test scenarios. This eliminates magic values scattered through tests.

Third, implement custom matchers extending the test framework with domain-specific assertions. Create toBeValidResult matcher checking Result type is Ok. Create toBeErrorResult matcher checking Result type is Err with optional error type validation. Create toHaveBeenLoggedWith matcher checking log calls with specific parameters. Create toMatchCacheEntry matcher comparing cache entries while ignoring timestamps. These matchers make test assertions more expressive and readable.

Fourth, create integration test helpers simplifying end-to-end test setup. Implement TestApplication class that sets up complete Express app with middleware stack for integration tests. Implement TestDatabase providing in-memory database for tests. Implement TestRedis mocking Redis operations. Implement TestClock controlling time for testing time-dependent behavior. These helpers reduce boilerplate in integration tests.

Fifth, implement assertion helpers for common test patterns. Create expectValidationError helper asserting specific field errors. Create expectRateLimitExceeded helper checking rate limit response format. Create expectCircuitBreakerOpen helper validating circuit breaker state. Create expectCacheHit and expectCacheMiss helpers checking cache behavior. These helpers encapsulate complex assertion logic.

Sixth, write comprehensive documentation for test utilities. Document each mock builder showing example usage. Explain fixture factories and when to use them. Demonstrate custom matchers with before-and-after comparisons showing readability improvement. Provide integration test helper examples. Create testing best practices guide recommending when to use each utility. This documentation makes test utilities discoverable and promotes consistent test authoring.

Seventh, write tests for the test utilities themselves ensuring they work correctly. Test that mock builders produce valid mocks. Test that fixtures generate data matching schemas. Test that custom matchers provide clear failure messages. Test that integration helpers set up environments correctly. Meta-testing ensures test infrastructure is reliable.

**Acceptance Criteria**:

The task is complete when mock builders exist for all capability interfaces. Fixture factories generate realistic test data. Custom matchers improve test readability. Integration test helpers reduce boilerplate. Assertion helpers encapsulate common patterns. Documentation explains all test utilities. Tests validate test utilities work correctly. Team adopts test utilities in new tests. Developer feedback confirms utilities improve testing experience.

---

### TASK-7.2: Implement Migration Scripts

**Task Description**: Create comprehensive migration tooling including import rewriters, validation scripts, and rollback mechanisms that automate the transition from old structure to new.

**Fulfills Requirements**: REQ-4.2 (Automated Migration Tooling)

**Dependencies**: Phases 1-6 establish new structure to migrate to

**Priority**: Critical Path

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is import migration script in `migration/scripts/migrate-imports.ts` using TypeScript compiler API to rewrite import statements automatically.

The second deliverable is validation script in `migration/scripts/validate-migration.ts` detecting remaining old imports and reporting incomplete migrations.

The third deliverable is rollback script in `migration/scripts/rollback.ts` restoring previous state from backup files.

The fourth deliverable is migration progress tracking reporting showing completion percentage and remaining work.

**Subtasks**:

First, implement ImportMigrator class using TypeScript compiler API to parse and transform source files. The migrator scans TypeScript files recursively, parses them into abstract syntax trees, finds import declarations, checks if they match old patterns, rewrites them to new canonical paths, and writes modified files back to disk. Before modifying each file, create backup with .backup extension enabling rollback. Implement progress reporting showing files processed and migrations performed.

Second, define comprehensive import mapping table covering all old-to-new path transformations. Map shared/core/error-handling to shared/core/error-management. Map shared/core/errors to shared/core/error-management/errors. Map shared/core/cache to shared/core/caching. Map shared/core/logging to shared/core/observability/logging. Map shared/core/health to shared/core/observability/health. Document each mapping explaining the consolidation rationale.

Third, implement sophisticated import rewriting handling various import styles. Handle default imports, named imports, namespace imports, and side-effect imports. Preserve import formatting and comments. Handle aliased imports maintaining the alias. Support dry-run mode showing what would change without modifying files. This flexibility ensures migration tool handles all import patterns correctly.

Fourth, create MigrationValidator class detecting incomplete migrations. The validator scans all TypeScript files looking for import statements matching deprecated patterns. Report each violation with file path, line number, old import path, and suggested new path. Generate summary statistics showing total files, violation count, and most common deprecated imports. This validation ensures migration completeness.

Fifth, implement rollback mechanism restoring previous state if migration fails. RollbackHelper scans for .backup files, restores original files, and deletes backups. Verify restoration by comparing file hashes. Log all rollback operations for audit trail. Provide partial rollback capability restoring specific directories if needed. This safety mechanism enables quick recovery from migration issues.

Sixth, create migration progress tracking reporting completion metrics. Track total files in codebase, files migrated, files remaining, and migration percentage. Show progress by directory helping teams coordinate migration. Identify high-impact files that many other files depend on, prioritizing their migration. Generate migration velocity metrics showing files migrated per day. This visibility helps manage migration timeline.

Seventh, implement pre-commit hook preventing commits with deprecated imports after migration cutoff date. The hook runs validation script on staged files, blocks commit if violations found, and provides clear error messages explaining the new import paths. This enforcement prevents regressions after migration completes.

Eighth, write comprehensive tests for migration tooling. Test import rewriting handles all import styles correctly. Test validation detects all deprecated patterns. Test rollback restores files correctly. Test progress tracking calculates accurately. Use test fixtures with various import patterns ensuring migration handles edge cases. This testing ensures migration tool reliability.

**Acceptance Criteria**:

The task is complete when migration script successfully rewrites all import patterns. Validation script detects remaining deprecated imports accurately. Rollback mechanism reliably restores previous state. Progress tracking provides clear visibility into migration status. Pre-commit hooks prevent regressions. Tests validate all migration tooling. Documentation explains how to run migration safely. Team successfully migrates test codebase without issues.

---

### TASK-7.3: Create Codemods for Pattern Migration

**Task Description**: Implement codemods that automatically transform old usage patterns to new patterns beyond simple import path changes.

**Fulfills Requirements**: REQ-4.2 (Automated Migration Tooling)

**Dependencies**: TASK-7.2 provides import migration foundation

**Priority**: Medium

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is error handling codemod transforming try-catch patterns to Result type patterns where appropriate.

The second deliverable is validation codemod migrating manual validation to Zod schemas.

The third deliverable is configuration codemod consolidating scattered configuration into unified config objects.

The fourth deliverable is codemod documentation explaining what each transformation does and when to apply it.

**Subtasks**:

First, implement error handling codemod transforming exception-based error handling to Result types. The codemod identifies try-catch blocks where exceptions are caught and converted to error objects, a pattern that should use Result types instead. Transform these to return Result<T, Error> directly eliminating the try-catch wrapper. This transformation improves type safety by making error handling explicit in function signatures.

Second, create validation codemod migrating manual validation to Zod schemas. Identify patterns like if (!email.includes('@')) throw new Error('Invalid email') and transform to Zod schema definitions with proper validation. Generate schema definitions in appropriate files. Update function signatures to accept validated types. This transformation consolidates validation logic and improves type inference.

Third, implement configuration codemod consolidating scattered configuration. Identify patterns where environment variables are read inline throughout code. Extract these to configuration objects defined in one place. Replace inline reads with configuration property access. Generate configuration schema definitions. This transformation centralizes configuration making it easier to validate and document.

Fourth, create logger migration codemod transforming old logger calls to new structured logger. Identify console.log and old logger patterns. Transform to new logger with proper log levels. Add observability context to log calls. Extract context from surrounding code when possible. This ensures consistent logging through migration.

Fifth, implement dry-run mode for all codemods enabling preview before transformation. Show side-by-side diffs of changes. Provide statistics on transformations that would occur. Allow selective application per file or directory. This cautious approach builds confidence in automated transformations.

Sixth, create interactive codemod runner prompting for confirmation on ambiguous transformations. When codemod encounters pattern it cannot confidently transform, show the code and ask developer how to proceed. Remember decisions for similar patterns. This human-in-the-loop approach handles edge cases gracefully.

Seventh, write comprehensive tests for each codemod. Test successful transformations for common patterns. Test that edge cases are handled correctly. Test that invalid patterns are not transformed. Test that dry-run mode shows accurate previews. Test that interactive mode prompts appropriately. Use real-world code samples as test fixtures ensuring practical effectiveness.

**Acceptance Criteria**:

The task is complete when error handling codemod successfully transforms exception patterns. Validation codemod generates Zod schemas from manual validation. Configuration codemod consolidates environment variable access. Logger codemod updates all log calls. Dry-run mode accurately previews changes. Interactive mode handles ambiguous cases. Tests validate all transformations. Documentation explains each codemod's purpose and usage. Team successfully applies codemods to sample code.

---

### TASK-7.4: Create Comprehensive Capability Documentation

**Task Description**: Write complete documentation for every capability following consistent template with overview, concepts, API reference, examples, and troubleshooting.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: All capability implementation complete

**Priority**: High

**Estimated Duration**: 5 days

**Deliverables**:

Documentation for each capability following consistent structure. API reference documentation auto-generated from TypeScript definitions. Example code repository demonstrating real-world usage. Troubleshooting guides for common issues. Cross-linking between related capabilities.

**Subtasks**:

First, establish documentation template used consistently across all capabilities. Template sections include Overview explaining capability purpose and key benefits, Core Concepts introducing main abstractions, Quick Start providing minimal working example, API Reference documenting all public interfaces, Usage Patterns showing common scenarios, Integration Guide explaining how capability composes with others, Performance Considerations discussing optimization strategies, Troubleshooting addressing common issues, and Migration Guide for adopting the capability.

Second, write complete documentation for error-management capability. Overview explains consolidation from five implementations. Core Concepts introduces BaseError hierarchy, error handler chain, circuit breaker pattern. Quick Start shows creating custom error, using circuit breaker, integrating error middleware. API Reference documents all error classes and their methods. Usage Patterns demonstrate validation errors, not found errors, external service errors. Integration shows error-management with observability. Troubleshooting addresses common issues like errors not caught by middleware.

Third, document caching capability comprehensively. Explain unified CacheInterface and adapter pattern. Describe memory adapter, Redis adapter, multi-tier adapter, AI-enhanced adapter with decision matrix for selection. Provide configuration examples for each adapter. Show cache key generation strategies. Document cache statistics and monitoring. Demonstrate cache invalidation patterns. Explain performance characteristics. Address troubleshooting like cache stampede, stale data, memory leaks.

Fourth, create complete observability platform documentation. Explain integrated approach to logging, health, metrics, tracing. Document ObservabilityContext and correlation IDs. Show structured logging with transports. Explain health check orchestration. Demonstrate metrics collection and export. Describe distributed tracing with span creation. Provide dashboard configuration examples. Troubleshoot missing correlation IDs, incomplete traces, metric cardinality explosion.

Fifth, document validation and rate-limiting capabilities. For validation, explain Zod integration, schema composition, sanitization, middleware usage. For rate-limiting, describe algorithms, stores, key generation, middleware integration. Provide decision guides for algorithm selection. Show configuration examples. Demonstrate monitoring and tuning. Troubleshoot performance issues and false positives.

Sixth, create cross-cutting concerns documentation explaining composition philosophy. Document middleware factory usage patterns. Explain configuration management approach. Show preset configurations for common scenarios. Demonstrate pipeline builder for customization. Provide complete configuration reference. Troubleshoot integration issues.

Seventh, generate API reference documentation from TypeScript definitions using TypeDoc or similar tool. Ensure all public interfaces have comprehensive JSDoc comments. Generate HTML documentation with proper navigation and search. Include type information and inheritance relationships. Cross-link related types. This ensures documentation stays synchronized with code.

Eighth, create example code repository with runnable examples for each capability. Organize examples by capability and scenario. Include README explaining each example. Ensure examples compile and run successfully. Use examples as integration tests verifying documentation accuracy. Provide examples for common patterns, edge cases, and integration scenarios.

Ninth, write troubleshooting guides addressing issues encountered during development. For each issue, document symptoms, root causes, diagnostic steps, and solutions. Include code examples showing correct and incorrect usage. Provide debugging techniques. Create FAQ sections answering common questions. These guides reduce support burden and accelerate problem resolution.

Tenth, establish documentation maintenance process ensuring documentation stays current. Add documentation checks to CI/CD verifying public API changes have corresponding documentation updates. Schedule quarterly documentation reviews. Collect feedback from developers about documentation gaps. Maintain documentation backlog prioritizing high-impact updates.

**Acceptance Criteria**:

The task is complete when every capability has complete documentation following consistent template. API reference is auto-generated from TypeScript definitions. Example code repository demonstrates all major patterns. Troubleshooting guides address common issues. Documentation review by technical writers confirms quality. Developer feedback indicates documentation is helpful. Documentation passes CI checks. Search functionality enables quick discovery.

---

### TASK-7.5: Write Architecture Decision Records

**Task Description**: Document all major architectural decisions with context, options considered, decision made, consequences, and alternatives rejected.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: Design decisions made throughout Phases 1-6

**Priority**: Normal

**Estimated Duration**: 3 days

**Deliverables**:

Comprehensive ADR collection in `docs/architecture/decisions/` documenting all major design choices. ADR index organizing decisions by category. Template for future ADRs. Review process for proposing and approving ADRs.

**Subtasks**:

First, create ADR template following standard format. Template includes title, status (proposed/accepted/deprecated/superseded), context explaining the problem, decision stating what was chosen, consequences describing impact, alternatives documenting options rejected with rationale. Template includes metadata like date, decision-makers, related ADRs. This consistent format makes ADRs easy to read and compare.

Second, write foundational ADRs documenting major architectural choices. ADR-001 Four-Layer Architecture explains layer separation and dependency rules. ADR-002 Adapter Pattern for Specialization describes composition over parallel systems. ADR-003 Backward Compatible Migration mandates gradual migration strategy. ADR-004 Observability as Unified Capability justifies consolidation. ADR-005 Result Type Over Exceptions explains functional error handling. Each ADR provides thorough rationale with alternatives considered.

Third, document capability-specific decisions. Write ADRs for error management covering topics like why BaseError is abstract, why handler chain pattern, why circuit breaker implementation choices. Write caching ADRs covering interface design, adapter pattern application, key generation strategies. Write observability ADRs for structured logging, health check orchestration, metrics collection design. These domain-specific ADRs explain detailed design choices.

Fourth, create ADRs for cross-cutting decisions. Document middleware ordering rationale. Explain configuration management approach. Justify utility function criteria. Describe testing strategy choices. These ADRs help developers understand how capabilities compose.

Fifth, document tooling and process decisions. Write ADRs for migration tooling approach, testing utilities design, documentation standards, dependency validation strategy. These ADRs preserve institutional knowledge about development practices.

Sixth, create ADR index organizing all decisions. Categorize ADRs by layer (primitives, capabilities, cross-cutting), by capability, by type (architectural, implementation, process). Provide table of contents with status indicators. Link related ADRs showing decision dependencies. This organization makes ADR collection navigable.

Seventh, establish ADR review process. Propose new ADRs through pull requests. Require review by architecture team. Discuss in architecture review meetings. Accept ADRs through team consensus. Update status over time as decisions evolve. Supersede old ADRs when better approaches emerge. This process maintains ADR collection quality.

Eighth, integrate ADRs into documentation. Reference ADRs from capability documentation explaining design choices. Link ADRs in code comments for complex implementations. Include ADR index in main documentation. This integration makes ADRs discoverable and useful.

**Acceptance Criteria**:

The task is complete when ADR collection documents all major architectural decisions. Foundational ADRs cover layer architecture, consolidation strategy, core patterns. Capability-specific ADRs explain detailed designs. Cross-cutting ADRs document composition choices. ADR index organizes collection logically. Review process is established and documented. ADRs are integrated into documentation. Team uses ADRs to understand design rationale.

---

### TASK-7.6: Create Migration Guide

**Task Description**: Write comprehensive migration guide providing step-by-step instructions for transitioning from old structure to new with risk mitigation and success criteria.

**Fulfills Requirements**: REQ-6.2 (Migration Guide Documentation)

**Dependencies**: All migration tooling and documentation complete

**Priority**: Critical Path

**Estimated Duration**: 3 days

**Deliverables**:

Complete MIGRATION_GUIDE.md with phased approach, detailed instructions, success criteria, and rollback procedures. Migration checklist template. Risk assessment with mitigation strategies. Communication plan template for coordinating migration across teams.

**Subtasks**:

First, write migration guide overview explaining the phased approach. Describe eight phases: Foundation, Error Management, Caching, Observability, Validation and Rate Limiting, Cross-Cutting, Development Support, Deprecation. Explain that each phase has prerequisites, deliverables, and success criteria. Emphasize that migration is gradual with feature flags enabling rollback. This overview sets expectations for migration timeline and approach.

Second, document phase-by-phase migration instructions. For each phase, specify prerequisites that must be complete before starting. Provide step-by-step execution instructions with exact commands to run. Define validation steps confirming successful completion. Specify rollback procedures if issues arise. Include estimated duration and effort. Identify responsible roles. These detailed instructions enable teams to execute migration confidently.

Third, create migration checklist template teams can use to track progress. Checklist includes pre-migration tasks like backing up code and notifying stakeholders. Phase-specific tasks tracking completion of each deliverable. Post-migration tasks like deprecation cleanup and documentation updates. Status tracking with completion percentages. This checklist provides visibility into migration status.

Fourth, write risk assessment section identifying top migration risks. Document risks like production incidents, performance regressions, incomplete migration, developer resistance. For each risk, specify probability, impact, mitigation strategies, early warning signs, and contingency plans. This risk awareness enables proactive management.

Fifth, document success criteria defining when migration is complete. Specify metrics including zero deprecated imports verified through automated validation, zero circular dependencies confirmed by tooling, test coverage maintained or improved, performance within five percent of baseline, zero production incidents from migration, developer satisfaction survey showing eighty percent positive feedback. These objective criteria enable clear go/no-go decisions.

Sixth, create communication plan template for coordinating migration. Include announcement drafting team about migration start, regular status updates showing progress, issue tracking documenting problems encountered, success communication celebrating milestones, retrospective conducting lessons learned. This communication keeps stakeholders informed and engaged.

Seventh, write troubleshooting section addressing common migration issues. Document symptoms, root causes, diagnostic steps, solutions for issues like compilation errors after import migration, test failures due to changed interfaces, circular dependency violations, performance regressions, feature flag issues. Each troubleshooting entry includes code examples showing problems and solutions.

Eighth, create FAQ section answering anticipated questions. Address questions like timeline duration, resource requirements, whether migration can be partial, what breaks without backward compatibility, how to customize for specific applications, who to contact for help. Clear answers reduce confusion and support burden.

**Acceptance Criteria**:

The task is complete when migration guide provides comprehensive phased instructions. Checklist template enables progress tracking. Risk assessment identifies key risks with mitigation. Success criteria are objective and measurable. Communication plan template facilitates coordination. Troubleshooting section addresses common issues. FAQ answers anticipated questions. Guide review by technical leads confirms completeness. Pilot migration following guide succeeds without major issues.

---

### TASK-7.7: Create Developer Onboarding Guide

**Task Description**: Write onboarding guide helping new team members understand shared/core structure and become productive quickly.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location), REQ-6.1 (Documentation)

**Dependencies**: All documentation complete

**Priority**: Normal

**Estimated Duration**: 2 days

**Deliverables**:

Complete ONBOARDING.md guiding new developers through shared/core structure. Capability discovery guide. Common patterns reference. Getting started checklist. Learning path recommendations.

**Subtasks**:

First, write onboarding overview explaining shared/core purpose and structure. Describe consolidation accomplishments including single canonical locations, eliminated duplicates, clean dependencies. Introduce four-layer architecture with simple explanations of each layer. Provide high-level tour of capabilities. This overview gives new developers mental model of the system.

Second, create capability discovery guide helping developers find functionality. Organize capabilities by use case: "Need error handling? Use error-management". "Need caching? Use caching". Provide decision trees for complex choices like which cache adapter to use. Show how to search documentation effectively. Demonstrate IDE features for discovering imports. This guide reduces time spent searching for functionality.

Third, document common patterns developers will encounter frequently. Explain Result types and how to use them. Show adapter pattern examples. Demonstrate dependency injection patterns. Illustrate middleware composition. These patterns appear throughout consolidated code, so understanding them accelerates comprehension.

Fourth, create getting started checklist for new developers. Tasks include cloning repository, reading architecture overview, exploring one capability in depth, writing first test using test utilities, contributing first documentation improvement, participating in architecture review. This structured approach ensures consistent onboarding.

Fifth, provide learning path recommendations based on role. Backend developers should focus on error-management, caching, validation. Frontend developers should focus on observability, utilities. DevOps engineers should focus on configuration, observability, migration. Platform engineers should deep dive into cross-cutting concerns. Tailored paths make onboarding relevant.

Sixth, create glossary defining key terms like primitives, capabilities, adapters, barrel exports, feature flags, circuit breakers. Clear definitions prevent confusion about terminology used throughout documentation.

Seventh, compile list of common "gotchas" new developers encounter. Document issues like forgetting to propagate observability context, importing from wrong layer, not handling Result types, misconfiguring capabilities. For each gotcha, explain symptoms and solutions. This proactive guidance prevents common mistakes.

**Acceptance Criteria**:

The task is complete when onboarding guide provides clear introduction to shared/core. Capability discovery guide helps find functionality quickly. Common patterns are documented with examples. Getting started checklist structures onboarding. Learning paths support different roles. Glossary defines key terms. Common gotchas are documented. New developer feedback confirms guide is helpful. Time to productivity for new developers decreases measurably.

---

### Phase 7 Gate Review Checklist

Before proceeding to Phase 8, verify the following conditions:

Test utilities provide mock builders, fixtures, and matchers. Migration scripts successfully rewrite imports. Codemods transform patterns beyond imports. Validation scripts detect incomplete migration. Rollback mechanisms work reliably. Every capability has comprehensive documentation. API reference auto-generated from TypeScript. Example code repository demonstrates patterns. Architecture decision records document major choices. Migration guide provides detailed instructions. Developer onboarding guide helps new team members. All documentation reviewed and approved. Developer surveys confirm documentation quality.

---

## Phase 8: Deprecation and Cleanup (Weeks 15-16)

### Phase Objectives

The final phase completes the migration by removing old implementations, cleaning up backward compatibility code, and verifying that the consolidation achieved its goals. This phase requires careful validation that no code depends on deprecated locations before deletion. Success metrics are measured, lessons learned are documented, and the team celebrates the successful consolidation.

### Phase Success Criteria

Deprecation phase succeeds when zero imports from deprecated locations exist verified through automated validation. Old implementations are completely removed from codebase. Backward compatibility adapters are deleted. Bundle size reduction meets twenty percent target. Performance benchmarks confirm parity. All success criteria from requirements document are met. Post-migration retrospective documents lessons learned.

---

### TASK-8.1: Validate Complete Migration

**Task Description**: Execute comprehensive validation confirming that migration is complete with zero remaining dependencies on old structure.

**Fulfills Requirements**: REQ-4.1 (Zero-Downtime Migration Path)

**Dependencies**: Phases 1-7 complete migration

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

Validation report confirming zero deprecated imports. Dependency graph analysis showing clean architecture. Test results confirming all tests pass. Performance comparison showing acceptable metrics. Bundle analysis confirming size reduction.

**Subtasks**:

First, run migration validation script across entire codebase scanning for any remaining deprecated imports. Generate detailed report listing any violations found with file paths, line numbers, and suggested fixes. If violations exist, migration is incomplete and must continue. Only proceed with deprecation when validation shows zero violations. This gate ensures safe deprecation.

Second, execute dependency analysis using dependency-cruiser to verify architecture. Confirm dependency graph forms directed acyclic graph with no cycles. Validate layer boundaries are respected with no violations. Generate visual graph showing clean architecture. Compare to baseline dependency graph from before consolidation showing improvement. This analysis confirms structural goals achieved.

Third, run complete test suite across all test types. Execute unit tests, integration tests, performance tests. Confirm one hundred percent pass rate. Compare test coverage to baseline ensuring coverage maintained or improved. Investigate any test failures determining root cause. Only proceed when all tests pass consistently. This validation ensures functional correctness.

Fourth, execute performance benchmarks comparing new implementation to baseline measurements. Benchmark error creation, cache operations, logging throughput, rate limit checks, validation operations. Confirm all benchmarks within five percent of baseline. Investigate any regressions determining cause and optimizing if necessary. Generate performance comparison report. This ensures performance requirements met.

Fifth, analyze production bundle sizes comparing before and after consolidation. Use webpack bundle analyzer to visualize shared/core contribution to bundles. Confirm reduction of at least twenty percent. Identify any unexpected size increases investigating causes. Verify tree-shaking eliminates unused capabilities from bundles. Generate bundle size report with charts showing improvement. This validates bundle size optimization goal.

Sixth, validate feature flags showing all traffic routing through new code paths. Confirm no traffic using old implementations. Review metrics confirming equivalent behavior between old and new paths during gradual rollout. Ensure no error rate increases or performance regressions in production. This production validation confirms migration success.

Seventh, conduct code review of migration changes ensuring quality. Review import changes confirming correctness. Review pattern transformations from codemods. Verify all deprecated code marked appropriately. Confirm documentation updates are complete. This peer review catches issues before deprecation.

**Acceptance Criteria**:

The task is complete when validation scripts confirm zero deprecated imports across entire codebase. Dependency analysis shows clean architecture with no cycles. All tests pass with maintained or improved coverage. Performance benchmarks meet targets. Bundle analysis confirms twenty percent size reduction. Production metrics show successful migration. Code review approves migration quality. Stakeholders sign off on proceeding with deprecation.

---

### TASK-8.2: Add Deprecation Warnings

**Task Description**: Add clear deprecation warnings to old barrel exports and deprecated code paths to guide any remaining stragglers.

**Fulfills Requirements**: REQ-4.1 (Zero-Downtime Migration Path)

**Dependencies**: TASK-8.1 validates migration readiness

**Priority**: High

**Estimated Duration**: 1 day

**Deliverables**:

Deprecation warnings in old barrel exports. Runtime warnings when deprecated paths execute. Documentation updates marking old code deprecated. Deprecation schedule announcing removal date.

**Subtasks**:

First, add TypeScript deprecation comments to old barrel exports using JSDoc @deprecated tag. Mark exports from shared/core/error-handling/, shared/core/cache/, shared/core/logging/ as deprecated with messages pointing to new canonical locations. These comments show warnings in IDEs helping developers discover they're using deprecated imports. Include deprecation version and planned removal version in messages.

Second, add runtime warnings for any remaining deprecated code paths. When old code executes, log warning messages indicating deprecated usage with migration guidance. Include stack traces helping locate deprecated calls. Make warnings visible in development but silent in production to avoid log noise. These runtime warnings catch dynamic code paths not detected by static analysis.

Third, update documentation marking old locations deprecated. Add prominent deprecation notices to README files in deprecated directories. Update API documentation with deprecation annotations. Link to migration guide from deprecation notices. Provide clear migration paths for each deprecated feature. This documentation guides stragglers toward new structure.

Fourth, announce deprecation schedule communicating removal timeline. Send team-wide announcement explaining that old implementations are deprecated, providing migration guide link, specifying removal date one release cycle in the future, offering support for migration questions. This clear communication sets expectations.

Fifth, update CI/CD pipeline to warn about deprecated imports. Add check detecting deprecated imports in new code. Allow warnings but track them. Set goal of zero new deprecated imports. This prevents new code from using deprecated patterns while allowing existing code time to migrate.

**Acceptance Criteria**:

The task is complete when TypeScript deprecation comments exist in all old barrel exports. Runtime warnings log deprecated usage in development. Documentation clearly marks deprecated locations. Deprecation schedule is announced to team. CI/CD tracks deprecated import usage. Developers receive clear guidance when using deprecated code.

---

### TASK-8.3: Remove Old Implementations

**Task Description**: Delete old implementations, backward compatibility adapters, and deprecated barrel exports after validation confirms safe removal.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-8.1 validates migration complete, TASK-8.2 warns stragglers

**Priority**: Critical Path

**Estimated Duration**: 2 days

**Deliverables**:

Old implementation directories deleted. Backward compatibility code removed. Clean codebase with only canonical implementations. Git history preserved for reference.

**Subtasks**:

First, create comprehensive backup before deletion. Tag current commit for easy rollback if needed. Document what is being deleted and why. Communicate deletion to team. This safety measure enables quick recovery if problems discovered.

Second, delete old implementation directories including error-handling/, errors/ (if separate from error-management/), cache/, logging/, health/, rate-limiting/ duplicates. Remove files using git rm to preserve history. Ensure no references remain to deleted files. Verify deletion through compilation confirming no import errors. This removes duplicate implementations.

Third, remove backward compatibility adapters from error-management/legacy-adapters/, caching/legacy-adapters/, etc. These adapters served their purpose during migration but are no longer needed. Delete adapter files and their tests. Remove adapter exports from barrel exports. This cleanup eliminates migration-only code.

Fourth, delete old barrel exports that re-exported from new locations. Remove the re-export index.ts files from deprecated directories. Verify no code imports through old paths. Ensure clean separation of concerns. This completes import path cleanup.

Fifth, remove feature flag code that controlled old versus new implementations. Delete feature flag definitions, evaluation logic, and side-by-side comparison code. This eliminates migration complexity from production code.

Sixth, update import path references in any remaining configuration or documentation. Scan for references to old paths in README files, example code, scripts. Update all references to point to new canonical locations. This ensures documentation consistency.

Seventh, run full test suite after deletion confirming nothing broke. Execute validation scripts verifying clean architecture maintained. Review dependency graphs confirming expected structure. Test production deployment in staging environment. This validation ensures deletion was safe.

Eighth, create pull request for deletion changes with comprehensive description explaining what was deleted and why. Link to validation report confirming safe deletion. Get review from multiple team members. Merge with clear commit message. This process ensures transparency and peer review.

**Acceptance Criteria**:

The task is complete when all old implementation directories are deleted. Backward compatibility code is removed. Old barrel exports are deleted. Feature flag code is eliminated. All import references updated. Full test suite passes. Dependency analysis shows clean architecture. Production deployment succeeds. Team reviews and approves deletion changes. Codebase contains only canonical implementations.

---

### TASK-8.4: Verify Success Metrics

**Task Description**: Measure all success criteria defined in requirements document confirming consolidation achieved its goals.

**Fulfills Requirements**: All requirements, success criteria measurement

**Dependencies**: TASK-8.3 completes deletion, all phases complete

**Priority**: High

**Estimated Duration**: 2 days

**Deliverables**:

Comprehensive success metrics report. Comparison to baseline showing improvements. Visual dashboards showing key metrics. Success criteria verification documenting achievement.

**Subtasks**:

First, measure structural consolidation metrics. Count implementations of each duplicated component confirming exactly one canonical implementation. Verify BaseError, CircuitBreaker, Logger, Cache implementations consolidated to single sources. Document elimination of duplication with before-after statistics. Generate report showing consolidation achievement.

Second, measure dependency hygiene metrics. Run dependency-cruiser confirming zero circular dependencies. Verify all layer boundaries respected with zero violations. Count dependency depth and complexity comparing to baseline. Generate visual dependency graph showing clean architecture. Document architecture improvements with quantitative metrics.

Third, measure performance metrics comparing to baseline. Execute all performance benchmarks recording results. Calculate percentage difference from baseline for each operation. Verify all operations within five percent of baseline performance. Document any improvements from consolidation. Generate performance comparison charts showing results.

Fourth, measure bundle size reduction. Analyze production bundles calculating shared/core contribution. Compare to baseline bundle sizes. Calculate percentage reduction. Verify tree-shaking eliminates unused code. Document bundle size improvements with visualization showing before-after comparison. Confirm twenty percent reduction target achieved.

Fifth, measure test coverage metrics. Run coverage analysis across entire shared/core codebase. Calculate overall coverage percentage and capability-specific coverage. Compare to baseline coverage of seventy-six percent. Verify coverage maintained or improved. Document coverage improvements by capability. Generate coverage report with trend analysis.

Sixth, measure migration completeness. Run validation scripts confirming zero deprecated imports. Verify one hundred percent of code uses canonical paths. Count files migrated and modernized. Document migration success rate. This confirms complete migration achievement.

Seventh, conduct developer satisfaction survey. Survey engineering team about new structure usability, discoverability, documentation quality, migration experience. Calculate satisfaction percentage. Compare to baseline if available. Collect qualitative feedback about improvements and remaining issues. Target eighty percent positive feedback. Document satisfaction results.

Eighth, measure operational metrics. Calculate incident rate from migration comparing to baseline. Measure mean time to recovery for any issues. Track error rates before, during, and after migration. Verify zero migration-related production incidents. Document operational stability achievement.

Ninth, compile comprehensive success metrics report combining all measurements. Create executive summary highlighting key achievements. Include detailed metrics by category. Provide visual dashboards with charts and graphs. Compare all metrics to requirements success criteria. Document which criteria met and which exceeded. This report demonstrates consolidation success.

**Acceptance Criteria**:

The task is complete when all success metrics are measured and documented. Structural consolidation confirmed with single implementations. Dependency hygiene verified with zero cycles. Performance parity demonstrated within five percent. Bundle size reduction exceeds twenty percent target. Test coverage maintained or improved. Migration one hundred percent complete. Developer satisfaction exceeds eighty percent positive. Zero production incidents from migration. Comprehensive report documents success. Stakeholders review and accept metrics report.

---

### TASK-8.5: Conduct Post-Migration Retrospective

**Task Description**: Facilitate retrospective meeting with all stakeholders to reflect on migration, capture lessons learned, and identify process improvements.

**Fulfills Requirements**: Continuous improvement, knowledge capture

**Dependencies**: All migration complete, metrics measured

**Priority**: Normal

**Estimated Duration**: 1 day

**Deliverables**:

Retrospective meeting conducted with all stakeholders. Lessons learned documented. Process improvements identified. Success stories captured. Challenges and solutions recorded. Recommendations for future migrations.

**Subtasks**:

First, schedule retrospective meeting with all key stakeholders including systems architects, developer advocates, quality engineers, technical leads, platform engineers. Allow two hours for thorough discussion. Prepare agenda covering what went well, what could improve, lessons learned, and next steps. This inclusive approach captures diverse perspectives.

Second, facilitate discussion of what went well during migration. Identify successful strategies like phased approach, feature flags, automated tooling, comprehensive documentation. Capture specific examples of successes. Recognize team members who contributed significantly. Document successful patterns worth repeating. This positive focus celebrates achievements.

Third, discuss what could improve in future migrations. Identify challenges like underestimated timelines, communication gaps, testing bottlenecks, migration script edge cases. Brainstorm solutions for each challenge. Prioritize improvements by impact. Document specific recommendations for future work. This constructive reflection enables continuous improvement.

Fourth, capture technical lessons learned about architecture and implementation. Document insights about dependency management, testing strategies, performance optimization, documentation approaches. Record what worked and what didn't. Identify patterns worth codifying into standards. These technical lessons preserve institutional knowledge.

Fifth, capture process lessons learned about migration management. Document insights about phased rollout, feature flag usage, team coordination, risk management. Identify process improvements for future migrations. Consider what communication methods worked best. These process lessons improve organizational capability.

Sixth, identify follow-up actions from retrospective. Assign owners for process improvements. Schedule review of recommendations. Plan updates to migration guide incorporating lessons learned. Track completion of action items. This ensures retrospective insights lead to concrete improvements.

Seventh, document retrospective outcomes in written report. Summarize discussion themes. List key takeaways. Document recommendations with rationale. Include quotes from participants. Circulate report to broader engineering organization. This sharing spreads learning beyond immediate team.

Eighth, update migration guide and documentation based on lessons learned. Add sections covering newly discovered challenges and solutions. Improve instructions based on actual experience. Update troubleshooting guide. These improvements help future migrations.

**Acceptance Criteria**:

The task is complete when retrospective meeting is conducted with full stakeholder participation. What went well is documented celebrating successes. What could improve is identified with concrete recommendations. Technical lessons are captured. Process lessons are documented. Follow-up actions are assigned with owners. Retrospective report is written and circulated. Migration guide is updated with lessons learned. Team agrees retrospective was valuable.

---

### TASK-8.6: Update Long-Term Maintenance Plan

**Task Description**: Establish ongoing maintenance plan ensuring consolidated structure remains clean and dependency hygiene is maintained long-term.

**Fulfills Requirements**: Sustainability, continuous improvement

**Dependencies**: All consolidation complete

**Priority**: Normal

**Estimated Duration**: 2 days

**Deliverables**:

Long-term maintenance plan document. Automated validation in CI/CD. Architecture review process. Contribution guidelines. Monitoring and alerting for architecture degradation.

**Subtasks**:

First, document ongoing architecture validation requirements. Specify that CI/CD must validate zero circular dependencies on every commit. Define layer boundary checks that must pass. Require bundle size tracking with alerts on regressions. Document performance benchmark requirements. This automation prevents architecture decay.

Second, establish architecture review process for significant changes. Define what constitutes significant change requiring review including new capabilities, layer boundary changes, cross-cutting concern modifications. Specify review process with architecture team evaluation. Create checklist for architecture reviews. Schedule regular architecture review meetings. This governance maintains quality.

Third, create contribution guidelines for shared/core. Document when to add code to shared/core versus application code. Specify criteria for new capabilities. Explain adapter pattern for specializations. Provide examples of appropriate and inappropriate additions. Include checklist for contributors. These guidelines prevent improper usage.

Fourth, define monitoring and alerting for architecture health. Track metrics including dependency graph complexity, test coverage, bundle sizes, API usage patterns. Set up alerts for degradation like coverage drops, size increases, new circular dependencies. Create dashboard visualizing architecture health over time. This visibility enables proactive maintenance.

Fifth, establish quarterly architecture review meetings. Review overall structure health, discuss proposed changes, evaluate new patterns, plan improvements. Include representatives from all engineering teams. Document decisions in ADRs. This regular review maintains long-term quality.

Sixth, create process for deprecating and removing unused code. Define criteria for marking code deprecated. Specify deprecation period before removal. Require usage analysis before deprecation. Document removal process. This prevents accumulation of dead code.

Seventh, plan for evolution of consolidated structure. Anticipate need for new capabilities. Define process for adding capabilities maintaining clean architecture. Consider how structure scales with codebase growth. Document principles guiding evolution. This forward thinking ensures structure remains useful.

Eighth, assign ownership for shared/core maintenance. Designate architecture team responsible for governance. Assign capability owners for each directory. Define escalation path for architecture questions. This clear ownership ensures accountability.

**Acceptance Criteria**:

The task is complete when maintenance plan is documented comprehensively. Automated validation is integrated in CI/CD. Architecture review process is established with schedule. Contribution guidelines are clear and accessible. Monitoring and alerting are configured. Quarterly review meetings are scheduled. Ownership is assigned. Team understands maintenance responsibilities. Plan is approved by technical leadership.

---

### TASK-8.7: Celebrate Success and Communicate Completion

**Task Description**: Celebrate successful consolidation with team, communicate achievements to organization, and recognize contributions.

**Fulfills Requirements**: Team morale, organizational awareness

**Dependencies**: All work complete, metrics validated

**Priority**: Normal

**Estimated Duration**: 1 day

**Deliverables**:

Team celebration event. Success announcement to organization. Blog post or presentation about consolidation. Recognition for key contributors. Updated architecture documentation highlighting improvements.

**Subtasks**:

First, organize team celebration recognizing consolidation completion. Plan event bringing together everyone who contributed. Celebrate achievement of goals including eliminating duplication, cleaning dependencies, improving developer experience. Share success metrics demonstrating impact. This celebration acknowledges hard work and builds team morale.

Second, write announcement communicating consolidation completion to broader organization. Summarize the problem solved, approach taken, results achieved. Highlight benefits for developers including easier discovery, better documentation, cleaner architecture. Include metrics showing improvements. Explain what teams should do to adopt consolidated structure. This communication spreads awareness.

Third, create blog post or tech talk presenting consolidation story. Explain motivations for consolidation. Describe approach including layered architecture, phased migration, feature flags. Share lessons learned. Discuss challenges overcome. Present quantitative results. This sharing educates broader tech community and showcases engineering excellence.

Fourth, recognize individual contributors publicly. Identify key contributors across architecture, implementation, testing, documentation, migration. Thank them in team meetings, announcements, and blog posts. Consider awards or bonuses for exceptional contributions. This recognition shows appreciation and motivates future contributions.

Fifth, update main architecture documentation with consolidation results. Add section to README highlighting improvements from consolidation. Update architecture diagrams showing clean structure. Document success metrics. Provide before-after comparisons. This documentation makes improvements visible to all developers.

Sixth, share consolidation story in engineering all-hands meeting. Present to entire engineering organization explaining what was accomplished and why it matters. Demo new structure showing improved developer experience. Take questions from teams. This broad communication ensures everyone understands changes.

Seventh, document case study for future reference. Write detailed account of consolidation including problem statement, solution design, implementation approach, results achieved, lessons learned. Include metrics and examples. Preserve as reference for similar future efforts. This documentation provides playbook for future architectural improvements.

**Acceptance Criteria**:

The task is complete when team celebration is held with participation from all contributors. Success announcement is sent to organization. Blog post or presentation is created and shared. Key contributors are recognized publicly. Architecture documentation is updated with consolidation results. All-hands presentation is delivered. Case study is documented. Positive feedback is received from team and organization.

---

### Phase 8 Gate Review Checklist

Before declaring consolidation complete, verify the following conditions:

Migration validation confirms zero deprecated imports. All tests pass with maintained or improved coverage. Performance benchmarks meet targets within five percent. Bundle size reduction exceeds twenty percent. Old implementations completely removed from codebase. Backward compatibility code deleted. Feature flags cleaned up. Success metrics measured and documented. All requirements success criteria met. Retrospective conducted with lessons learned documented. Long-term maintenance plan established. Automated validation integrated in CI/CD. Contribution guidelines published. Success communicated to organization. Team celebration held. Architecture documentation updated.

---

## Post-Implementation Review

### Final Success Validation

The shared core structure optimization project is considered successfully complete when all of the following conditions are verified:

**Structural Goals Achieved**:
- Exactly one canonical implementation exists for each capability
- Zero duplicate code detected through similarity analysis
- Zero circular dependencies confirmed by automated tooling
- Clean four-layer architecture with enforced boundaries
- All code organized in logical, discoverable locations

**Technical Goals Achieved**:
- All tests passing with coverage ≥76% baseline
- Performance within 5% of baseline across all operations
- Bundle size reduced by ≥20% verified through webpack analysis
- Tree-shaking effectively eliminates unused code
- Zero production incidents during or after migration

**Process Goals Achieved**:
- Migration completed in 16 weeks or less
- 100% of imports using canonical paths
- Automated validation preventing regressions
- Comprehensive documentation for all capabilities
- Developer satisfaction ≥80% in post-migration survey

**Operational Goals Achieved**:
- Monitoring confirms successful migration
- Architecture governance process established
- Long-term maintenance plan in place
- Team trained on new structure
- Knowledge captured for future reference

### Lessons Learned Summary

Key lessons from consolidation that should inform future work:

**Architectural Lessons**:
- Strict layer boundaries prevent dependency cycles effectively
- Adapter pattern enables specialization without duplication
- Feature flags enable gradual, safe migration
- Automated validation prevents architecture decay
- Investment in primitives layer pays dividends

**Process Lessons**:
- Phased approach manages risk better than big-bang
- Comprehensive documentation accelerates adoption
- Migration tooling dramatically reduces manual effort
- Regular communication prevents confusion
- Early stakeholder involvement ensures buy-in

**Technical Lessons**:
- Result types improve error handling clarity
- Structured logging enables better observability
- Integration testing validates cross-capability behavior
- Performance benchmarking catches regressions early
- Bundle analysis guides optimization efforts

### Recommendations for Future Work

Based on consolidation experience, recommend the following for future architectural efforts:

1. **Apply Same Approach to Application Code**: Consider applying layered architecture principles to application-level code for similar benefits

2. **Extend Observability Integration**: Further integrate observability across all application code, not just shared/core

3. **Enhance Developer Tools**: Build on migration tooling foundation to create more sophisticated code transformation tools

4. **Expand Test Utilities**: Continue investing in test utilities that make testing easier and more effective

5. **Document Patterns Library**: Create comprehensive patterns library showing how to use consolidated capabilities effectively

6. **Performance Optimization**: Profile and optimize specific capability implementations for even better performance

7. **Developer Experience Improvements**: Continuously gather feedback and improve developer experience based on actual usage

8. **Scaling Considerations**: Plan for how structure scales as codebase grows and team expands

### Conclusion

The shared core structure optimization successfully transforms fragmented, duplicated code into a clean, well-organized system following architectural best practices. Through careful planning, phased execution, comprehensive testing, and thorough documentation, the project achieves its goals while maintaining production stability.

The consolidated structure provides a solid foundation for future development with clear patterns, clean dependencies, and comprehensive documentation. Developers can now discover functionality easily, understand architectural decisions through ADRs, and adopt capabilities through simple configuration.

The success of this consolidation demonstrates the value of investing in architectural quality and provides a model for similar future efforts. The processes, tooling, and lessons learned create reusable assets that benefit the organization beyond this specific project.

---

**Implementation Plan Version**: 1.0  
**Last Updated**: 2025-10-16  
**Status**: Complete  
**Next Review**: Post-implementation retrospective in Week 17, define the RateLimiterStore interface specifying all required operations. The interface includes get method accepting a key and returning the stored rate limit state or null if not found, set method accepting key, value, and TTL for storing rate limit state with automatic expiration, delete method for removing a specific key's state, and increment method for atomic counter operations used by simpler rate limiting algorithms. Document that implementations must handle concurrent access safely and provide reasonable performance under high load.

Second, implement MemoryRateLimiterStore using a Map for storage. Store entries as objects containing the value and expiration timestamp. The get method checks expiration before returning values, automatically removing expired entries. The set method stores the value with calculated expiration time based on TTL. The increment method atomically increments counters or initializes them if they don't exist. Implement a cleanup interval that periodically scans for and removes expired entries to prevent memory leaks. Document that memory store is suitable for development but not for production deployments with multiple servers since each server maintains separate state.

Third, create RedisRateLimiterStore using a Redis client for distributed storage. The get method executes Redis GET command and parses the JSON-serialized value. The set method uses Redis SETEX to atomically set value with expiration. The delete method uses Redis DEL. The increment method uses Redis INCR followed by PEXPIRE to set expiration, wrapping both in a transaction to ensure atomicity. Implement connection pooling and error handling with circuit breaker pattern to gracefully degrade if Redis becomes unavailable. Document that Redis store enables consistent rate limiting across distributed application servers but requires Redis infrastructure.

Fourth, implement error handling strategies for store failures. When Redis is unavailable, the store can either fail open allowing requests through or fail closed blocking requests. Provide configuration for this strategy. Log all store errors with appropriate context for debugging. Implement exponential backoff for retrying transient failures. Document the error handling behavior and how applications should configure it based on their reliability requirements.

Fifth, create store factory that selects appropriate implementation based on configuration. The factory accepts configuration specifying store type, connection parameters for Redis, and behavioral options like cleanup intervals. This abstraction enables applications to switch between memory and Redis stores through configuration changes without code modifications.

Sixth, write comprehensive tests for both store implementations. Test that values expire after TTL. Test that increment operations are atomic. Test concurrent access from multiple threads maintains consistency. Test error scenarios like Redis connection failures. Test that cleanup intervals prevent memory leaks in memory store. For Redis store, use Redis mock or test container to validate behavior. Compare performance characteristics between memory and Redis stores under various load patterns.

**Acceptance Criteria**:

The task is complete when the RateLimiterStore interface defines all necessary operations for rate limit persistence. MemoryRateLimiterStore correctly implements in-memory storage with automatic expiration cleanup. RedisRateLimiterStore enables distributed rate limiting with atomic operations. Error handling provides configurable fail-open or fail-closed behavior. Store factory enables configuration-based store selection. Tests validate all store operations including expiration, atomicity, and error scenarios. Performance benchmarks show memory store completing operations in under fifty microseconds and Redis store in under five milliseconds. Documentation explains when to use each store type and how to configure them.

---

### TASK-5.10: Implement Rate Limiting Middleware

**Task Description**: Create Express middleware providing declarative rate limiting for HTTP endpoints with standard response headers and error handling.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-5.7 provides interface, TASK-5.8 provides algorithms, TASK-5.9 provides stores

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is RateLimitMiddleware in `rate-limiting/middleware/rate-limit-middleware.ts` integrating rate limiting into Express request processing with configurable key generation and error handling.

The second deliverable is common key generation strategies enabling rate limiting by IP address, user ID, API key, or custom logic.

The third deliverable is response header management setting standard rate limit headers including current limit, remaining quota, and reset time.

The fourth deliverable is comprehensive tests validating middleware behavior under various scenarios including limit exceeded, errors, and concurrent requests.

**Subtasks**:

First, implement RateLimitMiddleware class accepting RateLimiter instance, configuration, and logger through constructor dependency injection. The configuration specifies key generation function, whether to skip rate limiting on errors, callback for when limits are exceeded, and whether to apply rate limiting to specific HTTP methods only. Initialize statistics tracking for middleware-level metrics like total requests processed and requests denied.

Second, implement the limit method returning Express middleware with proper signature accepting request, response, and next function. Extract the rate limit key using the configured key generator function. Call the rate limiter's checkLimit method with the key and observability context. Set standard rate limit response headers including X-RateLimit-Limit showing the maximum requests allowed, X-RateLimit-Remaining showing quota remaining, X-RateLimit-Reset showing when the limit resets as Unix timestamp. If rate limit check fails, also set Retry-After header indicating seconds until retry should be attempted.

Third, handle the rate limit check result. If the request is allowed, call next to continue processing. If denied, invoke the onLimitReached callback if configured, log the denial with observability context, and return 429 Too Many Requests status with JSON body explaining the error and when to retry. Handle errors from the rate limiter by either skipping rate limiting and continuing request processing if skipOnError is true, or returning 500 Internal Server Error if false. This configurable error handling enables applications to choose whether rate limiting failures should block requests.

Fourth, implement common key generation strategies as exported functions. The byIP strategy extracts request.ip for per-IP rate limiting. The byUser strategy uses request.user.id if authenticated or falls back to IP for anonymous users. The byAPIKey strategy extracts the X-API-Key header for API rate limiting. The byPath strategy combines IP and request path enabling different limits per endpoint. The custom strategy accepts a function enabling application-specific logic. Document when each strategy is appropriate and how to compose strategies for multi-dimensional rate limiting.

Fifth, integrate with observability for monitoring rate limit effectiveness. Log when limits are exceeded including key, limit value, and request details. Record metrics for rate limit hits and misses. Track the distribution of remaining quota across keys to identify keys approaching limits. This telemetry enables operators to tune rate limits based on actual usage patterns and identify potential abusers.

Sixth, write comprehensive tests for the middleware. Test that requests within limits pass through successfully with correct headers. Test that requests exceeding limits return 429 with retry information. Test that error handling behaves according to skipOnError configuration. Test that different key generation strategies produce expected keys. Test concurrent requests from the same key are properly rate limited. Test integration with error management middleware for consistent error responses. Test that observability context flows through rate limiting for correlation.

**Acceptance Criteria**:

The task is complete when rate limiting middleware integrates seamlessly with Express applications. Key generation strategies cover common use cases including per-IP, per-user, and per-API-key limiting. Response headers follow standard rate limit header conventions. Error handling provides configurable behavior for rate limiter failures. Observability integration enables monitoring rate limit effectiveness. Tests validate all middleware functionality including edge cases. Documentation provides examples for common rate limiting scenarios. Integration tests demonstrate middleware working with authentication and error handling middleware.

---

### TASK-5.11: Create Validation and Rate Limiting Documentation

**Task Description**: Write comprehensive documentation for validation and rate limiting capabilities including usage guides, configuration examples, and migration instructions.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: All validation and rate limiting implementation tasks complete

**Priority**: Normal

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is validation/README.md with complete capability overview explaining Zod integration, schema composition, sanitization patterns, and middleware usage.

The second deliverable is rate-limiting/README.md covering algorithm selection, store configuration, key generation strategies, and monitoring recommendations.

The third deliverable is example code in validation/examples/ and rate-limiting/examples/ demonstrating common usage patterns with inline explanations.

The fourth deliverable is troubleshooting guides addressing common issues like validation performance, rate limit tuning, and integration problems.

**Subtasks**:

First, write validation README providing comprehensive overview of the validation capability. Explain that validation consolidates scattered validation logic into unified system with type-safe schemas. Include quick start showing how to define a schema, validate data, and handle validation errors. Document the relationship between Zod schemas and TypeScript types explaining how type inference works. Provide examples of common schemas like email validation, password complexity, and nested object validation. Explain sanitization and when to apply it before validation. Link to detailed documentation for each aspect.

Second, document validation middleware integration with Express. Show how to use validate, validateQuery, and validateParams middleware. Provide examples of route-level validation with clear error responses. Explain how validation integrates with error management for consistent error handling. Document best practices like validating at API boundaries, using schemas for documentation, and caching compiled schemas for performance.

Third, create rate limiting README explaining the rate limiting capability architecture. Describe the different algorithms including token bucket, sliding window, and fixed window with diagrams showing how each works. Explain when to use each algorithm based on traffic patterns and fairness requirements. Document store options explaining memory store for development and Redis store for production. Provide decision matrix helping developers choose appropriate algorithm and store for their use case.

Fourth, document rate limiting configuration with concrete examples. Show how to configure token bucket rate limiter with appropriate bucket size and refill rate. Explain key generation strategies and when to use each. Provide examples of endpoint-specific rate limiting, user-tier-based limits, and cost-based rate limiting for AI APIs. Document integration with authentication middleware for user-specific limits. Explain monitoring and tuning rate limits based on observed traffic patterns.

Fifth, create troubleshooting guides for both capabilities. For validation, address issues like performance with large schemas, handling optional fields, validating file uploads, and debugging validation failures. For rate limiting, cover topics like rate limit key collisions, distributed cache synchronization, handling burst traffic, and debugging rate limit bypasses. Each troubleshooting entry includes symptoms, root causes, and solutions with code examples.

Sixth, write migration guides explaining how to adopt validation and rate limiting. For validation, show how to migrate from manual validation code to Zod schemas. For rate limiting, explain migrating from old rate limiting implementations to the new unified system. Provide side-by-side comparisons showing old patterns and their new equivalents. Include checklists for validating migration completeness.

Seventh, create example applications demonstrating real-world usage. Write validation/examples/api-validation.ts showing complete API with request validation. Write rate-limiting/examples/tiered-limits.ts demonstrating different rate limits for free versus paid users. Write validation/examples/file-upload-validation.ts showing file size and type validation. Ensure all examples are runnable and include inline comments explaining key decisions.

**Acceptance Criteria**:

The task is complete when validation README comprehensively covers the validation capability with clear examples. Rate limiting README explains algorithm selection and configuration. Troubleshooting guides address common issues with actionable solutions. Migration guides enable smooth adoption from old implementations. Example code demonstrates real-world patterns. Documentation review confirms accuracy and accessibility. Code examples compile and run successfully. Internal teams confirm documentation helps them use validation and rate limiting effectively.

---

### Phase 5 Gate Review Checklist

Before proceeding to Phase 6, verify the following conditions:

ValidationService integrates Zod with Result types for type-safe validation. Common validation schemas cover frequently validated data types. Sanitization system protects against injection attacks. Validation middleware provides declarative request validation. RateLimiter interface supports multiple algorithms. Token bucket algorithm allows controlled bursts. Rate limiter stores work with both memory and Redis. Rate limiting middleware integrates with Express. AI-specific rate limiter tracks costs and tokens. All validation and rate limiting tests pass with maintained or improved coverage. Documentation comprehensively covers both capabilities. Zero circular dependencies in validation and rate-limiting. Integration tests validate cross-capability interactions. Gradual rollout shows no issues for one week.

---

## Phase 6: Cross-Cutting Concerns (Weeks 11-12)

### Phase Objectives

The cross-cutting concerns phase implements the layer that composes core capabilities into cohesive solutions for applications. This includes the middleware factory that creates standardized request processing pipelines, configuration management that instantiates capabilities with appropriate settings, and utility functions that provide genuinely generic helpers. This layer enables applications to integrate all capabilities without managing complex orchestration logic.

### Phase Success Criteria

Cross-cutting phase succeeds when middleware factory composes all capabilities into request pipelines. Configuration manager validates settings at startup. Utility functions contain only truly generic logic with no business rules. Integration tests verify capabilities working together. Documentation explains composition patterns. Zero circular dependencies in cross-cutting concerns. Applications can adopt capabilities through simple configuration.

---

### TASK-6.1: Create Cross-Cutting Directory Structure

**Task Description**: Establish directory structure for cross-cutting concerns with subdirectories for middleware composition, configuration management, and utility functions.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 through Phase 5 provide capabilities to compose

**Priority**: Critical Path

**Estimated Duration**: 1 day

**Deliverables**:

Complete directory structure at `cross-cutting/` with subdirectories middleware/, config/, and utils/ each containing README files. TypeScript configuration depending on primitives and capabilities but not on development support. ESLint configuration enforcing layer boundaries. Main README explaining cross-cutting concerns philosophy and composition patterns.

**Subtasks**:

Create directory structure with `mkdir -p shared/core/cross-cutting/{middleware,config,utils}`. Create README files explaining each subdirectory purpose. The middleware/ README describes request pipeline composition patterns. The config/ README explains configuration validation and capability instantiation. The utils/ README defines criteria for truly generic utility functions. Configure TypeScript allowing imports from primitives and capabilities. Configure ESLint preventing imports from development support. Write main README explaining that cross-cutting concerns solve integration problems by composing capabilities.

**Acceptance Criteria**:

Directory structure exists with all subdirectories and READMEs. TypeScript compiles with proper dependency restrictions. ESLint enforces layer boundaries. README explains composition philosophy. Team can navigate structure intuitively.

---

### TASK-6.2: Implement Middleware Factory

**Task Description**: Create factory that composes error management, rate limiting, validation, caching, and observability into standardized request processing pipelines.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: Phases 2-5 provide all capabilities to compose

**Priority**: Critical Path

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is MiddlewareFactory in `cross-cutting/middleware/middleware-factory.ts` providing methods for creating complete request pipelines from capability instances.

The second deliverable is preset configurations in `cross-cutting/middleware/presets/` for common scenarios like REST APIs, GraphQL endpoints, and webhook handlers.

The third deliverable is pipeline builder enabling fluent API for customizing middleware composition order and configuration.

The fourth deliverable is comprehensive tests validating pipeline composition and interaction between middleware components.

**Subtasks**:

First, implement MiddlewareFactory class accepting instances of all capability middleware including error middleware, rate limit middleware, validation middleware, cache middleware, and observability middleware through constructor. Store these instances for composition. Implement methods for creating common pipeline patterns like createRESTMiddleware, createGraphQLMiddleware, createWebhookMiddleware. Each method returns an array of Express middleware in the correct execution order.

Second, define the standard request processing order based on cross-cutting concerns analysis. The order is observability first to generate correlation IDs, rate limiting second to reject requests early, authentication third to establish identity, validation fourth to check inputs, caching fifth for GET requests, business logic execution, error handling last to catch everything. Document why this order matters explaining that earlier middleware protects later middleware from invalid requests.

Third, implement createRESTMiddleware method composing middleware for REST APIs. Include observability middleware for context creation, rate limiting with per-user key generation, validation middleware for request bodies and query parameters, cache middleware for GET requests, and error middleware for consistent error responses. Accept configuration object specifying rate limits, validation schemas, and cache TTL per endpoint. Return middleware array ready for app.use or router-level application.

Fourth, create preset configurations for common scenarios. The restAPIPreset includes sensible defaults for public REST APIs with conservative rate limits and comprehensive validation. The internalAPIPreset relaxes rate limits for internal services. The webhookPreset includes replay attack prevention and signature verification. The graphQLPreset handles GraphQL-specific concerns like query complexity and batch operations. Document each preset explaining when to use it and how to customize.

Fifth, implement PipelineBuilder for fluent middleware composition. The builder accepts capability instances and provides methods like withRateLimiting, withValidation, withCaching, withCustomMiddleware for adding middleware. Methods chain enabling readable pipeline construction. The build method returns the composed middleware array. This builder enables applications needing non-standard pipelines to compose middleware precisely for their requirements.

Sixth, integrate capabilities ensuring they interact correctly. Observability context created early flows through all subsequent middleware. Rate limiting uses observability context for logging. Validation errors are caught by error middleware. Cache operations are traced for observability. This integration makes telemetry comprehensive and consistent across all capabilities.

Seventh, write comprehensive tests validating middleware composition. Test that standard pipeline orders middleware correctly. Test that observability context propagates through entire pipeline. Test that rate limiting rejects requests before validation executes. Test that caching bypasses business logic for GET requests. Test that error middleware catches errors from any pipeline stage. Test preset configurations produce correct middleware arrays. Test pipeline builder enables custom compositions. Test integration scenarios like rate-limited cached requests with validation.

**Acceptance Criteria**:

The task is complete when MiddlewareFactory composes all capabilities into request pipelines. Standard pipeline orders middleware appropriately. Preset configurations cover common scenarios. Pipeline builder enables custom compositions. Observability context propagates correctly. Tests validate composition and integration. Documentation explains pipeline ordering rationale. Applications can adopt complete middleware stacks through simple factory calls.

---

### TASK-6.3: Implement Configuration Manager

**Task Description**: Create configuration management system that validates environment settings and instantiates capabilities with appropriate configuration.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: TASK-6.2 provides middleware factory needing configured capabilities

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is ConfigurationManager in `cross-cutting/config/config-manager.ts` providing environment variable parsing, validation, and capability instantiation.

The second deliverable is configuration schema definitions using Zod for type-safe configuration validation.

The third deliverable is configuration builders for each capability enabling programmatic configuration.

The fourth deliverable is comprehensive tests validating configuration parsing, validation, and error handling.

**Subtasks**:

First, implement ConfigurationManager class providing centralized configuration management. The class loads environment variables, validates them against schemas, and constructs capability instances with validated configuration. Implement load method that reads from process.env and validates against combined schema. Implement get methods for retrieving specific capability configurations. Implement validate method checking configuration completeness and correctness. The manager fails fast at application startup if configuration is invalid rather than discovering issues at runtime.

Second, define configuration schemas for each capability using Zod. Create ErrorManagementConfig schema specifying log level, whether to include stack traces, alert thresholds. Create CachingConfig schema specifying cache type, Redis connection string, memory limits, TTL defaults. Create ObservabilityConfig schema with log output destinations, metrics exporters, trace sampling rates. Create ValidationConfig and RateLimitingConfig schemas similarly. Compose all schemas into AppConfig schema representing complete application configuration.

Third, implement configuration builders enabling programmatic configuration beyond environment variables. ConfigBuilder provides fluent interface with methods like withErrorManagement, withCaching, withObservability accepting configuration objects. This enables testing with mock configurations and supports configuration from sources beyond environment variables like configuration files or remote configuration services.

Fourth, implement environment variable parsing with type coercion. String values for boolean configs are parsed correctly handling variations like true/false, yes/no, 1/0. Numeric values for limits and timeouts are parsed and validated. Connection strings are parsed into structured configuration. Document expected environment variable names with clear examples.

Fifth, create capability instantiation logic. Once configuration is validated, instantiate each capability with its configuration. For example, instantiate StructuredLogger with logging configuration, create cache adapter based on cache type configuration, construct rate limiter with algorithm and store from configuration. Return fully configured capability instances ready for use by middleware factory.

Sixth, implement configuration validation with helpful error messages. When validation fails, provide clear messages indicating which configuration values are missing or invalid. Suggest correct values or formats. For example, if cache type is invalid, list valid options. If required Redis connection string is missing when Redis cache is selected, explain the requirement. These clear messages reduce configuration debugging time.

Seventh, write comprehensive tests for configuration management. Test that valid configuration loads successfully and instantiates capabilities. Test that invalid configuration fails validation with clear error messages. Test that missing required configuration is detected. Test that default values are applied where appropriate. Test configuration builders produce valid configurations. Test environment variable parsing handles various formats correctly. Test that capability instances created from configuration work correctly in integration scenarios.

**Acceptance Criteria**:

The task is complete when ConfigurationManager validates and loads configuration successfully. Zod schemas ensure type-safe configuration. Configuration builders enable programmatic setup. Capability instantiation produces properly configured instances. Validation errors provide clear, actionable messages. Tests cover valid and invalid configuration scenarios. Documentation explains all configuration options with examples. Applications can configure entire shared/core through environment variables and builders.

---

### TASK-6.4: Implement Utility Functions

**Task Description**: Organize genuinely generic utility functions eliminating scattered utility code while ensuring true utility nature without business logic.

**Fulfills Requirements**: REQ-3.1 (Single Canonical Location)

**Dependencies**: Phase 1 provides primitives, capabilities provide context for utility needs

**Priority**: Medium

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is organized utility modules in `cross-cutting/utils/` categorized by function type including string utilities, array utilities, object utilities, and async utilities.

The second deliverable is utility function documentation explaining purpose and providing usage examples for each function.

The third deliverable is comprehensive tests ensuring utilities are correct, performant, and side-effect-free.

**Subtasks**:

First, audit existing scattered utility functions across the codebase. Identify functions that are truly generic versus those containing business logic. Generic utilities are pure functions operating on common data types without domain knowledge. Business logic belongs in capabilities or application code. Create inventory of utilities to consolidate and utilities to relocate or delete.

Second, organize utilities into logical modules based on data types they operate on. Create utils/string-utils.ts with functions like truncate for safely truncating strings with ellipsis, slugify for creating URL-safe slugs, capitalizeWords for title-casing. Create utils/array-utils.ts with functions like chunk for splitting arrays into chunks, unique for deduplication, partition for splitting by predicate. Create utils/object-utils.ts with functions like deepMerge for recursive merging, pick for extracting properties, omit for excluding properties. Create utils/async-utils.ts with functions like delay for promise-based delays, retry for retrying async operations, parallel for controlling concurrency.

Third, ensure all utility functions are pure functions with no side effects. Functions accept inputs through parameters, return results without mutations, and don't access external state. This purity makes utilities predictable and testable. Document that utilities must remain pure and should be rejected in code review if they violate purity. Pure utilities can be safely used anywhere without worrying about unexpected behavior.

Fourth, implement comprehensive JSDoc comments for each utility explaining purpose, parameters, return value, and providing usage examples. For example, the truncate function documentation explains it safely truncates strings without breaking in the middle of words, shows parameter types, and provides examples of various truncation scenarios. Good documentation makes utilities discoverable through IDE autocomplete.

Fifth, write extensive unit tests for every utility function. Test typical usage, edge cases like empty inputs, boundary conditions like very large arrays, and error scenarios like invalid arguments. For performance-critical utilities like deepMerge or array operations, include performance benchmarks ensuring acceptable performance characteristics. Tests serve as usage examples and ensure utilities remain correct through refactoring.

Sixth, document the philosophy of what belongs in utils versus capabilities. Utils contain only truly generic, reusable functions with no business logic or domain knowledge. If a function knows about users, bills, authentication, or any domain concept, it doesn't belong in utils. This clear boundary prevents utils from becoming a dumping ground for miscellaneous code. Document this in utils/README.md with examples of functions that belong versus functions that should live elsewhere.

**Acceptance Criteria**:

The task is complete when utility functions are organized into logical modules. All utilities are pure functions with no side effects. Comprehensive JSDoc documentation explains each function. Tests cover normal usage and edge cases. Documentation clearly defines what belongs in utils. Code review process enforces utility purity. Scattered utility code is consolidated or relocated appropriately. Applications can import utilities confidently knowing they're well-tested and side-effect-free.

---

### TASK-6.5: Create Integration Tests

**Task Description**: Write comprehensive integration tests validating that capabilities work together correctly when composed through cross-cutting concerns.

**Fulfills Requirements**: REQ-5.1 (Comprehensive Test Migration)

**Dependencies**: All cross-cutting implementation complete

**Priority**: High

**Estimated Duration**: 3 days

**Deliverables**:

The first deliverable is integration test suite in `cross-cutting/__tests__/integration/` validating middleware pipeline behavior with real capability instances.

The second deliverable is end-to-end request flow tests simulating complete HTTP request processing through middleware stack.

The third deliverable is failure scenario tests validating error handling, circuit breakers, and degradation patterns.

The fourth deliverable is performance tests ensuring composed middleware meets latency requirements.

**Subtasks**:

First, create integration test infrastructure setting up complete middleware stack with real capability instances. Initialize observability system with test transports. Configure caching with memory adapter. Set up validation with test schemas. Configure rate limiting with memory store. Wire all capabilities through middleware factory. This infrastructure mirrors production setup enabling realistic testing.

Second, write happy path tests validating successful request processing. Test that GET request with valid parameters returns cached response on second call. Test that POST request with valid body passes validation and executes successfully. Test that all requests generate observability context flowing through entire pipeline. Test that rate limiting allows requests within limits. These tests confirm basic functionality works correctly.

Third, create failure scenario tests validating error handling and resilience. Test that invalid request body triggers validation error caught by error middleware returning 400. Test that rate limit exceeded returns 429 with retry information. Test that database error triggers circuit breaker. Test that circuit breaker open returns service unavailable without attempting operation. Test that errors include correlation IDs linking logs and traces. These tests ensure graceful failure handling.

Fourth, write integration tests for capability interactions. Test that rate-limited requests still get cached. Test that validation errors are logged with observability context. Test that circuit breaker state affects cache behavior. Test that error responses include rate limit headers. These tests validate capabilities compose correctly without unexpected interactions.

Fifth, create performance tests measuring end-to-end latency through middleware stack. Measure request processing time for various scenarios: cache hit, cache miss, validation failure, rate limit denial. Ensure total middleware overhead is under five milliseconds for cache hits and under ten milliseconds for full validation. Profile to identify any performance bottlenecks in middleware composition.

Sixth, implement load tests validating behavior under concurrent requests. Send hundreds of concurrent requests exercising rate limiting, caching, and validation simultaneously. Verify rate limits are enforced correctly. Verify cache hit rates match expected levels. Verify no race conditions or deadlocks occur. Ensure memory usage remains bounded. These tests confirm production-readiness.

Seventh, create tests validating configuration flexibility. Test that different preset configurations produce different middleware behaviors. Test that pipeline builder enables custom compositions. Test that configuration changes don't break existing functionality. Ensure applications can customize middleware stack for their specific needs.

**Acceptance Criteria**:

The task is complete when integration tests validate complete middleware pipelines. Happy path tests confirm successful request processing. Failure scenario tests validate error handling and resilience. Capability interaction tests ensure correct composition. Performance tests confirm latency requirements are met. Load tests validate concurrent request handling. Configuration tests enable flexibility. All tests pass consistently. Test coverage includes all integration points between capabilities.

---

### TASK-6.6: Create Cross-Cutting Documentation

**Task Description**: Write comprehensive documentation explaining cross-cutting concerns philosophy, middleware composition patterns, and configuration management.

**Fulfills Requirements**: REQ-6.1 (Comprehensive Capability Documentation)

**Dependencies**: All cross-cutting implementation complete

**Priority**: Normal

**Estimated Duration**: 2 days

**Deliverables**:

The first deliverable is cross-cutting/README.md explaining the philosophy of composing capabilities and when to use each pattern.

The second deliverable is middleware composition guide with examples for common scenarios and customization patterns.

The third deliverable is configuration guide explaining all configuration options and providing complete examples.

The fourth deliverable is integration patterns catalog demonstrating how capabilities work together.

**Subtasks**:

First, write main README explaining cross-cutting concerns philosophy. Describe how this layer solves the integration problem by composing capabilities into solutions. Explain that applications should use cross-cutting concerns rather than directly instantiating capabilities. Provide overview of middleware factory, configuration manager, and utilities. Include quick start showing how to configure and use complete middleware stack.

Second, document middleware composition patterns comprehensively. Explain the standard pipeline ordering and why each position matters. Show how to use preset configurations for common scenarios. Demonstrate pipeline builder for custom compositions. Provide examples of middleware customization like endpoint-specific rate limits or conditional validation. Explain how observability context flows through pipelines enabling correlation.

Third, create configuration guide covering all aspects of configuration management. Document every configuration option for each capability with type information, default values, and examples. Explain environment variable naming conventions. Show configuration builders for programmatic setup. Provide complete configuration examples for different deployment scenarios like development, staging, and production. Include troubleshooting section for common configuration errors.

Fourth, write integration patterns catalog showing how capabilities work together. Demonstrate error handling with observability logging errors with correlation. Show caching integrated with rate limiting. Demonstrate validation errors formatted by error middleware. Provide examples of circuit breakers protecting cached resources. Each pattern includes rationale, code example, and discussion of tradeoffs.

Fifth, document best practices for using cross-cutting concerns. Explain when to use preset configurations versus custom pipelines. Discuss configuration management strategies for different environments. Provide guidance on monitoring middleware effectiveness through observability. Recommend patterns for testing application middleware stacks. These best practices help teams use cross-cutting concerns effectively.

**Acceptance Criteria**:

The task is complete when README explains cross-cutting concerns philosophy clearly. Middleware composition guide enables creating custom pipelines. Configuration guide documents all options comprehensively. Integration patterns catalog demonstrates capability interactions. Best practices guide effective usage. Documentation review confirms clarity and completeness. Code examples compile and run. Teams can adopt cross-cutting concerns through documentation alone.

---

### Phase 6 Gate Review Checklist

Before proceeding to Phase 7, verify the following conditions:

Middleware factory composes all capabilities into pipelines. Preset configurations cover common scenarios. Pipeline builder enables customization. Configuration manager validates settings comprehensively. Capability instantiation works correctly. Utility functions are pure and well-tested. Integration tests validate cross-capability behavior. Performance tests confirm latency requirements. Documentation comprehensively covers composition patterns. Zero circular dependencies in cross-cutting concerns. Applications can adopt complete middleware stacks easily.

---

## Phase 7: Development Support and Documentation (Weeks 13-14)

### Phase Objectives

The development support phase completes the infrastructure enabling effective development, testing, and migration. This includes test utilities that make writing tests easier, migration scripts that automate the transition from old to new structure, and comprehensive documentation ensuring developers can discover and use consolidated capabilities effectively. This phase also establishes patterns and tooling that will maintain architectural quality long-term.

### Phase Success Criteria

Development support succeeds when test utilities enable easy test authoring. Mock builders provide fluent test setup. Migration scripts automate import updates. Codemods successfully transform old patterns to new. Documentation comprehensively covers all capabilities. Architecture decision records explain key choices. Migration guide enables smooth transition. Developer satisfaction surveys show improved experience.

---

### TASK-7.1: Implement Test Utilities

**Task Description**: Create comprehensive test utilities including mock builders, fixture factories, and custom matchers that simplify test authoring across all capabilities.

**Fulfills Requirements**: REQ-5.1 (Comprehensive Test Migration)

**Dependencies**: Phases 1-6 provide capabilities to test

**Priority**: High

**Estimated Duration**: 4 days

**Deliverables**:

The first deliverable is mock builder library in `testing/helpers/mock-builders.ts` providing fluent interfaces for constructing test doubles of all capability interfaces.

The second deliverable is fixture factories in `testing/fixtures/` generating realistic test data for errors, cache entries, logs, and metrics.

The third deliverable is custom matchers in `testing/matchers/` extending testing framework with domain-specific assertions.

The fourth deliverable is test helper documentation explaining how to use utilities effectively.

**Subtasks**:

First