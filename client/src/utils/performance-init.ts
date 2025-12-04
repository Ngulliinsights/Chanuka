/**
 * Performance Monitoring Initialization
 *
 * Initializes all performance monitoring systems for the Chanuka Platform.
 * This should be imported early in the application lifecycle.
 */

import { logger } from './logger';
import { runtimePerformanceMonitor } from './performance-monitor';

// Initialize performance monitoring when the module is imported
let initialized = false;

function initializePerformanceMonitoring() {
  if (initialized) {
    logger.debug('Performance monitoring already initialized');
    return;
  }

  try {
    // The runtimePerformanceMonitor initializes automatically when imported

    // Enable bundle size tracking if in production
    if (process.env.NODE_ENV === 'production') {
      runtimePerformanceMonitor.enableBundleSizeTracking();
    }

    // Log initialization
    logger.info('Performance monitoring initialized successfully', {
      environment: process.env.NODE_ENV,
      bundleTracking: process.env.NODE_ENV === 'production'
    });

    initialized = true;

    // Set up cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        runtimePerformanceMonitor.destroy();
      });
    }

  } catch (error) {
    logger.error('Failed to initialize performance monitoring', { error });
  }
}

// Auto-initialize when this module is imported
initializePerformanceMonitoring();

// Export for manual control if needed
export { initializePerformanceMonitoring };

// Re-export main utilities for convenience
export { runtimePerformanceMonitor } from './performance-monitor';
export { performanceBudgetChecker } from './performance';
export { performanceAlerts } from './performance';
export * from './performance';
export * from './performance-monitor';