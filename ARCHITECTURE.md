# Chanuka Platform - Architecture Overview

**Last Updated:** January 17, 2026

---

## Project Structure

```
chanuka-platform/
├── client/                 - React frontend application
├── server/                 - Node.js backend application
├── shared/                 - Shared code between client and server
│   ├── core/              - ⚠️ MOSTLY SERVER INFRASTRUCTURE (see note below)
│   ├── types/             - Shared type definitions
│   └── db/                - Database types and utilities
├── drizzle/                - Database migrations
├── @types/                 - Global TypeScript type declarations
├── tests/                  - Integration tests
└── tools/                  - Development utilities
```

---

## ⚠️ Important: shared/core Module

### What Is shared/core?

Despite its "shared" name, `shared/core` is **80% server infrastructure**. It contains:

**Server-Only Modules:**
- `observability/` - Server logging, error management, tracing, metrics
- `caching/` - Server-side cache implementation and strategies
- `validation/` - Server validation schemas and utilities
- `middleware/` - Express middleware (authentication, error handling, etc.)
- `performance/` - Server performance monitoring and budgets
- `config/` - Server configuration management

**Truly Shared Items:**
- `primitives/` - Constants, enums, basic types used by both client and server
- `types/auth.types.ts` - Authentication type definitions (shared)
- `types/feature-flags.ts` - Feature flag types (shared)
- `types/index.ts` - Core type exports
- Specific utilities:
  - `utils/string-utils.ts` - String manipulation
  - `utils/number-utils.ts` - Number manipulation
  - `utils/type-guards.ts` - TypeScript type guards
  - `utils/security-utils.ts` - Security utilities
  - `utils/regex-patterns.ts` - Regex patterns
  - `utils/formatting/` - Formatting utilities
  - `utils/correlation-id.ts` - Request correlation IDs
  - `utils/common-utils.ts` - General utilities

### Why Is Server Code in shared/core?

This is a legacy architectural decision. The module was originally created for truly shared infrastructure, but as the server grew, infrastructure modules were added here for convenience.

### Future Plans

Ideally, these server-only modules should be moved to `server/core/` for proper architectural separation:

```
shared/core/                    server/core/ (future)
├── observability/    ───────→  ├── observability/
├── caching/         ───────→   ├── caching/
├── validation/      ───────→   ├── validation/
├── middleware/      ───────→   ├── middleware/
├── performance/     ───────→   ├── performance/
└── config/          ───────→   └── config/

(Shared items remain in shared/core/)
```

However, this refactoring requires updating 30+ import statements across the codebase, so it's being deferred to a future phase.

### How to Know What's Shared vs Server-Only

**Use this rule of thumb:**
- If a module in `shared/core/` is imported by client code → It's shared
- If a module in `shared/core/` is only imported by server code → It's server-only
- If unsure, check the import statements in your IDE

---

## Module Breakdown

### client/

The React frontend application.

```
client/
├── src/
│   ├── components/         - React components
│   │   ├── core/          - Core UI components
│   │   ├── features/      - Feature-specific components
│   │   └── shared/        - Shared UI components
│   ├── core/              - Client business logic
│   │   ├── api/           - API client and types
│   │   ├── hooks/         - Custom React hooks
│   │   ├── routing/       - Route definitions
│   │   └── state/         - State management
│   ├── features/          - Feature modules
│   │   ├── bills/         - Bills feature
│   │   ├── community/     - Community feature
│   │   ├── search/        - Search feature
│   │   └── users/         - User management
│   ├── styles/            - Global styles
│   ├── utils/             - Client utilities
│   └── App.tsx            - Application entry point
├── index.html             - HTML template
└── vite.config.ts         - Vite configuration
```

### server/

The Node.js backend application.

```
server/
├── features/              - Feature implementations
│   ├── admin/            - Admin routes and logic
│   ├── bills/            - Bills feature (routes, services)
│   ├── community/        - Community feature
│   ├── notifications/    - Notifications service
│   ├── search/           - Search feature
│   ├── sponsors/         - Sponsors feature
│   ├── users/            - User management
│   └── [other features]/
├── infrastructure/        - Server infrastructure
│   ├── database/         - Database connection and queries
│   ├── schema/           - Database schema definitions
│   ├── cache/            - Redis/memory cache
│   ├── auth/             - Authentication and authorization
│   ├── storage/          - File storage
│   └── [other infra]/
├── middleware/           - Express middleware
│   ├── error-handling/   - Error middleware
│   ├── logging/          - Logging middleware
│   └── [other middleware]/
├── scripts/              - Utility scripts
├── dist/                 - Compiled output (generated)
├── index.ts              - Server entry point
└── tsconfig.json         - TypeScript configuration
```

### shared/

Code and types shared between client and server.

```
shared/
├── core/                 - Infrastructure (mostly server-only - see note above)
│   ├── observability/   - Logging, error management, tracing (SERVER ONLY)
│   ├── caching/         - Cache implementation (SERVER ONLY)
│   ├── validation/      - Validation schemas (SERVER ONLY)
│   ├── middleware/      - Middleware (SERVER ONLY)
│   ├── performance/     - Performance monitoring (SERVER ONLY)
│   ├── config/          - Configuration (SERVER ONLY)
│   ├── primitives/      - Constants, enums, basic types (SHARED)
│   └── types/           - Core type definitions
├── types/               - Shared type definitions
│   ├── api/             - API request/response types
│   ├── domains/         - Domain model types
│   ├── core/            - Core types
│   └── [other domains]/
└── db/                  - Database types
```

---

## Architecture Patterns

### Client Architecture

**Feature-First Organization:**
- Each feature has its own directory
- Components, hooks, and utilities are colocated with their feature
- Shared components in `shared/components/`
- API integration through `core/api/`

**State Management:**
- Redux Toolkit for global state
- React Query for server state
- Local component state where appropriate

### Server Architecture

**Feature-Driven Design:**
- Each feature has a router, service, and data layer
- Routes handle HTTP requests
- Services handle business logic
- Database queries are separated into repositories/models

**Middleware Pattern:**
- Error handling middleware for consistent error responses
- Authentication middleware for protected routes
- Logging middleware for request tracking

### Shared Architecture

**Type System:**
- Unified type definitions in `@shared/types/`
- Domain-specific types in `@shared/types/domains/`
- API contracts in `@shared/types/api/`
- Core types in `@shared/types/core/`

**Infrastructure (Currently in shared/core):**
- Error management and logging
- Caching strategies
- Validation utilities
- Performance monitoring
- Configuration management

---

## Data Flow

### Client → Server

```
React Component
    ↓
Custom Hook (useAPI, useQuery, etc.)
    ↓
API Client (@shared/types/api/)
    ↓
HTTP Request (GET, POST, etc.)
```

### Server

```
HTTP Request
    ↓
Middleware (Error, Auth, Logging)
    ↓
Route Handler (Express Router)
    ↓
Service Layer (Business Logic)
    ↓
Database Layer (Drizzle ORM)
    ↓
Response
```

### Database

```
Server
    ↓
Drizzle ORM Query Builder
    ↓
SQL Query
    ↓
PostgreSQL Database
    ↓
Result
```

---

## Key Technologies

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit, React Query
- **Styling:** Tailwind CSS
- **Testing:** Vitest, React Testing Library

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSocket
- **Testing:** Vitest, Supertest

### Shared
- **Type System:** TypeScript
- **Validation:** Zod
- **Package Manager:** pnpm
- **Monorepo:** Nx

---

## Module Dependencies

### Do Not Import From

**Client should NOT import from:**
- `server/` - Use API client instead
- `shared/core/observability/` - Server-only logging
- `shared/core/caching/` - Server-only cache implementation
- `shared/core/middleware/` - Server-only Express middleware
- `shared/core/performance/` - Server monitoring
- `shared/core/config/` - Server configuration

**Server should NOT import from:**
- `client/` - Use API contracts instead

---

## Development Workflow

### Adding a New Feature

1. **Create feature in server:**
   - Add route in `server/features/[feature]/[feature].routes.ts`
   - Add service in `server/features/[feature]/[feature].service.ts`
   - Add database model/types

2. **Create shared types:**
   - Add types in `shared/types/domains/[feature].ts`
   - Export from `shared/types/domains/index.ts`

3. **Create feature in client:**
   - Add feature directory in `client/src/features/[feature]/`
   - Add components
   - Add hooks for API integration
   - Use types from `@shared/types/domains/`

### Making Type Changes

1. **Update `@shared/types/`** first
2. **Update client** to use new types
3. **Update server** to use new types
4. **Never** create types in both places

### Creating Infrastructure

1. **If shared by client and server:** Add to `shared/core/primitives/` or `shared/types/`
2. **If server-only:** 
   - Add to `shared/core/` (temporary, with comment explaining)
   - OR add to `server/infrastructure/` for new infrastructure
3. **Future:** Move from `shared/core/` to `server/core/` when time permits

---

## Common Questions

### Why is server code in shared/core?

Legacy architectural decision. Ideally it should be in `server/core/`, but that requires refactoring 30+ imports. See "Future Plans" section above.

### Should I import from shared/core/observability in my client code?

No - this is server-only logging. Use the API to report errors to the server.

### Can I create a new module in shared/core?

Only if it's truly shared by both client and server. If it's server-only, add it to `server/infrastructure/` instead.

### How do I add a new validation rule?

Create it in `shared/types/` or `shared/core/validation/` (server-side schemas). Use Zod for schema definition.

### Where should I put utility functions?

- **Client utilities:** `client/src/utils/`
- **Server utilities:** `server/utils/` or `shared/core/utils/` (if truly generic)
- **Shared utilities:** `shared/core/utils/` (string-utils, number-utils, type-guards, etc.)

---

## Next Steps

### Planned Refactoring

**Phase 1 (Current):** Document architecture (this file)

**Phase 2 (Future):** Gradually move server infrastructure
```
Move from shared/core/ to server/core/:
- observability/
- caching/
- validation/
- middleware/
- performance/
- config/
```

**Timeline:** To be determined based on development priorities

### How to Help

If you're working on features:
1. Reference this document when uncertain about module placement
2. Keep server and client code separated
3. Put shared types in `@shared/types/`
4. Comment if adding server code to `shared/core/` (temporary measure)

---

## Related Documentation

- [Architecture Decision Records (ADRs)](docs/adr/README.md) - Documented architectural decisions
  - [ADR-001: API Client Consolidation](docs/adr/ADR-001-api-client-consolidation.md)
  - [ADR-005: CSP Manager Consolidation](docs/adr/ADR-005-csp-manager-consolidation.md)
  - [ADR-006: Validation Single Source](docs/adr/ADR-006-validation-single-source.md)
  - [ADR-009: Graph Module Refactoring](docs/adr/ADR-009-graph-module-refactoring.md)
  - [ADR-010: Government Data Consolidation](docs/adr/ADR-010-government-data-consolidation.md)
- [Feature Structure Convention](server/features/README.md) - Guidelines for organizing features
- [Constitutional Intelligence](server/features/constitutional-intelligence/README.md) - Incomplete DDD structure documentation
- [TYPE_SYSTEM_RESTRUCTURE_PLAN.md](TYPE_SYSTEM_RESTRUCTURE_PLAN.md) - Type system organization
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current project status
- [README.md](README.md) - Project overview
