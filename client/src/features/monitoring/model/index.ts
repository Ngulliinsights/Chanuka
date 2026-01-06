/**
 * Monitoring Model Layer
 *
 * Centralized exports for monitoring domain models and services
 */

export { performanceBenchmarking } from './performance-benchmarking';
export { renderTracker } from './render-tracker';
export { performanceRegressionTester } from './performance-regression-tester';
export { continuousPerformanceMonitor } from './continuous-performance-monitor';
export { routeProfiler } from './route-profiler';
export { RenderTrackingIntegration } from './render-tracking-integration';

export type {
  PerformanceThresholds,
  PerformanceBenchmark,
  OptimizationReport,
} from './performance-benchmarking';

export type {
  RenderTrackingData,
  ComponentLifecycleData,
  PerformanceImpactData,
  InfiniteRenderAlert,
  RenderStats,
  ExtendedLogger,
} from './render-tracker';

export type {
  PerformanceBaseline,
  PerformanceTestResult,
  PerformanceRegression,
} from './performance-regression-tester';

export type { MonitoringConfig, PerformanceAlert } from './continuous-performance-monitor';

export type { RouteMetrics } from './route-profiler';
