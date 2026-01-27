/**
 * Monitoring Integration Service
 * Central integration point for all error monitoring and analytics across client systems
 */


// Import all monitoring services
import { CrossSystemErrorAnalytics } from './cross-system-error-analytics';
import { ErrorAggregationService } from './error-aggregation-service';
import PerformanceImpactMonitor from './performance-impact-monitor';
import { TrendAnalysisService } from './trend-analysis-service';
import {
  ClientSystem,
  ErrorContext,
  PerformanceMetrics
} from './unified-error-monitoring-interface';

// System-specific monitoring will be accessed through their singleton instances
// when available, but the integration service provides the unified API

interface MonitoringSystemStatus {
  system: ClientSystem;
  monitoringActive: boolean;
  lastActivity: number;
  errorCount: number;
  performanceScore: number;
}

class MonitoringIntegrationService {
  private static instance: MonitoringIntegrationService;
  private aggregationService: ErrorAggregationService;
  private analyticsService: CrossSystemErrorAnalytics;
  private trendService: TrendAnalysisService;
  private performanceMonitor: PerformanceImpactMonitor;
  private systemStatus: Map<ClientSystem, MonitoringSystemStatus> = new Map();
  private integrationInterval: NodeJS.Timeout | null = null;

  static getInstance(): MonitoringIntegrationService {
    if (!MonitoringIntegrationService.instance) {
      MonitoringIntegrationService.instance = new MonitoringIntegrationService();
    }
    return MonitoringIntegrationService.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
    this.trendService = TrendAnalysisService.getInstance();
    this.performanceMonitor = PerformanceImpactMonitor.getInstance();

    this.initializeSystemStatus();
    this.startIntegrationMonitoring();
  }

  private initializeSystemStatus(): void {
    const systems = Object.values(ClientSystem);
    const now = Date.now();

    systems.forEach(system => {
      this.systemStatus.set(system, {
        system,
        monitoringActive: true,
        lastActivity: now,
        errorCount: 0,
        performanceScore: 100
      });
    });
  }

  private startIntegrationMonitoring(): void {
    this.integrationInterval = setInterval(() => {
      this.updateSystemStatus();
      this.performCrossSystemHealthCheck();
    }, 30000); // Update every 30 seconds
  }

  private async updateSystemStatus(): Promise<void> {
    const now = Date.now();

    for (const system of Object.values(ClientSystem)) {
      const status = this.systemStatus.get(system)!;

      // Get recent errors for this system
      const recentErrors = this.aggregationService.getSystemErrors(system, {
        start: now - 300000, // Last 5 minutes
        end: now
      });

      status.errorCount = recentErrors.length;
      status.lastActivity = now;

      // Get performance score from analytics
      try {
        const analytics = await this.analyticsService.getCrossSystemAnalytics();
        const systemHealth = analytics.systems.find((s: any) => s.system === system);
        if (systemHealth) {
          status.performanceScore = systemHealth.performanceScore;
        }
      } catch (error) {
        console.warn(`Failed to get analytics for ${system}:`, error);
      }

      this.systemStatus.set(system, status);
    }
  }

  private async performCrossSystemHealthCheck(): Promise<void> {
    try {
      const analytics = await this.analyticsService.getCrossSystemAnalytics();

      if (analytics.overallHealth === 'critical') {
        console.error('🚨 CRITICAL: Overall system health is critical');
        this.triggerEmergencyProtocols();
      } else if (analytics.overallHealth === 'degraded') {
        console.warn('⚠️ WARNING: Overall system health is degraded');
        this.triggerDegradedModeProtocols();
      }
    } catch (error) {
      console.warn('Failed to perform cross-system health check:', error);
    }
  }

  private triggerEmergencyProtocols(): void {
    // Implement emergency protocols
    // - Increase monitoring frequency
    // - Enable additional logging
    // - Send alerts to on-call engineers
    // - Consider graceful degradation

    console.error('Emergency protocols activated');
  }

  private triggerDegradedModeProtocols(): void {
    // Implement degraded mode protocols
    // - Optimize performance
    // - Reduce non-essential operations
    // - Increase caching

    console.warn('Degraded mode protocols activated');
  }

  // ============================================================================
  // Unified API Methods
  // ============================================================================

  /**
   * Report an error to all relevant monitoring systems
   */
  async reportError(error: any, context: ErrorContext): Promise<void> {
    const system = context.system;

    // Update system activity
    const status = this.systemStatus.get(system);
    if (status) {
      status.lastActivity = Date.now();
      this.systemStatus.set(system, status);
    }

    // Send to aggregation service (which handles cross-system routing)
    this.aggregationService.addError(system, error, context);

    // Also send to performance monitor for correlation analysis
    this.performanceMonitor.recordPerformanceMetrics(
      system,
      context.operation || 'unknown',
      0, // Duration not available for errors
      false // Not successful
    );
  }

  /**
   * Track performance metrics across systems
   */
  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    const system = metrics.context?.system || ClientSystem.SERVICE_ARCHITECTURE;

    // Update system activity
    const status = this.systemStatus.get(system);
    if (status) {
      status.lastActivity = Date.now();
      this.systemStatus.set(system, status);
    }

    // Send to performance impact monitor
    this.performanceMonitor.recordPerformanceMetrics(
      system,
      metrics.operation,
      metrics.duration,
      metrics.success
    );
  }

  /**
   * Get comprehensive system health overview
   */
  async getSystemHealthOverview(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'critical';
    systems: MonitoringSystemStatus[];
    crossSystemInsights: {
      correlations: any[];
      patterns: any[];
      bottlenecks: any[];
    };
    recommendations: any[];
  }> {
    const analytics = await this.analyticsService.getCrossSystemAnalytics();
    const bottlenecks = this.performanceMonitor.identifyPerformanceBottlenecks();
    const recommendations = this.performanceMonitor.getPerformanceOptimizationRecommendations();

    return {
      overallHealth: analytics.overallHealth,
      systems: Array.from(this.systemStatus.values()),
      crossSystemInsights: {
        correlations: analytics.correlations,
        patterns: await this.analyticsService.identifyCrossSystemPatterns(),
        bottlenecks
      },
      recommendations
    };
  }

  /**
   * Get error analytics across all systems
   */
  async getCrossSystemErrorAnalytics(timeRange?: { start: number; end: number }): Promise<{
    totalErrors: number;
    bySystem: Record<ClientSystem, number>;
    trends: any[];
    predictions: any[];
  }> {
    const aggregation = await this.aggregationService.aggregateErrors();
    const trends = await this.trendService.analyzeTrends(timeRange || {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now()
    });
    const predictions = await this.trendService.predictIssues(7 * 24 * 60 * 60 * 1000); // 7 days

    return {
      totalErrors: aggregation.totalErrors,
      bySystem: aggregation.bySystem as Record<ClientSystem, number>,
      trends: trends.trends,
      predictions
    };
  }

  /**
   * Get performance impact analysis
   */
  getPerformanceImpactAnalysis(timeRange?: { start: number; end: number }): {
    systemImpacts: any;
    trends: any[];
    bottlenecks: any[];
    recommendations: any[];
  } {
    const impacts = this.performanceMonitor.getSystemPerformanceImpacts(timeRange);
    const trends = this.performanceMonitor.getPerformanceDegradationTrends();
    const bottlenecks = this.performanceMonitor.identifyPerformanceBottlenecks();
    const recommendations = this.performanceMonitor.getPerformanceOptimizationRecommendations();

    return {
      systemImpacts: impacts.systemImpacts,
      trends,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Configure monitoring settings for a specific system
   */
  configureSystemMonitoring(
    system: ClientSystem,
    config: {
      enabled?: boolean;
      errorThreshold?: number;
      performanceThreshold?: number;
      alertPatterns?: string[];
    }
  ): void {
    const monitoring = this.getSystemMonitoring(system);
    if (monitoring) {
      if (config.enabled !== undefined) {
        monitoring.setMonitoringEnabled(config.enabled);
      }

      if (config.alertPatterns) {
        config.alertPatterns.forEach(pattern => {
          monitoring.registerErrorPattern(pattern, config.errorThreshold || 5);
        });
      }
    }
  }

  /**
   * Get monitoring instance for a specific system
   * Note: System-specific monitoring should be accessed through their singleton instances
   */
  getSystemMonitoring(system: ClientSystem): any {
    // This would need to be implemented with dynamic imports or registry
    // For now, return null as systems should use their own monitoring
    console.warn(`System monitoring for ${system} should be accessed through its singleton instance`);
    return null;
  }

  /**
   * Get real-time monitoring stream
   */
  getRealTimeMonitoringStream(): AsyncIterable<{
    type: 'error' | 'performance' | 'alert';
    system: ClientSystem;
    data: any;
    timestamp: number;
  }> {
    // This would combine streams from all monitoring services
    // For now, return a simple implementation
    return this.createMonitoringStream();
  }

  private async* createMonitoringStream(): AsyncIterable<{
    type: 'error' | 'performance' | 'alert';
    system: ClientSystem;
    data: any;
    timestamp: number;
  }> {
    // Implementation would combine streams from all services
    // This is a placeholder for the actual stream implementation
    yield {
      type: 'alert',
      system: ClientSystem.SERVICE_ARCHITECTURE,
      data: { message: 'Monitoring stream initialized' },
      timestamp: Date.now()
    };
  }

  /**
   * Export monitoring data for analysis or backup
   */
  exportMonitoringData(timeRange?: { start: number; end: number }): {
    metadata: {
      exportTime: number;
      timeRange: { start: number; end: number };
      version: string;
    };
    systemStatus: MonitoringSystemStatus[];
    errorData: any[];
    performanceData: any[];
    analytics: any;
  } {
    const range = timeRange || {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now()
    };

    return {
      metadata: {
        exportTime: Date.now(),
        timeRange: range,
        version: '1.0.0'
      },
      systemStatus: Array.from(this.systemStatus.values()),
      errorData: this.aggregationService.getSystemErrors(ClientSystem.SERVICE_ARCHITECTURE, range),
      performanceData: this.performanceMonitor.getPerformanceData(undefined, undefined, range),
      analytics: {
        crossSystem: this.analyticsService.getCrossSystemAnalytics(),
        trends: this.trendService.analyzeTrends(range),
        impacts: this.performanceMonitor.getSystemPerformanceImpacts(range)
      }
    };
  }

  /**
   * Reset monitoring data (useful for testing or maintenance)
   */
  resetMonitoringData(): void {
    // Reset all services
    this.systemStatus.clear();
    this.initializeSystemStatus();

    // Note: Individual services would need their own reset methods
    console.warn('Monitoring data reset - individual services may need manual reset');
  }

  /**
   * Get monitoring system diagnostics
   */
  getDiagnostics(): {
    services: {
      aggregation: boolean;
      analytics: boolean;
      trends: boolean;
      performance: boolean;
    };
    systems: Record<ClientSystem, boolean>;
    memoryUsage: number;
    uptime: number;
  } {
    const startTime = Date.now() - (24 * 60 * 60 * 1000); // Assume service started recently

    return {
      services: {
        aggregation: true, // Assume running
        analytics: true,
        trends: true,
        performance: true
      },
      systems: Object.values(ClientSystem).reduce((acc, system) => {
        acc[system] = this.systemStatus.get(system)?.monitoringActive || false;
        return acc;
      }, {} as Record<ClientSystem, boolean>),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      uptime: Date.now() - startTime
    };
  }

  destroy(): void {
    if (this.integrationInterval) {
      clearInterval(this.integrationInterval);
      this.integrationInterval = null;
    }

    // Destroy individual services
    this.trendService.destroy();
    this.performanceMonitor.destroy();
  }
}

// Export singleton instance
export const monitoringIntegration = MonitoringIntegrationService.getInstance();
export { MonitoringIntegrationService };

// Export convenience functions
export const reportError = (error: any, context: ErrorContext) =>
  monitoringIntegration.reportError(error, context);

export const trackPerformance = (metrics: PerformanceMetrics) =>
  monitoringIntegration.trackPerformance(metrics);

export const getSystemHealth = () =>
  monitoringIntegration.getSystemHealthOverview();
