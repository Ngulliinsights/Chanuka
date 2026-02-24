# Requirements Document

## Introduction

The Chanuka client codebase has type inconsistencies causing ~1000+ TypeScript errors. Type definitions are scattered across `@types/`, `lib/types/`, `features/*/types.ts`, and `shared/types/`. This migration establishes `client/src/lib/types/` as the single source of truth for client types.

## Requirements

### Requirement 1: Single Source of Truth

**User Story:** As a developer, I want all client types centralized in `lib/types/`, so that I know where to find and update type definitions.

#### Acceptance Criteria

1. WHEN importing client types THEN developers SHALL use `@client/lib/types` or module entry points
2. WHEN a type is defined THEN it SHALL exist in only one location
3. WHEN `@types/` contains client types THEN those types SHALL be migrated or deleted

### Requirement 2: Core Module Type Proxies

**User Story:** As a developer, I want core modules to expose their types via entry points, so that I don't need to know internal type locations.

#### Acceptance Criteria

1. WHEN importing storage types THEN I SHALL import from `@client/infrastructure/storage`
2. WHEN importing security types THEN I SHALL import from `@client/infrastructure/security`
3. WHEN core modules have `types.ts` THEN it SHALL re-export from `lib/types`

### Requirement 3: Mock Data Type Alignment

**User Story:** As a developer, I want mock data to match shared types, so that tests accurately reflect production behavior.

#### Acceptance Criteria

1. WHEN mock data generates a Bill THEN it SHALL conform to `Bill` interface
2. WHEN mock data uses enums THEN it SHALL import them as values (not `type`)
3. WHEN `tsc` runs on mock data THEN there SHALL be zero type errors

### Requirement 4: Zero TSC Errors

**User Story:** As a developer, I want the client to compile without errors, so that I can trust the type system.

#### Acceptance Criteria

1. WHEN `npx tsc --noEmit` runs THEN exit code SHALL be 0
2. WHEN errors exist THEN count SHALL decrease with each migration phase
3. WHEN migration completes THEN error count SHALL be under 100
