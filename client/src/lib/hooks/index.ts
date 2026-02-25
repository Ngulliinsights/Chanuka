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
// export { useToast } from './use-toast';
export { useErrorRecovery, useAutoRecovery, usePredictiveRecovery } from './use-error-recovery';
export { useOfflineDetection } from './use-offline-detection';
export { useOfflineCapabilities } from './use-offline-capabilities';
// export { useSystem } from './use-system'; // Invalid
export type { SystemHealth, SystemStats, SystemActivity, SystemSchema, SystemEnvironment } from './use-system';
export { useCleanup, useResourceCleanup, useEventListenerCleanup } from './use-cleanup';
export { useDebounce } from './use-debounce';
export { useMediaQuery } from './use-media-query';
export { useKeyboardFocus } from './use-keyboard-focus';
export { usePerformanceBudget, useCoreWebVitals, usePerformanceAlert, useLazyLoading } from './use-performance-monitor';
export { useArchitecturePerformance } from './use-architecture-performance';
export { useSafeQuery } from './use-safe-query';
export { useSafeEffect } from './use-safe-effect';
export { useNotifications } from './use-notifications';
export { useProgressiveDisclosure } from './use-progressive-disclosure';
export { useSeamlessIntegration } from './use-seamless-integration';
export { useIntegratedServices } from './use-integrated-services';

// Mobile Hooks - Direct exports from mobile subdirectory

// Legacy Compatibility Exports - For backward compatibility during migration
// TODO: Remove these exports after migration is complete
// export { useIsMobile as useMobileLegacy } from './use-mobile'; // Invalid
export { useOfflineDetection as useOfflineDetectionLegacy } from './use-offline-detection';
// export { useSystem as useSystemLegacy } from './use-system'; // Invalid
export { useCleanup as useCleanupLegacy } from './use-cleanup';

// FSD Integration Exports - For Feature-Sliced Design integration
// These will be implemented as features are migrated to FSD structure
// TODO: Uncomment when modules are created
// export { useApiWithFallback } from '../../infrastructure/api/hooks';
// export { useSafeMutation } from '../../infrastructure/api/hooks';
// export { useSafeQuery as useSafeQueryFSD } from '../../infrastructure/api/hooks';
export { useNavigationSystem } from '@client/infrastructure/navigation/hooks';
export { useKeyboardNavigation as useKeyboardNavigationFSD } from '@client/infrastructure/navigation/hooks';
export { useBreadcrumbs as useBreadcrumbsFSD } from '@client/infrastructure/navigation/hooks';
export { useRelatedPages as useRelatedPagesFSD } from '@client/infrastructure/navigation/hooks';
export { useNavigationPreferences as useNavigationPreferencesFSD } from '@client/infrastructure/navigation/hooks';
export { useSidebar as useSidebarFSD } from '@client/infrastructure/navigation/hooks';
export { useMobileMenu as useMobileMenuFSD } from '@client/infrastructure/navigation/hooks';
// TODO: Uncomment when modules are created
// export { useOnlineStatus as useOnlineStatusFSD } from '../../infrastructure/loading/hooks';
// export { useJourneyTracker } from '../features/analytics/hooks';
// export { useErrorAnalytics } from '../features/analytics/hooks';
// export { useWebVitals } from '../features/analytics/hooks';
// export { useRenderTracker } from '../features/analytics/hooks';
export { useSecurity, useSecureForm, useRateLimit } from './use-security';

// Shared UI Hooks - Re-exports for convenience (excluding duplicates)
export { useI18n, I18nProvider } from './use-i18n';
export { useToast } from './use-toast';
export { useNavigationSlice, useSidebar, useMobileMenu, useNavigationPreferences } from './use-navigation-slice';
export { useMobile, useTablet, useDesktop } from './use-mobile';
export { useSystemOverview } from './use-system';
// export { useSystem } from './use-system'; // Deprecated/Removed

// Analytics hooks - re-exported from features
export * from './use-analytics';

// Search hooks - re-exported from features  
export * from './use-search';

// Notification history export
export { useNotificationHistory } from './use-notifications';

// Mobile hooks from shared - Re-exports for convenience (excluding duplicates)
// TODO: Uncomment when mobile hooks module is created
// export {
//   useBottomSheet,
//   useDeviceInfo,
//   useInfiniteScroll,
//   useMobileNavigation,
//   useMobileTabs,
//   usePullToRefresh,
//   useScrollManager,
//   useSwipeGesture,
// } from '../lib/hooks/mobile';
