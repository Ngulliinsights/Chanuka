/**
 * Hooks Index
 * 
 * Central export point for all custom React hooks
 */

// Auth Hooks
export { useAuth } from './use-auth';

// API Hooks
export { useApiConnection } from './useApiConnection';
export { useApiWithFallback } from './use-api-with-fallback';
export { useSafeMutation } from './use-safe-mutation';
export { useSafeQuery } from './use-safe-query';

// Navigation Hooks
export { useUnifiedNavigation } from './use-unified-navigation';
export { useNavigationAccessibility } from './use-navigation-accessibility';
export { useNavigationPerformance } from './use-navigation-performance';
export { useNavigationPreferences } from './use-navigation-preferences';

// System Hooks
// export { useSystem } from './use-system'; // Module not found
export { useOnlineStatus } from './use-online-status';
export { useOfflineDetection } from './useOfflineDetection';
export { useOfflineCapabilities } from './useOfflineCapabilities';
export { useConnectionAware } from './useConnectionAware';
export { useServiceStatus } from './useServiceStatus';

// UI Hooks
export { useToast } from './use-toast';
export { useIsMobile as useMobile } from './use-mobile';
export { useKeyboardFocus } from './use-keyboard-focus';

// Loading Hooks
export { useTimeoutAwareLoading } from './useTimeoutAwareLoading';

// Analytics Hooks
export { useJourneyTracker } from './use-journey-tracker';

// Bill Hooks
export { useBillAnalysis } from './use-bill-analysis';
export { useBills } from './use-bills';

// Onboarding Hooks
export { useOnboarding } from './use-onboarding';

// Internationalization Hooks
export { useI18n } from './use-i18n';

// Error Recovery Hooks
export { useErrorRecovery } from './useErrorRecovery';

// WebSocket Hooks
export { useWebSocket } from './useWebSocket';