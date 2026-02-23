# Structural Ambiguities - FSD Migration Boundary Analysis

## Overview

This document identifies duplicated modules between `client/src/lib/` and `client/src/features/` that resulted from the incomplete Feature-Sliced Design (FSD) migration. For each duplicate pair, we determine the canonical version and classify stale imports.

**Analysis Date**: Task 12.1 - FSD Migration Boundary Investigation

---

## Duplicate Pairs Identified

### 1. User Service

**Old Location (Stale)**: `client/src/lib/services/userService.ts`
**New Location (Canonical)**: `client/src/features/users/model/user-service.ts`

**Status**: Partial migration with legacy compatibility layer

**Evidence**:
- `features/users/model/user-service.ts` - New decomposed service implementation
- `features/users/services/user-service-legacy.ts` - Compatibility layer that delegates to new services
- `lib/services/userService.ts` - Old monolithic implementation

**Decision**: 
- **Canonical**: `features/users/model/user-service.ts` (new FSD-compliant implementation)
- **Stale**: `lib/services/userService.ts` (old implementation)
- **Transitional**: `features/users/services/user-service-legacy.ts` (compatibility shim)

**Migration Status**: In progress - legacy compatibility layer exists to support gradual migration

**Importers to Update**:
- Files importing from `@client/lib/services/userService` should migrate to `@client/features/users/model/user-service`
- Exception: Files using legacy API can temporarily use `@client/features/users/services/user-service-legacy`

**Category**: A (Stale Path) for direct imports to old location

---

### 2. Notification Service

**Old Location (Stale)**: `client/src/lib/services/notification-service.ts`
**New Location (Canonical)**: `client/src/features/notifications/model/notification-service.ts`

**Status**: Migrated to FSD structure

**Evidence**:
- `features/notifications/model/notification-service.ts` exists
- `features/notifications/model/index.ts` exports `notificationService`
- `lib/services/notification-service.ts` still exists

**Decision**:
- **Canonical**: `features/notifications/model/notification-service.ts` (FSD-compliant)
- **Stale**: `lib/services/notification-service.ts` (old location)

**Importers to Update**:
- Files importing from `@client/lib/services/notification-service` should use `@client/features/notifications/model`

**Category**: A (Stale Path)

---

### 3. useAuth Hook

**Old Location (Stale)**: `client/src/core/auth/hooks/useAuth.tsx`
**New Location (Canonical)**: `client/src/features/users/hooks/useAuth.tsx`

**Status**: Duplicate implementations (documented in HOTSPOT-3)

**Evidence**:
- Both files exist in the codebase
- Project structure reference marks this as HOTSPOT-3

**Decision**:
- **Canonical**: `features/users/hooks/useAuth.tsx` (FSD principle: user-related features belong in features/users)
- **Stale**: `core/auth/hooks/useAuth.tsx` (auth infrastructure should be in core, but user-facing hook belongs in features)

**Rationale**: Per FSD principles, hooks that are specific to user features should live in `features/users/`, while core auth infrastructure (services, config, utils) remains in `core/auth/`.

**Importers to Update**:
- Files importing from `@/core/auth/hooks/useAuth` should use `@/features/users/hooks/useAuth`

**Category**: A (Stale Path)

**Note**: Need to compare implementations to verify they are identical or document divergence.

---

### 4. Security UI Components

**Old Location (Stale)**: `client/src/core/security/ui/`
**New Location (Canonical)**: `client/src/features/security/ui/`

**Status**: Complete duplication (documented in HOTSPOT-2)

**Evidence**:
- Both directories contain identical structure:
  - `dashboard/` (SecureForm.tsx, SecurityDashboard.tsx, SecuritySettings.tsx)
  - `icons/` (ChanukaIcons.tsx)
  - `privacy/` (CookieConsentBanner.tsx, DataUsageReportDashboard.tsx, GDPRComplianceManager.tsx, etc.)

**Decision**:
- **Canonical**: `features/security/ui/` (FSD principle: user-facing UI belongs in features)
- **Stale**: `core/security/ui/` (security infrastructure belongs in core, but UI components belong in features)

**Rationale**: Per FSD, `core/` should contain infrastructure and services, while `features/` contains user-facing UI and business logic. Security UI components are user-facing and belong in features.

**Importers to Update**:
- Files importing from `@/core/security/ui` should use `@/features/security/ui`

**Category**: A (Stale Path)

---

### 5. Loading Utilities

**Old Location (Stale)**: `client/src/core/loading/utils/`
**New Location (Canonical)**: `client/src/lib/ui/loading/utils/`

**Status**: Duplication with naming inconsistency (documented in HOTSPOT-4)

**Evidence**:
- `core/loading/utils/` contains: connection-utils.ts, loading-utils.ts, progress-utils.ts, timeout-utils.ts
- `lib/ui/loading/utils/` contains same files PLUS `loadingUtils.ts` (camelCase variant - red flag)

**Decision**:
- **Canonical**: `lib/ui/loading/utils/` (shared UI utilities belong in lib)
- **Stale**: `core/loading/utils/` (duplicate location)
- **Red Flag**: `loadingUtils.ts` (camelCase) suggests incomplete file rename/migration

**Rationale**: Loading utilities are shared UI infrastructure, not core business logic. Per FSD, shared UI utilities belong in `lib/ui/`.

**Importers to Update**:
- Files importing from `@/core/loading/utils` should use `@/lib/ui/loading/utils`

**Category**: A (Stale Path)

**Investigation Needed**: 
- Check if `loadingUtils.ts` is a duplicate of `loading-utils.ts`
- Verify if one re-exports from the other

---

## FSD Migration Principles Applied

### What Belongs Where

**`core/`** - Infrastructure and cross-cutting concerns:
- Auth services, config, token management
- API clients and interceptors
- Error handling infrastructure
- WebSocket managers
- Security services (not UI)
- Analytics services
- Performance monitoring

**`features/`** - User-facing features and business logic:
- Feature-specific UI components
- Feature-specific hooks
- Feature-specific services
- Feature-specific state management
- User-facing dashboards and pages

**`lib/`** - Shared utilities and infrastructure:
- Shared UI components (not feature-specific)
- Shared hooks (not feature-specific)
- Shared utilities
- Shared types
- Design system components

### Migration Boundary Issues

The incomplete FSD migration has left code in three states:

1. **Fully Migrated**: Code moved to correct FSD location, old location deleted
2. **Partially Migrated**: Code copied to new location, old location still exists (duplicates)
3. **Not Migrated**: Code still in old location, no new location exists

This analysis focuses on **Partially Migrated** code (duplicates).

---

## Summary Statistics

| Duplicate Type | Old Location | New Location | Status |
|----------------|--------------|--------------|--------|
| User Service | lib/services/ | features/users/model/ | Partial (legacy shim exists) |
| Notification Service | lib/services/ | features/notifications/model/ | Complete duplicate |
| useAuth Hook | core/auth/hooks/ | features/users/hooks/ | Complete duplicate |
| Security UI | core/security/ui/ | features/security/ui/ | Complete duplicate |
| Loading Utils | core/loading/utils/ | lib/ui/loading/utils/ | Complete duplicate + naming issue |

**Total Duplicate Pairs**: 5

**Next Steps**:
1. Compare implementations to verify identical vs diverged
2. Find all importers of stale paths
3. Categorize each import as Category A (stale path)
4. Update imports one file at a time per manual fix protocol

---

## Notes

- All duplicates identified follow FSD principles for canonical location
- Legacy compatibility layers (like user-service-legacy.ts) are intentional transitional code
- The `loadingUtils.ts` camelCase variant suggests incomplete file rename - needs investigation
- Some files may have diverged since duplication - comparison needed before consolidation

