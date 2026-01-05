/**
 * Core Monitoring Module
 *
 * Comprehensive monitoring and performance tracking system for development
 * Provides route profiling, regression testing, and continuous monitoring
 *
 * Requirements: 11.4, 11.5
 */

// Route Performance Profiler
export { RouteProfiler, useRouteProfiler } from './RouteProfiler';

// Performance Regression Testing
export {
  PerformanceRegressionTester,
  performanceRegressionTester
} from './PerformanceRegressionTester';

// Continuous Performance Monitoring
export {
  ContinuousPerformanceMonitor,
  continuousPerformanceMonitor
} from './ContinuousPerformanceMonitor';

// Development Monitoring Dashboard
export { DevelopmentMonitoringDashboard } from './DevelopmentMonitoringDashboard';

// Types
export type {
  RoutePerformanceMetrics,
  ComponentMetrics
} from './RouteProfiler';

export type {
  PerformanceBaseline,
  PerformanceTestResult,
  PerformanceRegression,
  RegressionTestConfig
} from './PerformanceRegressionTester';

export type {
  MonitoringConfig,
  PerformanceAlert,
  WebVitalsMetrics,
  PerformanceSnapshot
} from './ContinuousPerformanceMonitor';

/**
 * Initialize all monitoring systems
 */
export const initializeMonitoring = (config?: {
  enableProfiler?: boolean;
  enableRegressionTesting?: boolean;
  enableContinuousMonitoring?: boolean;
}) => {
  const {
    enableProfiler = process.env.NODE_ENV === 'development',
    enableRegressionTesting = process.env.NODE_ENV === 'development',
    enableContinuousMonitoring = process.env.NODE_ENV === 'development'
  } = config || {};

  if (enableRegressionTesting) {
    performanceRegressionTester.startAutomatedTesting();
  }

  if (enableContinuousMonitoring) {
    continuousPerformanceMonitor.start();
  }

  return {
    profiler: enableProfiler,
    regressionTesting: enableRegressionTesting,
    continuousMonitoring: enableContinuousMonitoring
  };
};

/**
 * Cleanup all monitoring systems
 */
export const cleanupMonitoring = () => {
  performanceRegressionTester.stopAutomatedTesting();
  continuousPerformanceMonitor.stop();
};

// Auto-initialize in development mode
if (process.env.NODE_ENV === 'development') {
  initializeMonitoring();
}
