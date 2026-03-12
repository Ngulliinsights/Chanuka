import { logger } from '@server/infrastructure/observability';
import { withTransaction } from '@server/infrastructure/database/connection';
import { db } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import { bills } from '@server/infrastructure/schema';
import { sponsors } from '@server/infrastructure/schema';
import { and, count, desc, eq, sql } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Derived from the schema table that is confirmed to exist (used in AnalysisApplicationService)
type AnalysisRow    = typeof schema.analysis.$inferSelect;
type AnalysisInsert = typeof schema.analysis.$inferInsert;

export interface ComprehensiveAnalysis {
  analysis_id: string;
  bill_id: string;
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
  bill_id: string;
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

// Internal types for stakeholder logic
interface StakeholderGroup {
  group: string;
  size: number;
  sentiment: number;
  influence: number;
  keyArguments: string[];
}

interface StakeholderRow {
  user_id: string | null;
  content: string;
  created_at: Date;
}

// ============================================================================
// ANALYSIS SERVICE
// ============================================================================

/**
 * AnalysisService - Consolidated service for comprehensive bill analysis.
 *
 * All persistence uses `schema.analysis` — the single analysis table confirmed
 * to exist in the schema barrel. The supersession pattern is implemented via
 * the `analysis_type` field (versioned type strings) and result metadata.
 */
export class AnalysisService {

  // ============================================================================
  // COMPREHENSIVE ANALYSIS OPERATIONS
  // ============================================================================

  /**
   * Save a comprehensive analysis result. Uses `schema.analysis` with an
   * upsert so that re-running an analysis updates the existing record.
   */
  async saveAnalysis(analysis: ComprehensiveAnalysis): Promise<AnalysisRow> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'saveAnalysis',
      bill_id: analysis.bill_id,
      analysis_id: analysis.analysis_id,
    };
    logger.debug(logContext, 'Saving comprehensive analysis');

    try {
      // Verify bill exists
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, analysis.bill_id))
        .limit(1);

      if (!bill) {
        throw new Error(`Bill ${analysis.bill_id} not found`);
      }

      const analysisType = `comprehensive_v${analysis.version}`;

      const insertData: AnalysisInsert = {
        bill_id:       analysis.bill_id,
        analysis_type: analysisType,
        results: {
          analysis_id:           analysis.analysis_id,
          constitutionalAnalysis: analysis.constitutionalAnalysis,
          conflictAnalysisSummary: analysis.conflictAnalysisSummary,
          stakeholderImpact:      analysis.stakeholderImpact,
          transparency_score:     analysis.transparency_score,
          publicInterestScore:    analysis.publicInterestScore,
          recommendedActions:     analysis.recommendedActions,
          status:                 analysis.status,
          version:                analysis.version,
        } as unknown as Record<string, unknown>,
        confidence:  (analysis.overallConfidence / 100).toString(),
        is_approved: false,
        created_at:  analysis.timestamp,
        updated_at:  new Date(),
      };

      const savedAnalysis = await withTransaction(async (tx) => {
        const [row] = await tx
          .insert(schema.analysis)
          .values(insertData)
          .onConflictDoUpdate({
            target: [schema.analysis.bill_id, schema.analysis.analysis_type],
            set: {
              results:    insertData.results,
              confidence: insertData.confidence,
              updated_at: new Date(),
            },
          })
          .returning();

        return row;
      });

      logger.info(
        { ...logContext, confidence: analysis.overallConfidence, saved_id: savedAnalysis.id },
        '✅ Analysis saved successfully',
      );

      return savedAnalysis;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to save analysis');
      throw error;
    }
  }

  /**
   * Find the most recent analysis record for a bill that is not marked failed.
   */
  async findLatestAnalysisByBillId(bill_id: string): Promise<AnalysisRow | null> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'findLatestAnalysisByBillId',
      bill_id,
    };
    logger.debug(logContext, 'Finding latest analysis for bill');

    try {
      const [analysis] = await db
        .select()
        .from(schema.analysis)
        .where(
          and(
            eq(schema.analysis.bill_id, bill_id),
            sql`${schema.analysis.analysis_type} NOT LIKE 'comprehensive_failed%'`,
          ),
        )
        .orderBy(desc(schema.analysis.created_at))
        .limit(1);

      if (!analysis) {
        logger.debug(logContext, 'No analysis found for bill');
        return null;
      }

      logger.debug({ ...logContext, analysis_id: analysis.id }, 'Latest analysis retrieved');
      return analysis;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to find latest analysis');
      throw error;
    }
  }

  /**
   * Find the complete analysis history for a bill, ordered by creation date.
   */
  async findHistoryByBillId(bill_id: string, limit = 10): Promise<AnalysisRow[]> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'findHistoryByBillId',
      bill_id,
      limit,
    };
    logger.debug(logContext, 'Finding analysis history for bill');

    try {
      const analyses = await db
        .select()
        .from(schema.analysis)
        .where(eq(schema.analysis.bill_id, bill_id))
        .orderBy(desc(schema.analysis.created_at))
        .limit(limit);

      logger.debug({ ...logContext, count: analyses.length }, 'Analysis history retrieved');
      return analyses;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to find analysis history');
      throw error;
    }
  }

  /**
   * Find a specific analysis by its numeric ID.
   * IDs in `schema.analysis` are numeric; pass the stringified value and it
   * will be parsed here, consistent with the pattern in AnalysisApplicationService.
   */
  async findAnalysisById(analysis_id: string): Promise<AnalysisRow | null> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'findAnalysisById',
      analysis_id,
    };
    logger.debug(logContext, 'Finding analysis by ID');

    try {
      const numericId = parseInt(analysis_id.split('_').pop() ?? analysis_id, 10);

      const [analysis] = await db
        .select()
        .from(schema.analysis)
        .where(eq(schema.analysis.id, numericId))
        .limit(1);

      if (!analysis) {
        logger.debug(logContext, 'Analysis not found');
        return null;
      }

      logger.debug(logContext, 'Analysis found by ID');
      return analysis;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to find analysis by ID');
      throw error;
    }
  }

  /**
   * Record a failed analysis attempt for auditing and debugging purposes.
   * Non-fatal — errors are swallowed so as not to disrupt the calling path.
   */
  async recordFailedAnalysis(bill_id: string, errorDetails: unknown): Promise<void> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'recordFailedAnalysis',
      bill_id,
    };
    logger.warn(logContext, 'Recording failed analysis attempt');

    try {
      const errorMessage =
        errorDetails instanceof Error ? errorDetails.message : String(errorDetails);
      const errorStack =
        errorDetails instanceof Error ? errorDetails.stack : undefined;

      await withTransaction(async (tx) => {
        await tx.insert(schema.analysis).values({
          bill_id,
          analysis_type: 'comprehensive_failed',
          results: {
            error:       errorMessage,
            stack:       errorStack,
            failureTime: new Date().toISOString(),
          } as unknown as Record<string, unknown>,
          confidence:  '0',
          is_approved: false,
          created_at:  new Date(),
          updated_at:  new Date(),
        });
      });

      logger.info(logContext, 'Failed analysis recorded');
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to record failed analysis');
      // Non-fatal — do not rethrow.
    }
  }

  // ============================================================================
  // BILL ANALYSIS METRICS
  // ============================================================================

  /**
   * Calculate comprehensive engagement and sentiment metrics for a bill.
   */
  async calculateBillMetrics(bill_id: string): Promise<BillAnalysisMetrics> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'calculateBillMetrics',
      bill_id,
    };
    logger.debug(logContext, 'Calculating bill analysis metrics');

    try {
      const [engagement] = await db
        .select({
          totalEngagement: count(),
          avgEngagement: sql<number>`AVG(CASE
            WHEN ${schema.bill_engagement.engagement_type} = 'view'    THEN 1
            WHEN ${schema.bill_engagement.engagement_type} = 'comment' THEN 3
            WHEN ${schema.bill_engagement.engagement_type} = 'vote'    THEN 2
            ELSE 1 END)`,
        })
        .from(schema.bill_engagement)
        .where(eq(schema.bill_engagement.bill_id, bill_id));

      const [commentMetrics] = await db
        .select({
          comment_count: count(),
          avgSentiment: sql<number>`AVG(CASE
            WHEN ${schema.comments.content} ILIKE '%support%'
              OR ${schema.comments.content} ILIKE '%agree%'    THEN  1
            WHEN ${schema.comments.content} ILIKE '%oppose%'
              OR ${schema.comments.content} ILIKE '%disagree%' THEN -1
            ELSE 0 END)`,
        })
        .from(schema.comments)
        .where(eq(schema.comments.bill_id, bill_id));

      const [diversity] = await db
        .select({
          uniqueUsers: sql<number>`COUNT(DISTINCT ${schema.bill_engagement.user_id})`,
        })
        .from(schema.bill_engagement)
        .where(eq(schema.bill_engagement.bill_id, bill_id));

      const totalEngagement  = engagement?.totalEngagement ?? 0;
      const comment_count    = commentMetrics?.comment_count ?? 0;
      const avgSentiment     = commentMetrics?.avgSentiment ?? 0;
      const uniqueUsers      = diversity?.uniqueUsers ?? 0;

      const controversyScore    = this.calculateControversyScore(comment_count, avgSentiment, totalEngagement);
      const publicInterestLevel = this.determinePublicInterestLevel(totalEngagement, uniqueUsers);

      const metrics: BillAnalysisMetrics = {
        totalEngagement,
        comment_count,
        averageSentiment:    Math.round(avgSentiment * 100) / 100,
        stakeholderDiversity: uniqueUsers,
        controversyScore,
        publicInterestLevel,
      };

      logger.debug({ ...logContext, metrics }, '✅ Bill metrics calculated');
      return metrics;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to calculate bill metrics');
      throw error;
    }
  }

  // ============================================================================
  // STAKEHOLDER ANALYSIS
  // ============================================================================

  /**
   * Perform comprehensive stakeholder analysis including grouping, coalitions, and conflicts.
   */
  async performStakeholderAnalysis(bill_id: string): Promise<StakeholderAnalysis> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'performStakeholderAnalysis',
      bill_id,
    };
    logger.debug(logContext, 'Performing stakeholder analysis');

    try {
      const stakeholderData: StakeholderRow[] = await db
        .select({
          user_id:    schema.comments.user_id,
          content:    schema.comments.content,
          created_at: schema.comments.created_at,
        })
        .from(schema.comments)
        .where(eq(schema.comments.bill_id, bill_id))
        .orderBy(desc(schema.comments.created_at));

      const stakeholderGroups      = this.groupStakeholders(stakeholderData);
      const coalitionOpportunities = this.identifyCoalitionOpportunities(stakeholderGroups);
      const conflictAreas          = this.identifyConflictAreas(stakeholderGroups);

      logger.debug(
        { ...logContext, groupCount: stakeholderGroups.length },
        '✅ Stakeholder analysis completed',
      );

      return { stakeholderGroups, coalitionOpportunities, conflictAreas };
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to perform stakeholder analysis');
      throw error;
    }
  }

  // ============================================================================
  // TRANSPARENCY ANALYSIS
  // ============================================================================

  /**
   * Calculate transparency score based on documentation completeness and public accessibility.
   */
  async calculateTransparencyScore(bill_id: string): Promise<number> {
    const logContext = {
      component: 'AnalysisService',
      operation: 'calculateTransparencyScore',
      bill_id,
    };
    logger.debug(logContext, 'Calculating transparency score');

    try {
      const [bill] = await db
        .select()
        .from(schema.bills)
        .where(eq(schema.bills.id, bill_id))
        .limit(1);

      if (!bill) {
        throw new Error(`Bill ${bill_id} not found`);
      }

      let score = 0;

      // Full text — 30 points
      if (bill.full_text && bill.full_text.length > 100)    score += 30;
      else if (bill.full_text && bill.full_text.length > 0) score += 15;

      // Summary — 20 points
      if (bill.summary && bill.summary.length > 50)         score += 20;
      else if (bill.summary && bill.summary.length > 0)     score += 10;

      // Sponsor — 20 points
      if (bill.sponsor_id) {
        const [sponsor] = await db
          .select()
          .from(schema.sponsors)
          .where(eq(schema.sponsors.id, bill.sponsor_id))
          .limit(1);

        if (sponsor) score += 20;
      }

      // Engagement — 30 points
      const [engagementRow] = await db
        .select({ total: count() })
        .from(schema.bill_engagement)
        .where(eq(schema.bill_engagement.bill_id, bill_id));

      const total = engagementRow?.total ?? 0;
      if (total > 100)     score += 30;
      else if (total > 50) score += 20;
      else if (total > 10) score += 10;

      const transparency_score = Math.min(score, 100);

      logger.debug({ ...logContext, score: transparency_score }, '✅ Transparency score calculated');
      return transparency_score;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Failed to calculate transparency score');
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateControversyScore(
    comment_count: number,
    avgSentiment: number,
    totalEngagement: number,
  ): number {
    const sentimentVariance = Math.abs(avgSentiment);
    const engagementRatio   = comment_count / Math.max(totalEngagement, 1);
    const raw = (comment_count * 0.1) + ((1 - sentimentVariance) * 50) + (engagementRatio * 30);
    return Math.min(Math.max(raw, 0), 100);
  }

  private determinePublicInterestLevel(totalEngagement: number, uniqueUsers: number): string {
    if (totalEngagement > 1000 && uniqueUsers > 100) return 'very_high';
    if (totalEngagement > 500  && uniqueUsers > 50)  return 'high';
    if (totalEngagement > 100  && uniqueUsers > 20)  return 'medium';
    if (totalEngagement > 10   && uniqueUsers > 5)   return 'low';
    return 'very_low';
  }

  private groupStakeholders(stakeholderData: StakeholderRow[]): StakeholderGroup[] {
    const groups = new Map<string, StakeholderGroup>();

    for (const row of stakeholderData) {
      const sentiment = this.analyzeSentiment(row.content);
      const key       = sentiment > 0 ? 'supporters' : sentiment < 0 ? 'opponents' : 'neutral';

      if (!groups.has(key)) {
        groups.set(key, { group: key, size: 0, sentiment: 0, influence: 0, keyArguments: [] });
      }

      const g = groups.get(key)!;
      g.size++;
      g.sentiment = (g.sentiment * (g.size - 1) + sentiment) / g.size;

      if (row.content.length > 50 && g.keyArguments.length < 5) {
        g.keyArguments.push(row.content.substring(0, 100));
      }
    }

    return Array.from(groups.values());
  }

  private identifyCoalitionOpportunities(
    groups: StakeholderGroup[],
  ): StakeholderAnalysis['coalitionOpportunities'] {
    const opportunities: StakeholderAnalysis['coalitionOpportunities'] = [];

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const g1 = groups[i];
        const g2 = groups[j];
        if (g1 === undefined || g2 === undefined) continue;

        const diff = Math.abs(g1.sentiment - g2.sentiment);
        if (diff < 0.5) {
          opportunities.push({
            groups:          [g1.group, g2.group],
            sharedInterests: ['common_goals', 'similar_concerns'],
            likelihood:      Math.round(70 + 30 * (1 - diff)),
          });
        }
      }
    }

    return opportunities;
  }

  private identifyConflictAreas(
    groups: StakeholderGroup[],
  ): StakeholderAnalysis['conflictAreas'] {
    const conflicts: StakeholderAnalysis['conflictAreas'] = [];

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const g1 = groups[i];
        const g2 = groups[j];
        if (g1 === undefined || g2 === undefined) continue;

        if (g1.sentiment * g2.sentiment < 0) {
          conflicts.push({
            groups:        [g1.group, g2.group],
            disagreements: ['policy_approach', 'implementation_concerns'],
            severity:      Math.round(Math.abs(g1.sentiment - g2.sentiment) * 100),
          });
        }
      }
    }

    return conflicts;
  }

  private analyzeSentiment(text: string): number {
    const positive = ['support', 'agree', 'good', 'excellent', 'approve', 'favor'];
    const negative = ['oppose', 'disagree', 'bad', 'terrible', 'reject', 'against'];
    const lower    = text.toLowerCase();

    let score = 0;
    for (const w of positive) if (lower.includes(w)) score++;
    for (const w of negative) if (lower.includes(w)) score--;

    return Math.max(-1, Math.min(1, score / 5));
  }

  /**
   * Health check — verifies database connectivity.
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      await db.select({ total: count() }).from(schema.bills).limit(1);
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      logger.error({ component: 'AnalysisService', error }, 'Analysis service health check failed');
      return { status: 'unhealthy', timestamp: new Date() };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const analysisService = new AnalysisService();