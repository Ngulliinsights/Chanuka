import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { cacheService } from '@shared/core/caching';
import { logger } from '@server/infrastructure/observability';
import { database as db } from '@server/infrastructure/database/connection';
import { and, count, desc, eq, gt, gte, lte,or, sql } from "drizzle-orm";

import {
  type Sponsor,
  sponsors} from '@/shared/schema';

// Extended cache keys for monitoring features
const MONITORING_CACHE_KEYS = {
  REGULATORY_ALERTS: 'monitoring:alerts',
  MONITORING_REPORTS: 'monitoring:reports',
  STAKEHOLDER_ANALYSIS: 'monitoring:stakeholder',
  STRATEGIC_OPPORTUNITIES: 'monitoring:opportunities'
} as const;

// Extended cache TTL values
const MONITORING_CACHE_TTL = {
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
} as const;

// Define interfaces for regulation-related data since they're not exported
interface RegulationData {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  affectedSectors?: string[];
  requiresCompliance?: boolean;
  complianceDeadline?: Date;
  estimatedComplianceCost?: number;
  technologyRequirements?: string[];
  marketImpact?: 'high' | 'medium' | 'low';
  estimatedImpact?: number;
  affectedStakeholders?: number;
  budgetImpact?: number;
  effectiveDate?: Date;
}

// Enhanced interfaces with complete type definitions
export interface RegulatoryAlert {
  id: string;
  type: 'new_regulation' | 'regulatory_update' | 'impact_assessment' | 'strategic_opportunity' | 'deadline_approaching' | 'stakeholder_shift';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  regulationId?: string;
  sponsor_id?: string;
  created_at: Date;
  expires_at?: Date;
  isResolved: boolean;
  actionRequired: boolean;
  affectedSectors: string[];
  metadata?: Record<string, unknown>;
}

export interface StakeholderImpact {
  stakeholderType: 'business' | 'civil_society' | 'government' | 'individual' | 'industry_association';
  stakeholderName?: string;
  impactLevel: 'high' | 'medium' | 'low';
  impactType: 'regulatory_burden' | 'compliance_cost' | 'market_opportunity' | 'operational_change';
  description: string;
  opportunities: string[];
  risks: string[];
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  confidenceLevel: number;
  mitigationStrategies: string[];
}

export interface StrategicOpportunity {
  id: string;
  regulationId: string;
  opportunityType: 'capacity_increase' | 'pivot_required' | 'new_market' | 'partnership' | 'technology_adoption' | 'regulatory_arbitrage';
  title: string;
  description: string;
  potentialBenefit: string;
  quantifiedBenefit?: {
    metric: string;
    estimatedValue: number;
    currency?: string;
    timeframe: string;
  };
  timeframe: 'immediate' | 'short_term' | 'long_term';
  resourceRequirements: {
    financial: string;
    human: string;
    technological: string;
    regulatory: string;
  };
  riskFactors: string[];
  successProbability: number;
  competitiveAdvantage: string;
}

export interface MonitoringReport {
  id: string;
  generatedAt: Date;
  reportType: 'daily' | 'weekly' | 'monthly' | 'ad_hoc';
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    newRegulations: number;
    updatedRegulations: number;
    alertsGenerated: number;
    criticalAlerts: number;
    opportunitiesIdentified: number;
    stakeholdersAffected: number;
  };
  keyFindings: string[];
  trends: {
    regulatoryActivity: 'increasing' | 'stable' | 'decreasing';
    sectorFocus: string[];
    emergingThemes: string[];
  };
  recommendations: string[];
  alerts: RegulatoryAlert[];
  opportunities: StrategicOpportunity[];
}

export class RegulatoryChangeMonitoringService {
  private readonly MONITORING_INTERVALS = {
    DAILY_CHECK: 24 * 60 * 60 * 1000,
    WEEKLY_ANALYSIS: 7 * 24 * 60 * 60 * 1000,
    MONTHLY_REVIEW: 30 * 24 * 60 * 60 * 1000
  };

  private readonly SEVERITY_THRESHOLDS = {
    CRITICAL_IMPACT_SCORE: 8.0,
    WARNING_IMPACT_SCORE: 5.0,
    STAKEHOLDER_COUNT_CRITICAL: 100,
    DAYS_UNTIL_DEADLINE_CRITICAL: 7,
    DAYS_UNTIL_DEADLINE_WARNING: 30
  };

  // Use NodeJS.Timeout instead of NodeJS.Timer for proper typing
  private monitoringTimer: NodeJS.Timeout | null = null;
  private weeklyTimer: NodeJS.Timeout | null = null;
  private monthlyTimer: NodeJS.Timeout | null = null;

  /**
   * Start comprehensive automated monitoring system for regulatory changes.
   * This creates a multi-layered monitoring approach that catches different
   * types of changes at appropriate intervals.
   */
  startAutomatedMonitoring(): void {
    logger.info('Starting comprehensive regulatory change monitoring system...', { component: 'Chanuka' });

    // Daily monitoring for immediate changes and urgent alerts
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performDailyMonitoring();
      } catch (error) {
  logger.error('Error in daily monitoring:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }, this.MONITORING_INTERVALS.DAILY_CHECK);

    // Weekly analysis for trend identification and strategic planning
    this.weeklyTimer = setInterval(async () => {
      try {
        await this.performWeeklyAnalysis();
      } catch (error) {
  logger.error('Error in weekly analysis:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }, this.MONITORING_INTERVALS.WEEKLY_ANALYSIS);

    // Monthly review for comprehensive strategic assessment
    this.monthlyTimer = setInterval(async () => {
      try {
        await this.performMonthlyReview();
      } catch (error) {
  logger.error('Error in monthly review:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }, this.MONITORING_INTERVALS.MONTHLY_REVIEW);

    // Run initial monitoring to establish baseline
    this.performDailyMonitoring().catch(error => {
      logger.error('Error in initial monitoring run:', { component: 'Chanuka' }, error);
    });
  }

  /**
   * Stop all automated monitoring processes cleanly
   */
  stopAutomatedMonitoring(): void {
    logger.info('Stopping regulatory change monitoring system...', { component: 'Chanuka' });

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      logger.info('Daily monitoring stopped', { component: 'Chanuka' });
    }

    if (this.weeklyTimer) {
      clearInterval(this.weeklyTimer);
      this.weeklyTimer = null;
      logger.info('Weekly analysis stopped', { component: 'Chanuka' });
    }

    if (this.monthlyTimer) {
      clearInterval(this.monthlyTimer);
      this.monthlyTimer = null;
      logger.info('Monthly review stopped', { component: 'Chanuka' });
    }

    logger.info('All automated regulatory change monitoring stopped.', { component: 'Chanuka' });
  }

  // Report generation and analysis methods

  private generateKeyFindings(
    newRegulations: RegulationData[], 
    updatedRegulations: RegulationData[], 
    alerts: RegulatoryAlert[]
  ): string[] {
    const findings: string[] = [];

    if (newRegulations.length > 0) {
      findings.push(
        `${newRegulations.length} new regulations introduced, focusing on ${this.identifyDominantSectors(newRegulations).join(', ')}`
      );
    }

    if (updatedRegulations.length > 0) {
      const criticalUpdates = updatedRegulations.filter(reg => 
        this.calculateUpdateSeverity(reg) === 'critical'
      );
      if (criticalUpdates.length > 0) {
        findings.push(
          `${criticalUpdates.length} critical regulatory updates require immediate attention`
        );
      }
    }

    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0) {
      findings.push(
        `${criticalAlerts.length} critical alerts generated requiring urgent action`
      );
    }

    return findings;
  }

  private async analyzeDailyTrends(
    newRegulations: RegulationData[], 
    updatedRegulations: RegulationData[]
  ): Promise<MonitoringReport['trends']> {
    const allRegulations = [...newRegulations, ...updatedRegulations];

    return {
      regulatoryActivity: this.assessActivityLevel(allRegulations.length),
      sectorFocus: this.identifyDominantSectors(allRegulations),
      emergingThemes: await this.identifyDailyThemes(allRegulations)
    };
  }

  private generateDailyRecommendations(alerts: RegulatoryAlert[]): string[] {
    const recommendations: string[] = [];

    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(
        'Immediate review of critical alerts required - assign responsible teams'
      );
    }

    const deadlineAlerts = alerts.filter(alert => alert.type === 'deadline_approaching');
    if (deadlineAlerts.length > 0) {
      recommendations.push(
        'Prepare compliance documentation for approaching deadlines'
      );
    }

    const opportunityAlerts = alerts.filter(alert => alert.type === 'strategic_opportunity');
    if (opportunityAlerts.length > 0) {
      recommendations.push(
        'Evaluate strategic opportunities for business development potential'
      );
    }

    return recommendations;
  }

  private assessActivityLevel(regulationCount: number): 'increasing' | 'stable' | 'decreasing' {
    // Compare against historical averages using simple thresholds
    // In production, this would use historical data analysis
    if (regulationCount > 5) return 'increasing';
    if (regulationCount < 2) return 'decreasing';
    return 'stable';
  }

  private identifyDominantSectors(regulations: RegulationData[]): string[] {
    const sectorCount: Record<string, number> = {};

    regulations.forEach(reg => {
      const sectors = reg.affectedSectors || [];
      sectors.forEach((sector: string) => {
        sectorCount[sector] = (sectorCount[sector] || 0) + 1;
      });
    });

    return Object.entries(sectorCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([sector]) => sector);
  }

  private async identifyDailyThemes(regulations: RegulationData[]): Promise<string[]> {
    const themes: Set<string> = new Set();

    // Analyze regulation content for common themes
    // This would use more sophisticated NLP in production
    regulations.forEach(reg => {
      const content = `${reg.title} ${reg.description}`.toLowerCase();
      
      if (content.includes('environment') || content.includes('climate')) {
        themes.add('environmental_compliance');
      }
      if (content.includes('digital') || content.includes('technology')) {
        themes.add('digital_transformation');
      }
      if (content.includes('financial') || content.includes('reporting')) {
        themes.add('financial_transparency');
      }
      if (content.includes('public') || content.includes('citizen')) {
        themes.add('citizen_engagement');
      }
      if (content.includes('data') || content.includes('privacy')) {
        themes.add('data_privacy');
      }
    });

    return Array.from(themes);
  }

  // Storage and persistence methods

  private async storeMonitoringReport(report: MonitoringReport): Promise<void> {
    try {
      // Store in cache for quick access
      const cacheKey = `${MONITORING_CACHE_KEYS.MONITORING_REPORTS}:${report.reportType}:${report.id}`;
      await cacheService.set(cacheKey, report, MONITORING_CACHE_TTL.WEEK);

      console.log(`Stored ${report.reportType} monitoring report: ${report.id}`);
    } catch (error) {
  logger.error('Error storing monitoring report:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    }
  }

  // Public API methods for external access

  /**
   * Get all active alerts, optionally filtered by severity or type
   */
  async getActiveAlerts(filters?: {
    severity?: RegulatoryAlert['severity'];
    type?: RegulatoryAlert['type'];
    limit?: number;
  }): Promise<RegulatoryAlert[]> {
    try {
      // Note: This assumes cacheService has been extended with a keys() method
      // If not available, you'll need to maintain an index of alert IDs
      const alerts: RegulatoryAlert[] = [];
      
      // Placeholder for retrieving alerts from cache
      // In production, you'd maintain an index or use a database query
      
      let filteredAlerts = alerts;
      if (filters?.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters?.type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
      }

      filteredAlerts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      if (filters?.limit) {
        filteredAlerts = filteredAlerts.slice(0, filters.limit);
      }

      return filteredAlerts;
    } catch (error) {
  logger.error('Error retrieving active alerts:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return [];
    }
  }

  /**
   * Resolve an alert by ID
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const cacheKey = `${MONITORING_CACHE_KEYS.REGULATORY_ALERTS}:${alertId}`;
      const alert = await cacheService.get<RegulatoryAlert>(cacheKey);

      if (!alert) {
        console.warn(`Alert ${alertId} not found`);
        return false;
      }

      alert.isResolved = true;
      await cacheService.set(cacheKey, alert, MONITORING_CACHE_TTL.WEEK);

      console.log(`Resolved alert: ${alertId}`);
      return true;
    } catch (error) {
      logger.error(`Error resolving alert ${alertId}`, { component: 'regulatory-change-monitoring', alertId, error });
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), { component: 'regulatory-change-monitoring', alertId });
        }
      } catch (reportErr) {
        logger.warn('Failed to report resolveAlert error to errorTracker', { reportErr });
      }
      return false;
    }
  }

  /**
   * Create and store a new regulatory alert with enhanced metadata.
   */
  async createRegulatoryAlert(
    type: RegulatoryAlert['type'],
    title: string,
    description: string,
    severity: RegulatoryAlert['severity'] = 'info',
    options: {
      regulationId?: string;
      sponsor_id?: string;
      expires_at?: Date;
      actionRequired?: boolean;
      affectedSectors?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<RegulatoryAlert> {
    const alert: RegulatoryAlert = {
      id: `reg_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      severity,
      regulationId: options.regulationId,
      sponsor_id: options.sponsor_id,
      created_at: new Date(),
      expires_at: options.expires_at,
      isResolved: false,
      actionRequired: options.actionRequired ?? (severity === 'critical'),
      affectedSectors: options.affectedSectors ?? [],
      metadata: options.metadata
    };

    await cacheService.set(
      `${MONITORING_CACHE_KEYS.REGULATORY_ALERTS}:${alert.id}`,
      alert,
      MONITORING_CACHE_TTL.WEEK
    );

    console.log(`Created ${severity} alert: ${title}`);
    return alert;
  }

  /**
   * Comprehensive stakeholder impact analysis
   */
  async analyzeStakeholderImpact(regulationId: string): Promise<StakeholderImpact[]> {
    const cacheKey = `${MONITORING_CACHE_KEYS.STAKEHOLDER_ANALYSIS}:${regulationId}`;
    const cached = await cacheService.get<StakeholderImpact[]>(cacheKey);
    if (cached) return cached;

    try {
      // This would query the actual regulations table in production
      // For now, returning a placeholder structure
      const impacts: StakeholderImpact[] = [];

      await cacheService.set(cacheKey, impacts, MONITORING_CACHE_TTL.HOUR * 2);
      return impacts;
    } catch (error) {
      logger.error(`Error analyzing stakeholder impact for regulation ${regulationId}`, { component: 'regulatory-change-monitoring', regulationId, error });
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), { component: 'regulatory-change-monitoring', regulationId });
        }
      } catch (reportErr) {
        logger.warn('Failed to report stakeholder impact error to errorTracker', { reportErr });
      }
      return [];
    }
  }

  /**
   * Identify strategic opportunities arising from regulatory changes
   */
  async identifyStrategicOpportunities(regulationId: string): Promise<StrategicOpportunity[]> {
    const cacheKey = `${MONITORING_CACHE_KEYS.STRATEGIC_OPPORTUNITIES}:${regulationId}`;
    const cached = await cacheService.get<StrategicOpportunity[]>(cacheKey);
    if (cached) return cached;

    try {
      const opportunities: StrategicOpportunity[] = [];

      await cacheService.set(cacheKey, opportunities, MONITORING_CACHE_TTL.HOUR * 4);
      return opportunities;
    } catch (error) {
      logger.error(`Error identifying strategic opportunities for regulation ${regulationId}`, { component: 'regulatory-change-monitoring', regulationId, error });
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), { component: 'regulatory-change-monitoring', regulationId });
        }
      } catch (reportErr) {
        logger.warn('Failed to report strategic opportunities error to errorTracker', { reportErr });
      }
      return [];
    }
  }

  /**
   * Daily monitoring performs immediate-response monitoring for urgent changes
   */
  private async performDailyMonitoring(): Promise<MonitoringReport> {
    logger.info('Performing daily regulatory change monitoring...', { component: 'Chanuka' });

    const startTime = new Date();
    const cutoffTime = new Date(startTime.getTime() - this.MONITORING_INTERVALS.DAILY_CHECK);

    try {
      // Note: These methods would need access to the actual regulations table
      // You'll need to either export the table from schema or query it differently
      const newRegulations: RegulationData[] = [];
      const updatedRegulations: RegulationData[] = [];
      const approachingDeadlines: Array<{regulationId: string, title: string, deadline: Date}> = [];

      const alerts: RegulatoryAlert[] = [];

      const report: MonitoringReport = {
        id: `daily_${Date.now()}`,
        generatedAt: new Date(),
        reportType: 'daily',
        timeRange: { start: cutoffTime, end: startTime },
        summary: {
          newRegulations: newRegulations.length,
          updatedRegulations: updatedRegulations.length,
          alertsGenerated: alerts.length,
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          opportunitiesIdentified: 0,
          stakeholdersAffected: 0
        },
        keyFindings: this.generateKeyFindings(newRegulations, updatedRegulations, alerts),
        trends: await this.analyzeDailyTrends(newRegulations, updatedRegulations),
        recommendations: this.generateDailyRecommendations(alerts),
        alerts,
        opportunities: []
      };

      await this.storeMonitoringReport(report);

      console.log(`Daily monitoring completed. Generated ${alerts.length} alerts.`);
      return report;
    } catch (error) {
  logger.error('Error in daily monitoring:', { component: 'Chanuka', error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  /**
   * Weekly analysis focuses on trend identification and strategic planning
   */
  private async performWeeklyAnalysis(): Promise<MonitoringReport> {
    logger.info('Performing weekly regulatory trend analysis...', { component: 'Chanuka' });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.MONITORING_INTERVALS.WEEKLY_ANALYSIS);

    const report: MonitoringReport = {
      id: `weekly_${Date.now()}`,
      generatedAt: new Date(),
      reportType: 'weekly',
      timeRange: { start: startTime, end: endTime },
      summary: {
        newRegulations: 0,
        updatedRegulations: 0,
        alertsGenerated: 0,
        criticalAlerts: 0,
        opportunitiesIdentified: 0,
        stakeholdersAffected: 0
      },
      keyFindings: [],
      trends: {
        regulatoryActivity: 'stable',
        sectorFocus: [],
        emergingThemes: []
      },
      recommendations: [],
      alerts: [],
      opportunities: []
    };

    await this.storeMonitoringReport(report);
    logger.info('Weekly analysis completed', { component: 'Chanuka' });
    return report;
  }

  /**
   * Monthly review provides comprehensive strategic assessment
   */
  private async performMonthlyReview(): Promise<MonitoringReport> {
    logger.info('Performing monthly regulatory review...', { component: 'Chanuka' });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.MONITORING_INTERVALS.MONTHLY_REVIEW);

    const report: MonitoringReport = {
      id: `monthly_${Date.now()}`,
      generatedAt: new Date(),
      reportType: 'monthly',
      timeRange: { start: startTime, end: endTime },
      summary: {
        newRegulations: 0,
        updatedRegulations: 0,
        alertsGenerated: 0,
        criticalAlerts: 0,
        opportunitiesIdentified: 0,
        stakeholdersAffected: 0
      },
      keyFindings: [],
      trends: {
        regulatoryActivity: 'stable',
        sectorFocus: [],
        emergingThemes: []
      },
      recommendations: [],
      alerts: [],
      opportunities: []
    };

    await this.storeMonitoringReport(report);
    logger.info('Monthly review completed', { component: 'Chanuka' });
    return report;
  }

  // Utility methods

  private calculateUpdateSeverity(regulation: RegulationData): 'info' | 'warning' | 'critical' {
    // Determine severity based on regulation characteristics
    const hasHighImpact = (regulation.estimatedImpact ?? 0) > this.SEVERITY_THRESHOLDS.CRITICAL_IMPACT_SCORE;
    const affectsMany = (regulation.affectedStakeholders ?? 0) > this.SEVERITY_THRESHOLDS.STAKEHOLDER_COUNT_CRITICAL;
    
    if (hasHighImpact || affectsMany) return 'critical';
    if ((regulation.estimatedImpact ?? 0) > this.SEVERITY_THRESHOLDS.WARNING_IMPACT_SCORE) return 'warning';
    return 'info';
  }
}

// Export singleton instance
export const regulatoryChangeMonitoringService = new RegulatoryChangeMonitoringService();

















































