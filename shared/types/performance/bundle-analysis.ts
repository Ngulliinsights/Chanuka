/**
 * Bundle Size Impact Analysis
 * Types and utilities for analyzing bundle size impact of type changes
 */

import { z } from 'zod';
import { createValidatedType } from '../core/validation';

// ============================================================================
// Bundle Analysis Types
// ============================================================================

export type BundleAnalysisResult = {
  /** Analysis timestamp */
  readonly timestamp: number;

  /** Bundle analysis identifier */
  readonly analysisId: string;

  /** Original bundle metrics */
  readonly originalBundle: BundleMetrics;

  /** New bundle metrics */
  readonly newBundle: BundleMetrics;

  /** Bundle size delta */
  readonly sizeDelta: BundleSizeDelta;

  /** Performance impact */
  readonly performanceImpact: BundlePerformanceImpact;

  /** Type analysis */
  readonly typeAnalysis: TypeBundleImpactAnalysis[];

  /** Recommendations */
  readonly recommendations: BundleOptimizationRecommendation[];
};

// ============================================================================
// Bundle Metrics
// ============================================================================

export type BundleMetrics = {
  /** Total bundle size in bytes */
  readonly totalSizeBytes: number;

  /** Parsed size in bytes */
  readonly parsedSizeBytes: number;

  /** Gzipped size in bytes */
  readonly gzipSizeBytes: number;

  /** Brotli size in bytes */
  readonly brotliSizeBytes: number;

  /** Module count */
  readonly moduleCount: number;

  /** Asset count */
  readonly assetCount: number;

  /** Entry points */
  readonly entryPoints: string[];

  /** Chunk analysis */
  readonly chunks: BundleChunk[];

  /** Dependency analysis */
  readonly dependencies: BundleDependency[];

  /** Timestamp */
  readonly timestamp: number;
};

export type BundleChunk = {
  /** Chunk identifier */
  readonly id: string;

  /** Chunk name */
  readonly name: string;

  /** Chunk size in bytes */
  readonly sizeBytes: number;

  /** Modules in chunk */
  readonly modules: BundleChunkModule[];

  /** Entry chunk indicator */
  readonly isEntry: boolean;

  /** Initial chunk indicator */
  readonly isInitial: boolean;
};

export type BundleChunkModule = {
  /** Module identifier */
  readonly id: string;

  /** Module name */
  readonly name: string;

  /** Module size in bytes */
  readonly sizeBytes: number;

  /** Module type */
  readonly type: 'javascript' | 'typescript' | 'css' | 'json' | 'asset';

  /** Module path */
  readonly path: string;
};

export type BundleDependency = {
  /** Dependency name */
  readonly name: string;

  /** Dependency version */
  readonly version: string;

  /** Dependency size in bytes */
  readonly sizeBytes: number;

  /** Dependency type */
  readonly type: 'production' | 'development' | 'peer' | 'optional';

  /** Is direct dependency */
  readonly isDirect: boolean;
};

// ============================================================================
// Bundle Size Delta
// ============================================================================

export type BundleSizeDelta = {
  /** Absolute size change in bytes */
  readonly absoluteChangeBytes: number;

  /** Percentage change */
  readonly percentageChange: number;

  /** Change direction */
  readonly direction: 'increase' | 'decrease' | 'no-change';

  /** Gzip size change */
  readonly gzipChangeBytes: number;

  /** Brotli size change */
  readonly brotliChangeBytes: number;

  /** Module count change */
  readonly moduleCountChange: number;
};

// ============================================================================
// Performance Impact
// ============================================================================

export type BundlePerformanceImpact = {
  /** Load time impact in ms */
  readonly loadTimeImpactMs: number;

  /** Parse time impact in ms */
  readonly parseTimeImpactMs: number;

  /** Execution time impact in ms */
  readonly executionTimeImpactMs: number;

  /** Memory impact in MB */
  readonly memoryImpactMb: number;

  /** Network transfer impact */
  readonly networkImpact: NetworkTransferImpact;

  /** Overall impact score */
  readonly impactScore: number;

  /** Impact severity */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
};

export type NetworkTransferImpact = {
  /** Transfer size impact in bytes */
  readonly transferSizeImpactBytes: number;

  /** Transfer time impact in ms */
  readonly transferTimeImpactMs: number;

  /** Compression ratio impact */
  readonly compressionRatioImpact: number;

  /** Cacheability impact */
  readonly cacheabilityImpact: 'positive' | 'neutral' | 'negative';
};

// ============================================================================
// Type Bundle Impact Analysis
// ============================================================================

export type TypeBundleImpactAnalysis = {
  /** Type identifier */
  readonly typeId: string;

  /** Type name */
  readonly typeName: string;

  /** Type size in bytes */
  readonly typeSizeBytes: number;

  /** Bundle impact */
  readonly bundleImpact: TypeBundleImpact;

  /** Usage patterns */
  readonly usagePatterns: TypeUsagePattern[];

  /** Optimization potential */
  readonly optimizationPotential: number;
};

export type TypeBundleImpact = {
  /** Size contribution to bundle */
  readonly sizeContributionBytes: number;

  /** Percentage of total bundle */
  readonly percentageOfBundle: number;

  /** Impact type */
  readonly impactType: 'direct' | 'indirect' | 'transitive';

  /** Critical path indicator */
  readonly isCriticalPath: boolean;
};

export type TypeUsagePattern = {
  /** Usage type */
  readonly type: 'runtime' | 'compile-time' | 'both';

  /** Usage frequency */
  readonly frequency: 'low' | 'medium' | 'high';

  /** Usage context */
  readonly context: string;
};

// ============================================================================
// Bundle Optimization Recommendations
// ============================================================================

export type BundleOptimizationRecommendation = {
  /** Recommendation identifier */
  readonly id: string;

  /** Recommendation type */
  readonly type: BundleOptimizationType;

  /** Target type or module */
  readonly target: string;

  /** Description */
  readonly description: string;

  /** Estimated savings */
  readonly estimatedSavingsBytes: number;

  /** Implementation complexity */
  readonly complexity: 'low' | 'medium' | 'high';

  /** Priority */
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
};

export type BundleOptimizationType =
  | 'tree-shaking'
  | 'code-splitting'
  | 'lazy-loading'
  | 'compression-optimization'
  | 'dependency-deduplication'
  | 'asset-optimization'
  | 'type-simplification'
  | 'module-reorganization'
  | 'caching-strategy';

// ============================================================================
// Bundle Analysis Configuration
// ============================================================================

export type BundleAnalysisConfig = {
  /** Analysis identifier */
  readonly analysisId: string;

  /** Bundle analysis name */
  readonly name: string;

  /** Description */
  readonly description: string;

  /** Baseline bundle metrics */
  readonly baseline?: BundleMetrics;

  /** Comparison thresholds */
  readonly thresholds: BundleAnalysisThresholds;

  /** Analysis scope */
  readonly scope: BundleAnalysisScope;
};

export type BundleAnalysisThresholds = {
  /** Size increase warning threshold */
  readonly sizeIncreaseWarningBytes: number;

  /** Size increase critical threshold */
  readonly sizeIncreaseCriticalBytes: number;

  /** Performance impact warning threshold */
  readonly performanceImpactWarningMs: number;

  /** Performance impact critical threshold */
  readonly performanceImpactCriticalMs: number;
};

export type BundleAnalysisScope = {
  /** Include production dependencies */
  readonly includeProduction: boolean;

  /** Include development dependencies */
  readonly includeDevelopment: boolean;

  /** Include assets */
  readonly includeAssets: boolean;

  /** Include source maps */
  readonly includeSourceMaps: boolean;
};

// ============================================================================
// Bundle Analysis Utilities
// ============================================================================

export function analyzeBundleImpact(
  originalBundle: BundleMetrics,
  newBundle: BundleMetrics,
  config: BundleAnalysisConfig
): BundleAnalysisResult {
  const analysisId = config.analysisId || `bundle-analysis-${Date.now()}`;
  const sizeDelta = calculateSizeDelta(originalBundle, newBundle);
  const performanceImpact = calculatePerformanceImpact(sizeDelta);
  const typeAnalysis = analyzeTypeImpacts(originalBundle, newBundle);
  const recommendations = generateBundleRecommendations(sizeDelta, performanceImpact, typeAnalysis);

  return {
    timestamp: Date.now(),
    analysisId,
    originalBundle,
    newBundle,
    sizeDelta,
    performanceImpact,
    typeAnalysis,
    recommendations,
  };
}

export function calculateSizeDelta(
  original: BundleMetrics,
  current: BundleMetrics
): BundleSizeDelta {
  const absoluteChange = current.totalSizeBytes - original.totalSizeBytes;
  const percentageChange = original.totalSizeBytes > 0
    ? (absoluteChange / original.totalSizeBytes) * 100
    : 0;

  return {
    absoluteChangeBytes: absoluteChange,
    percentageChange,
    direction: absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'no-change',
    gzipChangeBytes: current.gzipSizeBytes - original.gzipSizeBytes,
    brotliChangeBytes: current.brotliSizeBytes - original.brotliSizeBytes,
    moduleCountChange: current.moduleCount - original.moduleCount,
  };
}

export function calculatePerformanceImpact(
  sizeDelta: BundleSizeDelta
): BundlePerformanceImpact {
  // Estimate performance impact based on size changes
  const loadTimeImpact = estimateLoadTimeImpact(sizeDelta);
  const parseTimeImpact = estimateParseTimeImpact(sizeDelta);
  const memoryImpact = estimateMemoryImpact(sizeDelta);
  const networkImpact = calculateNetworkImpact(sizeDelta);

  const impactScore = calculateImpactScore(loadTimeImpact, parseTimeImpact, memoryImpact);
  const severity = getImpactSeverity(impactScore);

  return {
    loadTimeImpactMs: loadTimeImpact,
    parseTimeImpactMs: parseTimeImpact,
    executionTimeImpactMs: 0, // Would need actual profiling
    memoryImpactMb: memoryImpact,
    networkImpact,
    impactScore,
    severity,
  };
}

function estimateLoadTimeImpact(delta: BundleSizeDelta): number {
  // Simple estimation: 1KB ≈ 1ms load time
  return delta.absoluteChangeBytes / 1024;
}

function estimateParseTimeImpact(delta: BundleSizeDelta): number {
  // Simple estimation: 10KB ≈ 1ms parse time
  return delta.absoluteChangeBytes / 10240;
}

function estimateMemoryImpact(delta: BundleSizeDelta): number {
  // Convert bytes to MB
  return delta.absoluteChangeBytes / (1024 * 1024);
}

function calculateNetworkImpact(delta: BundleSizeDelta): NetworkTransferImpact {
  const transferSizeImpact = delta.gzipChangeBytes || delta.absoluteChangeBytes;
  const transferTimeImpact = transferSizeImpact / 1024; // 1KB ≈ 1ms
  const compressionRatioImpact = delta.gzipChangeBytes > 0
    ? (delta.gzipChangeBytes / delta.absoluteChangeBytes) * 100
    : 0;

  return {
    transferSizeImpactBytes: transferSizeImpact,
    transferTimeImpactMs: transferTimeImpact,
    compressionRatioImpact,
    cacheabilityImpact: delta.absoluteChangeBytes > 0 ? 'negative' : 'positive',
  };
}

function calculateImpactScore(
  loadTime: number,
  parseTime: number,
  memory: number
): number {
  // Simple weighted scoring
  return Math.round((loadTime * 0.5) + (parseTime * 0.3) + (memory * 0.2));
}

function getImpactSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score > 100) return 'critical';
  if (score > 50) return 'high';
  if (score > 20) return 'medium';
  return 'low';
}

function analyzeTypeImpacts(
  originalBundle: BundleMetrics,
  newBundle: BundleMetrics
): TypeBundleImpactAnalysis[] {
  // In a real implementation, this would analyze actual type usage
  // For this example, we'll return a simple analysis
  return [
    {
      typeId: 'type-performance-metrics',
      typeName: 'PerformanceMetrics',
      typeSizeBytes: 2048,
      bundleImpact: {
        sizeContributionBytes: 2048,
        percentageOfBundle: (2048 / newBundle.totalSizeBytes) * 100,
        impactType: 'direct',
        isCriticalPath: true,
      },
      usagePatterns: [
        { type: 'runtime', frequency: 'high', context: 'performance monitoring' }
      ],
      optimizationPotential: 30,
    },
    {
      typeId: 'type-validation-cache',
      typeName: 'ValidationCache',
      typeSizeBytes: 1536,
      bundleImpact: {
        sizeContributionBytes: 1536,
        percentageOfBundle: (1536 / newBundle.totalSizeBytes) * 100,
        impactType: 'direct',
        isCriticalPath: true,
      },
      usagePatterns: [
        { type: 'runtime', frequency: 'medium', context: 'validation caching' }
      ],
      optimizationPotential: 25,
    }
  ];
}

function generateBundleRecommendations(
  sizeDelta: BundleSizeDelta,
  performanceImpact: BundlePerformanceImpact,
  typeAnalysis: TypeBundleImpactAnalysis[]
): BundleOptimizationRecommendation[] {
  const recommendations: BundleOptimizationRecommendation[] = [];

  // Size increase recommendations
  if (sizeDelta.direction === 'increase' && sizeDelta.absoluteChangeBytes > 10240) {
    recommendations.push({
      id: 'rec-bundle-size-increase',
      type: 'tree-shaking',
      target: 'all-types',
      description: 'Significant bundle size increase detected. Review type usage and tree-shaking configuration.',
      estimatedSavingsBytes: sizeDelta.absoluteChangeBytes * 0.3,
      complexity: 'medium',
      priority: 'high',
    });
  }

  // Performance impact recommendations
  if (performanceImpact.severity === 'high' || performanceImpact.severity === 'critical') {
    recommendations.push({
      id: 'rec-performance-impact',
      type: 'code-splitting',
      target: 'critical-path',
      description: 'High performance impact detected. Consider code-splitting critical path modules.',
      estimatedSavingsBytes: sizeDelta.absoluteChangeBytes * 0.4,
      complexity: 'high',
      priority: 'critical',
    });
  }

  // Type-specific recommendations
  const highImpactTypes = typeAnalysis.filter(t =>
    t.optimizationPotential > 25 && t.bundleImpact.isCriticalPath
  );

  if (highImpactTypes.length > 0) {
    recommendations.push({
      id: 'rec-high-impact-types',
      type: 'type-simplification',
      target: highImpactTypes.map(t => t.typeName).join(', '),
      description: 'High impact types identified for optimization. Simplify or refactor these types.',
      estimatedSavingsBytes: highImpactTypes.reduce((sum, t) => sum + (t.typeSizeBytes * 0.2), 0),
      complexity: 'medium',
      priority: 'high',
    });
  }

  return recommendations;
}

// ============================================================================
// Bundle Analysis Validation Schemas
// ============================================================================

export const BundleMetricsSchema = z.object({
  totalSizeBytes: z.number().positive(),
  parsedSizeBytes: z.number().positive(),
  gzipSizeBytes: z.number().positive(),
  brotliSizeBytes: z.number().positive(),
  moduleCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  entryPoints: z.array(z.string()),
  chunks: z.array(z.any()), // Would be validated separately
  dependencies: z.array(z.any()), // Would be validated separately
  timestamp: z.number().positive(),
});

export const BundleAnalysisConfigSchema = z.object({
  analysisId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  baseline: z.any().optional(),
  thresholds: z.any(), // Would be validated separately
  scope: z.any(), // Would be validated separately
});

export const ValidatedBundleMetrics = createValidatedType(
  BundleMetricsSchema,
  'BundleMetrics'
);

export const ValidatedBundleAnalysisConfig = createValidatedType(
  BundleAnalysisConfigSchema,
  'BundleAnalysisConfig'
);

// ============================================================================
// Bundle Analysis Report
// ============================================================================

export type BundleAnalysisReport = {
  /** Report timestamp */
  readonly timestamp: number;

  /** Analysis identifier */
  readonly analysisId: string;

  /** Analysis name */
  readonly name: string;

  /** Bundle analysis result */
  readonly result: BundleAnalysisResult;

  /** Summary */
  readonly summary: string;

  /** Generated by */
  readonly generatedBy: string;

  /** Generation timestamp */
  readonly generatedAt: number;
};

/**
 * Generate a bundle analysis report
 */
export function generateBundleAnalysisReport(
  analysis: BundleAnalysisResult,
  config: BundleAnalysisConfig
): BundleAnalysisReport {
  return {
    timestamp: Date.now(),
    analysisId: analysis.analysisId,
    name: config.name,
    result: analysis,
    summary: generateBundleAnalysisSummary(analysis),
    generatedBy: 'performance-bundle-analyzer',
    generatedAt: Date.now(),
  };
}

function generateBundleAnalysisSummary(
  analysis: BundleAnalysisResult
): string {
  const parts = [
    `Bundle Analysis: ${analysis.analysisId}`,
    `Size Change: ${analysis.sizeDelta.direction} (${analysis.sizeDelta.absoluteChangeBytes} bytes, ${analysis.sizeDelta.percentageChange.toFixed(2)}%)`,
    `Performance Impact: ${analysis.performanceImpact.severity}`,
    `Impact Score: ${analysis.performanceImpact.impactScore}/100`,
    `Recommendations: ${analysis.recommendations.length}`,
  ];

  if (analysis.recommendations.some(r => r.priority === 'critical')) {
    parts.push('CRITICAL recommendations require immediate attention');
  }

  return parts.join(' | ');
}

// ============================================================================
// Bundle Analysis Monitoring
// ============================================================================

export type BundleAnalysisMonitor = {
  /** Monitor configuration */
  config: BundleAnalysisConfig;

  /** Analysis history */
  history: BundleAnalysisResult[];

  /** Current baseline */
  baseline?: BundleMetrics;

  /** Perform bundle analysis */
  analyzeBundle(newBundle: BundleMetrics): BundleAnalysisResult;

  /** Update baseline */
  updateBaseline(newBaseline: BundleMetrics): void;

  /** Generate report */
  generateReport(): BundleAnalysisReport;

  /** Get trends */
  getTrends(): BundleAnalysisTrend[];
};

export type BundleAnalysisTrend = {
  /** Trend type */
  readonly type: 'size' | 'performance' | 'module-count';

  /** Trend direction */
  readonly direction: 'improving' | 'declining' | 'stable';

  /** Percentage change */
  readonly percentageChange: number;

  /** Time period */
  readonly period: 'daily' | 'weekly' | 'monthly';
};

/**
 * Create a bundle analysis monitor
 */
export function createBundleAnalysisMonitor(
  config: BundleAnalysisConfig
): BundleAnalysisMonitor {
  const history: BundleAnalysisResult[] = [];

  return {
    config,
    history,
    baseline: config.baseline,

    analyzeBundle(newBundle: BundleMetrics): BundleAnalysisResult {
      if (!this.baseline) {
        throw new Error('No baseline set for bundle analysis');
      }

      const result = analyzeBundleImpact(this.baseline, newBundle, this.config);
      this.history.push(result);

      // Keep history size manageable
      if (this.history.length > 10) {
        this.history.shift();
      }

      return result;
    },

    updateBaseline(newBaseline: BundleMetrics): void {
      (this as any).baseline = newBaseline;
    },

    generateReport(): BundleAnalysisReport {
      if (this.history.length === 0) {
        throw new Error('No analysis history available');
      }

      const latest = this.history[this.history.length - 1]!;
      return generateBundleAnalysisReport(latest, this.config);
    },

    getTrends(): BundleAnalysisTrend[] {
      if (this.history.length < 2) {
        return [];
      }

      // Simple trend analysis
      const sizeTrend = analyzeSizeTrend(this.history);
      const performanceTrend = analyzePerformanceTrend(this.history);

      return [sizeTrend, performanceTrend];
    }
  };
}

function analyzeSizeTrend(
  history: BundleAnalysisResult[]
): BundleAnalysisTrend {
  const first = history[0]?.sizeDelta?.absoluteChangeBytes ?? 0;
  const last = history[history.length - 1]?.sizeDelta?.absoluteChangeBytes ?? 0;
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  return {
    type: 'size',
    direction: change > 5 ? 'declining' : change < -5 ? 'improving' : 'stable',
    percentageChange: change,
    period: 'daily',
  };
}

function analyzePerformanceTrend(
  history: BundleAnalysisResult[]
): BundleAnalysisTrend {
  const first = history[0]?.performanceImpact?.impactScore ?? 0;
  const last = history[history.length - 1]?.performanceImpact?.impactScore ?? 0;
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  return {
    type: 'performance',
    direction: change > 5 ? 'declining' : change < -5 ? 'improving' : 'stable',
    percentageChange: change,
    period: 'daily',
  };
}
