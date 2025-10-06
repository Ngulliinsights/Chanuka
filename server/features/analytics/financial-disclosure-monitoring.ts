import { 
  sponsors, sponsorTransparency, sponsorAffiliations, notifications,
  type Sponsor, type SponsorTransparency, type SponsorAffiliation, type Notification
} from "../../../shared/schema.js";
import { eq, desc, and, or, sql, count, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { database as db } from "../../../shared/database/connection.js";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../../infrastructure/cache/cache-service.js";

// Financial disclosure monitoring interfaces
export interface FinancialDisclosure {
  id: number;
  sponsorId: number;
  disclosureType: 'financial' | 'business' | 'family' | 'investment' | 'income' | 'debt';
  description: string;
  amount?: number;
  source?: string;
  dateReported: Date;
  isVerified: boolean;
  completenessScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

export interface FinancialRelationship {
  sponsorId: number;
  relatedEntity: string;
  relationshipType: 'ownership' | 'employment' | 'investment' | 'family' | 'business_partner';
  strength: number; // 0-100 scale
  financialValue?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface DisclousreCompletenessReport {
  sponsorId: number;
  sponsorName: string;
  overallScore: number;
  requiredDisclosures: number;
  completedDisclosures: number;
  missingDisclosures: string[];
  lastUpdateDate: Date;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
}

export interface FinancialAlert {
  id: string;
  type: 'new_disclosure' | 'updated_disclosure' | 'missing_disclosure' | 'conflict_detected';
  sponsorId: number;
  sponsorName: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  isResolved: boolean;
}

export class FinancialDisclosureMonitoringService {
  private readonly REQUIRED_DISCLOSURE_TYPES = [
    'financial', 'business', 'investment', 'income'
  ];

  private readonly DISCLOSURE_THRESHOLDS = {
    financial: 10000, // KSh 10,000 minimum reporting threshold
    investment: 50000, // KSh 50,000 minimum investment reporting
    income: 100000, // KSh 100,000 minimum additional income reporting
    business: 25000 // KSh 25,000 minimum business interest reporting
  };

  private readonly MONITORING_INTERVALS = {
    DAILY_CHECK: 24 * 60 * 60 * 1000, // 24 hours
    WEEKLY_REPORT: 7 * 24 * 60 * 60 * 1000, // 7 days
    MONTHLY_AUDIT: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  private monitoringTimer: NodeJS.Timeout | null = null;

  /**
   * Automate financial disclosure data collection
   */
  async collectFinancialDisclosures(sponsorId?: number): Promise<FinancialDisclosure[]> {
    try {
      const cacheKey = sponsorId 
        ? CACHE_KEYS.SPONSOR_TRANSPARENCY(sponsorId)
        : 'all_financial_disclosures';

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          let query = db
            .select({
              id: sponsorTransparency.id,
              sponsorId: sponsorTransparency.sponsorId,
              disclosureType: sponsorTransparency.disclosureType,
              description: sponsorTransparency.description,
              amount: sponsorTransparency.amount,
              source: sponsorTransparency.source,
              dateReported: sponsorTransparency.dateReported,
              isVerified: sponsorTransparency.isVerified,
              createdAt: sponsorTransparency.createdAt,
              sponsorName: sponsors.name
            })
            .from(sponsorTransparency)
            .innerJoin(sponsors, eq(sponsorTransparency.sponsorId, sponsors.id));

          if (sponsorId) {
            query = query.where(eq(sponsorTransparency.sponsorId, sponsorId));
          }

          const rawDisclosures = await query.orderBy(desc(sponsorTransparency.dateReported));

          // Process and enhance disclosures with completeness scoring
          return rawDisclosures.map(disclosure => ({
            ...disclosure,
            disclosureType: disclosure.disclosureType as FinancialDisclosure['disclosureType'],
            completenessScore: this.calculateCompletenessScore(disclosure),
            riskLevel: this.assessRiskLevel(disclosure),
            lastUpdated: disclosure.createdAt
          }));
        },
        CACHE_TTL.TRANSPARENCY_DATA
      );
    } catch (error) {
      console.error('Error collecting financial disclosures:', error);
      throw new Error('Failed to collect financial disclosures');
    }
  }

  /**
   * Create alerts for new or updated disclosures
   */
  async createDisclosureAlert(
    type: FinancialAlert['type'],
    sponsorId: number,
    description: string,
    severity: FinancialAlert['severity'] = 'info'
  ): Promise<FinancialAlert> {
    try {
      const sponsor = await db
        .select({ name: sponsors.name })
        .from(sponsors)
        .where(eq(sponsors.id, sponsorId))
        .limit(1);

      if (!sponsor.length) {
        throw new Error(`Sponsor with ID ${sponsorId} not found`);
      }

      const alert: FinancialAlert = {
        id: `alert_${Date.now()}_${sponsorId}`,
        type,
        sponsorId,
        sponsorName: sponsor[0].name,
        description,
        severity,
        createdAt: new Date(),
        isResolved: false
      };

      // Create notification for relevant users (admins, transparency officers)
      await this.createNotificationForAlert(alert);

      // Cache the alert for quick access
      await cacheService.set(
        `financial_alert_${alert.id}`,
        alert,
        CACHE_TTL.ALERT_DATA
      );

      return alert;
    } catch (error) {
      console.error('Error creating disclosure alert:', error);
      throw new Error('Failed to create disclosure alert');
    }
  }

  /**
   * Build financial relationship mapping
   */
  async buildFinancialRelationshipMap(sponsorId: number): Promise<FinancialRelationship[]> {
    try {
      const cacheKey = `financial_relationships_${sponsorId}`;

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          // Get sponsor affiliations and transparency data
          const [affiliations, disclosures] = await Promise.all([
            db
              .select()
              .from(sponsorAffiliations)
              .where(eq(sponsorAffiliations.sponsorId, sponsorId)),
            
            db
              .select()
              .from(sponsorTransparency)
              .where(eq(sponsorTransparency.sponsorId, sponsorId))
          ]);

          const relationships: FinancialRelationship[] = [];

          // Process affiliations into relationships
          affiliations.forEach(affiliation => {
            relationships.push({
              sponsorId,
              relatedEntity: affiliation.organization,
              relationshipType: this.mapAffiliationToRelationshipType(affiliation.type || 'professional'),
              strength: this.calculateRelationshipStrength(affiliation),
              startDate: affiliation.startDate || undefined,
              endDate: affiliation.endDate || undefined,
              isActive: affiliation.isActive || false
            });
          });

          // Process financial disclosures into relationships
          disclosures.forEach(disclosure => {
            if (disclosure.source && disclosure.amount) {
              relationships.push({
                sponsorId,
                relatedEntity: disclosure.source,
                relationshipType: this.mapDisclosureToRelationshipType(disclosure.disclosureType),
                strength: this.calculateFinancialStrength(Number(disclosure.amount)),
                financialValue: Number(disclosure.amount),
                isActive: true
              });
            }
          });

          return relationships;
        },
        CACHE_TTL.RELATIONSHIP_DATA
      );
    } catch (error) {
      console.error('Error building financial relationship map:', error);
      throw new Error('Failed to build financial relationship map');
    }
  }

  /**
   * Implement disclosure completeness scoring
   */
  async calculateDisclosureCompletenessScore(sponsorId: number): Promise<DisclousreCompletenessReport> {
    try {
      const cacheKey = `completeness_score_${sponsorId}`;

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          const [sponsor, disclosures] = await Promise.all([
            db
              .select({ name: sponsors.name })
              .from(sponsors)
              .where(eq(sponsors.id, sponsorId))
              .limit(1),
            
            db
              .select()
              .from(sponsorTransparency)
              .where(eq(sponsorTransparency.sponsorId, sponsorId))
          ]);

          if (!sponsor.length) {
            throw new Error(`Sponsor with ID ${sponsorId} not found`);
          }

          const disclosureTypes = new Set(disclosures.map(d => d.disclosureType));
          const missingDisclosures = this.REQUIRED_DISCLOSURE_TYPES.filter(
            type => !disclosureTypes.has(type)
          );

          const completedDisclosures = this.REQUIRED_DISCLOSURE_TYPES.filter(
            type => disclosureTypes.has(type)
          ).length;

          const overallScore = Math.round(
            (completedDisclosures / this.REQUIRED_DISCLOSURE_TYPES.length) * 100
          );

          const lastUpdateDate = disclosures.length > 0
            ? new Date(Math.max(...disclosures.map(d => d.dateReported?.getTime() || 0)))
            : new Date(0);

          return {
            sponsorId,
            sponsorName: sponsor[0].name,
            overallScore,
            requiredDisclosures: this.REQUIRED_DISCLOSURE_TYPES.length,
            completedDisclosures,
            missingDisclosures,
            lastUpdateDate,
            riskAssessment: this.assessCompletenessRisk(overallScore, lastUpdateDate)
          };
        },
        CACHE_TTL.COMPLETENESS_DATA
      );
    } catch (error) {
      console.error('Error calculating disclosure completeness score:', error);
      throw new Error('Failed to calculate disclosure completeness score');
    }
  }

  /**
   * Start automated monitoring system
   */
  startAutomatedMonitoring(): void {
    console.log('Starting automated financial disclosure monitoring...');
    
    // Daily monitoring for new disclosures and updates
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performDailyMonitoring();
      } catch (error) {
        console.error('Error in daily monitoring:', error);
      }
    }, this.MONITORING_INTERVALS.DAILY_CHECK);

    // Initial monitoring run
    this.performDailyMonitoring().catch(error => {
      console.error('Error in initial monitoring run:', error);
    });
  }

  /**
   * Stop automated monitoring system
   */
  stopAutomatedMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      console.log('Automated financial disclosure monitoring stopped.');
    }
  }

  /**
   * Perform comprehensive daily monitoring
   */
  private async performDailyMonitoring(): Promise<void> {
    console.log('Performing daily financial disclosure monitoring...');
    
    try {
      // Monitor for new and updated disclosures
      const alerts = await this.monitorDisclosureUpdates();
      
      // Check for potential conflicts
      await this.detectPotentialConflicts();
      
      // Update completeness scores for all sponsors
      await this.updateAllCompletenessScores();
      
      // Generate daily monitoring report
      await this.generateDailyReport();
      
      console.log(`Daily monitoring completed. Generated ${alerts.length} alerts.`);
    } catch (error) {
      console.error('Error in daily monitoring:', error);
      throw error;
    }
  }

  /**
   * Monitor for disclosure updates and trigger alerts
   */
  async monitorDisclosureUpdates(): Promise<FinancialAlert[]> {
    try {
      const alerts: FinancialAlert[] = [];
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Check last 24 hours

      // Find new disclosures
      const newDisclosures = await db
        .select({
          id: sponsorTransparency.id,
          sponsorId: sponsorTransparency.sponsorId,
          sponsorName: sponsors.name,
          disclosureType: sponsorTransparency.disclosureType,
          amount: sponsorTransparency.amount,
          source: sponsorTransparency.source,
          createdAt: sponsorTransparency.createdAt,
          isVerified: sponsorTransparency.isVerified
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsorId, sponsors.id))
        .where(gte(sponsorTransparency.createdAt, cutoffDate));

      // Create alerts for new disclosures
      for (const disclosure of newDisclosures) {
        const alert = await this.createDisclosureAlert(
          'new_disclosure',
          disclosure.sponsorId,
          `New ${disclosure.disclosureType} disclosure: ${disclosure.amount ? `KSh ${disclosure.amount}` : 'Amount not specified'}${disclosure.source ? ` from ${disclosure.source}` : ''}`,
          this.determineSeverityFromAmount(Number(disclosure.amount))
        );
        alerts.push(alert);

        // Check if this disclosure exceeds thresholds
        if (this.exceedsThreshold(disclosure.disclosureType, Number(disclosure.amount))) {
          const thresholdAlert = await this.createDisclosureAlert(
            'conflict_detected',
            disclosure.sponsorId,
            `Disclosure exceeds threshold: ${disclosure.disclosureType} amount of KSh ${disclosure.amount} exceeds KSh ${this.DISCLOSURE_THRESHOLDS[disclosure.disclosureType as keyof typeof this.DISCLOSURE_THRESHOLDS]}`,
            'warning'
          );
          alerts.push(thresholdAlert);
        }
      }

      // Find updated disclosures (comparing with previous day)
      const updatedDisclosures = await this.findUpdatedDisclosures(cutoffDate);
      for (const disclosure of updatedDisclosures) {
        const alert = await this.createDisclosureAlert(
          'updated_disclosure',
          disclosure.sponsorId,
          `Updated ${disclosure.disclosureType} disclosure: ${disclosure.description}`,
          'info'
        );
        alerts.push(alert);
      }

      // Check for missing required disclosures
      const missingDisclosureAlerts = await this.checkMissingDisclosures();
      alerts.push(...missingDisclosureAlerts);

      return alerts;
    } catch (error) {
      console.error('Error monitoring disclosure updates:', error);
      throw new Error('Failed to monitor disclosure updates');
    }
  }

  /**
   * Detect potential conflicts of interest
   */
  private async detectPotentialConflicts(): Promise<FinancialAlert[]> {
    try {
      const alerts: FinancialAlert[] = [];
      
      // Get all sponsors with their disclosures and affiliations
      const sponsorsWithData = await db
        .select({
          sponsorId: sponsors.id,
          sponsorName: sponsors.name,
          disclosures: sql<any[]>`
            COALESCE(
              json_agg(
                json_build_object(
                  'type', ${sponsorTransparency.disclosureType},
                  'amount', ${sponsorTransparency.amount},
                  'source', ${sponsorTransparency.source}
                )
              ) FILTER (WHERE ${sponsorTransparency.id} IS NOT NULL),
              '[]'::json
            )
          `,
          affiliations: sql<any[]>`
            COALESCE(
              json_agg(
                json_build_object(
                  'organization', ${sponsorAffiliations.organization},
                  'type', ${sponsorAffiliations.type},
                  'conflictType', ${sponsorAffiliations.conflictType}
                )
              ) FILTER (WHERE ${sponsorAffiliations.id} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(sponsors)
        .leftJoin(sponsorTransparency, eq(sponsors.id, sponsorTransparency.sponsorId))
        .leftJoin(sponsorAffiliations, eq(sponsors.id, sponsorAffiliations.sponsorId))
        .where(eq(sponsors.isActive, true))
        .groupBy(sponsors.id, sponsors.name);

      // Analyze each sponsor for potential conflicts
      for (const sponsor of sponsorsWithData) {
        const conflicts = this.analyzeConflicts(sponsor.disclosures, sponsor.affiliations);
        
        for (const conflict of conflicts) {
          const alert = await this.createDisclosureAlert(
            'conflict_detected',
            sponsor.sponsorId,
            conflict.description,
            conflict.severity
          );
          alerts.push(alert);
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error detecting potential conflicts:', error);
      return [];
    }
  }

  /**
   * Update completeness scores for all active sponsors
   */
  private async updateAllCompletenessScores(): Promise<void> {
    try {
      const allSponsors = await db
        .select({ id: sponsors.id })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));

      // Update scores in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < allSponsors.length; i += batchSize) {
        const batch = allSponsors.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (sponsor) => {
            try {
              // This will update the cache with fresh completeness scores
              await this.calculateDisclosureCompletenessScore(sponsor.id);
            } catch (error) {
              console.error(`Error updating completeness score for sponsor ${sponsor.id}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error('Error updating completeness scores:', error);
    }
  }

  /**
   * Generate daily monitoring report
   */
  private async generateDailyReport(): Promise<void> {
    try {
      const dashboard = await this.getFinancialTransparencyDashboard();
      
      const report = {
        date: new Date().toISOString().split('T')[0],
        summary: {
          totalSponsors: dashboard.totalSponsors,
          averageCompletenessScore: dashboard.averageCompletenessScore,
          totalDisclosures: dashboard.disclosureStats.total,
          verifiedDisclosures: dashboard.disclosureStats.verified,
          pendingDisclosures: dashboard.disclosureStats.pending
        },
        topRiskSponsors: dashboard.topRiskSponsors.slice(0, 5),
        disclosuresByType: dashboard.disclosureStats.byType
      };

      // Cache the daily report
      await cacheService.set(
        `daily_report_${report.date}`,
        report,
        CACHE_TTL.DASHBOARD_DATA
      );

      console.log('Daily monitoring report generated:', report.summary);
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }

  /**
   * Get comprehensive financial transparency dashboard data
   */
  async getFinancialTransparencyDashboard(): Promise<{
    totalSponsors: number;
    averageCompletenessScore: number;
    recentAlerts: FinancialAlert[];
    topRiskSponsors: DisclousreCompletenessReport[];
    disclosureStats: {
      total: number;
      verified: number;
      pending: number;
      byType: Record<string, number>;
    };
  }> {
    try {
      const cacheKey = 'financial_transparency_dashboard';

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          // Get basic statistics
          const [sponsorCount, disclosureStats] = await Promise.all([
            db
              .select({ count: count() })
              .from(sponsors)
              .where(eq(sponsors.isActive, true)),
            
            db
              .select({
                total: count(),
                verified: sql<number>`SUM(CASE WHEN ${sponsorTransparency.isVerified} THEN 1 ELSE 0 END)`,
                disclosureType: sponsorTransparency.disclosureType
              })
              .from(sponsorTransparency)
              .groupBy(sponsorTransparency.disclosureType)
          ]);

          const totalSponsors = sponsorCount[0]?.count || 0;
          
          // Calculate average completeness score
          const allSponsors = await db
            .select({ id: sponsors.id })
            .from(sponsors)
            .where(eq(sponsors.isActive, true));

          let totalScore = 0;
          const completenessReports: DisclousreCompletenessReport[] = [];

          for (const sponsor of allSponsors) {
            const report = await this.calculateDisclosureCompletenessScore(sponsor.id);
            completenessReports.push(report);
            totalScore += report.overallScore;
          }

          const averageCompletenessScore = allSponsors.length > 0 
            ? Math.round(totalScore / allSponsors.length) 
            : 0;

          // Get top risk sponsors (lowest completeness scores)
          const topRiskSponsors = completenessReports
            .sort((a, b) => a.overallScore - b.overallScore)
            .slice(0, 10);

          // Process disclosure statistics
          const totalDisclosures = disclosureStats.reduce((sum, stat) => sum + (stat.total || 0), 0);
          const verifiedDisclosures = disclosureStats.reduce((sum, stat) => sum + (Number(stat.verified) || 0), 0);
          const byType: Record<string, number> = {};
          
          disclosureStats.forEach(stat => {
            byType[stat.disclosureType] = stat.total || 0;
          });

          return {
            totalSponsors,
            averageCompletenessScore,
            recentAlerts: [], // Would be populated from alert monitoring
            topRiskSponsors,
            disclosureStats: {
              total: totalDisclosures,
              verified: verifiedDisclosures,
              pending: totalDisclosures - verifiedDisclosures,
              byType
            }
          };
        },
        CACHE_TTL.DASHBOARD_DATA
      );
    } catch (error) {
      console.error('Error getting financial transparency dashboard:', error);
      throw new Error('Failed to get financial transparency dashboard');
    }
  }

  // Private helper methods
  private calculateCompletenessScore(disclosure: any): number {
    let score = 0;
    
    // Base score for having the disclosure
    score += 40;
    
    // Additional points for verification
    if (disclosure.isVerified) score += 30;
    
    // Additional points for having amount
    if (disclosure.amount) score += 20;
    
    // Additional points for having source
    if (disclosure.source) score += 10;
    
    return Math.min(score, 100);
  }

  private assessRiskLevel(disclosure: any): FinancialDisclosure['riskLevel'] {
    const amount = Number(disclosure.amount) || 0;
    const isVerified = disclosure.isVerified;
    
    if (!isVerified && amount > 1000000) return 'critical';
    if (!isVerified && amount > 500000) return 'high';
    if (amount > 100000) return 'medium';
    return 'low';
  }

  private mapAffiliationToRelationshipType(affiliationType: string): FinancialRelationship['relationshipType'] {
    const typeMap: Record<string, FinancialRelationship['relationshipType']> = {
      'economic': 'business_partner',
      'professional': 'employment',
      'ownership': 'ownership',
      'family': 'family'
    };
    
    return typeMap[affiliationType] || 'business_partner';
  }

  private mapDisclosureToRelationshipType(disclosureType: string): FinancialRelationship['relationshipType'] {
    const typeMap: Record<string, FinancialRelationship['relationshipType']> = {
      'financial': 'investment',
      'business': 'ownership',
      'investment': 'investment',
      'income': 'employment'
    };
    
    return typeMap[disclosureType] || 'investment';
  }

  private calculateRelationshipStrength(affiliation: any): number {
    let strength = 50; // Base strength
    
    if (affiliation.isActive) strength += 30;
    if (affiliation.conflictType) strength += 20;
    
    return Math.min(strength, 100);
  }

  private calculateFinancialStrength(amount: number): number {
    if (amount > 1000000) return 100;
    if (amount > 500000) return 80;
    if (amount > 100000) return 60;
    if (amount > 50000) return 40;
    return 20;
  }

  private assessCompletenessRisk(score: number, lastUpdate: Date): DisclousreCompletenessReport['riskAssessment'] {
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (score < 50 || daysSinceUpdate > 365) return 'critical';
    if (score < 70 || daysSinceUpdate > 180) return 'high';
    if (score < 85 || daysSinceUpdate > 90) return 'medium';
    return 'low';
  }

  private determineSeverityFromAmount(amount: number): FinancialAlert['severity'] {
    if (amount > 1000000) return 'critical';
    if (amount > 100000) return 'warning';
    return 'info';
  }

  /**
   * Check if disclosure amount exceeds threshold
   */
  private exceedsThreshold(disclosureType: string, amount: number): boolean {
    const threshold = this.DISCLOSURE_THRESHOLDS[disclosureType as keyof typeof this.DISCLOSURE_THRESHOLDS];
    return threshold ? amount > threshold : false;
  }

  /**
   * Find updated disclosures within the specified timeframe
   */
  private async findUpdatedDisclosures(cutoffDate: Date): Promise<any[]> {
    try {
      // This would typically compare with a previous snapshot or audit log
      // For now, we'll return disclosures that were modified recently
      return await db
        .select({
          sponsorId: sponsorTransparency.sponsorId,
          sponsorName: sponsors.name,
          disclosureType: sponsorTransparency.disclosureType,
          description: sponsorTransparency.description,
          amount: sponsorTransparency.amount,
          source: sponsorTransparency.source
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsorId, sponsors.id))
        .where(
          and(
            gte(sponsorTransparency.createdAt, cutoffDate),
            isNotNull(sponsorTransparency.amount) // Only include disclosures with amounts that might have been updated
          )
        );
    } catch (error) {
      console.error('Error finding updated disclosures:', error);
      return [];
    }
  }

  /**
   * Check for missing required disclosures across all sponsors
   */
  private async checkMissingDisclosures(): Promise<FinancialAlert[]> {
    try {
      const alerts: FinancialAlert[] = [];
      
      const allSponsors = await db
        .select({ id: sponsors.id, name: sponsors.name })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));

      for (const sponsor of allSponsors) {
        const completenessReport = await this.calculateDisclosureCompletenessScore(sponsor.id);
        
        if (completenessReport.missingDisclosures.length > 0) {
          const alert = await this.createDisclosureAlert(
            'missing_disclosure',
            sponsor.id,
            `Missing required disclosures: ${completenessReport.missingDisclosures.join(', ')}`,
            completenessReport.riskAssessment === 'critical' ? 'critical' : 'warning'
          );
          alerts.push(alert);
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking missing disclosures:', error);
      return [];
    }
  }

  /**
   * Analyze potential conflicts between disclosures and affiliations
   */
  private analyzeConflicts(disclosures: any[], affiliations: any[]): Array<{
    description: string;
    severity: FinancialAlert['severity'];
  }> {
    const conflicts: Array<{ description: string; severity: FinancialAlert['severity'] }> = [];

    // Check for conflicts between financial disclosures and affiliations
    for (const disclosure of disclosures) {
      for (const affiliation of affiliations) {
        // Check if disclosure source matches affiliation organization
        if (disclosure.source && affiliation.organization && 
            disclosure.source.toLowerCase().includes(affiliation.organization.toLowerCase())) {
          
          const severity = this.determineConflictSeverity(disclosure, affiliation);
          conflicts.push({
            description: `Potential conflict: Financial disclosure from ${disclosure.source} matches affiliation with ${affiliation.organization}`,
            severity
          });
        }

        // Check for high-value disclosures with conflict-prone affiliations
        if (disclosure.amount > 500000 && affiliation.conflictType) {
          conflicts.push({
            description: `High-value disclosure (KSh ${disclosure.amount}) with ${affiliation.conflictType} conflict type in ${affiliation.organization}`,
            severity: 'warning'
          });
        }
      }
    }

    // Check for missing disclosures with active affiliations
    const economicAffiliations = affiliations.filter(a => a.type === 'economic' && a.isActive);
    if (economicAffiliations.length > 0 && disclosures.length === 0) {
      conflicts.push({
        description: `Active economic affiliations found but no financial disclosures reported`,
        severity: 'critical'
      });
    }

    return conflicts;
  }

  /**
   * Determine conflict severity based on disclosure and affiliation data
   */
  private determineConflictSeverity(disclosure: any, affiliation: any): FinancialAlert['severity'] {
    const amount = Number(disclosure.amount) || 0;
    
    if (amount > 1000000 || affiliation.conflictType === 'financial') return 'critical';
    if (amount > 100000 || affiliation.conflictType === 'ownership') return 'warning';
    return 'info';
  }

  /**
   * Get alerts for a specific sponsor
   */
  async getDisclosureAlerts(sponsorId: number, filters?: {
    type?: string;
    severity?: string;
    limit?: number;
  }): Promise<FinancialAlert[]> {
    try {
      const cacheKey = `${CACHE_KEYS.FINANCIAL_ALERTS(sponsorId)}_${JSON.stringify(filters || {})}`;
      
      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          // In a real implementation, this would query a persistent alerts table
          // For now, we'll return cached alerts or generate sample alerts
          const alerts: FinancialAlert[] = [];
          
          // Get recent completeness report to generate relevant alerts
          const completenessReport = await this.calculateDisclosureCompletenessScore(sponsorId);
          
          if (completenessReport.riskAssessment === 'critical' || completenessReport.riskAssessment === 'high') {
            alerts.push({
              id: `alert_${Date.now()}_${sponsorId}`,
              type: 'missing_disclosure',
              sponsorId,
              sponsorName: completenessReport.sponsorName,
              description: `Low completeness score: ${completenessReport.overallScore}% - Missing: ${completenessReport.missingDisclosures.join(', ')}`,
              severity: completenessReport.riskAssessment === 'critical' ? 'critical' : 'warning',
              createdAt: new Date(),
              isResolved: false
            });
          }

          // Apply filters
          let filteredAlerts = alerts;
          if (filters?.type) {
            filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
          }
          if (filters?.severity) {
            filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
          }
          if (filters?.limit) {
            filteredAlerts = filteredAlerts.slice(0, filters.limit);
          }

          return filteredAlerts;
        },
        CACHE_TTL.ALERT_DATA
      );
    } catch (error) {
      console.error('Error getting disclosure alerts:', error);
      return [];
    }
  }

  /**
   * Get system health status for monitoring
   */
  async getHealthStatus(): Promise<{
    uptime: number;
    checks: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      message: string;
      lastCheck: Date;
    }>;
  }> {
    try {
      const checks = [];
      
      // Check database connectivity
      try {
        await db.select({ count: count() }).from(sponsors).limit(1);
        checks.push({
          name: 'database_connectivity',
          status: 'healthy' as const,
          message: 'Database connection successful',
          lastCheck: new Date()
        });
      } catch (error) {
        checks.push({
          name: 'database_connectivity',
          status: 'critical' as const,
          message: 'Database connection failed',
          lastCheck: new Date()
        });
      }

      // Check cache service
      try {
        const cacheStats = cacheService.getStats();
        checks.push({
          name: 'cache_service',
          status: cacheStats.entries > 0 ? 'healthy' as const : 'warning' as const,
          message: `Cache entries: ${cacheStats.entries}, Hit rate: ${cacheStats.hitRate.toFixed(2)}%`,
          lastCheck: new Date()
        });
      } catch (error) {
        checks.push({
          name: 'cache_service',
          status: 'critical' as const,
          message: 'Cache service unavailable',
          lastCheck: new Date()
        });
      }

      // Check monitoring system
      checks.push({
        name: 'monitoring_system',
        status: this.monitoringTimer ? 'healthy' as const : 'warning' as const,
        message: this.monitoringTimer ? 'Automated monitoring active' : 'Automated monitoring inactive',
        lastCheck: new Date()
      });

      return {
        uptime: process.uptime(),
        checks
      };
    } catch (error) {
      console.error('Error getting health status:', error);
      return {
        uptime: process.uptime(),
        checks: [{
          name: 'health_check',
          status: 'critical',
          message: 'Health check failed',
          lastCheck: new Date()
        }]
      };
    }
  }

  private async createNotificationForAlert(alert: FinancialAlert): Promise<void> {
    try {
      // Create notifications for admin users and transparency officers
      // This would typically query for users with appropriate roles
      const notificationData = {
        userId: 'admin', // Would be replaced with actual admin user IDs
        type: 'financial_alert',
        title: `Financial Disclosure Alert: ${alert.sponsorName}`,
        message: alert.description,
        relatedBillId: null,
        isRead: false
      };

      // In a real implementation, this would insert into the notifications table
      console.log('Notification created for alert:', notificationData);
    } catch (error) {
      console.error('Error creating notification for alert:', error);
    }
  }
}

export const financialDisclosureMonitoringService = new FinancialDisclosureMonitoringService();