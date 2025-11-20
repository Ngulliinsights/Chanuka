# Hooks Migration Plan

## Overview
Migrating hooks from `client/src/hooks` to their corresponding feature directories to improve code organization and maintainability.

## Migration Strategy

### 1. Bills Feature Hooks
**Target**: `client/src/features/bills/hooks/`
- `use-bill-analysis.tsx` → Already have `useBills.ts`, will consolidate

### 2. Community Feature Hooks  
**Target**: `client/src/features/community/hooks/`
- `useCommunityRealTime.ts`
- `useCommunityWebSocket.ts`
- `useDiscussion.ts`

### 3. Users/Auth Feature Hooks
**Target**: `client/src/features/users/hooks/`
- `useAuth.tsx`
- `useUserAPI.ts`

### 4. Core Navigation Hooks
**Target**: `client/src/core/navigation/hooks/`
- `use-unified-navigation.ts`
- `use-navigation-accessibility.ts`
- `use-navigation-performance.ts`
- `use-navigation-preferences.tsx`

### 5. Core Loading Hooks
**Target**: `client/src/core/loading/hooks/`
- `useTimeoutAwareLoading.ts`

### 6. Core API Hooks
**Target**: `client/src/core/api/hooks/`
- `use-api-with-fallback.ts`
- `use-safe-mutation.ts`
- `use-safe-query.ts`
- `useApiConnection.ts`

### 7. Shared/Utility Hooks (Keep in hooks or move to utils)
**Target**: `client/src/hooks/` (keep) or `client/src/utils/hooks/`
- `use-toast.ts` (UI component hook - keep in hooks)
- `use-mobile.tsx`
- `use-keyboard-focus.ts`
- `useDebounce.ts`
- `useMediaQuery.ts`
- `use-websocket.ts`
- `useCleanup.tsx`
- `useConnectionAware.tsx`
- `useOfflineCapabilities.ts`
- `useOfflineDetection.tsx`
- `useServiceStatus.ts`
- `use-online-status.tsx`
- `useErrorRecovery.ts`
- `useErrorAnalytics.ts`
- `use-web-vitals.ts`
- `use-render-tracker.ts`
- `useProgressiveDisclosure.ts`
- `useSecurity.ts`
- `useService.ts`
- `useMockData.ts`
- `useNotifications.ts`
- `useRealTimeEngagement.ts`

### 8. Specialized Feature Hooks
- `use-i18n.tsx` → `client/src/features/i18n/hooks/` (create if needed)
- `use-journey-tracker.ts` → `client/src/features/analytics/hooks/`
- `use-onboarding.tsx` → `client/src/features/onboarding/hooks/` (create if needed)
- `use-system.tsx` → `client/src/features/system/hooks/` (create if needed)

## Implementation Steps

1. Create missing feature directories and hooks folders
2. Move hooks to appropriate locations
3. Update import statements throughout codebase
4. Update index files in each feature
5. Create new consolidated hooks index
6. Deprecate old hooks directory if empty
7. Update documentation

## Benefits

- **Better Organization**: Hooks are co-located with related features
- **Improved Discoverability**: Easier to find hooks related to specific features
- **Reduced Coupling**: Features become more self-contained
- **Cleaner Architecture**: Clear separation of concerns
- **Better Tree Shaking**: Unused hooks won't be bundled