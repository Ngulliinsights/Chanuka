// DEPRECATED - Hooks Index
// This file has been reorganized for Feature-Sliced Design (FSD)
// See DIRECTORY_ALIGNMENT_ANALYSIS.md for migration guide

// Auth Hooks (in features/users/hooks)
export { useAuth, AuthProvider } from '../features/users/hooks';

// API Hooks (in core/api/hooks)
export { useApiConnection } from '../core/api/hooks';
export { useApiWithFallback } from '../core/api/hooks';
export { useSafeMutation } from '../core/api/hooks';
export { useSafeQuery } from '../core/api/hooks';

// Navigation Hooks (in core/navigation/hooks)
export { useUnifiedNavigation, useNavigationSystem } from '../core/navigation/hooks';
export { useKeyboardNavigation } from '../core/navigation/hooks';
export { useBreadcrumbs } from '../core/navigation/hooks';
export { useRelatedPages } from '../core/navigation/hooks';
export { useNavigationPreferences } from '../core/navigation/hooks';
export { useSidebar } from '../core/navigation/hooks';
export { useMobileMenu } from '../core/navigation/hooks';

// Loading Hooks (in core/loading/hooks)
export { useTimeoutAwareLoading as useLoadingOperation } from '../core/loading/hooks';

// Offline & Connection (in core/hooks)
export { useOfflineDetection } from './useOfflineDetection';
export { useOfflineCapabilities } from './useOfflineCapabilities';
export { useOnlineStatus } from '../core/hooks';


// Error Recovery (in core/hooks)
export { useErrorRecovery } from './useErrorRecovery';

// Shared UI Hooks (in shared/hooks)
export { useToast } from '../shared/hooks';
export { useMobile } from '../shared/hooks';
export { useKeyboardFocus } from '../shared/hooks';
export { useDebounce } from '../shared/hooks';
export { useMediaQuery } from '../shared/hooks';
export { useWebSocket } from '../shared/hooks';
export { useCleanup } from '../shared/hooks';
export { useI18n } from '../shared/hooks';
export { useProgressiveDisclosure } from '../shared/hooks';
export { useRealTimeEngagement } from '../shared/hooks';

// Mobile hooks (in shared/hooks/mobile)
export {
  useBottomSheet,
  useDeviceInfo,
  useInfiniteScroll,
  useMobileNavigation,
  useMobileTabs,
  usePullToRefresh,
  useScrollManager,
  useSwipeGesture,
} from '../shared/hooks/mobile';

// Analytics Hooks (in features/analytics/hooks)
export { useJourneyTracker } from '../features/analytics/hooks';
export { useErrorAnalytics } from '../features/analytics/hooks';
export { useWebVitals } from '../features/analytics/hooks';
export { useRenderTracker } from '../features/analytics/hooks';

// System Hooks (feature-specific)
export {
  useSystemHealth,
  useSystemStats,
  useSystemActivity,
  useSystemSchema,
  useSystemEnvironment
} from './use-system';

// Other feature hooks
export { useOnboarding } from './use-onboarding';
export { useSecurity } from './useSecurity';
export { useService } from './useService';
export { useMockData } from './useMockData';
