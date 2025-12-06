/**
 * Unified Database Health Monitor
 * 
 * Consolidates health monitoring from:
 * - shared/database/monitoring.ts
 * - server/infrastructure/database/monitoring.ts
 * - scripts/database/health-check.ts
 */

import { logger } from '../../core/src/observability/logging';

import { UnifiedConnectionManager } from './connection-manager.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  latencyMs?: number;
  error?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HealthMetrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageLatency: number;
  uptime: number;
  lastCheck: Date;
  checksByStatus: {
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  checksByComponent: Record<string, number>;
}

export interface AlertRule {
  name: string;
  condition: (metrics: HealthMetrics, result: HealthCheckResult) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldownMs: number;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface HealthMonitorConfig {
  checkInterval: number;
  alertRules: AlertRule[];
  retentionPeriod: number;
  enableMetrics: boolean;
  enableAlerting: boolean;
  thresholds: {
    latencyWarning: number;
    latencyCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
    uptimeWarning: number;
  };
}

// ============================================================================
// UNIFIED HEALTH MONITOR
// ============================================================================

export class UnifiedHealthMonitor {
  private connectionManager: UnifiedConnectionManager;
  private config: HealthMonitorConfig;
  private metrics!: HealthMetrics;
  private alerts: Alert[] = [];
  private checkHistory: HealthCheckResult[] = [];
  private monitorTimer?: NodeJS.Timeout;
  private startTime: Date;
  private _isRunning = false;

  constructor(
    connectionManager: UnifiedConnectionManager,
    config: Partial<HealthMonitorConfig> = {}
  ) {
    this.connectionManager = connectionManager;
    this.startTime = new Date();
    
    this.config = {
      checkInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableMetrics: true,
      enableAlerting: true,
      alertRules: [],
      thresholds: {
        latencyWarning: 1000, // 1 second
        latencyCritical: 5000, // 5 seconds
        errorRateWarning: 0.05, // 5%
        errorRateCritical: 0.1, // 10%
        uptimeWarning: 0.99, // 99%
      },
      ...config
    };

    this.initializeMetrics();
    this.setupDefaultAlertRules();
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageLatency: 0,
      uptime: 0,
      lastCheck: new Date(),
      checksByStatus: {
        healthy: 0,
        unhealthy: 0,
        degraded: 0,
        unknown: 0,
      },
      checksByComponent: {},
    };
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        name: 'high_latency',
        condition: (_metrics, result) =>
          result.latencyMs !== undefined && result.latencyMs > this.config.thresholds.latencyCritical,
        severity: 'critical',
        message: 'Database latency is critically high',
        cooldownMs: 5 * 60 * 1000, // 5 minutes
      },
      {
        name: 'connection_failure',
        condition: (_metrics, result) => result.status === 'unhealthy',
        severity: 'high',
        message: 'Database connection failed',
        cooldownMs: 2 * 60 * 1000, // 2 minutes
      },
      {
        name: 'high_error_rate',
        condition: (metrics) => {
          const errorRate = metrics.totalChecks > 0 ? metrics.failedChecks / metrics.totalChecks : 0;
          return errorRate > this.config.thresholds.errorRateCritical;
        },
        severity: 'high',
        message: 'Database error rate is critically high',
        cooldownMs: 10 * 60 * 1000, // 10 minutes
      },
      {
        name: 'degraded_performance',
        condition: (_metrics, result) =>
          result.latencyMs !== undefined &&
          result.latencyMs > this.config.thresholds.latencyWarning &&
          result.latencyMs <= this.config.thresholds.latencyCritical,
        severity: 'medium',
        message: 'Database performance is degraded',
        cooldownMs: 15 * 60 * 1000, // 15 minutes
      }
    ];

    this.config.alertRules = [...defaultRules, ...this.config.alertRules];
  }

  /**
   * Start the health monitoring process.
   */
  public start(): void {
    if (this._isRunning) {
      logger.warn('Health monitor is already running');
      return;
    }

    this._isRunning = true;
    
    // Perform initial health check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', { error });
    });

    // Schedule regular health checks
    if (this.config.checkInterval > 0) {
      this.monitorTimer = setInterval(() => {
        this.performHealthCheck().catch(error => {
          logger.error('Scheduled health check failed', { error });
        });
      }, this.config.checkInterval);
    }

    logger.info('Database health monitor started', {
      component: 'HealthMonitor',
      checkInterval: this.config.checkInterval,
      alertRules: this.config.alertRules.length
    });
  }

  /**
   * Stop the health monitoring process.
   */
  public stop(): void {
    if (!this._isRunning) {
      return;
    }

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }

    this._isRunning = false;

    logger.info('Database health monitor stopped', {
      component: 'HealthMonitor'
    });
  }

  /**
   * Perform a comprehensive health check.
   */
  public async performHealthCheck(): Promise<HealthCheckResult[]> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    try {
      // Check overall database health
      const overallHealth = await this.connectionManager.checkDatabaseHealth();
      const overallLatency = Date.now() - startTime;

      const overallResult: HealthCheckResult = {
        name: 'overall',
        status: overallHealth.overall ? 'healthy' : 'unhealthy',
        latencyMs: overallLatency,
        timestamp: new Date().toISOString(),
        metadata: {
          operational: overallHealth.operational,
          analytics: overallHealth.analytics,
          security: overallHealth.security
        }
      };

      results.push(overallResult);

      // Check individual database components
      const componentChecks = [
        { name: 'operational', healthy: overallHealth.operational },
        { name: 'analytics', healthy: overallHealth.analytics },
        { name: 'security', healthy: overallHealth.security }
      ];

      for (const check of componentChecks) {
        const componentResult: HealthCheckResult = {
          name: check.name,
          status: check.healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        };

        results.push(componentResult);
      }

      // Check connection pool metrics
      const poolStatus = this.connectionManager.getPoolStatus();
      const poolResult: HealthCheckResult = {
        name: 'connection_pool',
        status: this.evaluatePoolHealth(poolStatus),
        timestamp: new Date().toISOString(),
        metadata: poolStatus
      };

      results.push(poolResult);

      // Update metrics and check for alerts
      if (this.config.enableMetrics) {
        this.updateMetrics(results);
      }

      if (this.config.enableAlerting) {
        this.checkAlerts(results);
      }

      // Store results in history
      this.addToHistory(results);

      logger.debug('Health check completed', {
        component: 'HealthMonitor',
        results: results.length,
        overallStatus: overallResult.status,
        latency: overallLatency
      });

      return results;

    } catch (error) {
      const errorResult: HealthCheckResult = {
        name: 'overall',
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };

      results.push(errorResult);

      logger.error('Health check failed', {
        component: 'HealthMonitor',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return results;
    }
  }

  private evaluatePoolHealth(poolStatus: ReturnType<UnifiedConnectionManager['getPoolStatus']>): 'healthy' | 'degraded' | 'unhealthy' {
    const { metrics } = poolStatus;
    
    // Check if we have too many waiting clients
    if (metrics.waitingClients > metrics.totalConnections * 0.5) {
      return 'unhealthy';
    }
    
    // Check if connection utilization is very high
    if (metrics.activeConnections > metrics.totalConnections * 0.9) {
      return 'degraded';
    }
    
    // Check error rate
    const errorRate = metrics.totalQueries > 0 ? metrics.errorCount / metrics.totalQueries : 0;
    if (errorRate > this.config.thresholds.errorRateCritical) {
      return 'unhealthy';
    }
    
    if (errorRate > this.config.thresholds.errorRateWarning) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private updateMetrics(results: HealthCheckResult[]): void {
    this.metrics.totalChecks++;
    this.metrics.lastCheck = new Date();
    this.metrics.uptime = Date.now() - this.startTime.getTime();

    // Update status counts
    for (const result of results) {
      this.metrics.checksByStatus[result.status]++;
      this.metrics.checksByComponent[result.name] = 
        (this.metrics.checksByComponent[result.name] || 0) + 1;

      if (result.status === 'healthy') {
        this.metrics.successfulChecks++;
      } else {
        this.metrics.failedChecks++;
      }

      // Update average latency
      if (result.latencyMs !== undefined) {
        const totalLatency = this.metrics.averageLatency * (this.metrics.totalChecks - 1);
        this.metrics.averageLatency = (totalLatency + result.latencyMs) / this.metrics.totalChecks;
      }
    }
  }

  private checkAlerts(results: HealthCheckResult[]): void {
    const now = new Date();

    for (const rule of this.config.alertRules) {
      // Check cooldown period
      if (rule.lastTriggered && 
          (now.getTime() - rule.lastTriggered.getTime()) < rule.cooldownMs) {
        continue;
      }

      // Check if rule condition is met
      for (const result of results) {
        if (rule.condition(this.metrics, result)) {
          this.triggerAlert(rule, result);
          rule.lastTriggered = now;
          break;
        }
      }
    }
  }

  private triggerAlert(rule: AlertRule, result: HealthCheckResult): void {
    const alert: Alert = {
      id: `${rule.name}_${Date.now()}`,
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      resolved: false,
      metadata: {
        component: result.name,
        status: result.status,
        latency: result.latencyMs,
        error: result.error
      }
    };

    this.alerts.push(alert);

    logger.warn('Database health alert triggered', {
      component: 'HealthMonitor',
      alert: {
        id: alert.id,
        rule: alert.rule,
        severity: alert.severity,
        message: alert.message
      }
    });

    // Emit alert event for external handling
    this.emitAlert(alert);
  }

  private emitAlert(alert: Alert): void {
    // This could be extended to integrate with external alerting systems
    // For now, we just log the alert
    const logLevel = alert.severity === 'critical' ? 'error' : 
                    alert.severity === 'high' ? 'warn' : 'info';
    
    logger[logLevel](`Database Alert: ${alert.message}`, {
      component: 'HealthMonitor',
      alertId: alert.id,
      severity: alert.severity,
      metadata: alert.metadata
    });
  }

  private addToHistory(results: HealthCheckResult[]): void {
    this.checkHistory.push(...results);

    // Clean up old history based on retention period
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    this.checkHistory = this.checkHistory.filter(result => 
      new Date(result.timestamp).getTime() > cutoffTime
    );

    // Also clean up old alerts
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current health metrics.
   */
  public getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent health check results.
   */
  public getRecentResults(limit = 10): HealthCheckResult[] {
    return this.checkHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get active alerts.
   */
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved ones).
   */
  public getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert by ID.
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Database alert resolved', {
        component: 'HealthMonitor',
        alertId,
        resolvedAt: alert.resolvedAt
      });
      
      return true;
    }
    return false;
  }

  /**
   * Add a custom alert rule.
   */
  public addAlertRule(rule: AlertRule): void {
    this.config.alertRules.push(rule);
    
    logger.info('Custom alert rule added', {
      component: 'HealthMonitor',
      ruleName: rule.name,
      severity: rule.severity
    });
  }

  /**
   * Remove an alert rule by name.
   */
  public removeAlertRule(ruleName: string): boolean {
    const initialLength = this.config.alertRules.length;
    this.config.alertRules = this.config.alertRules.filter(rule => rule.name !== ruleName);
    
    const removed = this.config.alertRules.length < initialLength;
    if (removed) {
      logger.info('Alert rule removed', {
        component: 'HealthMonitor',
        ruleName
      });
    }
    
    return removed;
  }

  /**
   * Get health summary for external monitoring systems.
   */
  public getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastCheck: Date;
    activeAlerts: number;
    metrics: HealthMetrics;
  } {
    const recentResults = this.getRecentResults(5);
    const activeAlerts = this.getActiveAlerts();
    
    // Determine overall status based on recent results and active alerts
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      status = 'unhealthy';
    } else if (activeAlerts.some(alert => alert.severity === 'high')) {
      status = 'unhealthy';
    } else if (activeAlerts.length > 0 || 
               recentResults.some(result => result.status === 'degraded')) {
      status = 'degraded';
    } else if (recentResults.some(result => result.status === 'unhealthy')) {
      status = 'unhealthy';
    }

    return {
      status,
      uptime: this.metrics.uptime,
      lastCheck: this.metrics.lastCheck,
      activeAlerts: activeAlerts.length,
      metrics: this.getMetrics()
    };
  }

  /**
   * Check if the monitor is currently running.
   */
  public isRunning(): boolean {
    return this._isRunning;
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let healthMonitor: UnifiedHealthMonitor | null = null;

/**
 * Create and start the unified health monitor.
 */
export function createHealthMonitor(
  connectionManager: UnifiedConnectionManager,
  config?: Partial<HealthMonitorConfig>
): UnifiedHealthMonitor {
  if (healthMonitor) {
    throw new Error('Health monitor already exists. Use getHealthMonitor() to access it.');
  }
  
  healthMonitor = new UnifiedHealthMonitor(connectionManager, config);
  return healthMonitor;
}

/**
 * Get the existing health monitor instance.
 */
export function getHealthMonitor(): UnifiedHealthMonitor {
  if (!healthMonitor) {
    throw new Error('Health monitor not initialized. Call createHealthMonitor() first.');
  }
  
  return healthMonitor;
}

/**
 * Stop and cleanup the health monitor.
 */
export function stopHealthMonitor(): void {
  if (healthMonitor) {
    healthMonitor.stop();
    healthMonitor = null;
  }
}


