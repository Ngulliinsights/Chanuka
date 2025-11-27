import { DeploymentStatus, DeploymentOrchestrator } from './deployment-orchestrator.js';
import { ValidationResult, StatisticalAnalysisResult, CrossPhaseValidationResult } from './repository-deployment-validator.js';
import { logger } from '@/shared/core';
import {
  AsyncServiceResult,
  withResultHandling
} from '@shared/errors/result-adapter.js';

export interface DashboardMetrics {
  deployment: {
    currentPhase: string;
    rolloutPercentage: number;
    status: string;
    startTime: Date;
    estimatedCompletion?: Date;
    elapsedTime: number;
    remainingTime?: number;
  };
  performance: {
    responseTimeImprovement: number;
    throughputImprovement: number;
    memoryImprovement: number;
    overallImprovement: number;
    errorRate: number;
  };
  codeQuality: {
    complexityReduction: number;
    legacyComplexity: number;
    migratedComplexity: number;
  };
  userExperience: {
    conversionRate: number;
    taskCompletionRate: number;
    userSatisfactionScore: number;
    averageSessionDuration: number;
  };
  dataIntegrity: {
    totalInconsistencies: number;
    inconsistencyTypes: Array<{ type: string; count: number }>;
    validationStatus: 'passed' | 'failed' | 'warning';
  };
  statisticalAnalysis: {
    pValue: number;
    confidenceInterval: { lower: number; upper: number };
    effectSize: number;
    recommendation: 'proceed' | 'rollback' | 'extend_test';
    significanceLevel: number;
  };
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}

export interface DashboardConfig {
  refreshInterval: number; // in seconds
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    userSatisfactionScore: number;
    performanceImprovement: number;
  };
  retentionPeriod: number; // in hours
}

export interface HistoricalDataPoint {
  timestamp: Date;
  metrics: Partial<DashboardMetrics>;
}

/**
 * Deployment Monitoring Dashboard
 * 
 * Provides real-time monitoring and visualization of repository migration deployment:
 * - Real-time metrics collection and aggregation
 * - Alert generation and management
 * - Historical data tracking
 * - Performance trend analysis
 * - Automated reporting
 */
export class DeploymentMonitoringDashboard {
  private config: DashboardConfig;
  private orchestrator: DeploymentOrchestrator;
  private historicalData: HistoricalDataPoint[] = [];
  private alerts: DashboardMetrics['alerts'] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private alertCallbacks: Array<(alert: DashboardMetrics['alerts'][0]) => void> = [];

  constructor(orchestrator: DeploymentOrchestrator, config?: Partial<DashboardConfig>) {
    this.orchestrator = orchestrator;
    this.config = {
      refreshInterval: 30, // 30 seconds
      alertThresholds: {
        errorRate: 0.01, // 1%
        responseTime: 500, // 500ms
        userSatisfactionScore: 3.5,
        performanceImprovement: 10 // 10% minimum
      },
      retentionPeriod: 24, // 24 hours
      ...config
    };
  }

  /**
   * Start monitoring the deployment
   */
  async startMonitoring(): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      logger.info('Starting deployment monitoring dashboard', {
        component: 'DeploymentMonitoringDashboard',
        config: this.config
      });

      // Start periodic data collection
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.collectMetrics();
          await this.checkAlerts();
          this.cleanupHistoricalData();
        } catch (error) {
          logger.error('Error during monitoring cycle', { component: 'DeploymentMonitoringDashboard' }, error as any);
        }
      }, this.config.refreshInterval * 1000);

      // Initial metrics collection
      await this.collectMetrics();
    }, { service: 'DeploymentMonitoringDashboard', operation: 'startMonitoring' });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Stopped deployment monitoring dashboard', {
      component: 'DeploymentMonitoringDashboard'
    });
  }

  /**
   * Get current dashboard metrics
   */
  async getCurrentMetrics(): AsyncServiceResult<DashboardMetrics> {
    return withResultHandling(async () => {
      const deploymentStatus = this.orchestrator.getDeploymentStatus();
      
      return this.buildDashboardMetrics(deploymentStatus);
    }, { service: 'DeploymentMonitoringDashboard', operation: 'getCurrentMetrics' });
  }

  /**
   * Get historical metrics for trend analysis
   */
  getHistoricalMetrics(hours: number = 1): HistoricalDataPoint[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.historicalData.filter(point => point.timestamp >= cutoffTime);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): DashboardMetrics['alerts'] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('Alert resolved', {
        component: 'DeploymentMonitoringDashboard',
        alertId,
        message: alert.message
      });
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: DashboardMetrics['alerts'][0]) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport(): AsyncServiceResult<{
    summary: string;
    metrics: DashboardMetrics;
    trends: {
      performanceTrend: 'improving' | 'stable' | 'degrading';
      userExperienceTrend: 'improving' | 'stable' | 'degrading';
      errorRateTrend: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  }> {
    return withResultHandling(async () => {
      const currentMetrics = await this.getCurrentMetrics();
      const trends = this.analyzeTrends();
      const recommendations = this.generateRecommendations(currentMetrics.data, trends);

      const summary = this.generateSummary(currentMetrics.data, trends);

      return {
        summary,
        metrics: currentMetrics.data,
        trends,
        recommendations
      };
    }, { service: 'DeploymentMonitoringDashboard', operation: 'generateDeploymentReport' });
  }

  // Private methods

  private async collectMetrics(): Promise<void> {
    try {
      const deploymentStatus = this.orchestrator.getDeploymentStatus();
      const metrics = this.buildDashboardMetrics(deploymentStatus);

      // Store historical data
      this.historicalData.push({
        timestamp: new Date(),
        metrics
      });

      logger.debug('Collected deployment metrics', {
        component: 'DeploymentMonitoringDashboard',
        metricsCount: this.historicalData.length
      });
    } catch (error) {
      logger.error('Error collecting metrics', { component: 'DeploymentMonitoringDashboard' }, error as any);
    }
  }

  private buildDashboardMetrics(deploymentStatus: DeploymentStatus): DashboardMetrics {
    const now = new Date();
    const elapsedTime = now.getTime() - deploymentStatus.startTime.getTime();
    const remainingTime = deploymentStatus.estimatedCompletion 
      ? deploymentStatus.estimatedCompletion.getTime() - now.getTime()
      : undefined;

    // Extract performance metrics from validation results
    const performanceResult = deploymentStatus.validationResults.find(r => r.validator === 'PerformanceImprovement');
    const complexityResult = deploymentStatus.validationResults.find(r => r.validator === 'CodeComplexityReduction');
    const userExperienceResult = deploymentStatus.validationResults.find(r => r.validator === 'UserExperience');
    const dataConsistencyResult = deploymentStatus.validationResults.find(r => r.validator === 'DataConsistency');

    return {
      deployment: {
        currentPhase: `Phase ${deploymentStatus.currentPhase + 1}`,
        rolloutPercentage: deploymentStatus.rolloutPercentage,
        status: deploymentStatus.status,
        startTime: deploymentStatus.startTime,
        estimatedCompletion: deploymentStatus.estimatedCompletion,
        elapsedTime: Math.floor(elapsedTime / 1000), // in seconds
        remainingTime: remainingTime ? Math.floor(remainingTime / 1000) : undefined
      },
      performance: {
        responseTimeImprovement: performanceResult?.metrics?.responseTimeImprovement || 0,
        throughputImprovement: performanceResult?.metrics?.throughputImprovement || 0,
        memoryImprovement: performanceResult?.metrics?.memoryImprovement || 0,
        overallImprovement: performanceResult?.metrics?.overallImprovement || 0,
        errorRate: deploymentStatus.metrics.errorRate
      },
      codeQuality: {
        complexityReduction: complexityResult?.metrics?.complexityReduction || 0,
        legacyComplexity: complexityResult?.metrics?.legacyComplexity || 0,
        migratedComplexity: complexityResult?.metrics?.migratedComplexity || 0
      },
      userExperience: {
        conversionRate: userExperienceResult?.metrics?.conversionRate || 0,
        taskCompletionRate: userExperienceResult?.metrics?.taskCompletionRate || 0,
        userSatisfactionScore: userExperienceResult?.metrics?.userSatisfactionScore || 0,
        averageSessionDuration: userExperienceResult?.metrics?.averageSessionDuration || 0
      },
      dataIntegrity: {
        totalInconsistencies: dataConsistencyResult?.inconsistencies?.length || 0,
        inconsistencyTypes: this.aggregateInconsistencyTypes(dataConsistencyResult?.inconsistencies || []),
        validationStatus: dataConsistencyResult?.passed ? 'passed' : 'failed'
      },
      statisticalAnalysis: {
        pValue: deploymentStatus.statisticalAnalysis?.pValue || 1,
        confidenceInterval: deploymentStatus.statisticalAnalysis?.confidenceInterval || { lower: 0, upper: 0 },
        effectSize: deploymentStatus.statisticalAnalysis?.effectSize || 0,
        recommendation: deploymentStatus.statisticalAnalysis?.recommendation || 'extend_test',
        significanceLevel: deploymentStatus.statisticalAnalysis?.significanceLevel || 0.05
      },
      alerts: [...this.alerts]
    };
  }

  private aggregateInconsistencyTypes(inconsistencies: any[]): Array<{ type: string; count: number }> {
    const typeMap = new Map<string, number>();
    
    inconsistencies.forEach(inc => {
      const type = inc.type || 'unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + (inc.count || 1));
    });

    return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
  }

  private async checkAlerts(): Promise<void> {
    const deploymentStatus = this.orchestrator.getDeploymentStatus();
    const currentMetrics = this.buildDashboardMetrics(deploymentStatus);

    // Check error rate threshold
    if (currentMetrics.performance.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('error', `Error rate ${(currentMetrics.performance.errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`);
    }

    // Check user satisfaction threshold
    if (currentMetrics.userExperience.userSatisfactionScore < this.config.alertThresholds.userSatisfactionScore) {
      this.createAlert('warning', `User satisfaction score ${currentMetrics.userExperience.userSatisfactionScore.toFixed(2)} below threshold ${this.config.alertThresholds.userSatisfactionScore}`);
    }

    // Check performance improvement threshold
    if (currentMetrics.performance.overallImprovement < this.config.alertThresholds.performanceImprovement) {
      this.createAlert('warning', `Performance improvement ${currentMetrics.performance.overallImprovement.toFixed(2)}% below threshold ${this.config.alertThresholds.performanceImprovement}%`);
    }

    // Check data integrity
    if (currentMetrics.dataIntegrity.totalInconsistencies > 0) {
      this.createAlert('error', `${currentMetrics.dataIntegrity.totalInconsistencies} data inconsistencies detected`);
    }

    // Check statistical significance
    if (currentMetrics.statisticalAnalysis.recommendation === 'rollback') {
      this.createAlert('critical', 'Statistical analysis recommends rollback');
    }
  }

  private createAlert(severity: DashboardMetrics['alerts'][0]['severity'], message: string): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a => 
      !a.resolved && 
      a.message === message && 
      a.severity === severity
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: DashboardMetrics['alerts'][0] = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    logger.warn('Alert created', {
      component: 'DeploymentMonitoringDashboard',
      alert
    });

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in alert callback', { component: 'DeploymentMonitoringDashboard' }, error as any);
      }
    });
  }

  private cleanupHistoricalData(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod * 60 * 60 * 1000);
    const initialLength = this.historicalData.length;
    
    this.historicalData = this.historicalData.filter(point => point.timestamp >= cutoffTime);
    
    if (this.historicalData.length < initialLength) {
      logger.debug('Cleaned up historical data', {
        component: 'DeploymentMonitoringDashboard',
        removed: initialLength - this.historicalData.length,
        remaining: this.historicalData.length
      });
    }
  }

  private analyzeTrends(): {
    performanceTrend: 'improving' | 'stable' | 'degrading';
    userExperienceTrend: 'improving' | 'stable' | 'degrading';
    errorRateTrend: 'improving' | 'stable' | 'degrading';
  } {
    const recentData = this.getHistoricalMetrics(1); // Last hour
    
    if (recentData.length < 2) {
      return {
        performanceTrend: 'stable',
        userExperienceTrend: 'stable',
        errorRateTrend: 'stable'
      };
    }

    const first = recentData[0];
    const last = recentData[recentData.length - 1];

    const performanceTrend = this.calculateTrend(
      first.metrics.performance?.overallImprovement || 0,
      last.metrics.performance?.overallImprovement || 0
    );

    const userExperienceTrend = this.calculateTrend(
      first.metrics.userExperience?.userSatisfactionScore || 0,
      last.metrics.userExperience?.userSatisfactionScore || 0
    );

    const errorRateTrend = this.calculateTrend(
      last.metrics.performance?.errorRate || 0, // Inverted for error rate
      first.metrics.performance?.errorRate || 0
    );

    return {
      performanceTrend,
      userExperienceTrend,
      errorRateTrend
    };
  }

  private calculateTrend(initial: number, final: number): 'improving' | 'stable' | 'degrading' {
    const change = ((final - initial) / initial) * 100;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'degrading';
    return 'stable';
  }

  private generateRecommendations(
    metrics: DashboardMetrics,
    trends: ReturnType<DeploymentMonitoringDashboard['analyzeTrends']>
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.performance.overallImprovement < 15) {
      recommendations.push('Performance improvement below target (15%). Consider optimizing database queries or caching strategies.');
    }

    if (trends.performanceTrend === 'degrading') {
      recommendations.push('Performance trend is degrading. Monitor system resources and consider scaling infrastructure.');
    }

    // User experience recommendations
    if (metrics.userExperience.userSatisfactionScore < 4.0) {
      recommendations.push('User satisfaction below target (4.0). Review user feedback and consider UX improvements.');
    }

    if (trends.userExperienceTrend === 'degrading') {
      recommendations.push('User experience trend is degrading. Investigate user journey bottlenecks.');
    }

    // Error rate recommendations
    if (metrics.performance.errorRate > 0.005) {
      recommendations.push('Error rate above threshold (0.5%). Review error logs and implement additional error handling.');
    }

    // Data integrity recommendations
    if (metrics.dataIntegrity.totalInconsistencies > 0) {
      recommendations.push('Data inconsistencies detected. Run data validation and consider rollback if issues persist.');
    }

    // Statistical analysis recommendations
    if (metrics.statisticalAnalysis.recommendation === 'extend_test') {
      recommendations.push('Statistical analysis suggests extending A/B test for more conclusive results.');
    }

    if (metrics.statisticalAnalysis.recommendation === 'rollback') {
      recommendations.push('Statistical analysis recommends rollback due to negative performance impact.');
    }

    // Code quality recommendations
    if (metrics.codeQuality.complexityReduction < 40) {
      recommendations.push('Code complexity reduction below target (40%). Review migration implementation for optimization opportunities.');
    }

    return recommendations;
  }

  private generateSummary(
    metrics: DashboardMetrics,
    trends: ReturnType<DeploymentMonitoringDashboard['analyzeTrends']>
  ): string {
    const status = metrics.deployment.status;
    const phase = metrics.deployment.currentPhase;
    const rollout = metrics.deployment.rolloutPercentage;
    const performance = metrics.performance.overallImprovement.toFixed(1);
    const complexity = metrics.codeQuality.complexityReduction.toFixed(1);
    const satisfaction = metrics.userExperience.userSatisfactionScore.toFixed(1);

    return `Repository migration deployment is currently in ${status} status at ${phase} with ${rollout}% rollout. ` +
           `Performance has improved by ${performance}% and code complexity reduced by ${complexity}%. ` +
           `User satisfaction score is ${satisfaction}/5.0. ` +
           `Trends: Performance ${trends.performanceTrend}, User Experience ${trends.userExperienceTrend}, Error Rate ${trends.errorRateTrend}.`;
  }
}

// Factory function
export function createDeploymentMonitoringDashboard(
  orchestrator: DeploymentOrchestrator,
  config?: Partial<DashboardConfig>
): DeploymentMonitoringDashboard {
  return new DeploymentMonitoringDashboard(orchestrator, config);
}
