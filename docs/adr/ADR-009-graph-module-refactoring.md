# ADR-009: Graph Module Refactoring

**Date:** February 20, 2026  
**Status:** ✓ COMPLETE - Task 2.2 Complete  
**Decision:** Adopt structured subdirectory layout for graph module

## Context

The Neo4j graph database module (`server/infrastructure/database/graph/`) had grown to contain 40+ files at the root level, making it difficult to navigate and understand the module's organization. Files were a mix of:
- Core infrastructure (client, session manager, transaction executor)
- Query builders and utilities
- Analytics and pattern discovery
- Synchronization logic
- Network analysis
- Configuration

This flat structure made it challenging to:
- Understand the module's architecture at a glance
- Find related functionality
- Maintain clear boundaries between concerns
- Onboard new developers

## Decision

Adopt a structured subdirectory layout organizing files by functional area:

```
server/infrastructure/database/graph/
├── core/              # Core infrastructure
│   ├── neo4j-client.ts
│   ├── session-manager.ts
│   ├── transaction-executor.ts
│   ├── batch-sync-runner.ts
│   ├── sync-executor.ts
│   ├── idempotency-ledger.ts
│   └── app-init.ts
├── query/             # Query building and execution
│   ├── query-builder.ts
│   ├── advanced-queries.ts
│   ├── engagement-queries.ts
│   └── network-queries.ts
├── utils/             # Utilities and helpers
│   ├── result-normalizer.ts
│   ├── retry-utils.ts
│   ├── operation-guard.ts
│   ├── cache-adapter-v2.ts
│   ├── error-adapter-v2.ts
│   └── health-adapter-v2.ts
├── analytics/         # Analytics and pattern discovery
│   ├── advanced-analytics.ts
│   ├── pattern-discovery.ts
│   ├── pattern-discovery-service.ts
│   ├── network-discovery.ts
│   ├── influence-service.ts
│   └── recommendation-engine.ts
├── sync/              # Synchronization logic
│   ├── advanced-relationships.ts
│   ├── advanced-sync.ts
│   ├── array-field-sync.ts
│   ├── conflict-resolver.ts
│   ├── engagement-networks.ts
│   ├── engagement-sync.ts
│   ├── institutional-networks.ts
│   ├── network-sync.ts
│   ├── parliamentary-networks.ts
│   ├── relationships.ts
│   ├── safeguards-networks.ts
│   └── sync-monitoring.ts
├── config/            # Configuration
│   └── graph-config.ts
├── index.ts           # Barrel exports
└── REFACTORING_SUMMARY.md
```

## Rationale

### Alternatives Considered

1. **Keep Flat Structure**
   - Pros: No migration needed, simple imports
   - Cons: Difficult to navigate, unclear organization, doesn't scale
   - Rejected: Already causing maintenance issues

2. **Feature-Based Organization**
   - Organize by feature (bills, users, sponsors) rather than technical concern
   - Pros: Aligns with domain model
   - Cons: Cross-cutting concerns (query building, sync) don't fit cleanly
   - Rejected: Graph operations are infrastructure, not features

3. **Layered Architecture**
   - Organize by layer (data access, business logic, presentation)
   - Pros: Clear separation of concerns
   - Cons: Graph module is all data access layer
   - Rejected: Not applicable to this module

4. **Structured Subdirectories (Chosen)**
   - Organize by functional area within the graph module
   - Pros: Clear organization, easy to find related code, scales well
   - Cons: Requires import path updates
   - **Chosen**: Best balance of clarity and maintainability

### Why Structured Subdirectories?

1. **Clarity**: Immediately understand what each directory contains
2. **Scalability**: Easy to add new files to appropriate directories
3. **Maintainability**: Related code is co-located
4. **Discoverability**: New developers can navigate the module easily
5. **Boundaries**: Clear separation between core, query, sync, analytics

## Implementation

### Migration Process

1. **Created subdirectories**: core/, query/, utils/, analytics/, sync/, config/
2. **Moved files** to appropriate subdirectories based on functionality
3. **Updated imports** across the codebase to use new paths
4. **Verified duplicates**: Checked for and removed any duplicate files
5. **Updated barrel exports**: Modified index.ts to export from subdirectories
6. **Ran tests**: Verified Neo4j integration tests pass

### Import Pattern

```typescript
// Before
import { Neo4jClient } from '@server/infrastructure/database/graph/neo4j-client';

// After
import { Neo4jClient } from '@server/infrastructure/database/graph/core/neo4j-client';
```

### Barrel Export Pattern

```typescript
// graph/index.ts
export * from './core';
export * from './query';
export * from './utils';
export * from './analytics';
export * from './sync';
export * from './config';
```

## Consequences

### Positive

- **Improved Navigation**: Developers can quickly find graph-related code
- **Clear Organization**: Functional areas are immediately apparent
- **Better Maintainability**: Related code is co-located
- **Scalability**: Easy to add new files without cluttering root
- **Onboarding**: New developers understand module structure faster

### Negative

- **Import Path Changes**: Required updating imports across codebase
- **Migration Effort**: One-time cost to reorganize files
- **Deeper Nesting**: Imports are slightly longer

### Neutral

- **No Functional Changes**: Pure refactoring, no behavior changes
- **Test Coverage**: All existing tests continue to pass

## Metrics

- **Files Organized**: 40+ files moved to subdirectories
- **Subdirectories Created**: 6 (core, query, utils, analytics, sync, config)
- **Import Updates**: ~50 import statements updated
- **Duplicates Removed**: 0 (no duplicates found)
- **Tests Passing**: 100% (all Neo4j integration tests pass)

## Related Decisions

- ADR-004: Feature Structure Convention (similar organizational principles)
- ADR-008: Incomplete Migrations (this completes the graph module refactor)

## References

- Task 2.2: Graph Module Refactor Completion
- `.kiro/specs/codebase-consolidation/tasks.md`
- `server/infrastructure/database/graph/REFACTORING_SUMMARY.md`

## Notes

This refactoring follows the same organizational principles used successfully in other parts of the codebase:
- `server/infrastructure/observability/` (core/, monitoring/, security/, database/, http/)
- `client/src/core/security/` (unified/, migration/)
- `shared/validation/` (schemas/, validators/)

The structured approach has proven effective for managing complexity and improving maintainability.
