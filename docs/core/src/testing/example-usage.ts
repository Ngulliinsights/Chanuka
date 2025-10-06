/**
 * Example usage of core performance testing utilities
 * 
 * This file demonstrates how to use the performance benchmarks,
 * stress tests, load testing, and monitoring utilities
 */

import { 
  PerformanceBenchmarks,
  StressTests,
  LoadTester,
  PerformanceMonitor,
  createComprehensiveTestSuite,
  setupCoreMetricsMonitoring,
  analyzePerformanceResults
} from './index';

import { createCacheService } from '../cache';
import { createRateLimitFactory } from '../rate-limiting';
import { Logger } from '../logging/logger';
import { ValidationService } from '../validation/validation-service';

/**
 * Example: Complete performance testing workflow
 */
export async function runCompletePerformanceTest() {
  console.log('🚀 Starting comprehensive performance testing...\n');

  // 1. Initialize components
  console.log('📦 Initializing core components...');
  const cache = createCacheService({
    provider: 'memory',
    maxMemoryMB: 100,
    enableMetrics: true,
    keyPrefix: 'perf-test:',
    defaultTtlSec: 300,
    enableCompression: false,
    compressionThreshold: 1024,
    enableCircuitBreaker: true
  });

  const rateLimitFactory = createRateLimitFactory();
  const rateLimiter = rateLimitFactory.createStore('sliding-window');

  const logger = new Logger({
    level: 'info',
    pretty: false,
    enableMetrics: true,
    redactPaths: ['password', 'token'],
    asyncTransport: true
  });

  const validator = new ValidationService();
  await validator.registerSchema('user', {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'number', minimum: 0, maximum: 150 },
      email: { type: 'string', format: 'email' }
    },
    required: ['name', 'age', 'email']
  });

  const components = { cache, rateLimiter, logger, validator };

  // 2. Set up performance monitoring
  console.log('📊 Setting up performance monitoring...');
  const monitor = new PerformanceMonitor({
    maxDataAge: 24 * 60 * 60 * 1000, // 24 hours
    maxDataPoints: 10000,
    reportsDir: './performance-reports'
  });

  setupCoreMetricsMonitoring(monitor, components);

  // 3. Run performance benchmarks
  console.log('⚡ Running performance benchmarks...');
  const benchmarks = new PerformanceBenchmarks({
    iterations: {
      cache: { get: 5000, set: 2500, delete: 2500 },
      rateLimit: { single: 2500, burst: 2500 },
      logging: { single: 5000, structured: 2500 },
      validation: { simple: 5000, complex: 500 },
      integration: { fullPipeline: 1000 }
    },
    concurrency: {
      cache: { reads: 25, writes: 15 },
      rateLimit: { burst: 50, concurrent: 25 },
      logging: { concurrent: 25 }
    }
  });

  const benchmarkSuite = await benchmarks.runAll(components);
  console.log(`✅ Benchmarks completed: ${benchmarkSuite.summary.successfulTests}/${benchmarkSuite.summary.totalTests} passed`);

  // 4. Analyze benchmark results
  console.log('🔍 Analyzing performance results...');
  const analysis = analyzePerformanceResults(benchmarkSuite);
  
  console.log(`\n📈 Performance Analysis (Score: ${analysis.overallScore}/100):`);
  if (analysis.criticalIssues.length > 0) {
    console.log('🚨 Critical Issues:');
    analysis.criticalIssues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (analysis.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    analysis.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  // 5. Run stress tests
  console.log('\n🔥 Running stress tests...');
  const stressTests = new StressTests({
    systemStressDuration: 30000, // 30 seconds
    systemStressConcurrency: 50,
    memoryPressureThreshold: 100 * 1024 * 1024 // 100MB
  });

  const stressSuite = await stressTests.runStressTests(components);
  console.log(`✅ Stress tests completed: ${stressSuite.summary.successfulTests}/${stressSuite.summary.totalTests} passed`);
  
  if (stressSuite.summary.criticalFailures > 0) {
    console.log(`🚨 ${stressSuite.summary.criticalFailures} critical failures detected!`);
  }

  // 6. Run load tests
  console.log('\n🌊 Running load tests...');
  const loadTester = new LoadTester();
  const testSuite = createComprehensiveTestSuite(components);
  const loadResults = await loadTester.createLoadTestSuite(testSuite);
  
  console.log(`✅ Load tests completed: ${loadResults.summary.totalRequests} requests processed`);
  console.log(`📊 Average success rate: ${loadResults.summary.averageSuccessRate.toFixed(1)}%`);
  console.log(`⏱️  Average response time: ${loadResults.summary.averageResponseTime.toFixed(2)}ms`);

  // 7. Generate comprehensive report
  console.log('\n📋 Generating performance report...');
  const performanceReport = monitor.generateReport(60 * 60 * 1000); // Last hour
  const reportPath = monitor.saveReport(performanceReport);
  console.log(`📄 Report saved to: ${reportPath}`);

  // 8. Create dashboard data
  const dashboardData = monitor.getDashboardData(60 * 60 * 1000);
  console.log(`\n🎛️  Dashboard Summary:`);
  console.log(`  System Health: ${dashboardData.systemHealth}`);
  console.log(`  Total Metrics: ${dashboardData.summary.totalMetrics}`);
  console.log(`  Healthy Metrics: ${dashboardData.summary.healthyMetrics}`);
  console.log(`  Warning Metrics: ${dashboardData.summary.warningMetrics}`);
  console.log(`  Critical Metrics: ${dashboardData.summary.criticalMetrics}`);
  console.log(`  Regressions: ${dashboardData.summary.regressions}`);

  // 9. Cleanup
  monitor.stopAllMonitoring();
  if (typeof (cache as any).destroy === 'function') {
    await (cache as any).destroy();
  }

  console.log('\n🎉 Performance testing completed successfully!');
  
  return {
    benchmarkSuite,
    analysis,
    stressSuite,
    loadResults,
    performanceReport,
    dashboardData
  };
}

/**
 * Example: Continuous performance monitoring
 */
export async function startContinuousMonitoring(components: any) {
  console.log('🔄 Starting continuous performance monitoring...');

  const monitor = new PerformanceMonitor({
    maxDataAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxDataPoints: 50000,
    reportsDir: './continuous-reports'
  });

  // Set up monitoring with event handlers
  monitor.on('alert', (alert) => {
    console.log(`🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.message}`);
    
    // In a real application, you might:
    // - Send notifications (email, Slack, PagerDuty)
    // - Trigger auto-scaling
    // - Log to external monitoring systems
  });

  monitor.on('metric:recorded', (data) => {
    if (data.metricName === 'memory-usage' && data.value > 500 * 1024 * 1024) {
      console.log(`⚠️  High memory usage detected: ${(data.value / 1024 / 1024).toFixed(2)}MB`);
    }
  });

  // Set up comprehensive monitoring
  setupCoreMetricsMonitoring(monitor, components);

  // Set up custom application metrics
  monitor.startMonitoring('active-connections', async () => {
    // This would typically query your connection pool
    return Math.floor(Math.random() * 100);
  }, 10000);

  monitor.startMonitoring('queue-depth', async () => {
    // This would typically query your message queue
    return Math.floor(Math.random() * 50);
  }, 5000);

  // Generate reports every hour
  const reportInterval = setInterval(async () => {
    try {
      const report = monitor.generateReport(60 * 60 * 1000);
      const reportPath = monitor.saveReport(report);
      console.log(`📊 Hourly report generated: ${reportPath}`);
      
      // Check for regressions
      if (report.regressions.length > 0) {
        console.log(`⚠️  ${report.regressions.length} performance regressions detected:`);
        report.regressions.forEach(regression => {
          console.log(`  - ${regression.metricName}: ${regression.severity} severity`);
        });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  // Return cleanup function
  return () => {
    monitor.stopAllMonitoring();
    clearInterval(reportInterval);
    console.log('🛑 Continuous monitoring stopped');
  };
}

/**
 * Example: Custom performance test scenario
 */
export async function runCustomScenario() {
  console.log('🎯 Running custom performance scenario...');

  // Create a custom cache implementation for testing
  const cache = createCacheService({
    provider: 'memory',
    maxMemoryMB: 50,
    enableMetrics: true,
    keyPrefix: 'custom:',
    defaultTtlSec: 600,
    enableCompression: true,
    compressionThreshold: 512
  });

  const benchmarks = new PerformanceBenchmarks();

  // Custom benchmark: Cache with compression
  const compressionBenchmark = await benchmarks.runBenchmark('cache:compression-test', async () => {
    const key = `compress:${Math.random()}`;
    const largeData = 'x'.repeat(2048); // 2KB data that should be compressed
    
    await cache.set(key, largeData, 300);
    const retrieved = await cache.get(key);
    await cache.del(key);
    
    if (retrieved !== largeData) {
      throw new Error('Data integrity check failed');
    }
  }, {
    iterations: 1000,
    warmupIterations: 100
  });

  console.log(`📊 Compression benchmark results:`);
  console.log(`  Operations per second: ${compressionBenchmark.operationsPerSecond.toFixed(0)}`);
  console.log(`  Average time: ${compressionBenchmark.averageTimeMs?.toFixed(2)}ms`);
  console.log(`  P95 time: ${compressionBenchmark.percentiles?.p95.toFixed(2)}ms`);

  // Custom stress test: Memory pressure with compression
  const stressTests = new StressTests();
  const memoryStressResult = await stressTests.stressTestCacheMemory(cache);

  if (memoryStressResult.success && memoryStressResult.memorySnapshots) {
    const snapshots = memoryStressResult.memorySnapshots;
    const initialMemory = snapshots[0].heapUsed;
    const peakMemory = Math.max(...snapshots.map(s => s.heapUsed));
    
    console.log(`🧠 Memory stress test results:`);
    console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Peak memory: ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory efficiency: ${((peakMemory - initialMemory) / initialMemory * 100).toFixed(1)}% increase`);
  }

  // Cleanup
  if (typeof (cache as any).destroy === 'function') {
    await (cache as any).destroy();
  }

  console.log('✅ Custom scenario completed');
}

/**
 * Example: Performance regression detection
 */
export async function detectPerformanceRegressions() {
  console.log('🔍 Running performance regression detection...');

  const monitor = new PerformanceMonitor();

  // Set up baselines (these would typically be loaded from historical data)
  monitor.setBaseline('cache-operations', {
    expectedValue: 10000, // 10k ops/sec
    p95Threshold: 5, // 5ms P95
    regressionThreshold: 20, // 20% degradation threshold
    createdAt: Date.now(),
    description: 'Cache operations baseline from production'
  });

  monitor.setBaseline('memory-usage', {
    expectedValue: 100 * 1024 * 1024, // 100MB
    p95Threshold: 200 * 1024 * 1024, // 200MB P95
    regressionThreshold: 50, // 50% increase threshold
    createdAt: Date.now(),
    description: 'Memory usage baseline'
  });

  // Simulate some performance data
  for (let i = 0; i < 100; i++) {
    // Simulate degrading performance
    const cacheOps = 10000 - (i * 50); // Gradually decreasing performance
    const memoryUsage = (100 + i * 2) * 1024 * 1024; // Gradually increasing memory

    monitor.recordMetric('cache-operations', cacheOps);
    monitor.recordMetric('memory-usage', memoryUsage);
  }

  // Check for regressions
  const cacheRegression = monitor.compareToBaseline('cache-operations');
  const memoryRegression = monitor.compareToBaseline('memory-usage');

  console.log('📊 Regression Analysis:');
  
  if (cacheRegression) {
    console.log(`\n🔄 Cache Operations:`);
    console.log(`  Baseline: ${cacheRegression.baseline.expectedValue} ops/sec`);
    console.log(`  Current: ${cacheRegression.current.mean.toFixed(0)} ops/sec`);
    console.log(`  Difference: ${cacheRegression.meanDifference.toFixed(1)}%`);
    console.log(`  Regression: ${cacheRegression.isRegression ? '❌ YES' : '✅ NO'}`);
    if (cacheRegression.isRegression) {
      console.log(`  Severity: ${cacheRegression.severity.toUpperCase()}`);
    }
  }

  if (memoryRegression) {
    console.log(`\n🧠 Memory Usage:`);
    console.log(`  Baseline: ${(memoryRegression.baseline.expectedValue / 1024 / 1024).toFixed(0)}MB`);
    console.log(`  Current: ${(memoryRegression.current.mean / 1024 / 1024).toFixed(0)}MB`);
    console.log(`  Difference: ${memoryRegression.meanDifference.toFixed(1)}%`);
    console.log(`  Regression: ${memoryRegression.isRegression ? '❌ YES' : '✅ NO'}`);
    if (memoryRegression.isRegression) {
      console.log(`  Severity: ${memoryRegression.severity.toUpperCase()}`);
    }
  }

  console.log('\n✅ Regression detection completed');
}

// Export all examples for easy testing
export const examples = {
  runCompletePerformanceTest,
  startContinuousMonitoring,
  runCustomScenario,
  detectPerformanceRegressions
};

// Main execution function for standalone testing
if (require.main === module) {
  runCompletePerformanceTest()
    .then(() => {
      console.log('\n🎉 All examples completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example execution failed:', error);
      process.exit(1);
    });
}