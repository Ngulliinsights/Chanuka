# Constitutional Intelligence Feature

## Status: Incomplete DDD Structure

This feature directory contains an **incomplete Domain-Driven Design (DDD) structure** that was started but never completed.

## Current State

```
constitutional-intelligence/
├── domain/
│   └── entities/
│       └── constitutional-provision.ts
└── application/
    └── constitutional-analysis.service.ts (EMPTY FILE)
```

### What Exists

- **Domain Entity**: `constitutional-provision.ts` - Defines the ConstitutionalProvision entity
- **Empty Service**: `constitutional-analysis.service.ts` - File exists but has no implementation

### What's Missing

- No index.ts (no public API exports)
- No infrastructure layer
- No use cases or commands
- No repository implementations
- No complete service implementation

## Relationship to Constitutional Analysis

The `constitutional-analysis` feature is a **separate, complete feature** that handles constitutional analysis functionality:

```
constitutional-analysis/
├── application/
├── config/
├── demo/
├── infrastructure/
├── scripts/
├── services/
├── types/
├── utils/
├── constitutional-analysis-router.ts
├── index.ts
└── test-router.ts
```

## Architectural Decision

### Option A: Complete the DDD Split (Not Recommended)

Complete the constitutional-intelligence feature as a separate domain layer:
- Implement the empty service file
- Add infrastructure layer
- Create repository implementations
- Add use cases and commands
- Create index.ts with public API

**Pros**: Clean DDD separation
**Cons**: Significant work, unclear benefit, adds complexity

### Option B: Merge into Constitutional Analysis (Recommended)

Move the domain entity into constitutional-analysis and delete this directory:

```
constitutional-analysis/
├── domain/
│   └── entities/
│       └── constitutional-provision.ts (moved from constitutional-intelligence)
├── application/
├── infrastructure/
└── ... (existing structure)
```

**Pros**: 
- Simpler architecture
- Single feature for constitutional functionality
- Eliminates incomplete structure
- Clearer ownership

**Cons**: None identified

### Option C: Keep as Domain-Only Module (Alternative)

Keep constitutional-intelligence as a pure domain module with no application layer:

```
constitutional-intelligence/
├── domain/
│   └── entities/
│       └── constitutional-provision.ts
└── index.ts (exports domain entities only)
```

Used by constitutional-analysis for domain entities.

**Pros**: Shared domain model
**Cons**: Adds complexity, unclear if needed

## Recommendation: Option B (Merge)

**Merge constitutional-intelligence into constitutional-analysis** because:

1. **Single Responsibility**: Constitutional analysis is one feature, not two
2. **Incomplete Structure**: No benefit to keeping incomplete DDD structure
3. **Simplicity**: One feature is easier to understand and maintain
4. **No Loss**: Domain entity can live in constitutional-analysis/domain/
5. **Clear Ownership**: One team owns constitutional functionality

## Implementation Plan (If Merging)

1. Create `constitutional-analysis/domain/` directory
2. Move `constitutional-provision.ts` to `constitutional-analysis/domain/entities/`
3. Update imports in constitutional-analysis
4. Delete `constitutional-intelligence/` directory
5. Update `server/features/index.ts` to remove export
6. Update schema imports if needed

## Why This Happened

This appears to be an **abandoned refactoring attempt** to split constitutional functionality into:
- **constitutional-intelligence**: Domain layer (entities, value objects)
- **constitutional-analysis**: Application layer (use cases, services)

The refactoring was started but never completed, leaving an incomplete structure.

## Current Usage

The domain entity (`constitutional-provision.ts`) may be used by:
- Schema definitions in `server/infrastructure/schema/domains/constitutional-intelligence.ts`
- Constitutional analysis services

Check imports before making changes.

## Decision Required

The team needs to decide:
- [ ] Complete the DDD split (Option A)
- [ ] Merge into constitutional-analysis (Option B) ✅ Recommended
- [ ] Keep as domain-only module (Option C)

Document the decision in an ADR and implement accordingly.

## Related Documentation

- [ADR-004: Feature Structure Convention](../../../docs/adr/ADR-004-feature-structure-convention.md)
- [Feature Structure Convention](../README.md)
- [Constitutional Analysis Feature](../constitutional-analysis/)

## Questions?

If you're working on constitutional functionality:
- Use `constitutional-analysis` for all application logic
- The domain entity in `constitutional-intelligence` may be moved in the future
- Avoid adding more code to `constitutional-intelligence` until the decision is made
