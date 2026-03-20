# Architecture & Design Decisions

**Extracted From:** ARCHITECTURE.md (January 17, 2026)  
**Updated:** March 9, 2026  
**Purpose:** Strategic reference for module organization and design patterns  
**For Questions About:** Why modules are organized this way, what should go where

> **Note:** For formal architectural decisions with full context and rationale, see [Architectural Decision Records (ADRs)](../adr/README.md). This document provides practical guidance for day-to-day development.

---

## Project Structure Overview

```
chanuka-platform/
├── client/              - React frontend application
├── server/              - Node.js backend application
├── shared/              - CODE SHARED BETWEEN CLIENT & SERVER
│   ├── core/           - ⚠️ 80% SERVER INFRASTRUCTURE (see warning below)
│   ├── types/          - Shared type definitions
│   └── db/             - Database types and utilities
├── drizzle/             - Database migrations
├── @types/              - Global TypeScript type declarations
├── tests/               - Integration tests
└── tools/               - Development utilities
```

---

## ⚠️ CRITICAL: shared/core Module

### What Is It?

Despite being in `shared/`, this module is **80% server infrastructure**. It contains:

**Server-Only (Move to server/core/ eventually):**
- `observability/` - Server logging, error management, tracing, metrics
- `caching/` - Server-side cache implementation and strategies
- `validation/` - Server validation schemas and utilities
- `middleware/` - Express middleware (authentication, error handling, etc.)
- `performance/` - Server performance monitoring and budgets
- `config/` - Server configuration management

**Truly Shared (Keep here):**
- `primitives/` - Constants, enums, basic types
- `types/auth.types.ts` - Authentication types
- `types/feature-flags.ts` - Feature flag types
- `utils/string-utils.ts`, `number-utils.ts`, `type-guards.ts`, `security-utils.ts`, `regex-patterns.ts`
- `utils/formatting/` - Formatting utilities
- `utils/correlation-id.ts` - Request tracking

### Why This Happened

Architectural debt: modules were added for convenience during development. Proper place would be `server/core/`.

### Future Refactoring (Deferred)

This requires updating 30+ import statements across the codebase, so it's planned for a future phase:

```
Legacy: shared/core/{observability, caching, validation, middleware, performance, config}/
Future: server/core/{observability, caching, validation, middleware, performance, config}/
Keep in shared: primitives/, types/, specific utils
```

### How to Know What's Shared vs Server-Only

**Rule of thumb:**
- Imported by client code → It's shared
- Only imported by server code → It's server-only infrastructure
- Unsure? Check imports in your IDE

---

## Client Architecture (React)

### Folder Structure

```
client/src/
├── components/
│   ├── core/           - Core UI components (buttons, layouts, etc.)
│   ├── features/       - Feature-specific components
│   └── shared/         - Reusable UI components
├── core/               - Client business logic
│   ├── api/            - API client and types
│   ├── hooks/          - Custom React hooks
│   ├── routing/        - Route definitions
│   └── state/          - State management (Redux)
├── features/           - Feature modules
│   ├── bills/
│   ├── community/
│   ├── search/
│   └── users/
├── styles/             - Global CSS/Tailwind
├── utils/              - Client utilities
└── App.tsx             - Entry point
```

### Design Pattern: Feature-First

- Each feature has its own directory
- Components, hooks, and utilities colocated with their feature
- Shared components live in `shared/components/`
- API integration through `core/api/`

### State Management

- **Global state:** Redux Toolkit
- **Server state:** React Query
- **Local state:** React component state

### When Adding a New Feature

1. Create feature folder in `client/src/features/{featureName}/`
2. Create API client in `core/api/`
3. Create hooks in `features/{featureName}/hooks/`
4. Create components in `features/{featureName}/components/`
5. Create Redux slice if global state needed
6. Add routes to `core/routing/`

---

## Server Architecture (Node.js)

### Folder Structure

```
server/
├── features/               - Feature implementations
│   ├── {featureName}/     - Each feature contains:
│   │   ├── routes.ts      - Express routes
│   │   ├── service.ts     - Business logic
│   │   ├── repository.ts  - Database queries
│   │   ├── validation.ts  - Input schemas (Zod)
│   │   ├── types.ts       - Feature types
│   │   └── cache.ts       - Caching logic
│   └── [bills, users, community, search, notifications, sponsors, analytics, advocacy]
├── infrastructure/         - Server infrastructure
│   ├── database/          - Neon PostgreSQL connections
│   ├── schema/            - Drizzle schema definitions
│   ├── cache/             - Redis/memory cache
│   ├── auth/              - Authentication (JWT, OAuth)
│   ├── storage/           - File storage
│   ├── websocket/         - Real-time communication
│   ├── logging/           - Error tracking, observability
│   └── recovery/          - Error recovery strategies
├── middleware/            - Express middleware
│   ├── error-handling/    - Global error handler
│   ├── logging/           - Request logging
│   ├── auth/              - Authentication middleware
│   └── validation/        - Request validation
├── scripts/               - Utility scripts
└── index.ts               - Server entry point
```

### Design Pattern: Feature-Driven

- Each feature contains routes, service, repository, validation
- Routes handle HTTP
- Services handle business logic
- Repositories handle database queries
- Validation uses Zod schemas
- Result types handle success/error patterns

### Key Infrastructure Components

**Database:** Neon PostgreSQL (Drizzle ORM)
**Caching:** Redis + memory cache layer
**Auth:** JWT tokens + optional OAuth integration
**Logging:** Winston logging with structured format
**Error Handling:** Global error handler with recovery strategies
**Real-Time:** WebSocket implementation for notifications

### When Adding a New Feature

1. Create feature folder in `server/features/{featureName}/`
2. Define API routes in `routes.ts`
3. Implement business logic in `service.ts`
4. Write database queries in `repository.ts`
5. Define input validation in `validation.ts` (Zod schemas)
6. Add route handler to `server/index.ts`
7. Create tests in `tests/features/{featureName}/`

---

## Shared Architecture (Types & Utilities)

### Folder Structure

```
shared/
├── core/                - Infrastructure (80% server-only)
│   ├── observability/
│   ├── caching/
│   ├── validation/
│   ├── middleware/
│   ├── performance/
│   ├── config/
│   ├── primitives/      ✅ SHARED
│   └── types/           ✅ SHARED
├── types/               - Domain model types
│   ├── api/             - API request/response types
│   ├── domains/         - Business domain types
│   ├── features/        - Feature-specific types
│   └── core/            - Core application types
└── db/                  - Database types
```

### What Should Be in shared/

✅ **YES:**
- Type definitions (interfaces, types)
- Constants and enums
- Basic utility functions (string, number, type guards)
- Validation schemas (Zod) used by both client and server
- API request/response types

❌ **NO:**
- Server infrastructure (observability, middleware, caching)
- Database queries or repositories
- Express-specific code
- React-specific code

---

## Database & Migration Strategy

**System:** Drizzle ORM with Neon PostgreSQL  
**Location:** `drizzle/` folder  
**Schemas:** `server/infrastructure/schema/`

### Adding a New Table

1. Define schema in `server/infrastructure/schema/{domain}.ts`
2. Create migration in `drizzle/` folder
3. Run `pnpm db:push` to apply
4. Update types in `shared/db/types/`

---

## Import Rules & Guidelines

### Allowed Imports

✅ **Client can import from:**
- `client/src/`
- `shared/types/`
- `shared/core/primitives/`
- `shared/core/utils/` (only utility functions, not observability)

❌ **Client cannot import from:**
- `shared/core/observability/`, `middleware/`, `caching/`, `config/`, `validation/`
- `server/`

✅ **Server can import from:**
- `server/`
- `shared/` (all of it)

❌ **Server cannot import from:**
- `client/`

✅ **shared/** can contain:
- Types and interfaces
- Constants and enums
- Utility functions
- Validation schemas

---

## Architecture Decision Log

> **For detailed architectural decisions, see [ADRs](../adr/README.md)**

### Key Decisions Summary

| Decision | Rationale | ADR Reference |
|----------|-----------|---------------|
| Feature-Driven Server Structure | Easier to locate code, clearer boundaries, easier testing | [ADR-004](../adr/ADR-004-feature-structure-convention.md) |
| Validation at API Boundary | Type safety at runtime, prevent invalid data | [ADR-006](../adr/ADR-006-validation-single-source.md), [ADR-012](../adr/ADR-012-infrastructure-security-pattern.md) |
| Shared Types, Not Implementations | Prevents coupling while maintaining type safety | [ADR-011](../adr/ADR-011-type-system-single-source.md) |
| Result Types for Error Handling | Explicit error handling, easier to test failures | [ADR-014](../adr/ADR-014-error-handling-pattern.md) |
| Caching at Service Layer | Transparent to routes, easy invalidation | [ADR-013](../adr/ADR-013-caching-strategy.md) |
| API Client Consolidation | Single source of truth for API calls | [ADR-001](../adr/ADR-001-api-client-consolidation.md) |
| Repository Pattern | Standardized data access | [ADR-017](../adr/ADR-017-repository-pattern-standardization.md) |
| Security Integration Pattern | Consistent security across features | [ADR-012](../adr/ADR-012-infrastructure-security-pattern.md) |

---

## Common Pitfalls to Avoid

1. **Importing server code in client** - Will break builds
2. **Putting UI components in shared/** - Only put types/helpers, not React components
3. **Skipping validation at API boundary** - Results in runtime errors
4. **Assuming shared/core is truly shared** - It's mostly server infrastructure
5. **Long feature functions** - Keep under 40 lines, extract helpers
6. **Silent error handling** - Always log errors before catching
7. **Unbounded database queries** - Always add LIMIT, pagination
8. **Missing error test paths** - Test both success and failure cases

---

## Future Architecture Improvements

1. Move server infrastructure from `shared/core/` to `server/core/` (30+ imports)
2. Add feature flag system for gradual rollouts
3. Implement event sourcing for audit trails
4. Separate query and command models (CQRS pattern)
5. Add GraphQL layer alongside REST
6. Intelligent Bill Pipeline (see [ADR-015](../adr/ADR-015-intelligent-bill-pipeline.md))

## Related Documentation

- **[ADR Index](../adr/README.md)** - All architectural decisions with full context
- **[ADR-020](../adr/ADR-020-root-documentation-consolidation.md)** - Recent design decisions from March 2026
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** - Root architecture overview
- **[DCS Index](./INDEX.md)** - Strategic reference documentation
