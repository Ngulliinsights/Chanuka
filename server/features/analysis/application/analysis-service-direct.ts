import { db } from '@shared/database/pool.js';
import {
  bills,
  sponsors,
  comments,
  bill_engagement,
  constitutional_analyses,
  type Bill,
  type Sponsor,
  type Comment,
  type ConstitutionalAnalysis
} from '@shared/schema';
import { eq, and, sql, desc, asc, count, inArray, like, or, gte, lte, isNotNull } from 'drizzle-orm';
import { logger } from '@shared/core/observability/logging/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ComprehensiveAnalysis {
  analysis_id: string;
  bill_id: number;
  constitutionalAnalysis: any;
  conflictAnalysisSummary: any;
  stakeholderImpact: any;
  transparency_score: number;
  publicInterestScore: number;
  overallConfidence: number;
  recommendedActions: string[];
  version: number;
  status: string;
  timestamp: Date;
}

export interface AnalysisResult {
  id: string;
  bill_id: number;
  analysis_type: string;
  results: any;
  confidence: string;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BillAnalysisMetrics {
  totalEngagement: number;
  comment_count: number;
  averageSentiment: number;
  stakeholderDiversity: number;
  controversyScore: number;
  publicInterestLevel: string;
}

export interface StakeholderAnalysis {
  stakeholderGroups: Array<{
    group: string;
    size: number;
    sentiment: number;
    influence: number;
    keyArguments: string[];
  }>;
  coalitionOpportunities: Array<{
    groups: string[];
    sharedInterests: string[];
    likelihood: number;
  }>;
  conflictAreas: Array<{
    groups: string[];
    disagreements: string[];
    severity: number;
  }>;
}

// ============================================================================
// ANALYSIS SERVICE
// ============================================================================

/**
 * AnalysisService - Consolidated service for comprehensive bill analysis
 * 
 * This service replaces the repository pattern with direct Drizzle ORM usage,
 * providing comprehensive analysis capabilities including constitutional analysis,
 * stakeholder impact assessment, and transparency scoring.
 */
export class AnalysisService {
  private get database() {
    return db;
  }

  // ============================================================================
  // COMPREHENSIVE ANALYSIS OPERATIONS
  // ============================================================================

  /**
   * Save a comprehensive analysis result
   */
  async saveAnalysis(analysis: ComprehensiveAnalysis): Promise<ConstitutionalAnalysis> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'saveAnalysis',
      bill_id: analysis.bill_id,
      analysis_id: analysis.analysis_id 
    };
    logger.debug('Saving comprehensive analysis', logContext);

    try {
      // Check if bill exists
      const [bill] = await this.database
        .select()
        .from(bills)
        .where(eq(bills.id, analysis.bill_id))
        .limit(1);

      if (!bill) {
        throw new Error(`Bill ${analysis.bill_id} not found`);
      }

      // Check if analysis already exists (supersede if needed)
      const [existing] = await this.database
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.bill_id, analysis.bill_id),
            eq(constitutional_analyses.analysis_type, `comprehensive_v${analysis.version}`),
            sql`${constitutional_analyses.superseded_by} IS NULL`
          )
        )
        .limit(1);

      let savedAnalysis: ConstitutionalAnalysis;

      if (existing) {
        // Create new analysis and mark old one as superseded
        const [newAnalysis] = await this.database
          .insert(constitutional_analyses)
          .values({
            id: analysis.analysis_id,
            bill_id: analysis.bill_id,
            analysis_type: `comprehensive_v${analysis.version}`,
            confidence_score: analysis.overallConfidence / 100, // Convert to 0-1 scale
            constitutional_provisions_cited: [],
            potential_violations: {
              violations: analysis.constitutionalAnalysis?.violations || [],
              concerns: analysis.constitutionalAnalysis?.concerns || []
            },
            constitutional_alignment: this.determineAlignment(analysis.overallConfidence),
            executive_summary: `Comprehensive analysis of Bill ${analysis.bill_id}`,
            detailed_analysis: JSON.stringify({
              constitutionalAnalysis: analysis.constitutionalAnalysis,
              conflictAnalysisSummary: analysis.conflictAnalysisSummary,
              stakeholderImpact: analysis.stakeholderImpact,
              transparency_score: analysis.transparency_score,
              publicInterestScore: analysis.publicInterestScore
            }),
            recommendations: analysis.recommendedActions.join('\n'),
            requires_expert_review: analysis.overallConfidence < 75,
            analysis_version: analysis.version,
            created_at: analysis.timestamp,
            updated_at: new Date()
          })
          .returning();

        // Mark old analysis as superseded
        await this.database
          .update(constitutional_analyses)
          .set({
            superseded_by: newAnalysis.id,
            updated_at: new Date()
          })
          .where(eq(constitutional_analyses.id, existing.id));

        savedAnalysis = newAnalysis;
      } else {
        // Create new analysis
        const [newAnalysis] = await this.database
          .insert(constitutional_analyses)
          .values({
            id: analysis.analysis_id,
            bill_id: analysis.bill_id,
            analysis_type: `comprehensive_v${analysis.version}`,
            confidence_score: analysis.overallConfidence / 100,
            constitutional_provisions_cited: [],
            potential_violations: {
              violations: analysis.constitutionalAnalysis?.violations || [],
              concerns: analysis.constitutionalAnalysis?.concerns || []
            },
            constitutional_alignment: this.determineAlignment(analysis.overallConfidence),
            executive_summary: `Comprehensive analysis of Bill ${analysis.bill_id}`,
            detailed_analysis: JSON.stringify({
              constitutionalAnalysis: analysis.constitutionalAnalysis,
              conflictAnalysisSummary: analysis.conflictAnalysisSummary,
              stakeholderImpact: analysis.stakeholderImpact,
              transparency_score: analysis.transparency_score,
              publicInterestScore: analysis.publicInterestScore
            }),
            recommendations: analysis.recommendedActions.join('\n'),
            requires_expert_review: analysis.overallConfidence < 75,
            analysis_version: analysis.version,
            created_at: analysis.timestamp,
            updated_at: new Date()
          })
          .returning();

        savedAnalysis = newAnalysis;
      }

      logger.info('✅ Analysis saved successfully', { 
        ...logContext, 
        confidence: analysis.overallConfidence,
        analysis_id: savedAnalysis.id
      });

      return savedAnalysis;
    } catch (error) {
      logger.error('Failed to save analysis', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find the latest analysis for a bill
   */
  async findLatestAnalysisByBillId(bill_id: number): Promise<ConstitutionalAnalysis | null> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'findLatestAnalysisByBillId',
      bill_id 
    };
    logger.debug('Finding latest analysis for bill', logContext);

    try {
      const [analysis] = await this.database
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.bill_id, bill_id),
            sql`${constitutional_analyses.superseded_by} IS NULL`
          )
        )
        .orderBy(desc(constitutional_analyses.created_at))
        .limit(1);

      if (!analysis) {
        logger.debug('No analysis found for bill', logContext);
        return null;
      }

      logger.debug('Latest analysis retrieved', { ...logContext, analysis_id: analysis.id });
      return analysis;
    } catch (error) {
      logger.error('Failed to find latest analysis', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find historical analysis runs for a bill (matching original repository functionality)
   */
  async findHistoryByBillId(bill_id: number, limit: number = 10): Promise<ConstitutionalAnalysis[]> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'findHistoryByBillId',
      bill_id,
      limit 
    };
    logger.debug('Finding analysis history for bill', logContext);

    try {
      const analyses = await this.database
        .select()
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.bill_id, bill_id))
        .orderBy(desc(constitutional_analyses.created_at))
        .limit(limit);

      logger.debug('Analysis history retrieved', { ...logContext, count: analyses.length });
      return analyses;
    } catch (error) {
      logger.error('Failed to find analysis history', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find analysis by unique analysis ID
   */
  async findAnalysisById(analysis_id: string): Promise<AnalysisResult | null> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'findAnalysisById',
      analysis_id 
    };
    logger.debug('Finding analysis by ID', logContext);

    try {
      // Placeholder implementation - would need actual analysis table
      logger.debug('Analysis lookup completed', logContext);
      return null;
    } catch (error) {
      logger.error('Failed to find analysis by ID', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // BILL ANALYSIS METRICS
  // ============================================================================

  /**
   * Calculate comprehensive metrics for a bill
   */
  async calculateBillMetrics(bill_id: number): Promise<BillAnalysisMetrics> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'calculateBillMetrics',
      bill_id 
    };
    logger.debug('Calculating bill analysis metrics', logContext);

    try {
      // Get engagement metrics
      const [engagementStats] = await this.database
        .select({
          totalEngagement: count(),
          avgEngagement: sql<number>`AVG(CASE 
            WHEN ${bill_engagement.engagement_type} = 'view' THEN 1
            WHEN ${bill_engagement.engagement_type} = 'comment' THEN 3
            WHEN ${bill_engagement.engagement_type} = 'vote' THEN 2
            ELSE 1 END)`
        })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id));

      // Get comment metrics
      const [commentStats] = await this.database
        .select({
          comment_count: count(),
          avgSentiment: sql<number>`AVG(CASE 
            WHEN ${comments.content} ILIKE '%support%' OR ${comments.content} ILIKE '%agree%' THEN 1
            WHEN ${comments.content} ILIKE '%oppose%' OR ${comments.content} ILIKE '%disagree%' THEN -1
            ELSE 0 END)`
        })
        .from(comments)
        .where(eq(comments.bill_id, bill_id));

      // Calculate stakeholder diversity (unique users engaging)
      const [diversityStats] = await this.database
        .select({
          uniqueUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})`
        })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id));

      // Calculate controversy score based on engagement patterns
      const controversyScore = this.calculateControversyScore(
        commentStats.comment_count || 0,
        commentStats.avgSentiment || 0,
        engagementStats.totalEngagement || 0
      );

      // Determine public interest level
      const publicInterestLevel = this.determinePublicInterestLevel(
        engagementStats.totalEngagement || 0,
        diversityStats.uniqueUsers || 0
      );

      const metrics: BillAnalysisMetrics = {
        totalEngagement: engagementStats.totalEngagement || 0,
        comment_count: commentStats.comment_count || 0,
        averageSentiment: Math.round((commentStats.avgSentiment || 0) * 100) / 100,
        stakeholderDiversity: diversityStats.uniqueUsers || 0,
        controversyScore,
        publicInterestLevel
      };

      logger.debug('✅ Bill metrics calculated', { ...logContext, metrics });
      return metrics;
    } catch (error) {
      logger.error('Failed to calculate bill metrics', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // STAKEHOLDER ANALYSIS
  // ============================================================================

  /**
   * Perform comprehensive stakeholder analysis
   */
  async performStakeholderAnalysis(bill_id: number): Promise<StakeholderAnalysis> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'performStakeholderAnalysis',
      bill_id 
    };
    logger.debug('Performing stakeholder analysis', logContext);

    try {
      // Get comments with user information for stakeholder grouping
      const stakeholderData = await this.database
        .select({
          user_id: comments.user_id,
          content: comments.content,
          created_at: comments.created_at
        })
        .from(comments)
        .where(eq(comments.bill_id, bill_id))
        .orderBy(desc(comments.created_at));

      // Group stakeholders by engagement patterns
      const stakeholderGroups = this.groupStakeholders(stakeholderData);
      
      // Identify coalition opportunities
      const coalitionOpportunities = this.identifyCoalitionOpportunities(stakeholderGroups);
      
      // Identify conflict areas
      const conflictAreas = this.identifyConflictAreas(stakeholderGroups);

      const analysis: StakeholderAnalysis = {
        stakeholderGroups,
        coalitionOpportunities,
        conflictAreas
      };

      logger.debug('✅ Stakeholder analysis completed', { 
        ...logContext, 
        groupCount: stakeholderGroups.length 
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to perform stakeholder analysis', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // TRANSPARENCY ANALYSIS
  // ============================================================================

  /**
   * Calculate transparency score for a bill
   */
  async calculateTransparencyScore(bill_id: number): Promise<number> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'calculateTransparencyScore',
      bill_id 
    };
    logger.debug('Calculating transparency score', logContext);

    try {
      // Get bill information
      const [bill] = await this.database
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id))
        .limit(1);

      if (!bill) {
        throw new Error(`Bill ${bill_id} not found`);
      }

      let score = 0;
      let maxScore = 100;

      // Content availability (30 points)
      if (bill.content && bill.content.length > 100) score += 30;
      else if (bill.content && bill.content.length > 0) score += 15;

      // Summary availability (20 points)
      if (bill.summary && bill.summary.length > 50) score += 20;
      else if (bill.summary && bill.summary.length > 0) score += 10;

      // Sponsor information (20 points)
      if (bill.primary_sponsor_id) {
        const [sponsor] = await this.database
          .select()
          .from(sponsors)
          .where(eq(sponsors.id, bill.primary_sponsor_id))
          .limit(1);
        
        if (sponsor) score += 20;
      }

      // Public engagement (30 points)
      const [engagementCount] = await this.database
        .select({ count: count() })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id));

      const engagement = engagementCount.count || 0;
      if (engagement > 100) score += 30;
      else if (engagement > 50) score += 20;
      else if (engagement > 10) score += 10;

      const transparency_score = Math.min(score, maxScore);

      logger.debug('✅ Transparency score calculated', { 
        ...logContext, 
        score: transparency_score 
      });

      return transparencyScore;
    } catch (error) {
      logger.error('Failed to calculate transparency score', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Calculate controversy score based on engagement patterns
   */
  private calculateControversyScore(
    comment_count: number, 
    avgSentiment: number, 
    totalEngagement: number
  ): number {
    // High comment count with mixed sentiment indicates controversy
    const sentimentVariance = Math.abs(avgSentiment);
    const engagementRatio = comment_count / Math.max(totalEngagement, 1);
    
    // Controversy increases with more comments and neutral/mixed sentiment
    let controversyScore = (comment_count * 0.1) + ((1 - sentimentVariance) * 50) + (engagementRatio * 30);
    
    return Math.min(Math.max(controversyScore, 0), 100);
  }

  /**
   * Determine public interest level
   */
  private determinePublicInterestLevel(totalEngagement: number, uniqueUsers: number): string {
    if (totalEngagement > 1000 && uniqueUsers > 100) return 'very_high';
    if (totalEngagement > 500 && uniqueUsers > 50) return 'high';
    if (totalEngagement > 100 && uniqueUsers > 20) return 'medium';
    if (totalEngagement > 10 && uniqueUsers > 5) return 'low';
    return 'very_low';
  }

  /**
   * Group stakeholders based on engagement patterns
   */
  private groupStakeholders(stakeholderData: any[]): Array<{
    group: string;
    size: number;
    sentiment: number;
    influence: number;
    keyArguments: string[];
  }> {
    // Simplified stakeholder grouping logic
    const groups = new Map<string, any>();
    
    stakeholderData.forEach(data => {
      const sentiment = this.analyzeSentiment(data.content);
      const groupKey = sentiment > 0 ? 'supporters' : sentiment < 0 ? 'opponents' : 'neutral';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          group: groupKey,
          size: 0,
          sentiment: 0,
          influence: 0,
          keyArguments: []
        });
      }
      
      const group = groups.get(groupKey);
      group.size++;
      group.sentiment = (group.sentiment + sentiment) / 2;
      
      // Extract key arguments (simplified)
      if (data.content.length > 50) {
        group.keyArguments.push(data.content.substring(0, 100));
      }
    });
    
    return Array.from(groups.values());
  }

  /**
   * Identify coalition opportunities
   */
  private identifyCoalitionOpportunities(stakeholderGroups: any[]): Array<{
    groups: string[];
    sharedInterests: string[];
    likelihood: number;
  }> {
    // Simplified coalition identification
    const opportunities = [];
    
    for (let i = 0; i < stakeholderGroups.length; i++) {
      for (let j = i + 1; j < stakeholderGroups.length; j++) {
        const group1 = stakeholderGroups[i];
        const group2 = stakeholderGroups[j];
        
        // Groups with similar sentiment can form coalitions
        if (Math.abs(group1.sentiment - group2.sentiment) < 0.5) {
          opportunities.push({
            groups: [group1.group, group2.group],
            sharedInterests: ['common_goals', 'similar_concerns'],
            likelihood: 70 + Math.random() * 20 // Simplified likelihood
          });
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Identify conflict areas
   */
  private identifyConflictAreas(stakeholderGroups: any[]): Array<{
    groups: string[];
    disagreements: string[];
    severity: number;
  }> {
    // Simplified conflict identification
    const conflicts = [];
    
    for (let i = 0; i < stakeholderGroups.length; i++) {
      for (let j = i + 1; j < stakeholderGroups.length; j++) {
        const group1 = stakeholderGroups[i];
        const group2 = stakeholderGroups[j];
        
        // Groups with opposing sentiment have conflicts
        if (group1.sentiment * group2.sentiment < 0) {
          conflicts.push({
            groups: [group1.group, group2.group],
            disagreements: ['policy_approach', 'implementation_concerns'],
            severity: Math.abs(group1.sentiment - group2.sentiment) * 100
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): number {
    const positiveWords = ['support', 'agree', 'good', 'excellent', 'approve', 'favor'];
    const negativeWords = ['oppose', 'disagree', 'bad', 'terrible', 'reject', 'against'];
    
    const lowerText = text.toLowerCase();
    let sentiment = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) sentiment += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) sentiment -= 1;
    });
    
    return Math.max(-1, Math.min(1, sentiment / 5)); // Normalize to -1 to 1
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      // Simple query to test database connectivity
      await this.database.select({ count: count() }).from(bills).limit(1);
      
      return {
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Analysis service health check failed', { 
        component: 'AnalysisService',
        error 
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date()
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of AnalysisService for application-wide use.
 */
export const analysisService = new AnalysisService();  
/**
   * Find analysis by unique analysis ID (matching original repository functionality)
   */
  async findAnalysisById(analysis_id: string): Promise<ConstitutionalAnalysis | null> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'findAnalysisById',
      analysis_id 
    };
    logger.debug('Finding analysis by ID', logContext);

    try {
      const [analysis] = await this.database
        .select()
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.id, analysis_id))
        .limit(1);

      if (!analysis) {
        logger.debug('Analysis not found', logContext);
        return null;
      }

      logger.debug('Analysis found by ID', logContext);
      return analysis;
    } catch (error) {
      logger.error('Failed to find analysis by ID', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Record a failed analysis attempt (matching original repository functionality)
   */
  async recordFailedAnalysis(bill_id: number, errorDetails: any): Promise<void> {
    const logContext = { 
      component: 'AnalysisService', 
      operation: 'recordFailedAnalysis',
      bill_id 
    };
    logger.warn('Recording failed analysis attempt', logContext);

    try {
      const errorMessage = errorDetails instanceof Error ? errorDetails.message : String(errorDetails);
      const errorStack = errorDetails instanceof Error ? errorDetails.stack : undefined;

      await this.database
        .insert(constitutional_analyses)
        .values({
          id: crypto.randomUUID(),
          bill_id: bill_id,
          analysis_type: 'comprehensive_failed',
          confidence_score: 0,
          constitutional_provisions_cited: [],
          potential_violations: {
            error: errorMessage,
            stack: errorStack,
            timestamp: new Date().toISOString()
          },
          constitutional_alignment: 'unknown',
          executive_summary: `Analysis failed for Bill ${ bill_id }`,
          detailed_analysis: JSON.stringify({
            error: errorMessage,
            stack: errorStack,
            failureTime: new Date()
          }),
          recommendations: 'Manual review required due to analysis failure',
          requires_expert_review: true,
          expert_reviewed: false,
          analysis_version: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

      logger.info('Failed analysis recorded', logContext);
    } catch (error) {
      logger.error('Failed to record failed analysis', { ...logContext, error });
      // Don't throw error here, as this is for logging failures
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Determine constitutional alignment based on confidence score
   */
  private determineAlignment(confidence: number): string {
    if (confidence >= 80) return 'aligned';
    if (confidence >= 60) return 'concerning';
    return 'violates';
  }