/**
 * Shared Infrastructure Module
 * 
 * Consolidated infrastructure services that can be used across the application.
 * This module integrates core technical infrastructure into the shared layer
 * following the architectural principle: "shared/ handles UI concerns and 
 * infrastructure, core/ handles business logic."
 */

// ============================================================================
// Performance Infrastructure
// ============================================================================

export {
  // Performance monitoring
  WebVitalsMonitor,
  PerformanceMonitor,
  PerformanceBudgetChecker,
  PerformanceAlertsManager,
  
  // Convenience functions
  getPerformanceMonitor,
  recordMetric,
  getWebVitalsScores,
  getOverallPerformanceScore,
  getPerformanceStats,
  getActiveAlerts,
  getBudgetCompliance,
  checkBudget,
  setBudget,
  setAlertThreshold,
  resolveAlert,
  addWebVitalsListener,
  addAlertListener,
  exportPerformanceReport,
  resetPerformanceData,
  updatePerformanceConfig,
  stopPerformanceMonitoring,
  
  // Measurement utilities
  measureAsync,
  measureSync,
  startTiming,
  markPerformance,
  measurePerformance,
  
  // Types
  type PerformanceMetric,
  type WebVitalsMetric,
  type PerformanceBudget,
  type PerformanceAlert,
  type BudgetCheckResult,
  type PerformanceConfig,
  type PerformanceStats,
  type OptimizationSuggestion,
  DEFAULT_PERFORMANCE_CONFIG
} from '../../core/performance';

// ============================================================================
// Error Infrastructure
// ============================================================================

export {
  // Error handling
  coreErrorHandler,
  createNetworkError,
  createValidationError,
  createAuthError,
  
  // Recovery strategies
  networkRetryStrategy,
  cacheClearStrategy,
  pageReloadStrategy,
  authRefreshStrategy,
  defaultRecoveryStrategies,
  registerDefaultRecoveryStrategies,
  executeRecovery,
  useRecovery,
  isRecoverable,
  
  // Initialization
  initializeCoreErrorHandling,
  getErrorStats,
  handleError,
  createError,
  logError,
  useCoreErrorHandler,
  
  // Types
  type AppError,
  type ErrorContext,
  type ErrorRecoveryStrategy,
  type ErrorHandlerConfig,
  type ErrorListener,
  type ErrorStats,
  type ReactErrorInfo,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
  type RecoveryResult,
  
  // Enums
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction
} from '../../core/error';

// ============================================================================
// Browser Infrastructure
// ============================================================================

export {
  // Browser compatibility
  FeatureDetector,
  BrowserDetector,
  PolyfillManager,
  BrowserCompatibilityManager,
  
  // Singleton instances
  featureDetector,
  browserDetector,
  polyfillManager,
  browserCompatibilityManager,
  
  // Utilities
  getBrowserInfo,
  isBrowserSupported,
  hasFeature,
  hasCriticalFeatures,
  initializeBrowserCompatibility,
  getBrowserCompatibilityStatus,
  shouldBlockBrowser,
  getCompatibilityWarnings,
  loadPolyfills,
  isBrowserEnv,
  isTestEnv,
  
  // Types
  type BrowserInfo,
  type FeatureSet,
  type CompatibilityStatus,
  type CompatibilityRecommendation,
  type PolyfillStatus,
  
  // Constants
  MINIMUM_VERSIONS,
  CRITICAL_FEATURES,
  BROWSER_NAME_MAP
} from '../../core/browser';

// ============================================================================
// Loading Infrastructure
// ============================================================================

export {
  // Loading system (to be integrated from core/loading)
  // This will be added once core/loading is properly exported
} from '../../core/loading';

// ============================================================================
// Storage Infrastructure
// ============================================================================

export {
  // Storage utilities
  SecureStorage,
  CacheStorageManager,
  
  // Convenience functions
  storeSecurely,
  retrieveSecurely,
  getCurrentSession,
  isAuthenticated,
  getAuthToken,
  getRefreshToken,
  isTokenValid,
  cacheData,
  getCachedData,
  clearCache,
  clearSession,
  clearTokens,
  clearAllStorage,
  getStorageStats,
  
  // Types
  type StorageOptions,
  type SessionInfo,
  type TokenInfo,
  type CacheEntry,
  type StorageStats,
  type CacheStats,
  type SessionValidation,
  type TokenValidation,
  type CleanupOptions,
  type StorageError,
  type StorageErrorCode,
  type StorageBackend
} from '../../core/storage';

// ============================================================================
// Mobile Infrastructure
// ============================================================================

export {
  // Mobile utilities (to be integrated from core/mobile)
  // This will provide device detection, touch handling, etc.
} from '../../core/mobile';

// ============================================================================
// Seamless Integration Adapter
// ============================================================================

/**
 * Seamless Integration Adapter
 * 
 * Provides intelligent fallbacks and progressive enhancement
 * as described in SEAMLESS_INTEGRATION_GUIDE.md
 */
export class SharedInfrastructureAdapter {
  private static instance: SharedInfrastructureAdapter;
  
  static getInstance(): SharedInfrastructureAdapter {
    if (!SharedInfrastructureAdapter.instance) {
      SharedInfrastructureAdapter.instance = new SharedInfrastructureAdapter();
    }
    return SharedInfrastructureAdapter.instance;
  }
  
  /**
   * Initialize all infrastructure systems
   */
  async initialize(): Promise<void> {
    try {
      // Initialize error handling
      initializeCoreErrorHandling();
      
      // Initialize browser compatibility
      await initializeBrowserCompatibility();
      
      // Initialize performance monitoring
      const perfMonitor = getPerformanceMonitor();
      
      console.log('✅ Shared infrastructure initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize shared infrastructure:', error);
      throw error;
    }
  }
  
  /**
   * Get infrastructure health status
   */
  getHealthStatus() {
    return {
      performance: {
        monitoring: !!getPerformanceMonitor(),
        webVitals: getWebVitalsScores(),
        alerts: getActiveAlerts().length
      },
      browser: {
        supported: isBrowserSupported(),
        features: hasCriticalFeatures(),
        compatibility: getBrowserCompatibilityStatus()
      },
      storage: {
        available: typeof Storage !== 'undefined',
        stats: getStorageStats()
      },
      errors: {
        stats: getErrorStats(),
        recentCount: getErrorStats().totalErrors
      }
    };
  }
}

// Export singleton instance
export const sharedInfrastructure = SharedInfrastructureAdapter.getInstance();

// ============================================================================
// Convenience Re-exports for Common Patterns
// ============================================================================

/**
 * Common infrastructure initialization
 */
export async function initializeSharedInfrastructure(): Promise<void> {
  return sharedInfrastructure.initialize();
}

/**
 * Get overall system health
 */
export function getInfrastructureHealth() {
  return sharedInfrastructure.getHealthStatus();
}