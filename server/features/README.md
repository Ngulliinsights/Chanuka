# Feature Structure Convention

This document defines the architectural conventions for organizing features in the Chanuka platform.

## Overview

Features in `server/features/` follow one of two organizational patterns based on complexity and domain requirements:

1. **Full DDD Structure** - For complex features with rich domain logic
2. **Flat Structure** - For simple features with minimal domain logic

## When to Use Full DDD Structure

Use the full Domain-Driven Design (DDD) structure when:

- ✅ Feature has database entities with business rules
- ✅ Domain logic must be protected and encapsulated
- ✅ Multiple use cases or workflows exist
- ✅ Feature has more than ~8 files
- ✅ Complex business logic requires domain modeling
- ✅ Feature will grow and evolve over time

### Full DDD Structure

```
features/[feature-name]/
├── domain/                    # Domain layer (business logic)
│   ├── entities/             # Domain entities with business rules
│   ├── value-objects/        # Immutable value objects
│   ├── services/             # Domain services
│   └── events/               # Domain events
├── application/              # Application layer (use cases)
│   ├── use-cases/           # Application use cases
│   ├── commands/            # Command handlers
│   ├── queries/             # Query handlers
│   └── middleware/          # Application middleware
├── infrastructure/           # Infrastructure layer (technical details)
│   ├── repositories/        # Data access implementations
│   ├── adapters/            # External service adapters
│   └── persistence/         # Database-specific code
├── types/                    # TypeScript types and interfaces
└── index.ts                  # Public API exports
```

### Examples of Full DDD

- **users/** - User management with authentication, profiles, roles
- **bills/** - Legislative bills with complex workflows and relationships
- **recommendation/** - Recommendation engine with ML models and scoring
- **constitutional-analysis/** - Constitutional analysis with NLP and legal logic

## When to Use Flat Structure

Use the flat structure when:

- ✅ Feature is a thin routing/API layer
- ✅ Fewer than ~8 files total
- ✅ Primarily read-only queries or simple CRUD
- ✅ Minimal business logic
- ✅ No complex domain modeling needed
- ✅ Feature is unlikely to grow significantly

### Flat Structure

```
features/[feature-name]/
├── [feature-name].ts         # Main implementation
├── [feature-name]-routes.ts  # Route handlers
├── [feature-name]-service.ts # Service layer (if needed)
├── types.ts                  # TypeScript types
└── index.ts                  # Public API exports
```

### Examples of Flat Structure

- **community/** - Simple comment and voting functionality
- **market/** - Basic market data queries
- **coverage/** - Coverage tracking and reporting
- **search-suggestions.ts** - Single-file search suggestion feature

## Decision Guidelines

### Complexity Indicators

| Indicator | Flat | Full DDD |
|-----------|------|----------|
| File count | < 8 files | > 8 files |
| Database entities | 0-1 tables | 2+ tables |
| Business rules | Simple validation | Complex domain logic |
| Use cases | 1-3 operations | 4+ operations |
| External integrations | None or 1 | Multiple |
| Domain events | None | Yes |
| Future growth | Unlikely | Expected |

### Example Decision Process

**Feature: User Comments**
- Files: 3 (comment.ts, routes.ts, types.ts)
- Entities: 1 (comments table)
- Logic: Simple CRUD + voting
- **Decision: Flat** ✅

**Feature: Bill Management**
- Files: 15+ across multiple concerns
- Entities: 4 (bills, sponsors, amendments, votes)
- Logic: Complex workflows, status transitions, relationships
- **Decision: Full DDD** ✅

**Feature: Constitutional Analysis**
- Files: 20+ with ML models
- Entities: 3 (analyses, provisions, interpretations)
- Logic: NLP processing, legal reasoning, scoring
- **Decision: Full DDD** ✅

## Migration Path

### From Flat to Full DDD

If a flat feature grows in complexity:

1. Create domain/, application/, infrastructure/ directories
2. Move business logic to domain/entities/
3. Move use cases to application/use-cases/
4. Move data access to infrastructure/repositories/
5. Update imports and exports
6. Add MIGRATION_SUMMARY.md documenting the change

### From Full DDD to Flat

If a DDD feature becomes simpler (rare):

1. Consolidate domain logic into single file
2. Merge application and infrastructure layers
3. Remove unnecessary directories
4. Update imports and exports
5. Document the simplification

## Best Practices

### For All Features

1. **Single Responsibility**: Each feature should have one clear purpose
2. **Public API**: Export only what's needed via index.ts
3. **Type Safety**: Use TypeScript types for all public interfaces
4. **Documentation**: Include README.md for complex features
5. **Testing**: Co-locate tests with implementation

### For Full DDD Features

1. **Domain Purity**: Keep domain layer free of infrastructure concerns
2. **Dependency Direction**: Dependencies flow inward (infrastructure → application → domain)
3. **Encapsulation**: Protect domain invariants with private methods
4. **Value Objects**: Use value objects for domain concepts
5. **Domain Events**: Emit events for significant domain changes

### For Flat Features

1. **Keep It Simple**: Don't over-engineer
2. **Single File**: Prefer single file if < 200 lines
3. **Clear Naming**: Use descriptive file names
4. **Easy Migration**: Structure for easy upgrade to DDD if needed

## Anti-Patterns to Avoid

### ❌ Mixing Patterns

Don't mix flat and DDD within a single feature:

```
features/users/
├── domain/entities/user.ts    # DDD structure
├── user-service.ts             # Flat structure
└── routes.ts                   # Flat structure
```

### ❌ Over-Engineering Simple Features

Don't use full DDD for simple features:

```
features/health-check/
├── domain/entities/health-status.ts  # Overkill
├── application/use-cases/check-health.ts
└── infrastructure/repositories/health-repository.ts
```

Better:
```
features/health-check.ts  # Single file is fine
```

### ❌ Under-Engineering Complex Features

Don't use flat structure for complex features:

```
features/bills/
├── bills.ts  # 2000 lines of mixed concerns
└── routes.ts
```

Better: Use full DDD structure with proper separation.

## Examples from Codebase

### Full DDD Examples

**users/** - Complete DDD structure
```
users/
├── domain/
│   ├── entities/
│   │   ├── user.ts
│   │   └── value-objects.ts
│   └── services/
│       └── user-domain-service.ts
├── application/
│   ├── use-cases/
│   │   ├── register-user.ts
│   │   └── update-profile.ts
│   └── middleware/
│       └── validation-middleware.ts
└── infrastructure/
    └── repositories/
        └── user-repository.ts
```

**bills/** - DDD with additional routing
```
bills/
├── domain/
├── application/
├── infrastructure/
├── repositories/
├── services/
└── [various route files]  # Routes at root for convenience
```

### Flat Examples

**community/** - Simple flat structure
```
community/
├── comment.ts
├── comment-voting.ts
├── social-integration.ts
└── index.ts
```

**market/** - Minimal flat structure
```
market/
├── market.ts
└── index.ts
```

## Enforcement

### ESLint Rules (Future)

Consider adding ESLint rules to enforce:
- No infrastructure imports in domain layer
- Proper dependency direction
- File naming conventions

### Code Review Checklist

When reviewing new features:
- [ ] Structure matches complexity (flat vs DDD)
- [ ] Dependencies flow in correct direction (if DDD)
- [ ] Public API is minimal and clear
- [ ] Types are properly defined
- [ ] Tests are co-located

## Related Documentation

- [ADR-004: Feature Structure Convention](../../docs/adr/ADR-004-feature-structure-convention.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [Domain-Driven Design Principles](../../docs/architecture/ddd-principles.md)

## Questions?

If you're unsure which structure to use:

1. Start with **flat** - it's easier to upgrade than downgrade
2. Ask yourself: "Will this feature have complex business rules?"
3. Look at similar features in the codebase
4. Consult with the team during design review

Remember: The goal is **clarity and maintainability**, not architectural purity.
