#!/usr/bin/env npx ts-node

/**
 * Performance Validation & Testing Framework
 *
 * Validates that optimizations actually improve performance.
 * Never assume an optimization helps - always verify with metrics.
 *
 * Process:
 * 1. Establish baseline
 * 2. Make optimization
 * 3. Measure performance
 * 4. Compare to baseline
 * 5. Accept/reject based on metrics
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import type {
  ProfileResult,
  PerformanceRecommendation,
  RegressionDetection,
} from '@shared/types/performance';

interface OptimizationTest {
  readonly name: string;
  readonly baseline: ProfileResult;
  readonly optimized: ProfileResult;
  readonly improvement: number; // percentage
  readonly isValid: boolean;
  readonly reason: string;
}

interface RegressionThresholds {
  readonly timingRegression: number; // 5% default
  readonly memoryRegression: number; // 10% default
  readonly outlierZScore: number; // 3 default
}

/**
 * Validates performance optimizations against metrics
 */
export class PerformanceValidator {
  private baselineProfile: Map<string, ProfileResult> = new Map();
  private optimizedProfile: Map<string, ProfileResult> = new Map();
  private optimizationTests: OptimizationTest[] = [];
  private thresholds: RegressionThresholds = {
    timingRegression: 0.05,
    memoryRegression: 0.1,
    outlierZScore: 3,
  };
  private outputPath: string;

  constructor(outputPath: string = './performance-validation') {
    this.outputPath = outputPath;
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
  }

  /**
   * Set regression detection thresholds
   */
  setThresholds(thresholds: Partial<RegressionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Record baseline profile
   */
  recordBaseline(name: string, profile: ProfileResult): void {
    this.baselineProfile.set(name, profile);
  }

  /**
   * Record optimized profile
   */
  recordOptimized(name: string, profile: ProfileResult): void {
    this.optimizedProfile.set(name, profile);
  }

  /**
   * Compare baseline and optimized profiles
   * Returns true only if optimization is validated
   */
  validateOptimization(name: string): OptimizationTest {
    const baseline = this.baselineProfile.get(name);
    const optimized = this.optimizedProfile.get(name);

    if (!baseline || !optimized) {
      return {
        name,
        baseline: baseline!,
        optimized: optimized!,
        improvement: 0,
        isValid: false,
        reason: 'Missing baseline or optimized profile',
      };
    }

    // Check for regression in timing
    const timingRegression = this.detectRegression(
      baseline.timing.mean,
      optimized.timing.mean,
      this.thresholds.timingRegression
    );

    if (timingRegression) {
      return {
        name,
        baseline,
        optimized,
        improvement: 0,
        isValid: false,
        reason: `⚠️  Timing regression detected: ${optimized.timing.mean.toFixed(2)}ms vs ${baseline.timing.mean.toFixed(2)}ms baseline`,
      };
    }

    // Check for regression in memory
    const memoryRegression = this.detectRegression(
      baseline.memory.mean,
      optimized.memory.mean,
      this.thresholds.memoryRegression
    );

    if (memoryRegression) {
      return {
        name,
        baseline,
        optimized,
        improvement: 0,
        isValid: false,
        reason: `⚠️  Memory regression detected: ${(optimized.memory.mean / 1024).toFixed(2)}KB vs ${(baseline.memory.mean / 1024).toFixed(2)}KB baseline`,
      };
    }

    // Calculate improvement
    const timingImprovement =
      ((baseline.timing.mean - optimized.timing.mean) / baseline.timing.mean) * 100;
    const memoryImprovement =
      ((baseline.memory.mean - optimized.memory.mean) / baseline.memory.mean) * 100;

    // Only accept if there's measurable improvement
    if (timingImprovement < 1 && memoryImprovement < 1) {
      return {
        name,
        baseline,
        optimized,
        improvement: 0,
        isValid: false,
        reason: `No measurable improvement: ${timingImprovement.toFixed(2)}% timing, ${memoryImprovement.toFixed(2)}% memory`,
      };
    }

    return {
      name,
      baseline,
      optimized,
      improvement: Math.max(timingImprovement, memoryImprovement),
      isValid: true,
      reason: `✅ Valid optimization: ${timingImprovement.toFixed(2)}% timing improvement, ${memoryImprovement.toFixed(2)}% memory improvement`,
    };
  }

  /**
   * Detect statistical regression
   */
  private detectRegression(
    baseline: number,
    optimized: number,
    threshold: number
  ): boolean {
    if (baseline === 0) return false;
    const regression = (optimized - baseline) / baseline;
    return regression > threshold;
  }

  /**
   * Validate all recorded optimizations
   */
  validateAll(): OptimizationTest[] {
    const tests: OptimizationTest[] = [];

    for (const [name] of this.baselineProfile) {
      tests.push(this.validateOptimization(name));
    }

    this.optimizationTests = tests;
    return tests;
  }

  /**
   * Detect outliers in profile data
   */
  detectOutliers(profile: ProfileResult): { min: boolean; max: boolean; reason: string } {
    const mean = profile.timing.mean;
    const stdDev = profile.timing.standardDeviation;

    const minZScore = (profile.timing.min - mean) / stdDev;
    const maxZScore = (profile.timing.max - mean) / stdDev;

    const minIsOutlier = Math.abs(minZScore) > this.thresholds.outlierZScore;
    const maxIsOutlier = Math.abs(maxZScore) > this.thresholds.outlierZScore;

    let reason = '';
    if (minIsOutlier) {
      reason = `Minimum value (${profile.timing.min.toFixed(2)}ms) is outlier (Z=${minZScore.toFixed(2)})`;
    }
    if (maxIsOutlier) {
      reason = `Maximum value (${profile.timing.max.toFixed(2)}ms) is outlier (Z=${maxZScore.toFixed(2)})`;
    }

    return { min: minIsOutlier, max: maxIsOutlier, reason };
  }

  /**
   * Check if profile is stable (low variance)
   */
  isProfileStable(profile: ProfileResult): boolean {
    const coefficientOfVariation = profile.timing.standardDeviation / profile.timing.mean;
    // Stable if coefficient of variation < 10%
    return coefficientOfVariation < 0.1;
  }

  /**
   * Generate validation report
   */
  formatReport(): string {
    let report = '\n✅ Performance Validation Report\n';
    report += `${'='.repeat(60)}\n\n`;

    const valid = this.optimizationTests.filter((t) => t.isValid);
    const invalid = this.optimizationTests.filter((t) => !t.isValid);

    report += `📊 Validation Results\n`;
    report += `   Total Tests: ${this.optimizationTests.length}\n`;
    report += `   ✅ Valid Optimizations: ${valid.length}\n`;
    report += `   ❌ Invalid/Regressed: ${invalid.length}\n\n`;

    if (valid.length > 0) {
      report += `✅ Accepted Optimizations\n`;
      for (const test of valid) {
        report += `   • ${test.name}: ${test.improvement.toFixed(2)}% improvement\n`;
        report += `     ${test.reason}\n`;
      }
    }

    if (invalid.length > 0) {
      report += `\n❌ Rejected Optimizations\n`;
      for (const test of invalid) {
        report += `   • ${test.name}: REJECTED\n`;
        report += `     ${test.reason}\n`;
      }
      report += '\n⚠️  These optimizations must be revised before deployment.\n';
    }

    return report;
  }

  /**
   * Save validation results
   */
  saveReport(sessionName: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(this.outputPath, `validation-${sessionName}-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      sessionName,
      thresholds: this.thresholds,
      tests: this.optimizationTests,
      summary: {
        total: this.optimizationTests.length,
        valid: this.optimizationTests.filter((t) => t.isValid).length,
        invalid: this.optimizationTests.filter((t) => !t.isValid).length,
        totalImprovement: this.optimizationTests
          .filter((t) => t.isValid)
          .reduce((sum, t) => sum + t.improvement, 0),
      },
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Generate regression report
   */
  detectRegressions(): RegressionDetection[] {
    const regressions: RegressionDetection[] = [];

    for (const test of this.optimizationTests.filter((t) => !t.isValid)) {
      const changePercent =
        ((test.optimized.timing.mean - test.baseline.timing.mean) /
          test.baseline.timing.mean) *
        100;

      regressions.push({
        metricName: test.name,
        baseline: test.baseline.timing.mean,
        current: test.optimized.timing.mean,
        changePercent,
        severity: Math.abs(changePercent) > 20 ? 'critical' : 'warning',
        detectedAt: new Date().toISOString(),
      });
    }

    return regressions;
  }

  /**
   * Batch validation with recommendations
   */
  generateActionPlan(): { accept: string[]; reject: string[]; investigate: string[] } {
    const accept: string[] = [];
    const reject: string[] = [];
    const investigate: string[] = [];

    for (const test of this.optimizationTests) {
      if (test.isValid && test.improvement > 5) {
        accept.push(test.name);
      } else if (test.isValid && test.improvement < 1) {
        investigate.push(test.name);
      } else {
        reject.push(test.name);
      }
    }

    return { accept, reject, investigate };
  }
}

/**
 * Export validator for use in other modules
 */
export const validator = new PerformanceValidator();

/**
 * CLI execution
 */
if (require.main === module) {
  console.log(validator.formatReport());
  validator.saveReport('initial').then((filename) => {
    console.log(`✅ Validation report saved: ${filename}`);
  });
}

export default PerformanceValidator;
