/**
 * Performance Monitoring Types
 *
 * These types support evidence-based performance optimization.
 * All optimizations must be measured against these metrics.
 *
 * Philosophy: Measure first, optimize second, never guess about performance.
 */

/**
 * Baseline metrics for comparison
 * Used to detect regressions before they become problems
 */
export interface MetricBaseline {
  readonly name: string;
  readonly value: number;
  readonly unit: 'ms' | 'bytes' | 'KB' | 'ops/sec';
  readonly tolerance: number; // percentage tolerance before flag
  readonly measuredAt: string;
}

/**
 * Single timing sample from a profiling run
 */
export interface TimingSample {
  readonly duration: number; // milliseconds
  readonly memoryDelta: number; // bytes
  readonly iteration: number;
}

/**
 * Statistical results from profiling
 * Includes percentiles to catch worst-case scenarios
 */
export interface TimingStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly standardDeviation: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
}

/**
 * Result of a single profiling operation
 */
export interface ProfileResult {
  readonly name: string;
  readonly iterations: number;
  readonly timing: TimingStats;
  readonly memory: MemoryStats;
  readonly timestamp: string;
}

/**
 * Query performance metrics
 * Critical for identifying N+1 problems and missing indexes
 */
export interface QueryMetrics {
  readonly queryId: string;
  readonly sql: string;
  readonly executionTimeMs: number;
  readonly rowsScanned: number;
  readonly rowsReturned: number;
  readonly indexes: string[];
  readonly estimatedCost: number;
  readonly actualCost: number;
  readonly isPreparedStatement: boolean;
  readonly timestamp: string;
}

/**
 * Aggregated query performance
 * Identifies hot spots worth optimizing
 */
export interface QueryAggregate {
  readonly queryPattern: string;
  readonly callCount: number;
  readonly totalTimeMs: number;
  readonly avgTimeMs: number;
  readonly maxTimeMs: number;
  readonly minTimeMs: number;
  readonly p95TimeMs: number;
  readonly isNPlus1: boolean;
  readonly suggestedIndexes: string[];
  readonly estimatedSavingsMs: number;
}

/**
 * Cache performance metrics
 * Only optimize caching if metrics show it's worth it
 */
export interface CacheMetrics {
  readonly cacheKey: string;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number; // 0-1
  readonly avgHitTimeMs: number;
  readonly avgMissTimeMs: number;
  readonly totalSizeBytes: number;
  readonly estimatedSavingsMs: number;
  readonly recommendedTTL: number; // milliseconds
}

/**
 * Cache performance aggregate
 */
export interface CacheAggregate {
  readonly totalHits: number;
  readonly totalMisses: number;
  readonly overallHitRate: number;
  readonly totalSizeBytes: number;
  readonly estimatedSavingsMs: number;
  readonly hotSpots: CacheMetrics[];
}

/**
 * Database index analysis
 * Shows which indexes are actually being used
 */
export interface IndexMetrics {
  readonly indexName: string;
  readonly tableName: string;
  readonly columns: string[];
  readonly scanCount: number; // full table scans avoided
  readonly seekCount: number; // index seeks
  readonly updateCount: number; // maintenance cost
  readonly sizeBytes: number;
  readonly lastUsedAt: string | null;
  readonly effectivenessScore: number; // 0-100
}

/**
 * Bundling analysis
 * Identifies code splitting opportunities
 */
export interface BundleMetrics {
  readonly name: string;
  readonly sizeBytes: number;
  readonly gzipSizeBytes: number;
  readonly modules: number;
  readonly duplicates: { module: string; count: number }[];
  readonly importers: string[];
}

/**
 * Runtime type checking overhead
 * Measures validation performance impact
 */
export interface ValidationMetrics {
  readonly validatorName: string;
  readonly validationTimeMs: number;
  readonly itemsValidated: number;
  readonly itemsInvalid: number;
  readonly cacheHitCount: number;
  readonly errorCount: number;
  readonly averageValidationTimeMs: number;
}

/**
 * Compilation performance metrics
 * Tracks TypeScript and build performance
 */
export interface CompilationMetrics {
  readonly phase: 'parsing' | 'checking' | 'emission' | 'total';
  readonly durationMs: number;
  readonly filesProcessed: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * Performance profile
 * Comprehensive snapshot for comparison
 */
export interface PerformanceProfile {
  readonly timestamp: string;
  readonly sessionId: string;
  readonly queries: QueryAggregate[];
  readonly cache: CacheAggregate;
  readonly indexes: IndexMetrics[];
  readonly validation: ValidationMetrics[];
  readonly compilation: CompilationMetrics[];
  readonly recommendations: PerformanceRecommendation[];
}

/**
 * Actionable optimization recommendation
 * Only suggests changes that metrics support
 */
export interface PerformanceRecommendation {
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly category: 'index' | 'cache' | 'query' | 'code-split' | 'type-checking';
  readonly title: string;
  readonly description: string;
  readonly estimatedSavingsMs: number;
  readonly effort: 'low' | 'medium' | 'high';
  readonly evidenceMetrics: string[];
  readonly implementationSteps: string[];
}

/**
 * Performance regression detection
 * Compares against baseline to catch degradation
 */
export interface RegressionDetection {
  readonly metricName: string;
  readonly baseline: number;
  readonly current: number;
  readonly changePercent: number;
  readonly severity: 'warning' | 'critical';
  readonly detectedAt: string;
}

/**
 * Query execution plan
 * From database explain for analysis
 */
export interface QueryPlan {
  readonly queryId: string;
  readonly sql: string;
  readonly plan: string; // EXPLAIN output
  readonly indexes: string[];
  readonly estimatedCost: number;
  readonly actualCost?: number;
  readonly rowsEstimated: number;
  readonly rowsActual?: number;
  readonly recommededIndexes: string[];
}

export default PerformanceProfile;
