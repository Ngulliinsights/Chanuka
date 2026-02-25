/**
 * USSD Analytics
 * 
 * Track and analyze USSD usage patterns
 */

import { logger } from '@server/infrastructure/observability';
import type { USSDAnalytics, USSDSession } from './ussd.types';

export class USSDAnalyticsService {
  private analytics: USSDAnalytics[] = [];
  private readonly maxStoredAnalytics = 10000;

  /**
   * Track session completion
   */
  trackSession(session: USSDSession, completed: boolean): void {
    const analytics: USSDAnalytics = {
      sessionId: session.sessionId,
      phoneNumber: this.anonymizePhoneNumber(session.phoneNumber),
      menuPath: session.menuHistory,
      duration: Date.now() - session.createdAt.getTime(),
      completed,
      language: session.language,
      timestamp: new Date()
    };

    this.analytics.push(analytics);

    // Trim if exceeds max
    if (this.analytics.length > this.maxStoredAnalytics) {
      this.analytics = this.analytics.slice(-this.maxStoredAnalytics);
    }

    logger.info(
      {
        component: 'USSDAnalytics',
        sessionId: session.sessionId,
        duration: analytics.duration,
        completed
      },
      'Session tracked'
    );
  }

  /**
   * Get usage statistics
   */
  getStatistics(): {
    totalSessions: number;
    completedSessions: number;
    averageDuration: number;
    popularMenus: Record<string, number>;
    languageDistribution: Record<string, number>;
  } {
    const totalSessions = this.analytics.length;
    const completedSessions = this.analytics.filter(a => a.completed).length;
    const averageDuration = totalSessions > 0
      ? this.analytics.reduce((sum, a) => sum + a.duration, 0) / totalSessions
      : 0;

    const popularMenus: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};

    for (const analytics of this.analytics) {
      // Count menu visits
      for (const menu of analytics.menuPath) {
        popularMenus[menu] = (popularMenus[menu] || 0) + 1;
      }

      // Count language usage
      languageDistribution[analytics.language] = (languageDistribution[analytics.language] || 0) + 1;
    }

    return {
      totalSessions,
      completedSessions,
      averageDuration,
      popularMenus,
      languageDistribution
    };
  }

  /**
   * Anonymize phone number for privacy
   */
  private anonymizePhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.substring(0, 4) + '****' + phoneNumber.substring(phoneNumber.length - 2);
  }

  /**
   * Clear old analytics data
   */
  clearOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const before = this.analytics.length;
    this.analytics = this.analytics.filter(a => a.timestamp >= cutoffDate);
    const removed = before - this.analytics.length;

    if (removed > 0) {
      logger.info({ component: 'USSDAnalytics', removed }, 'Cleared old analytics data');
    }
  }
}

export const ussdAnalytics = new USSDAnalyticsService();

// Clean up old data daily
setInterval(() => {
  ussdAnalytics.clearOldData(30);
}, 24 * 60 * 60 * 1000);
