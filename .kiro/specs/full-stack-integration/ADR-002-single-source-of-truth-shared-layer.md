# ADR-002: Single Source of Truth in Shared Layer

**Status**: Accepted

**Date**: 2024

**Context**: The Chanuka Platform is a full-stack application with four distinct layers: client (React), server (Node.js/Express), shared (types and utilities), and database (PostgreSQL with Drizzle ORM). Each layer needs to work with the same conceptual entities (Users, Bills, Committees, etc.), but historically, type definitions, validation rules, and constants have been duplicated across layers.

This duplication has led to several critical problems:
- **Schema drift**: Database schema changes don't propagate to application types, causing runtime errors
- **Validation inconsistency**: Client and server validate data differently, leading to confusing user experiences
- **Regression during migrations**: Bug fixes in one layer are lost when types are regenerated or refactored
- **Maintenance burden**: Updating a type requires changes in multiple files across multiple layers
- **Conflicting definitions**: The same entity has slightly different definitions in different layers

For example, a User entity might be defined separately in:
- `client/types/user.ts`
- `server/types/user.ts`
- `database/schema/users.ts`
- `shared/types/user.ts`

When a field is added to the database schema, developers must remember to update all four locations, and often miss one or more, leading to bugs.

**Decision**: We will establish the shared layer as the single source of truth for all cross-layer concerns:

1. **Type Definitions**: All domain entity types, API contract types, and branded types are defined once in `shared/types/`
2. **Validation Schemas**: All Zod validation schemas are defined once in `shared/validation/`
3. **Constants and Enums**: All enums, constants, and configuration values used by multiple layers are defined once in `shared/constants/`
4. **Transformation Utilities**: All data transformation functions are defined once in `shared/utils/transformers/`
5. **Error Definitions**: All error types, error codes, and error structures are defined once in `shared/types/errors.ts`

The shared layer structure:
```
shared/
├── types/
│   ├── core/              # Branded types, common types
│   ├── domains/           # Domain entity types (User, Bill, etc.)
│   ├── api/               # API request/response types
│   ├── database/          # Database-specific types
│   └── errors.ts          # Error types and codes
├── validation/
│   ├── schemas/           # Zod validation schemas
│   └── rules/             # Reusable validation rules
├── constants/
│   ├── enums.ts           # Shared enums
│   └── config.ts          # Shared configuration
└── utils/
    ├── transformers/      # Data transformation functions
    └── common.ts          # Common utilities
```

**Rules**:
- Client and server layers MUST import types from shared, never define their own
- Database layer generates types that are then transformed and exported through shared
- No duplication of type definitions, validation schemas, or constants across layers
- Shared layer must not contain server-only infrastructure (logging, caching, middleware)
- Shared layer must be safe for use in both browser and Node.js environments

**Consequences**:

**Positive**:
- **Guaranteed consistency**: Types, validation, and constants are identical across all layers
- **Single update point**: Changing a type requires editing only one file
- **Compile-time verification**: Type mismatches between layers are caught at compile time
- **Migration safety**: Schema changes automatically propagate to all layers through shared types
- **Reduced cognitive load**: Developers know exactly where to find and update definitions
- **Easier onboarding**: New developers have a clear mental model of where things belong
- **Prevents regression**: Bug fixes in shared layer automatically apply everywhere

**Negative**:
- **Shared layer becomes critical path**: All layers depend on shared, so shared layer changes affect everything
- **Build complexity**: Shared layer must be built before other layers can compile
- **Circular dependency risk**: Must carefully manage imports to avoid circular dependencies
- **Versioning challenges**: Shared layer changes require coordinated updates across layers
- **Bundle size concerns**: Client bundle includes all shared code, even if not all is used (mitigated by tree-shaking)

**Mitigation**:
- Use clear module boundaries within shared layer to minimize coupling
- Implement strict linting rules to prevent circular dependencies
- Use tree-shaking to eliminate unused shared code from client bundle
- Document what belongs in shared vs. layer-specific code
- Use monorepo tooling to manage shared layer versioning
- Implement automated tests that verify shared layer has no server-only dependencies

**Alternatives Considered**:
1. **Separate shared packages per concern**: Rejected because it increases complexity and doesn't solve the fundamental problem
2. **Code generation from database schema**: Rejected because it makes database the source of truth, which doesn't work for API-only types
3. **GraphQL schema as source of truth**: Rejected because the platform doesn't use GraphQL
4. **Duplicated types with automated sync**: Rejected because sync tools add complexity and can fail

**Related Requirements**: Requirements 1.1, 1.6, 3.1, 5.1, 7.2, 8.1 (all requiring single definitions in shared layer)

**Related ADRs**: ADR-001 (Branded Types), ADR-003 (Zod for Validation), ADR-004 (Transformation Layer Pattern)
