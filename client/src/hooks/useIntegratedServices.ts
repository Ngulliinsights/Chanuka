/**
 * Integrated Services Hook
 * 
 * Provides easy access to integrated orphan modules throughout the application
 */

import { useIntegration } from '@/components/integration/IntegrationProvider';

/**
 * Hook to access security services
 */
export function useSecurityServices() {
  const { services, isReady } = useIntegration();
  
  return {
    cspManager: services.cspManager,
    domSanitizer: services.domSanitizer,
    inputValidator: services.inputValidator,
    passwordValidator: services.passwordValidator,
    isReady,
  };
}

/**
 * Hook to access privacy analytics
 */
export function usePrivacyAnalytics() {
  const { services, isReady } = useIntegration();
  
  return {
    analytics: services.privacyAnalytics,
    isReady,
    
    // Convenience methods
    trackPageView: (path: string, title?: string, metadata?: Record<string, unknown>) => {
      if (services.privacyAnalytics && isReady) {
        services.privacyAnalytics.trackPageView(path, title, metadata);
      }
    },
    
    trackEngagement: (action: string, target: string, metadata?: Record<string, unknown>) => {
      if (services.privacyAnalytics && isReady) {
        services.privacyAnalytics.trackEngagement(action, target, metadata);
      }
    },
    
    trackError: (error: Error, context?: Record<string, unknown>) => {
      if (services.privacyAnalytics && isReady) {
        services.privacyAnalytics.trackError(error, context);
      }
    },
  };
}

/**
 * Hook to access mobile utilities
 */
export function useMobileServices() {
  const { services, isReady } = useIntegration();
  
  return {
    deviceDetector: services.deviceDetector,
    touchHandler: services.touchHandler,
    isReady,
    
    // Convenience methods
    getDeviceInfo: () => {
      return services.deviceDetector?.getDeviceInfo();
    },
    
    isMobile: () => {
      return services.deviceDetector?.getDeviceInfo()?.isMobile || false;
    },
    
    isTablet: () => {
      return services.deviceDetector?.getDeviceInfo()?.isTablet || false;
    },
    
    hasTouch: () => {
      return services.deviceDetector?.getDeviceInfo()?.hasTouch || false;
    },
  };
}

/**
 * Hook to access all integrated services
 */
export function useIntegratedServices() {
  const { services, isReady, status, error } = useIntegration();
  
  return {
    services,
    isReady,
    status,
    error,
    
    // Service groups
    security: useSecurityServices(),
    privacy: usePrivacyAnalytics(),
    mobile: useMobileServices(),
  };
}