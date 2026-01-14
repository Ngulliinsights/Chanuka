#!/usr/bin/env npx ts-node

/**
 * Performance Profiling Suite for SimpleTool
 *
 * Measures actual performance metrics before any optimizations.
 * Never optimize without baseline data.
 *
 * Usage:
 *   npx ts-node scripts/profiling-suite.ts --profile all
 *   npx ts-node scripts/profiling-suite.ts --profile queries
 *   npx ts-node scripts/profiling-suite.ts --profile types
 *   npx ts-node scripts/profiling-suite.ts --profile memory
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import type { PerformanceProfile, ProfileResult, MetricBaseline } from '@shared/types/performance';

interface ProfilingConfig {
  warmupIterations: number;
  measurementIterations: number;
  outputPath: string;
  verbose: boolean;
}

interface TimingEntry {
  name: string;
  startTime: number;
  duration: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: number;
}

/**
 * Core profiling utilities - measure WITHOUT optimization first
 */
export class PerformanceProfiler {
  private timings: Map<string, TimingEntry[]> = new Map();
  private config: ProfilingConfig;

  constructor(config: Partial<ProfilingConfig> = {}) {
    this.config = {
      warmupIterations: 3,
      measurementIterations: 10,
      outputPath: './performance-profiles',
      verbose: false,
      ...config,
    };

    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
  }

  /**
   * Profile a synchronous operation
   * Returns raw timing data - no assumptions about optimization
   */
  profileSync<T>(
    name: string,
    fn: () => T,
    iterations: number = this.config.measurementIterations
  ): ProfileResult {
    const results: TimingEntry[] = [];

    // Warmup phase - establish cache state
    for (let i = 0; i < this.config.warmupIterations; i++) {
      fn();
    }

    // Measurement phase - actual performance
    for (let i = 0; i < iterations; i++) {
      const memoryBefore = process.memoryUsage();
      const startTime = performance.now();

      const result = fn();

      const duration = performance.now() - startTime;
      const memoryAfter = process.memoryUsage();

      results.push({
        name,
        startTime,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
      });
    }

    return this.analyzeResults(name, results);
  }

  /**
   * Profile an asynchronous operation
   * Awaits completion before measuring
   */
  async profileAsync<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = this.config.measurementIterations
  ): Promise<ProfileResult> {
    const results: TimingEntry[] = [];

    // Warmup phase
    for (let i = 0; i < this.config.warmupIterations; i++) {
      await fn();
    }

    // Measurement phase
    for (let i = 0; i < iterations; i++) {
      const memoryBefore = process.memoryUsage();
      const startTime = performance.now();

      await fn();

      const duration = performance.now() - startTime;
      const memoryAfter = process.memoryUsage();

      results.push({
        name,
        startTime,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
      });
    }

    return this.analyzeResults(name, results);
  }

  /**
   * Analyze collected timing data
   * Reports percentiles, not just averages
   */
  private analyzeResults(name: string, timings: TimingEntry[]): ProfileResult {
    if (timings.length === 0) {
      throw new Error(`No timing data collected for ${name}`);
    }

    const durations = timings.map((t) => t.duration);
    const memoryDeltas = timings.map((t) => t.memoryDelta);

    durations.sort((a, b) => a - b);
    memoryDeltas.sort((a, b) => a - b);

    const result: ProfileResult = {
      name,
      iterations: timings.length,
      timing: {
        min: durations[0],
        max: durations[durations.length - 1],
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: durations[Math.floor(durations.length / 2)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
        standardDeviation: this.calculateStdDev(durations),
      },
      memory: {
        min: memoryDeltas[0],
        max: memoryDeltas[memoryDeltas.length - 1],
        mean: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
        median: memoryDeltas[Math.floor(memoryDeltas.length / 2)],
      },
      timestamp: new Date().toISOString(),
    };

    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(...timings);

    return result;
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Save profiling results for comparison
   */
  async saveResults(sessionName: string, results: ProfileResult[]): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(
      this.config.outputPath,
      `profile-${sessionName}-${timestamp}.json`
    );

    const data = {
      session: sessionName,
      timestamp: new Date().toISOString(),
      results,
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));

    if (this.config.verbose) {
      console.log(`✅ Profile saved: ${filename}`);
    }
  }

  /**
   * Compare with previous baseline
   * Identifies regressions before they become problems
   */
  async compareWithBaseline(
    sessionName: string,
    results: ProfileResult[]
  ): Promise<{ issues: string[]; warnings: string[] }> {
    const baselinePath = path.join(this.config.outputPath, 'baseline.json');

    if (!fs.existsSync(baselinePath)) {
      console.log('⚠️  No baseline found. This will be saved as baseline.');
      fs.writeFileSync(baselinePath, JSON.stringify(results, null, 2));
      return { issues: [], warnings: [] };
    }

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as ProfileResult[];
    const issues: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      const baselineResult = baseline.find((r) => r.name === result.name);

      if (!baselineResult) {
        warnings.push(`New profile: ${result.name}`);
        continue;
      }

      // Flag regressions: >10% slower
      if (result.timing.mean > baselineResult.timing.mean * 1.1) {
        const percentIncrease = (
          ((result.timing.mean - baselineResult.timing.mean) / baselineResult.timing.mean) *
          100
        ).toFixed(1);
        issues.push(
          `⚠️  ${result.name}: ${percentIncrease}% slower (${result.timing.mean.toFixed(2)}ms vs ${baselineResult.timing.mean.toFixed(2)}ms)`
        );
      }

      // Flag memory regressions: >20% more memory
      if (Math.abs(result.memory.mean) > Math.abs(baselineResult.memory.mean) * 1.2) {
        const memIncrease = (
          ((Math.abs(result.memory.mean) - Math.abs(baselineResult.memory.mean)) /
            Math.abs(baselineResult.memory.mean)) *
          100
        ).toFixed(1);
        issues.push(
          `⚠️  ${result.name}: ${memIncrease}% more memory delta (${result.memory.mean.toFixed(0)} vs ${baselineResult.memory.mean.toFixed(0)} bytes)`
        );
      }
    }

    return { issues, warnings };
  }

  /**
   * Generate human-readable report
   */
  formatReport(results: ProfileResult[]): string {
    let report = `\n📊 Performance Profile Report\n`;
    report += `${'='.repeat(60)}\n\n`;

    for (const result of results) {
      report += `📍 ${result.name}\n`;
      report += `   Iterations: ${result.iterations}\n`;
      report += `   Duration:\n`;
      report += `     Min:    ${result.timing.min.toFixed(2)}ms\n`;
      report += `     Mean:   ${result.timing.mean.toFixed(2)}ms\n`;
      report += `     Median: ${result.timing.median.toFixed(2)}ms\n`;
      report += `     P95:    ${result.timing.p95.toFixed(2)}ms\n`;
      report += `     P99:    ${result.timing.p99.toFixed(2)}ms\n`;
      report += `     Max:    ${result.timing.max.toFixed(2)}ms\n`;
      report += `     StdDev: ${result.timing.standardDeviation.toFixed(2)}ms\n`;
      report += `   Memory Delta:\n`;
      report += `     Min:    ${(result.memory.min / 1024).toFixed(2)}KB\n`;
      report += `     Mean:   ${(result.memory.mean / 1024).toFixed(2)}KB\n`;
      report += `     Median: ${(result.memory.median / 1024).toFixed(2)}KB\n`;
      report += `     Max:    ${(result.memory.max / 1024).toFixed(2)}KB\n`;
      report += `\n`;
    }

    return report;
  }
}

/**
 * Export profiler for use in other modules
 */
export const profiler = new PerformanceProfiler({ verbose: true });

/**
 * CLI execution
 */
if (require.main === module) {
  const profileType = process.argv[3] || 'all';

  (async () => {
    console.log(`\n🔍 Starting performance profiling (${profileType})...\n`);

    const results: ProfileResult[] = [];

    if (profileType === 'all' || profileType === 'types') {
      console.log('Profiling type system...');
      // Placeholder - will be expanded
      results.push({
        name: 'Type System Baseline',
        iterations: 0,
        timing: { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, standardDeviation: 0 },
        memory: { min: 0, max: 0, mean: 0, median: 0 },
        timestamp: new Date().toISOString(),
      });
    }

    const report = profiler.formatReport(results);
    console.log(report);

    const comparison = await profiler.compareWithBaseline('initial', results);
    if (comparison.issues.length > 0) {
      console.log('\n⚠️  Issues detected:');
      comparison.issues.forEach((issue) => console.log(`  ${issue}`));
    }

    await profiler.saveResults('initial', results);
  })();
}

export default PerformanceProfiler;
