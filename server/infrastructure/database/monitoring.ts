/**
 * Database Performance Monitoring System
 * 
 * Provides comprehensive database monitoring:
 * - Real-time performance metrics
 * - Query performance analysis
 * - Connection pool monitoring
 * - Automated alerting
 * - Performance trend analysis
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { logger } from '@shared/core/src/index.js';

export interface DatabaseMetrics {
  timestamp: Date;
  connections: ConnectionMetrics;
  queries: QueryMetrics;
  performance: PerformanceMetrics;
  storage: StorageMetrics;
  locks: LockMetrics;
}

export interface ConnectionMetrics {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  utilizationPercent: number;
}

export interface QueryMetrics {
  totalQueries: number;
  queriesPerSecond: number;
  averageExecutionTime: number;
  slowQueries: number;
  failedQueries: number;
  topSlowQueries: SlowQuery[];
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  calls: number;
  avgTime: number;
  totalTime: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: DiskIOMetrics;
  cacheHitRatio: number;
  indexUsage: number;
  transactionRate: number;
}

export interface DiskIOMetrics {
  reads: number;
  writes: number;
  readLatency: number;
  writeLatency: number;
}

export interface StorageMetrics {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  utilizationPercent: number;
  tablesSizes: TableSize[];
  indexSizes: IndexSize[];
}

export interface TableSize {
  tableName: string;
  size: number;
  rowCount: number;
}

export interface IndexSize {
  indexName: string;
  tableName: string;
  size: number;
}

export interface LockMetrics {
  totalLocks: number;
  waitingLocks: number;
  blockedQueries: number;
  deadlocks: number;
  lockWaitTime: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class DatabaseMonitoring extends EventEmitter {
  private pool: Pool;
  private metrics: DatabaseMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.setupDefaultAlertRules();
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('Database monitoring already started', {
        component: 'DatabaseMonitoring'
      });
      return;
    }

    this.isMonitoring = true;
    
    logger.info('Starting database monitoring', {
      component: 'DatabaseMonitoring',
      interval: `${intervalMs}ms`
    });

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Failed to collect database metrics', {
          component: 'DatabaseMonitoring',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics().catch(error => {
      logger.error('Failed to collect initial metrics', {
        component: 'DatabaseMonitoring',
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      delete this.monitoringInterval;
    }

    logger.info('Database monitoring stopped', {
      component: 'DatabaseMonitoring'
    });
  }

  /**
   * Collect current database metrics
   */
  async collectMetrics(): Promise<DatabaseMetrics> {
    const client = await this.pool.connect();
    
    try {
      const timestamp = new Date();
      
      const [
        connections,
        queries,
        performance,
        storage,
        locks
      ] = await Promise.all([
        this.getConnectionMetrics(client),
        this.getQueryMetrics(client),
        this.getPerformanceMetrics(client),
        this.getStorageMetrics(client),
        this.getLockMetrics(client)
      ]);

      const metrics: DatabaseMetrics = {
        timestamp,
        connections,
        queries,
        performance,
        storage,
        locks
      };

      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }

      // Check alert rules
      await this.checkAlertRules(metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

      return metrics;

    } finally {
      client.release();
    }
  }

  /**
   * Get connection metrics
   */
  private async getConnectionMetrics(client: PoolClient): Promise<ConnectionMetrics> {
    const result = await client.query(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const settingsResult = await client.query(`
      SELECT setting::int as max_connections
      FROM pg_settings 
      WHERE name = 'max_connections'
    `);

    const row = result.rows[0];
    const maxConnections = settingsResult.rows[0].max_connections;
    const total = parseInt(row.total_connections);

    return {
      total,
      active: parseInt(row.active_connections),
      idle: parseInt(row.idle_connections),
      waiting: parseInt(row.waiting_connections),
      maxConnections,
      utilizationPercent: (total / maxConnections) * 100
    };
  }

  /**
   * Get query metrics
   */
  private async getQueryMetrics(client: PoolClient): Promise<QueryMetrics> {
    try {
      // Try to get metrics from pg_stat_statements
      const result = await client.query(`
        SELECT 
          sum(calls) as total_queries,
          avg(mean_exec_time) as avg_execution_time,
          count(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries,
          query,
          calls,
          mean_exec_time,
          total_exec_time
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        GROUP BY query, calls, mean_exec_time, total_exec_time
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `);

      const totalQueries = result.rows.length > 0 ? parseInt(result.rows[0].total_queries) || 0 : 0;
      const avgExecutionTime = result.rows.length > 0 ? parseFloat(result.rows[0].avg_execution_time) || 0 : 0;
      const slowQueries = result.rows.length > 0 ? parseInt(result.rows[0].slow_queries) || 0 : 0;

      const topSlowQueries: SlowQuery[] = result.rows.slice(0, 5).map(row => ({
        query: row.query.substring(0, 100) + '...',
        executionTime: parseFloat(row.mean_exec_time),
        calls: parseInt(row.calls),
        avgTime: parseFloat(row.mean_exec_time),
        totalTime: parseFloat(row.total_exec_time)
      }));

      return {
        totalQueries,
        queriesPerSecond: 0, // Would need time-based calculation
        averageExecutionTime: avgExecutionTime,
        slowQueries,
        failedQueries: 0, // Would need error tracking
        topSlowQueries
      };

    } catch (error) {
      // pg_stat_statements extension not available
      return {
        totalQueries: 0,
        queriesPerSecond: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        failedQueries: 0,
        topSlowQueries: []
      };
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(client: PoolClient): Promise<PerformanceMetrics> {
    const cacheResult = await client.query(`
      SELECT 
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_read) as heap_read,
        sum(idx_blks_hit) as idx_hit,
        sum(idx_blks_read) as idx_read
      FROM pg_statio_user_tables
    `);

    const transactionResult = await client.query(`
      SELECT 
        xact_commit + xact_rollback as total_transactions,
        xact_commit,
        xact_rollback
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);

    const cacheRow = cacheResult.rows[0];
    const heapHit = parseInt(cacheRow.heap_hit) || 0;
    const heapRead = parseInt(cacheRow.heap_read) || 0;
    const idxHit = parseInt(cacheRow.idx_hit) || 0;
    const idxRead = parseInt(cacheRow.idx_read) || 0;

    const totalHit = heapHit + idxHit;
    const totalRead = heapRead + idxRead;
    const cacheHitRatio = totalRead > 0 ? (totalHit / (totalHit + totalRead)) * 100 : 100;

    const transactionRow = transactionResult.rows[0];
    const totalTransactions = parseInt(transactionRow.total_transactions) || 0;

    return {
      cpuUsage: 0, // Would need system-level monitoring
      memoryUsage: 0, // Would need system-level monitoring
      diskIO: {
        reads: heapRead + idxRead,
        writes: 0, // Would need additional tracking
        readLatency: 0,
        writeLatency: 0
      },
      cacheHitRatio,
      indexUsage: idxHit > 0 ? (idxHit / (idxHit + idxRead)) * 100 : 0,
      transactionRate: totalTransactions
    };
  }

  /**
   * Get storage metrics
   */
  private async getStorageMetrics(client: PoolClient): Promise<StorageMetrics> {
    const dbSizeResult = await client.query(`
      SELECT pg_database_size(current_database()) as db_size
    `);

    const tableSizesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as size,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
      FROM pg_tables t
      JOIN pg_stat_user_tables s ON t.tablename = s.relname
      WHERE schemaname = 'public'
      ORDER BY size DESC
      LIMIT 20
    `);

    const indexSizesResult = await client.query(`
      SELECT 
        indexname,
        tablename,
        pg_relation_size(indexname) as size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY size DESC
      LIMIT 20
    `);

    const dbSize = parseInt(dbSizeResult.rows[0].db_size);

    const tablesSizes: TableSize[] = tableSizesResult.rows.map(row => ({
      tableName: row.tablename,
      size: parseInt(row.size),
      rowCount: parseInt(row.row_count) || 0
    }));

    const indexSizes: IndexSize[] = indexSizesResult.rows.map(row => ({
      indexName: row.indexname,
      tableName: row.tablename,
      size: parseInt(row.size)
    }));

    return {
      totalSize: dbSize,
      usedSize: dbSize,
      freeSize: 0, // Would need filesystem-level monitoring
      utilizationPercent: 100, // Simplified
      tablesSizes,
      indexSizes
    };
  }

  /**
   * Get lock metrics
   */
  private async getLockMetrics(client: PoolClient): Promise<LockMetrics> {
    const locksResult = await client.query(`
      SELECT 
        count(*) as total_locks,
        count(*) FILTER (WHERE NOT granted) as waiting_locks,
        count(DISTINCT pid) FILTER (WHERE NOT granted) as blocked_queries
      FROM pg_locks
      WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
    `);

    const row = locksResult.rows[0];

    return {
      totalLocks: parseInt(row.total_locks) || 0,
      waitingLocks: parseInt(row.waiting_locks) || 0,
      blockedQueries: parseInt(row.blocked_queries) || 0,
      deadlocks: 0, // Would need deadlock tracking
      lockWaitTime: 0 // Would need wait time tracking
    };
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_connection_usage',
        name: 'High Connection Usage',
        metric: 'connections.utilizationPercent',
        operator: 'gte',
        threshold: 80,
        duration: 300, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'low_cache_hit_ratio',
        name: 'Low Cache Hit Ratio',
        metric: 'performance.cacheHitRatio',
        operator: 'lt',
        threshold: 90,
        duration: 600, // 10 minutes
        severity: 'medium',
        enabled: true
      },
      {
        id: 'high_slow_queries',
        name: 'High Number of Slow Queries',
        metric: 'queries.slowQueries',
        operator: 'gt',
        threshold: 10,
        duration: 300,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'blocked_queries',
        name: 'Blocked Queries Detected',
        metric: 'locks.blockedQueries',
        operator: 'gt',
        threshold: 0,
        duration: 60,
        severity: 'high',
        enabled: true
      },
      {
        id: 'high_storage_usage',
        name: 'High Storage Usage',
        metric: 'storage.utilizationPercent',
        operator: 'gte',
        threshold: 85,
        duration: 3600, // 1 hour
        severity: 'medium',
        enabled: true
      }
    ];
  }

  /**
   * Check alert rules against current metrics
   */
  private async checkAlertRules(metrics: DatabaseMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const value = this.getMetricValue(metrics, rule.metric);
      if (value === null) continue;

      const shouldAlert = this.evaluateCondition(value, rule.operator, rule.threshold);

      if (shouldAlert) {
        // Check if we already have an active alert for this rule
        const existingAlert = this.alerts.find(a => 
          a.ruleId === rule.id && !a.resolved
        );

        if (!existingAlert) {
          const alert: Alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${rule.name}: ${value} ${rule.operator} ${rule.threshold}`,
            value,
            threshold: rule.threshold,
            timestamp: new Date(),
            resolved: false
          };

          this.alerts.push(alert);
          rule.lastTriggered = new Date();

          logger.warn('Database alert triggered', {
            component: 'DatabaseMonitoring',
            alert: {
              id: alert.id,
              rule: alert.ruleName,
              severity: alert.severity,
              message: alert.message
            }
          });

          this.emit('alert', alert);
        }
      } else {
        // Resolve any existing alerts for this rule
        const existingAlerts = this.alerts.filter(a => 
          a.ruleId === rule.id && !a.resolved
        );

        for (const alert of existingAlerts) {
          alert.resolved = true;
          alert.resolvedAt = new Date();

          logger.info('Database alert resolved', {
            component: 'DatabaseMonitoring',
            alert: {
              id: alert.id,
              rule: alert.ruleName,
              resolvedAt: alert.resolvedAt
            }
          });

          this.emit('alertResolved', alert);
        }
      }
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metrics: DatabaseMetrics, path: string): number | null {
    const parts = path.split('.');
    let value: any = metrics;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): DatabaseMetrics | undefined {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : undefined;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): DatabaseMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.alertRules.push({
      ...rule,
      id
    });

    logger.info('Custom alert rule added', {
      component: 'DatabaseMonitoring',
      ruleId: id,
      ruleName: rule.name
    });

    return id;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      
      logger.info('Alert rule removed', {
        component: 'DatabaseMonitoring',
        ruleId
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Generate monitoring report
   */
  generateReport(): {
    summary: any;
    metrics: DatabaseMetrics | undefined;
    alerts: Alert[];
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const recommendations: string[] = [];

    if (currentMetrics) {
      // Generate recommendations based on metrics
      if (currentMetrics.connections.utilizationPercent > 70) {
        recommendations.push('Consider increasing connection pool size or optimizing connection usage');
      }

      if (currentMetrics.performance.cacheHitRatio < 95) {
        recommendations.push('Consider increasing shared_buffers to improve cache hit ratio');
      }

      if (currentMetrics.queries.slowQueries > 5) {
        recommendations.push('Review and optimize slow queries, consider adding indexes');
      }

      if (currentMetrics.locks.waitingLocks > 0) {
        recommendations.push('Investigate lock contention and optimize transaction duration');
      }
    }

    return {
      summary: {
        isHealthy: activeAlerts.length === 0,
        alertCount: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
        lastMetricsUpdate: currentMetrics?.timestamp || null
      },
      metrics: currentMetrics,
      alerts: activeAlerts,
      recommendations
    };
  }
}

// Export singleton instance
let databaseMonitoring: DatabaseMonitoring | null = null;

export function createDatabaseMonitoring(pool: Pool): DatabaseMonitoring {
  if (databaseMonitoring) {
    return databaseMonitoring;
  }
  
  databaseMonitoring = new DatabaseMonitoring(pool);
  return databaseMonitoring;
}

export function getDatabaseMonitoring(): DatabaseMonitoring {
  if (!databaseMonitoring) {
    throw new Error('Database monitoring not initialized. Call createDatabaseMonitoring() first.');
  }
  
  return databaseMonitoring;
}
