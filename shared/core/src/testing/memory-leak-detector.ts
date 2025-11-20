import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Memory leak detection and resource usage monitoring
 * Tracks memory usage patterns and detects potential leaks
 */
export class MemoryLeakDetector extends EventEmitter {
  private memorySnapshots: MemorySnapshot[] = [];
  private leakThresholds: LeakThresholds;
  private monitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  private gcStats: GCStats[] = [];

  constructor(private config: MemoryLeakConfig = {}) {
    super();
    this.leakThresholds = {
      heapGrowthRate: config.thresholds?.heapGrowthRate ?? 0.1, // 10% growth per minute
      retainedSizeIncrease: config.thresholds?.retainedSizeIncrease ?? 50 * 1024 * 1024, // 50MB
      gcFrequencyIncrease: config.thresholds?.gcFrequencyIncrease ?? 2, // 2x increase
      memoryPressureThreshold: config.thresholds?.memoryPressureThreshold ?? 0.8 // 80% of max
    };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    this.memorySnapshots = [];
    this.gcStats = [];

    this.emit('monitoring:start', { intervalMs });

    // Take initial snapshot
    this.takeMemorySnapshot();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.takeMemorySnapshot();
      this.analyzeMemoryPatterns();
    }, intervalMs);

    // Monitor garbage collection if available
    this.setupGCTracking();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): MemoryLeakReport {
    if (!this.monitoringActive) {
      throw new Error('Memory monitoring is not active');
    }

    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    const report = this.generateLeakReport();
    this.emit('monitoring:stop', report);

    return report;
  }

  /**
   * Take a memory snapshot
   */
  private takeMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();

    const snapshot: MemorySnapshot = {
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      heapSizeLimit: 0
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots to prevent unbounded growth
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }

    this.emit('snapshot:taken', snapshot);
  }

  /**
   * Analyze memory usage patterns for potential leaks
   */
  private analyzeMemoryPatterns(): void {
    if (this.memorySnapshots.length < 5) {
      return; // Need minimum data points
    }

    const recentSnapshots = this.memorySnapshots.slice(-10); // Last 10 snapshots
    const analysis = this.performLeakAnalysis(recentSnapshots);

    if (analysis.leakDetected) {
      this.emit('leak:detected', {
        analysis,
        severity: analysis.severity,
        recommendations: this.generateLeakRecommendations(analysis)
      });
    }

    // Check for memory pressure
    const latestSnapshot = recentSnapshots[recentSnapshots.length - 1];
    const memoryPressure = latestSnapshot.heapUsed / latestSnapshot.heapSizeLimit;

    if (memoryPressure > this.leakThresholds.memoryPressureThreshold) {
      this.emit('memory:pressure', {
        pressure: memoryPressure,
        threshold: this.leakThresholds.memoryPressureThreshold,
        currentUsage: latestSnapshot.heapUsed,
        limit: latestSnapshot.heapSizeLimit
      });
    }
  }

  /**
   * Perform detailed leak analysis
   */
  private performLeakAnalysis(snapshots: MemorySnapshot[]): LeakAnalysis {
    const heapUsage = snapshots.map(s => s.heapUsed);
    const timestamps = snapshots.map(s => s.timestamp);

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(heapUsage, timestamps);

    // Calculate retained size increase
    const retainedIncrease = heapUsage[heapUsage.length - 1] - heapUsage[0];

    // Check for sawtooth pattern (frequent GC)
    const sawtoothPattern = this.detectSawtoothPattern(heapUsage);

    // Calculate memory fragmentation
    const fragmentation = this.calculateFragmentation(snapshots);

    // Determine if leak is detected
    const leakDetected = this.isLeakDetected(growthRate, retainedIncrease, sawtoothPattern);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (leakDetected) {
      if (growthRate > 0.3 || retainedIncrease > 200 * 1024 * 1024) {
        severity = 'critical';
      } else if (growthRate > 0.2 || retainedIncrease > 100 * 1024 * 1024) {
        severity = 'high';
      } else if (growthRate > 0.1 || retainedIncrease > 50 * 1024 * 1024) {
        severity = 'medium';
      }
    }

    return {
      leakDetected,
      severity,
      growthRate,
      retainedIncrease,
      sawtoothPattern,
      fragmentation,
      timeWindow: timestamps[timestamps.length - 1] - timestamps[0],
      snapshotCount: snapshots.length
    };
  }

  /**
   * Calculate memory growth rate
   */
  private calculateGrowthRate(values: number[], timestamps: number[]): number {
    if (values.length < 2) return 0;

    const timeSpan = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60); // minutes
    const valueIncrease = values[values.length - 1] - values[0];

    return valueIncrease / values[0] / timeSpan; // growth per minute
  }

  /**
   * Detect sawtooth pattern indicating frequent GC
   */
  private detectSawtoothPattern(heapUsage: number[]): boolean {
    if (heapUsage.length < 10) return false;

    let peaks = 0;
    let valleys = 0;

    for (let i = 1; i < heapUsage.length - 1; i++) {
      if (heapUsage[i] > heapUsage[i - 1] && heapUsage[i] > heapUsage[i + 1]) {
        peaks++;
      }
      if (heapUsage[i] < heapUsage[i - 1] && heapUsage[i] < heapUsage[i + 1]) {
        valleys++;
      }
    }

    // Sawtooth pattern if we have multiple peaks/valleys
    return peaks >= 2 && valleys >= 2;
  }

  /**
   * Calculate memory fragmentation
   */
  private calculateFragmentation(snapshots: MemorySnapshot[]): number {
    const avgHeapTotal = snapshots.reduce((sum, s) => sum + s.heapTotal, 0) / snapshots.length;
    const avgHeapUsed = snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / snapshots.length;

    return avgHeapTotal > 0 ? (avgHeapTotal - avgHeapUsed) / avgHeapTotal : 0;
  }

  /**
   * Determine if a memory leak is detected
   */
  private isLeakDetected(growthRate: number, retainedIncrease: number, sawtoothPattern: boolean): boolean {
    return (
      growthRate > this.leakThresholds.heapGrowthRate ||
      retainedIncrease > this.leakThresholds.retainedSizeIncrease ||
      sawtoothPattern
    );
  }

  /**
   * Generate leak recommendations
   */
  private generateLeakRecommendations(analysis: LeakAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.growthRate > this.leakThresholds.heapGrowthRate) {
      recommendations.push('High memory growth rate detected. Review object creation patterns.');
    }

    if (analysis.retainedIncrease > this.leakThresholds.retainedSizeIncrease) {
      recommendations.push('Large retained memory increase. Check for object retention issues.');
    }

    if (analysis.sawtoothPattern) {
      recommendations.push('Frequent garbage collection detected. Consider reducing object allocation.');
    }

    if (analysis.fragmentation > 0.5) {
      recommendations.push('High memory fragmentation. Consider memory pool optimizations.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor memory usage trends and consider heap dump analysis.');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive leak report
   */
  private generateLeakReport(): MemoryLeakReport {
    const analysis = this.performLeakAnalysis(this.memorySnapshots);

    return {
      timestamp: new Date(),
      monitoringDuration: this.memorySnapshots.length > 0 ?
        this.memorySnapshots[this.memorySnapshots.length - 1].timestamp - this.memorySnapshots[0].timestamp : 0,
      leakDetected: analysis.leakDetected,
      severity: analysis.severity,
      analysis,
      snapshots: this.memorySnapshots,
      gcStats: this.gcStats,
      recommendations: this.generateLeakRecommendations(analysis),
      summary: {
        initialMemory: this.memorySnapshots[0]?.heapUsed || 0,
        finalMemory: this.memorySnapshots[this.memorySnapshots.length - 1]?.heapUsed || 0,
        peakMemory: Math.max(...this.memorySnapshots.map(s => s.heapUsed)),
        averageMemory: this.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.memorySnapshots.length,
        totalSnapshots: this.memorySnapshots.length
      }
    };
  }

  /**
   * Set up garbage collection tracking
   */
  private setupGCTracking(): void {
    if (typeof global !== 'undefined' && global.gc) {
      // Track GC events if available
      let lastGCStart = 0;

      // This is a simplified GC tracking - in practice, you'd use performance hooks
      const originalGC = global.gc;
      global.gc = (() => {
        const startTime = performance.now();
        const beforeMemory = process.memoryUsage();

        originalGC();

        const endTime = performance.now();
        const afterMemory = process.memoryUsage();

        const gcStat: GCStats = {
          timestamp: Date.now(),
          duration: endTime - startTime,
          collectedBytes: beforeMemory.heapUsed - afterMemory.heapUsed,
          beforeMemory,
          afterMemory
        };

        this.gcStats.push(gcStat);

        // Keep only last 50 GC events
        if (this.gcStats.length > 50) {
          this.gcStats = this.gcStats.slice(-50);
        }

        this.emit('gc:completed', gcStat);
      }) as any;
    }
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      heapSizeLimit: 0 // heapSizeLimit not available in all Node versions
    };
  }

  /**
   * Get memory usage trends
   */
  getMemoryTrends(timeRangeMinutes: number = 60): MemoryTrends {
    const cutoffTime = Date.now() - (timeRangeMinutes * 60 * 1000);
    const relevantSnapshots = this.memorySnapshots.filter(s => s.timestamp >= cutoffTime);

    if (relevantSnapshots.length < 2) {
      return {
        timeRangeMinutes,
        trend: 'insufficient-data',
        dataPoints: relevantSnapshots.length,
        averageUsage: 0,
        peakUsage: 0,
        growthRate: 0
      };
    }

    const heapUsage = relevantSnapshots.map(s => s.heapUsed);
    const timestamps = relevantSnapshots.map(s => s.timestamp);

    const growthRate = this.calculateGrowthRate(heapUsage, timestamps);
    const averageUsage = heapUsage.reduce((sum, val) => sum + val, 0) / heapUsage.length;
    const peakUsage = Math.max(...heapUsage);

    let trend: 'stable' | 'increasing' | 'decreasing' | 'insufficient-data' = 'stable';
    if (growthRate > 0.01) trend = 'increasing';
    else if (growthRate < -0.01) trend = 'decreasing';

    return {
      timeRangeMinutes,
      trend,
      dataPoints: relevantSnapshots.length,
      averageUsage,
      peakUsage,
      growthRate
    };
  }

  /**
   * Export memory profiling data
   */
  exportMemoryProfile(filePath: string): void {
    const profile = {
      snapshots: this.memorySnapshots,
      gcStats: this.gcStats,
      analysis: this.performLeakAnalysis(this.memorySnapshots),
      trends: this.getMemoryTrends(),
      config: this.config
    };

    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
    this.emit('profile:exported', { filePath });
  }
}

// Type definitions
export interface MemoryLeakConfig {
  thresholds?: {
    heapGrowthRate?: number;
    retainedSizeIncrease?: number;
    gcFrequencyIncrease?: number;
    memoryPressureThreshold?: number;
  };
  monitoringInterval?: number;
  maxSnapshots?: number;
  enableGCTracking?: boolean;
}

export interface LeakThresholds {
  heapGrowthRate: number;
  retainedSizeIncrease: number;
  gcFrequencyIncrease: number;
  memoryPressureThreshold: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapSizeLimit: number;
}

export interface LeakAnalysis {
  leakDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  growthRate: number;
  retainedIncrease: number;
  sawtoothPattern: boolean;
  fragmentation: number;
  timeWindow: number;
  snapshotCount: number;
}

export interface GCStats {
  timestamp: number;
  duration: number;
  collectedBytes: number;
  beforeMemory: NodeJS.MemoryUsage;
  afterMemory: NodeJS.MemoryUsage;
}

export interface MemoryLeakReport {
  timestamp: Date;
  monitoringDuration: number;
  leakDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  analysis: LeakAnalysis;
  snapshots: MemorySnapshot[];
  gcStats: GCStats[];
  recommendations: string[];
  summary: {
    initialMemory: number;
    finalMemory: number;
    peakMemory: number;
    averageMemory: number;
    totalSnapshots: number;
  };
}

export interface MemoryTrends {
  timeRangeMinutes: number;
  trend: 'stable' | 'increasing' | 'decreasing' | 'insufficient-data';
  dataPoints: number;
  averageUsage: number;
  peakUsage: number;
  growthRate: number;
}







































