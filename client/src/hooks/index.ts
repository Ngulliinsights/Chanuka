/**
 * Hooks Index - Consolidated and Migrated
 * 
 * This file provides backward compatibility while hooks are migrated to their feature directories.
 * New code should import directly from feature directories.
 */

// ============================================================================
// MIGRATED HOOKS - Import from new locations
// ============================================================================

// Auth Hooks (migrated to features/users/hooks)
export { useAuth, AuthProvider } from '../features/users/hooks';

// API Hooks (migrated to core/api/hooks)
export { useApiConnection } from '../core/api/hooks';
export { useApiWithFallback } from '../core/api/hooks';
export { useSafeMutation } from '../core/api/hooks';
export { useSafeQuery } from '../core/api/hooks';

// Navigation Hooks (migrated to core/navigation/hooks)
export { useUnifiedNavigation } from '../core/navigation/hooks';
export { useNavigationAccessibility } from '../core/navigation/hooks';
export { useNavigationPerformance } from '../core/navigation/hooks';
export { useNavigationPreferences } from '../core/navigation/hooks';

// Loading Hooks (migrated to core/loading/hooks)
export { useTimeoutAwareLoading } from '../core/loading/hooks';

// Analytics Hooks (migrated to features/analytics/hooks)
export { useJourneyTracker } from '../features/analytics/hooks';
export { useErrorAnalytics } from '../features/analytics/hooks';
export { useWebVitals } from '../features/analytics/hooks';
export { useRenderTracker } from '../features/analytics/hooks';

// Bills Hooks (migrated to features/bills/hooks)
export { 
  useBills,
  useBill,
  useBillComments,
  useBillSponsors,
  useBillAnalysis,
  useBillCategories,
  useBillStatuses,
  useAddBillComment,
  useRecordBillEngagement,
  useTrackBill
} from '../features/bills/hooks';

// Community Hooks (migrated to features/community/hooks)
export { useCommunityRealTime, useTypingIndicators, useCommunityAnalytics } from '../features/community/hooks';

// ============================================================================
// REMAINING HOOKS - Still in hooks directory
// ============================================================================

// UI/Utility Hooks (staying in hooks)
export { useToast } from './use-toast';
export { useIsMobile as useMobile } from './use-mobile';
export { useKeyboardFocus } from './use-keyboard-focus';
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { useWebSocket } from './use-websocket';
export { useCleanup } from './useCleanup';

// System/Connection Hooks (staying in hooks)
export { useOfflineDetection } from './useOfflineDetection';
export { useOfflineCapabilities } from './useOfflineCapabilities';
export { useConnectionAware } from './useConnectionAware';
export { useServiceStatus } from './useServiceStatus';
export { useOnlineStatus } from './use-online-status';

// Error Recovery Hooks (staying in hooks)
export { useErrorRecovery } from './useErrorRecovery';

// Feature-specific hooks that need feature directories created
export { useI18n } from './use-i18n';
export { useOnboarding } from './use-onboarding';
export { useSystem } from './use-system';

// Engagement/Notification Hooks
export { useNotifications } from './useNotifications';
export { useRealTimeEngagement } from './useRealTimeEngagement';
export { useProgressiveDisclosure } from './useProgressiveDisclosure';
export { useSecurity } from './useSecurity';
export { useService } from './useService';
export { useMockData } from './useMockData';

// ============================================================================
// DEPRECATION NOTICES
// ============================================================================

/**
 * @deprecated Import directly from feature directories:
 * - Auth hooks: import from 'features/users/hooks'
 * - API hooks: import from 'core/api/hooks'  
 * - Navigation hooks: import from 'core/navigation/hooks'
 * - Loading hooks: import from 'core/loading/hooks'
 * - Analytics hooks: import from 'features/analytics/hooks'
 * - Bills hooks: import from 'features/bills/hooks'
 * - Community hooks: import from 'features/community/hooks'
 */