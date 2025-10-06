import { 
  sponsors, sponsorTransparency, sponsorAffiliations, notifications
} from "../../../shared/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";
import { readDatabase, writeDatabase } from "../../../shared/database/connection.js";
import { cacheService, CACHE_TTL } from "../../infrastructure/cache/cache-service.js";

// Financial disclosure integration interfaces
export interface FinancialDisclosureData {
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
  dataSource: string;
  externalId?: string;
}

export interface FinancialRelationshipMapping {
  sponsorId: number;
  sponsorName: string;
  relationships: FinancialRelationship[];
  totalFinancialExposure: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  lastMappingUpdate: Date;
}

export interface FinancialRelationship {
  relatedEntity: string;
  relationshipType: 'ownership' | 'employment' | 'investment' | 'family' | 'business_partner';
  strength: number; // 0-100 scale
  financialValue?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  conflictPotential: 'low' | 'medium' | 'high' | 'critical';
}

export interface DisclosureCompletenessReport {
  sponsorId: number;
  sponsorName: string;
  overallScore: number;
  requiredDisclosures: number;
  completedDisclosures: number;
  missingDisclosures: string[];
  lastUpdateDate: Date;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface DisclosureUpdateAlert {
  id: string;
  type: 'new_disclosure' | 'updated_disclosure' | 'missing_disclosure' | 'threshold_exceeded';
  sponsorId: number;
  sponsorName: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  isResolved: boolean;
  metadata: Record<string, any>;
}

export class FinancialDisclosureIntegrationService {
  private readonly REQUIRED_DISCLOSURE_TYPES = [
    'financial', 'business', 'investment', 'income'
  ];

  private readonly DISCLOSURE_THRESHOLDS = {
    financial: 10000, // KSh 10,000 minimum reporting threshold
    investment: 50000, // KSh 50,000 minimum investment reporting
    income: 100000, // KSh 100,000 minimum additional income reporting
    business: 25000 // KSh 25,000 minimum business interest reporting
  };

  private readonly COMPLETENESS_WEIGHTS = {
    required_disclosures: 0.4,    // 40% - Having required disclosure types
    verification_status: 0.3,     // 30% - Verification of disclosures
    data_recency: 0.2,           // 20% - How recent the data is
    detail_completeness: 0.1      // 10% - Completeness of individual disclosures
  };

  private readonly RISK_THRESHOLDS = {
    financial_exposure: {
      low: 500000,      // KSh 500,000
      medium: 2000000,  // KSh 2,000,000
      high: 5000000     // KSh 5,000,000
    },
    disclosure_age_days: {
      current: 90,      // Within 3 months
      recent: 365,      // Within 1 year
      stale: 730        // Older than 2 years
    }
  };

  /**
   * Implement financial disclosure data processing
   * Processes and integrates financial disclosure data from multiple sources
   */
  async processFinancialDisclosureData(
    sponsorId?: number,
    dataSource?: string
  ): Promise<FinancialDisclosureData[]> {
    try {
      console.log(`🔄 Processing financial disclosure data for sponsor: ${sponsorId || 'all'}`);

      const cacheKey = sponsorId 
        ? `financial_disclosure_processed_${sponsorId}`
        : 'all_financial_disclosures_processed';

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          // Build where conditions
          const conditions: any[] = [];
          
          if (sponsorId) {
            conditions.push(eq(sponsorTransparency.sponsorId, sponsorId));
          }
          
          if (dataSource) {
            conditions.push(eq(sponsorTransparency.source, dataSource));
          }

          // Get raw disclosure data from database
          const baseQuery = readDatabase
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

          const rawDisclosures = conditions.length > 0
            ? await baseQuery
                .where(conditions.length === 1 ? conditions[0] : and(...conditions))
                .orderBy(desc(sponsorTransparency.dateReported))
            : await baseQuery.orderBy(desc(sponsorTransparency.dateReported));

          // Process and enhance each disclosure
          const processedDisclosures: FinancialDisclosureData[] = [];

          for (const disclosure of rawDisclosures) {
            const processed = await this.enhanceDisclosureData(disclosure);
            processedDisclosures.push(processed);
          }

          // Validate data integrity
          await this.validateDisclosureData(processedDisclosures);

          return processedDisclosures;
        },
        CACHE_TTL.TRANSPARENCY_DATA
      );
    } catch (error) {
      console.error('Error processing financial disclosure data:', error);
      throw new Error('Failed to process financial disclosure data');
    }
  }

  /**
   * Add disclosure completeness scoring
   * Calculates comprehensive completeness scores for sponsor disclosures
   */
  async calculateDisclosureCompletenessScore(sponsorId: number): Promise<DisclosureCompletenessReport> {
    try {
      const cacheKey = `disclosure_completeness_${sponsorId}`;

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          const [sponsor, disclosures] = await Promise.all([
            readDatabase
              .select({ name: sponsors.name })
              .from(sponsors)
              .where(eq(sponsors.id, sponsorId))
              .limit(1),
            
            this.processFinancialDisclosureData(sponsorId)
          ]);

          if (!sponsor.length) {
            throw new Error(`Sponsor with ID ${sponsorId} not found`);
          }

          // Enhanced completeness scoring with weighted factors
          const completenessMetrics = this.calculateAdvancedCompletenessMetrics(disclosures);
          const finalScore = this.calculateWeightedCompletenessScore(completenessMetrics);

          const lastUpdateDate = disclosures.length > 0
            ? new Date(Math.max(...disclosures.map(d => d.dateReported.getTime())))
            : new Date(0);

          const riskAssessment = this.assessCompletenessRisk(finalScore, lastUpdateDate);
          const recommendations = this.generateAdvancedCompletenessRecommendations(
            completenessMetrics, 
            disclosures
          );

          return {
            sponsorId,
            sponsorName: sponsor[0].name,
            overallScore: finalScore,
            requiredDisclosures: this.REQUIRED_DISCLOSURE_TYPES.length,
            completedDisclosures: completenessMetrics.completedDisclosures,
            missingDisclosures: completenessMetrics.missingDisclosures,
            lastUpdateDate,
            riskAssessment,
            recommendations
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
   * Create financial relationship mapping
   * Maps financial relationships between sponsors and entities
   */
  async createFinancialRelationshipMapping(sponsorId: number): Promise<FinancialRelationshipMapping> {
    try {
      const cacheKey = `financial_relationship_mapping_${sponsorId}`;

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          const [sponsor, disclosures, affiliations] = await Promise.all([
            readDatabase
              .select({ name: sponsors.name })
              .from(sponsors)
              .where(eq(sponsors.id, sponsorId))
              .limit(1),
            
            this.processFinancialDisclosureData(sponsorId),
            
            readDatabase
              .select()
              .from(sponsorAffiliations)
              .where(eq(sponsorAffiliations.sponsorId, sponsorId))
          ]);

          if (!sponsor.length) {
            throw new Error(`Sponsor with ID ${sponsorId} not found`);
          }

          const relationships: FinancialRelationship[] = [];
          let totalFinancialExposure = 0;

          // Process financial disclosures into relationships
          for (const disclosure of disclosures) {
            if (disclosure.source && disclosure.amount) {
              const relationship: FinancialRelationship = {
                relatedEntity: disclosure.source,
                relationshipType: this.mapDisclosureToRelationshipType(disclosure.disclosureType),
                strength: this.calculateFinancialStrength(disclosure.amount),
                financialValue: disclosure.amount,
                isActive: true,
                conflictPotential: this.assessConflictPotential(disclosure)
              };

              relationships.push(relationship);
              totalFinancialExposure += disclosure.amount;
            }
          }

          // Process affiliations into relationships
          for (const affiliation of affiliations) {
            const relationship: FinancialRelationship = {
              relatedEntity: affiliation.organization,
              relationshipType: this.mapAffiliationToRelationshipType(affiliation.type || 'professional'),
              strength: this.calculateAffiliationStrength(affiliation),
              startDate: affiliation.startDate || undefined,
              endDate: affiliation.endDate || undefined,
              isActive: affiliation.isActive || false,
              conflictPotential: this.assessAffiliationConflictPotential(affiliation)
            };

            relationships.push(relationship);
          }

          // Remove duplicates and merge similar relationships
          const mergedRelationships = this.mergeRelationships(relationships);

          const riskAssessment = this.assessOverallFinancialRisk(
            totalFinancialExposure, 
            mergedRelationships
          );

          return {
            sponsorId,
            sponsorName: sponsor[0].name,
            relationships: mergedRelationships,
            totalFinancialExposure,
            riskAssessment,
            lastMappingUpdate: new Date()
          };
        },
        CACHE_TTL.RELATIONSHIP_DATA
      );
    } catch (error) {
      console.error('Error creating financial relationship mapping:', error);
      throw new Error('Failed to create financial relationship mapping');
    }
  }

  /**
   * Creates a manual disclosure alert
   */
  async createManualAlert(
    type: DisclosureUpdateAlert['type'],
    sponsorId: number,
    description: string,
    severity: DisclosureUpdateAlert['severity'] = 'info'
  ): Promise<DisclosureUpdateAlert> {
    try {
      // Get sponsor name if possible
      let sponsorName = 'Unknown Sponsor';
      try {
        // This would need to be implemented to fetch sponsor name
        // For now, we'll use a placeholder
        sponsorName = `Sponsor ${sponsorId}`;
      } catch (error) {
        console.warn(`Could not fetch sponsor name for ID ${sponsorId}:`, error);
      }

      return await this.createDisclosureAlert(
        type,
        sponsorId,
        sponsorName,
        description,
        severity
      );
    } catch (error) {
      console.error('Error creating manual alert:', error);
      throw new Error(`Failed to create disclosure alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add disclosure update monitoring and alerts
   * Monitors for disclosure updates and generates alerts
   */
  async monitorDisclosureUpdates(): Promise<DisclosureUpdateAlert[]> {
    try {
      console.log('🔍 Monitoring disclosure updates...');

      const alerts: DisclosureUpdateAlert[] = [];
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Check last 24 hours

      // Find new disclosures
      const newDisclosures = await readDatabase
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
          disclosure.sponsorName,
          `New ${disclosure.disclosureType} disclosure: ${disclosure.amount ? `KSh ${disclosure.amount.toLocaleString()}` : 'Amount not specified'}${disclosure.source ? ` from ${disclosure.source}` : ''}`,
          this.determineSeverityFromAmount(Number(disclosure.amount)),
          { disclosureId: disclosure.id, disclosureType: disclosure.disclosureType }
        );
        alerts.push(alert);

        // Check if disclosure exceeds thresholds
        if (this.exceedsThreshold(disclosure.disclosureType, Number(disclosure.amount))) {
          const thresholdAlert = await this.createDisclosureAlert(
            'threshold_exceeded',
            disclosure.sponsorId,
            disclosure.sponsorName,
            `Disclosure exceeds threshold: ${disclosure.disclosureType} amount of KSh ${disclosure.amount?.toLocaleString()} exceeds KSh ${this.DISCLOSURE_THRESHOLDS[disclosure.disclosureType as keyof typeof this.DISCLOSURE_THRESHOLDS]?.toLocaleString()}`,
            'warning',
            { 
              disclosureId: disclosure.id, 
              threshold: this.DISCLOSURE_THRESHOLDS[disclosure.disclosureType as keyof typeof this.DISCLOSURE_THRESHOLDS],
              actualAmount: disclosure.amount 
            }
          );
          alerts.push(thresholdAlert);
        }
      }

      // Check for missing required disclosures
      const missingDisclosureAlerts = await this.checkMissingDisclosures();
      alerts.push(...missingDisclosureAlerts);

      // Store alerts in database for persistence
      await this.persistAlerts(alerts);

      console.log(`✅ Generated ${alerts.length} disclosure update alerts`);
      return alerts;
    } catch (error) {
      console.error('Error monitoring disclosure updates:', error);
      throw new Error('Failed to monitor disclosure updates');
    }
  }

  // Private helper methods

  private async enhanceDisclosureData(rawDisclosure: any): Promise<FinancialDisclosureData> {
    const completenessScore = this.calculateDisclosureCompletenessScoreForDisclosure(rawDisclosure);
    const riskLevel = this.assessDisclosureRiskLevel(rawDisclosure);

    return {
      id: rawDisclosure.id,
      sponsorId: rawDisclosure.sponsorId,
      disclosureType: rawDisclosure.disclosureType as FinancialDisclosureData['disclosureType'],
      description: rawDisclosure.description,
      amount: rawDisclosure.amount ? Number(rawDisclosure.amount) : undefined,
      source: rawDisclosure.source,
      dateReported: rawDisclosure.dateReported,
      isVerified: rawDisclosure.isVerified,
      completenessScore,
      riskLevel,
      lastUpdated: rawDisclosure.createdAt,
      dataSource: rawDisclosure.source || 'Manual Entry',
      externalId: undefined // Would be populated from external API integrations
    };
  }

  private async validateDisclosureData(disclosures: FinancialDisclosureData[]): Promise<void> {
    const validationErrors: string[] = [];

    for (const disclosure of disclosures) {
      // Validate required fields
      if (!disclosure.description || disclosure.description.trim().length === 0) {
        validationErrors.push(`Disclosure ${disclosure.id}: Missing description`);
      }

      // Validate amount ranges
      if (disclosure.amount && disclosure.amount < 0) {
        validationErrors.push(`Disclosure ${disclosure.id}: Negative amount not allowed`);
      }

      // Validate disclosure type
      if (!this.REQUIRED_DISCLOSURE_TYPES.includes(disclosure.disclosureType) && 
          !['family', 'debt'].includes(disclosure.disclosureType)) {
        validationErrors.push(`Disclosure ${disclosure.id}: Invalid disclosure type`);
      }

      // Validate date ranges
      if (disclosure.dateReported > new Date()) {
        validationErrors.push(`Disclosure ${disclosure.id}: Future date not allowed`);
      }
    }

    if (validationErrors.length > 0) {
      console.warn('Disclosure validation warnings:', validationErrors);
    }
  }

  private calculateDisclosureCompletenessScoreForDisclosure(disclosure: any): number {
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

  private assessDisclosureRiskLevel(disclosure: any): FinancialDisclosureData['riskLevel'] {
    const amount = Number(disclosure.amount) || 0;
    const isVerified = disclosure.isVerified;
    
    if (!isVerified && amount > 1000000) return 'critical';
    if (!isVerified && amount > 500000) return 'high';
    if (amount > 100000) return 'medium';
    return 'low';
  }

  private mapDisclosureToRelationshipType(disclosureType: string): FinancialRelationship['relationshipType'] {
    const typeMap: Record<string, FinancialRelationship['relationshipType']> = {
      'financial': 'investment',
      'business': 'ownership',
      'investment': 'investment',
      'income': 'employment',
      'family': 'family'
    };
    
    return typeMap[disclosureType] || 'investment';
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

  private calculateFinancialStrength(amount: number): number {
    if (amount > 1000000) return 100;
    if (amount > 500000) return 80;
    if (amount > 100000) return 60;
    if (amount > 50000) return 40;
    return 20;
  }

  private calculateAffiliationStrength(affiliation: any): number {
    let strength = 50; // Base strength
    
    if (affiliation.isActive) strength += 30;
    if (affiliation.conflictType) strength += 20;
    
    return Math.min(strength, 100);
  }

  private assessConflictPotential(disclosure: FinancialDisclosureData): FinancialRelationship['conflictPotential'] {
    const amount = disclosure.amount || 0;
    
    if (amount > 2000000) return 'critical';
    if (amount > 1000000) return 'high';
    if (amount > 500000) return 'medium';
    return 'low';
  }

  private assessAffiliationConflictPotential(affiliation: any): FinancialRelationship['conflictPotential'] {
    if (affiliation.conflictType === 'financial') return 'high';
    if (affiliation.conflictType === 'ownership') return 'critical';
    if (affiliation.type === 'economic') return 'medium';
    return 'low';
  }

  private mergeRelationships(relationships: FinancialRelationship[]): FinancialRelationship[] {
    const merged = new Map<string, FinancialRelationship>();

    for (const relationship of relationships) {
      const key = `${relationship.relatedEntity}_${relationship.relationshipType}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        // Merge by taking the higher values
        existing.strength = Math.max(existing.strength, relationship.strength);
        existing.financialValue = (existing.financialValue || 0) + (relationship.financialValue || 0);
        existing.conflictPotential = this.getHigherConflictLevel(
          existing.conflictPotential, 
          relationship.conflictPotential
        );
      } else {
        merged.set(key, { ...relationship });
      }
    }

    return Array.from(merged.values());
  }

  private getHigherConflictLevel(
    level1: FinancialRelationship['conflictPotential'], 
    level2: FinancialRelationship['conflictPotential']
  ): FinancialRelationship['conflictPotential'] {
    const levels = ['low', 'medium', 'high', 'critical'];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    return levels[Math.max(index1, index2)] as FinancialRelationship['conflictPotential'];
  }

  private assessOverallFinancialRisk(
    totalExposure: number, 
    relationships: FinancialRelationship[]
  ): FinancialRelationshipMapping['riskAssessment'] {
    const criticalRelationships = relationships.filter(r => r.conflictPotential === 'critical').length;
    const highRelationships = relationships.filter(r => r.conflictPotential === 'high').length;

    if (totalExposure > 5000000 || criticalRelationships > 0) return 'critical';
    if (totalExposure > 2000000 || highRelationships > 2) return 'high';
    if (totalExposure > 500000 || highRelationships > 0) return 'medium';
    return 'low';
  }

  private assessCompletenessRisk(score: number, lastUpdate: Date): DisclosureCompletenessReport['riskAssessment'] {
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (score < 50 || daysSinceUpdate > 365) return 'critical';
    if (score < 70 || daysSinceUpdate > 180) return 'high';
    if (score < 85 || daysSinceUpdate > 90) return 'medium';
    return 'low';
  }

  private generateCompletenessRecommendations(
    score: number, 
    missingDisclosures: string[], 
    disclosures: FinancialDisclosureData[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push('Immediate action required: Complete missing financial disclosures');
    }

    if (missingDisclosures.length > 0) {
      recommendations.push(`Complete missing disclosure types: ${missingDisclosures.join(', ')}`);
    }

    const unverifiedCount = disclosures.filter(d => !d.isVerified).length;
    if (unverifiedCount > 0) {
      recommendations.push(`Verify ${unverifiedCount} pending disclosures`);
    }

    const oldDisclosures = disclosures.filter(d => {
      const daysSinceUpdate = (Date.now() - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 365;
    }).length;

    if (oldDisclosures > 0) {
      recommendations.push(`Update ${oldDisclosures} disclosures older than one year`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current disclosure practices');
    }

    return recommendations;
  }

  private async createDisclosureAlert(
    type: DisclosureUpdateAlert['type'],
    sponsorId: number,
    sponsorName: string,
    description: string,
    severity: DisclosureUpdateAlert['severity'] = 'info',
    metadata: Record<string, any> = {}
  ): Promise<DisclosureUpdateAlert> {
    const alert: DisclosureUpdateAlert = {
      id: `alert_${Date.now()}_${sponsorId}_${type}`,
      type,
      sponsorId,
      sponsorName,
      description,
      severity,
      createdAt: new Date(),
      isResolved: false,
      metadata
    };

    return alert;
  }

  private determineSeverityFromAmount(amount: number): DisclosureUpdateAlert['severity'] {
    if (amount > 1000000) return 'critical';
    if (amount > 100000) return 'warning';
    return 'info';
  }

  private exceedsThreshold(disclosureType: string, amount: number): boolean {
    const threshold = this.DISCLOSURE_THRESHOLDS[disclosureType as keyof typeof this.DISCLOSURE_THRESHOLDS];
    return threshold ? amount > threshold : false;
  }

  private async checkMissingDisclosures(): Promise<DisclosureUpdateAlert[]> {
    try {
      const alerts: DisclosureUpdateAlert[] = [];
      
      const allSponsors = await readDatabase
        .select({ id: sponsors.id, name: sponsors.name })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));

      for (const sponsor of allSponsors) {
        try {
          const completenessReport = await this.calculateDisclosureCompletenessScore(sponsor.id);
          
          if (completenessReport.missingDisclosures.length > 0) {
            const alert = await this.createDisclosureAlert(
              'missing_disclosure',
              sponsor.id,
              sponsor.name,
              `Missing required disclosures: ${completenessReport.missingDisclosures.join(', ')}`,
              completenessReport.riskAssessment === 'critical' ? 'critical' : 'warning',
              { missingTypes: completenessReport.missingDisclosures }
            );
            alerts.push(alert);
          }
        } catch (error) {
          console.error(`Error checking missing disclosures for sponsor ${sponsor.id}:`, error);
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking missing disclosures:', error);
      return [];
    }
  }

  private async persistAlerts(alerts: DisclosureUpdateAlert[]): Promise<void> {
    try {
      // Store alerts in cache for quick access
      for (const alert of alerts) {
        cacheService.set(
          `disclosure_alert_${alert.id}`,
          alert,
          CACHE_TTL.ALERT_DATA
        );
      }

      // Also create notifications for relevant users
      for (const alert of alerts) {
        if (alert.severity === 'critical' || alert.severity === 'warning') {
          await this.createNotificationForAlert(alert);
        }
      }
    } catch (error) {
      console.error('Error persisting alerts:', error);
    }
  }

  private async createNotificationForAlert(alert: DisclosureUpdateAlert): Promise<void> {
    try {
      // Create notification for admin users and transparency officers
      await writeDatabase.insert(notifications).values({
        userId: 'system', // Would be replaced with actual admin user IDs
        type: 'financial_disclosure_alert',
        title: `Financial Disclosure Alert: ${alert.sponsorName}`,
        message: alert.description,
        relatedBillId: null,
        isRead: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating notification for alert:', error);
    }
  }

  // Enhanced completeness scoring methods
  private calculateAdvancedCompletenessMetrics(disclosures: FinancialDisclosureData[]) {
    const disclosureTypes = new Set(disclosures.map(d => d.disclosureType));
    const missingDisclosures = this.REQUIRED_DISCLOSURE_TYPES.filter(
      type => !disclosureTypes.has(type as any)
    );

    const completedDisclosures = this.REQUIRED_DISCLOSURE_TYPES.filter(
      type => disclosureTypes.has(type as any)
    ).length;

    // Calculate individual metric scores
    const requiredDisclosureScore = completedDisclosures / this.REQUIRED_DISCLOSURE_TYPES.length;
    
    const verifiedCount = disclosures.filter(d => d.isVerified).length;
    const verificationScore = disclosures.length > 0 ? verifiedCount / disclosures.length : 0;

    const currentDate = new Date();
    const recentDisclosures = disclosures.filter(d => {
      const daysSinceUpdate = (currentDate.getTime() - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= this.RISK_THRESHOLDS.disclosure_age_days.recent;
    }).length;
    const recencyScore = disclosures.length > 0 ? recentDisclosures / disclosures.length : 0;

    const detailedDisclosures = disclosures.filter(d => 
      d.amount && d.source && d.description.length > 50
    ).length;
    const detailScore = disclosures.length > 0 ? detailedDisclosures / disclosures.length : 0;

    return {
      completedDisclosures,
      missingDisclosures,
      requiredDisclosureScore,
      verificationScore,
      recencyScore,
      detailScore,
      totalDisclosures: disclosures.length
    };
  }

  private calculateWeightedCompletenessScore(metrics: any): number {
    const weightedScore = 
      (metrics.requiredDisclosureScore * this.COMPLETENESS_WEIGHTS.required_disclosures * 100) +
      (metrics.verificationScore * this.COMPLETENESS_WEIGHTS.verification_status * 100) +
      (metrics.recencyScore * this.COMPLETENESS_WEIGHTS.data_recency * 100) +
      (metrics.detailScore * this.COMPLETENESS_WEIGHTS.detail_completeness * 100);

    return Math.round(Math.min(weightedScore, 100));
  }

  private generateAdvancedCompletenessRecommendations(
    metrics: any, 
    disclosures: FinancialDisclosureData[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on weighted scoring
    if (metrics.requiredDisclosureScore < 0.75) {
      recommendations.push(`Complete missing disclosure types: ${metrics.missingDisclosures.join(', ')} (High Priority)`);
    }

    if (metrics.verificationScore < 0.5) {
      const unverifiedCount = disclosures.filter(d => !d.isVerified).length;
      recommendations.push(`Verify ${unverifiedCount} pending disclosures to improve transparency score`);
    }

    if (metrics.recencyScore < 0.6) {
      const staleDisclosures = disclosures.filter(d => {
        const daysSinceUpdate = (Date.now() - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > this.RISK_THRESHOLDS.disclosure_age_days.recent;
      }).length;
      recommendations.push(`Update ${staleDisclosures} disclosures older than one year`);
    }

    if (metrics.detailScore < 0.4) {
      recommendations.push('Provide more detailed information in disclosure descriptions and specify amounts where applicable');
    }

    // Financial exposure recommendations
    const totalExposure = disclosures.reduce((sum, d) => sum + (d.amount || 0), 0);
    if (totalExposure > this.RISK_THRESHOLDS.financial_exposure.high) {
      recommendations.push('High financial exposure detected - consider additional transparency measures');
    }

    // Risk-based recommendations
    const highRiskDisclosures = disclosures.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length;
    if (highRiskDisclosures > 0) {
      recommendations.push(`${highRiskDisclosures} high-risk disclosures require immediate verification and documentation`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent disclosure compliance - continue current transparency practices');
    }

    return recommendations;
  }

  /**
   * Enhanced financial relationship mapping with network analysis
   */
  async createAdvancedFinancialRelationshipMapping(sponsorId: number): Promise<FinancialRelationshipMapping & {
    networkAnalysis: {
      centralityScore: number;
      clusteringCoefficient: number;
      riskPropagation: number;
    };
    temporalAnalysis: {
      relationshipTrends: Array<{
        period: string;
        relationshipCount: number;
        totalValue: number;
      }>;
      riskEvolution: Array<{
        date: Date;
        riskLevel: string;
        factors: string[];
      }>;
    };
  }> {
    try {
      const baseMapping = await this.createFinancialRelationshipMapping(sponsorId);
      
      // Enhanced network analysis
      const networkAnalysis = this.calculateNetworkMetrics(baseMapping.relationships);
      const temporalAnalysis = await this.analyzeRelationshipTrends(sponsorId, baseMapping.relationships);

      return {
        ...baseMapping,
        networkAnalysis,
        temporalAnalysis
      };
    } catch (error) {
      console.error('Error creating advanced financial relationship mapping:', error);
      throw new Error('Failed to create advanced financial relationship mapping');
    }
  }

  private calculateNetworkMetrics(relationships: FinancialRelationship[]) {
    // Calculate centrality score based on number and strength of relationships
    const centralityScore = Math.min(
      (relationships.length * 10) + 
      (relationships.reduce((sum, r) => sum + r.strength, 0) / relationships.length || 0),
      100
    );

    // Calculate clustering coefficient (how interconnected the relationships are)
    const highStrengthRelationships = relationships.filter(r => r.strength > 70).length;
    const clusteringCoefficient = relationships.length > 0 
      ? (highStrengthRelationships / relationships.length) * 100 
      : 0;

    // Calculate risk propagation potential
    const criticalRelationships = relationships.filter(r => r.conflictPotential === 'critical').length;
    const highRiskRelationships = relationships.filter(r => r.conflictPotential === 'high').length;
    const riskPropagation = Math.min(
      (criticalRelationships * 30) + (highRiskRelationships * 15),
      100
    );

    return {
      centralityScore: Math.round(centralityScore),
      clusteringCoefficient: Math.round(clusteringCoefficient),
      riskPropagation: Math.round(riskPropagation)
    };
  }

  private async analyzeRelationshipTrends(sponsorId: number, relationships: FinancialRelationship[]) {
    // Analyze relationship trends over time (simplified version)
    const currentDate = new Date();
    const periods = ['6months', '1year', '2years'];
    
    const relationshipTrends = periods.map(period => {
      const monthsBack = period === '6months' ? 6 : period === '1year' ? 12 : 24;
      const cutoffDate = new Date(currentDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

      const relevantRelationships = relationships.filter(r => 
        !r.startDate || r.startDate >= cutoffDate
      );

      return {
        period,
        relationshipCount: relevantRelationships.length,
        totalValue: relevantRelationships.reduce((sum, r) => sum + (r.financialValue || 0), 0)
      };
    });

    // Risk evolution analysis (simplified)
    const riskEvolution = [
      {
        date: new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        riskLevel: 'medium',
        factors: ['Historical baseline']
      },
      {
        date: new Date(currentDate.getTime() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
        riskLevel: 'medium',
        factors: ['Stable disclosure pattern']
      },
      {
        date: currentDate,
        riskLevel: this.assessCurrentRiskLevel(relationships),
        factors: this.getCurrentRiskFactors(relationships)
      }
    ];

    return {
      relationshipTrends,
      riskEvolution
    };
  }

  private assessCurrentRiskLevel(relationships: FinancialRelationship[]): string {
    const criticalCount = relationships.filter(r => r.conflictPotential === 'critical').length;
    const highCount = relationships.filter(r => r.conflictPotential === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0) return 'medium';
    return 'low';
  }

  private getCurrentRiskFactors(relationships: FinancialRelationship[]): string[] {
    const factors: string[] = [];
    
    const totalValue = relationships.reduce((sum, r) => sum + (r.financialValue || 0), 0);
    if (totalValue > this.RISK_THRESHOLDS.financial_exposure.high) {
      factors.push('High total financial exposure');
    }

    const activeHighRisk = relationships.filter(r => 
      r.isActive && (r.conflictPotential === 'high' || r.conflictPotential === 'critical')
    ).length;
    if (activeHighRisk > 0) {
      factors.push(`${activeHighRisk} active high-risk relationships`);
    }

    const ownershipRelationships = relationships.filter(r => r.relationshipType === 'ownership').length;
    if (ownershipRelationships > 2) {
      factors.push('Multiple ownership interests');
    }

    if (factors.length === 0) {
      factors.push('Standard risk profile');
    }

    return factors;
  }
}

export const financialDisclosureIntegrationService = new FinancialDisclosureIntegrationService();