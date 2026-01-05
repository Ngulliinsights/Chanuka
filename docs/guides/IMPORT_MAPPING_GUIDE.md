# CLIENT IMPORT MAPPING & FIX GUIDE

## Overview

This document maps all import errors found during TypeScript compilation and provides the correct import paths based on the actual project structure.

---

## CRITICAL IMPORT ERRORS & CORRECTIONS

### **Category 1: Error Handling Components**

**File:** `src/app/shell/AppRouter.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `../error-handling/ErrorBoundary` | Directory doesn't exist | `@client/core/error/components/ErrorBoundary` | Line 6 |

**File:** `src/app/shell/AppShell.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `../accessibility/accessibility-manager` | Directory path wrong | `@client/core/browser/accessibility-manager` | Line 9 |
| `../loading/GlobalLoadingIndicator` | Wrong path | `@client/shared/ui/loading/GlobalLoadingIndicator` | Line 10 |
| `../loading/LoadingStates` | Wrong path | `@client/shared/ui/loading/LoadingStates` | Line 11 |
| `../offline/offline-manager` | Wrong path | `@client/shared/ui/offline/offline-manager` | Line 12 |
| `../ui/toaster` | Wrong path | `@client/shared/design-system/feedback/toaster` | Line 13 |
| `react-error-boundary` | Missing dependency | Install or use built-in | Line 2 |

**File:** `src/app/shell/NavigationBar.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `../icons/SimpleIcons` | Directory doesn't exist | `@client/shared/design-system/interactive/icons` | Line 11 |
| `../ui/avatar` | Wrong path | `@client/shared/design-system/primitives/avatar` | Line 12 |
| `../ui/badge` | Wrong path | `@client/shared/design-system/primitives/badge` | Line 13 |
| `../ui/button` | Wrong path | `@client/shared/design-system/primitives/button` | Line 14 |
| `../ui/dropdown-menu` | Wrong path | `@client/shared/design-system/primitives/dropdown-menu` | Line 22 |
| `../ui/input` | Wrong path | `@client/shared/design-system/primitives/input` | Line 23 |

**File:** `src/app/shell/ProtectedRoute.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `lucide-react` - `UserX` | Icon doesn't exist | Use `User` instead | Line 1 |
| `../loading/LoadingStates` | Wrong path | `@client/shared/ui/loading/LoadingStates` | Line 8 |
| `../ui/alert` | Wrong path | `@client/shared/design-system/primitives/alert` | Line 9 |
| `../ui/button` | Wrong path | `@client/shared/design-system/primitives/button` | Line 10 |

### **Category 2: Components/Index File Exports**

**File:** `src/components/AppProviders.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./accessibility/accessibility-manager` | Relative path | `@client/core/browser/accessibility-manager` | Line 27 |
| `./error-handling/SimpleErrorBoundary` | Path doesn't exist | `@client/core/error/components/ErrorBoundary` | Line 28 |
| `./offline/offline-manager` | Path doesn't exist | `@client/shared/ui/offline/offline-manager` | Line 29 |

**File:** `src/components/index.ts` (Barrel Export Issues)

All these should be removed or commented out if components don't exist:

```typescript
// Line 9 - connection-status doesn't exist
export { default as ConnectionStatus } from './connection-status';

// Line 10 - database-status doesn't exist in components/
export { default as DatabaseStatus } from './database-status';

// Line 11 - error-handling/ErrorBoundary doesn't exist here
export { ErrorBoundary } from './error-handling/ErrorBoundary';

// Line 13 - OfflineIndicator might be in shared/ui
export { OfflineIndicator } from './OfflineIndicator';

// Line 14 - OfflineModal doesn't exist
export { OfflineModal } from './OfflineModal';

// Lines 17-18, 21-24, 27-28 - Components might be in features/ instead
export { ...
```

**File:** `src/components/LazyPageWrapper.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `@client/core/loading/components/LoadingStates` | Path doesn't exist | `@client/shared/ui/loading/LoadingStates` | Line 3 |

**File:** `src/components/MigrationManager.tsx`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./ui/badge` | Wrong path | `@client/shared/design-system/primitives/badge` | Line 3 |
| `./ui/button` | Wrong path | `@client/shared/design-system/primitives/button` | Line 4 |
| `./ui/card` | Wrong path | `@client/shared/design-system/primitives/card` | Line 5 |
| `./ui/skeleton` | Wrong path | `@client/shared/design-system/primitives/skeleton` | Line 6 |

**File:** `src/components/shared/index.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./dashboard` | Doesn't exist in components/shared | Delete or update | Line 4 |
| `./privacy` | Might be in different location | Check path | Line 7 |
| `./auth` | Doesn't exist here | `@client/core/auth` | Line 10 |
| `./utils` | Check if exists | Verify path | Line 13 |
| `./types` | Check if exists | Verify path | Line 16 |

### **Category 3: Core API Module Imports**

**File:** `src/core/api/analytics.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./errors` | File doesn't exist | Create or import from types | Line 19 |

**File:** `src/core/api/bills.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./errors` | File doesn't exist | Create or import from types | Line 13 |
| `Bill` export from `./types` | Not exported | Add to types.ts exports | Line 83 |

**File:** `src/core/api/cache-manager.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `CacheEntry` from `../storage/types` | Not exported | Add to storage/types exports | Line 13 |
| `CacheStats` from `../storage/types` | Not exported | Add to storage/types exports | Line 13 |

**File:** `src/core/api/client.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `./errors` | File doesn't exist | Create or move type | Line 11 |
| `./cache` | Wrong path | Should be `./cache-manager` | Line 889 |

**File:** `src/core/api/community.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `Comment` from `../../types/community` | Not exported | Export from community types | Line 35 |
| `./errors` | File doesn't exist | Create type definitions | Line 45 |

**File:** `src/core/api/hooks/use-api-with-fallback.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `ErrorCode` from `@client/core/api/types` | Not exported | Export from types or create | Line 12 |

**File:** `src/core/api/hooks/use-safe-mutation.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `@client/utils/api` | Doesn't exist | Remove or create module | Line 3 |
| `AuthenticatedAPI` type | Undefined | Import from correct location | Line 33 |

**File:** `src/core/api/hooks/use-safe-query.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `@client/utils/api` | Doesn't exist | Remove or verify | Line 14 |
| `APIResponse` type | Undefined | Define or import | Line 84 |
| `AuthenticatedAPI` type | Undefined | Import from correct location | Line 89 |

**File:** `src/core/api/hooks/useApiConnection.ts`

| Current Import | Issue | Correct Import | Location |
|---|---|---|---|
| `@client/utils/api` | Doesn't exist | Remove or verify | Line 3 |
| `AuthenticatedAPI` type | Undefined | Import from correct location | Line 52 |

---

## ACTUAL PROJECT STRUCTURE MAPPING

### Error Handling Module
```
client/src/core/error/                    ← Primary location
├── components/
│   ├── ErrorBoundary.tsx                 ← Use this
│   ├── index.ts
│   └── utils/
├── index.ts                              ← Re-exports all
├── handler.ts
├── types.ts
└── ...
```

**Correct imports:**
```typescript
// For components
import { ErrorBoundary } from '@client/core/error/components';
import { ErrorBoundary } from '@client/core/error'; // Via barrel export

// For types
import type { AppError, ErrorContext } from '@client/core/error';
```

### Loading Components Module
```
client/src/shared/ui/loading/             ← Primary location
├── LoadingStates.tsx                     ← Use this
├── GlobalLoadingIndicator.tsx            ← Use this
├── LoadingSpinner.tsx
├── index.ts                              ← Re-exports all
├── types.ts
├── hooks/
└── utils/
```

**Correct imports:**
```typescript
import { LoadingStates } from '@client/shared/ui/loading';
import { GlobalLoadingIndicator } from '@client/shared/ui/loading';
import { LoadingSpinner } from '@client/shared/ui/loading';

// All available via barrel export or direct import
```

### Offline Manager Module
```
client/src/shared/ui/offline/             ← Primary location
├── offline-manager.tsx
├── OfflineIndicator.tsx
└── index.ts
```

**Correct imports:**
```typescript
import { OfflineProvider } from '@client/shared/ui/offline';
import { OfflineIndicator } from '@client/shared/ui/offline';
```

### Design System Components
```
client/src/shared/design-system/
├── primitives/                           ← UI components
│   ├── button/
│   ├── badge/
│   ├── card/
│   ├── alert/
│   ├── avatar/
│   ├── input/
│   ├── skeleton/
│   ├── dropdown-menu/
│   └── ...
├── feedback/                             ← Feedback components
│   ├── toaster/
│   ├── toast/
│   └── ...
├── interactive/                          ← Interactive components
│   ├── icons/
│   └── ...
└── index.ts                              ← Barrel export
```

**Correct imports:**
```typescript
// Option 1: Via barrel export
import { Button, Badge, Card } from '@client/shared/design-system';

// Option 2: Direct import (more specific)
import { Button } from '@client/shared/design-system/primitives/button';
import { Card } from '@client/shared/design-system/primitives/card';
import { Toaster } from '@client/shared/design-system/feedback/toaster';
```

---

## MAPPING TABLE: File-by-File Fixes

This table shows all files that need import corrections:

| File | Errors | Solution |
|------|--------|----------|
| `src/app/shell/AppRouter.tsx` | 2 | Update error boundary and loading imports |
| `src/app/shell/AppShell.tsx` | 6 | Update all relative imports to absolute |
| `src/app/shell/NavigationBar.tsx` | 6 | Update UI component imports |
| `src/app/shell/ProtectedRoute.tsx` | 4 | Fix icon, loading, and UI imports |
| `src/app/shell/index.ts` | Check | May need barrel exports |
| `src/components/AppProviders.tsx` | 3 | Update to correct module paths |
| `src/components/index.ts` | 8+ | Remove non-existent exports or update |
| `src/components/LazyPageWrapper.tsx` | 1 | Fix loading import |
| `src/components/MigrationManager.tsx` | 4 | Update design system imports |
| `src/components/shared/index.ts` | 5 | Verify all exports exist |
| `src/core/api/analytics.ts` | 1 | Create or import errors type |
| `src/core/api/bills.ts` | 2 | Export Bill type, create errors |
| `src/core/api/cache-manager.ts` | 2 | Export CacheEntry, CacheStats |
| `src/core/api/client.ts` | 2 | Create errors, fix cache import |
| `src/core/api/community.ts` | 2 | Export Comment, create errors |
| `src/core/api/hooks/use-api-with-fallback.ts` | 1 | Export ErrorCode |
| `src/core/api/hooks/use-safe-mutation.ts` | 3 | Remove @client/utils/api, define types |
| `src/core/api/hooks/use-safe-query.ts` | 3 | Define APIResponse, AuthenticatedAPI |
| `src/core/api/hooks/useApiConnection.ts` | 2 | Remove @client/utils/api, define types |
| `src/core/api/index.ts` | 1 | Fix CacheEntry export |

---

## IMPLEMENTATION STRATEGY

### Phase 1: Create Missing Type Definitions (30 min)
1. Create `src/core/api/types/errors.ts` with error type definitions
2. Export missing types from `src/core/api/types.ts`:
   - `Bill`
   - `ErrorCode`
   - `APIResponse`
   - `AuthenticatedAPI`
3. Export missing types from `src/core/storage/types.ts`:
   - `CacheEntry`
   - `CacheStats`
4. Export from `src/types/community.ts`:
   - `Comment`

### Phase 2: Fix Import Paths in App Shell (1 hour)
1. Fix `src/app/shell/AppRouter.tsx`
2. Fix `src/app/shell/AppShell.tsx`
3. Fix `src/app/shell/NavigationBar.tsx`
4. Fix `src/app/shell/ProtectedRoute.tsx`
5. Fix `src/app/shell/index.ts` barrel export

### Phase 3: Fix Component Imports (1-2 hours)
1. Fix `src/components/AppProviders.tsx`
2. Fix `src/components/index.ts` - remove/update non-existent exports
3. Fix `src/components/LazyPageWrapper.tsx`
4. Fix `src/components/MigrationManager.tsx`
5. Fix `src/components/shared/index.ts`

### Phase 4: Fix Core API Module (2-3 hours)
1. Create missing error types
2. Add missing exports to all type files
3. Fix all hook imports
4. Update relative imports to absolute paths

### Phase 5: Remove/Fix Legacy Relative Imports (1 hour)
1. Search for patterns like `../error-handling`, `../loading`, `../ui`
2. Replace with correct absolute paths using `@client/*`
3. Run typecheck to verify

### Phase 6: Verify & Test (30 min)
```bash
pnpm run --filter=client typecheck
pnpm run --filter=client lint
```

---

## QUICK REFERENCE: Module Locations

| Module | Location | Barrel Export Available |
|--------|----------|-------------------------|
| Error Handling | `@client/core/error` | ✅ Yes |
| Auth | `@client/core/auth` | ✅ Yes |
| Loading | `@client/shared/ui/loading` | ✅ Yes |
| Offline | `@client/shared/ui/offline` | ✅ Yes |
| Design System | `@client/shared/design-system` | ✅ Yes |
| API Client | `@client/core/api` | ✅ Yes |
| Types | `@client/types/*` | 🟡 Partial |
| Utils | `@client/utils/*` | 🟡 Partial |

---

## NOTES

1. **Barrel Exports**: Most modules have `index.ts` files that re-export their contents. Use these for cleaner imports.

2. **Path Aliases**: Always prefer `@client/*`, `@shared/*`, `@server/*` over relative paths.

3. **Non-existent Modules**: The following don't exist and should be removed or created as needed:
   - `@client/utils/api` - Remove or verify
   - `../error-handling` - Use `@client/core/error`
   - `../loading` (in app/shell) - Use `@client/shared/ui/loading`
   - `../ui` (in app/shell) - Use `@client/shared/design-system`

4. **lucide-react Icons**: `UserX` doesn't exist. Use `User` or check available icons.

5. **React Error Boundary**: Consider using the built-in `@client/core/error` implementation instead of the external `react-error-boundary` package for consistency.
