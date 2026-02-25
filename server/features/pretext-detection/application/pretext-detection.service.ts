/**
 * Pretext Detection Application Service
 * 
 * Orchestrates pretext detection workflows
 */

import { logger } from '@server/infrastructure/observability';
import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';
import { EnhancedNotificationService } from '@server/infrastructure/notifications/enhanced-notification.service';
import { PretextAnalysisService } from '../domain/pretext-analysis.service';
import { PretextRepository } from '../infrastructure/pretext-repository';
import { PretextCache } from '../infrastructure/pretext-cache';
import type {
  PretextAnalysisInput,
  PretextAnalysisResult,
  PretextAlert,
  PretextReviewInput
} from '../domain/types';

export class PretextDetectionService {
  private analysisService: PretextAnalysisService;
  private repository: PretextRepository;
  private cache: PretextCache;
  private notificationService: EnhancedNotificationService;
  private readonly ALERT_THRESHOLD = 60; // Score threshold for creating alerts

  constructor() {
    this.analysisService = new PretextAnalysisService();
    this.repository = new PretextRepository();
    this.cache = new PretextCache();
    this.notificationService = new EnhancedNotificationService();
  }

  /**
   * Analyze a bill for pretext indicators
   */
  async analyze(input: PretextAnalysisInput): Promise<PretextAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check cache first (unless force is true)
      if (!input.force) {
        const cached = await this.cache.get(input.billId);
        if (cached) {
          const responseTime = Date.now() - startTime;
          await integrationMonitor.recordMetrics('pretext-detection', {
            activeUsers: 0,
            totalRequests: 1,
            successfulRequests: 1,
            failedRequests: 0
          }, {
            avgResponseTime: responseTime,
            p95ResponseTime: responseTime,
            p99ResponseTime: responseTime
          });
          return cached;
        }
      }

      // Run analysis
      const result = await this.analysisService.analyzeBill(input);

      // Save to database
      await this.repository.saveAnalysis(result);

      // Cache result
      await this.cache.set(input.billId, result);

      // Create alert if score exceeds threshold
      if (result.score >= this.ALERT_THRESHOLD) {
        await this.createAlert(result);
      }

      // Record metrics
      const responseTime = Date.now() - startTime;
      await integrationMonitor.recordMetrics('pretext-detection', {
        activeUsers: 0,
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 0
      }, {
        avgResponseTime: responseTime,
        p95ResponseTime: responseTime,
        p99ResponseTime: responseTime
      });

      await integrationMonitor.logEvent(
        'pretext-detection',
        'info',
        'analysis',
        'Analysis completed',
        {
          billId: input.billId,
          score: result.score,
          detectionsCount: result.detections.length,
          responseTime
        }
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await integrationMonitor.recordMetrics('pretext-detection', {
        activeUsers: 0,
        totalRequests: 1,
        successfulRequests: 0,
        failedRequests: 1
      }, {
        avgResponseTime: responseTime,
        p95ResponseTime: responseTime,
        p99ResponseTime: responseTime
      });

      await integrationMonitor.logEvent(
        'pretext-detection',
        'error',
        'analysis',
        'Analysis failed',
        {
          billId: input.billId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      throw error;
    }
  }

  /**
   * Get alerts
   */
  async getAlerts(filters?: { status?: string; limit?: number }): Promise<PretextAlert[]> {
    try {
      const alerts = await this.repository.getAlerts(filters);

      await integrationMonitor.logEvent(
        'pretext-detection',
        'info',
        'alerts',
        'Alerts retrieved',
        {
          count: alerts.length,
          filters
        }
      );

      return alerts;
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to get alerts');
      throw error;
    }
  }

  /**
   * Review an alert
   */
  async reviewAlert(input: PretextReviewInput): Promise<void> {
    try {
      await this.repository.updateAlertStatus(
        input.alertId,
        input.status,
        input.reviewedBy,
        input.notes
      );

      await integrationMonitor.logEvent(
        'pretext-detection',
        'info',
        'review',
        'Alert reviewed',
        {
          alertId: input.alertId,
          status: input.status,
          reviewedBy: input.reviewedBy
        }
      );

      // Send notification about review decision
      await this.sendReviewNotification(input);
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to review alert');
      throw error;
    }
  }

  /**
   * Create alert from analysis result
   */
  private async createAlert(result: PretextAnalysisResult): Promise<void> {
    try {
      const alert = await this.repository.createAlert({
        billId: result.billId,
        detections: result.detections,
        score: result.score,
        status: 'pending'
      });

      logger.info({
        component: 'PretextDetectionService',
        billId: result.billId,
        score: result.score
      }, 'Alert created');

      // Send notification about new alert
      await this.sendAlertNotification(alert, result);
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to create alert');
      // Don't throw - alert creation failure shouldn't fail the analysis
    }
  }

  /**
   * Send notification when alert is created
   */
  private async sendAlertNotification(alert: PretextAlert, result: PretextAnalysisResult): Promise<void> {
    try {
      const billId = result.billId;
      const severity = this.getAlertSeverity(result.score);
      
      // Get admin users from repository
      const adminUsers = await this.repository.getAdminUsers();
      
      // Send notification to each admin
      for (const adminUser of adminUsers) {
        await this.notificationService.send({
          id: `pretext-alert-${alert.id}-${adminUser.id}`,
          userId: adminUser.id,
          type: 'in-app',
          title: `Pretext Detection Alert: ${severity.toUpperCase()} Risk`,
          message: `Bill ${billId} has been flagged with a risk score of ${result.score}. ${result.detections.length} potential issues detected.`,
          data: {
            alertId: alert.id,
            billId,
            score: result.score,
            severity,
            detectionsCount: result.detections.length,
            detections: result.detections
          },
          priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'medium'
        });
      }

      logger.info({
        component: 'PretextDetectionService',
        alertId: alert.id,
        billId,
        severity,
        notifiedAdmins: adminUsers.length
      }, 'Alert notifications sent to admins');
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to send alert notification');
      // Don't throw - notification failure shouldn't fail alert creation
    }
  }

  /**
   * Send notification when alert is reviewed
   */
  private async sendReviewNotification(input: PretextReviewInput): Promise<void> {
    try {
      // Get the alert details
      const alert = await this.repository.getAlertById(input.alertId);
      if (!alert) {
        logger.warn({
          component: 'PretextDetectionService',
          alertId: input.alertId
        }, 'Alert not found for review notification');
        return;
      }

      // Get users who should be notified about the review
      const interestedUsers = await this.repository.getUsersInterestedInBill(alert.billId);
      
      // Send notification to interested users
      for (const user of interestedUsers) {
        await this.notificationService.send({
          id: `pretext-review-${input.alertId}-${user.id}`,
          userId: user.id,
          type: 'in-app',
          title: `Pretext Alert ${input.status === 'approved' ? 'Confirmed' : 'Dismissed'}`,
          message: `A pretext detection alert for Bill ${alert.billId} has been ${input.status} by an administrator.${input.notes ? ` Note: ${input.notes}` : ''}`,
          data: {
            alertId: input.alertId,
            billId: alert.billId,
            status: input.status,
            reviewedBy: input.reviewedBy,
            notes: input.notes
          },
          priority: input.status === 'approved' ? 'high' : 'medium'
        });
      }

      logger.info({
        component: 'PretextDetectionService',
        alertId: input.alertId,
        status: input.status,
        notifiedUsers: interestedUsers.length
      }, 'Review notifications sent');
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to send review notification');
      // Don't throw - notification failure shouldn't fail review
    }
  }

  /**
   * Get alert severity based on score
   */
  private getAlertSeverity(score: number): string {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Get analytics
   */
  async getAnalytics(startDate?: Date, endDate?: Date) {
    try {
      // Get metrics from monitoring service
      const metrics = await integrationMonitor.getFeatureMetrics(
        'pretext-detection',
        startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      return {
        metrics,
        cacheStats: this.cache.getStats()
      };
    } catch (error) {
      logger.error({
        component: 'PretextDetectionService',
        error
      }, 'Failed to get analytics');
      throw error;
    }
  }
}
