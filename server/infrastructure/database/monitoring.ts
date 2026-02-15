import { logger } from '@server/infrastructure/core/src/observability/logging';

import { monitorPoolHealth } from './pool';

// Performance monitoring is optional and loaded dynamically
const getPerformanceMonitoring = async (): Promise<any> => {
  // Note: Performance monitoring service is not available in shared context
  // This would be injected from the server layer when needed
  logger.debug('Performance monitoring not available in shared context');
  return null;
};

/**
 * Represents the health status of a database pool with detailed metrics
 */
interface PoolHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastError?: string;
  errorCount?: number;
  poolName?: string;
}

/**
 * Configuration options for the monitoring service
 */
interface MonitoringConfig {
  intervalMs: number;
  enableAutoRecovery: boolean;
  connectionContentionThreshold: number;
  maxConsecutiveFailures: number;
  alertOnHealthChange: boolean;
  enableDetailedLogging: boolean;
}

/**
 * Tracks critical issues found during health checks
 */
interface CriticalIssue {
  pool: string;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  status: PoolHealthStatus;
  timestamp: Date;
}

/**
 * Metrics collected by the monitoring service for observability
 */
interface MonitoringMetrics {
  totalHealthChecks: number;
  failedHealthChecks: number;
  issuesDetected: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  lastCheckTimestamp: Date | null;
  uptime: number;
  averageCheckDuration: number;
}

/**
 * Severity levels ordered by importance for comparison
 */
const SEVERITY_ORDER = { critical: 0, error: 1, warning: 2 } as const;

/**
 * Default configuration values for the monitoring service
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  intervalMs: 30000, // 30 seconds
  enableAutoRecovery: true,
  connectionContentionThreshold: 0.8,
  maxConsecutiveFailures: 3,
  alertOnHealthChange: true,
  enableDetailedLogging: false,
};

/**
 * Database monitoring service that periodically checks pool health
 * and prevents resource exhaustion through proactive monitoring.
 * 
 * This service provides:
 * - Continuous health monitoring of database connection pools
 * - Automatic issue detection and classification
 * - Configurable recovery strategies
 * - Comprehensive metrics for observability
 * - Circuit breaker awareness
 */
class DatabaseMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly config: MonitoringConfig;
  private isRunning = false;
  private startTime: Date | null = null;
  private metrics: MonitoringMetrics;
  private previousHealthStates = new Map<string, boolean>();
  private checkDurations: number[] = [];

  constructor(config: Partial<MonitoringConfig> = {}) {
    // Merge provided config with defaults using a cleaner approach
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize metrics tracking with all fields
    this.metrics = this.createInitialMetrics();
  }

  /**
   * Creates the initial metrics object with default values
   */
  private createInitialMetrics(): MonitoringMetrics {
    return {
      totalHealthChecks: 0,
      failedHealthChecks: 0,
      issuesDetected: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      lastCheckTimestamp: null,
      uptime: 0,
      averageCheckDuration: 0,
    };
  }

  /**
   * Starts the monitoring service with initial health check and periodic monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Database monitoring service is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    
    logger.info('Starting database monitoring service', {
      config: this.config,
      timestamp: this.startTime.toISOString(),
    });

    // Perform initial health check to establish baseline
    this.performHealthCheck().catch(error => {
      this.handleHealthCheckError(error, 'Initial health check failed');
    });

    // Set up periodic monitoring with error boundaries
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        this.handleHealthCheckError(error, 'Periodic health check failed');
      });
    }, this.config.intervalMs);

    // Prevent the interval from keeping the process alive unnecessarily
    this.monitoringInterval.unref();
  }

  /**
   * Gracefully stops the monitoring service and cleans up resources
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Database monitoring service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Calculate final uptime before stopping
    this.updateUptime();

    logger.info('Database monitoring service stopped', {
      finalMetrics: this.getMetrics(),
      totalUptime: this.formatUptime(this.metrics.uptime),
    });

    this.startTime = null;
  }

  /**
   * Performs a comprehensive health check on all pools with detailed analysis
   */
  private async performHealthCheck(): Promise<void> {
    const checkStartTime = Date.now();
    this.metrics.totalHealthChecks++;
    this.metrics.lastCheckTimestamp = new Date();

    try {
      const healthStatuses = await monitorPoolHealth();

      // Record performance metrics
      const pm = await getPerformanceMonitoring();
      if (pm) {
        // Record health check duration
        const duration = Date.now() - checkStartTime;
        pm.recordMetric('db.health_check.duration', duration, {
          component: 'database_monitoring'
        });

        // Record pool health metrics
        for (const [poolName, status] of Object.entries(healthStatuses)) {
          pm.recordMetric('db.pool.connections.total', status.totalConnections, {
            pool: poolName,
            component: 'database_monitoring'
          });
          pm.recordMetric('db.pool.connections.idle', status.idleConnections, {
            pool: poolName,
            component: 'database_monitoring'
          });
          pm.recordMetric('db.pool.connections.waiting', status.waitingClients, {
            pool: poolName,
            component: 'database_monitoring'
          });

          // Record health status
          pm.recordMetric('db.pool.healthy', status.isHealthy ? 1 : 0, {
            pool: poolName,
            component: 'database_monitoring'
          });
        }
      }

      // Analyze health status and identify critical issues
      const criticalIssues = this.analyzeHealthStatuses(healthStatuses);

      if (criticalIssues.length > 0) {
        this.handleCriticalIssues(criticalIssues);
      } else {
        this.logHealthyStatus(healthStatuses);
      }

      // Track health state changes for alerting
      if (this.config.alertOnHealthChange) {
        this.detectHealthStateChanges(healthStatuses);
      }

      // Track check duration for performance monitoring
      this.recordCheckDuration(Date.now() - checkStartTime);

    } catch (error) {
      this.metrics.failedHealthChecks++;

      // Record error metrics
      const pm = await getPerformanceMonitoring();
      if (pm) {
        pm.recordMetric('db.health_check.error', 1, {
          component: 'database_monitoring',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Handles critical issues detected during health checks
   */
  private async handleCriticalIssues(criticalIssues: CriticalIssue[]): Promise<void> {
    this.metrics.issuesDetected += criticalIssues.length;
    
    logger.error('Critical database pool issues detected:', {
      issueCount: criticalIssues.length,
      issues: criticalIssues.map(issue => ({
        pool: issue.pool,
        issue: issue.issue,
        severity: issue.severity,
      })),
      timestamp: this.metrics.lastCheckTimestamp?.toISOString(),
    });

    // Attempt automatic recovery if enabled
    if (this.config.enableAutoRecovery) {
      await this.processRecoveryActions(criticalIssues);
    }
  }

  /**
   * Logs when all pools are healthy
   */
  private logHealthyStatus(healthStatuses: Record<string, PoolHealthStatus>): void {
    const logMethod = this.config.enableDetailedLogging ? logger.info : logger.debug;
    
    logMethod('All database pools are healthy', {
      poolCount: Object.keys(healthStatuses).length,
      timestamp: this.metrics.lastCheckTimestamp?.toISOString(),
    });
  }

  /**
   * Records the duration of a health check for performance tracking
   */
  private recordCheckDuration(duration: number): void {
    this.checkDurations.push(duration);
    
    // Keep only the last 100 durations to prevent memory growth
    if (this.checkDurations.length > 100) {
      this.checkDurations.shift();
    }
    
    // Calculate rolling average
    this.metrics.averageCheckDuration = 
      this.checkDurations.reduce((sum, d) => sum + d, 0) / this.checkDurations.length;
  }

  /**
   * Handles errors that occur during health checks
   */
  private handleHealthCheckError(error: unknown, context: string): void {
    this.metrics.failedHealthChecks++;
    
    logger.error(context, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      consecutiveFailures: this.metrics.failedHealthChecks,
    });
  }

  /**
   * Analyzes health statuses and categorizes issues by severity
   */
  private analyzeHealthStatuses(
    healthStatuses: Record<string, PoolHealthStatus>
  ): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    for (const [poolName, status] of Object.entries(healthStatuses)) {
      if (!status.isHealthy) {
        issues.push(this.createCriticalIssue(poolName, status));
      }
    }

    // Sort by severity (critical first) using the severity order constant
    return issues.sort((a, b) => 
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );
  }

  /**
   * Creates a critical issue object from pool status
   */
  private createCriticalIssue(poolName: string, status: PoolHealthStatus): CriticalIssue {
    return {
      pool: poolName,
      issue: this.identifyIssue(status),
      severity: this.determineSeverity(status),
      status,
      timestamp: new Date(),
    };
  }

  /**
   * Determines the severity level of a pool health issue
   */
  private determineSeverity(status: PoolHealthStatus): 'warning' | 'error' | 'critical' {
    // Critical: Circuit breaker open or no connections
    if (this.isCriticalState(status)) {
      return 'critical';
    }
    
    // Error: High contention or multiple errors
    if (this.isErrorState(status)) {
      return 'error';
    }
    
    // Warning: Everything else
    return 'warning';
  }

  /**
   * Checks if the pool is in a critical state
   */
  private isCriticalState(status: PoolHealthStatus): boolean {
    return status.circuitBreakerState === 'OPEN' || status.totalConnections === 0;
  }

  /**
   * Checks if the pool is in an error state
   */
  private isErrorState(status: PoolHealthStatus): boolean {
    const highContention = 
      status.waitingClients > status.totalConnections * this.config.connectionContentionThreshold;
    
    const tooManyErrors = 
      (status.errorCount ?? 0) >= this.config.maxConsecutiveFailures;
    
    return highContention || tooManyErrors;
  }

  /**
   * Identifies the specific issue with a pool with detailed context
   */
  private identifyIssue(status: PoolHealthStatus): string {
    // Check circuit breaker state first as it's the most critical
    if (status.circuitBreakerState === 'OPEN') {
      return `Circuit breaker is open - too many failures (${status.errorCount ?? 0} errors)`;
    }
    
    if (status.circuitBreakerState === 'HALF_OPEN') {
      return 'Circuit breaker is in half-open state - testing recovery';
    }
    
    // Check connection availability
    if (status.totalConnections === 0) {
      return 'No active connections available - pool may be exhausted';
    }
    
    // Check for connection contention
    const contentionRatio = this.calculateContentionRatio(status);
    if (contentionRatio > this.config.connectionContentionThreshold) {
      return this.formatContentionMessage(status, contentionRatio);
    }
    
    // Check idle connections
    if (status.idleConnections === 0 && status.totalConnections > 0) {
      return 'All connections are busy - consider increasing pool size';
    }
    
    // Check for errors
    if (status.lastError) {
      return `Pool error: ${status.lastError}`;
    }
    
    return 'Unknown health issue - manual investigation required';
  }

  /**
   * Calculates the connection contention ratio
   */
  private calculateContentionRatio(status: PoolHealthStatus): number {
    return status.totalConnections > 0 
      ? status.waitingClients / status.totalConnections 
      : 0;
  }

  /**
   * Formats the contention message with detailed statistics
   */
  private formatContentionMessage(status: PoolHealthStatus, contentionRatio: number): string {
    return `High connection contention - ${status.waitingClients} clients waiting for ${status.totalConnections} connections (${(contentionRatio * 100).toFixed(1)}% ratio)`;
  }

  /**
   * Processes recovery actions for detected issues
   */
  private async processRecoveryActions(issues: CriticalIssue[]): Promise<void> {
    // Process issues sequentially to avoid overwhelming the system
    for (const issue of issues) {
      await this.attemptSingleRecovery(issue);
    }
  }

  /**
   * Attempts recovery for a single issue
   */
  private async attemptSingleRecovery(issue: CriticalIssue): Promise<void> {
    this.metrics.recoveryAttempts++;
    
    try {
      const recovered = await this.attemptRecovery(
        issue.pool, 
        issue.status, 
        issue.severity
      );
      
      if (recovered) {
        this.metrics.successfulRecoveries++;
      }
    } catch (error) {
      logger.error(`Recovery attempt failed for ${issue.pool}:`, {
        error: error instanceof Error ? error.message : String(error),
        issue: issue.issue,
        severity: issue.severity,
      });
    }
  }

  /**
   * Attempts automatic recovery for pool issues with specific strategies
   */
  private async attemptRecovery(
    poolName: string, 
    status: PoolHealthStatus,
    severity: 'warning' | 'error' | 'critical'
  ): Promise<boolean> {
    logger.info(`Attempting recovery for ${poolName} pool`, {
      issue: this.identifyIssue(status),
      severity,
      status: {
        connections: status.totalConnections,
        waiting: status.waitingClients,
        circuitBreaker: status.circuitBreakerState,
      },
    });

    try {
      // Strategy 1: Circuit breaker management
      if (status.circuitBreakerState === 'OPEN') {
        this.handleOpenCircuitBreaker(poolName, status);
        return false;
      }
      
      // Strategy 2: Connection contention warnings
      if (this.hasHighContention(status)) {
        this.handleHighContention(poolName, status);
        return false;
      }
      
      // Strategy 3: No connections available
      if (status.totalConnections === 0) {
        this.handleNoConnections(poolName);
        return false;
      }

      // If we reach here, the issue may have resolved itself
      logger.info(`No automated recovery action available for ${poolName}, monitoring for resolution`);
      return false;
      
    } catch (error) {
      logger.error(`Recovery process error for ${poolName}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Handles open circuit breaker state
   */
  private handleOpenCircuitBreaker(poolName: string, status: PoolHealthStatus): void {
    logger.info(`Circuit breaker for ${poolName} is open, waiting for automatic reset`, {
      errorCount: status.errorCount,
      recommendation: 'Monitor for automatic recovery or investigate root cause',
    });
  }

  /**
   * Checks if the pool has high connection contention
   */
  private hasHighContention(status: PoolHealthStatus): boolean {
    return status.waitingClients > 
      status.totalConnections * this.config.connectionContentionThreshold;
  }

  /**
   * Handles high connection contention
   */
  private handleHighContention(poolName: string, status: PoolHealthStatus): void {
    const contentionRatio = this.calculateContentionRatio(status);
    
    logger.warn(`High connection contention in ${poolName} pool`, {
      waitingClients: status.waitingClients,
      totalConnections: status.totalConnections,
      contentionRatio: contentionRatio.toFixed(2),
      recommendation: 'Consider increasing pool size or optimizing query performance',
    });
  }

  /**
   * Handles the case where no connections are available
   */
  private handleNoConnections(poolName: string): void {
    logger.error(`${poolName} pool has no connections`, {
      recommendation: 'Check database connectivity and pool configuration',
      severity: 'critical',
    });
  }

  /**
   * Detects changes in pool health states and alerts accordingly
   */
  private detectHealthStateChanges(healthStatuses: Record<string, PoolHealthStatus>): void {
    for (const [poolName, status] of Object.entries(healthStatuses)) {
      const previousState = this.previousHealthStates.get(poolName);
      
      // Check if health state changed
      if (previousState !== undefined && previousState !== status.isHealthy) {
        this.logHealthStateChange(poolName, status.isHealthy);
      }
      
      // Update state tracking
      this.previousHealthStates.set(poolName, status.isHealthy);
    }
  }

  /**
   * Logs health state changes
   */
  private logHealthStateChange(poolName: string, isHealthy: boolean): void {
    const logData = {
      previousState: isHealthy ? 'unhealthy' : 'healthy',
      currentState: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };

    if (isHealthy) {
      logger.info(`Pool ${poolName} has recovered`, logData);
    } else {
      logger.warn(`Pool ${poolName} has become unhealthy`, logData);
    }
  }

  /**
   * Updates the uptime metric
   */
  private updateUptime(): void {
    if (this.startTime) {
      this.metrics.uptime = Date.now() - this.startTime.getTime();
    }
  }

  /**
   * Gets the current running status of the monitoring service
   */
  isMonitoringActive(): boolean {
    return this.isRunning;
  }

  /**
   * Returns comprehensive metrics about the monitoring service
   */
  getMetrics(): MonitoringMetrics {
    // Calculate current uptime if running
    this.updateUptime();
    
    return { ...this.metrics };
  }

  /**
   * Returns the current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Formats uptime in a human-readable format
   */
  private formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Performs an immediate health check without waiting for the interval
   */
  async checkNow(): Promise<Record<string, any>> {
    logger.info('Performing on-demand health check');
    await this.performHealthCheck();
    return await monitorPoolHealth();
  }

  /**
   * Resets all metrics to their initial state
   */
  resetMetrics(): void {
    this.metrics = this.createInitialMetrics();
    this.checkDurations = [];
    logger.info('Monitoring metrics have been reset');
  }
}

// Export singleton instance with default configuration
export const databaseMonitor = new DatabaseMonitoringService();

// Export the class for custom instances with different configurations
export {
  DatabaseMonitoringService
};

export type {
  MonitoringConfig,
  PoolHealthStatus,
  CriticalIssue,
  MonitoringMetrics
};















































