import { db } from '../../../../shared/database/pool.js';
import {
  constitutional_provisions,
  legal_precedents,
  constitutional_analyses,
  expert_review_queue,
  analysis_audit_trail,
  type ConstitutionalProvision,
  type LegalPrecedent,
  type ConstitutionalAnalysis
} from '@shared/schema';
import { eq, and, sql, desc, asc, count, inArray, like, or, gte, lte, isNotNull } from 'drizzle-orm';
import { logger } from '../../../../shared/core/src/observability/logging/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QueueItemRequest {
  analysisId: string;
  billId: string;
  priority: number;
  complexityScore: number;
  uncertaintyFlags: string[];
  estimatedReviewTime: number;
  recommendedExpertise: string[];
}

export interface ExpertReviewQueueStatus {
  pendingCount: number;
  averageWaitTime: number;
  highPriorityCount: number;
}

// ============================================================================
// CONSTITUTIONAL ANALYSIS SERVICE
// ============================================================================

/**
 * ConstitutionalAnalysisServiceComplete - Consolidated service replacing all repositories
 * 
 * This service consolidates:
 * - ConstitutionalProvisionsRepository
 * - LegalPrecedentsRepository  
 * - ConstitutionalAnalysesRepository
 * - ExpertReviewQueueRepository
 */
export class ConstitutionalAnalysisServiceComplete {
  private get database() {
    return db;
  } 
 // ============================================================================
  // CONSTITUTIONAL PROVISIONS OPERATIONS
  // ============================================================================

  async findProvisionById(id: string): Promise<ConstitutionalProvision | null> {
    const logContext = { component: 'ConstitutionalAnalysisServiceComplete', operation: 'findProvisionById', id };
    logger.debug('Finding constitutional provision by ID', logContext);

    try {
      const [provision] = await this.database
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.id, id))
        .limit(1);

      return provision || null;
    } catch (error) {
      logger.error('Failed to find constitutional provision by ID', { ...logContext, error });
      throw error;
    }
  }

  async searchProvisions(searchTerm: string, limit: number = 50): Promise<ConstitutionalProvision[]> {
    const logContext = { component: 'ConstitutionalAnalysisServiceComplete', operation: 'searchProvisions', searchTerm, limit };
    logger.debug('Searching constitutional provisions', logContext);

    try {
      const results = await this.database
        .select()
        .from(constitutional_provisions)
        .where(
          or(
            like(constitutional_provisions.title, `%${searchTerm}%`),
            like(constitutional_provisions.content, `%${searchTerm}%`),
            like(constitutional_provisions.section, `%${searchTerm}%`)
          )
        )
        .limit(limit);

      logger.debug('Constitutional provisions search completed', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to search constitutional provisions', { ...logContext, error });
      throw error;
    }
  }

  async findProvisionsByArticle(article: string): Promise<ConstitutionalProvision[]> {
    const logContext = { component: 'ConstitutionalAnalysisServiceComplete', operation: 'findProvisionsByArticle', article };
    logger.debug('Finding provisions by article', logContext);

    try {
      const results = await this.database
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.article, article))
        .orderBy(asc(constitutional_provisions.section));

      return results;
    } catch (error) {
      logger.error('Failed to find provisions by article', { ...logContext, error });
      throw error;
    }
  }  
// ============================================================================
  // LEGAL PRECEDENTS OPERATIONS
  // ============================================================================

  async findPrecedentById(id: string): Promise<LegalPrecedent | null> {
    const logContext = { component: 'ConstitutionalAnalysisServiceComplete', operation: 'findPrecedentById', id };
    logger.debug('Finding legal precedent by ID', logContext);

    try {
      const [precedent] = await this.database
        .select()
        .from(legal_precedents)
        .where(eq(legal_precedents.id, id))
        .limit(1);

      return precedent || null;
    } catch (error) {
      logger.error('Failed to find legal precedent by ID', { ...logContext, error });
      throw error;
    }
  }

  async findPrecedentsByConstitutionalProvisions(provisionIds: string[]): Promise<LegalPrecedent[]> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findPrecedentsByConstitutionalProvisions', 
      provisionCount: provisionIds.length 
    };
    logger.debug('Finding precedents for constitutional provisions', logContext);

    if (provisionIds.length === 0) return [];

    try {
      const results = await this.database
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false),
            sql`${legal_precedents.constitutional_provisions} && ARRAY[${provisionIds.join(',')}]::uuid[]`
          )
        )
        .orderBy(desc(legal_precedents.relevance_score_percentage));

      logger.debug('Found precedents for constitutional provisions', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to find precedents by constitutional provisions', { ...logContext, error });
      throw error;
    }
  }

  async findHighRelevanceBindingPrecedents(minRelevanceScore: number = 0.8): Promise<LegalPrecedent[]> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findHighRelevanceBindingPrecedents', 
      minRelevanceScore 
    };
    logger.debug('Finding high relevance binding precedents', logContext);

    try {
      const results = await this.database
        .select()
        .from(legal_precedents)
        .where(
          and(
            gte(legal_precedents.relevance_score_percentage, minRelevanceScore * 100),
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false)
          )
        )
        .orderBy(desc(legal_precedents.relevance_score_percentage));

      logger.debug('Found high relevance binding precedents', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to find high relevance binding precedents', { ...logContext, error });
      throw error;
    }
  }  /
/ ============================================================================
  // CONSTITUTIONAL ANALYSES OPERATIONS
  // ============================================================================

  async saveAnalysis(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'saveAnalysis',
      billId: analysis.bill_id,
      provisionId: analysis.provision_id 
    };
    logger.debug('Saving constitutional analysis', logContext);

    try {
      // Check if analysis already exists
      const existing = await this.findExistingAnalysis(
        analysis.bill_id,
        analysis.provision_id,
        analysis.analysis_type
      );

      let savedAnalysis: ConstitutionalAnalysis;

      if (existing) {
        // Mark old one as superseded and insert new
        await this.markAsSuperseded(existing.id, analysis.id);
        savedAnalysis = await this.insertNewAnalysis(analysis);
        
        await this.logAuditTrail(analysis.id, 'updated', {
          superseded_analysis_id: existing.id,
          confidence_change: analysis.confidence_percentage - existing.confidence_percentage
        });
      } else {
        savedAnalysis = await this.insertNewAnalysis(analysis);
        
        await this.logAuditTrail(analysis.id, 'created', {
          initial_confidence: analysis.confidence_percentage,
          initial_risk: analysis.constitutional_risk
        });
      }

      logger.info('✅ Saved constitutional analysis', {
        ...logContext,
        analysisId: savedAnalysis.id,
        confidence: analysis.confidence_percentage
      });

      return savedAnalysis;
    } catch (error) {
      logger.error('Failed to save constitutional analysis', { ...logContext, error });
      throw error;
    }
  }

  async findAnalysesByBillId(billId: string): Promise<ConstitutionalAnalysis[]> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findAnalysesByBillId',
      billId 
    };
    logger.debug('Finding constitutional analyses for bill', logContext);

    try {
      const analyses = await this.database
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

      logger.debug('Found analyses for bill', { ...logContext, count: analyses.length });
      return analyses;
    } catch (error) {
      logger.error('Failed to find analyses for bill', { ...logContext, error });
      throw error;
    }
  }  // ==
==========================================================================
  // EXPERT REVIEW QUEUE OPERATIONS
  // ============================================================================

  async queueForExpertReview(request: QueueItemRequest): Promise<void> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'queueForExpertReview', 
      analysisId: request.analysisId 
    };
    logger.debug('Queueing analysis for expert review', logContext);

    try {
      // Check if already queued
      const [existing] = await this.database
        .select()
        .from(expert_review_queue)
        .where(eq(expert_review_queue.analysis_id, request.analysisId))
        .limit(1);

      if (existing) {
        logger.debug('Analysis already queued for review', logContext);
        return;
      }

      const dueDate = this.calculateDueDate(request.priority);

      await this.database
        .insert(expert_review_queue)
        .values({
          id: crypto.randomUUID(),
          analysis_id: request.analysisId,
          bill_id: request.billId,
          priority: request.priority,
          complexity_score_percentage: request.complexityScore,
          uncertainty_flags: request.uncertaintyFlags,
          due_date: dueDate,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        });

      logger.info('✅ Queued analysis for expert review', logContext);
    } catch (error) {
      logger.error('Failed to queue analysis for expert review', { ...logContext, error });
      throw error;
    }
  }

  async getExpertReviewQueueStatus(): Promise<ExpertReviewQueueStatus> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'getExpertReviewQueueStatus' 
    };
    logger.debug('Getting expert review queue status', logContext);

    try {
      const [statusResult] = await this.database
        .select({
          pendingCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending')`,
          highPriorityCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending' AND ${expert_review_queue.priority} >= 7)`,
          avgWaitHours: sql<number>`avg(extract(epoch from (now() - ${expert_review_queue.created_at})) / 3600) filter (where ${expert_review_queue.status} = 'pending')`
        })
        .from(expert_review_queue);

      const status = {
        pendingCount: statusResult.pendingCount || 0,
        averageWaitTime: Math.round((statusResult.avgWaitHours || 0) * 60),
        highPriorityCount: statusResult.highPriorityCount || 0
      };

      logger.debug('Retrieved queue status', { ...logContext, status });
      return status;
    } catch (error) {
      logger.error('Failed to get queue status', { ...logContext, error });
      throw error;
    }
  }  // ==
==========================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async findExistingAnalysis(
    billId: string,
    provisionId: string,
    analysisType: string
  ): Promise<ConstitutionalAnalysis | null> {
    const [existing] = await this.database
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

  private async insertNewAnalysis(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const [inserted] = await this.database
      .insert(constitutional_analyses)
      .values({
        ...analysis,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return inserted;
  }

  private async markAsSuperseded(analysisId: string, supersededById: string): Promise<void> {
    await this.database
      .update(constitutional_analyses)
      .set({
        is_superseded: true,
        superseded_by_id: supersededById,
        superseded_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(constitutional_analyses.id, analysisId));
  }

  private async logAuditTrail(
    analysisId: string,
    changeType: 'created' | 'updated' | 'reviewed',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.database
        .insert(analysis_audit_trail)
        .values({
          id: crypto.randomUUID(),
          analysis_id: analysisId,
          bill_id: '',
          change_type: changeType,
          old_value: null,
          new_value: metadata,
          change_reason: `Analysis ${changeType}`,
          system_process: 'constitutional_analyzer',
          created_at: new Date()
        });
    } catch (error) {
      logger.warn('Failed to log audit trail', { analysisId, changeType, error });
    }
  }

  private calculateDueDate(priority: number): Date | null {
    const dueDate = new Date();
    if (priority >= 9) {
      dueDate.setHours(dueDate.getHours() + 4);
    } else if (priority >= 7) {
      dueDate.setHours(dueDate.getHours() + 24);
    } else if (priority >= 5) {
      dueDate.setDate(dueDate.getDate() + 3);
    } else {
      dueDate.setDate(dueDate.getDate() + 7);
    }
    return dueDate;
  }
}

export const constitutionalAnalysisServiceComplete = new ConstitutionalAnalysisServiceComplete();