# IMPORT ERROR FIX EXECUTION PLAN

**Generated:** December 10, 2025  
**Scope:** Client TypeScript Import Errors  
**Total Errors to Fix:** 80+  
**Estimated Time:** 3-4 hours

---

## SUMMARY OF IMPORT ERRORS BY CATEGORY

### Category Breakdown

| Category | File Count | Error Count | Priority |
|----------|-----------|------------|----------|
| **App Shell Imports** | 4 | 18 | CRITICAL |
| **Component Barrel Exports** | 3 | 15+ | CRITICAL |
| **Core API Exports** | 9 | 25+ | HIGH |
| **Type Exports** | 5 | 8+ | HIGH |
| **Relative Path Issues** | 12 | 15+ | MEDIUM |
| **Lucide Icons** | 1 | 1 | LOW |

---

## PHASE 1: FIX APP SHELL IMPORTS (CRITICAL)

### File 1: `src/app/shell/AppRouter.tsx`

**Lines 6-7: Error/Loading Boundary Imports**

```typescript
// ❌ WRONG (Current)
import { ErrorBoundary } from '../error-handling/ErrorBoundary';
import { LoadingStateManager } from '../loading/LoadingStates';

// ✅ CORRECT
import { ErrorBoundary } from '@client/core/error/components';
import { LoadingStateManager } from '@client/shared/ui/loading';
```

**Additional Issues:**
- Line 9: `ModeratorRoute` imported but unused - Keep (needed for routes below)
- Line 54: `CookiePolicyPage` imported but unused - Keep (needed for routes)
- Line 149: `props` parameter needs type - Add type from React or define interface
- Line 152: `error` and `errorInfo` parameters need types
- Line 325: Type mismatch with `unknown` - Add proper type casting
- Line 347: Destructuring parameters need types

---

### File 2: `src/app/shell/AppShell.tsx`

**Line 2: External Dependency Issue**

```typescript
// ❌ WRONG
import { ErrorBoundary } from 'react-error-boundary';

// ✅ CORRECT - Use built-in implementation
import { ErrorBoundary } from '@client/core/error/components';
// Or import the component wrapper if exists:
// import { ErrorBoundary } from '@client/core/error';
```

**Lines 9-13: Relative Path Imports**

```typescript
// ❌ WRONG (Current)
import { AccessibilityProvider } from '../accessibility/accessibility-manager';
import { GlobalLoadingIndicator } from '../loading/GlobalLoadingIndicator';
import { LoadingStateManager } from '../loading/LoadingStates';
import { OfflineProvider } from '../offline/offline-manager';
import { Toaster } from '../ui/toaster';

// ✅ CORRECT
import { AccessibilityManager as AccessibilityProvider } from '@client/core/browser';
import { GlobalLoadingIndicator } from '@client/shared/ui/loading';
import { LoadingStateManager } from '@client/shared/ui/loading';
import { OfflineProvider } from '@client/shared/ui/offline';
import { Toaster } from '@client/shared/design-system/feedback';
```

**Additional Issues:**
- Line 61: `location` property on `never` type - Fix error boundary callback types

---

### File 3: `src/app/shell/NavigationBar.tsx`

**Lines 11-23: UI Component Imports**

```typescript
// ❌ WRONG (Current)
import { SimpleIcons } from '../icons/SimpleIcons';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
// ... (skip to line 22)
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';

// ✅ CORRECT
import { SimpleIcons } from '@client/shared/design-system/interactive/icons';
import { Avatar } from '@client/shared/design-system/primitives/avatar';
import { Badge } from '@client/shared/design-system/primitives/badge';
import { Button } from '@client/shared/design-system/primitives/button';
// ... or use barrel export:
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@client/shared/design-system/primitives/dropdown-menu';
import { Input } from '@client/shared/design-system/primitives/input';

// ✅ ALTERNATIVE - Use barrel export (cleaner)
import { Avatar, Badge, Button, Input, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, SimpleIcons } from '@client/shared/design-system';
```

---

### File 4: `src/app/shell/ProtectedRoute.tsx`

**Line 1: Lucide Icon Issue**

```typescript
// ❌ WRONG (Current)
import { Lock, LogIn, Forbidden, AlertTriangle, UserX } from 'lucide-react';

// ✅ CORRECT - UserX doesn't exist in lucide-react
import { Lock, LogIn, Forbidden, AlertTriangle, User } from 'lucide-react';
// Then use User instead of UserX in the component code

// Alternative: Check lucide-react docs for alternative icon
// Available user-related icons: User, UserCheck, UserMinus, UserPlus, Users, etc.
```

**Lines 8-10: Wrong Relative Paths**

```typescript
// ❌ WRONG (Current)
import { LoadingStates } from '../loading/LoadingStates';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

// ✅ CORRECT
import { LoadingStates } from '@client/shared/ui/loading';
import { Alert, AlertDescription } from '@client/shared/design-system/primitives/alert';
import { Button } from '@client/shared/design-system/primitives/button';
```

---

## PHASE 2: FIX COMPONENT BARREL EXPORTS (CRITICAL)

### File 5: `src/components/index.ts`

**Lines 9-28: Non-existent or Wrong Path Exports**

```typescript
// ❌ WRONG (Current - multiple issues)
export { default as ConnectionStatus } from './connection-status';  // Doesn't exist
export { default as DatabaseStatus } from './database-status';      // Wrong location
export { ErrorBoundary } from './error-handling/ErrorBoundary';     // Wrong location
export { default as OfflineIndicator } from './OfflineIndicator';  // Wrong location
export { default as OfflineModal } from './OfflineModal';          // Doesn't exist
export { EngagementAnalyticsDashboard } from './analytics/engagement-dashboard';  // Deprecated?
export { JourneyAnalyticsDashboard } from './analytics/JourneyAnalyticsDashboard'; // Deprecated?
export { default as BillCard } from './bills/bill-card';           // Moved to features
export { default as BillList } from './bills/bill-list';           // Moved to features
export { BillTracking } from './bills/bill-tracking';              // Moved to features
export { ImplementationWorkarounds } from './bills/implementation-workarounds'; // Deprecated
export { NotificationCenter } from './notifications/NotificationCenter'; // Wrong location
export { NotificationPreferences } from './notifications/notification-preferences'; // Wrong location

// ✅ CORRECT - Option A: Import from correct locations
export { ErrorBoundary } from '@client/core/error/components';
export { OfflineIndicator } from '@client/shared/ui/offline';
export { Toaster } from '@client/shared/design-system/feedback';

// ✅ CORRECT - Option B: Comment out non-existent exports
// export { default as ConnectionStatus } from './connection-status';  // TODO: Verify if needed
// export { default as OfflineModal } from './OfflineModal';  // TODO: Check if feature exists

// ✅ CORRECT - Option C: Import from features if components moved
export { EngagementAnalyticsDashboard } from '@client/features/analytics/ui';
export { BillCard } from '@client/features/bills/ui';
```

**Recommendation:** 
1. Remove all non-existent exports
2. Keep only exports that have corresponding files
3. Update paths to point to correct locations
4. Document deprecated/moved components

---

### File 6: `src/components/AppProviders.tsx`

**Lines 27-29: Wrong Relative Paths**

```typescript
// ❌ WRONG (Current)
import { AccessibilityProvider } from './accessibility/accessibility-manager';
import { SimpleErrorBoundary } from './error-handling/SimpleErrorBoundary';
import { OfflineProvider } from './offline/offline-manager';

// ✅ CORRECT
import { AccessibilityManager as AccessibilityProvider } from '@client/core/browser';
import { ErrorBoundary } from '@client/core/error/components';
import { OfflineProvider } from '@client/shared/ui/offline';
```

---

### File 7: `src/components/LazyPageWrapper.tsx`

**Line 3: Wrong Import Path**

```typescript
// ❌ WRONG (Current)
import { LoadingStates } from '@client/core/loading/components/LoadingStates';

// ✅ CORRECT
import { LoadingStates } from '@client/shared/ui/loading';
```

---

### File 8: `src/components/MigrationManager.tsx`

**Lines 3-6: Design System Imports**

```typescript
// ❌ WRONG (Current)
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';

// ✅ CORRECT - Option A: Individual imports
import { Badge } from '@client/shared/design-system/primitives/badge';
import { Button } from '@client/shared/design-system/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import { Skeleton } from '@client/shared/design-system/primitives/skeleton';

// ✅ CORRECT - Option B: Barrel export (recommended)
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@client/shared/design-system';
```

---

### File 9: `src/components/shared/index.ts`

**Lines 4-16: Missing or Wrong Path Exports**

```typescript
// ❌ WRONG (Current)
export * from './dashboard';      // Doesn't exist in components/shared
export * from './privacy';        // Check if exists
export * from './auth';           // Wrong - should be from core
export * from './utils';          // Check if exists
export * from './types';          // Check if exists

// ✅ CORRECT - Option A: If these subdirectories don't exist, remove them
// export * from './dashboard';
// export * from './privacy';

// ✅ CORRECT - Option B: If they do exist, verify and update
export * from './dashboard';      // If exists: keep
export * from './privacy';        // If exists: keep
export { useAuth } from '@client/core/auth';      // Auth from correct location
export * from './utils';          // If exists: keep
export * from './types';          // If exists: keep
```

**Action:** Run to check what actually exists:
```bash
ls -la client/src/components/shared/
```

---

## PHASE 3: FIX CORE API TYPE EXPORTS (HIGH PRIORITY)

### Missing Type Exports & Files to Create/Update

**File 10: `src/core/api/types.ts` - ADD EXPORTS**

```typescript
// ADD these exports to existing file
export type { Bill } from './types';  // Make sure Bill is exported
export type ErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'SERVER_ERROR';
export type APIResponse<T = any> = {
  data?: T;
  error?: string;
  status: number;
  code?: ErrorCode;
};

export interface AuthenticatedAPI {
  request: (method: string, path: string, data?: any) => Promise<APIResponse>;
  get: <T = any>(path: string) => Promise<APIResponse<T>>;
  post: <T = any>(path: string, data: any) => Promise<APIResponse<T>>;
  put: <T = any>(path: string, data: any) => Promise<APIResponse<T>>;
  delete: <T = any>(path: string) => Promise<APIResponse<T>>;
}
```

**File 11: `src/core/api/community.ts` - ADD EXPORT**

```typescript
// Line 35 - Make sure Comment is exported from types
export type Comment = {
  // ... fields
};
```

**File 12: `src/core/storage/types.ts` - ADD EXPORTS**

```typescript
// ADD missing exports
export type CacheEntry<T = any> = {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  tags?: string[];
};

export type CacheStats = {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  entries: number;
};
```

**File 13: `src/types/community.ts` - ADD EXPORT**

```typescript
// ADD missing export
export type Comment = {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  // ... other fields
};
```

**File 14: Create `src/core/api/errors.ts` (NEW FILE)**

```typescript
/**
 * API Error Types and Constants
 */

export type APIErrorCode = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface APIError extends Error {
  code: APIErrorCode;
  status?: number;
  details?: Record<string, any>;
  retryable: boolean;
  timestamp: Date;
}

export class NetworkError extends Error implements APIError {
  code: APIErrorCode = 'NETWORK_ERROR';
  status = 0;
  retryable = true;
  timestamp = new Date();
  details = {};
  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.details = details || {};
  }
}

// ... similar for other error types
```

---

## PHASE 4: FIX CORE API HOOK IMPORTS (HIGH PRIORITY)

### File 15: `src/core/api/hooks/use-safe-mutation.ts`

**Lines 3, 33, 49, 65: Fix Undefined Types & Imports**

```typescript
// ❌ WRONG (Current - Lines 3, 33, 49, 65)
import { AuthenticatedApiClient } from '@client/utils/api';  // ← Doesn't exist
// ...
const { data } = response as AuthenticatedAPI;  // ← Undefined

// ✅ CORRECT
import type { APIResponse, AuthenticatedAPI } from '@client/core/api/types';
// ...
const { data } = response as APIResponse;
```

**Full hook structure should be:**
```typescript
import { useMutation } from '@tanstack/react-query';  // Or react-query
import type { APIResponse, AuthenticatedAPI } from '@client/core/api/types';
import { api } from '@client/core/api';

export function useSafeMutation<T = any>(options?: any) {
  return useMutation<APIResponse<T>, Error, T>({
    mutationFn: async (data: T) => {
      const response = await api.post('/endpoint', data);
      return response as APIResponse<T>;
    },
    ...options,
  });
}
```

---

### File 16: `src/core/api/hooks/use-safe-query.ts`

**Lines 14-15, 84, 89, 271: Fix Imports & Types**

```typescript
// ❌ WRONG (Current)
import { AuthenticatedApiClient } from '@client/utils/api';  // ← Doesn't exist
import { logger } from '...';
// ...
const data: APIResponse = ...;  // ← Undefined type
const result = await (client as AuthenticatedAPI).get(...);  // ← Undefined

// ✅ CORRECT
import type { APIResponse, AuthenticatedAPI } from '@client/core/api/types';
import { api } from '@client/core/api';
import { logger } from '@client/utils/logger';
// ...
const data: APIResponse<T> = ...;
const result = await api.get<T>(path);
```

---

### File 17: `src/core/api/hooks/useApiConnection.ts`

**Lines 3, 52, 76: Fix Imports & Types**

```typescript
// ❌ WRONG (Current)
import { AuthenticatedApiClient } from '@client/utils/api';  // ← Doesn't exist

// ✅ CORRECT
import type { AuthenticatedAPI } from '@client/core/api/types';
import { api } from '@client/core/api';
```

---

## PHASE 5: FIX REMAINING CORE API FILES (HIGH PRIORITY)

### File 18: `src/core/api/bills.ts` - ADD EXPORT & FIX IMPORT

**Line 83: Export Bill type**
```typescript
// ADD to types section or ensure exported
export type Bill = { /* fields */ };
```

**Line 13: Create errors module**
```typescript
// ❌ WRONG
import { ... } from './errors';

// ✅ CORRECT
import { APIError } from './errors';  // From new errors.ts file
```

---

### File 19: `src/core/api/analytics.ts` - FIX IMPORT

**Line 19: Create errors module**
```typescript
// ❌ WRONG
import { ... } from './errors';

// ✅ CORRECT
import type { APIError, APIErrorCode } from './errors';
```

---

### File 20: `src/core/api/client.ts` - FIX IMPORTS

**Line 11: Import errors**
```typescript
// ❌ WRONG
import { ... } from './errors';

// ✅ CORRECT
import type { APIError } from './errors';
```

**Line 889: Fix cache import path**
```typescript
// ❌ WRONG
import from './cache';

// ✅ CORRECT
import { CacheManager } from './cache-manager';
```

---

### File 21: `src/core/api/cache-manager.ts` - ADD EXPORTS

**Line 13: Export types from storage**
```typescript
// ❌ WRONG
import { CacheEntry, CacheStats } from '../storage/types';  // ← Not exported

// ✅ CORRECT
import type { CacheEntry, CacheStats } from '../storage/types';

// Then make sure these are exported from src/core/api/index.ts:
export type { CacheEntry, CacheStats } from './cache-manager';
```

---

### File 22: `src/core/api/index.ts` - ADD EXPORTS

**Line 68: Export CacheEntry**
```typescript
// ❌ WRONG (Current)
// Missing exports

// ✅ CORRECT - ADD these exports
export type { CacheEntry, CacheStats } from './cache-manager';
export { CacheManager } from './cache-manager';
export type { APIResponse, ErrorCode, AuthenticatedAPI } from './types';
export type { APIError, APIErrorCode } from './errors';
export { NetworkError } from './errors';
```

---

## EXECUTION CHECKLIST

### [ ] Phase 1: App Shell (30 min)
- [ ] Fix `src/app/shell/AppRouter.tsx` (lines 6-7)
- [ ] Fix `src/app/shell/AppShell.tsx` (lines 2, 9-13)
- [ ] Fix `src/app/shell/NavigationBar.tsx` (lines 11-23)
- [ ] Fix `src/app/shell/ProtectedRoute.tsx` (line 1, 8-10)

### [ ] Phase 2: Component Exports (45 min)
- [ ] Fix `src/components/index.ts` (remove/update all non-existent)
- [ ] Fix `src/components/AppProviders.tsx` (lines 27-29)
- [ ] Fix `src/components/LazyPageWrapper.tsx` (line 3)
- [ ] Fix `src/components/MigrationManager.tsx` (lines 3-6)
- [ ] Fix `src/components/shared/index.ts` (lines 4-16)

### [ ] Phase 3: Type Exports (1 hour)
- [ ] Update `src/core/api/types.ts` (add missing exports)
- [ ] Update `src/core/storage/types.ts` (add exports)
- [ ] Update `src/types/community.ts` (add exports)
- [ ] Create `src/core/api/errors.ts` (new file)
- [ ] Fix `src/core/api/bills.ts` (line 83)
- [ ] Fix `src/core/api/analytics.ts` (line 19)

### [ ] Phase 4: Hook Imports (1 hour)
- [ ] Fix `src/core/api/hooks/use-safe-mutation.ts`
- [ ] Fix `src/core/api/hooks/use-safe-query.ts`
- [ ] Fix `src/core/api/hooks/useApiConnection.ts`

### [ ] Phase 5: Remaining API Files (1 hour)
- [ ] Fix `src/core/api/client.ts` (lines 11, 889)
- [ ] Fix `src/core/api/cache-manager.ts` (line 13)
- [ ] Update `src/core/api/index.ts` (add exports)

### [ ] Verification
- [ ] Run `pnpm run --filter=client typecheck`
- [ ] Run `pnpm run --filter=client lint`
- [ ] All errors resolved? ✓

---

## VERIFICATION COMMANDS

After each phase:
```bash
# Check errors count
pnpm run --filter=client typecheck 2>&1 | grep "error TS" | wc -l

# Get specific errors
pnpm run --filter=client typecheck 2>&1 | head -50

# Auto-format once fixed
pnpm run --filter=client format
```

---

## SUMMARY

**Total Import Fixes Needed:** 80+
**Critical Fixes:** 40+
**High Priority Fixes:** 25+
**Low Priority Fixes:** 15+

**Estimated Time:**
- Phase 1: 30 min
- Phase 2: 45 min
- Phase 3: 1 hour
- Phase 4: 1 hour
- Phase 5: 1 hour
- Verification: 30 min
- **Total: 4.5 hours**

Once these imports are fixed, the client will be ready for addressing other TypeScript errors (type annotations, unused variables, etc.).
