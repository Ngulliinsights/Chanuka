import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';

// ============================================================================
// CONSTANTS
// ============================================================================

const MONITORING_CACHE_KEYS = {
  REGULATORY_ALERTS:       'monitoring:alerts',
  MONITORING_REPORTS:      'monitoring:reports',
  STAKEHOLDER_ANALYSIS:    'monitoring:stakeholder',
  STRATEGIC_OPPORTUNITIES: 'monitoring:opportunities',
} as const;

const MONITORING_CACHE_TTL = {
  HOUR: 60 * 60 * 1000,
  DAY:  24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

const COMPONENT = 'RegulatoryChangeMonitoringService';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

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

// ============================================================================
// PUBLIC INTERFACES
// ============================================================================

export interface RegulatoryAlert {
  id: string;
  type:
    | 'new_regulation'
    | 'regulatory_update'
    | 'impact_assessment'
    | 'strategic_opportunity'
    | 'deadline_approaching'
    | 'stakeholder_shift';
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
  opportunityType:
    | 'capacity_increase'
    | 'pivot_required'
    | 'new_market'
    | 'partnership'
    | 'technology_adoption'
    | 'regulatory_arbitrage';
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
  timeRange: { start: Date; end: Date };
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

// ============================================================================
// SERVICE
// ============================================================================

export class RegulatoryChangeMonitoringService {
  private readonly MONITORING_INTERVALS = {
    DAILY_CHECK:     24 * 60 * 60 * 1000,
    WEEKLY_ANALYSIS:  7 * 24 * 60 * 60 * 1000,
    MONTHLY_REVIEW:  30 * 24 * 60 * 60 * 1000,
  };

  private readonly SEVERITY_THRESHOLDS = {
    CRITICAL_IMPACT_SCORE:        8.0,
    WARNING_IMPACT_SCORE:         5.0,
    STAKEHOLDER_COUNT_CRITICAL:   100,
    DAYS_UNTIL_DEADLINE_CRITICAL: 7,
    DAYS_UNTIL_DEADLINE_WARNING:  30,
  };

  private monitoringTimer: NodeJS.Timeout | null = null;
  private weeklyTimer:     NodeJS.Timeout | null = null;
  private monthlyTimer:    NodeJS.Timeout | null = null;

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Start the multi-layered automated monitoring system.
   * Daily: urgent changes and immediate alerts.
   * Weekly: trend identification and strategic planning.
   * Monthly: comprehensive strategic assessment.
   */
  startAutomatedMonitoring(): void {
    logger.info({ component: COMPONENT }, 'Starting comprehensive regulatory change monitoring system...');

    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performDailyMonitoring();
      } catch (error) {
        logger.error(
          { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
          'Error in daily monitoring',
        );
      }
    }, this.MONITORING_INTERVALS.DAILY_CHECK);

    this.weeklyTimer = setInterval(async () => {
      try {
        await this.performWeeklyAnalysis();
      } catch (error) {
        logger.error(
          { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
          'Error in weekly analysis',
        );
      }
    }, this.MONITORING_INTERVALS.WEEKLY_ANALYSIS);

    this.monthlyTimer = setInterval(async () => {
      try {
        await this.performMonthlyReview();
      } catch (error) {
        logger.error(
          { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
          'Error in monthly review',
        );
      }
    }, this.MONITORING_INTERVALS.MONTHLY_REVIEW);

    // Establish baseline immediately.
    this.performDailyMonitoring().catch((error) => {
      logger.error({ component: COMPONENT, error }, 'Error in initial monitoring run');
    });
  }

  /**
   * Stop all automated monitoring processes cleanly.
   */
  stopAutomatedMonitoring(): void {
    logger.info({ component: COMPONENT }, 'Stopping regulatory change monitoring system...');

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      logger.info({ component: COMPONENT }, 'Daily monitoring stopped');
    }

    if (this.weeklyTimer) {
      clearInterval(this.weeklyTimer);
      this.weeklyTimer = null;
      logger.info({ component: COMPONENT }, 'Weekly analysis stopped');
    }

    if (this.monthlyTimer) {
      clearInterval(this.monthlyTimer);
      this.monthlyTimer = null;
      logger.info({ component: COMPONENT }, 'Monthly review stopped');
    }

    logger.info({ component: COMPONENT }, 'All automated regulatory change monitoring stopped.');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all active (unresolved) alerts, with optional filtering by severity,
   * type, and result count.
   */
  async getActiveAlerts(filters?: {
    severity?: RegulatoryAlert['severity'];
    type?: RegulatoryAlert['type'];
    limit?: number;
  }): Promise<RegulatoryAlert[]> {
    try {
      // Production: maintain a cache index key or query the DB for unresolved alerts.
      let alerts: RegulatoryAlert[] = [];

      if (filters?.severity) alerts = alerts.filter((a) => a.severity === filters.severity);
      if (filters?.type)     alerts = alerts.filter((a) => a.type     === filters.type);

      alerts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      if (filters?.limit) alerts = alerts.slice(0, filters.limit);

      return alerts;
    } catch (error) {
      logger.error(
        { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
        'Error retrieving active alerts',
      );
      return [];
    }
  }

  /**
   * Resolve an alert by ID. Returns true on success.
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const cacheKey = `${MONITORING_CACHE_KEYS.REGULATORY_ALERTS}:${alertId}`;
      const alert    = await cacheService.get<RegulatoryAlert>(cacheKey);

      if (!alert) {
        logger.warn({ component: COMPONENT, alertId }, `Alert ${alertId} not found`);
        return false;
      }

      alert.isResolved = true;
      await cacheService.set(cacheKey, alert, MONITORING_CACHE_TTL.WEEK);

      logger.info({ component: COMPONENT, alertId }, `Resolved alert: ${alertId}`);
      return true;
    } catch (error) {
      logger.error(
        { component: COMPONENT, alertId, error },
        `Error resolving alert ${alertId}`,
      );
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(
            error instanceof Error ? error : new Error(String(error)),
            { component: COMPONENT, alertId },
          );
        }
      } catch (reportErr) {
        logger.warn({ reportErr }, 'Failed to report resolveAlert error to errorTracker');
      }
      return false;
    }
  }

  /**
   * Create and cache a new regulatory alert.
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
    } = {},
  ): Promise<RegulatoryAlert> {
    const alert: RegulatoryAlert = {
      id:              `reg_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      severity,
      regulationId:    options.regulationId,
      sponsor_id:      options.sponsor_id,
      created_at:      new Date(),
      expires_at:      options.expires_at,
      isResolved:      false,
      actionRequired:  options.actionRequired ?? severity === 'critical',
      affectedSectors: options.affectedSectors ?? [],
      metadata:        options.metadata,
    };

    await cacheService.set(
      `${MONITORING_CACHE_KEYS.REGULATORY_ALERTS}:${alert.id}`,
      alert,
      MONITORING_CACHE_TTL.WEEK,
    );

    logger.info({ component: COMPONENT, alertId: alert.id, severity }, `Created ${severity} alert: ${title}`);
    return alert;
  }

  /**
   * Comprehensive stakeholder impact analysis for a given regulation.
   */
  async analyzeStakeholderImpact(regulationId: string): Promise<StakeholderImpact[]> {
    const cacheKey = `${MONITORING_CACHE_KEYS.STAKEHOLDER_ANALYSIS}:${regulationId}`;
    const cached   = await cacheService.get<StakeholderImpact[]>(cacheKey);
    if (cached) return cached;

    try {
      const impacts: StakeholderImpact[] = [];
      await cacheService.set(cacheKey, impacts, MONITORING_CACHE_TTL.HOUR * 2);
      return impacts;
    } catch (error) {
      logger.error(
        { component: COMPONENT, regulationId, error },
        `Error analyzing stakeholder impact for regulation ${regulationId}`,
      );
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(
            error instanceof Error ? error : new Error(String(error)),
            { component: COMPONENT, regulationId },
          );
        }
      } catch (reportErr) {
        logger.warn({ reportErr }, 'Failed to report stakeholder impact error to errorTracker');
      }
      return [];
    }
  }

  /**
   * Identify strategic opportunities arising from a regulatory change.
   */
  async identifyStrategicOpportunities(regulationId: string): Promise<StrategicOpportunity[]> {
    const cacheKey = `${MONITORING_CACHE_KEYS.STRATEGIC_OPPORTUNITIES}:${regulationId}`;
    const cached   = await cacheService.get<StrategicOpportunity[]>(cacheKey);
    if (cached) return cached;

    try {
      const opportunities: StrategicOpportunity[] = [];
      await cacheService.set(cacheKey, opportunities, MONITORING_CACHE_TTL.HOUR * 4);
      return opportunities;
    } catch (error) {
      logger.error(
        { component: COMPONENT, regulationId, error },
        `Error identifying strategic opportunities for regulation ${regulationId}`,
      );
      try {
        if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(
            error instanceof Error ? error : new Error(String(error)),
            { component: COMPONENT, regulationId },
          );
        }
      } catch (reportErr) {
        logger.warn({ reportErr }, 'Failed to report strategic opportunities error to errorTracker');
      }
      return [];
    }
  }

  // ============================================================================
  // PRIVATE — SCHEDULED JOBS
  // ============================================================================

  private async performDailyMonitoring(): Promise<MonitoringReport> {
    logger.info({ component: COMPONENT }, 'Performing daily regulatory change monitoring...');

    const startTime  = new Date();
    const cutoffTime = new Date(startTime.getTime() - this.MONITORING_INTERVALS.DAILY_CHECK);

    try {
      // Production: query regulations table for rows newer than cutoffTime.
      const newRegulations:     RegulationData[] = [];
      const updatedRegulations: RegulationData[] = [];
      const alerts:             RegulatoryAlert[] = [];

      const report: MonitoringReport = {
        id:          `daily_${Date.now()}`,
        generatedAt: new Date(),
        reportType:  'daily',
        timeRange:   { start: cutoffTime, end: startTime },
        summary: {
          newRegulations:          newRegulations.length,
          updatedRegulations:      updatedRegulations.length,
          alertsGenerated:         alerts.length,
          criticalAlerts:          alerts.filter((a) => a.severity === 'critical').length,
          opportunitiesIdentified: 0,
          stakeholdersAffected:    0,
        },
        keyFindings:     this.generateKeyFindings(newRegulations, updatedRegulations, alerts),
        trends:          await this.analyzeDailyTrends(newRegulations, updatedRegulations),
        recommendations: this.generateDailyRecommendations(alerts),
        alerts,
        opportunities:   [],
      };

      await this.storeMonitoringReport(report);
      logger.info(
        { component: COMPONENT, alertCount: alerts.length },
        `Daily monitoring completed. Generated ${alerts.length} alerts.`,
      );
      return report;
    } catch (error) {
      logger.error(
        { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
        'Error in daily monitoring',
      );
      throw error;
    }
  }

  private async performWeeklyAnalysis(): Promise<MonitoringReport> {
    logger.info({ component: COMPONENT }, 'Performing weekly regulatory trend analysis...');

    const endTime   = new Date();
    const startTime = new Date(endTime.getTime() - this.MONITORING_INTERVALS.WEEKLY_ANALYSIS);

    const report: MonitoringReport = {
      id:          `weekly_${Date.now()}`,
      generatedAt: new Date(),
      reportType:  'weekly',
      timeRange:   { start: startTime, end: endTime },
      summary: {
        newRegulations: 0, updatedRegulations: 0,
        alertsGenerated: 0, criticalAlerts: 0,
        opportunitiesIdentified: 0, stakeholdersAffected: 0,
      },
      keyFindings:     [],
      trends:          { regulatoryActivity: 'stable', sectorFocus: [], emergingThemes: [] },
      recommendations: [],
      alerts:          [],
      opportunities:   [],
    };

    await this.storeMonitoringReport(report);
    logger.info({ component: COMPONENT }, 'Weekly analysis completed');
    return report;
  }

  private async performMonthlyReview(): Promise<MonitoringReport> {
    logger.info({ component: COMPONENT }, 'Performing monthly regulatory review...');

    const endTime   = new Date();
    const startTime = new Date(endTime.getTime() - this.MONITORING_INTERVALS.MONTHLY_REVIEW);

    const report: MonitoringReport = {
      id:          `monthly_${Date.now()}`,
      generatedAt: new Date(),
      reportType:  'monthly',
      timeRange:   { start: startTime, end: endTime },
      summary: {
        newRegulations: 0, updatedRegulations: 0,
        alertsGenerated: 0, criticalAlerts: 0,
        opportunitiesIdentified: 0, stakeholdersAffected: 0,
      },
      keyFindings:     [],
      trends:          { regulatoryActivity: 'stable', sectorFocus: [], emergingThemes: [] },
      recommendations: [],
      alerts:          [],
      opportunities:   [],
    };

    await this.storeMonitoringReport(report);
    logger.info({ component: COMPONENT }, 'Monthly review completed');
    return report;
  }

  // ============================================================================
  // PRIVATE — REPORT HELPERS
  // ============================================================================

  private generateKeyFindings(
    newRegulations: RegulationData[],
    updatedRegulations: RegulationData[],
    alerts: RegulatoryAlert[],
  ): string[] {
    const findings: string[] = [];

    if (newRegulations.length > 0) {
      findings.push(
        `${newRegulations.length} new regulation(s) introduced, focusing on ${this.identifyDominantSectors(newRegulations).join(', ')}`,
      );
    }

    const criticalUpdates = updatedRegulations.filter(
      (reg) => this.calculateUpdateSeverity(reg) === 'critical',
    );
    if (criticalUpdates.length > 0) {
      findings.push(`${criticalUpdates.length} critical regulatory update(s) require immediate attention`);
    }

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      findings.push(`${criticalAlerts.length} critical alert(s) generated requiring urgent action`);
    }

    return findings;
  }

  private async analyzeDailyTrends(
    newRegulations: RegulationData[],
    updatedRegulations: RegulationData[],
  ): Promise<MonitoringReport['trends']> {
    const all = [...newRegulations, ...updatedRegulations];
    return {
      regulatoryActivity: this.assessActivityLevel(all.length),
      sectorFocus:        this.identifyDominantSectors(all),
      emergingThemes:     await this.identifyDailyThemes(all),
    };
  }

  private generateDailyRecommendations(alerts: RegulatoryAlert[]): string[] {
    const recommendations: string[] = [];

    if (alerts.some((a) => a.severity === 'critical')) {
      recommendations.push('Immediate review of critical alerts required — assign responsible teams');
    }
    if (alerts.some((a) => a.type === 'deadline_approaching')) {
      recommendations.push('Prepare compliance documentation for approaching deadlines');
    }
    if (alerts.some((a) => a.type === 'strategic_opportunity')) {
      recommendations.push('Evaluate strategic opportunities for business development potential');
    }

    return recommendations;
  }

  private assessActivityLevel(regulationCount: number): 'increasing' | 'stable' | 'decreasing' {
    if (regulationCount > 5) return 'increasing';
    if (regulationCount < 2) return 'decreasing';
    return 'stable';
  }

  private identifyDominantSectors(regulations: RegulationData[]): string[] {
    const sectorCount: Record<string, number> = {};

    for (const reg of regulations) {
      for (const sector of reg.affectedSectors ?? []) {
        sectorCount[sector] = (sectorCount[sector] ?? 0) + 1;
      }
    }

    return Object.entries(sectorCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([sector]) => sector);
  }

  private async identifyDailyThemes(regulations: RegulationData[]): Promise<string[]> {
    const themes = new Set<string>();

    for (const reg of regulations) {
      const content = `${reg.title} ${reg.description}`.toLowerCase();
      if (content.includes('environment') || content.includes('climate'))    themes.add('environmental_compliance');
      if (content.includes('digital')     || content.includes('technology')) themes.add('digital_transformation');
      if (content.includes('financial')   || content.includes('reporting'))  themes.add('financial_transparency');
      if (content.includes('public')      || content.includes('citizen'))    themes.add('citizen_engagement');
      if (content.includes('data')        || content.includes('privacy'))    themes.add('data_privacy');
    }

    return Array.from(themes);
  }

  private async storeMonitoringReport(report: MonitoringReport): Promise<void> {
    try {
      const cacheKey = `${MONITORING_CACHE_KEYS.MONITORING_REPORTS}:${report.reportType}:${report.id}`;
      await cacheService.set(cacheKey, report, MONITORING_CACHE_TTL.WEEK);
    } catch (error) {
      logger.error(
        { component: COMPONENT, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
        'Error storing monitoring report',
      );
    }
  }

  private calculateUpdateSeverity(regulation: RegulationData): 'info' | 'warning' | 'critical' {
    const hasHighImpact = (regulation.estimatedImpact      ?? 0) > this.SEVERITY_THRESHOLDS.CRITICAL_IMPACT_SCORE;
    const affectsMany   = (regulation.affectedStakeholders ?? 0) > this.SEVERITY_THRESHOLDS.STAKEHOLDER_COUNT_CRITICAL;

    if (hasHighImpact || affectsMany) return 'critical';
    if ((regulation.estimatedImpact ?? 0) > this.SEVERITY_THRESHOLDS.WARNING_IMPACT_SCORE) return 'warning';
    return 'info';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const regulatoryChangeMonitoringService = new RegulatoryChangeMonitoringService();