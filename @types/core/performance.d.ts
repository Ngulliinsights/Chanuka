/**
 * Core performance type declarations
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
  bundleSize?: number;
}

export interface PerformanceThresholds {
  loadTime: { good: number; poor: number };
  renderTime: { good: number; poor: number };
  interactionTime: { good: number; poor: number };
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
  score: number;
  recommendations: string[];
}

export interface PerformanceBenchmark {
  name: string;
  value: number;
  threshold: {
    good: number;
    poor: number;
  };
  recommendations: string[];
}
