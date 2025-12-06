/**
 * Chanuka Platform Utilities v1 - Stable Public API
 *
 * This module provides the stable v1 API surface for the Chanuka Legislative Platform utilities.
 * All exports are versioned and guaranteed to maintain backward compatibility within the v1 major version.
 *
 * @packageDocumentation
 */

// ============================================================================
// CORE ASSET MANAGEMENT
// ============================================================================

/**
 * Core asset loading functionality with retry logic and progress tracking.
 * Provides efficient, production-ready asset loading for scripts, styles, images, and fonts.
 *
 * @example
 * ```typescript
 * import { assetLoader } from '@chanuka/utils/v1';
 *
 * await assetLoader.loadAsset('/script.js', 'script');
 * ```
 */
export {
    assetLoader,
    AssetLoader,
    type AssetLoadConfig,
    type AssetLoadResult,
    type LoadingProgress
} from './assets';

/**
 * Asset fallback configuration system for progressive enhancement.
 * Manages prioritized fallback strategies for different asset types based on loading failures.
 *
 * @example
 * ```typescript
 * import { DEFAULT_ASSET_FALLBACKS, getAssetFallback } from '@chanuka/utils/v1';
 *
 * const fallback = getAssetFallback('images', 'logo');
 * ```
 */
export {
    DEFAULT_ASSET_FALLBACKS,
    ASSET_LOAD_CONFIGS,
    EnhancementLevel,
    type FeatureAvailability,
    getAssetFallback,
    getAssetPriority,
    determineEnhancementLevel,
    getFeatureAvailability,
    applyDegradedMode,
    initializeAssetFallbacks
} from './assets';

// ============================================================================
// BROWSER COMPATIBILITY
// ============================================================================

/**
 * Comprehensive browser compatibility detection and feature testing.
 * Provides detailed browser information, feature availability matrix, and compatibility warnings.
 *
 * @example
 * ```typescript
 * import { getBrowserInfo, isBrowserSupported } from '@chanuka/utils/v1';
 *
 * const browserInfo = getBrowserInfo();
 * if (!isBrowserSupported()) {
 *   console.warn('Browser not fully supported');
 * }
 * ```
 */
export {
    type BrowserInfo,
    type FeatureSet,
    FeatureDetector,
    BrowserDetector,
    browserDetector,
    featureDetector,
    getBrowserInfo,
    isBrowserSupported,
    getBrowserWarnings,
    getBrowserRecommendations,
    hasFeature,
    hasCriticalFeatures
} from './browser';

/**
 * Browser compatibility manager with polyfill loading and user guidance.
 * Orchestrates compatibility detection, polyfill management, and provides actionable recommendations.
 *
 * @example
 * ```typescript
 * import { initializeBrowserCompatibility } from '@chanuka/utils/v1';
 *
 * const status = await initializeBrowserCompatibility();
 * if (status.shouldBlock) {
 *   // Show blocking message
 * }
 * ```
 */
export {
    type CompatibilityManagerConfig,
    type IssueSeverity,
    type CompatibilityRecommendation,
    type CompatibilityStatus,
    BrowserCompatibilityManager,
    browserCompatibilityManager,
    initializeBrowserCompatibility,
    getBrowserCompatibilityStatus,
    shouldBlockBrowser,
    getCompatibilityWarnings,
    getCompatibilityRecommendations,
    getActionableRecommendations
} from './browser';

// ============================================================================
// PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Performance optimization toolkit with real-time monitoring and recommendations.
 * Tracks render performance, memory usage, network requests, and provides optimization suggestions.
 *
 * @example
 * ```typescript
 * import { performanceOptimizer, usePerformanceTracking } from '@chanuka/utils/v1';
 *
 * // Track component performance
 * const Component = () => {
 *   usePerformanceTracking('MyComponent');
 *   return <div>Hello World</div>;
 * };
 * ```
 */
export {
    type BundleMetrics,
    type CacheMetrics,
    type OptimizationRecommendations,
    performanceOptimizer,
    usePerformanceTracking,
    useOptimizedCallback,
    useMemoryOptimizedState,
    lazyWithPreload,
    usePerformanceOptimization
} from './performance';

/**
 * Resource preloading optimization with usage tracking and cleanup.
 * Intelligently preloads critical resources while preventing waste through automatic cleanup.
 *
 * @example
 * ```typescript
 * import { preloadOptimizer, initializeSmartPreloading } from '@chanuka/utils/v1';
 *
 * initializeSmartPreloading();
 * ```
 */
export {
    preloadOptimizer,
    smartPreloads,
    initializeSmartPreloading
} from './preload-optimizer';

/**
 * Route preloading system for single-page applications.
 * Provides intelligent route preloading based on user interactions and connection awareness.
 *
 * @example
 * ```typescript
 * import { routePreloader, useRoutePreloader } from '@chanuka/utils/v1';
 *
 * const { preloadOnHover } = useRoutePreloader();
 * const cleanup = preloadOnHover(MyLazyComponent, '/dashboard')(linkElement);
 * ```
 */
export {
    type RoutePreloadConfig,
    CRITICAL_ROUTES,
    RoutePreloader,
    routePreloader,
    useRoutePreloader,
    ConnectionAwarePreloader,
    connectionAwarePreloader,
    setupLinkPreloading
} from './route-preloading';

// ============================================================================
// LOADING & CACHING
// ============================================================================

/**
 * Comprehensive loading management with scenario-based configurations.
 * Provides intelligent loading strategies, retry logic, and performance analysis.
 *
 * @example
 * ```typescript
 * import { LOADING_SCENARIOS, analyzeLoadingPerformance } from '@chanuka/utils/v1';
 *
 * const scenario = LOADING_SCENARIOS.PAGE_INITIAL;
 * const analysis = analyzeLoadingPerformance(operations, completedOperations, connectionInfo);
 * ```
 */
export {
    type LoadingScenario,
    LOADING_SCENARIOS,
    getAdjustedTimeout,
    calculateRetryDelay,
    sortOperationsByPriority,
    filterOperationsByConnection,
    type LoadingAnalysis,
    analyzeLoadingPerformance,
    LoadingScenarioBuilder,
    createOperationFromScenario,
    LoadingPerformanceMonitor,
    globalLoadingMonitor,
    LoadingUtils
} from './comprehensiveLoading';

/**
 * Connection-aware loading strategies for optimal performance across network conditions.
 * Adapts loading behavior based on connection type, speed, and data saver preferences.
 *
 * @example
 * ```typescript
 * import { connectionAwareLoader, useConnectionAwareLoading } from '@chanuka/utils/v1';
 *
 * const { shouldLoadResource } = useConnectionAwareLoading();
 * if (shouldLoadResource('high')) {
 *   // Load high priority resource
 * }
 * ```
 */
export {
    type ConnectionInfo,
    type LoadingStrategy,
    connectionAwareLoader,
    useConnectionAwareLoading,
    AdaptiveResourceLoader,
    adaptiveResourceLoader,
    getOptimalImageSrc,
    shouldEnableAnimations,
    getOptimalVideoQuality
} from './connectionAwareLoading';

/**
 * Advanced cache invalidation with dependency management and versioning.
 * Provides time-based, tag-based, and pattern-based cache invalidation strategies.
 *
 * @example
 * ```typescript
 * import { cacheInvalidation } from '@chanuka/utils/v1';
 *
 * await cacheInvalidation.set('user-data', userData, { ttl: 300000 }); // 5 minutes
 * await cacheInvalidation.invalidateByTag('user-session');
 * ```
 */
export {
    type CacheInvalidationConfig,
    type CacheEntry,
    type CacheStats,
    cacheInvalidation
} from './cacheInvalidation';

/**
 * Safe lazy loading with error recovery and retry mechanisms.
 * Provides robust component lazy loading with fallback handling and performance optimization.
 *
 * @example
 * ```typescript
 * import { createSafeLazyPage, SafeLazyWrapper } from '@chanuka/utils/v1';
 *
 * const LazyDashboard = createSafeLazyPage('@/pages/dashboard', 'default');
 *
 * const App = () => (
 *   <SafeLazyWrapper fallback={<div>Loading...</div>}>
 *     <LazyDashboard />
 *   </SafeLazyWrapper>
 * );
 * ```
 */
export {
  retryLazyComponentLoad,
  createSafeLazyPage,
  createNamedExportLazy,
  type SafeLazyWrapperProps,
  SafeLazyWrapper,
  SafeLazyPages,
  DynamicFeatureImports,
  SafeLazySponsorshipPages,
  createRetryableLazyComponent,
  createLazyComponentBatch,
  preloadLazyComponent,
  usePreloadComponents,
  clearAllCaches
} from './safe-lazy-loading';

// ============================================================================
// OFFLINE SUPPORT
// ============================================================================

/**
 * Offline analytics and error reporting for offline-first applications.
 * Tracks user interactions, errors, and performance metrics while offline.
 *
 * @example
 * ```typescript
 * import { offlineAnalytics } from '@chanuka/utils/v1';
 *
 * await offlineAnalytics.trackEvent('user_action', { action: 'button_click' });
 * const report = await offlineAnalytics.generateReport();
 * ```
 */
export {
  type OfflineEvent,
  type OfflineAnalyticsReport,
  offlineAnalytics
} from './offlineAnalytics';

/**
 * Offline data management with IndexedDB integration and sync queue management.
 * Handles offline data storage, caching, and background synchronization.
 *
 * @example
 * ```typescript
 * import { offlineDataManager } from '@chanuka/utils/v1';
 *
 * await offlineDataManager.setOfflineData('user-preferences', preferences);
 * const data = await offlineDataManager.getOfflineData('user-preferences');
 * ```
 */
export {
  type OfflineAction,
  type CachedData,
  type SyncStatus,
  offlineDataManager
} from './offlineDataManager';

// ============================================================================
// SERVICE RECOVERY
// ============================================================================

/**
 * Service recovery utilities with automatic retry and health checking.
 * Provides resilient API communication with exponential backoff and recovery strategies.
 *
 * @example
 * ```typescript
 * import { serviceRecovery, startAutoRecovery } from '@chanuka/utils/v1';
 *
 * const response = await serviceRecovery.fetchWithRetry('/api/data');
 * startAutoRecovery(); // Enable automatic recovery
 * ```
 */
export {
    serviceRecovery,
    startAutoRecovery,
    stopAutoRecovery
} from './service-recovery';

// ============================================================================
// SERVICE WORKER
// ============================================================================

/**
 * Service worker management utilities for PWA functionality.
 * Handles registration, updates, messaging, and background synchronization.
 *
 * @example
 * ```typescript
 * import { registerServiceWorker, isServiceWorkerSupported } from '@chanuka/utils/v1';
 *
 * if (isServiceWorkerSupported()) {
 *   await registerServiceWorker({
 *     onUpdate: () => console.log('Update available'),
 *     onSuccess: () => console.log('SW registered')
 *   });
 * }
 * ```
 */
export {
  type ServiceWorkerConfig,
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  getServiceWorkerRegistration,
  sendMessageToServiceWorker,
  skipWaiting,
  getServiceWorkerVersion,
  isContentCached,
  preloadCriticalResources,
  ServiceWorkerUpdateNotifier,
  isOnline,
  addNetworkStatusListener,
  registerBackgroundSync
} from './serviceWorker';

// ============================================================================
// LAYOUT
// ============================================================================

/**
 * Responsive layout management with breakpoint detection and utilities.
 * Provides responsive state management, breakpoint utilities, and CSS-in-JS helpers.
 *
 * @example
 * ```typescript
 * import { useResponsiveLayout, BREAKPOINTS } from '@chanuka/utils/v1';
 *
 * const Component = () => {
 *   const { isMobile, breakpoint } = useResponsiveLayout();
 *
 *   return (
 *     <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
 *       Current breakpoint: {breakpoint}
 *     </div>
 *   );
 * };
 * ```
 */
export {
    type BreakpointConfig,
    type ResponsiveState,
    BREAKPOINTS,
    ResponsiveLayoutManager,
    getResponsiveManager,
    useResponsiveLayout,
    ResponsiveUtils,
    createResponsiveStyles
} from './mobile';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Environment configuration management with type safety.
 * Provides centralized access to environment variables and configuration settings.
 *
 * @example
 * ```typescript
 * import { envConfig } from '@chanuka/utils/v1';
 *
 * console.log('API URL:', envConfig.apiUrl);
 * console.log('Analytics enabled:', envConfig.enableAnalytics);
 * ```
 */
export {
    envConfig
} from './env-config';

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Route validation utilities for navigation and link checking.
 * Provides route definition management, validation, and navigation link verification.
 *
 * @example
 * ```typescript
 * import { validateRoutes, allRoutes } from '@chanuka/utils/v1';
 *
 * const validation = validateRoutes();
 * console.log('Routes valid:', validation.summary);
 * ```
 */
export {
    type RouteDefinition,
    allRoutes,
    navigationLinks,
    validateRoutes,
    generateRouteMap,
    testRoutePattern,
    testCases
} from './route-validation';

// ============================================================================
// POLYFILLS
// ============================================================================

/**
 * Browser polyfills for legacy browser support.
 * Provides lightweight polyfills for essential web APIs with intelligent loading.
 *
 * @example
 * ```typescript
 * import { loadPolyfills, areCriticalPolyfillsLoaded } from '@chanuka/utils/v1';
 *
 * await loadPolyfills();
 * if (areCriticalPolyfillsLoaded()) {
 *   // Safe to use modern APIs
 * }
 * ```
 */
export {
  polyfillManager,
  loadPolyfills,
  loadFetchPolyfill,
  loadPromisePolyfill,
  loadStoragePolyfills,
  loadAbortControllerPolyfill,
  loadURLPolyfills,
  loadFormDataPolyfill,
  getPolyfillStatus,
  areCriticalPolyfillsLoaded,
  getPolyfillLoadingSummary
} from './browser';

// ============================================================================
// CORE LOGGING
// ============================================================================

/**
 * Unified logging system with render tracking and performance monitoring.
 * Provides structured logging, component lifecycle tracking, and performance insights.
 *
 * @example
 * ```typescript
 * import { logger } from '@chanuka/utils/v1';
 *
 * logger.info('User logged in', { component: 'auth', userId: '123' });
 * logger.trackRender({ component: 'Dashboard', renderCount: 1, timestamp: Date.now() });
 * ```
 */
export {
    type LogContext,
    type Logger,
    type RenderTrackingData,
    type ComponentLifecycleData,
    type PerformanceImpactData,
    type RenderStats,
    type ExtendedLogger,
    logger,
    coreLogger,
    sharedLogger
} from './logger';