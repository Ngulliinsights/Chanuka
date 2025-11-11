/**
 * Utils Index
 * 
 * Central export point for all client utilities
 */

// Asset Management
export * from './asset-loading';
export * from './asset-fallback-config';

// Browser Compatibility
export * from './browser-compatibility';
export * from './browser-compatibility-manager';
export * from './browser-compatibility-tests';
export * from './logger';

// Performance
export * from './performance-optimizer';
export * from './preload-optimizer';
export * from './route-preloading';

// Loading & Caching
export * from './comprehensiveLoading';
export * from './connectionAwareLoading';
export * from './cacheInvalidation';
export * from './safe-lazy-loading';

// Offline Support
export * from './offlineAnalytics';
export * from './offlineDataManager';

// Development
export * from './development-debug';
export * from './development-error-recovery';

// Mobile
export * from './mobile-error-handler';
export * from './mobile-touch-handler';

// Navigation Utils
// export * from './navigation'; // Commented out due to missing module

// Service & Error Recovery
export * from './service-recovery';
export * from './serviceWorker';

// Layout & Responsive
export * from './responsive-layout';

// Configuration
export * from './env-config';

// Validation
export * from './route-validation';

// RUM Integration
export * from './rum-integration';

// Polyfills
export * from './polyfills';