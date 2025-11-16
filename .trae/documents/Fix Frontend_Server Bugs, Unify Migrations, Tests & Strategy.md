# Objectives
- Eliminate frontend bugs rooted in incomplete migrations and library dissonance
- Fix server-side bugs and normalize architecture and error handling
- Create a best-practices checklist to prevent future sprawl
- Update existing tests and add missing high-impact ones
- Define a 20% testing strategy that yields ~80% risk reduction

## Scope & Constraints
- Frontend (React + Vite, React Router, RTK + Zustand, TanStack Query, Tailwind)
- Server (Express, Drizzle ORM, PostgreSQL, Socket.IO, Pino, Passport/JWT)
- Shared code and configs (`tsconfig`, ESLint/Prettier, env files)
- Tests (Vitest, Playwright, Jest a11y)

## Approach Overview
- Audit and reproduce bugs quickly
- Unify competing patterns (state, data-fetching, env, observability)
- Remove deprecated and half-migrated code paths
- Standardize server routes, errors, and DB access
- Strengthen tests around core flows and known failures

## Phase Plan
### Phase 1: Rapid Audit & Bug Reproduction
- Run client and server, capture runtime errors and warnings
- Identify duplicate or conflicting patterns (Redux vs Zustand, axios/fetch, legacy components)
- Produce a migration map with concrete replacements and removals

### Phase 2: Frontend Fixes & Unification
- State: Prefer `@reduxjs/toolkit` for app/global state, limit `zustand` to small local component state
- Data: Standardize on `@tanstack/react-query` for server data, single fetch/axios abstraction
- Routing: Confirm `react-router-dom@7` usage; clean up legacy route components
- Env: Normalize `import.meta.env` access; validate required vars in `client/vite.config.ts`
- Styling: Resolve Tailwind config inconsistencies, purge unused classes; unify CSS modules if present
- Observability: Normalize Sentry/Datadog setup into a single init in `client/src/main.tsx`
- Remove deprecated, forked, or duplicate components

### Phase 3: Server Fixes & Normalization
- Routing: Ensure all routers follow a uniform pattern; remove legacy endpoints
- Errors: Centralize error handling middleware; return consistent error shapes
- DB: Unify Drizzle usage and connection pooling; remove fallback DB in production
- Security: Confirm Helmet, CORS, rate-limits; normalize auth (JWT/Passport) flows
- Logging: Ensure Pino structured logs and correlation IDs across requests

### Phase 4: Cross‑Cutting Codebase Hygiene
- Align TypeScript configs; increase strictness where safe
- ESLint + Prettier consistency; fix high-impact lint errors
- Remove unused dependencies; lock versions to reduce drift

### Phase 5: Tests Update & Additions
- Unit: Stabilize utilities and reducers; add tests for new abstractions
- Integration: Test routers/controllers, DB interactions, and critical client data flows
- E2E: Playwright smoke and core journeys; add minimal a11y checks via Jest a11y or Playwright Axe
- Coverage: Enable `@vitest/coverage-v8`; track thresholds, focus on hot spots

### Phase 6: Monitoring & Verification
- Performance budgets for client bundles (Vite visualizer)
- Error budget tracking via Sentry; baseline and regression checks

### Phase 7: Rollout & Guardrails
- Feature flags where needed; staged rollouts
- Document migration outcomes (in code comments/changelogs where appropriate)

## Frontend Fixes Checklist
- Replace mixed global state with RTK; limit Zustand to local state only
- Centralize API client and query keys; remove duplicate axios/fetch usage
- Normalize router v7 route definitions; delete deprecated route wrappers
- Validate envs at build and runtime; fail clearly if missing
- Tailwind config hygiene; purge and reduce dead CSS
- Single Sentry/Datadog init; remove duplicate instrumentation
- Remove legacy components and half-migrated UI patterns

## Server Fixes Checklist
- Standard router structure; consolidate controllers
- Single error handling pipeline with typed error responses
- Drizzle ORM standard queries; consistent transactions; remove prod fallback DB
- Security middleware order and config verified; consistent auth tokens
- Pino logging with request IDs; mask PII/secrets

## Best‑Practices Checklist
- Typed env schema with validation across client/server
- One global state solution (RTK) + TanStack Query for server data
- Single HTTP abstraction; consistent error mapping
- Strict TypeScript where feasible (`noImplicitAny`, `strictNullChecks`)
- Linting/formatting enforced via CI; zero critical lint errors
- Accessibility checks (labels, focus, keyboard) in critical flows
- Performance budgets and lazy-loading strategy
- Centralized error handler and consistent API error schema
- Secure headers (Helmet), strict CORS, rate limiting
- Secrets never logged; structured logs with correlation IDs
- DB migrations and seed scripts reproducible; tests use isolated DB
- Clear module boundaries; avoid duplicate utilities
- Dependency hygiene (pinning, removals, vulnerability checks)

## 20% Testing Strategy → 80% Gains
- Smoke tests: App boot, router mount, env validation failure path
- Critical journeys: Login, search, view details, create/update core entity, logout
- Integration tests: Server routers and controllers with DB (happy + primary error cases)
- Client data flows: Query hooks, cache invalidation, error handling UI states
- E2E: One per core journey with minimal assertions; record screenshots on failure
- Accessibility: Axe on key pages/components
- Coverage focus: Reducers, utilities, data mappers, error boundaries
- Regression: Tests for previously broken paths (found in Phase 1)

## Deliverables
- Fixed client and server bugs tied to migrations
- Unified state/data/env/observability approaches
- Best‑practices checklist committed and referenced by CI
- Updated and new tests with coverage thresholds
- Rollup notes and minimal docs in code where helpful

## Order of Work
1) Audit and reproduce bugs; compile migration map
2) Frontend fixes and unification
3) Server fixes and normalization
4) Cross‑cutting hygiene and dependency cleanup
5) Tests update + additions; set coverage gates
6) Performance and error budget verification
7) Staged rollout and guardrails

## Verification Plan
- Run `vitest` unit/integration suites with coverage
- Run Playwright E2E for core journeys
- Check bundle sizes and error rates vs baseline
- Manual spot-check of key flows post‑deployment