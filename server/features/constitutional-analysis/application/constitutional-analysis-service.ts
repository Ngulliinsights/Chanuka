import { logger } from '@server/infrastructure/observability';
import { db, withTransaction } from '@server/infrastructure/database';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { inputSanitizationService } from '@server/features/security';
import {
  analysis_audit_trail,
  constitutional_analyses,
  constitutional_provisions,
  expert_review_queue,
  legal_precedents
} from '@server/infrastructure/schema/constitutional_intelligence';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ConstitutionalAnalysis = typeof constitutional_analyses.$inferSelect;

export interface QueueItemRequest {
  analysis_id: string;
  bill_id: string;
  review_reason: string;
  complexity_score: number;
  uncertainty_flags: string[];
  estimated_review_time: number;
  recommended_expertise: string[];
}

export interface ExpertReviewQueueStatus {
  pendingCount: number;
  averageWaitTime: number;
  highPriorityCount: number;
}

export interface ProvisionSearchOptions {
  searchTerm?: string;
  article?: string | number;
  limit?: number;
}

export interface PrecedentSearchOptions {
  provisionIds?: string[];
  minRelevanceScore?: number;
  isBinding?: boolean;
  keywords?: string[];
  limit?: number;
}

// ============================================================================
// CONSTITUTIONAL ANALYSIS SERVICE COMPLETE
// ============================================================================

export class ConstitutionalAnalysisServiceComplete {
  // ============================================================================
  // CONSTITUTIONAL PROVISIONS OPERATIONS
  // ============================================================================

  async findProvisionById(id: string) {
    return safeAsync(async () => {
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      // Using db direct as readDatabase callback might be legacy
      const rows = await db
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.id, sanitizedId))
        .limit(1);

      return rows[0] || null;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'findProvisionById', metadata: { id } });
  }

  async searchProvisions(options: ProvisionSearchOptions) {
    return safeAsync(async () => {
      const { searchTerm, article, limit = 50 } = options;
      
      const sanitizedSearchTerm = searchTerm ? inputSanitizationService.sanitizeString(searchTerm) : undefined;
      const sanitizedLimit = Math.min(Math.max(1, limit), 500); // Bounds

      let query = db.select().from(constitutional_provisions).$dynamic();
      const conditions: (SQL | undefined)[] = [];

      if (sanitizedSearchTerm) {
        conditions.push(
          or(
            like(constitutional_provisions.title, `%${sanitizedSearchTerm}%`),
            like(constitutional_provisions.full_text, `%${sanitizedSearchTerm}%`)
          )
        );
      }

      if (article !== undefined && article !== null && article !== '') {
        let articleNum: number | undefined;
        if (typeof article === 'number') {
          articleNum = article;
        } else if (typeof article === 'string') {
          const digits = article.replace(/[^0-9]/g, '');
          if (digits) articleNum = parseInt(digits, 10);
        }

        if (articleNum !== undefined && !Number.isNaN(articleNum)) {
          conditions.push(eq(constitutional_provisions.article_number, articleNum));
        }
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions) as SQL);
      }

      const results = await query
        .orderBy(asc(constitutional_provisions.article_number))
        .limit(sanitizedLimit);

      logger.info({ count: results.length, searchTerm: sanitizedSearchTerm }, 'Searched constitutional provisions');
      return results;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'searchProvisions', metadata: { options } });
  }

  async findProvisionsByArticle(article: string) {
    return safeAsync(async () => {
      let articleNum: number | undefined;
      if (typeof article === 'number') articleNum = article;
      else if (typeof article === 'string') {
        const digits = article.replace(/[^0-9]/g, '');
        if (digits) articleNum = parseInt(digits, 10);
      }

      if (articleNum === undefined || Number.isNaN(articleNum)) {
        logger.warn({ article }, 'Invalid article value provided to findProvisionsByArticle');
        return [];
      }

      const results = await db
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.article_number, articleNum))
        .orderBy(asc(constitutional_provisions.section_number));

      return results;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'findProvisionsByArticle', metadata: { article } });
  }

  // ============================================================================
  // LEGAL PRECEDENTS OPERATIONS
  // ============================================================================

  async findPrecedentById(id: string) {
    return safeAsync(async () => {
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      const rows = await db
        .select()
        .from(legal_precedents)
        .where(eq(legal_precedents.id, sanitizedId))
        .limit(1);

      return rows[0] || null;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'findPrecedentById', metadata: { id } });
  }

  async searchPrecedents(options: PrecedentSearchOptions) {
    return safeAsync(async () => {
      const { 
        provisionIds = [], 
        minRelevanceScore = 0, 
        isBinding = true,
        keywords = [],
        limit = 100 
      } = options;

      const sanitizedKeywords = keywords.map(k => inputSanitizationService.sanitizeString(k)).filter(Boolean);
      const sanitizedProvisionIds = provisionIds.map(id => inputSanitizationService.sanitizeString(id)).filter(Boolean);
      const sanitizedLimit = Math.min(Math.max(1, limit), 500);

      let query = db.select().from(legal_precedents).$dynamic();
      const conditions: (SQL | undefined)[] = [];

      if (sanitizedProvisionIds.length > 0) {
        const provisionArray = sql.join(
          sanitizedProvisionIds.map(id => sql`${id}::uuid`),
          sql`, `
        );
        conditions.push(
          sql`${legal_precedents.constitutional_provisions_involved} && ARRAY[${provisionArray}]`
        );
      }

      if (isBinding) {
        conditions.push(eq(legal_precedents.precedent_strength, 'binding'));
      }

      if (minRelevanceScore && minRelevanceScore > 0) {
        if (minRelevanceScore >= 0.8) {
          conditions.push(eq(legal_precedents.precedent_strength, 'binding'));
        } else if (minRelevanceScore >= 0.6) {
          const bindingOrPersuasive = or(
            eq(legal_precedents.precedent_strength, 'binding'), 
            eq(legal_precedents.precedent_strength, 'persuasive')
          );
          if (bindingOrPersuasive) {
            conditions.push(bindingOrPersuasive);
          }
        }
      }

      if (sanitizedKeywords.length > 0) {
        const keywordConditions = sanitizedKeywords.map(keyword =>
          or(
            like(legal_precedents.case_name, `%${keyword}%`),
            like(legal_precedents.legal_principle, `%${keyword}%`),
            like(legal_precedents.case_summary, `%${keyword}%`)
          )
        );
        conditions.push(or(...keywordConditions));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions) as SQL);
      }

      const results = await query
        .orderBy(desc(legal_precedents.judgment_date), desc(legal_precedents.case_name))
        .limit(sanitizedLimit);

      return results;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'searchPrecedents', metadata: { options } });
  }

  async findHighRelevanceBindingPrecedents(minRelevanceScore: number = 0.8) {
    return this.searchPrecedents({
      minRelevanceScore,
      isBinding: true
    });
  }

  // ============================================================================
  // CONSTITUTIONAL ANALYSES OPERATIONS
  // ============================================================================

  async saveAnalysis(analysis: ConstitutionalAnalysis) {
    return safeAsync(async () => {
      const sanitizedBillId = inputSanitizationService.sanitizeString(analysis.bill_id);
      const sanitizedType = inputSanitizationService.sanitizeString(analysis.analysis_type);
      
      // If there are specific provisions being analyzed, check against the first one for this basic query
      const provisionId = Array.isArray(analysis.constitutional_provisions_cited) && analysis.constitutional_provisions_cited.length > 0 
        ? analysis.constitutional_provisions_cited[0] : null;

      const existing = provisionId 
        ? await this.findExistingAnalysis(sanitizedBillId, provisionId, sanitizedType)
        : null;

      let savedAnalysis: ConstitutionalAnalysis;

      if (existing) {
        await this.markAsSuperseded(existing.id, analysis.id);
        savedAnalysis = await this.insertNewAnalysis(analysis);

        const newConfidence = parseFloat(analysis.confidence_score || '0');
        const oldConfidence = parseFloat(existing.confidence_score || '0');

        await this.logAuditTrail(analysis.id, 'updated', {
          superseded_analysis_id: existing.id,
          confidence_change: newConfidence - oldConfidence,
          alignment_change: {
            from: existing.constitutional_alignment,
            to: analysis.constitutional_alignment
          }
        });

        logger.info({
          analysis_id: savedAnalysis.id,
          confidence_delta: newConfidence - oldConfidence
        }, 'Updated constitutional analysis');
      } else {
        savedAnalysis = await this.insertNewAnalysis(analysis);

        await this.logAuditTrail(analysis.id, 'created', {
          initial_confidence: analysis.confidence_score,
          initial_alignment: analysis.constitutional_alignment
        });

        logger.info({
          analysis_id: savedAnalysis.id,
          confidence: analysis.confidence_score
        }, 'Created new constitutional analysis');
      }

      return savedAnalysis;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'saveAnalysis', metadata: { bill_id: analysis.bill_id } });
  }

  async findAnalysesByBillId(bill_id: string) {
    return safeAsync(async () => {
      const sanitizedBillId = inputSanitizationService.sanitizeString(bill_id);

      const analyses = await db
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.bill_id, sanitizedBillId),
            sql`${constitutional_analyses.superseded_by} IS NULL`
          )
        )
        .orderBy(
          desc(constitutional_analyses.confidence_score),
          desc(constitutional_analyses.created_at)
        );

      return analyses;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'findAnalysesByBillId', metadata: { bill_id } });
  }

  async findAnalysisById(id: string) {
    return safeAsync(async () => {
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      const [analysis] = await db
        .select()
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.id, sanitizedId))
        .limit(1);

      return analysis || null;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'findAnalysisById', metadata: { id } });
  }

  // ============================================================================
  // EXPERT REVIEW QUEUE OPERATIONS
  // ============================================================================

  async queueForExpertReview(request: QueueItemRequest) {
    return safeAsync(async () => {
      const sanitizedAnalysisId = inputSanitizationService.sanitizeString(request.analysis_id);
      const sanitizedBillId = inputSanitizationService.sanitizeString(request.bill_id);
      const sanitizedReason = inputSanitizationService.sanitizeString(request.review_reason);

      const [existing] = await db
        .select()
        .from(expert_review_queue)
        .where(eq(expert_review_queue.analysis_id, sanitizedAnalysisId))
        .limit(1);

      if (existing) {
        logger.debug({ analysis_id: sanitizedAnalysisId }, 'Analysis already queued for review');
        return;
      }

      const due_date = this.calculateDueDate(request.complexity_score);
      const priority = request.complexity_score >= 90 ? 'high' : request.complexity_score >= 70 ? 'high' : request.complexity_score >= 50 ? 'medium' : 'low';

      await withTransaction(async (tx: any) => {
        await tx
          .insert(expert_review_queue)
          .values({
            analysis_id: sanitizedAnalysisId,
            bill_id: sanitizedBillId,
            review_reason: sanitizedReason,
            priority_level: priority,
            review_notes: JSON.stringify({ 
              uncertainty_flags: request.uncertainty_flags, 
              estimated_review_time: request.estimated_review_time, 
              recommended_expertise: request.recommended_expertise 
            }),
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          });
      });

      logger.info({ 
        due_date,
        uncertaintyFlagCount: request.uncertainty_flags.length
      }, 'Queued analysis for expert review');
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'queueForExpertReview', metadata: { request } });
  }

  async getExpertReviewQueueStatus() {
    return safeAsync(async () => {
      const results = await db
        .select({
          pendingCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending')`,
          highPriorityCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending' AND ${expert_review_queue.priority_level} = 'high')`,
          avgWaitHours: sql<number>`avg(extract(epoch from (now() - ${expert_review_queue.created_at})) / 3600) filter (where ${expert_review_queue.status} = 'pending')`
        })
        .from(expert_review_queue);

      const statusResult = results[0];

      const status = {
        pendingCount: Number(statusResult?.pendingCount) || 0,
        averageWaitTime: Math.round((Number(statusResult?.avgWaitHours) || 0) * 60),
        highPriorityCount: Number(statusResult?.highPriorityCount) || 0
      };

      return status;
    }, { service: 'ConstitutionalAnalysisServiceComplete', operation: 'getExpertReviewQueueStatus' });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async findExistingAnalysis(
    bill_id: string,
    provisionId: string,
    analysisType: string
  ): Promise<ConstitutionalAnalysis | null> {
    const rows = await db
      .select()
      .from(constitutional_analyses)
      .where(
        and(
          eq(constitutional_analyses.bill_id, bill_id),
          sql`${provisionId} = ANY(${constitutional_analyses.constitutional_provisions_cited})`,
          eq(constitutional_analyses.analysis_type, analysisType),
          sql`${constitutional_analyses.superseded_by} IS NULL`
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  private async insertNewAnalysis(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const rows = await withTransaction(async (tx: any) => {
      return tx
        .insert(constitutional_analyses)
        .values({
          ...analysis,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
    });

    return rows[0] as ConstitutionalAnalysis;
  }

  private async markAsSuperseded(analysis_id: string, supersededById: string): Promise<void> {
    await withTransaction(async (tx: any) => {
      await tx
        .update(constitutional_analyses)
        .set({
          is_superseded: true,
          superseded_by_id: supersededById,
          superseded_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(constitutional_analyses.id, analysis_id));
    });
  }

  private async logAuditTrail(
    analysis_id: string,
    changeType: 'created' | 'updated' | 'reviewed',
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await withTransaction(async (tx: any) => {
        await tx
          .insert(analysis_audit_trail)
          .values({
            analysis_id: analysis_id,
            action_type: changeType,
            actor_type: 'system',
            changes_made: metadata,
            created_at: new Date()
          });
      });
    } catch (error) {
      logger.warn({ analysis_id, changeType, error: String(error) }, 'Failed to log audit trail');
    }
  }

  private calculateDueDate(complexityScore: number): Date {
    const dueDate = new Date();

    if (complexityScore >= 90) {
      dueDate.setHours(dueDate.getHours() + 4);
    } else if (complexityScore >= 70) {
      dueDate.setHours(dueDate.getHours() + 24);
    } else if (complexityScore >= 50) {
      dueDate.setDate(dueDate.getDate() + 3);
    } else {
      dueDate.setDate(dueDate.getDate() + 7);
    }

    return dueDate;
  }
}

export const constitutionalAnalysisServiceComplete = new ConstitutionalAnalysisServiceComplete();
