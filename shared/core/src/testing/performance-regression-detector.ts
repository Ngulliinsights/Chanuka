import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { PerformanceBenchmarks } from './performance-benchmarks';

/**
 * Performance regression detection system
 * Monitors performance metrics over time and detects significant regressions
 */
export class PerformanceRegressionDetector extends EventEmitter {
  private baselineMetrics: Map<string, PerformanceBaseline> = new Map();
  private historicalData: PerformanceHistoryEntry[] = [];
  private regressionThresholds: RegressionThresholds;

  constructor(private config: RegressionDetectorConfig = {}) {
    super();
    this.regressionThresholds = {
      operationsPerSecond: config.thresholds?.operationsPerSecond ?? -0.1, // 10% degradation
      averageTimeMs: config.thresholds?.averageTimeMs ?? 0.1, // 10% increase
      memoryUsage: config.thresholds?.memoryUsage ?? 0.2, // 20% increase
      errorRate: config.thresholds?.errorRate ?? 0.05 // 5% increase
    };

    this.loadHistoricalData();
  }

  /**
   * Establish performance baselines
   */
  async establishBaselines(components: any, iterations: number = 5): Promise<PerformanceBaseline[]> {
    this.emit('baseline:start', { iterations });

    const baselines: PerformanceBaseline[] = [];

    for (let i = 0; i < iterations; i++) {
      this.emit('baseline:iteration', { iteration: i + 1, total: iterations });

      const benchmarks = new PerformanceBenchmarks();
      const results = await benchmarks.runAll(components);

      for (const result of results.results) {
        if (result.success) {
          const baseline = this.createBaselineFromResult(result);
          baselines.push(baseline);
        }
      }

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Aggregate baselines
    const aggregatedBaselines = this.aggregateBaselines(baselines);

    for (const baseline of aggregatedBaselines) {
      this.baselineMetrics.set(baseline.name, baseline);
    }

    this.saveBaselines();
    this.emit('baseline:complete', { baselines: aggregatedBaselines.length });

    return aggregatedBaselines;
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions(components: any): Promise<RegressionReport> {
    this.emit('regression:check:start');

    const benchmarks = new PerformanceBenchmarks();
    const currentResults = await benchmarks.runAll(components);

    const regressions: PerformanceRegression[] = [];
    const improvements: PerformanceImprovement[] = [];

    for (const result of currentResults.results) {
      if (!result.success) continue;

      const baseline = this.baselineMetrics.get(result.name);
      if (!baseline) {
        // No baseline for this test, skip
        continue;
      }

      const comparison = this.compareWithBaseline(result, baseline);

      if (comparison.isRegression) {
        regressions.push({
          testName: result.name,
          category: result.category,
          baseline: baseline,
          current: this.extractMetricsFromResult(result),
          degradation: comparison.degradation,
          severity: comparison.severity,
          threshold: comparison.threshold
        });
      } else if (comparison.isImprovement) {
        improvements.push({
          testName: result.name,
          category: result.category,
          baseline: baseline,
          current: this.extractMetricsFromResult(result),
          improvement: {
            operationsPerSecond: -comparison.degradation.operationsPerSecond,
            averageTimeMs: -comparison.degradation.averageTimeMs,
            memoryUsage: -comparison.degradation.memoryUsage
          }
        });
      }
    }

    // Save historical data
    this.saveHistoricalEntry(currentResults);

    const report: RegressionReport = {
      timestamp: new Date(),
      regressions,
      improvements,
      summary: {
        totalTests: currentResults.results.length,
        regressionsFound: regressions.length,
        improvementsFound: improvements.length,
        criticalRegressions: regressions.filter(r => r.severity === 'critical').length,
        overallHealth: this.calculateOverallHealth(regressions)
      }
    };

    this.emit('regression:check:complete', report);
    return report;
  }

  /**
   * Monitor performance trends over time
   */
  getPerformanceTrends(timeRange: number = 30): PerformanceTrends {
    const cutoffDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
    const recentData = this.historicalData.filter(entry => entry.timestamp >= cutoffDate);

    const trends: Record<string, TrendData> = {};

    for (const entry of recentData) {
      for (const result of entry.results) {
        if (!trends[result.name]) {
          trends[result.name] = {
            testName: result.name,
            category: result.category,
            dataPoints: [],
            trend: 'stable',
            volatility: 0
          };
        }

        trends[result.name].dataPoints.push({
          timestamp: entry.timestamp,
          operationsPerSecond: result.operationsPerSecond,
          averageTimeMs: result.averageTimeMs || 0,
          memoryUsage: result.memoryResults ? result.memoryResults.reduce((sum, r) => sum + r.heapUsed, 0) / result.memoryResults.length : 0
        });
      }
    }

    // Calculate trends and volatility
    for (const trend of Object.values(trends)) {
      if (trend.dataPoints.length >= 2) {
        trend.trend = this.calculateTrend(trend.dataPoints.map(p => p.operationsPerSecond));
        trend.volatility = this.calculateVolatility(trend.dataPoints.map(p => p.operationsPerSecond));
      }
    }

    return {
      timeRangeDays: timeRange,
      trends: Object.values(trends),
      summary: {
        totalTests: Object.keys(trends).length,
        improving: Object.values(trends).filter(t => t.trend === 'improving').length,
        declining: Object.values(trends).filter(t => t.trend === 'declining').length,
        stable: Object.values(trends).filter(t => t.trend === 'stable').length,
        volatile: Object.values(trends).filter(t => t.volatility > 0.1).length
      }
    };
  }

  /**
   * Generate performance alerts
   */
  generateAlerts(report: RegressionReport): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    for (const regression of report.regressions) {
      if (regression.severity === 'critical') {
        alerts.push({
          type: 'critical-regression',
          severity: 'critical',
          message: `Critical performance regression in ${regression.testName}`,
          details: `Performance degraded by ${Math.abs(regression.degradation.operationsPerSecond * 100).toFixed(1)}%`,
          recommendedAction: 'Immediate investigation required',
          testName: regression.testName,
          category: regression.category
        });
      } else if (regression.severity === 'high') {
        alerts.push({
          type: 'high-regression',
          severity: 'high',
          message: `Significant performance regression in ${regression.testName}`,
          details: `Performance degraded by ${Math.abs(regression.degradation.operationsPerSecond * 100).toFixed(1)}%`,
          recommendedAction: 'Review recent changes and optimize',
          testName: regression.testName,
          category: regression.category
        });
      }
    }

    // Check for trend-based alerts
    const trends = this.getPerformanceTrends(7); // Last 7 days
    for (const trend of trends.trends) {
      if (trend.trend === 'declining' && trend.volatility > 0.15) {
        alerts.push({
          type: 'trend-decline',
          severity: 'medium',
          message: `Declining performance trend in ${trend.testName}`,
          details: `Performance has been declining with high volatility (${(trend.volatility * 100).toFixed(1)}%)`,
          recommendedAction: 'Monitor closely and investigate root cause',
          testName: trend.testName,
          category: trend.category
        });
      }
    }

    return alerts;
  }

  // Helper methods
  private createBaselineFromResult(result: any): PerformanceBaseline {
    return {
      name: result.name,
      category: result.category,
      operationsPerSecond: result.operationsPerSecond,
      averageTimeMs: result.averageTimeMs || 0,
      minTimeMs: result.minTimeMs || 0,
      maxTimeMs: result.maxTimeMs || 0,
      percentiles: result.percentiles || { p50: 0, p90: 0, p95: 0, p99: 0 },
      memoryUsage: result.memoryResults ?
        result.memoryResults.reduce((sum: number, r: any) => sum + r.heapUsed, 0) / result.memoryResults.length : 0,
      establishedAt: new Date(),
      sampleSize: 1
    };
  }

  private aggregateBaselines(baselines: PerformanceBaseline[]): PerformanceBaseline[] {
    const aggregated = new Map<string, PerformanceBaseline[]>();

    // Group by name
    for (const baseline of baselines) {
      if (!aggregated.has(baseline.name)) {
        aggregated.set(baseline.name, []);
      }
      aggregated.get(baseline.name)!.push(baseline);
    }

    // Calculate averages
    const result: PerformanceBaseline[] = [];
    for (const [name, group] of Array.from(aggregated.entries())) {
      const avgOps = group.reduce((sum, b) => sum + b.operationsPerSecond, 0) / group.length;
      const avgTime = group.reduce((sum, b) => sum + b.averageTimeMs, 0) / group.length;
      const avgMemory = group.reduce((sum, b) => sum + b.memoryUsage, 0) / group.length;

      result.push({
        name: name,
        category: group[0].category,
        operationsPerSecond: avgOps,
        averageTimeMs: avgTime,
        minTimeMs: Math.min(...group.map(b => b.minTimeMs)),
        maxTimeMs: Math.max(...group.map(b => b.maxTimeMs)),
        percentiles: {
          p50: group.reduce((sum, b) => sum + b.percentiles.p50, 0) / group.length,
          p90: group.reduce((sum, b) => sum + b.percentiles.p90, 0) / group.length,
          p95: group.reduce((sum, b) => sum + b.percentiles.p95, 0) / group.length,
          p99: group.reduce((sum, b) => sum + b.percentiles.p99, 0) / group.length
        },
        memoryUsage: avgMemory,
        establishedAt: new Date(),
        sampleSize: group.length
      });
    }

    return result;
  }

  private compareWithBaseline(current: any, baseline: PerformanceBaseline): RegressionComparison {
    const currentMetrics = this.extractMetricsFromResult(current);

    const opsDegradation = (baseline.operationsPerSecond - currentMetrics.operationsPerSecond) / baseline.operationsPerSecond;
    const timeIncrease = (currentMetrics.averageTimeMs - baseline.averageTimeMs) / baseline.averageTimeMs;
    const memoryIncrease = (currentMetrics.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage;

    const isOpsRegression = opsDegradation > Math.abs(this.regressionThresholds.operationsPerSecond);
    const isTimeRegression = timeIncrease > this.regressionThresholds.averageTimeMs;
    const isMemoryRegression = memoryIncrease > this.regressionThresholds.memoryUsage;

    const isRegression = isOpsRegression || isTimeRegression || isMemoryRegression;
    const isImprovement = !isRegression && (
      opsDegradation < -Math.abs(this.regressionThresholds.operationsPerSecond) ||
      timeIncrease < -this.regressionThresholds.averageTimeMs
    );

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (isOpsRegression && opsDegradation > 0.25) severity = 'critical';
    else if (isOpsRegression && opsDegradation > 0.15) severity = 'high';
    else if (isOpsRegression || isTimeRegression) severity = 'medium';

    return {
      isRegression,
      isImprovement,
      degradation: {
        operationsPerSecond: opsDegradation,
        averageTimeMs: timeIncrease,
        memoryUsage: memoryIncrease
      },
      severity,
      threshold: this.regressionThresholds
    };
  }

  private extractMetricsFromResult(result: any): PerformanceMetrics {
    return {
      operationsPerSecond: result.operationsPerSecond,
      averageTimeMs: result.averageTimeMs || 0,
      minTimeMs: result.minTimeMs || 0,
      maxTimeMs: result.maxTimeMs || 0,
      percentiles: result.percentiles || { p50: 0, p90: 0, p95: 0, p99: 0 },
      memoryUsage: result.memoryResults ?
        result.memoryResults.reduce((sum: number, r: any) => sum + r.heapUsed, 0) / result.memoryResults.length : 0
    };
  }

  private calculateTrend(dataPoints: number[]): 'improving' | 'declining' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    // Simple linear regression
    const n = dataPoints.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = dataPoints.reduce((sum, y) => sum + y, 0);
    const sumXY = dataPoints.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (slope > 0.01) return 'improving';
    if (slope < -0.01) return 'declining';
    return 'stable';
  }

  private calculateVolatility(dataPoints: number[]): number {
    if (dataPoints.length < 2) return 0;

    const mean = dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.length;
    const variance = dataPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataPoints.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean; // Coefficient of variation
  }

  private calculateOverallHealth(regressions: PerformanceRegression[]): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const criticalCount = regressions.filter(r => r.severity === 'critical').length;
    const highCount = regressions.filter(r => r.severity === 'high').length;
    const totalRegressions = regressions.length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2 || totalRegressions > 5) return 'poor';
    if (highCount > 0 || totalRegressions > 2) return 'fair';
    if (totalRegressions > 0) return 'good';
    return 'excellent';
  }

  private loadHistoricalData(): void {
    try {
      const historyFile = path.join(process.cwd(), 'performance-history.json');
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
        this.historicalData = data.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      // Ignore errors loading historical data
    }
  }

  private saveBaselines(): void {
    try {
      const baselinesFile = path.join(process.cwd(), 'performance-baselines.json');
      const data = Array.from(this.baselineMetrics.entries()).map(([name, baseline]) => ({
        name,
        ...baseline
      }));
      fs.writeFileSync(baselinesFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.emit('baseline:save:error', error);
    }
  }

  private saveHistoricalEntry(results: any): void {
    const entry: PerformanceHistoryEntry = {
      timestamp: new Date(),
      results: results.results.map((r: any) => ({
        name: r.name,
        category: r.category,
        operationsPerSecond: r.operationsPerSecond,
        averageTimeMs: r.averageTimeMs,
        memoryResults: r.memoryResults
      }))
    };

    this.historicalData.push(entry);

    // Keep only last 100 entries
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }

    try {
      const historyFile = path.join(process.cwd(), 'performance-history.json');
      fs.writeFileSync(historyFile, JSON.stringify(this.historicalData, null, 2));
    } catch (error) {
      this.emit('history:save:error', error);
    }
  }
}

// Type definitions
export interface RegressionDetectorConfig {
  thresholds?: {
    operationsPerSecond?: number;
    averageTimeMs?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
  baselineSamples?: number;
  alertThresholds?: {
    critical?: number;
    high?: number;
    medium?: number;
  };
}

export interface PerformanceBaseline {
  name: string;
  category: string;
  operationsPerSecond: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  memoryUsage: number;
  establishedAt: Date;
  sampleSize: number;
}

export interface PerformanceMetrics {
  operationsPerSecond: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  memoryUsage: number;
}

export interface RegressionComparison {
  isRegression: boolean;
  isImprovement: boolean;
  degradation: {
    operationsPerSecond: number;
    averageTimeMs: number;
    memoryUsage: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: RegressionThresholds;
}

export interface RegressionThresholds {
  operationsPerSecond: number;
  averageTimeMs: number;
  memoryUsage: number;
  errorRate: number;
}

export interface PerformanceRegression {
  testName: string;
  category: string;
  baseline: PerformanceBaseline;
  current: PerformanceMetrics;
  degradation: {
    operationsPerSecond: number;
    averageTimeMs: number;
    memoryUsage: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: RegressionThresholds;
}

export interface PerformanceImprovement {
  testName: string;
  category: string;
  baseline: PerformanceBaseline;
  current: PerformanceMetrics;
  improvement: {
    operationsPerSecond: number;
    averageTimeMs: number;
    memoryUsage: number;
  };
}

export interface RegressionReport {
  timestamp: Date;
  regressions: PerformanceRegression[];
  improvements: PerformanceImprovement[];
  summary: {
    totalTests: number;
    regressionsFound: number;
    improvementsFound: number;
    criticalRegressions: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

export interface PerformanceTrends {
  timeRangeDays: number;
  trends: TrendData[];
  summary: {
    totalTests: number;
    improving: number;
    declining: number;
    stable: number;
    volatile: number;
  };
}

export interface TrendData {
  testName: string;
  category: string;
  dataPoints: Array<{
    timestamp: Date;
    operationsPerSecond: number;
    averageTimeMs: number;
    memoryUsage: number;
  }>;
  trend: 'improving' | 'declining' | 'stable';
  volatility: number;
}

export interface PerformanceAlert {
  type: 'critical-regression' | 'high-regression' | 'trend-decline' | 'memory-leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  recommendedAction: string;
  testName: string;
  category: string;
}

export interface PerformanceHistoryEntry {
  timestamp: Date;
  results: Array<{
    name: string;
    category: string;
    operationsPerSecond: number;
    averageTimeMs: number;
    memoryResults?: any[];
  }>;
}







































