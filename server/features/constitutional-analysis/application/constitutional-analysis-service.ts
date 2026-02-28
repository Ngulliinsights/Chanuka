import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database/connection';
import {
  analysis_audit_trail,
  constitutional_analyses,
  constitutional_provisions,
  expert_review_queue,
  legal_precedents} from '@server/infrastructure/schema';
import { and, asc, desc, eq, like, or,sql } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Infer types from the actual schema tables
type ConstitutionalProvision = typeof constitutional_provisions.$inferSelect;
type LegalPrecedent = typeof legal_precedents.$inferSelect;
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
  // Article may be passed as a number or a human-readable string; handle both
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

/**
 * ConstitutionalAnalysisServiceComplete - Comprehensive data access layer
 * 
 * This service provides a complete data access layer for constitutional analysis,
 * managing provisions, precedents, analyses, and the expert review queue. It handles
 * all database operations and ensures data integrity through audit trails and
 * version management.
 * 
 * Key Responsibilities:
 * - Constitutional provisions lookup and search
 * - Legal precedents retrieval with relevance filtering
 * - Analysis persistence with versioning (superseding old analyses)
 * - Expert review queue management
 * - Audit trail logging for compliance
 */
export class ConstitutionalAnalysisServiceComplete {


  // ============================================================================
  // CONSTITUTIONAL PROVISIONS OPERATIONS
  // ============================================================================

  /**
   * Finds a specific constitutional provision by its unique identifier.
   * Used when you need the full details of a known provision.
   */
  async findProvisionById(id: string): Promise<ConstitutionalProvision | null> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findProvisionById', 
      id 
    };
    logger.debug('Finding constitutional provision by ID', logContext);

    try {
      const rows = await readDatabase(async (db) => {
        return db
          .select()
          .from(constitutional_provisions)
          .where(eq(constitutional_provisions.id, id))
          .limit(1);
      });

      const provision = rows[0] as ConstitutionalProvision | undefined;
      return provision || null;
    } catch (error) {
      logger.error('Failed to find constitutional provision by ID', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Searches for constitutional provisions using flexible text matching.
   * Searches across title and text fields to find relevant provisions.
   */
  async searchProvisions(options: ProvisionSearchOptions): Promise<ConstitutionalProvision[]> {
    const { searchTerm, article, limit = 50 } = options;
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'searchProvisions', 
      searchTerm,
      article,
      limit 
    };
    logger.debug('Searching constitutional provisions', logContext);

    try {
      const results = await readDatabase(async (db) => {
        let query = readDatabase.select().from(constitutional_provisions);

        // Build dynamic where conditions based on provided options
        const conditions = [];
        
        if (searchTerm) {
          conditions.push(
            or(
              like(constitutional_provisions.title, `%${searchTerm}%`),
              // schema uses `full_text` for provision body
              like(constitutional_provisions.full_text, `%${searchTerm}%`)
            )
          );
        }

        if (article !== undefined && article !== null && article !== '') {
          // Accept numeric or human strings like "Article 1" or "Article I". Try to extract digits.
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
          query = query.where(and(...conditions)) as typeof query;
        }

        return query
          .orderBy(asc(constitutional_provisions.article_number))
          .limit(limit);
      });

      logger.debug('Constitutional provisions search completed', { 
        ...logContext, 
        count: results.length 
      });
      return results;
    } catch (error) {
      logger.error('Failed to search constitutional provisions', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves all provisions within a specific constitutional article.
   * Useful for getting the complete context of a constitutional area.
   */
  async findProvisionsByArticle(article: string): Promise<ConstitutionalProvision[]> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findProvisionsByArticle', 
      article 
    };
    logger.debug('Finding provisions by article', logContext);

    try {
      // Coerce article to a number for comparison with article_number (smallint)
      let articleNum: number | undefined;
      if (typeof article === 'number') articleNum = article;
      else if (typeof article === 'string') {
        const digits = article.replace(/[^0-9]/g, '');
        if (digits) articleNum = parseInt(digits, 10);
      }

      if (articleNum === undefined || Number.isNaN(articleNum)) {
        logger.warn('Invalid article value provided to findProvisionsByArticle', { article });
        return [];
      }

      const results = await readDatabase(async (db) => {
        return db
          .select()
          .from(constitutional_provisions)
          .where(eq(constitutional_provisions.article_number, articleNum))
          .orderBy(asc(constitutional_provisions.section_number));
      });

      logger.debug('Found provisions by article', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to find provisions by article', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // LEGAL PRECEDENTS OPERATIONS
  // ============================================================================

  /**
   * Finds a specific legal precedent by its unique identifier.
   */
  async findPrecedentById(id: string): Promise<LegalPrecedent | null> {
    const logContext = { 
      component: 'ConstitutionalAnalysisServiceComplete', 
      operation: 'findPrecedentById', 
      id 
    };
    logger.debug('Finding legal precedent by ID', logContext);

    try {
      const rows = await readDatabase(async (db) => {
        return db
          .select()
          .from(legal_precedents)
          .where(eq(legal_precedents.id, id))
          .limit(1);
      });

      const precedent = rows[0] as LegalPrecedent | undefined;
      return precedent || null;
    } catch (error) {
      logger.error('Failed to find legal precedent by ID', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Finds relevant legal precedents based on flexible search criteria.
   * This is the main method for retrieving precedents during analysis.
   * 
   * Filters precedents by:
   * - Constitutional provision IDs (finds precedents that cite those provisions)
   * - Minimum relevance score threshold
   * - Binding status (whether the precedent is legally binding)
   * - Keywords in case name or key holdings
   */
  async searchPrecedents(options: PrecedentSearchOptions): Promise<LegalPrecedent[]> {
    const { 
      provisionIds = [], 
      minRelevanceScore = 0, 
      isBinding = true,
      keywords = [],
      limit = 100 
    } = options;
    
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'searchPrecedents',
      provisionCount: provisionIds.length,
      minRelevanceScore,
      isBinding,
      keywordCount: keywords.length
    };
    logger.debug('Searching for legal precedents', logContext);

    try {
      const results = await readDatabase(async (db) => {
        let query = readDatabase.select().from(legal_precedents);
        
        const conditions = [];

        // Filter by constitutional provisions if specified
        if (provisionIds.length > 0) {
          // schema column: `constitutional_provisions_involved`
          conditions.push(
            sql`${legal_precedents.constitutional_provisions_involved} && ARRAY[${sql.raw(provisionIds.map(id => `'${id}'`).join(','))}]::uuid[]`
          );
        }

        // Filter by binding status -> schema uses `precedent_strength` (values like 'binding','persuasive')
        if (isBinding) {
          conditions.push(eq(legal_precedents.precedent_strength, 'binding'));
        }

        // Filter by minimum relevance score (map to precedent_strength heuristically)
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
          // For lower thresholds we don't add a filter since schema lacks a numeric relevance_score
        }

        // Filter by keywords in case name, principle, or summary
        if (keywords.length > 0) {
          const keywordConditions = keywords.map(keyword =>
            or(
              like(legal_precedents.case_name, `%${keyword}%`),
              like(legal_precedents.legal_principle, `%${keyword}%`),
              like(legal_precedents.case_summary, `%${keyword}%`)
            )
          );
          conditions.push(or(...keywordConditions));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        return query
          // Order by judgment date (most recent first) and case name as secondary
          .orderBy(desc(legal_precedents.judgment_date), desc(legal_precedents.case_name))
          .limit(limit);
      });

      logger.debug('Found legal precedents', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to search precedents', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Convenience method to find only high-relevance binding precedents.
   * This is commonly used for initial analysis to focus on the most important cases.
   */
  async findHighRelevanceBindingPrecedents(minRelevanceScore: number = 0.8): Promise<LegalPrecedent[]> {
    return this.searchPrecedents({
      minRelevanceScore,
      isBinding: true
    });
  }

  // ============================================================================
  // CONSTITUTIONAL ANALYSES OPERATIONS
  // ============================================================================

  /**
   * Saves a constitutional analysis with intelligent versioning.
   * 
   * This method handles two scenarios:
   * 1. New analysis: Simply inserts the analysis and logs creation
   * 2. Updated analysis: Marks the old analysis as superseded, creates the new one,
   *    and logs the changes for audit purposes
   * 
   * This versioning approach maintains a complete history of how our understanding
   * of a bill's constitutionality has evolved over time.
   */
  async saveAnalysis(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'saveAnalysis',
      bill_id: analysis.bill_id,
      provisionId: analysis.provision_id
    };
    logger.debug('Saving constitutional analysis', logContext);

    try {
      // Check if we're updating an existing analysis
      const existing = await this.findExistingAnalysis(
        analysis.bill_id,
        analysis.provision_id,
        analysis.analysis_type
      );

      let savedAnalysis: ConstitutionalAnalysis;

      if (existing) {
        // This is an update - mark old analysis as superseded
        await this.markAsSuperseded(existing.id, analysis.id);
        savedAnalysis = await this.insertNewAnalysis(analysis);

        // Log the change with metadata about what changed
        await this.logAuditTrail(analysis.id, 'updated', {
          superseded_analysis_id: existing.id,
          confidence_change: analysis.confidence_score - existing.confidence_score,
          risk_change: {
            from: existing.risk_level,
            to: analysis.risk_level
          }
        });

        logger.info('✅ Updated constitutional analysis', {
          ...logContext,
          analysis_id: savedAnalysis.id,
          confidence_delta: analysis.confidence_score - existing.confidence_score
        });
      } else {
        // This is a new analysis
        savedAnalysis = await this.insertNewAnalysis(analysis);

        await this.logAuditTrail(analysis.id, 'created', {
          initial_confidence: analysis.confidence_score,
          initial_risk: analysis.risk_level
        });

        logger.info('✅ Created new constitutional analysis', {
          ...logContext,
          analysis_id: savedAnalysis.id,
          confidence: analysis.confidence_score
        });
      }

      return savedAnalysis;
    } catch (error) {
      logger.error('Failed to save constitutional analysis', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves all current (non-superseded) analyses for a bill.
   * Returns analyses ordered by confidence and recency.
   */
  async findAnalysesByBillId(bill_id: string): Promise<ConstitutionalAnalysis[]> {
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'findAnalysesByBillId',
      bill_id
    };
    logger.debug('Finding constitutional analyses for bill', logContext);

    try {
      const analyses = await readDatabase(async (db) => {
        return db
          .select()
          .from(constitutional_analyses)
          .where(
            and(
              eq(constitutional_analyses.bill_id, bill_id),
              eq(constitutional_analyses.is_superseded, false)
            )
          )
          .orderBy(
            desc(constitutional_analyses.confidence_score),
            desc(constitutional_analyses.created_at)
          );
      });

      logger.debug('Found analyses for bill', { ...logContext, count: analyses.length });
      return analyses;
    } catch (error) {
      logger.error('Failed to find analyses for bill', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves a specific analysis by its ID.
   */
  async findAnalysisById(id: string): Promise<ConstitutionalAnalysis | null> {
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'findAnalysisById',
      id
    };
    logger.debug('Finding constitutional analysis by ID', logContext);

    try {
      const [analysis] = await readDatabase(async (db) => {
        return db
          .select()
          .from(constitutional_analyses)
          .where(eq(constitutional_analyses.id, id))
          .limit(1);
      });

      return analysis || null;
    } catch (error) {
      logger.error('Failed to find analysis by ID', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // EXPERT REVIEW QUEUE OPERATIONS
  // ============================================================================

  /**
   * Queues an analysis for expert human review.
   * 
   * This is typically called when:
   * - The analysis has low confidence
   * - Multiple constitutional concerns are identified
   * - The bill touches sensitive or complex constitutional areas
   * - Precedents are conflicting or unclear
   */
  async queueForExpertReview(request: QueueItemRequest): Promise<void> {
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'queueForExpertReview',
      analysis_id: request.analysis_id,
      complexity: request.complexity_score
    };
    logger.debug('Queueing analysis for expert review', logContext);

    try {
      // Prevent duplicate queue entries
      const existingRows = await readDatabase(async (db) => {
        return db
          .select()
          .from(expert_review_queue)
          .where(eq(expert_review_queue.analysis_id, request.analysis_id))
          .limit(1);
      });

      const existing = existingRows[0];

      if (existing) {
        logger.debug('Analysis already queued for review', logContext);
        return;
      }

      const due_date = this.calculateDueDate(request.complexity_score);

      // Map complexity score to priority_level and record uncertainty flags in review_notes
      const priority = request.complexity_score >= 90 ? 'high' : request.complexity_score >= 70 ? 'high' : request.complexity_score >= 50 ? 'medium' : 'low';

      await withTransaction(async (tx) => {
        await tx
          .insert(expert_review_queue)
          .values({
            analysis_id: request.analysis_id,
            bill_id: request.bill_id,
            review_reason: request.review_reason,
            priority_level: priority,
            review_notes: JSON.stringify({ uncertainty_flags: request.uncertainty_flags, estimated_review_time: request.estimated_review_time, recommended_expertise: request.recommended_expertise }),
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          });
      });

      logger.info('✅ Queued analysis for expert review', { 
        ...logContext,
        due_date,
        uncertaintyFlagCount: request.uncertainty_flags.length
      });
    } catch (error) {
      logger.error('Failed to queue analysis for expert review', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves the current status of the expert review queue.
   * Provides metrics on pending items, wait times, and high-priority cases.
   */
  async getExpertReviewQueueStatus(): Promise<ExpertReviewQueueStatus> {
    const logContext = {
      component: 'ConstitutionalAnalysisServiceComplete',
      operation: 'getExpertReviewQueueStatus'
    };
    logger.debug('Getting expert review queue status', logContext);

    try {
      const results = await readDatabase(async (db) => {
        return db
          .select({
            pendingCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending')`,
            highPriorityCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending' AND ${expert_review_queue.priority_level} = 'high')`,
            avgWaitHours: sql<number>`avg(extract(epoch from (now() - ${expert_review_queue.created_at})) / 3600) filter (where ${expert_review_queue.status} = 'pending')`
          })
          .from(expert_review_queue);
      });

      const statusResult = results[0];

      const status = {
        pendingCount: Number(statusResult?.pendingCount) || 0,
        averageWaitTime: Math.round((Number(statusResult?.avgWaitHours) || 0) * 60), // Convert to minutes
        highPriorityCount: Number(statusResult?.highPriorityCount) || 0
      };

      logger.debug('Retrieved queue status', { ...logContext, status });
      return status;
    } catch (error) {
      logger.error('Failed to get queue status', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Finds an existing non-superseded analysis matching the given criteria.
   * Used to determine if we're creating a new analysis or updating an existing one.
   */
  private async findExistingAnalysis(
    bill_id: string,
    provisionId: string,
    analysisType: string
  ): Promise<ConstitutionalAnalysis | null> {
    const rows = await readDatabase(async (db) => {
      return db
        .select()
        .from(constitutional_analyses)
        .where(
          and(
            eq(constitutional_analyses.bill_id, bill_id),
            eq(constitutional_analyses.provision_id, provisionId),
            eq(constitutional_analyses.analysis_type, analysisType),
            eq(constitutional_analyses.is_superseded, false)
          )
        )
        .limit(1);
    });

    const existing = rows[0] as ConstitutionalAnalysis | undefined;
    return existing || null;
  }

  /**
   * Inserts a new analysis record into the database.
   */
  private async insertNewAnalysis(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis> {
    const rows = await withTransaction(async (tx) => {
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

  /**
   * Marks an analysis as superseded by a newer version.
   * This maintains our version history without deleting old analyses.
   */
  private async markAsSuperseded(analysis_id: string, supersededById: string): Promise<void> {
    await withTransaction(async (tx) => {
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

  /**
   * Logs an entry to the audit trail for compliance and debugging.
   * Audit trails help us understand how analyses have changed over time.
   */
  private async logAuditTrail(
    analysis_id: string,
    changeType: 'created' | 'updated' | 'reviewed',
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .insert(analysis_audit_trail)
          .values({
            analysis_id: analysis_id,
            action_type: changeType,
            actor_type: 'system',
            // schema column is `changes_made` not `metadata`
            changes_made: metadata,
            created_at: new Date()
          });
      });
    } catch (error) {
      // Audit trail failures shouldn't break the main operation
      logger.warn('Failed to log audit trail', { analysis_id, changeType, error });
    }
  }

  /**
   * Calculates when an expert review is due based on complexity score.
   * Higher complexity scores get shorter due dates to ensure timely review.
   */
  private calculateDueDate(complexityScore: number): Date {
    const dueDate = new Date();

    if (complexityScore >= 90) {
      // Critical complexity - 4 hours
      dueDate.setHours(dueDate.getHours() + 4);
    } else if (complexityScore >= 70) {
      // High complexity - 24 hours
      dueDate.setHours(dueDate.getHours() + 24);
    } else if (complexityScore >= 50) {
      // Medium complexity - 3 days
      dueDate.setDate(dueDate.getDate() + 3);
    } else {
      // Low complexity - 7 days
      dueDate.setDate(dueDate.getDate() + 7);
    }

    return dueDate;
  }
}

// Export singleton instance for use throughout the application
export const constitutionalAnalysisServiceComplete = new ConstitutionalAnalysisServiceComplete();


