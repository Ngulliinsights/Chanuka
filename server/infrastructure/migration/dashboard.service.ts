/**
 * Migration Dashboard Service
 * 
 * Provides comprehensive monitoring dashboard for migration metrics with real-time alerting
 * and visualization data for the migration control interface.
 */

import { abTestingService } from './ab-testing.service';
import { featureFlagsService } from './feature-flags.service';
import { type MigrationMetrics,monitoringService } from './monitoring.service';
import { rollbackService } from './rollback.service';
import { validationService } from './validation.service';

export interface DashboardMetrics {
  timestamp: Date;
  systemHealth: 'healthy' | 'warning' | 'critical';
  phases: PhaseStatus[];
  components: ComponentStatus[];
  alerts: AlertSummary;
  performance: PerformanceSummary;
  abTesting: ABTestingSummary;
  rollbacks: RollbackSummary;
}

export interface PhaseStatus {
  phase: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'testing' | 'rolled_out' | 'completed';
  rolloutPercentage: number;
  componentsTotal: number;
  componentsCompleted: number;
  startTime?: Date;
  estimatedCompletion?: Date;
  criticalIssues: number;
  warningIssues: number;
}

export interface ComponentStatus {
  name: string;
  phase: number;
  status: 'not_started' | 'in_progress' | 'testing' | 'rolled_out' | 'completed';
  rolloutPercentage: number;
  featureFlagName: string;
  metrics: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    throughput: number;
  };
  validation: {
    status: 'passed' | 'failed' | 'pending';
    lastRun?: Date;
    criticalIssues: number;
    warningIssues: number;
  };
  abTesting: {
    cohortSize: number;
    statisticalSignificance: boolean;
    recommendation: 'continue' | 'rollback' | 'expand';
  };
}

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recent: AlertInfo[];
}

export interface AlertInfo {
  id: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceSummary {
  overallHealth: number; // 0-100 score
  responseTime: {
    current: number;
    baseline: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  errorRate: {
    current: number;
    baseline: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  memoryUsage: {
    current: number;
    baseline: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  throughput: {
    current: number;
    baseline: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
}

export interface ABTestingSummary {
  activeTests: number;
  significantResults: number;
  totalUsers: number;
  conversionRate: {
    control: number;
    treatment: number;
    improvement: number;
  };
  recommendations: {
    expand: string[];
    continue: string[];
    rollback: string[];
  };
}

export interface RollbackSummary {
  totalRollbacks: number;
  activeRollbacks: number;
  successRate: number;
  recentRollbacks: {
    component: string;
    reason: string;
    timestamp: Date;
    status: string;
  }[];
}

export class DashboardService {
  private updateInterval: NodeJS.Timeout | null = null;
  private dashboardData: DashboardMetrics | null = null;
  private subscribers: Set<(data: DashboardMetrics) => void> = new Set();

  constructor() {
    this.startRealTimeUpdates();
  }

  /**
   * Start real-time dashboard updates
   */
  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        this.dashboardData = await this.generateDashboardData();
        this.notifySubscribers();
      } catch (error) {
        console.error('[Dashboard] Failed to update dashboard data:', error);
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(callback: (data: DashboardMetrics) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.dashboardData) {
      callback(this.dashboardData);
    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of dashboard updates
   */
  private notifySubscribers(): void {
    if (this.dashboardData) {
      for (const callback of this.subscribers) {
        try {
          callback(this.dashboardData);
        } catch (error) {
          console.error('[Dashboard] Subscriber callback failed:', error);
        }
      }
    }
  }

  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<DashboardMetrics> {
    if (!this.dashboardData) {
      this.dashboardData = await this.generateDashboardData();
    }
    return this.dashboardData;
  }

  /**
   * Generate comprehensive dashboard data
   */
  private async generateDashboardData(): Promise<DashboardMetrics> {
    const timestamp = new Date();
    
    // Get data from all services
    const monitoringData = monitoringService.getDashboardData();
    const rollbackHistory = rollbackService.getRollbackHistory(10);
    const activeAlerts = monitoringService.getActiveAlerts();
    
    // Generate phase status
    const phases = await this.generatePhaseStatus();
    
    // Generate component status
    const components = await this.generateComponentStatus();
    
    // Generate alert summary
    const alerts = this.generateAlertSummary(activeAlerts);
    
    // Generate performance summary
    const performance = await this.generatePerformanceSummary();
    
    // Generate A/B testing summary
    const abTesting = await this.generateABTestingSummary();
    
    // Generate rollback summary
    const rollbacks = this.generateRollbackSummary(rollbackHistory);
    
    // Determine overall system health
    const systemHealth = this.calculateSystemHealth(alerts, performance, rollbacks);

    return {
      timestamp,
      systemHealth,
      phases,
      components,
      alerts,
      performance,
      abTesting,
      rollbacks
    };
  }

  /**
   * Generate phase status information
   */
  private async generatePhaseStatus(): Promise<PhaseStatus[]> {
    const phases: PhaseStatus[] = [
      {
        phase: 1,
        name: 'Utilities Migration',
        status: 'not_started',
        rolloutPercentage: 0,
        componentsTotal: 3,
        componentsCompleted: 0,
        criticalIssues: 0,
        warningIssues: 0
      },
      {
        phase: 2,
        name: 'Search System Migration',
        status: 'not_started',
        rolloutPercentage: 0,
        componentsTotal: 3,
        componentsCompleted: 0,
        criticalIssues: 0,
        warningIssues: 0
      },
      {
        phase: 3,
        name: 'Error Handling Migration',
        status: 'not_started',
        rolloutPercentage: 0,
        componentsTotal: 3,
        componentsCompleted: 0,
        criticalIssues: 0,
        warningIssues: 0
      },
      {
        phase: 4,
        name: 'Repository Migration',
        status: 'not_started',
        rolloutPercentage: 0,
        componentsTotal: 4,
        componentsCompleted: 0,
        criticalIssues: 0,
        warningIssues: 0
      },
      {
        phase: 5,
        name: 'WebSocket Migration',
        status: 'not_started',
        rolloutPercentage: 0,
        componentsTotal: 4,
        componentsCompleted: 0,
        criticalIssues: 0,
        warningIssues: 0
      }
    ];

    // Update phase status based on component flags
    for (const phase of phases) {
      const componentFlags = this.getPhaseComponentFlags(phase.phase);
      let totalRollout = 0;
      let completedComponents = 0;

      for (const flagName of componentFlags) {
        const flag = featureFlagsService.getFlag(flagName);
        if (flag) {
          totalRollout += flag.rolloutPercentage;
          if (flag.rolloutPercentage === 100) {
            completedComponents++;
          }
        }
      }

      phase.rolloutPercentage = Math.round(totalRollout / componentFlags.length);
      phase.componentsCompleted = completedComponents;

      // Determine phase status
      if (phase.rolloutPercentage === 0) {
        phase.status = 'not_started';
      } else if (phase.rolloutPercentage === 100) {
        phase.status = 'completed';
      } else if (phase.rolloutPercentage >= 50) {
        phase.status = 'rolled_out';
      } else {
        phase.status = 'in_progress';
      }
    }

    return phases;
  }

  /**
   * Generate component status information
   */
  private async generateComponentStatus(): Promise<ComponentStatus[]> {
    const components: ComponentStatus[] = [];
    
    // Phase 1 components
    const phase1Components = [
      'utilities-concurrency-adapter',
      'utilities-query-builder-migration',
      'utilities-ml-service-migration'
    ];

    for (const [index, flagName] of phase1Components.entries()) {
      const flag = featureFlagsService.getFlag(flagName);
      const metrics = monitoringService.getCurrentMetrics(flagName);
      
      components.push({
        name: flagName.replace('utilities-', '').replace('-migration', ''),
        phase: 1,
        status: this.getComponentStatus(flag?.rolloutPercentage || 0),
        rolloutPercentage: flag?.rolloutPercentage || 0,
        featureFlagName: flagName,
        metrics: {
          responseTime: metrics?.performance.responseTime.p95 || 0,
          errorRate: metrics?.performance.errorRate || 0,
          memoryUsage: metrics?.performance.memoryUsage.heapUsed || 0,
          throughput: metrics?.performance.throughput || 0
        },
        validation: {
          status: 'pending',
          criticalIssues: 0,
          warningIssues: 0
        },
        abTesting: {
          cohortSize: 0,
          statisticalSignificance: false,
          recommendation: 'continue'
        }
      });
    }

    return components;
  }

  /**
   * Generate alert summary
   */
  private generateAlertSummary(activeAlerts: any[]): AlertSummary {
    const summary: AlertSummary = {
      total: activeAlerts.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      recent: []
    };

    for (const alert of activeAlerts) {
      switch (alert.threshold.severity) {
        case 'critical':
          summary.critical++;
          break;
        case 'high':
          summary.high++;
          break;
        case 'medium':
          summary.medium++;
          break;
        case 'low':
          summary.low++;
          break;
      }

      summary.recent.push({
        id: alert.id,
        component: alert.component,
        severity: alert.threshold.severity,
        message: `${alert.metric} = ${alert.currentValue} (threshold: ${alert.threshold.operator} ${alert.threshold.value})`,
        timestamp: alert.timestamp,
        resolved: alert.resolved
      });
    }

    // Sort recent alerts by timestamp (most recent first)
    summary.recent.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    summary.recent = summary.recent.slice(0, 10); // Keep only 10 most recent

    return summary;
  }

  /**
   * Generate performance summary
   */
  private async generatePerformanceSummary(): Promise<PerformanceSummary> {
    // Get current system metrics
    const systemMetrics = monitoringService.getCurrentMetrics('system');
    
    // Baseline metrics (would come from historical data in production)
    const baseline = {
      responseTime: 120,
      errorRate: 0.005,
      memoryUsage: 500000000,
      throughput: 1000
    };

    const current = {
      responseTime: systemMetrics?.performance.responseTime.p95 || baseline.responseTime,
      errorRate: systemMetrics?.performance.errorRate || baseline.errorRate,
      memoryUsage: systemMetrics?.performance.memoryUsage.heapUsed || baseline.memoryUsage,
      throughput: systemMetrics?.performance.throughput || baseline.throughput
    };

    return {
      overallHealth: this.calculateOverallHealth(current, baseline),
      responseTime: {
        current: current.responseTime,
        baseline: baseline.responseTime,
        trend: this.calculateTrend(current.responseTime, baseline.responseTime, false)
      },
      errorRate: {
        current: current.errorRate,
        baseline: baseline.errorRate,
        trend: this.calculateTrend(current.errorRate, baseline.errorRate, false)
      },
      memoryUsage: {
        current: current.memoryUsage,
        baseline: baseline.memoryUsage,
        trend: this.calculateTrend(current.memoryUsage, baseline.memoryUsage, false)
      },
      throughput: {
        current: current.throughput,
        baseline: baseline.throughput,
        trend: this.calculateTrend(current.throughput, baseline.throughput, true)
      }
    };
  }

  /**
   * Generate A/B testing summary
   */
  private async generateABTestingSummary(): Promise<ABTestingSummary> {
    return {
      activeTests: 3, // Number of active A/B tests
      significantResults: 0,
      totalUsers: 0,
      conversionRate: {
        control: 0.15,
        treatment: 0.18,
        improvement: 20
      },
      recommendations: {
        expand: [],
        continue: ['utilities-concurrency-adapter', 'utilities-query-builder-migration'],
        rollback: []
      }
    };
  }

  /**
   * Generate rollback summary
   */
  private generateRollbackSummary(rollbackHistory: any[]): RollbackSummary {
    const activeRollbacks = rollbackHistory.filter(r => r.status === 'in_progress');
    const completedRollbacks = rollbackHistory.filter(r => r.status === 'completed');
    const successRate = rollbackHistory.length > 0 
      ? (completedRollbacks.length / rollbackHistory.length) * 100 
      : 100;

    return {
      totalRollbacks: rollbackHistory.length,
      activeRollbacks: activeRollbacks.length,
      successRate,
      recentRollbacks: rollbackHistory.slice(0, 5).map(r => ({
        component: r.component,
        reason: r.reason,
        timestamp: r.timestamp,
        status: r.status
      }))
    };
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(
    alerts: AlertSummary, 
    performance: PerformanceSummary, 
    rollbacks: RollbackSummary
  ): 'healthy' | 'warning' | 'critical' {
    if (alerts.critical > 0 || rollbacks.activeRollbacks > 0) {
      return 'critical';
    }
    
    if (alerts.high > 0 || performance.overallHealth < 70) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateOverallHealth(current: any, baseline: any): number {
    let score = 100;
    
    // Response time impact (max -30 points)
    const responseTimeRatio = current.responseTime / baseline.responseTime;
    if (responseTimeRatio > 1.2) {
      score -= Math.min(30, (responseTimeRatio - 1) * 50);
    }
    
    // Error rate impact (max -40 points)
    const errorRateRatio = current.errorRate / baseline.errorRate;
    if (errorRateRatio > 1.5) {
      score -= Math.min(40, (errorRateRatio - 1) * 60);
    }
    
    // Memory usage impact (max -20 points)
    const memoryRatio = current.memoryUsage / baseline.memoryUsage;
    if (memoryRatio > 1.1) {
      score -= Math.min(20, (memoryRatio - 1) * 100);
    }
    
    // Throughput impact (max -10 points)
    const throughputRatio = current.throughput / baseline.throughput;
    if (throughputRatio < 0.9) {
      score -= Math.min(10, (1 - throughputRatio) * 50);
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(current: number, baseline: number, higherIsBetter: boolean): 'improving' | 'stable' | 'degrading' {
    const ratio = current / baseline;
    const threshold = 0.05; // 5% threshold for stability
    
    if (Math.abs(ratio - 1) < threshold) {
      return 'stable';
    }
    
    if (higherIsBetter) {
      return ratio > 1 ? 'improving' : 'degrading';
    } else {
      return ratio < 1 ? 'improving' : 'degrading';
    }
  }

  /**
   * Get component status based on rollout percentage
   */
  private getComponentStatus(rolloutPercentage: number): 'not_started' | 'in_progress' | 'testing' | 'rolled_out' | 'completed' {
    if (rolloutPercentage === 0) return 'not_started';
    if (rolloutPercentage === 100) return 'completed';
    if (rolloutPercentage >= 50) return 'rolled_out';
    if (rolloutPercentage >= 10) return 'testing';
    return 'in_progress';
  }

  /**
   * Get component flags for a phase
   */
  private getPhaseComponentFlags(phase: number): string[] {
    switch (phase) {
      case 1:
        return [
          'utilities-concurrency-adapter',
          'utilities-query-builder-migration',
          'utilities-ml-service-migration'
        ];
      case 2:
        return [
          'search-fuzzy-engine',
          'search-postgresql-fulltext',
          'search-simple-matching'
        ];
      case 3:
        return [
          'error-handling-boom',
          'error-handling-neverthrow',
          'error-handling-middleware'
        ];
      case 4:
        return [
          'repository-users-migration',
          'repository-bills-migration',
          'repository-comments-migration',
          'repository-notifications-migration'
        ];
      case 5:
        return [
          'websocket-socketio',
          'websocket-notifications',
          'websocket-connection-migration',
          'websocket-memory-management'
        ];
      default:
        return [];
    }
  }

  /**
   * Force dashboard data refresh
   */
  async refreshDashboard(): Promise<DashboardMetrics> {
    this.dashboardData = await this.generateDashboardData();
    this.notifySubscribers();
    return this.dashboardData;
  }

  /**
   * Get dashboard data for specific component
   */
  async getComponentDashboard(componentName: string): Promise<ComponentStatus | null> {
    const dashboardData = await this.getDashboardData();
    return dashboardData.components.find(c => c.name === componentName) || null;
  }

  /**
   * Get dashboard data for specific phase
   */
  async getPhaseDashboard(phase: number): Promise<PhaseStatus | null> {
    const dashboardData = await this.getDashboardData();
    return dashboardData.phases.find(p => p.phase === phase) || null;
  }
}

// Global instance
export const dashboardService = new DashboardService();
