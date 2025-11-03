// ============================================================================
// CONSTITUTIONAL ANALYSES REPOSITORY - Database Access Layer
// ============================================================================
// Repository implementation for constitutional analyses using Drizzle ORM

import { eq, and, or, inArray, sql, desc, asc, gte, lte } from 'drizzle-orm';
import { readDatabase, writeDatabase } from '../../../../../shared/database/connection.js';
import { constitutional_analyses, analysis_audit_trail } from '../../../../../shared/schema/index.js';
import { logger } from '../../../../../shared/core/index.js';
import type { ConstitutionalAnalysis } from '../../../../../shared/schema/index.js';

export class ConstitutionalAnalysesRepository {
  private get readDb() {
    return readDatabase;
  }

  private get writeDb() {
    return writeDatabase;
  }

  /**
   * Save a constitutional analysis
   */
  async save(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    try {
      logger.debug(`Saving constitutional analysis for bill ${analysis.bill_id}`, {
        component: 'ConstitutionalAnalysesRepository',
        billId: analysis.bill_id,
        provisionId: analysis.provision_id,
        risk: analysis.constitutional_risk
      });

      // Check if analysis already exists
      const existing = await this.findExisting(
        analysis.bill_id,
        analysis.provision_id,
        analysis.analysis_type
      );

      let savedAnalysis: ConstitutionalAnalysis;

      if (existing) {
        // Update existing analysis and mark old one as superseded
        await this.markAsSuperseded(existing.id, analysis.id);
        
        savedAnalysis = await this.insertNew(analysis);
        
        // Log the update in audit trail
        await this.logAuditTrail(analysis.id, 'updated', {
          superseded_analysis_id: existing.id,
          confidence_change: analysis.confidence_percentage - existing.confidence_percentage,
          risk_change: existing.constitutional_risk !== analysis.constitutional_risk
        });

      } else {
        // Insert new analysis
        savedAnalysis = await this.insertNew(analysis);
        
        // Log the creation in audit trail
        await this.logAuditTrail(analysis.id, 'created', {
          initial_confidence: analysis.confidence_percentage,
          initial_risk: analysis.constitutional_risk
        });
      }

      logger.info(`✅ Saved constitutional analysis`, {
        component: 'ConstitutionalAnalysesRepository',
        analysisId: savedAnalysis.id,
        billId: analysis.bill_id,
        confidence: analysis.confidence_percentage,
        risk: analysis.constitutional_risk
      });

      return savedAnalysis;

    } catch (error) {
      logger.error(`Failed to save constitutional analysis for bill ${analysis.bill_id}`, {
        component: 'ConstitutionalAnalysesRepository',
        billId: analysis.bill_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find all analyses for a specific bill
   */
  async findByBillId(billId: string): Promise<ConstitutionalAnalysis[]> {
    try {
      logger.debug(`Finding constitutional analyses for bill ${billId}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      const analyses = await this.readDb
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.bill_id, billId),
            eq(constitutional_analyses.is_superseded, false)
          )
        )
        .orderBy(
          desc(constitutional_analyses.confidence_percentage),
          desc(constitutional_analyses.created_at)
        );

      logger.debug(`Found ${analyses.length} analyses for bill ${billId}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      return analyses;

    } catch (error) {
      logger.error(`Failed to find analyses for bill ${billId}`, {
        component: 'ConstitutionalAnalysesRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find analyses that require expert review
   */
  async findRequiringExpertReview(): Promise<ConstitutionalAnalysis[]> {
    try {
      logger.debug('Finding analyses requiring expert review', {
        component: 'ConstitutionalAnalysesRepository'
      });

      const analyses = await this.readDb
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.requires_expert_review, true),
            eq(constitutional_analyses.expert_reviewed, false),
            eq(constitutional_analyses.is_superseded, false)
          )
        )
        .orderBy(
          // Prioritize by risk level and low confidence
          sql`CASE 
            WHEN ${constitutional_analyses.constitutional_risk} = 'critical' THEN 1
            WHEN ${constitutional_analyses.constitutional_risk} = 'high' THEN 2
            WHEN ${constitutional_analyses.constitutional_risk} = 'medium' THEN 3
            ELSE 4
          END`,
          asc(constitutional_analyses.confidence_percentage),
          desc(constitutional_analyses.created_at)
        );

      logger.debug(`Found ${analyses.length} analyses requiring expert review`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      return analyses;

    } catch (error) {
      logger.error('Failed to find analyses requiring expert review', {
        component: 'ConstitutionalAnalysesRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find analyses by risk level
   */
  async findByRiskLevel(riskLevel: 'low' | 'medium' | 'high' | 'critical'): Promise<ConstitutionalAnalysis[]> {
    try {
      logger.debug(`Finding analyses with risk level: ${riskLevel}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      const analyses = await this.readDb
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.constitutional_risk, riskLevel),
            eq(constitutional_analyses.is_superseded, false)
          )
        )
        .orderBy(
          desc(constitutional_analyses.confidence_percentage),
          desc(constitutional_analyses.created_at)
        );

      logger.debug(`Found ${analyses.length} analyses with risk level: ${riskLevel}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      return analyses;

    } catch (error) {
      logger.error(`Failed to find analyses by risk level: ${riskLevel}`, {
        component: 'ConstitutionalAnalysesRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find analyses with low confidence scores
   */
  async findLowConfidence(maxConfidence: number): Promise<ConstitutionalAnalysis[]> {
    try {
      logger.debug(`Finding analyses with confidence <= ${maxConfidence}%`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      const analyses = await this.readDb
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            lte(constitutional_analyses.confidence_percentage, maxConfidence),
            eq(constitutional_analyses.is_superseded, false)
          )
        )
        .orderBy(
          asc(constitutional_analyses.confidence_percentage),
          desc(constitutional_analyses.created_at)
        );

      logger.debug(`Found ${analyses.length} low confidence analyses`, {
        component: 'ConstitutionalAnalysesRepository',
        maxConfidence
      });

      return analyses;

    } catch (error) {
      logger.error(`Failed to find low confidence analyses`, {
        component: 'ConstitutionalAnalysesRepository',
        maxConfidence,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update analysis after expert review
   */
  async updateAfterExpertReview(
    analysisId: string,
    expertReviewerId: string,
    expertNotes: string,
    confidenceAdjustment?: number
  ): Promise<ConstitutionalAnalysis> {
    try {
      logger.debug(`Updating analysis ${analysisId} after expert review`, {
        component: 'ConstitutionalAnalysesRepository',
        expertReviewerId,
        confidenceAdjustment
      });

      // Get current analysis
      const current = await this.findById(analysisId);
      if (!current) {
        throw new Error(`Analysis ${analysisId} not found`);
      }

      // Calculate new confidence if adjustment provided
      let newConfidence = current.confidence_percentage;
      if (confidenceAdjustment !== undefined) {
        newConfidence = Math.max(0, Math.min(100, current.confidence_percentage + confidenceAdjustment));
      }

      // Update the analysis
      const [updatedAnalysis] = await this.writeDb
        .update(constitutional_analyses)
        .set({
          expert_reviewed: true,
          expert_reviewer_id: expertReviewerId,
          expert_review_date: new Date(),
          expert_notes: expertNotes,
          expert_confidence_adjustment: confidenceAdjustment || 0,
          confidence_percentage: newConfidence,
          updated_at: new Date()
        })
        .where(eq(constitutional_analyses.id, analysisId))
        .returning();

      // Log the expert review in audit trail
      await this.logAuditTrail(analysisId, 'reviewed', {
        expert_reviewer_id: expertReviewerId,
        confidence_adjustment: confidenceAdjustment,
        original_confidence: current.confidence_percentage,
        new_confidence: newConfidence
      });

      logger.info(`✅ Updated analysis after expert review`, {
        component: 'ConstitutionalAnalysesRepository',
        analysisId,
        expertReviewerId,
        confidenceChange: newConfidence - current.confidence_percentage
      });

      return updatedAnalysis;

    } catch (error) {
      logger.error(`Failed to update analysis after expert review: ${analysisId}`, {
        component: 'ConstitutionalAnalysesRepository',
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find analysis by ID
   */
  async findById(id: string): Promise<ConstitutionalAnalysis | null> {
    try {
      logger.debug(`Finding analysis by ID: ${id}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      const [analysis] = await this.readDb
        .select()
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.id, id))
        .limit(1);

      if (!analysis) {
        logger.debug(`Analysis not found: ${id}`, {
          component: 'ConstitutionalAnalysesRepository'
        });
        return null;
      }

      return analysis;

    } catch (error) {
      logger.error(`Failed to find analysis by ID: ${id}`, {
        component: 'ConstitutionalAnalysesRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark analysis as superseded
   */
  async markAsSuperseded(analysisId: string, supersededById: string): Promise<void> {
    try {
      logger.debug(`Marking analysis ${analysisId} as superseded by ${supersededById}`, {
        component: 'ConstitutionalAnalysesRepository'
      });

      await this.writeDb
        .update(constitutional_analyses)
        .set({
          is_superseded: true,
          superseded_by_id: supersededById,
          superseded_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(constitutional_analyses.id, analysisId));

      logger.debug(`Marked analysis ${analysisId} as superseded`, {
        component: 'ConstitutionalAnalysesRepository'
      });

    } catch (error) {
      logger.error(`Failed to mark analysis as superseded: ${analysisId}`, {
        component: 'ConstitutionalAnalysesRepository',
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get analysis statistics (alias for compatibility)
   */
  async getStatistics() {
    return this.getAnalysisStatistics();
  }

  /**
   * Get analysis statistics
   */
  async getAnalysisStatistics(): Promise<{
    totalAnalyses: number;
    analysesByRisk: Record<string, number>;
    averageConfidence: number;
    expertReviewedCount: number;
    pendingReviewCount: number;
    recentAnalysesCount: number;
  }> {
    try {
      logger.debug('Getting analysis statistics', {
        component: 'ConstitutionalAnalysesRepository'
      });

      // Get basic counts and averages
      const [basicStats] = await this.readDb
        .select({
          total: sql<number>`count(*)`,
          avgConfidence: sql<number>`avg(${constitutional_analyses.confidence_percentage})`,
          expertReviewed: sql<number>`count(*) filter (where ${constitutional_analyses.expert_reviewed} = true)`,
          pendingReview: sql<number>`count(*) filter (where ${constitutional_analyses.requires_expert_review} = true AND ${constitutional_analyses.expert_reviewed} = false)`,
          recentCount: sql<number>`count(*) filter (where ${constitutional_analyses.created_at} >= NOW() - INTERVAL '7 days')`
        })
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.is_superseded, false));

      // Get analyses by risk level
      const riskStats = await this.readDb
        .select({
          risk: constitutional_analyses.constitutional_risk,
          count: sql<number>`count(*)`
        })
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.is_superseded, false))
        .groupBy(constitutional_analyses.constitutional_risk);

      const analysesByRisk = riskStats.reduce((acc, row) => {
        acc[row.risk] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const statistics = {
        totalAnalyses: basicStats.total,
        analysesByRisk,
        averageConfidence: Math.round(basicStats.avgConfidence || 0),
        expertReviewedCount: basicStats.expertReviewed,
        pendingReviewCount: basicStats.pendingReview,
        recentAnalysesCount: basicStats.recentCount
      };

      logger.debug('Retrieved analysis statistics', {
        component: 'ConstitutionalAnalysesRepository',
        statistics
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get analysis statistics', {
        component: 'ConstitutionalAnalysesRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async findExisting(
    billId: string,
    provisionId: string,
    analysisType: string
  ): Promise<ConstitutionalAnalysis | null> {
    const [existing] = await this.readDb
      .select()
      .from(constitutional_analyses)
      .where(
        and(
          eq(constitutional_analyses.bill_id, billId),
          eq(constitutional_analyses.provision_id, provisionId),
          eq(constitutional_analyses.analysis_type, analysisType),
          eq(constitutional_analyses.is_superseded, false)
        )
      )
      .limit(1);

    return existing || null;
  }

  private async insertNew(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const [inserted] = await this.writeDb
      .insert(constitutional_analyses)
      .values({
        ...analysis,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return inserted;
  }

  private async logAuditTrail(
    analysisId: string,
    changeType: 'created' | 'updated' | 'reviewed',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.writeDb
        .insert(analysis_audit_trail)
        .values({
          id: crypto.randomUUID(),
          analysis_id: analysisId,
          bill_id: '', // Would need to get from analysis
          change_type: changeType,
          old_value: null,
          new_value: metadata,
          change_reason: `Analysis ${changeType}`,
          system_process: 'constitutional_analyzer',
          created_at: new Date()
        });
    } catch (error) {
      // Log audit trail errors but don't fail the main operation
      logger.warn('Failed to log audit trail', {
        component: 'ConstitutionalAnalysesRepository',
        analysisId,
        changeType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}