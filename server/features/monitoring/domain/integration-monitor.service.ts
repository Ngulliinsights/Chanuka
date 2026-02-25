/**
 * Integration Monitoring Service
 * 
 * Provides comprehensive monitoring for all integrated features including:
 * - Feature usage tracking
 * - Performance metrics collection
 * - Health checks
 * - Alert generation
 * - Logging
 */

import { database as db } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { performanceMonitor } from '@server/infrastructure/observability/monitoring/performance-monitor';
import {
  integrationFeatures,
  featureMetrics,
  healthChecks,
  integrationAlerts,
  alertRules,
  integrationLogs,
  type IntegrationFeature,
  type NewIntegrationFeature,
  type FeatureMetric,
  type NewFeatureMetric,
  type HealthCheck,
  type NewHealthCheck,
  type IntegrationAlert,
  type NewIntegrationAlert,
  type AlertRule,
  type NewAlertRule,
  type IntegrationLog,
  type NewIntegrationLog,
} from '@server/infrastructure/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureUsageMetrics {
  activeUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface FeaturePerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface FeatureHealthStatus {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime?: number;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number; // minutes
}

export interface MonitoringDashboardData {
  features: Array<{
    id: string;
    name: string;
    displayName: string;
    enabled: boolean;
    healthStatus: string;
    lastHealthCheck?: Date;
    recentMetrics?: FeatureMetric;
    activeAlerts: number;
  }>;
  systemHealth: {
    totalFeatures: number;
    healthyFeatures: number;
    degradedFeatures: number;
    downFeatures: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
}

// ============================================================================
// INTEGRATION MONITORING SERVICE
// ============================================================================

export class IntegrationMonitorService {
  /**
   * Register a new feature for monitoring
   */
  async registerFeature(feature: NewIntegrationFeature): Promise<IntegrationFeature> {
    try {
      const [newFeature] = await db
        .insert(integrationFeatures)
        .values(feature)
        .returning();

      logger.info({
        message: 'Feature registered for monitoring',
        featureId: newFeature.id,
        featureName: newFeature.name,
      });

      return newFeature;
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'high', 'system');
      throw error;
    }
  }

  /**
   * Update feature status
   */
  async updateFeatureStatus(
    featureId: string,
    enabled: boolean,
    healthStatus?: string
  ): Promise<void> {
    try {
      await db
        .update(integrationFeatures)
        .set({
          enabled,
          ...(healthStatus && { healthStatus }),
          updated_at: new Date(),
        })
        .where(eq(integrationFeatures.id, featureId));

      logger.info({
        message: 'Feature status updated',
        featureId,
        enabled,
        healthStatus,
      });
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Record feature metrics
   */
  async recordMetrics(
    featureId: string,
    usage: FeatureUsageMetrics,
    performance: FeaturePerformanceMetrics
  ): Promise<void> {
    try {
      const errorRate =
        usage.totalRequests > 0
          ? usage.failedRequests / usage.totalRequests
          : 0;

      const metrics: NewFeatureMetric = {
        featureId,
        timestamp: new Date(),
        activeUsers: usage.activeUsers,
        totalRequests: usage.totalRequests,
        successfulRequests: usage.successfulRequests,
        failedRequests: usage.failedRequests,
        avgResponseTime: performance.avgResponseTime.toString(),
        p95ResponseTime: performance.p95ResponseTime.toString(),
        p99ResponseTime: performance.p99ResponseTime.toString(),
        errorRate: errorRate.toString(),
        errorCount: usage.failedRequests,
      };

      await db.insert(featureMetrics).values(metrics);

      // Check alert rules
      await this.checkAlertRules(featureId, metrics);
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Perform health check for a feature
   */
  async performHealthCheck(
    featureId: string,
    checkFn: () => Promise<FeatureHealthStatus>
  ): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const result = await checkFn();
      const responseTime = Date.now() - startTime;

      const healthCheck: NewHealthCheck = {
        featureId,
        timestamp: new Date(),
        status: result.status,
        responseTime: responseTime.toString(),
        statusCode: result.status === 'healthy' ? 200 : 500,
        errorMessage: result.errorMessage,
        details: result.details,
      };

      const [check] = await db.insert(healthChecks).values(healthCheck).returning();

      // Update feature health status
      await db
        .update(integrationFeatures)
        .set({
          healthStatus: result.status,
          lastHealthCheck: new Date(),
          updated_at: new Date(),
        })
        .where(eq(integrationFeatures.id, featureId));

      // Create alert if health check failed
      if (result.status === 'down' || result.status === 'degraded') {
        await this.createAlert({
          featureId,
          severity: result.status === 'down' ? 'critical' : 'high',
          type: 'health_check',
          title: `Feature ${result.status}`,
          message: result.errorMessage || `Feature health check returned ${result.status}`,
          actualValue: { status: result.status, responseTime },
        });
      }

      return check;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const healthCheck: NewHealthCheck = {
        featureId,
        timestamp: new Date(),
        status: 'down',
        responseTime: responseTime.toString(),
        statusCode: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      const [check] = await db.insert(healthChecks).values(healthCheck).returning();

      // Update feature health status
      await db
        .update(integrationFeatures)
        .set({
          healthStatus: 'down',
          lastHealthCheck: new Date(),
          updated_at: new Date(),
        })
        .where(eq(integrationFeatures.id, featureId));

      // Create critical alert
      await this.createAlert({
        featureId,
        severity: 'critical',
        type: 'health_check',
        title: 'Feature health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        actualValue: { error: true, responseTime },
      });

      errorTracker.trackError(error as Error, { featureId }, 'high', 'system');

      return check;
    }
  }

  /**
   * Create an alert
   */
  async createAlert(alert: NewIntegrationAlert): Promise<IntegrationAlert> {
    try {
      const [newAlert] = await db
        .insert(integrationAlerts)
        .values(alert)
        .returning();

      logger.warn({
        message: 'Integration alert created',
        alertId: newAlert.id,
        featureId: alert.featureId,
        severity: alert.severity,
        type: alert.type,
        title: alert.title,
      });

      // Log to integration logs
      await this.logEvent(alert.featureId, 'warn', 'alert', alert.message, {
        alertId: newAlert.id,
        severity: alert.severity,
        type: alert.type,
      });

      return newAlert;
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await db
        .update(integrationAlerts)
        .set({
          acknowledged: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
          updated_at: new Date(),
        })
        .where(eq(integrationAlerts.id, alertId));

      logger.info({
        message: 'Alert acknowledged',
        alertId,
        userId,
      });
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'low', 'system');
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    try {
      await db
        .update(integrationAlerts)
        .set({
          resolved: true,
          resolvedBy: userId,
          resolvedAt: new Date(),
          updated_at: new Date(),
        })
        .where(eq(integrationAlerts.id, alertId));

      logger.info({
        message: 'Alert resolved',
        alertId,
        userId,
      });
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'low', 'system');
      throw error;
    }
  }

  /**
   * Add an alert rule
   */
  async addAlertRule(rule: NewAlertRule): Promise<AlertRule> {
    try {
      const [newRule] = await db.insert(alertRules).values(rule).returning();

      logger.info({
        message: 'Alert rule created',
        ruleId: newRule.id,
        featureId: rule.featureId,
        metric: rule.metric,
      });

      return newRule;
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Check alert rules for a feature
   */
  private async checkAlertRules(
    featureId: string,
    metrics: NewFeatureMetric
  ): Promise<void> {
    try {
      const rules = await db
        .select()
        .from(alertRules)
        .where(and(eq(alertRules.featureId, featureId), eq(alertRules.enabled, true)));

      for (const rule of rules) {
        const shouldAlert = this.evaluateAlertRule(rule, metrics);

        if (shouldAlert) {
          // Check cooldown
          const recentAlerts = await db
            .select()
            .from(integrationAlerts)
            .where(
              and(
                eq(integrationAlerts.featureId, featureId),
                eq(integrationAlerts.type, rule.metric),
                gte(
                  integrationAlerts.created_at,
                  new Date(Date.now() - rule.cooldown * 60 * 1000)
                )
              )
            );

          if (recentAlerts.length === 0) {
            await this.createAlert({
              featureId,
              severity: rule.severity,
              type: rule.metric,
              title: rule.name,
              message: rule.description || `Alert rule ${rule.name} triggered`,
              threshold: { value: rule.threshold, operator: rule.operator },
              actualValue: this.getMetricValue(metrics, rule.metric),
            });
          }
        }
      }
    } catch (error) {
      errorTracker.trackError(error as Error, { featureId }, 'low', 'system');
    }
  }

  /**
   * Evaluate if an alert rule should trigger
   */
  private evaluateAlertRule(rule: AlertRule, metrics: NewFeatureMetric): boolean {
    const value = this.getMetricValue(metrics, rule.metric);
    const threshold = parseFloat(rule.threshold);

    if (typeof value !== 'number') return false;

    switch (rule.operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metrics: NewFeatureMetric, metricName: string): number | null {
    switch (metricName) {
      case 'error_rate':
        return parseFloat(metrics.errorRate || '0');
      case 'avg_response_time':
        return parseFloat(metrics.avgResponseTime || '0');
      case 'p95_response_time':
        return parseFloat(metrics.p95ResponseTime || '0');
      case 'p99_response_time':
        return parseFloat(metrics.p99ResponseTime || '0');
      case 'active_users':
        return metrics.activeUsers;
      case 'total_requests':
        return metrics.totalRequests;
      case 'failed_requests':
        return metrics.failedRequests;
      default:
        return null;
    }
  }

  /**
   * Log an integration event
   */
  async logEvent(
    featureId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    category: string,
    message: string,
    details?: Record<string, any>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    try {
      const log: NewIntegrationLog = {
        featureId,
        timestamp: new Date(),
        level,
        category,
        message,
        details,
        userId,
        requestId,
      };

      await db.insert(integrationLogs).values(log);
    } catch (error) {
      // Don't throw on logging errors, just log to console
      logger.error({ error }, 'Failed to log integration event');
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<MonitoringDashboardData> {
    try {
      // Get all features with their latest metrics
      const features = await db.select().from(integrationFeatures);

      const featureData = await Promise.all(
        features.map(async (feature) => {
          // Get latest metrics
          const [latestMetrics] = await db
            .select()
            .from(featureMetrics)
            .where(eq(featureMetrics.featureId, feature.id))
            .orderBy(desc(featureMetrics.timestamp))
            .limit(1);

          // Count active alerts
          const activeAlerts = await db
            .select({ count: sql<number>`count(*)` })
            .from(integrationAlerts)
            .where(
              and(
                eq(integrationAlerts.featureId, feature.id),
                eq(integrationAlerts.triggered, true),
                eq(integrationAlerts.resolved, false)
              )
            );

          return {
            id: feature.id,
            name: feature.name,
            displayName: feature.displayName,
            enabled: feature.enabled,
            healthStatus: feature.healthStatus,
            lastHealthCheck: feature.lastHealthCheck || undefined,
            recentMetrics: latestMetrics,
            activeAlerts: Number(activeAlerts[0]?.count || 0),
          };
        })
      );

      // Calculate system health
      const totalFeatures = features.length;
      const healthyFeatures = features.filter((f) => f.healthStatus === 'healthy').length;
      const degradedFeatures = features.filter((f) => f.healthStatus === 'degraded').length;
      const downFeatures = features.filter((f) => f.healthStatus === 'down').length;

      const totalAlertsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(integrationAlerts)
        .where(
          and(
            eq(integrationAlerts.triggered, true),
            eq(integrationAlerts.resolved, false)
          )
        );

      const criticalAlertsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(integrationAlerts)
        .where(
          and(
            eq(integrationAlerts.triggered, true),
            eq(integrationAlerts.resolved, false),
            eq(integrationAlerts.severity, 'critical')
          )
        );

      return {
        features: featureData,
        systemHealth: {
          totalFeatures,
          healthyFeatures,
          degradedFeatures,
          downFeatures,
          totalAlerts: Number(totalAlertsResult[0]?.count || 0),
          criticalAlerts: Number(criticalAlertsResult[0]?.count || 0),
        },
      };
    } catch (error) {
      errorTracker.trackError(error as Error, {}, 'high', 'system');
      throw error;
    }
  }

  /**
   * Get feature metrics for a time range
   */
  async getFeatureMetrics(
    featureId: string,
    startTime: Date,
    endTime: Date
  ): Promise<FeatureMetric[]> {
    try {
      return await db
        .select()
        .from(featureMetrics)
        .where(
          and(
            eq(featureMetrics.featureId, featureId),
            gte(featureMetrics.timestamp, startTime),
            gte(endTime, featureMetrics.timestamp)
          )
        )
        .orderBy(featureMetrics.timestamp);
    } catch (error) {
      errorTracker.trackError(error as Error, { featureId }, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Get feature alerts
   */
  async getFeatureAlerts(
    featureId: string,
    resolved?: boolean
  ): Promise<IntegrationAlert[]> {
    try {
      const conditions = [eq(integrationAlerts.featureId, featureId)];

      if (resolved !== undefined) {
        conditions.push(eq(integrationAlerts.resolved, resolved));
      }

      return await db
        .select()
        .from(integrationAlerts)
        .where(and(...conditions))
        .orderBy(desc(integrationAlerts.created_at));
    } catch (error) {
      errorTracker.trackError(error as Error, { featureId }, 'medium', 'system');
      throw error;
    }
  }

  /**
   * Get feature logs
   */
  async getFeatureLogs(
    featureId: string,
    level?: string,
    limit: number = 100
  ): Promise<IntegrationLog[]> {
    try {
      const conditions = [eq(integrationLogs.featureId, featureId)];

      if (level) {
        conditions.push(eq(integrationLogs.level, level));
      }

      return await db
        .select()
        .from(integrationLogs)
        .where(and(...conditions))
        .orderBy(desc(integrationLogs.timestamp))
        .limit(limit);
    } catch (error) {
      errorTracker.trackError(error as Error, { featureId }, 'medium', 'system');
      throw error;
    }
  }
}

// Export singleton instance
export const integrationMonitor = new IntegrationMonitorService();
