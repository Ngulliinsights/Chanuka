// ============================================================================
// LEGAL PRECEDENTS REPOSITORY - Database Access Layer
// ============================================================================
// Repository implementation for legal precedents using Drizzle ORM

import { eq, and, or, ilike, inArray, sql, desc, gte, lte } from 'drizzle-orm';
import { readDatabase } from '../../../../../shared/database/connection.js';
import { legal_precedents } from '../../../../../shared/schema/index.js';
import { logger } from '../../../../../shared/core/index.js';
import type { LegalPrecedent } from '../../../../../shared/schema/index.js';

export class LegalPrecedentsRepository {
  private get db() {
    return readDatabase;
  }

  /**
   * Find precedents that reference specific constitutional provisions
   */
  async findByConstitutionalProvisions(provisionIds: string[]): Promise<LegalPrecedent[]> {
    try {
      if (provisionIds.length === 0) {
        return [];
      }

      logger.debug(`Finding precedents for ${provisionIds.length} constitutional provisions`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false),
            sql`${legal_precedents.constitutional_provisions} && ARRAY[${provisionIds.join(',')}]::uuid[]`
          )
        )
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.judgment_date)
        );

      logger.debug(`Found ${precedents.length} precedents for constitutional provisions`, {
        component: 'LegalPrecedentsRepository',
        provisionCount: provisionIds.length
      });

      return precedents;

    } catch (error) {
      logger.error('Failed to find precedents by constitutional provisions', {
        component: 'LegalPrecedentsRepository',
        provisionCount: provisionIds.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find precedents by court level
   */
  async findByCourtLevel(courtLevel: 'supreme_court' | 'court_of_appeal' | 'high_court'): Promise<LegalPrecedent[]> {
    try {
      logger.debug(`Finding precedents by court level: ${courtLevel}`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.court_level, courtLevel),
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false)
          )
        )
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.judgment_date)
        );

      logger.debug(`Found ${precedents.length} precedents for court level: ${courtLevel}`, {
        component: 'LegalPrecedentsRepository'
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to find precedents by court level: ${courtLevel}`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find binding precedents with high relevance scores
   */
  async findHighRelevanceBinding(minRelevanceScore: number): Promise<LegalPrecedent[]> {
    try {
      logger.debug(`Finding high relevance binding precedents (min score: ${minRelevanceScore})`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false),
            gte(legal_precedents.relevance_score_percentage, minRelevanceScore)
          )
        )
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.citation_count),
          desc(legal_precedents.judgment_date)
        )
        .limit(50); // Limit to top 50 most relevant

      logger.debug(`Found ${precedents.length} high relevance binding precedents`, {
        component: 'LegalPrecedentsRepository',
        minRelevanceScore
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to find high relevance binding precedents`, {
        component: 'LegalPrecedentsRepository',
        minRelevanceScore,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search precedents by case name or citation
   */
  async searchByCaseNameOrCitation(searchTerm: string): Promise<LegalPrecedent[]> {
    try {
      logger.debug(`Searching precedents by case name or citation: ${searchTerm}`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          or(
            ilike(legal_precedents.case_name, `%${searchTerm}%`),
            ilike(legal_precedents.case_citation, `%${searchTerm}%`),
            ilike(legal_precedents.case_number, `%${searchTerm}%`)
          )
        )
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.judgment_date)
        )
        .limit(25);

      logger.debug(`Found ${precedents.length} precedents matching search term`, {
        component: 'LegalPrecedentsRepository',
        searchTerm
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to search precedents by case name or citation: ${searchTerm}`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find precedent by ID
   */
  async findById(id: string): Promise<LegalPrecedent | null> {
    try {
      logger.debug(`Finding precedent by ID: ${id}`, {
        component: 'LegalPrecedentsRepository'
      });

      const [precedent] = await this.db
        .select()
        .from(legal_precedents)
        .where(eq(legal_precedents.id, id))
        .limit(1);

      if (!precedent) {
        logger.debug(`Precedent not found: ${id}`, {
          component: 'LegalPrecedentsRepository'
        });
        return null;
      }

      return precedent;

    } catch (error) {
      logger.error(`Failed to find precedent by ID: ${id}`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find precedents by multiple IDs
   */
  async findByIds(ids: string[]): Promise<LegalPrecedent[]> {
    try {
      if (ids.length === 0) {
        return [];
      }

      logger.debug(`Finding precedents by IDs: ${ids.length} precedents`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(inArray(legal_precedents.id, ids))
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.judgment_date)
        );

      logger.debug(`Found ${precedents.length} precedents by IDs`, {
        component: 'LegalPrecedentsRepository'
      });

      return precedents;

    } catch (error) {
      logger.error('Failed to find precedents by IDs', {
        component: 'LegalPrecedentsRepository',
        idsCount: ids.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find recent precedents (within specified years)
   */
  async findRecentPrecedents(withinYears: number = 10, limit: number = 20): Promise<LegalPrecedent[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

      logger.debug(`Finding recent precedents within ${withinYears} years`, {
        component: 'LegalPrecedentsRepository',
        cutoffDate: cutoffDate.toISOString()
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            gte(legal_precedents.judgment_date, cutoffDate),
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false)
          )
        )
        .orderBy(
          desc(legal_precedents.judgment_date),
          desc(legal_precedents.relevance_score_percentage)
        )
        .limit(limit);

      logger.debug(`Found ${precedents.length} recent precedents`, {
        component: 'LegalPrecedentsRepository',
        withinYears
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to find recent precedents within ${withinYears} years`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find landmark cases (highly cited precedents)
   */
  async findLandmarkCases(minCitations: number = 20, limit: number = 15): Promise<LegalPrecedent[]> {
    try {
      logger.debug(`Finding landmark cases with min ${minCitations} citations`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            gte(legal_precedents.citation_count, minCitations),
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false)
          )
        )
        .orderBy(
          desc(legal_precedents.citation_count),
          desc(legal_precedents.relevance_score_percentage)
        )
        .limit(limit);

      logger.debug(`Found ${precedents.length} landmark cases`, {
        component: 'LegalPrecedentsRepository',
        minCitations
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to find landmark cases`, {
        component: 'LegalPrecedentsRepository',
        minCitations,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Full-text search across precedent content
   */
  async fullTextSearch(searchTerm: string, limit: number = 20): Promise<LegalPrecedent[]> {
    try {
      logger.debug(`Performing full-text search on precedents: ${searchTerm}`, {
        component: 'LegalPrecedentsRepository'
      });

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false),
            or(
              sql`to_tsvector('english', ${legal_precedents.case_summary}) @@ plainto_tsquery('english', ${searchTerm})`,
              sql`to_tsvector('english', ${legal_precedents.holding}) @@ plainto_tsquery('english', ${searchTerm})`,
              sql`to_tsvector('english', ${legal_precedents.reasoning}) @@ plainto_tsquery('english', ${searchTerm})`
            )
          )
        )
        .orderBy(
          // Order by text search ranking
          desc(
            sql`ts_rank(to_tsvector('english', ${legal_precedents.case_summary} || ' ' || ${legal_precedents.holding}), plainto_tsquery('english', ${searchTerm}))`
          ),
          desc(legal_precedents.relevance_score_percentage)
        )
        .limit(limit);

      logger.debug(`Full-text search found ${precedents.length} precedents`, {
        component: 'LegalPrecedentsRepository',
        searchTerm
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to perform full-text search on precedents: ${searchTerm}`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search precedents by keywords
   */
  async searchByKeywords(keywords: string[]): Promise<LegalPrecedent[]> {
    try {
      if (keywords.length === 0) {
        return [];
      }

      logger.debug(`Searching precedents by keywords: ${keywords.join(', ')}`, {
        component: 'LegalPrecedentsRepository'
      });

      // Build keyword search conditions
      const keywordConditions = keywords.map(keyword =>
        or(
          ilike(legal_precedents.case_name, `%${keyword}%`),
          ilike(legal_precedents.holding, `%${keyword}%`),
          ilike(legal_precedents.case_summary, `%${keyword}%`),
          ilike(legal_precedents.reasoning, `%${keyword}%`)
        )
      );

      const precedents = await this.db
        .select()
        .from(legal_precedents)
        .where(
          and(
            eq(legal_precedents.is_binding, true),
            eq(legal_precedents.is_overruled, false),
            or(...keywordConditions)
          )
        )
        .orderBy(
          desc(legal_precedents.relevance_score_percentage),
          desc(legal_precedents.judgment_date)
        )
        .limit(25);

      logger.debug(`Found ${precedents.length} precedents matching keywords`, {
        component: 'LegalPrecedentsRepository',
        keywords
      });

      return precedents;

    } catch (error) {
      logger.error(`Failed to search precedents by keywords`, {
        component: 'LegalPrecedentsRepository',
        keywords,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get precedent statistics (alias for compatibility)
   */
  async getStatistics() {
    return this.getPrecedentStatistics();
  }

  /**
   * Get precedent statistics
   */
  async getPrecedentStatistics(): Promise<{
    totalPrecedents: number;
    bindingPrecedents: number;
    overruledPrecedents: number;
    precedentsByCourtLevel: Record<string, number>;
    averageRelevanceScore: number;
    totalCitations: number;
  }> {
    try {
      logger.debug('Getting precedent statistics', {
        component: 'LegalPrecedentsRepository'
      });

      // Get basic counts
      const [countsResult] = await this.db
        .select({
          total: sql<number>`count(*)`,
          binding: sql<number>`count(*) filter (where ${legal_precedents.is_binding} = true)`,
          overruled: sql<number>`count(*) filter (where ${legal_precedents.is_overruled} = true)`,
          avgRelevance: sql<number>`avg(${legal_precedents.relevance_score_percentage})`,
          totalCitations: sql<number>`sum(${legal_precedents.citation_count})`
        })
        .from(legal_precedents);

      // Get precedents by court level
      const courtLevelResults = await this.db
        .select({
          courtLevel: legal_precedents.court_level,
          count: sql<number>`count(*)`
        })
        .from(legal_precedents)
        .where(eq(legal_precedents.is_binding, true))
        .groupBy(legal_precedents.court_level);

      const precedentsByCourtLevel = courtLevelResults.reduce((acc, row) => {
        acc[row.courtLevel] = row.count;
        return acc;
      }, {} as Record<string, number>);

      const statistics = {
        totalPrecedents: countsResult.total,
        bindingPrecedents: countsResult.binding,
        overruledPrecedents: countsResult.overruled,
        precedentsByCourtLevel,
        averageRelevanceScore: Math.round(countsResult.avgRelevance || 0),
        totalCitations: countsResult.totalCitations || 0
      };

      logger.debug('Retrieved precedent statistics', {
        component: 'LegalPrecedentsRepository',
        statistics
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get precedent statistics', {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update citation count for a precedent
   */
  async updateCitationCount(precedentId: string, newCount: number): Promise<void> {
    try {
      logger.debug(`Updating citation count for precedent ${precedentId} to ${newCount}`, {
        component: 'LegalPrecedentsRepository'
      });

      await this.db
        .update(legal_precedents)
        .set({
          citation_count: newCount,
          last_cited_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(legal_precedents.id, precedentId));

      logger.debug(`Updated citation count for precedent ${precedentId}`, {
        component: 'LegalPrecedentsRepository'
      });

    } catch (error) {
      logger.error(`Failed to update citation count for precedent ${precedentId}`, {
        component: 'LegalPrecedentsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}