# Requirements Document: Codebase Consolidation

## Introduction

This specification addresses the completion of five incomplete migrations and structural cleanup identified through comprehensive codebase investigation. The current state shows parallel implementations, abandoned migration paths, and architectural inconsistencies that create maintenance burden and developer confusion.

The consolidation encompasses:
- **CSP Manager Migration**: Complete transition from legacy to unified security implementation
- **Dead API Clients**: Remove unused client implementations (SafeApiClient, AuthenticatedApiClient, CircuitBreakerClient)
- **Graph Module Refactor**: Complete reorganization from flat to structured layout
- **Government Data Integration**: Consolidate three implementations to single canonical service
- **Validation Single Source**: Establish `shared/validation/` as the single source of truth

## Glossary

- **Dead_Code**: Code that has zero production usages and no planned integration path
- **Unintegrated_Code**: Complete implementations waiting for integration that never occurred
- **Migration_Debt**: Incomplete migrations where new and old implementations coexist
- **CSP_Manager**: Content Security Policy management system with legacy and unified implementations
- **Unified_Implementation**: The production-ready UnifiedCSPManager with enhanced features
- **Legacy_Implementation**: The original CSPManager with hardcoded directives
- **API_Client**: HTTP client implementations for making API requests
- **BaseApiClient**: Modular, extensible API client foundation (unused)
- **UnifiedApiClientImpl**: Monolithic API client implementation (canonical, 100+ usages)
- **Graph_Module**: Neo4j graph database integration layer
- **Flat_Layout**: Original file organization with all files at root level
- **Structured_Layout**: Organized subdirectories (core/, query/, utils/)
- **Government_Data_Service**: External government API integration implementations
- **Validation_Schema**: Zod-based runtime validation rules
- **Single_Source_Of_Truth**: Principle where each concept is defined exactly once
- **Shared_Validation**: Centralized validation schemas in `shared/validation/`

## Requirements

### Requirement 1: CSP Manager Migration Completion

**User Story:** As a developer, I want a single CSP implementation across all environments, so that security configuration is consistent and maintainable.

#### Acceptance Criteria

1.1: THE System SHALL use UnifiedCSPManager in all environments (production, staging, development)

1.2: WHEN the application initializes, THE System SHALL NOT check feature flags or environment variables to choose CSP implementation

1.3: THE Legacy CSPManager SHALL be completely removed from the codebase

1.4: THE Migration compatibility layer SHALL be removed after legacy deletion

1.5: WHEN CSP violations occur, THE System SHALL log them using UnifiedCSPManager's metrics system

1.6: THE Barrel exports SHALL export UnifiedCSPManager as CSPManager for backward compatibility

### Requirement 2: Dead API Client Removal

**User Story:** As a developer, I want to remove unused API client implementations, so that the codebase has a clear, single API client pattern.

#### Acceptance Criteria

2.1: THE System SHALL remove SafeApiClient, AuthenticatedApiClient, and BaseApiClient implementations

2.2: THE System SHALL remove CircuitBreakerClient and all example files

2.3: THE System SHALL keep globalApiClient (UnifiedApiClientImpl) as the canonical implementation

2.4: THE System SHALL keep contractApiClient as the type-safe wrapper

2.5: WHEN developers need to make API calls, THE Documentation SHALL clearly indicate globalApiClient is the standard

2.6: THE Barrel exports SHALL remove all references to deleted clients

2.7: WHEN removing BaseApiClient, THE System SHALL extract any reusable utilities to shared location

### Requirement 3: Graph Module Refactor Completion

**User Story:** As a developer, I want the graph module organized into clear subdirectories, so that I can easily find and maintain graph-related code.

#### Acceptance Criteria

3.1: THE System SHALL remove all flat-layout files that have structured equivalents

3.2: WHEN a flat file differs from its structured equivalent, THE System SHALL merge differences before deletion

3.3: THE System SHALL update all imports to point to structured paths (core/, query/, utils/)

3.4: THE Remaining flat files SHALL be moved to appropriate subdirectories

3.5: THE Barrel export (graph/index.ts) SHALL only export from structured subdirectories

3.6: WHEN the refactor is complete, THE graph/ directory SHALL contain only subdirectories and index.ts

### Requirement 4: Government Data Integration Consolidation

**User Story:** As a developer, I want a single government data integration service, so that external API integration is consistent and maintainable.

#### Acceptance Criteria

4.1: THE System SHALL use `features/government-data/services/government-data-integration.service.ts` as canonical

4.2: THE System SHALL remove `infrastructure/external-data/government-data-integration.ts`

4.3: THE System SHALL remove `infrastructure/external-data/government-data-service.ts` (already commented out)

4.4: WHEN infrastructure implementations have unique capabilities, THE System SHALL port them to the canonical service first

4.5: THE System SHALL update all imports to point to the canonical service

4.6: WHEN the consolidation is complete, THE infrastructure/external-data/ directory SHALL be removed if empty

### Requirement 5: Validation Single Source Establishment

**User Story:** As a developer, I want validation schemas defined once in `shared/validation/`, so that validation rules are consistent across client and server.

#### Acceptance Criteria

5.1: THE shared/validation/schemas/common.ts SHALL define all cross-cutting validation primitives

5.2: THE Common primitives SHALL include: emailSchema, uuidSchema, phoneSchema, urlSchema, userRoleSchema, paginationSchema, searchQuerySchema

5.3: THE Server validation SHALL import primitives from shared/validation/

5.4: THE Client validation SHALL import primitives from shared/validation/

5.5: THE System SHALL remove duplicate validation implementations

5.6: THE server/utils/validation.ts SHALL be merged into server/infrastructure/core/validation/

5.7: WHEN validation rules change, THE System SHALL update only the shared schema

5.8: THE Shared layer SHALL NOT import from server/ or client/ (prevent circular dependencies)

### Requirement 6: Repository Root Cleanup

**User Story:** As a developer, I want a clean repository root, so that I can easily find important documentation and configuration.

#### Acceptance Criteria

6.1: THE Repository root SHALL contain only: README.md, ARCHITECTURE.md, CONTRIBUTING.md, CHANGELOG.md, and configuration files

6.2: THE System SHALL delete all session logs (SESSION_*.md, PROGRESS_*.md, COMPLETION_*.md)

6.3: THE System SHALL delete all build artifacts (tsc-errors.txt, tsc_output.txt, type-check-output.txt)

6.4: THE System SHALL delete all note files (QUICK_START_FOR_NEXT_SESSION.ts, COMPLETION_STRATEGY.ts)

6.5: THE Intentional design decisions SHALL be moved to docs/ as ADRs

6.6: THE .gitignore SHALL prevent future session artifacts from being committed

### Requirement 7: Scripts Directory Audit

**User Story:** As a developer, I want the scripts/ directory to contain only active tooling, so that I can distinguish between permanent tools and completed migrations.

#### Acceptance Criteria

7.1: THE System SHALL classify each script as: Permanent Tooling, Completed Migration, or Emergency Patch

7.2: THE Permanent tooling SHALL be kept and documented

7.3: THE Completed migration scripts SHALL be deleted (preserved in git history)

7.4: THE Emergency patches SHALL be deleted immediately

7.5: WHEN a script is referenced in package.json, nx.json, or CI, THE System SHALL keep it

7.6: THE Complex permanent scripts SHALL be moved to tools/ directory

### Requirement 8: Git Hygiene Improvements

**User Story:** As a developer, I want committed artifacts removed from git, so that the repository only contains source code and intentional documentation.

#### Acceptance Criteria

8.1: THE System SHALL remove all backup directories from git history

8.2: THE System SHALL remove all .orig and .rej files from git

8.3: THE .gitignore SHALL prevent future backup directories from being committed

8.4: THE .gitignore SHALL prevent future merge artifacts from being committed

8.5: WHEN artifacts are removed, THE System SHALL preserve them in git history for recovery if needed

### Requirement 9: Feature Architecture Convention

**User Story:** As a developer, I want clear guidelines for when to use DDD structure vs flat structure, so that feature organization is consistent.

#### Acceptance Criteria

9.1: THE Documentation SHALL define when to use Full DDD structure

9.2: THE Documentation SHALL define when to use Flat structure

9.3: THE Full DDD SHALL be used when: feature has database entities, domain logic, multiple use cases, or >8 files

9.4: THE Flat structure SHALL be used when: feature is thin routing layer, <8 files, or read-only

9.5: THE features/ directory SHALL contain a README.md documenting the convention

9.6: WHEN possible, THE System SHALL enforce the convention with ESLint rules

### Requirement 10: Constitutional Intelligence Boundary Resolution

**User Story:** As a developer, I want clear separation between constitutional-analysis and constitutional-intelligence, so that the DDD boundary is unambiguous.

#### Acceptance Criteria

10.1: THE System SHALL either merge constitutional-intelligence into constitutional-analysis/domain/ OR clarify the DDD split

10.2: WHEN merging, THE System SHALL move domain entities to constitutional-analysis/domain/

10.3: WHEN clarifying, THE System SHALL complete the empty service file or document why it's empty

10.4: THE constitutional/ directory SHALL contain a README.md explaining the architecture

10.5: WHEN the boundary is resolved, THE System SHALL have no ambiguous or incomplete DDD implementations

## Success Criteria

### Migration Completion
- All five migrations reach 100% completion status
- Zero parallel implementations remain
- All imports point to canonical implementations

### Code Quality
- Zero dead code (0 usages, no integration plan)
- Zero unintegrated code (complete but unused)
- Clear architectural patterns documented

### Developer Experience
- Clear documentation for all architectural decisions
- Single way to accomplish each task
- Reduced cognitive load from fewer alternatives

### Maintainability
- Reduced file count through consolidation
- Clear directory structure
- Consistent patterns across features

## Non-Requirements

- Performance optimization (consolidation is structure-focused)
- New feature development (focus is cleanup)
- Database schema changes (validation alignment only)
- Breaking API changes (maintain backward compatibility where possible)

## Dependencies

- Full-stack integration spec (validation alignment)
- Infrastructure consolidation spec (overlapping concerns)
- Existing test suites (must pass after migrations)

## Risks

### High Risk
- Validation migration: Affects correctness, requires careful testing
- Graph module refactor: Many interdependencies, requires integration tests

### Medium Risk
- Government data consolidation: Requires porting unique capabilities
- Feature architecture convention: Requires team buy-in

### Low Risk
- CSP migration: Already running in production
- Dead API client removal: Zero usages confirmed
- Repository cleanup: No code changes

## Timeline

- Week 1-2: Low-risk migrations (API clients, CSP, cleanup)
- Week 3-4: Medium-risk migrations (graph, government data)
- Week 5-7: High-risk migration (validation consolidation)
- Week 8: Documentation, convention establishment, final verification
