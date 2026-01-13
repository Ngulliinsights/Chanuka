/**
 * Type Compilation Performance Optimization
 * Types and utilities for optimizing TypeScript compilation performance
 */

import { z } from 'zod';
import { createValidatedType } from '../core/validation';
import { Result, ValidationError } from '../core/errors';

// ============================================================================
// Compilation Performance Metrics
// ============================================================================

export type CompilationPerformanceMetrics = {
  /** Total compilation time in milliseconds */
  readonly compilationTimeMs: number;

  /** Time spent in type checking in milliseconds */
  readonly typeCheckingTimeMs: number;

  /** Time spent in semantic analysis in milliseconds */
  readonly semanticAnalysisTimeMs: number;

  /** Time spent in code generation in milliseconds */
  readonly codeGenerationTimeMs: number;

  /** Number of files processed */
  readonly filesProcessed: number;

  /** Number of type instantiations */
  readonly typeInstantiations: number;

  /** Memory usage in MB */
  readonly memoryUsageMb: number;

  /** Peak memory usage in MB */
  readonly peakMemoryUsageMb: number;

  /** Timestamp of compilation */
  readonly timestamp: number;

  /** TypeScript version */
  readonly typescriptVersion: string;

  /** Project configuration hash */
  readonly configHash: string;
};

// ============================================================================
// Compilation Performance Profile
// ============================================================================

export type CompilationPerformanceProfile = {
  /** Unique profile identifier */
  readonly id: string;

  /** Profile name */
  readonly name: string;

  /** Description of the profile */
  readonly description: string;

  /** Performance metrics */
  readonly metrics: CompilationPerformanceMetrics;

  /** Optimization recommendations */
  readonly recommendations: CompilationOptimizationRecommendation[];

  /** Baseline comparison */
  readonly baselineComparison?: CompilationPerformanceComparison;

  /** Timestamp */
  readonly createdAt: number;
};

// ============================================================================
// Optimization Recommendations
// ============================================================================

export type CompilationOptimizationRecommendation = {
  /** Recommendation identifier */
  readonly id: string;

  /** Recommendation type */
  readonly type: CompilationOptimizationType;

  /** Severity level */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';

  /** Description of the recommendation */
  readonly description: string;

  /** Estimated impact on performance */
  readonly estimatedImpact: number; // percentage improvement

  /** Implementation complexity */
  readonly complexity: 'low' | 'medium' | 'high';

  /** Affected files or patterns */
  readonly affectedPatterns?: string[];

  /** Implementation guidance */
  readonly guidance?: string;
};

// ============================================================================
// Performance Comparison
// ============================================================================

export type CompilationPerformanceComparison = {
  /** Baseline metrics */
  readonly baseline: CompilationPerformanceMetrics;

  /** Current metrics */
  readonly current: CompilationPerformanceMetrics;

  /** Time difference in milliseconds */
  readonly timeDifferenceMs: number;

  /** Memory difference in MB */
  readonly memoryDifferenceMb: number;

  /** Percentage improvement */
  readonly percentageImprovement: number;

  /** Regression indicators */
  readonly hasRegression: boolean;

  /** Significant improvements */
  readonly significantImprovements: string[];
};

// ============================================================================
// Optimization Types
// ============================================================================

export type CompilationOptimizationType =
  | 'type-caching'
  | 'conditional-types-simplification'
  | 'mapped-types-optimization'
  | 'recursive-types-termination'
  | 'utility-types-reduction'
  | 'module-resolution-optimization'
  | 'declaration-merging-reduction'
  | 'generic-constraints-simplification'
  | 'intersection-types-optimization'
  | 'union-types-simplification'
  | 'indexed-access-optimization'
  | 'template-literal-types-simplification'
  | 'infer-types-reduction';

// ============================================================================
// Performance Monitoring Configuration
// ============================================================================

export type CompilationPerformanceConfig = {
  /** Enable performance monitoring */
  readonly enabled: boolean;

  /** Monitoring interval in milliseconds */
  readonly intervalMs: number;

  /** Threshold for performance warnings (ms) */
  readonly warningThresholdMs: number;

  /** Threshold for critical alerts (ms) */
  readonly criticalThresholdMs: number;

  /** Memory warning threshold (MB) */
  readonly memoryWarningThresholdMb: number;

  /** Memory critical threshold (MB) */
  readonly memoryCriticalThresholdMb: number;

  /** Maximum history to keep */
  readonly maxHistory: number;

  /** Performance baseline */
  readonly baseline?: CompilationPerformanceMetrics;
};

// ============================================================================
// Performance Analysis Result
// ============================================================================

export type CompilationPerformanceAnalysis = {
  /** Analysis identifier */
  readonly id: string;

  /** Analysis timestamp */
  readonly timestamp: number;

  /** Performance metrics */
  readonly metrics: CompilationPerformanceMetrics;

  /** Performance score (0-100) */
  readonly score: number;

  /** Performance grade */
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';

  /** Optimization recommendations */
  readonly recommendations: CompilationOptimizationRecommendation[];

  /** Critical issues */
  readonly criticalIssues: CompilationOptimizationRecommendation[];

  /** Performance trends */
  readonly trends?: CompilationPerformanceTrend[];
};

// ============================================================================
// Performance Trends
// ============================================================================

export type CompilationPerformanceTrend = {
  /** Trend identifier */
  readonly id: string;

  /** Trend type */
  readonly type: 'improving' | 'declining' | 'stable' | 'volatile';

  /** Metric being tracked */
  readonly metric: keyof CompilationPerformanceMetrics;

  /** Trend direction */
  readonly direction: 'up' | 'down' | 'stable';

  /** Percentage change */
  readonly percentageChange: number;

  /** Time period */
  readonly period: 'hourly' | 'daily' | 'weekly' | 'monthly';

  /** Data points */
  readonly dataPoints: CompilationPerformanceDataPoint[];
};

// ============================================================================
// Performance Data Points
// ============================================================================

export type CompilationPerformanceDataPoint = {
  /** Timestamp */
  readonly timestamp: number;

  /** Value */
  readonly value: number;

  /** Context */
  readonly context?: Record<string, unknown>;
};

// ============================================================================
// Validation Schemas
// ============================================================================

export const CompilationPerformanceMetricsSchema = z.object({
  compilationTimeMs: z.number().positive(),
  typeCheckingTimeMs: z.number().nonnegative(),
  semanticAnalysisTimeMs: z.number().nonnegative(),
  codeGenerationTimeMs: z.number().nonnegative(),
  filesProcessed: z.number().int().positive(),
  typeInstantiations: z.number().int().nonnegative(),
  memoryUsageMb: z.number().positive(),
  peakMemoryUsageMb: z.number().positive(),
  timestamp: z.number().positive(),
  typescriptVersion: z.string().min(1),
  configHash: z.string().min(1),
});

export const CompilationPerformanceProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  metrics: CompilationPerformanceMetricsSchema,
  recommendations: z.array(z.any()), // Will be validated separately
  baselineComparison: z.any().optional(),
  createdAt: z.number().positive(),
});

export const CompilationOptimizationTypeValues = [
  'type-caching',
  'conditional-types-simplification',
  'mapped-types-optimization',
  'recursive-types-termination',
  'utility-types-reduction',
  'module-resolution-optimization',
  'declaration-merging-reduction',
  'generic-constraints-simplification',
  'intersection-types-optimization',
  'union-types-simplification',
  'indexed-access-optimization',
  'template-literal-types-simplification',
  'infer-types-reduction'
] as const;

export const CompilationOptimizationRecommendationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(CompilationOptimizationTypeValues),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1),
  estimatedImpact: z.number().min(0).max(100),
  complexity: z.enum(['low', 'medium', 'high']),
  affectedPatterns: z.array(z.string()).optional(),
  guidance: z.string().optional(),
});

// ============================================================================
// Validated Types
// ============================================================================

export const ValidatedCompilationPerformanceMetrics = createValidatedType(
  CompilationPerformanceMetricsSchema,
  'CompilationPerformanceMetrics'
);

export const ValidatedCompilationPerformanceProfile = createValidatedType(
  CompilationPerformanceProfileSchema,
  'CompilationPerformanceProfile'
);

export const ValidatedCompilationOptimizationRecommendation = createValidatedType(
  CompilationOptimizationRecommendationSchema,
  'CompilationOptimizationRecommendation'
);

// ============================================================================
// Performance Analysis Utilities
// ============================================================================

export function analyzeCompilationPerformance(
  metrics: CompilationPerformanceMetrics,
  _baseline?: CompilationPerformanceMetrics
): CompilationPerformanceAnalysis {
  const score = calculatePerformanceScore(metrics, _baseline);
  const grade = calculatePerformanceGrade(score);
  const recommendations = generateOptimizationRecommendations(metrics, _baseline);
  const criticalIssues = recommendations.filter(r => r.severity === 'critical');

  return {
    id: `perf-analysis-${Date.now()}`,
    timestamp: Date.now(),
    metrics,
    score,
    grade,
    recommendations,
    criticalIssues,
    trends: [],
  };
}

export function calculatePerformanceScore(
  metrics: CompilationPerformanceMetrics,
  baseline?: CompilationPerformanceMetrics
): number {
  // Base score calculation
  let score = 100;

  // Adjust based on compilation time
  if (metrics.compilationTimeMs > 5000) {
    score -= Math.min(50, (metrics.compilationTimeMs - 5000) / 100);
  }

  // Adjust based on memory usage
  if (metrics.memoryUsageMb > 500) {
    score -= Math.min(30, (metrics.memoryUsageMb - 500) / 20);
  }

  // Adjust based on type instantiations
  if (metrics.typeInstantiations > 10000) {
    score -= Math.min(20, (metrics.typeInstantiations - 10000) / 500);
  }

  // Compare with baseline if available
  if (baseline) {
    const timeImprovement = 1 - (metrics.compilationTimeMs / baseline.compilationTimeMs);
    const memoryImprovement = 1 - (metrics.memoryUsageMb / baseline.memoryUsageMb);

    if (timeImprovement > 0) {
      score += timeImprovement * 20;
    }

    if (memoryImprovement > 0) {
      score += memoryImprovement * 15;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculatePerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function generateOptimizationRecommendations(
  metrics: CompilationPerformanceMetrics,
  baseline?: CompilationPerformanceMetrics
): CompilationOptimizationRecommendation[] {
  const recommendations: CompilationOptimizationRecommendation[] = [];

  // High type instantiations recommendation
  if (metrics.typeInstantiations > 10000) {
    recommendations.push({
      id: 'rec-type-instantiations',
      type: 'type-caching',
      severity: 'high',
      description: 'High number of type instantiations detected. Consider implementing type caching strategies.',
      estimatedImpact: 25,
      complexity: 'medium',
      affectedPatterns: ['complex generic types', 'recursive types'],
      guidance: 'Use conditional types and type caching to reduce instantiations.'
    });
  }

  // High compilation time recommendation
  if (metrics.compilationTimeMs > 10000) {
    recommendations.push({
      id: 'rec-compilation-time',
      type: 'conditional-types-simplification',
      severity: 'critical',
      description: 'Excessive compilation time detected. Simplify complex conditional types and reduce utility type usage.',
      estimatedImpact: 35,
      complexity: 'high',
      affectedPatterns: ['nested conditional types', 'complex mapped types'],
      guidance: 'Break down complex type logic and use simpler type constructs.'
    });
  }

  // High memory usage recommendation
  if (metrics.memoryUsageMb > 1000) {
    recommendations.push({
      id: 'rec-memory-usage',
      type: 'utility-types-reduction',
      severity: 'high',
      description: 'High memory usage during compilation. Reduce usage of memory-intensive utility types.',
      estimatedImpact: 20,
      complexity: 'medium',
      affectedPatterns: ['large union types', 'complex intersection types'],
      guidance: 'Optimize large type definitions and reduce unnecessary type operations.'
    });
  }

  return recommendations;
}

// ============================================================================
// Performance Monitoring Utilities
// ============================================================================

export function createPerformanceMonitor(
  config: CompilationPerformanceConfig
): CompilationPerformanceMonitor {
  return {
    config,
    history: [],

    trackPerformance(metrics: CompilationPerformanceMetrics): void {
      this.history.push(metrics);
      if (this.history.length > this.config.maxHistory) {
        this.history.shift();
      }
    },

    analyzeTrends(): CompilationPerformanceTrend[] {
      if (this.history.length < 2) {
        return [];
      }

      // Simple trend analysis
      const trends: CompilationPerformanceTrend[] = [];

      // Compilation time trend
      const timeData = this.history.map((m, i) => ({
        timestamp: m.timestamp,
        value: m.compilationTimeMs,
        context: { index: i }
      }));

      trends.push({
        id: 'trend-compilation-time',
        type: getTrendType(timeData),
        metric: 'compilationTimeMs',
        direction: getTrendDirection(timeData),
        percentageChange: calculatePercentageChange(timeData),
        period: 'daily',
        dataPoints: timeData,
      });

      return trends;
    },

    generateReport(): CompilationPerformanceReport {
      if (this.history.length === 0) {
        return {
          timestamp: Date.now(),
          metrics: [],
          trends: [],
          recommendations: [],
          summary: 'No performance data available.'
        };
      }

      const latest = this.history[this.history.length - 1];
      const trends = this.analyzeTrends();
      const analysis = analyzeCompilationPerformance(latest, this.config.baseline);

      return {
        timestamp: Date.now(),
        metrics: this.history,
        trends,
        recommendations: analysis.recommendations,
        summary: generatePerformanceSummary(analysis),
      };
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTrendType(data: CompilationPerformanceDataPoint[]): CompilationPerformanceTrend['type'] {
  const direction = getTrendDirection(data);
  const change = calculatePercentageChange(data);

  if (Math.abs(change) < 5) return 'stable';
  if (direction === 'up' && change > 10) return 'declining';
  if (direction === 'down' && change > 10) return 'improving';
  return 'volatile';
}

function getTrendDirection(data: CompilationPerformanceDataPoint[]): CompilationPerformanceTrend['direction'] {
  if (data.length < 2) return 'stable';

  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;

  if (last > first * 1.05) return 'up';
  if (last < first * 0.95) return 'down';
  return 'stable';
}

function calculatePercentageChange(data: CompilationPerformanceDataPoint[]): number {
  if (data.length < 2) return 0;

  const first = data[0]?.value ?? 1;
  const last = data[data.length - 1]?.value ?? 0;

  return ((last - first) / first) * 100;
}

function generatePerformanceSummary(analysis: CompilationPerformanceAnalysis): string {
  const parts = [
    `Performance Score: ${analysis.score}/100 (Grade: ${analysis.grade})`,
    `Compilation Time: ${analysis.metrics.compilationTimeMs}ms`,
    `Memory Usage: ${analysis.metrics.memoryUsageMb}MB`,
    `Type Instantiations: ${analysis.metrics.typeInstantiations}`,
  ];

  if (analysis.criticalIssues.length > 0) {
    parts.push(`Critical Issues: ${analysis.criticalIssues.length}`);
  }

  if (analysis.recommendations.length > 0) {
    parts.push(`Recommendations: ${analysis.recommendations.length}`);
  }

  return parts.join(' | ');
}

// ============================================================================
// Performance Monitor Interface
// ============================================================================

export interface CompilationPerformanceMonitor {
  readonly config: CompilationPerformanceConfig;
  readonly history: CompilationPerformanceMetrics[];

  trackPerformance(metrics: CompilationPerformanceMetrics): void;
  analyzeTrends(): CompilationPerformanceTrend[];
  generateReport(): CompilationPerformanceReport;
}

// ============================================================================
// Performance Report
// ============================================================================

export interface CompilationPerformanceReport {
  readonly timestamp: number;
  readonly metrics: CompilationPerformanceMetrics[];
  readonly trends: CompilationPerformanceTrend[];
  readonly recommendations: CompilationOptimizationRecommendation[];
  readonly summary: string;
}
