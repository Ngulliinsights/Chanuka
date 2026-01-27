// Hooks Index - Standardized Architecture
// This file provides unified exports for all hooks in the application
// Following Feature-Sliced Design (FSD) principles with backward compatibility

// Error Handling Utilities
export { useErrorHandler, useGracefulErrorHandling, useErrorBoundary } from './utils/error-handling';

// Performance Optimization Utilities
export {
  usePerformanceMonitor,
  useDebouncedCallback,
  useThrottledCallback,
  useCachedValue,
  useVirtualization,
  useMemoryManagement,
  useRenderOptimization,
} from './utils/performance';

// Migration Compatibility Layer
export {
  useToastShared,
  useMobileShared,
  useKeyboardFocusShared,
  useDebounceShared,
  useMediaQueryShared,
  useCleanupShared,
  useProgressiveDisclosureShared,
  useBottomSheetShared,
  useDeviceInfoShared,
  useInfiniteScrollShared,
  useMobileNavigationShared,
  useMobileTabsShared,
  usePullToRefreshShared,
  useScrollManagerShared,
  useSwipeGestureShared,
  useAuth,
  useApiConnection,
  useUnifiedNavigation,
  useTimeoutAwareLoading,
  useMigrationConfig,
  useMigrationStatus,
  useDeprecationWarning,
} from './utils/migration-compatibility';

// Hook Patterns - Templates and utilities for creating standardized hooks
export { useExampleReducer, useAdvancedReducer } from './patterns/reducer-template';
export { useExampleCallback, useAdvancedCallback } from './patterns/callback-template';
export { useExampleEffect, useAdvancedEffect, useDebouncedEffect } from './patterns/effect-template';
export { useStrategyManager, useDynamicStrategyManager, useConditionalStrategy } from './patterns/strategy-template';

// Core Hooks - Direct exports from this directory
export { useToast } from './use-toast';
export { useErrorRecovery, useAutoRecovery, usePredictiveRecovery } from './useErrorRecovery';
export { useOfflineDetection } from './use-offline-detection';
export { useOfflineCapabilities } from './useOfflineCapabilities';
export { useSystem } from './use-system';
export type { SystemHealth, SystemStats, SystemActivity, SystemSchema, SystemEnvironment } from './use-system';
export { useCleanup, useResourceCleanup, useEventListenerCleanup } from './use-cleanup';
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { useKeyboardFocus } from './use-keyboard-focus';
export { usePerformanceBudget, useCoreWebVitals, usePerformanceAlert, useLazyLoading } from './use-performance-monitor';
export { useArchitecturePerformance } from './use-architecture-performance';
export { useSafeQuery } from './use-safe-query';
export { useSafeEffect } from './useSafeEffect';
export { useNotifications } from './useNotifications';
export { useProgressiveDisclosure } from './useProgressiveDisclosure';
export { useSeamlessIntegration } from './useSeamlessIntegration';
export { useIntegratedServices } from './useIntegratedServices';

// Mobile Hooks - Direct exports from mobile subdirectory

// Legacy Compatibility Exports - For backward compatibility during migration
// TODO: Remove these exports after migration is complete
export { useIsMobile as useMobileLegacy } from './use-mobile';
export { useOfflineDetection as useOfflineDetectionLegacy } from './use-offline-detection';
export { useSystem as useSystemLegacy } from './use-system';
export { useCleanup as useCleanupLegacy } from './use-cleanup';

// FSD Integration Exports - For Feature-Sliced Design integration
// These will be implemented as features are migrated to FSD structure
export { useApiWithFallback } from '../core/api/hooks';
export { useSafeMutation } from '../core/api/hooks';
export { useSafeQuery as useSafeQueryFSD } from '../core/api/hooks';
export { useNavigationSystem } from '@client/core/navigation/hooks';
export { useKeyboardNavigation as useKeyboardNavigationFSD } from '@client/core/navigation/hooks';
export { useBreadcrumbs as useBreadcrumbsFSD } from '@client/core/navigation/hooks';
export { useRelatedPages as useRelatedPagesFSD } from '@client/core/navigation/hooks';
export { useNavigationPreferences as useNavigationPreferencesFSD } from '@client/core/navigation/hooks';
export { useSidebar as useSidebarFSD } from '@client/core/navigation/hooks';
export { useMobileMenu as useMobileMenuFSD } from '@client/core/navigation/hooks';
export { useOnlineStatus as useOnlineStatusFSD } from '../core/loading/hooks';
export { useJourneyTracker } from '../features/analytics/hooks';
export { useErrorAnalytics } from '../features/analytics/hooks';
export { useWebVitals } from '../features/analytics/hooks';
export { useRenderTracker } from '../features/analytics/hooks';
export { useSecurity, useSecureForm, useRateLimit } from '../features/security/hooks/useSecurity';

// Shared UI Hooks - Re-exports for convenience (excluding duplicates)
export { useI18n } from '../lib/hooks';

// Mobile hooks from shared - Re-exports for convenience (excluding duplicates)
export {
  useBottomSheet,
  useDeviceInfo,
  useInfiniteScroll,
  useMobileNavigation,
  useMobileTabs,
  usePullToRefresh,
  useScrollManager,
  useSwipeGesture,
} from '../lib/hooks/mobile';
