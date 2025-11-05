/**
 * Hooks Index
 * 
 * Central export point for all custom React hooks
 */

// Auth Hooks
export { default as useAuth } from './use-auth';

// API Hooks
export { default as useApiConnection } from './useApiConnection';
export { default as useApiWithFallback } from './use-api-with-fallback';
export { default as useSafeMutation } from './use-safe-mutation';
export { default as useSafeQuery } from './use-safe-query';

// Navigation Hooks
export { default as useUnifiedNavigation } from './use-unified-navigation';
export { default as useNavigationAccessibility } from './use-navigation-accessibility';
export { default as useNavigationPerformance } from './use-navigation-performance';
export { default as useNavigationPreferences } from './use-navigation-preferences';

// System Hooks
export { default as useSystem } from './use-system';
export { default as useOnlineStatus } from './use-online-status';
export { default as useOfflineDetection } from './useOfflineDetection';
export { default as useOfflineCapabilities } from './useOfflineCapabilities';
export { default as useConnectionAware } from './useConnectionAware';
export { default as useServiceStatus } from './useServiceStatus';

// UI Hooks
export { default as useToast } from './use-toast';
export { default as useMobile } from './use-mobile';
export { default as useKeyboardFocus } from './use-keyboard-focus';

// Loading Hooks
export { default as useTimeoutAwareLoading } from './useTimeoutAwareLoading';

// Analytics Hooks
export { default as useJourneyTracker } from './use-journey-tracker';

// Bill Hooks
export { default as useBillAnalysis } from './use-bill-analysis';
export { default as useBills } from './use-bills';

// Onboarding Hooks
export { default as useOnboarding } from './use-onboarding';

// Internationalization Hooks
export { default as useI18n } from './use-i18n';

// Error Recovery Hooks
export { default as useErrorRecovery } from './useErrorRecovery';

// WebSocket Hooks
export { default as useWebSocket } from './useWebSocket';