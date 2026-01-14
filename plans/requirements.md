# Requirements: Shared Directory Reorganization

## R0: Quality-Based Module Cleanup

**User Story**: As a developer, I want abandoned and low-quality modules removed from `shared/core/` so that only production-grade, maintainable code remains.

**Acceptance Criteria**:
- **R0.1**: WHEN rate-limiting module exists in shared/core THEN the system SHALL delete it WHERE mock implementations (38/70 quality) are replaced by working server implementation (60+/70)
- **R0.2**: WHEN repositories module exists in shared/core THEN the system SHALL delete it WHERE empty stubs with 0 imports provide no value
- **R0.3**: WHEN services module exists in shared/core THEN the system SHALL delete it WHERE unused interface stubs (5/10 quality) are not production code
- **R0.4**: WHEN modernization module exists in shared/core THEN the system SHALL delete it WHERE dev-only tooling belongs in tools/ not production shared/
- **R0.5**: WHEN deletions are verified THEN the system SHALL confirm 0 imports WHERE grep search returns no references in server/ or client/
- **R0.6**: WHEN cleanup completes THEN the system SHALL document removed modules WHERE future developers understand the quality-based rationale

## R1: Type System Centralization

**User Story**: As a developer, I want all TypeScript types centralized in `shared/types/` so that client and server use identical type definitions.

**Acceptance Criteria**:
- **R1.1**: WHEN types are imported in server THEN the system SHALL resolve from `@shared/types` WHERE all domain types (Bill, User, Argument, API types) are exported
- **R1.2**: WHEN types are imported in client THEN the system SHALL resolve from `@shared/types` WHERE client-side type duplicates are eliminated
- **R1.3**: WHEN a type is modified THEN the system SHALL reflect changes in both client and server WHERE single source of truth is maintained
- **R1.4**: WHEN types are organized THEN the system SHALL group by domain WHERE bill.types.ts, user.types.ts, argument.types.ts, api.types.ts exist as separate modules
- **R1.5**: WHEN client/src/types/ exists THEN the system SHALL delete these files WHERE no duplicate type definitions remain
- **R1.6**: WHEN types are compiled THEN the system SHALL pass TypeScript validation WHERE no type errors occur in client or server

## R2: Validation Rules Unification

**User Story**: As a developer, I want validation rules centralized in `shared/validation/` so that client and server validate data identically.

**Acceptance Criteria**:
- **R2.1**: WHEN validation is applied THEN the system SHALL use `@shared/validation` WHERE comment, bill, and user validation rules are defined once
- **R2.2**: WHEN client validates input THEN the system SHALL apply identical rules to server WHERE no validation divergence exists
- **R2.3**: WHEN validation rules change THEN the system SHALL update in one location WHERE shared/validation/ modules are modified
- **R2.4**: WHEN validation fails THEN the system SHALL return consistent error messages WHERE error format matches between client and server
- **R2.5**: WHEN validation functions are exported THEN the system SHALL provide typed validation functions WHERE return types include { valid: boolean; errors: string[] }
- **R2.6**: WHEN validation constants exist THEN the system SHALL export rule constants WHERE MIN_LENGTH, MAX_LENGTH, and pattern constants are accessible

## R3: Constants Consolidation

**User Story**: As a developer, I want constants centralized in `shared/constants/` so that error codes, limits, and feature flags are defined once.

**Acceptance Criteria**:
- **R3.1**: WHEN error codes are referenced THEN the system SHALL import from `@shared/constants/error-codes` WHERE all API error codes are defined
- **R3.2**: WHEN limits are checked THEN the system SHALL import from `@shared/constants/limits` WHERE max lengths, timeouts, and thresholds are defined
- **R3.3**: WHEN feature flags are evaluated THEN the system SHALL import from `@shared/constants/feature-flags` WHERE feature toggles are centralized
- **R3.4**: WHEN constants are used THEN the system SHALL provide TypeScript const assertions WHERE values are type-safe and immutable
- **R3.5**: WHEN constants change THEN the system SHALL update in one location WHERE no duplicate constant definitions exist
- **R3.6**: WHEN constants are exported THEN the system SHALL provide index.ts re-exports WHERE all constants modules are accessible from @shared/constants

## R3A: Error-Management System Adoption

**User Story**: As a developer, I want the server to adopt `@shared/core/observability/error-management` so that comprehensive error handling, recovery, and reporting replace basic middleware.

**Acceptance Criteria**:
- **R3A.1**: WHEN errors occur in server THEN the system SHALL use BaseError from @shared/core/observability/error-management WHERE ErrorDomain, ErrorSeverity, and cause chains are tracked
- **R3A.2**: WHEN validation fails THEN the system SHALL throw ValidationError from @shared WHERE error context includes field-level details
- **R3A.3**: WHEN errors are handled THEN the system SHALL use ErrorHandler interface WHERE recovery patterns (circuit-breaker, retry) are available
- **R3A.4**: WHEN errors are reported THEN the system SHALL use ErrorReporter interface WHERE Sentry, API, and Console reporters are configured
- **R3A.5**: WHEN boom-error-middleware is removed THEN the system SHALL migrate to @shared error middleware WHERE 46/70 quality replaces 36/70 basic formatting
- **R3A.6**: WHEN error-management is integrated THEN the system SHALL provide error analytics WHERE metrics, aggregation, and trending are available

## R4: Infrastructure Relocation

**User Story**: As a developer, I want server-only infrastructure moved from `shared/` to `server/infrastructure/` so that database and schema concerns are properly scoped.

**Acceptance Criteria**:
- **R4.1**: WHEN database files exist in shared/ THEN the system SHALL move to `server/infrastructure/database/` WHERE connection-manager.ts, pool.ts, and health-monitor.ts are relocated
- **R4.2**: WHEN schema files exist in shared/ THEN the system SHALL move to `server/infrastructure/schema/` WHERE all Drizzle ORM table definitions are relocated
- **R4.3**: WHEN imports reference old paths THEN the system SHALL update to new paths WHERE all server imports point to @server/infrastructure
- **R4.4**: WHEN database queries execute THEN the system SHALL function identically WHERE no behavioral changes occur
- **R4.5**: WHEN schema is accessed THEN the system SHALL resolve from server/infrastructure/schema/ WHERE client has no access to schema files
- **R4.6**: WHEN infrastructure is organized THEN the system SHALL separate server-only from shared concerns WHERE architectural clarity is improved

## R5: Import Path Configuration

**User Story**: As a developer, I want TypeScript path mappings configured so that `@shared/*` imports resolve correctly in both client and server.

**Acceptance Criteria**:
- **R5.1**: WHEN shared/tsconfig.json is configured THEN the system SHALL export types and modules WHERE ES2020 module system is used
- **R5.2**: WHEN root tsconfig.json is configured THEN the system SHALL map `@shared/*` to `shared/src/*` WHERE path resolution works for both workspaces
- **R5.3**: WHEN server imports from @shared THEN the system SHALL resolve without errors WHERE all shared modules are accessible
- **R5.4**: WHEN client imports from @shared THEN the system SHALL resolve without errors WHERE all shared modules are accessible
- **R5.5**: WHEN shared/package.json is configured THEN the system SHALL export entry points WHERE types, validation, constants, i18n, and utils are exported
- **R5.6**: WHEN builds execute THEN the system SHALL compile without path resolution errors WHERE all @shared imports resolve correctly

## R6: Client Selective Integration

**User Story**: As a developer, I want to share only Node-dependency-free modules with the client so that browser-incompatible code remains separate and specialized client utilities are preserved.

**Acceptance Criteria**:
- **R6.1**: WHEN client/src/shared/utils/logger.ts exists THEN the system SHALL preserve it WHERE React component lifecycle tracking is specialized for browser
- **R6.2**: WHEN client/src/shared/utils/security.ts exists THEN the system SHALL preserve it WHERE browser-safe DOM sanitization is superior to Node crypto implementation
- **R6.3**: WHEN client/src/shared/utils/i18n.ts exists THEN the system SHALL preserve it WHERE Kenya-specific translations and phone validation are domain-specific
- **R6.4**: WHEN client imports shared types THEN the system SHALL use `@shared/types` WHERE type definitions have no Node dependencies
- **R6.5**: WHEN client imports shared constants THEN the system SHALL use `@shared/constants` WHERE primitive values are environment-agnostic
- **R6.6**: WHEN client builds THEN the system SHALL compile successfully WHERE only browser-compatible modules from @shared are imported

## R6A: Server-Only Module Enforcement

**User Story**: As a developer, I want server-only modules clearly separated so that Node/Express-dependent code cannot accidentally be imported by the client.

**Acceptance Criteria**:
- **R6A.1**: WHEN api-utils.ts exists THEN the system SHALL keep in server/ WHERE express.Response dependency prevents client import
- **R6A.2**: WHEN security-utils.ts uses Node crypto THEN the system SHALL keep in server/ WHERE Node crypto module is incompatible with browser
- **R6A.3**: WHEN http-utils.ts exists THEN the system SHALL keep in server/ WHERE Node http module dependency prevents client import
- **R6A.4**: WHEN correlation-id.ts exists THEN the system SHALL keep in server/ WHERE Express Request/Response types prevent client import
- **R6A.5**: WHEN shared utilities are evaluated THEN the system SHALL verify no Node imports WHERE client compatibility is required
- **R6A.6**: WHEN client attempts server-only import THEN the system SHALL fail at build time WHERE TypeScript or bundler prevents runtime errors

## R7: Documentation and Structure

**User Story**: As a developer, I want clear documentation of the new shared structure so that the purpose and usage of each module is understood.

**Acceptance Criteria**:
- **R7.1**: WHEN shared/ directory exists THEN the system SHALL include README.md WHERE structure, purpose, and usage are documented
- **R7.2**: WHEN modules are organized THEN the system SHALL follow structure WHERE types/, validation/, constants/, i18n/, and utils/ subdirectories exist
- **R7.3**: WHEN modules are created THEN the system SHALL include index.ts re-exports WHERE all module contents are accessible via barrel exports
- **R7.4**: WHEN documentation is provided THEN the system SHALL explain import patterns WHERE examples show @shared/types, @shared/validation usage
- **R7.5**: WHEN structure is defined THEN the system SHALL document server-only vs shared concerns WHERE infrastructure relocation is explained
- **R7.6**: WHEN README exists THEN the system SHALL provide migration guidance WHERE developers understand how to add new shared modules
