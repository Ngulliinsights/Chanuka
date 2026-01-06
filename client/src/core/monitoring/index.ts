/**
 * Core Monitoring Module
 *
 * Comprehensive monitoring and performance tracking system for development
 * Provides route profiling, regression testing, and continuous monitoring
 */

/**
 * Core Monitoring Module
 *
 * Comprehensive monitoring and performance tracking system for development
 * Provides route profiling, regression testing, and continuous monitoring
 */

// Development tools (moved to features/monitoring)
export { routeProfiler } from '@client/features/monitoring';
export { performanceRegressionTester } from '@client/features/monitoring';
export { continuousPerformanceMonitor } from '@client/features/monitoring';

// Development Dashboard (moved to shared infrastructure)
export { DevelopmentMonitoringDashboard } from '@client/shared/infrastructure/monitoring';

// Enhanced Error Monitoring (moved to shared infrastructure)
export { ErrorMonitor as ErrorMonitoring } from '@client/shared/infrastructure/monitoring';

// Enhanced Performance Monitoring (moved to shared infrastructure)
export { PerformanceMonitor as PerformanceMonitoring } from '@client/shared/infrastructure/monitoring';

// Enhanced Monitoring Integration (moved to shared infrastructure)
export { MonitoringIntegration as MonitoringService } from '@client/shared/infrastructure/monitoring';
export type { MonitoringConfig } from '@client/shared/infrastructure/monitoring';

// Monitoring Initialization
export {
  initializeMonitoring,
  getMonitoringInstance,
  default as MonitoringInitializer
} from './monitoring-init';

/**
 * Initialize all monitoring systems
 */
export const initializeCoreMonitoring = async (config?: {
  enableProfiler?: boolean;
  enableRegressionTesting?: boolean;
  enableContinuousMonitoring?: boolean;
  enableEnhancedMonitoring?: boolean;
}) => {
  const {
    enableProfiler = process.env.NODE_ENV === 'development',
    enableRegressionTesting = process.env.NODE_ENV === 'development',
    enableContinuousMonitoring = process.env.NODE_ENV === 'development',
    enableEnhancedMonitoring = process.env.NODE_ENV === 'development'
  } = config || {};

  if (enableRegressionTesting) {
    const { performanceRegressionTester } = await import('@client/features/monitoring');
    performanceRegressionTester.startAutomatedTesting();
  }

  if (enableContinuousMonitoring) {
    const { continuousPerformanceMonitor } = await import('@client/features/monitoring');
    continuousPerformanceMonitor.start();
  }

  if (enableEnhancedMonitoring) {
    // Enhanced monitoring auto-initializes
    console.log('Enhanced monitoring enabled');
  }

  return {
    profiler: enableProfiler,
    regressionTesting: enableRegressionTesting,
    continuousMonitoring: enableContinuousMonitoring,
    enhancedMonitoring: enableEnhancedMonitoring
  };
};

/**
 * Cleanup all monitoring systems
 */
export const cleanupMonitoring = async () => {
  const { performanceRegressionTester, continuousPerformanceMonitor } = await import('@client/features/monitoring');

  performanceRegressionTester.stopAutomatedTesting();
  continuousPerformanceMonitor.stop();
};

// Auto-initialize in development mode
if (process.env.NODE_ENV === 'development') {
  initializeCoreMonitoring().catch(console.error);
}
