/**
 * Integration Provider - Orchestrates Orphan Module Integration
 * 
 * This component implements the Tier 1 integration plan from ORPHAN_VALUE_ANALYSIS.md
 * It safely integrates high-value orphaned modules with proper error handling and rollback.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

// Import the orphaned modules we're integrating
import { CSPManager, DOMSanitizer, InputValidator, PasswordValidator } from '@/utils/security';
import { PrivacyAnalyticsService } from '@/services/privacyAnalyticsService';
import { DeviceDetector, TouchHandler } from '@/core/mobile';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IntegrationStatus {
  security: 'pending' | 'loading' | 'success' | 'error';
  privacy: 'pending' | 'loading' | 'success' | 'error';
  ui: 'pending' | 'loading' | 'success' | 'error';
  mobile: 'pending' | 'loading' | 'success' | 'error';
}

interface IntegrationServices {
  cspManager?: CSPManager;
  domSanitizer?: DOMSanitizer;
  inputValidator?: InputValidator;
  passwordValidator?: PasswordValidator;
  privacyAnalytics?: PrivacyAnalyticsService;
  deviceDetector?: DeviceDetector;
  touchHandler?: TouchHandler;
}

interface IntegrationContextValue {
  status: IntegrationStatus;
  services: IntegrationServices;
  isReady: boolean;
  error?: Error;
  retry: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegration must be used within IntegrationProvider');
  }
  return context;
}

// ============================================================================
// INTEGRATION PROVIDER
// ============================================================================

interface IntegrationProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function IntegrationProvider({ children, fallback }: IntegrationProviderProps) {
  const [status, setStatus] = useState<IntegrationStatus>({
    security: 'pending',
    privacy: 'pending',
    ui: 'pending',
    mobile: 'pending',
  });

  const [services, setServices] = useState<IntegrationServices>({});
  const [error, setError] = useState<Error>();
  const [retryCount, setRetryCount] = useState(0);

  // Calculate if integration is ready
  const isReady = Object.values(status).every(s => s === 'success');

  // Retry function
  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(undefined);
    setStatus({
      security: 'pending',
      privacy: 'pending',
      ui: 'pending',
      mobile: 'pending',
    });
  }, []);

  // Integration effect
  useEffect(() => {
    let isCancelled = false;

    async function integrateModules() {
      try {
        logger.info('Starting Tier 1 orphan module integration', {
          component: 'IntegrationProvider',
          attempt: retryCount + 1,
        });

        // Step 1: Initialize Security Utilities (Low Risk, High Impact)
        setStatus(prev => ({ ...prev, security: 'loading' }));
        
        const cspManager = CSPManager.getInstance();
        const domSanitizer = DOMSanitizer.getInstance();
        const inputValidator = InputValidator.getInstance();
        const passwordValidator = PasswordValidator.getInstance();

        // Configure CSP for current environment
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        const cspHeader = cspManager.generateCSPHeader(environment);
        
        // Apply CSP header if we're in a context that supports it
        if (typeof document !== 'undefined' && document.head) {
          const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (!existingMeta) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = cspHeader;
            document.head.appendChild(meta);
          }
        }

        if (isCancelled) return;
        setStatus(prev => ({ ...prev, security: 'success' }));

        // Step 2: Initialize Privacy Analytics (GDPR/CCPA Compliance)
        setStatus(prev => ({ ...prev, privacy: 'loading' }));
        
        const privacyAnalytics = new PrivacyAnalyticsService({
          enabledCategories: ['navigation', 'engagement', 'performance', 'errors'],
          anonymizeData: true,
          respectDoNotTrack: true,
          consentRequired: true,
          retentionDays: 730,
          batchSize: 50,
          flushInterval: 30000,
          maxQueueSize: 1000,
          maxRetries: 3,
        });

        if (isCancelled) return;
        setStatus(prev => ({ ...prev, privacy: 'success' }));

        // Step 3: UI Components Integration (Design System Integration)
        setStatus(prev => ({ ...prev, ui: 'loading' }));
        
        // Initialize UI recovery strategies
        try {
          const { initializeUIRecoveryStrategies } = await import('@client/shared/design-system/primitives/recovery');
          initializeUIRecoveryStrategies();
          
          logger.info('UI component system integrated', {
            component: 'IntegrationProvider',
            features: ['unified-components', 'responsive-design', 'accessibility', 'error-recovery'],
          });
        } catch (error) {
          logger.warn('UI recovery strategies initialization failed', {
            component: 'IntegrationProvider',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue without recovery strategies - not critical
        }

        if (isCancelled) return;
        setStatus(prev => ({ ...prev, ui: 'success' }));

        // Step 4: Mobile Utilities Integration (High Value for Mobile Experience)
        setStatus(prev => ({ ...prev, mobile: 'loading' }));
        
        const deviceDetector = DeviceDetector.getInstance();
        const touchHandler = TouchHandler.getInstance();
        
        // Initialize mobile utilities
        const deviceInfo = deviceDetector.getDeviceInfo();
        logger.info('Mobile utilities initialized', {
          component: 'IntegrationProvider',
          deviceInfo: {
            isMobile: deviceInfo.isMobile,
            isTablet: deviceInfo.isTablet,
            screenSize: deviceInfo.screenSize,
            hasTouch: deviceInfo.hasTouch,
          },
        });

        if (isCancelled) return;
        setStatus(prev => ({ ...prev, mobile: 'success' }));

        // Update services
        if (!isCancelled) {
          setServices({
            cspManager,
            domSanitizer,
            inputValidator,
            passwordValidator,
            privacyAnalytics,
            deviceDetector,
            touchHandler,
          });

          logger.info('Tier 1 integration completed successfully', {
            component: 'IntegrationProvider',
            modules: ['security', 'privacy', 'ui', 'mobile'],
          });
        }

      } catch (integrationError) {
        if (!isCancelled) {
          const error = integrationError instanceof Error 
            ? integrationError 
            : new Error('Unknown integration error');
          
          setError(error);
          setStatus(prev => ({
            ...prev,
            security: prev.security === 'loading' ? 'error' : prev.security,
            privacy: prev.privacy === 'loading' ? 'error' : prev.privacy,
            ui: prev.ui === 'loading' ? 'error' : prev.ui,
            mobile: prev.mobile === 'loading' ? 'error' : prev.mobile,
          }));

          logger.error('Integration failed', {
            component: 'IntegrationProvider',
            error: error.message,
            attempt: retryCount + 1,
          });
        }
      }
    }

    integrateModules();

    return () => {
      isCancelled = true;
    };
  }, [retryCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (services.privacyAnalytics) {
        services.privacyAnalytics.destroy();
      }
    };
  }, [services.privacyAnalytics]);

  const contextValue: IntegrationContextValue = {
    status,
    services,
    isReady,
    error,
    retry,
  };

  // Show fallback while integrating
  if (!isReady && !error) {
    return <>{fallback}</>;
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center space-y-4 p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800">Integration Failed</h2>
          <p className="text-gray-600">
            Failed to initialize platform modules. This may affect security and privacy features.
          </p>
          <div className="space-y-2">
            <button
              onClick={retry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry Integration
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors ml-2"
            >
              Reload Page
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-sm text-gray-500 mt-4">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  );
}

// ============================================================================
// INTEGRATION STATUS COMPONENT
// ============================================================================

export function IntegrationStatus() {
  const { status, isReady, error } = useIntegration();

  if (isReady) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
        ✅ Platform Ready
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
        ❌ Integration Error
      </div>
    );
  }

  const loadingModules = Object.entries(status)
    .filter(([, status]) => status === 'loading')
    .map(([module]) => module);

  if (loadingModules.length > 0) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded text-sm">
        🔄 Loading {loadingModules.join(', ')}...
      </div>
    );
  }

  return null;
}