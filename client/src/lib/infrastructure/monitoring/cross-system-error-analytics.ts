/**
 * Cross-System Error Analytics Service
 * Provides analytics and insights across all client systems
 */

import { ErrorMonitor } from './error-monitor';
import {
  CrossSystemAnalytics,
  ClientSystem,
  SystemHealth,
  ErrorSeverity,
  AppError,
  ErrorDomain
} from './unified-error-monitoring-interface';

interface SystemErrorData {
  system: ClientSystem;
  errors: Array<{
    error: AppError;
    timestamp: number;
    context: Record<string, unknown>;
  }>;
  performance: Array<{
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }>;
  health: SystemHealth;
}

class CrossSystemErrorAnalytics implements CrossSystemAnalytics {
  private static instance: CrossSystemErrorAnalytics;
  private systemData: Map<ClientSystem, SystemErrorData> = new Map();
  private errorPropagationMap: Map<string, Array<{ system: ClientSystem; timestamp: number; error: string }>> = new Map();
  private analyticsInterval: NodeJS.Timeout | null = null;

  static getInstance(): CrossSystemErrorAnalytics {
    if (!CrossSystemErrorAnalytics.instance) {
      CrossSystemErrorAnalytics.instance = new CrossSystemErrorAnalytics();
    }
    return CrossSystemErrorAnalytics.instance;
  }

  constructor() {
    this.initializeSystemData();
    this.startAnalyticsCollection();
  }

  private initializeSystemData(): void {
    const systems = Object.values(ClientSystem);
    systems.forEach(system => {
      this.systemData.set(system, {
        system,
        errors: [],
        performance: [],
        health: {
          system,
          status: 'healthy',
          errorRate: 0,
          performanceScore: 100,
          lastUpdated: Date.now()
        }
      });
    });
  }

  private startAnalyticsCollection(): void {
    this.analyticsInterval = setInterval(() => {
      this.updateSystemHealth();
      this.analyzeCorrelations();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Register an error from a specific system
   */
  registerSystemError(system: ClientSystem, error: AppError, context: Record<string, unknown>): void {
    const systemData = this.systemData.get(system);
    if (!systemData) return;

    const errorEntry = {
      error,
      timestamp: Date.now(),
      context
    };

    systemData.errors.push(errorEntry);

    // Keep only last 1000 errors per system
    if (systemData.errors.length > 1000) {
      systemData.errors = systemData.errors.slice(-500);
    }

    // Track error propagation
    this.trackErrorPropagation(error.id, system, error.message);
  }

  /**
   * Register performance metrics from a system
   */
  registerPerformanceMetrics(
    system: ClientSystem,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const systemData = this.systemData.get(system);
    if (!systemData) return;

    const perfEntry = {
      operation,
      duration,
      success,
      timestamp: Date.now()
    };

    systemData.performance.push(perfEntry);

    // Keep only last 1000 performance entries per system
    if (systemData.performance.length > 1000) {
      systemData.performance = systemData.performance.slice(-500);
    }
  }

  private trackErrorPropagation(errorId: string, system: ClientSystem, errorMessage: string): void {
    const propagation = this.errorPropagationMap.get(errorId) || [];
    propagation.push({
      system,
      timestamp: Date.now(),
      error: errorMessage
    });
    this.errorPropagationMap.set(errorId, propagation);
  }

  private updateSystemHealth(): void {
    this.systemData.forEach((data, system) => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Calculate error rate (errors per hour)
      const recentErrors = data.errors.filter(e => e.timestamp > oneHourAgo);
      const errorRate = (recentErrors.length / 1) * 100; // percentage

      // Calculate performance score
      const recentPerf = data.performance.filter(p => p.timestamp > oneHourAgo);
      const avgDuration = recentPerf.length > 0
        ? recentPerf.reduce((sum, p) => sum + p.duration, 0) / recentPerf.length
        : 0;
      const successRate = recentPerf.length > 0
        ? (recentPerf.filter(p => p.success).length / recentPerf.length) * 100
        : 100;

      // Performance score based on duration and success rate
      const performanceScore = Math.max(0, Math.min(100,
        (successRate * 0.7) + ((avgDuration < 1000 ? 100 : Math.max(0, 100 - (avgDuration - 1000) / 10)) * 0.3)
      ));

      // Determine status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (errorRate > 10 || performanceScore < 70) {
        status = 'critical';
      } else if (errorRate > 5 || performanceScore < 85) {
        status = 'degraded';
      }

      data.health = {
        system,
        status,
        errorRate,
        performanceScore,
        lastUpdated: now
      };
    });
  }

  private analyzeCorrelations(): void {
    // This would analyze correlations between systems
    // For now, we'll implement basic correlation detection
    const systems = Array.from(this.systemData.keys());
    const correlations: Array<{
      systemA: ClientSystem;
      systemB: ClientSystem;
      correlation: number;
      commonErrors: string[];
    }> = [];

    for (let i = 0; i < systems.length; i++) {
      for (let j = i + 1; j < systems.length; j++) {
        const systemA = systems[i];
        const systemB = systems[j];

        const dataA = this.systemData.get(systemA)!;
        const dataB = this.systemData.get(systemB)!;

        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        const errorsA = dataA.errors.filter(e => e.timestamp > oneHourAgo);
        const errorsB = dataB.errors.filter(e => e.timestamp > oneHourAgo);

        // Find common error patterns
        const errorMessagesA = new Set(errorsA.map(e => e.error.message));
        const errorMessagesB = new Set(errorsB.map(e => e.error.message));
        const commonErrors = Array.from(errorMessagesA).filter(msg => errorMessagesB.has(msg));

        // Calculate correlation based on error timing and common errors
        const timeCorrelation = this.calculateTimeCorrelation(errorsA, errorsB);
        const errorCorrelation = commonErrors.length / Math.max(errorMessagesA.size, errorMessagesB.size);

        const correlation = (timeCorrelation + errorCorrelation) / 2;

        if (correlation > 0.3) { // Only include significant correlations
          correlations.push({
            systemA,
            systemB,
            correlation,
            commonErrors
          });
        }
      }
    }

    // Store correlations for getCrossSystemAnalytics
    this.correlations = correlations;
  }

  private correlations: Array<{
    systemA: ClientSystem;
    systemB: ClientSystem;
    correlation: number;
    commonErrors: string[];
  }> = [];

  private calculateTimeCorrelation(
    errorsA: Array<{ timestamp: number }>,
    errorsB: Array<{ timestamp: number }>
  ): number {
    if (errorsA.length === 0 || errorsB.length === 0) return 0;

    // Simple correlation based on error timing proximity
    let correlationScore = 0;
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    errorsA.forEach(errorA => {
      const nearbyErrorsB = errorsB.filter(errorB =>
        Math.abs(errorA.timestamp - errorB.timestamp) < timeWindow
      );
      correlationScore += nearbyErrorsB.length;
    });

    return Math.min(1, correlationScore / Math.max(errorsA.length, errorsB.length));
  }

  async getCrossSystemAnalytics(): Promise<{
    systems: SystemHealth[];
    correlations: Array<{
      systemA: ClientSystem;
      systemB: ClientSystem;
      correlation: number;
      commonErrors: string[];
    }>;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const systems = Array.from(this.systemData.values()).map(data => data.health);

    // Determine overall health
    const criticalCount = systems.filter(s => s.status === 'critical').length;
    const degradedCount = systems.filter(s => s.status === 'degraded').length;

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overallHealth = 'critical';
    } else if (degradedCount > 1) {
      overallHealth = 'degraded';
    }

    return {
      systems,
      correlations: this.correlations,
      overallHealth
    };
  }

  async identifyCrossSystemPatterns(): Promise<Array<{
    pattern: string;
    affectedSystems: ClientSystem[];
    severity: ErrorSeverity;
    frequency: number;
  }>> {
    const patterns: Map<string, {
      affectedSystems: Set<ClientSystem>;
      severities: ErrorSeverity[];
      count: number;
    }> = new Map();

    // Analyze errors across all systems
    this.systemData.forEach((data, system) => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      data.errors.filter(e => e.timestamp > oneDayAgo).forEach(({ error }) => {
        const pattern = this.normalizeErrorMessage(error.message);

        const existing = patterns.get(pattern) || {
          affectedSystems: new Set<ClientSystem>(),
          severities: [],
          count: 0
        };

        existing.affectedSystems.add(system);
        existing.severities.push(error.severity);
        existing.count++;

        patterns.set(pattern, existing);
      });
    });

    // Convert to result format
    return Array.from(patterns.entries())
      .filter(([, data]) => data.affectedSystems.size > 1) // Only cross-system patterns
      .map(([pattern, data]) => ({
        pattern,
        affectedSystems: Array.from(data.affectedSystems),
        severity: this.getHighestSeverity(data.severities),
        frequency: data.count
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private normalizeErrorMessage(message: string): string {
    // Normalize error messages to identify patterns
    return message
      .toLowerCase()
      .replace(/\d+/g, 'X') // Replace numbers with X
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .trim();
  }

  private getHighestSeverity(severities: ErrorSeverity[]): ErrorSeverity {
    const severityOrder = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4
    };

    return severities.reduce((highest, current) =>
      severityOrder[current] > severityOrder[highest] ? current : highest
    );
  }

  async getErrorPropagation(errorId: string): Promise<Array<{
    system: ClientSystem;
    timestamp: number;
    error: string;
  }>> {
    return this.errorPropagationMap.get(errorId) || [];
  }

  destroy(): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }
}

export { CrossSystemErrorAnalytics };
export default CrossSystemErrorAnalytics;
