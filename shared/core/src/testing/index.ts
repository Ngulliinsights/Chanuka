/**
 * Core Testing Utilities
 * 
 * Comprehensive testing, benchmarking, and performance monitoring utilities
 * for the core utilities module
 */

// Load testing utilities
export { LoadTester } from './load-tester';
export type {
  LoadTestScenario,
  LoadTestSuiteOptions,
  LoadTestSuite
} from './load-tester';

// Performance benchmarking
export { PerformanceBenchmarks } from './performance-benchmarks';
export type {
  BenchmarkConfig,
  BenchmarkComponents,
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkSummary,
  CategoryStats,
  EnvironmentInfo,
  MemoryBenchmarkPoint
} from './performance-benchmarks';

// Stress testing
export { StressTests } from './stress-tests';
export type {
  StressTestConfig,
  StressTestComponents,
  StressTestResult,
  StressTestSuite,
  StressTestSummary,
  MemorySnapshot,
  MemoryDelta,
  ConcurrencyTestResult,
  FloodTestResult,
  VolumeTestResult,
  SystemStressResult,
  SystemMetrics
} from './stress-tests';

// Performance monitoring
export { PerformanceMonitor } from './performance-monitor';
export type {
  PerformanceMonitorConfig,
  PerformanceMetric,
  MetricStats,
  PerformanceBaseline,
  BaselineComparison,
  AlertThreshold,
  PerformanceAlert,
  MetricReport,
  PerformanceReport,
  DashboardMetric,
  DashboardData,
  SystemInfo
} from './performance-monitor';

// CI/CD testing
export { CICDRunner } from './ci-cd-runner';
export type {
  CICDRunnerConfig,
  CICDPipelineResult,
  PipelineStageResult,
  PipelineSummary,
  PipelineRecommendation
} from './ci-cd-runner';

// Coverage reporting
export { CoverageReporter } from './coverage-reporter';
export type {
  CoverageReporterConfig,
  CoverageData,
  FileCoverage,
  CoverageMetrics,
  CoverageSummary,
  CoverageAnalysis,
  CoverageRiskAssessment,
  CoverageRecommendation,
  CoverageTrends,
  TrendMetrics,
  CoverageReport,
  CoverageReportSummary,
  CoverageBaseline,
  CoverageHistoryEntry
} from './coverage-reporter';

// Memory leak detection
export { MemoryLeakDetector } from './memory-leak-detector';

// Performance regression detection
export { PerformanceRegressionDetector } from './performance-regression-detector';

// Integration testing
export { IntegrationTests } from './integration-tests';

// Dependency validation
export { DependencyValidator } from './dependency-validator';

// Import types needed for utility functions
import type { LoadTestScenario, LoadTestSuiteOptions } from './load-tester';
import type { PerformanceMonitorConfig } from './performance-monitor';
import type { BenchmarkSuite, BenchmarkResult, CategoryStats, MemoryBenchmarkPoint } from './performance-benchmarks';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Creates a load test scenario for cache operations
 * This function generates a standardized test that exercises the three core cache operations:
 * set, get, and delete. It's useful for establishing baseline performance metrics.
 */
export function createCacheTestScenario(cache: any, name: string = 'cache-test'): LoadTestScenario {
  return {
    name,
    description: 'Basic cache operations test',
    requests: 1000,
    concurrency: 10,
    requestFn: async () => {
      const key = `test:${Math.random()}`;
      const value = `value:${Math.random()}`;
      
      // Exercise all three primary cache operations
      await cache.set(key, value, 300);
      await cache.get(key);
      await cache.del(key);
    }
  };
}

/**
 * Creates a load test scenario for rate limiting
 * This simulates multiple users hitting rate limits concurrently, which is
 * representative of real-world API usage patterns
 */
export function createRateLimitTestScenario(rateLimiter: any, name: string = 'rate-limit-test'): LoadTestScenario {
  return {
    name,
    description: 'Rate limiting stress test',
    requests: 2000,
    concurrency: 20,
    requestFn: async () => {
      // Simulate a pool of 100 users to test rate limit distribution
      const userId = `user:${Math.floor(Math.random() * 100)}`;
      await rateLimiter.hit(userId, 100, 60000);
    }
  };
}

/**
 * Creates a high-volume logging test scenario
 * This tests the logger's ability to handle rapid, concurrent log messages
 * without blocking or causing memory issues
 */
export function createLoggingTestScenario(logger: any, name: string = 'logging-test'): LoadTestScenario {
  return {
    name,
    description: 'High-volume logging test',
    requests: 5000,
    concurrency: 25,
    requestFn: async () => {
      logger.info('Test log message', {
        timestamp: Date.now(),
        data: Math.random().toString(36),
        level: Math.floor(Math.random() * 5)
      });
    }
  };
}

/**
 * Creates a validation performance test scenario
 * This tests how well the validator handles concurrent validation requests
 * with varying data patterns
 */
export function createValidationTestScenario(validator: any, name: string = 'validation-test'): LoadTestScenario {
  return {
    name,
    description: 'Validation performance test',
    requests: 3000,
    concurrency: 15,
    requestFn: async () => {
      const testData = {
        name: `User ${Math.random()}`,
        age: Math.floor(Math.random() * 80) + 18,
        email: `user${Math.random()}@example.com`
      };
      
      await validator.validate('user', testData);
    }
  };
}

/**
 * Factory function to create a comprehensive test suite
 * This intelligently combines individual component tests and adds integration
 * tests when multiple components are available
 */
export function createComprehensiveTestSuite(components: {
  cache?: any;
  rateLimiter?: any;
  logger?: any;
  validator?: any;
}): LoadTestSuiteOptions {
  const scenarios: LoadTestScenario[] = [];

  // Add individual component tests
  if (components.cache) {
    scenarios.push(createCacheTestScenario(components.cache));
  }

  if (components.rateLimiter) {
    scenarios.push(createRateLimitTestScenario(components.rateLimiter));
  }

  if (components.logger) {
    scenarios.push(createLoggingTestScenario(components.logger));
  }

  if (components.validator) {
    scenarios.push(createValidationTestScenario(components.validator));
  }

  // Add integration test when multiple components are available
  // This simulates a realistic workflow where components interact
  if (Object.keys(components).length > 1) {
    scenarios.push({
      name: 'integration-test',
      description: 'Multi-component integration test',
      requests: 1000,
      concurrency: 10,
      requestFn: async () => {
        const userId = `user:${Math.random()}`;
        
        // Rate limiting check - simulate authentication/throttling layer
        if (components.rateLimiter) {
          const rateLimitResult = await components.rateLimiter.hit(userId, 100, 60000);
          if (!rateLimitResult.allowed) return;
        }

        // Validation - ensure data integrity
        if (components.validator) {
          const data = { name: 'Test', age: 25, email: 'test@example.com' };
          await components.validator.validate('user', data);
        }

        // Cache operations - simulate data layer
        if (components.cache) {
          const cacheKey = `data:${userId}`;
          let cachedData = await components.cache.get(cacheKey);
          if (!cachedData) {
            cachedData = { userId, data: 'generated' };
            await components.cache.set(cacheKey, cachedData, 300);
          }
        }

        // Logging - audit trail
        if (components.logger) {
          components.logger.info('Integration test completed', { userId });
        }
      }
    });
  }

  return { scenarios };
}

/**
 * Helper function to create a performance monitor with optional configuration
 * This provides a convenient way to instantiate monitors with sensible defaults
 */
export function createPerformanceMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

/**
 * Sets up comprehensive monitoring for core utility components
 * This function establishes metric collection, baselines, and thresholds
 * for all key performance indicators
 */
export function setupCoreMetricsMonitoring(
  monitor: PerformanceMonitor,
  components: {
    cache?: any;
    rateLimiter?: any;
    logger?: any;
  }
): void {
  // Cache metrics - monitor cache effectiveness and performance
  if (components.cache && components.cache.getMetrics) {
    monitor.startMonitoring('cache-hit-rate', async () => {
      const metrics = components.cache.getMetrics();
      return metrics ? metrics.hitRate : 0;
    }, 5000);

    monitor.startMonitoring('cache-operations', async () => {
      const metrics = components.cache.getMetrics();
      return metrics ? metrics.operations : 0;
    }, 5000);

    monitor.startMonitoring('cache-avg-response-time', async () => {
      const metrics = components.cache.getMetrics();
      return metrics ? metrics.avgResponseTime : 0;
    }, 5000);
  }

  // Rate limiter metrics - track throttling effectiveness
  if (components.rateLimiter && components.rateLimiter.getMetrics) {
    monitor.startMonitoring('rate-limit-block-rate', async () => {
      const metrics = components.rateLimiter.getMetrics();
      return metrics ? metrics.blockRate : 0;
    }, 5000);

    monitor.startMonitoring('rate-limit-avg-processing-time', async () => {
      const metrics = components.rateLimiter.getMetrics();
      return metrics ? metrics.avgProcessingTime : 0;
    }, 5000);
  }

  // System-level metrics - monitor overall application health
  monitor.startMonitoring('memory-usage', async () => {
    return process.memoryUsage().heapUsed;
  }, 10000);

  monitor.startMonitoring('cpu-usage', async () => {
    const usage = process.cpuUsage();
    // Convert microseconds to milliseconds for easier interpretation
    return (usage.user + usage.system) / 1000;
  }, 10000);

  // Establish performance baselines for comparison
  // These thresholds are based on typical production requirements
  monitor.setBaseline('cache-hit-rate', {
    expectedValue: 0.8,
    p95Threshold: 0.9,
    regressionThreshold: 10,
    createdAt: Date.now(),
    description: 'Cache hit rate should be above 80%'
  });

  monitor.setBaseline('cache-avg-response-time', {
    expectedValue: 1,
    p95Threshold: 5,
    regressionThreshold: 50,
    createdAt: Date.now(),
    description: 'Cache response time should be under 1ms average'
  });

  monitor.setBaseline('rate-limit-avg-processing-time', {
    expectedValue: 2,
    p95Threshold: 10,
    regressionThreshold: 100,
    createdAt: Date.now(),
    description: 'Rate limit processing should be under 2ms average'
  });
}

/**
 * Interface for performance analysis results
 * This provides structured feedback about test performance
 */
export interface PerformanceAnalysis {
  overallScore: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averagePerformance: number;
  };
}

/**
 * Analyzes benchmark results and provides actionable insights
 * This function examines performance across all categories and identifies
 * potential bottlenecks, degradations, or areas for optimization
 */
export function analyzePerformanceResults(results: BenchmarkSuite): PerformanceAnalysis {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Analyze cache performance - critical for application speed
  const cacheResults = results.results.filter((r: BenchmarkResult) => r.category === 'cache');
  if (cacheResults.length > 0) {
    const avgOps = cacheResults.reduce((sum: number, r: BenchmarkResult) => 
      sum + r.operationsPerSecond, 0) / cacheResults.length;
    
    if (avgOps < 5000) {
      criticalIssues.push('Cache performance is below expected threshold (5000 ops/sec)');
      recommendations.push('Consider optimizing cache implementation or increasing memory allocation');
    }

    const getResult = cacheResults.find((r: BenchmarkResult) => r.name === 'cache:get');
    if (getResult && getResult.averageTimeMs && getResult.averageTimeMs > 1) {
      warnings.push('Cache get operations are slower than expected (>1ms)');
      recommendations.push('Investigate cache adapter performance and memory usage');
    }
  }

  // Analyze rate limiting performance - important for API protection
  const rateLimitResults = results.results.filter((r: BenchmarkResult) => r.category === 'rate-limit');
  if (rateLimitResults.length > 0) {
    const avgOps = rateLimitResults.reduce((sum: number, r: BenchmarkResult) => 
      sum + r.operationsPerSecond, 0) / rateLimitResults.length;
    
    if (avgOps < 2000) {
      criticalIssues.push('Rate limiting performance is below expected threshold (2000 ops/sec)');
      recommendations.push('Consider optimizing rate limiting algorithm or storage backend');
    }
  }

  // Analyze logging performance - impacts overall system throughput
  const loggingResults = results.results.filter((r: BenchmarkResult) => r.category === 'logging');
  if (loggingResults.length > 0) {
    const avgOps = loggingResults.reduce((sum: number, r: BenchmarkResult) => 
      sum + r.operationsPerSecond, 0) / loggingResults.length;
    
    if (avgOps < 5000) {
      warnings.push('Logging performance is below optimal threshold (5000 ops/sec)');
      recommendations.push('Consider enabling async transport or optimizing log formatting');
    }
  }

  // Analyze memory usage patterns - detect potential memory leaks
  const memoryResults = results.results.filter((r: BenchmarkResult) => r.memoryResults);
  if (memoryResults.length > 0) {
    const hasExcessiveMemoryUsage = memoryResults.some((r: BenchmarkResult) => 
      r.memoryResults?.some((m: MemoryBenchmarkPoint) => m.heapUsed > 500 * 1024 * 1024)
    );
    
    if (hasExcessiveMemoryUsage) {
      warnings.push('High memory usage detected during testing');
      recommendations.push('Monitor memory usage in production and consider implementing memory limits');
    }
  }

  return {
    overallScore: calculateOverallScore(criticalIssues.length, warnings.length),
    criticalIssues,
    warnings,
    recommendations,
    summary: {
      totalTests: results.summary.totalTests,
      successfulTests: results.summary.successfulTests,
      failedTests: results.summary.failedTests,
      averagePerformance: Object.values(results.summary.categoryStats)
        .reduce((sum: number, stats: CategoryStats) => 
          sum + stats.averageOpsPerSecond, 0) / Object.keys(results.summary.categoryStats).length
    }
  };
}

/**
 * Calculates an overall performance score based on issues found
 * Scoring: 100 (perfect) - 20 per critical issue - 5 per warning
 */
function calculateOverallScore(criticalCount: number, warningCount: number): number {
  let score = 100;
  score -= criticalCount * 20; // Severe performance issues
  score -= warningCount * 5;   // Minor performance concerns
  return Math.max(0, score);
}





































