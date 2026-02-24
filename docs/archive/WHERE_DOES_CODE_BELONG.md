# Where Does My Code Belong? - Quick Reference

## TL;DR Decision Tree

```
Is it a React component used by 3+ features?
├─ YES → lib/ui/
└─ NO → Is it feature-specific UI?
    ├─ YES → features/{feature}/ui/
    └─ NO → Is it infrastructure/cross-cutting?
        ├─ YES → core/
        └─ NO → Is it a pure utility function?
            ├─ YES → lib/utils/
            └─ NO → features/{feature}/lib/
```

---

## Quick Reference Table

| What I'm Building | Where It Goes | Example |
|-------------------|---------------|---------|
| **Reusable button/input/modal** | `lib/ui/` | `Button.tsx`, `Input.tsx`, `Modal.tsx` |
| **Design token/theme** | `lib/design-system/` | `colors.ts`, `spacing.ts`, `theme.ts` |
| **Pure utility (no deps)** | `lib/utils/` | `cn()`, `formatDate()`, `debounce()` |
| **Shared TypeScript type** | `lib/types/` | `ApiResponse<T>`, `PaginatedResult<T>` |
| **UI hook (useState wrapper)** | `lib/hooks/` | `useMediaQuery()`, `useDebounce()` |
| **HTTP client/interceptor** | `core/api/` | Axios setup, retry logic, interceptors |
| **Auth infrastructure** | `core/auth/` | Token manager, session handler |
| **Error handling system** | `core/error/` | Error boundary, error reporter |
| **Performance monitoring** | `core/monitoring/` | Web vitals, performance budgets |
| **Browser compatibility** | `core/browser/` | Feature detection, polyfills |
| **Storage abstraction** | `core/storage/` | LocalStorage wrapper, cache manager |
| **WebSocket infrastructure** | `core/realtime/` | WebSocket manager, connection pool |
| **Feature business logic** | `features/{feature}/model/` | State management, domain logic |
| **Feature API calls** | `features/{feature}/api/` | `getBills()`, `updateProfile()` |
| **Feature UI components** | `features/{feature}/ui/` | `BillCard.tsx`, `UserProfileForm.tsx` |
| **Feature pages** | `features/{feature}/pages/` | `BillDetailPage.tsx`, `DashboardPage.tsx` |
| **Feature hooks** | `features/{feature}/lib/` | `useBills()`, `useUserProfile()` |
| **Feature utilities** | `features/{feature}/lib/` | Feature-specific helpers |

---

## Detailed Guidelines

### `lib/` - Shared UI Library

**Purpose**: Reusable UI components, design system, and pure utilities used across multiple features.

**What belongs here**:
- ✅ UI components used by 3+ features (Button, Input, Modal, Card)
- ✅ Design system (tokens, theme, typography, spacing)
- ✅ Pure utility functions (no business logic)
- ✅ Shared TypeScript types (generic types only)
- ✅ UI-related hooks (useMediaQuery, useDebounce, useToast)

**What does NOT belong here**:
- ❌ Infrastructure code (HTTP, auth, error handling)
- ❌ Business logic
- ❌ Feature-specific code
- ❌ API calls
- ❌ State management
- ❌ Test/demo code

**Example Structure**:
```
lib/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Modal.tsx
├── design-system/         # Design tokens and theme
│   ├── tokens/
│   ├── theme/
│   └── styles/
├── utils/                 # Pure utilities
│   ├── cn.ts
│   ├── formatters.ts
│   └── validators.ts
├── types/                 # Shared types
│   └── common.ts
└── hooks/                 # UI hooks
    ├── useMediaQuery.ts
    ├── useDebounce.ts
    └── useToast.ts
```

---

### `core/` - Infrastructure & Cross-Cutting Concerns

**Purpose**: Technical infrastructure and cross-cutting concerns that support all features.

**What belongs here**:
- ✅ HTTP client and API infrastructure
- ✅ Authentication and authorization
- ✅ Error handling and recovery
- ✅ Performance monitoring
- ✅ Browser compatibility
- ✅ Storage abstractions
- ✅ WebSocket infrastructure
- ✅ Security utilities
- ✅ Logging and telemetry

**What does NOT belong here**:
- ❌ UI components
- ❌ Feature-specific business logic
- ❌ Feature-specific API calls
- ❌ Feature-specific state management

**Example Structure**:
```
core/
├── api/                   # HTTP infrastructure
│   ├── client.ts
│   ├── interceptors.ts
│   └── retry.ts
├── auth/                  # Auth infrastructure
│   ├── services/
│   ├── hooks/
│   └── types.ts
├── error/                 # Error handling
│   ├── handler.ts
│   ├── boundary.tsx
│   └── recovery.ts
├── monitoring/            # Performance monitoring
│   ├── web-vitals.ts
│   └── performance.ts
└── realtime/             # WebSocket infrastructure
    ├── manager.ts
    ├── services/
    └── hooks/
```

---

### `features/` - Business Features (FSD)

**Purpose**: Self-contained business features following Feature-Sliced Design principles.

**What belongs here**:
- ✅ Feature-specific business logic
- ✅ Feature-specific API calls
- ✅ Feature-specific UI components
- ✅ Feature-specific state management
- ✅ Feature-specific hooks and utilities
- ✅ Feature pages

**What does NOT belong here**:
- ❌ Reusable UI components (use lib/ui/)
- ❌ Infrastructure code (use core/)
- ❌ Code used by 3+ features (extract to lib/ or core/)

**Standard Feature Structure**:
```
features/{feature}/
├── index.ts              # Public API (what other features can import)
├── types.ts              # Feature-specific types
├── model/                # Business logic & state
│   ├── store.ts         # Redux/Zustand store
│   ├── selectors.ts     # State selectors
│   └── actions.ts       # Actions/reducers
├── api/                  # API calls
│   └── {feature}-api.ts # Feature API client
├── lib/                  # Hooks & utilities
│   ├── hooks.ts         # Feature hooks
│   └── utils.ts         # Feature utilities
├── ui/                   # UI components
│   ├── {Feature}Card.tsx
│   ├── {Feature}List.tsx
│   └── {Feature}Form.tsx
└── pages/                # Page components
    ├── {Feature}Page.tsx
    └── {Feature}DetailPage.tsx
```

**Example - Bills Feature**:
```
features/bills/
├── index.ts              # Exports: BillCard, BillList, useBills, etc.
├── types.ts              # Bill, BillStatus, BillFilters
├── model/                # Bill state management
│   └── store.ts
├── api/                  # Bill API calls
│   └── bills-api.ts     # getBills(), getBill(), updateBill()
├── lib/                  # Bill hooks & utils
│   ├── hooks.ts         # useBills(), useBill(), useBillComments()
│   └── utils.ts         # formatBillStatus(), filterBills()
├── ui/                   # Bill UI components
│   ├── BillCard.tsx
│   ├── BillList.tsx
│   └── BillHeader.tsx
└── pages/                # Bill pages
    ├── BillsPage.tsx
    └── BillDetailPage.tsx
```

---

## Common Scenarios

### Scenario 1: I'm building a new button component

**Question**: Will this button be used by 3+ features?
- **YES** → `lib/ui/Button.tsx`
- **NO** → `features/{feature}/ui/{Feature}Button.tsx`

### Scenario 2: I'm adding API calls for a feature

**Question**: Is this a generic HTTP utility or feature-specific?
- **Generic** (retry logic, interceptors) → `core/api/`
- **Feature-specific** (getBills, updateProfile) → `features/{feature}/api/`

### Scenario 3: I'm creating a custom hook

**Question**: What does the hook do?
- **UI utility** (useMediaQuery, useDebounce) → `lib/hooks/`
- **Infrastructure** (useAuth, useErrorHandler) → `core/{module}/hooks/`
- **Feature logic** (useBills, useUserProfile) → `features/{feature}/lib/hooks.ts`

### Scenario 4: I'm adding TypeScript types

**Question**: Where are these types used?
- **Shared across 3+ features** → `lib/types/`
- **Infrastructure types** → `core/{module}/types.ts`
- **Feature-specific** → `features/{feature}/types.ts`

### Scenario 5: I'm building error handling

**Question**: Is this error handling infrastructure or feature-specific?
- **Infrastructure** (error boundary, error reporter) → `core/error/`
- **Feature-specific** (bill validation errors) → `features/bills/lib/errors.ts`

### Scenario 6: I'm adding a utility function

**Question**: Does this function have dependencies?
- **Pure function** (no deps) → `lib/utils/`
- **Uses infrastructure** (API, storage) → `core/{module}/utils.ts`
- **Feature-specific** → `features/{feature}/lib/utils.ts`

---

## Anti-Patterns to Avoid

### ❌ Don't: Put infrastructure in `lib/`
```typescript
// BAD: lib/services/api-client.ts
export const apiClient = axios.create({...});
```
```typescript
// GOOD: core/api/client.ts
export const apiClient = axios.create({...});
```

### ❌ Don't: Put feature logic in `core/`
```typescript
// BAD: core/bills/get-bills.ts
export const getBills = () => {...};
```
```typescript
// GOOD: features/bills/api/bills-api.ts
export const getBills = () => {...};
```

### ❌ Don't: Put feature-specific UI in `lib/`
```typescript
// BAD: lib/ui/BillCard.tsx
export const BillCard = ({bill}) => {...};
```
```typescript
// GOOD: features/bills/ui/BillCard.tsx
export const BillCard = ({bill}) => {...};
```

### ❌ Don't: Duplicate code across directories
```typescript
// BAD: Same code in lib/hooks/use-bills.ts AND features/bills/lib/hooks.ts
```
```typescript
// GOOD: Pick ONE location based on usage
```

---

## When in Doubt

1. **Start in the feature** - Build it in `features/{feature}/` first
2. **Extract when needed** - Only move to `lib/` or `core/` when used by 3+ features
3. **Follow the pattern** - Look at `core/realtime/` as the gold standard
4. **Ask the team** - When unclear, discuss in PR review

---

## Import Patterns

### Importing from `lib/`
```typescript
// UI components
import { Button, Input, Modal } from '@/lib/ui';

// Design system
import { colors, spacing } from '@/lib/design-system';

// Utilities
import { cn, formatDate } from '@/lib/utils';

// Types
import type { ApiResponse } from '@/lib/types';
```

### Importing from `core/`
```typescript
// API infrastructure
import { apiClient } from '@/infrastructure/api';

// Auth
import { useAuth } from '@/infrastructure/auth';

// Error handling
import { handleError } from '@/infrastructure/error';

// Monitoring
import { trackPerformance } from '@/infrastructure/monitoring';
```

### Importing from `features/`
```typescript
// Feature exports (via index.ts)
import { BillCard, useBills } from '@/features/bills';
import { UserProfile, useUserProfile } from '@/features/users';

// Direct imports (avoid if possible)
import { BillCard } from '@/features/bills/ui/BillCard';
```

---

## Checklist for New Code

Before committing:
- [ ] Code is in the correct directory per this guide
- [ ] No duplication with existing code
- [ ] Imports use correct paths
- [ ] Types are in the right location
- [ ] Feature has standard structure (if applicable)
- [ ] Public API exported via index.ts
- [ ] No circular dependencies
- [ ] Tests are co-located with code

---

## Need Help?

- 📚 Read: `CLIENT_ARCHITECTURE_BOUNDARIES_ANALYSIS.md`
- 📋 Check: `CLIENT_CONSOLIDATION_IMPLEMENTATION_PLAN.md`
- 🔍 Example: Look at `core/realtime/` for best practices
- 💬 Ask: Team in PR r