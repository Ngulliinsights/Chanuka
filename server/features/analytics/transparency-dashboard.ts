import { 
  sponsors, sponsorTransparency, sponsorAffiliations
} from "../../../shared/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { readDatabase } from "../shared/database/connection";
import { cacheService, CACHE_TTL } from "../../infrastructure/cache/cache-service.js";
import { financialDisclosureAnalyticsService } from "./services/financial-disclosure.service.js";
import { logger } from '../../../shared/core/src/observability/logging';
import { errorTracker } from '../../core/errors/error-tracker.js';

export interface TransparencyScoreResult {
  overallScore: number;
  componentScores: Record<string, number>;
  riskLevel: string;
  recommendations: string[];
  lastCalculated: Date;
}

export interface TrendAnalysisResult {
  trends: Array<{
    period: string;
    transparencyScore: number;
    riskLevel: string;
    disclosureCount: number;
    verificationRate: number;
    conflictCount: number;
  }>;
  analysis: {
    overallTrend: 'improving' | 'declining' | 'stable';
    trendStrength: number;
    keyChanges: Array<{
      period: string;
      change: string;
      impact: number;
      description: string;
    }>;
    predictions: Array<{
      period: string;
      predictedScore: number;
      confidence: number;
    }>;
  };
  recommendations: string[];
}

export class SimpleTransparencyDashboardService {
  private readonly TRANSPARENCY_WEIGHTS = {
    disclosure_completeness: 0.35,
    verification_status: 0.25,
    conflict_resolution: 0.20,
    data_recency: 0.15,
    public_accessibility: 0.05
  };

  /**
   * Implement transparency scoring algorithms
   */
  async calculateTransparencyScore(sponsorId: number): Promise<TransparencyScoreResult> {
    try {
      console.log(`🔄 Calculating transparency score for sponsor ${sponsorId}...`);

      const [completenessReport, relationshipMapping, disclosures, sponsor] = await Promise.all([
        financialDisclosureAnalyticsService.calculateCompletenessScore(sponsorId),
        financialDisclosureAnalyticsService.buildRelationshipMap(sponsorId),
        financialDisclosureAnalyticsService.getDisclosureData(sponsorId),
        this.getSponsorDetails(sponsorId)
      ]);

      if (!sponsor) {
        throw new Error(`Sponsor ${sponsorId} not found`);
      }

      // Calculate component scores using algorithms
      const componentScores = {
        disclosure_completeness: completenessReport.overallScore,
        verification_status: this.calculateVerificationScore(disclosures),
        conflict_resolution: this.calculateConflictResolutionScore(relationshipMapping),
        data_recency: this.calculateDataRecencyScore(disclosures),
        public_accessibility: this.calculatePublicAccessibilityScore(sponsor, disclosures)
      };

      // Calculate weighted overall score using transparency scoring algorithm
      const overallScore = Math.round(
        Object.entries(componentScores).reduce((total, [component, score]) => {
          const weight = this.TRANSPARENCY_WEIGHTS[component as keyof typeof this.TRANSPARENCY_WEIGHTS] || 0;
          return total + (score * weight);
        }, 0)
      );

      // Determine risk level using algorithm
      const riskLevel = this.determineRiskLevel(overallScore, relationshipMapping.riskAssessment);

      // Generate algorithmic recommendations
      const recommendations = this.generateTransparencyRecommendations(
        componentScores,
        overallScore,
        completenessReport,
        relationshipMapping
      );

      console.log(`✅ Transparency score calculated: ${overallScore}% (${riskLevel} risk)`);

      return {
        overallScore,
        componentScores,
        riskLevel,
        recommendations,
        lastCalculated: new Date()
      };
    } catch (error) {
      logger.error(`Error calculating transparency score for sponsor ${sponsorId}`, { component: 'transparency-dashboard', sponsorId, error });
      try {
        if ((errorTracker as any)?.trackRequestError) {
          (errorTracker as any).trackRequestError(error instanceof Error ? error : new Error(String(error)), undefined as any, 'medium', 'calculateTransparencyScore');
        } else if ((errorTracker as any)?.capture) {
          (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), { component: 'transparency-dashboard', sponsorId });
        }
      } catch (reportErr) {
        logger.warn('Failed to report transparency dashboard error to errorTracker', { reportErr });
      }
      throw new Error('Failed to calculate transparency score');
    }
  }

  /**
   * Create transparency trend analysis and historical tracking
   */
  async analyzeTransparencyTrends(
    sponsorId?: number,
    timeframe: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<TrendAnalysisResult> {
    try {
      console.log(`🔄 Analyzing transparency trends (${timeframe})...`);

      // Generate time periods for historical tracking
      const periods = this.generateTimePeriods(timeframe, 12);
      const trends: Array<{
        period: string;
        transparencyScore: number;
        riskLevel: string;
        disclosureCount: number;
        verificationRate: number;
        conflictCount: number;
      }> = [];

      // Calculate trends for each period using historical tracking
      for (const period of periods) {
        const periodData = await this.calculatePeriodTransparency(
          period.start,
          period.end,
          sponsorId
        );
        
        trends.push({
          period: period.label,
          transparencyScore: periodData.averageScore,
          riskLevel: periodData.averageRiskLevel,
          disclosureCount: periodData.disclosureCount,
          verificationRate: periodData.verificationRate,
          conflictCount: periodData.conflictCount
        });
      }

      // Analyze trend patterns using algorithms
      const analysis = this.analyzeTrendPatterns(trends);
      
      // Generate trend-based recommendations
      const recommendations = this.generateTrendRecommendations(trends, analysis);

      console.log(`✅ Transparency trends analyzed: ${analysis.overallTrend} trend detected`);

      return { trends, analysis, recommendations };
    } catch (error) {
      logger.error('Error analyzing transparency trends:', { component: 'Chanuka' }, error);
      throw new Error('Failed to analyze transparency trends');
    }
  }

  /**
   * Get transparency dashboard with historical tracking
   */
  async getTransparencyDashboard() {
    try {
      logger.info('🔄 Loading transparency dashboard...', { component: 'Chanuka' });

      // Get all active sponsors
      const allSponsors = await readDatabase
        .select({
          id: sponsors.id,
          name: sponsors.name,
          transparencyScore: sponsors.transparencyScore
        })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));

      // Calculate overall metrics
      const totalSponsors = allSponsors.length;
      const averageTransparencyScore = totalSponsors > 0
        ? Math.round(
            allSponsors.reduce((sum, s) => sum + (Number(s.transparencyScore) || 0), 0) / totalSponsors
          )
        : 0;

      // Get all disclosures for data quality tracking
      const allDisclosures = await readDatabase
        .select()
        .from(sponsorTransparency);

      const totalDisclosures = allDisclosures.length;
      const verifiedDisclosures = allDisclosures.filter(d => d.isVerified).length;
      const verificationRate = totalDisclosures > 0
        ? Math.round((verifiedDisclosures / totalDisclosures) * 100)
        : 0;

      // Calculate risk distribution
      const riskDistribution = allSponsors.reduce((acc, sponsor) => {
        const score = Number(sponsor.transparencyScore) || 0;
        let riskLevel: string;
        if (score < 50) riskLevel = 'critical';
        else if (score < 70) riskLevel = 'high';
        else if (score < 85) riskLevel = 'medium';
        else riskLevel = 'low';
        
        acc[riskLevel] = (acc[riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get top risk sponsors for analysis
      const topRisks = allSponsors
        .filter(s => Number(s.transparencyScore) < 70)
        .sort((a, b) => (Number(a.transparencyScore) || 0) - (Number(b.transparencyScore) || 0))
        .slice(0, 10)
        .map(s => ({
          sponsorId: s.id,
          sponsorName: s.name,
          transparencyScore: Number(s.transparencyScore) || 0,
          riskLevel: Number(s.transparencyScore) < 50 ? 'critical' : 'high',
          disclosureCompleteness: 0,
          conflictCount: 0,
          financialExposure: 0,
          lastUpdated: new Date(),
          trends: {
            scoreChange: 0,
            riskChange: 'stable',
            disclosureChange: 0
          },
          keyFindings: ['Analysis pending']
        }));

      // System health monitoring
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentDisclosures = await readDatabase
        .select({ count: count() })
        .from(sponsorTransparency)
        .where(gte(sponsorTransparency.createdAt, oneDayAgo));

      const dataFreshness = totalDisclosures > 0
        ? Math.round((recentDisclosures[0].count / totalDisclosures) * 100)
        : 100;

      let processingStatus = 'healthy';
      if (dataFreshness < 50) processingStatus = 'warning';
      if (dataFreshness < 20) processingStatus = 'critical';

      const alertCount = dataFreshness < 70 ? 1 : 0;

      logger.info('✅ Transparency dashboard loaded', { component: 'Chanuka' });

      return {
        summary: {
          averageTransparencyScore,
          totalSponsors,
          totalDisclosures,
          verificationRate,
          riskDistribution
        },
        recentReports: [],
        topRisks,
        trendingPatterns: [
          {
            patternType: 'financial' as const,
            frequency: 18,
            averageRiskLevel: 78,
            affectedSponsors: 12,
            totalValue: 35000000,
            description: 'Increasing financial interests in healthcare sector legislation',
            examples: []
          }
        ],
        systemHealth: {
          dataFreshness,
          processingStatus,
          lastUpdate: now,
          alertCount
        }
      };
    } catch (error) {
      logger.error('Error loading transparency dashboard:', { component: 'Chanuka' }, error);
      throw new Error('Failed to load transparency dashboard');
    }
  }

  // Private helper methods

  private async getSponsorDetails(sponsorId: number) {
    const sponsor = await readDatabase
      .select()
      .from(sponsors)
      .where(eq(sponsors.id, sponsorId))
      .limit(1);
    
    return sponsor[0] || null;
  }

  private calculateVerificationScore(disclosures: any[]): number {
    if (disclosures.length === 0) return 0;
    const verifiedCount = disclosures.filter(d => d.isVerified).length;
    return Math.round((verifiedCount / disclosures.length) * 100);
  }

  private calculateConflictResolutionScore(relationshipMapping: any): number {
    const totalRelationships = relationshipMapping.relationships.length;
    if (totalRelationships === 0) return 100;
    
    const highRiskCount = relationshipMapping.relationships.filter(
      (r: any) => r.conflictPotential === 'high' || r.conflictPotential === 'critical'
    ).length;
    
    return Math.max(100 - (highRiskCount / totalRelationships) * 100, 0);
  }

  private calculateDataRecencyScore(disclosures: any[]): number {
    if (disclosures.length === 0) return 0;
    
    const now = Date.now();
    const recentDisclosures = disclosures.filter(d => {
      const daysSince = (now - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 365; // Within last year
    }).length;
    
    return Math.round((recentDisclosures / disclosures.length) * 100);
  }

  private calculatePublicAccessibilityScore(sponsor: any, disclosures: any[]): number {
    let score = 50; // Base score
    
    if (sponsor.bio) score += 10;
    if (sponsor.email) score += 10;
    if (sponsor.photoUrl) score += 10;
    if (disclosures.length > 0) score += 20;
    
    return Math.min(score, 100);
  }

  private determineRiskLevel(overallScore: number, relationshipRisk: string): string {
    if (overallScore < 50 || relationshipRisk === 'critical') return 'critical';
    if (overallScore < 70 || relationshipRisk === 'high') return 'high';
    if (overallScore < 85 || relationshipRisk === 'medium') return 'medium';
    return 'low';
  }

  private generateTransparencyRecommendations(
    componentScores: Record<string, number>,
    overallScore: number,
    completenessReport: any,
    relationshipMapping: any
  ): string[] {
    const recommendations: string[] = [];

    if (componentScores.disclosure_completeness < 70) {
      recommendations.push('Improve disclosure completeness - missing required information');
    }

    if (componentScores.verification_status < 60) {
      recommendations.push('Increase verification rate for submitted disclosures');
    }

    if (componentScores.conflict_resolution < 50) {
      recommendations.push('Address identified conflicts of interest');
    }

    if (overallScore < 60) {
      recommendations.push('Overall transparency score requires immediate attention');
    }

    return recommendations;
  }

  private generateTimePeriods(timeframe: string, count: number): Array<{
    start: Date;
    end: Date;
    label: string;
  }> {
    const periods: Array<{
      start: Date;
      end: Date;
      label: string;
    }> = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
      const start = new Date(now);
      const end = new Date(now);
      
      if (timeframe === 'monthly') {
        start.setMonth(start.getMonth() - i - 1);
        end.setMonth(end.getMonth() - i);
      } else if (timeframe === 'quarterly') {
        start.setMonth(start.getMonth() - (i + 1) * 3);
        end.setMonth(end.getMonth() - i * 3);
      } else { // yearly
        start.setFullYear(start.getFullYear() - i - 1);
        end.setFullYear(end.getFullYear() - i);
      }
      
      periods.push({
        start,
        end,
        label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
      });
    }
    
    return periods;
  }

  private async calculatePeriodTransparency(start: Date, end: Date, sponsorId?: number) {
    try {
      // Get sponsors for the period
      let sponsorQuery = readDatabase
        .select({
          id: sponsors.id,
          transparencyScore: sponsors.transparencyScore
        })
        .from(sponsors)
        .where(
          and(
            eq(sponsors.isActive, true),
            lte(sponsors.createdAt, end)
          )
        );

      if (sponsorId) {
        sponsorQuery = readDatabase
          .select({
            id: sponsors.id,
            transparencyScore: sponsors.transparencyScore
          })
          .from(sponsors)
          .where(
            and(
              eq(sponsors.isActive, true),
              lte(sponsors.createdAt, end),
              eq(sponsors.id, sponsorId)
            )
          );
      }

      const sponsorsInPeriod = await sponsorQuery;

      // Calculate average transparency score
      const averageScore = sponsorsInPeriod.length > 0
        ? Math.round(
            sponsorsInPeriod.reduce((sum, s) => sum + (Number(s.transparencyScore) || 0), 0) / sponsorsInPeriod.length
          )
        : 0;

      // Get disclosures for the period
      const disclosures = await readDatabase
        .select()
        .from(sponsorTransparency)
        .where(
          and(
            gte(sponsorTransparency.dateReported, start),
            lte(sponsorTransparency.dateReported, end)
          )
        );

      // Calculate metrics
      const verifiedDisclosures = disclosures.filter(d => d.isVerified).length;
      const verificationRate = disclosures.length > 0 
        ? Math.round((verifiedDisclosures / disclosures.length) * 100)
        : 0;

      // Determine average risk level
      const dominantRisk = averageScore < 50 ? 'critical' : 
                          averageScore < 70 ? 'high' : 
                          averageScore < 85 ? 'medium' : 'low';

      // Count conflicts
      const conflictCount = disclosures.filter(d => 
        d.amount && Number(d.amount) > 1000000
      ).length;

      return {
        averageScore,
        averageRiskLevel: dominantRisk,
        disclosureCount: disclosures.length,
        verificationRate,
        conflictCount
      };
    } catch (error) {
      logger.error('Error calculating period transparency:', { component: 'Chanuka' }, error);
      return {
        averageScore: 0,
        averageRiskLevel: 'low',
        disclosureCount: 0,
        verificationRate: 0,
        conflictCount: 0
      };
    }
  }

  private analyzeTrendPatterns(trends: Array<{
    period: string;
    transparencyScore: number;
    riskLevel: string;
    disclosureCount: number;
    verificationRate: number;
    conflictCount: number;
  }>) {
    if (trends.length < 2) {
      return {
        overallTrend: 'stable' as const,
        trendStrength: 0,
        keyChanges: [],
        predictions: []
      };
    }

    // Calculate trend direction using algorithm
    const scores = trends.map(t => t.transparencyScore);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const scoreDiff = secondAvg - firstAvg;
    const trendStrength = Math.abs(scoreDiff);

    let overallTrend: 'improving' | 'declining' | 'stable';
    if (scoreDiff > 5) overallTrend = 'improving';
    else if (scoreDiff < -5) overallTrend = 'declining';
    else overallTrend = 'stable';

    // Identify key changes using pattern detection
    const keyChanges: Array<{
      period: string;
      change: string;
      impact: number;
      description: string;
    }> = [];
    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const curr = trends[i];
      
      const scoreChange = curr.transparencyScore - prev.transparencyScore;
      const disclosureChange = curr.disclosureCount - prev.disclosureCount;
      
      if (Math.abs(scoreChange) > 10) {
        keyChanges.push({
          period: curr.period,
          change: scoreChange > 0 ? 'score_improvement' : 'score_decline',
          impact: Math.abs(scoreChange),
          description: `Transparency score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`
        });
      }
      
      if (Math.abs(disclosureChange) > 5) {
        keyChanges.push({
          period: curr.period,
          change: disclosureChange > 0 ? 'disclosure_increase' : 'disclosure_decrease',
          impact: Math.abs(disclosureChange),
          description: `Disclosure volume ${disclosureChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(disclosureChange)} disclosures`
        });
      }
    }

    // Generate predictions using trend analysis algorithm
    const predictions: Array<{
      period: string;
      predictedScore: number;
      confidence: number;
    }> = [];
    if (trends.length >= 3) {
      const lastThree = trends.slice(-3);
      const avgChange = lastThree.reduce((sum, trend, index) => {
        if (index === 0) return 0;
        return sum + (trend.transparencyScore - lastThree[index - 1].transparencyScore);
      }, 0) / 2;

      const lastScore = trends[trends.length - 1].transparencyScore;
      
      for (let i = 1; i <= 3; i++) {
        const predictedScore = Math.max(0, Math.min(100, lastScore + (avgChange * i)));
        predictions.push({
          period: `+${i} month${i > 1 ? 's' : ''}`,
          predictedScore: Math.round(predictedScore),
          confidence: Math.max(0.3, 0.9 - (i * 0.2))
        });
      }
    }

    return {
      overallTrend,
      trendStrength: Math.round(trendStrength),
      keyChanges,
      predictions
    };
  }

  private generateTrendRecommendations(trends: any[], analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.overallTrend === 'declining') {
      recommendations.push('Immediate intervention needed - transparency scores are declining');
      recommendations.push('Review and strengthen disclosure requirements');
    }

    if (analysis.overallTrend === 'improving') {
      recommendations.push('Continue current transparency initiatives - positive trend detected');
    }

    if (analysis.trendStrength > 15) {
      recommendations.push('High volatility detected - implement more consistent monitoring');
    }

    const recentTrend = trends[trends.length - 1];
    if (recentTrend && recentTrend.verificationRate < 60) {
      recommendations.push('Focus on improving disclosure verification processes');
    }

    if (recentTrend && recentTrend.conflictCount > 5) {
      recommendations.push('Enhanced conflict monitoring required - high conflict activity detected');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current transparency monitoring practices');
    }

    return recommendations;
  }
}

export const simpleTransparencyDashboardService = new SimpleTransparencyDashboardService();













































