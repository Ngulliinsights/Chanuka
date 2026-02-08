/**
 * Performance Impact Monitoring Service
 * Tracks how errors affect system performance and provides performance degradation insights
 */

import { CrossSystemErrorAnalytics } from './cross-system-error-analytics';
import { ErrorAggregationService } from './error-aggregation-service';
import {
  ClientSystem
} from './unified-error-monitoring-interface';

interface PerformanceMetrics {
  timestamp: number;
  system: ClientSystem;
  operation: string;
  duration: number;
  success: boolean;
  errorCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface PerformanceImpact {
  system: ClientSystem;
  operation: string;
  baselinePerformance: number; // Average duration without errors
  degradedPerformance: number; // Average duration with errors
  performanceDegradation: number; // Percentage degradation
  errorCorrelation: number; // Correlation coefficient between errors and performance
  impactScore: number; // 0-100 impact score
  timeRange: { start: number; end: number };
}

class PerformanceImpactMonitor {
  private static instance: PerformanceImpactMonitor;
  private aggregationService: ErrorAggregationService;
  private analyticsService: CrossSystemErrorAnalytics;
  private performanceData: PerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  static getInstance(): PerformanceImpactMonitor {
    if (!PerformanceImpactMonitor.instance) {
      PerformanceImpactMonitor.instance = new PerformanceImpactMonitor();
    }
    return PerformanceImpactMonitor.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
    this.startPerformanceMonitoring();
  }

  /**
   * Record performance metrics with error context
   */
  recordPerformanceMetrics(
    system: ClientSystem,
    operation: string,
    duration: number,
    success: boolean,
    additionalMetrics?: { memoryUsage?: number; cpuUsage?: number }
  ): void {
    const now = Date.now();
    const recentErrors = this.aggregationService.getSystemErrors(system, {
      start: now - 5 * 60 * 1000, // Last 5 minutes
      end: now
    });

    const metrics: PerformanceMetrics = {
      timestamp: now,
      system,
      operation,
      duration,
      success,
      errorCount: recentErrors.length,
      ...additionalMetrics
    };

    this.performanceData.push(metrics);

    // Keep only last 24 hours of data
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    this.performanceData = this.performanceData.filter(d => d.timestamp > oneDayAgo);
  }

  /**
   * Calculate performance impact for a specific system and operation
   */
  calculatePerformanceImpact(
    system: ClientSystem,
    operation: string,
    timeRange: { start: number; end: number }
  ): PerformanceImpact | null {
    const relevantData = this.performanceData.filter(d =>
      d.system === system &&
      d.operation === operation &&
      d.timestamp >= timeRange.start &&
      d.timestamp <= timeRange.end
    );

    if (relevantData.length < 10) return null; // Need sufficient data

    // Separate data into error and no-error periods
    const errorData = relevantData.filter(d => d.errorCount > 0);
    const noErrorData = relevantData.filter(d => d.errorCount === 0);

    if (errorData.length === 0 || noErrorData.length === 0) return null;

    const baselinePerformance = noErrorData.reduce((sum, d) => sum + d.duration, 0) / noErrorData.length;
    const degradedPerformance = errorData.reduce((sum, d) => sum + d.duration, 0) / errorData.length;

    const performanceDegradation = baselinePerformance > 0
      ? ((degradedPerformance - baselinePerformance) / baselinePerformance) * 100
      : 0;

    // Calculate correlation between error count and performance
    const errorCorrelation = this.calculateCorrelation(
      relevantData.map(d => d.errorCount),
      relevantData.map(d => d.duration)
    );

    // Calculate impact score (0-100)
    const impactScore = Math.min(100, Math.max(0,
      (Math.abs(performanceDegradation) * 0.4) +
      (Math.abs(errorCorrelation) * 50) +
      (errorData.length / relevantData.length * 20)
    ));

    return {
      system,
      operation,
      baselinePerformance,
      degradedPerformance,
      performanceDegradation,
      errorCorrelation,
      impactScore,
      timeRange
    };
  }

  /**
   * Get performance impact analysis for all systems
   */
  getSystemPerformanceImpacts(timeRange?: { start: number; end: number }): {
    systemImpacts: Record<ClientSystem, PerformanceImpact[]>;
    overallImpact: {
      totalDegradation: number;
      mostImpactedSystem: ClientSystem | null;
      criticalOperations: Array<{ system: ClientSystem; operation: string; impact: number }>;
    };
  } {
    const range = timeRange || {
      start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      end: Date.now()
    };

    const systemImpacts: Record<ClientSystem, PerformanceImpact[]> = {
      security: [],
      hooks: [],
      library_services: [],
      service_architecture: [],
      mobile: [],
      desktop: [],
      web: []
    };

    // Get unique operations per system
    const systemOperations: Record<ClientSystem, Set<string>> = {
      security: new Set(),
      hooks: new Set(),
      library_services: new Set(),
      service_architecture: new Set(),
      mobile: new Set(),
      desktop: new Set(),
      web: new Set()
    };

    this.performanceData.forEach(d => {
      if (d.timestamp >= range.start && d.timestamp <= range.end) {
        systemOperations[d.system].add(d.operation);
      }
    });

    // Calculate impact for each operation
    Object.entries(systemOperations).forEach(([systemStr, operations]) => {
      const system = systemStr as ClientSystem;
      operations.forEach(operation => {
        const impact = this.calculatePerformanceImpact(system, operation, range);
        if (impact) {
          systemImpacts[system].push(impact);
        }
      });
    });

    // Calculate overall impact
    const allImpacts = Object.values(systemImpacts).flat();
    const totalDegradation = allImpacts.length > 0
      ? allImpacts.reduce((sum, impact) => sum + impact.performanceDegradation, 0) / allImpacts.length
      : 0;

    // Find most impacted system
    let mostImpactedSystem: ClientSystem | null = null;
    let maxAvgImpact = 0;

    Object.entries(systemImpacts).forEach(([systemStr, impacts]) => {
      if (impacts.length > 0) {
        const avgImpact = impacts.reduce((sum, impact) => sum + impact.impactScore, 0) / impacts.length;
        if (avgImpact > maxAvgImpact) {
          maxAvgImpact = avgImpact;
          mostImpactedSystem = systemStr as ClientSystem;
        }
      }
    });

    // Find critical operations (impact score > 70)
    const criticalOperations = allImpacts
      .filter(impact => impact.impactScore > 70)
      .map(impact => ({
        system: impact.system,
        operation: impact.operation,
        impact: impact.impactScore
      }))
      .sort((a, b) => b.impact - a.impact);

    return {
      systemImpacts,
      overallImpact: {
        totalDegradation,
        mostImpactedSystem,
        criticalOperations
      }
    };
  }

  /**
   * Get performance degradation trends
   */
  getPerformanceDegradationTrends(hours: number = 24): Array<{
    timestamp: number;
    system: ClientSystem;
    avgDegradation: number;
    errorCount: number;
  }> {
    const now = Date.now();
    const trends: Array<{
      timestamp: number;
      system: ClientSystem;
      avgDegradation: number;
      errorCount: number;
    }> = [];

    // Analyze in hourly buckets
    for (let i = hours - 1; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 60 * 60 * 1000;
      const bucketEnd = now - i * 60 * 60 * 1000;

      const bucketData = this.performanceData.filter(d =>
        d.timestamp >= bucketStart && d.timestamp < bucketEnd
      );

      Object.values(ClientSystem).forEach(system => {
        const systemData = bucketData.filter(d => d.system === system);
        if (systemData.length === 0) return;

        const errorCount = systemData.reduce((sum, d) => sum + d.errorCount, 0);
        const avgDuration = systemData.reduce((sum, d) => sum + d.duration, 0) / systemData.length;

        // Calculate degradation (simplified - compare to system average)
        const systemAvg = this.getSystemAveragePerformance(system, {
          start: now - 7 * 24 * 60 * 60 * 1000, // Last 7 days
          end: now
        });

        const degradation = systemAvg > 0 ? ((avgDuration - systemAvg) / systemAvg) * 100 : 0;

        trends.push({
          timestamp: bucketStart,
          system,
          avgDegradation: degradation,
          errorCount
        });
      });
    }

    return trends;
  }

  /**
   * Identify performance bottlenecks caused by errors
   */
  identifyPerformanceBottlenecks(): Array<{
    system: ClientSystem;
    operation: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    const bottlenecks: Array<{
      system: ClientSystem;
      operation: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendations: string[];
    }> = [];
    const impacts = this.getSystemPerformanceImpacts();

    Object.entries(impacts.systemImpacts).forEach(([systemStr, systemImpacts]) => {
      const system = systemStr as ClientSystem;

      systemImpacts.forEach(impact => {
        if (impact.impactScore > 50) { // Significant impact
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
          let issue = '';
          const recommendations = [];

          if (impact.performanceDegradation > 100) {
            severity = 'critical';
            issue = `Critical performance degradation: ${impact.performanceDegradation.toFixed(1)}% slower`;
            recommendations.push(
              'Immediate investigation required',
              'Consider circuit breaker pattern',
              'Review error handling logic',
              'Check for cascading failures'
            );
          } else if (impact.performanceDegradation > 50) {
            severity = 'high';
            issue = `High performance degradation: ${impact.performanceDegradation.toFixed(1)}% slower`;
            recommendations.push(
              'Optimize error handling',
              'Implement retry logic with backoff',
              'Monitor error patterns',
              'Consider caching strategies'
            );
          } else if (impact.performanceDegradation > 25) {
            severity = 'medium';
            issue = `Moderate performance degradation: ${impact.performanceDegradation.toFixed(1)}% slower`;
            recommendations.push(
              'Review error handling efficiency',
              'Implement performance monitoring',
              'Consider async error processing'
            );
          } else {
            severity = 'low';
            issue = `Minor performance degradation: ${impact.performanceDegradation.toFixed(1)}% slower`;
            recommendations.push(
              'Monitor for trend changes',
              'Optimize error logging'
            );
          }

          if (Math.abs(impact.errorCorrelation) > 0.7) {
            recommendations.push('Strong correlation between errors and performance - investigate root cause');
          }

          bottlenecks.push({
            system,
            operation: impact.operation,
            issue,
            severity,
            recommendations
          });
        }
      });
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get performance optimization recommendations
   */
  getPerformanceOptimizationRecommendations(): Array<{
    system: ClientSystem;
    priority: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    expectedImpact: number; // Expected performance improvement percentage
    implementationEffort: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      system: ClientSystem;
      priority: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
      expectedImpact: number;
      implementationEffort: 'low' | 'medium' | 'high';
    }> = [];
    const bottlenecks = this.identifyPerformanceBottlenecks();
    const impacts = this.getSystemPerformanceImpacts();

    // Recommendations based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      recommendations.push({
        system: bottleneck.system,
        priority: bottleneck.severity,
        recommendation: `Optimize error handling for ${bottleneck.operation}: ${bottleneck.recommendations[0]}`,
        expectedImpact: bottleneck.severity === 'critical' ? 30 : bottleneck.severity === 'high' ? 20 : 10,
        implementationEffort: bottleneck.severity === 'critical' ? 'high' : 'medium'
      });
    });

    // General recommendations based on overall impact
    if (impacts.overallImpact.totalDegradation > 20) {
      recommendations.push({
        system: ClientSystem.SERVICE_ARCHITECTURE, // Affects all systems
        priority: 'high',
        recommendation: 'Implement comprehensive error caching to reduce repeated error processing',
        expectedImpact: 15,
        implementationEffort: 'medium'
      });
    }

    // System-specific recommendations
    Object.entries(impacts.systemImpacts).forEach(([systemStr, systemImpacts]) => {
      const system = systemStr as ClientSystem;
      const avgImpact = systemImpacts.length > 0
        ? systemImpacts.reduce((sum, impact) => sum + impact.impactScore, 0) / systemImpacts.length
        : 0;

      if (avgImpact > 60) {
        recommendations.push({
          system,
          priority: 'high',
          recommendation: `Implement circuit breaker pattern for ${system} to prevent cascade failures`,
          expectedImpact: 25,
          implementationEffort: 'high'
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getSystemAveragePerformance(system: ClientSystem, timeRange: { start: number; end: number }): number {
    const systemData = this.performanceData.filter(d =>
      d.system === system &&
      d.timestamp >= timeRange.start &&
      d.timestamp <= timeRange.end &&
      d.errorCount === 0 // Only successful operations
    );

    return systemData.length > 0
      ? systemData.reduce((sum, d) => sum + d.duration, 0) / systemData.length
      : 0;
  }

  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.analyzePerformanceImpacts();
    }, 15 * 60 * 1000); // Analyze every 15 minutes
  }

  private analyzePerformanceImpacts(): void {
    // This could trigger alerts or logging based on performance degradation
    const bottlenecks = this.identifyPerformanceBottlenecks();

    if (bottlenecks.length > 0) {
      console.warn('🚨 Performance bottlenecks detected:', bottlenecks);
    }
  }

  // Public API methods
  getPerformanceData(
    system?: ClientSystem,
    operation?: string,
    timeRange?: { start: number; end: number }
  ): PerformanceMetrics[] {
    let data = this.performanceData;

    if (system) {
      data = data.filter(d => d.system === system);
    }

    if (operation) {
      data = data.filter(d => d.operation === operation);
    }

    if (timeRange) {
      data = data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);
    }

    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  clearOldData(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.performanceData = this.performanceData.filter(d => d.timestamp > cutoff);
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export { PerformanceImpactMonitor };
export default PerformanceImpactMonitor;
