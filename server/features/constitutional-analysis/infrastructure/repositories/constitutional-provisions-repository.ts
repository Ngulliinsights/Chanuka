// ============================================================================
// CONSTITUTIONAL PROVISIONS REPOSITORY - Database Access Layer
// ============================================================================
// Repository implementation for constitutional provisions using Drizzle ORM

import { eq, and, or, ilike, inArray, sql, desc } from 'drizzle-orm';
import { readDatabase } from '../../../../../shared/database/connection.js';
import { constitutional_provisions } from '../../../../../shared/schema/index.js';
import { logger } from '../../../../../shared/core/index.js';
import type { ConstitutionalProvision } from '../../../../../shared/schema/index.js';

export class ConstitutionalProvisionsRepository {
  private get db() {
    return readDatabase;
  }

  /**
   * Find constitutional provisions by article number
   */
  async findByArticleNumber(articleNumber: number): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug(`Finding provisions for article ${articleNumber}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(
          and(
            eq(constitutional_provisions.article_number, articleNumber),
            eq(constitutional_provisions.is_active, true)
          )
        )
        .orderBy(
          constitutional_provisions.hierarchy_level,
          constitutional_provisions.section_number
        );

      logger.debug(`Found ${provisions.length} provisions for article ${articleNumber}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      return provisions;

    } catch (error) {
      logger.error(`Failed to find provisions by article number: ${articleNumber}`, {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find provisions by rights category
   */
  async findByRightsCategory(category: string): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug(`Finding provisions for rights category: ${category}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(
          and(
            eq(constitutional_provisions.rights_category, category),
            eq(constitutional_provisions.is_active, true)
          )
        )
        .orderBy(
          constitutional_provisions.article_number,
          constitutional_provisions.hierarchy_level
        );

      logger.debug(`Found ${provisions.length} provisions for category: ${category}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      return provisions;

    } catch (error) {
      logger.error(`Failed to find provisions by rights category: ${category}`, {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search provisions by keywords
   */
  async searchByKeywords(keywords: string[]): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug(`Searching provisions by keywords: ${keywords.join(', ')}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      if (keywords.length === 0) {
        return [];
      }

      // Build keyword search conditions
      const keywordConditions = keywords.map(keyword =>
        or(
          // Search in keywords array
          sql`${constitutional_provisions.keywords} @> ARRAY[${keyword}]::text[]`,
          // Search in provision text
          ilike(constitutional_provisions.provision_text, `%${keyword}%`),
          // Search in provision summary
          ilike(constitutional_provisions.provision_summary, `%${keyword}%`),
          // Search in article title
          ilike(constitutional_provisions.article_title, `%${keyword}%`)
        )
      );

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(
          and(
            eq(constitutional_provisions.is_active, true),
            or(...keywordConditions)
          )
        )
        .orderBy(
          // Order by relevance (more keyword matches first)
          desc(
            sql`(
              CASE WHEN ${constitutional_provisions.keywords} && ARRAY[${keywords.join(',')}]::text[] THEN 2 ELSE 0 END +
              CASE WHEN ${constitutional_provisions.provision_text} ILIKE ANY(ARRAY[${keywords.map(k => `'%${k}%'`).join(',')}]) THEN 1 ELSE 0 END
            )`
          ),
          constitutional_provisions.article_number
        )
        .limit(50); // Limit results to prevent overwhelming responses

      logger.debug(`Found ${provisions.length} provisions matching keywords`, {
        component: 'ConstitutionalProvisionsRepository',
        keywords
      });

      return provisions;

    } catch (error) {
      logger.error(`Failed to search provisions by keywords`, {
        component: 'ConstitutionalProvisionsRepository',
        keywords,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find provision by ID
   */
  async findById(id: string): Promise<ConstitutionalProvision | null> {
    try {
      logger.debug(`Finding provision by ID: ${id}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const [provision] = await this.db
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.id, id))
        .limit(1);

      if (!provision) {
        logger.debug(`Provision not found: ${id}`, {
          component: 'ConstitutionalProvisionsRepository'
        });
        return null;
      }

      return provision;

    } catch (error) {
      logger.error(`Failed to find provision by ID: ${id}`, {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all active provisions
   */
  async findAllActive(): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug('Finding all active constitutional provisions', {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.is_active, true))
        .orderBy(
          constitutional_provisions.article_number,
          constitutional_provisions.hierarchy_level,
          constitutional_provisions.section_number
        );

      logger.debug(`Found ${provisions.length} active provisions`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      return provisions;

    } catch (error) {
      logger.error('Failed to find all active provisions', {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find provisions by hierarchy path (for finding related provisions)
   */
  async findByHierarchyPath(pathPrefix: string): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug(`Finding provisions by hierarchy path: ${pathPrefix}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(
          and(
            ilike(constitutional_provisions.hierarchy_path, `${pathPrefix}%`),
            eq(constitutional_provisions.is_active, true)
          )
        )
        .orderBy(constitutional_provisions.hierarchy_path);

      logger.debug(`Found ${provisions.length} provisions under hierarchy path: ${pathPrefix}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      return provisions;

    } catch (error) {
      logger.error(`Failed to find provisions by hierarchy path: ${pathPrefix}`, {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find provisions by multiple IDs
   */
  async findByIds(ids: string[]): Promise<ConstitutionalProvision[]> {
    try {
      if (ids.length === 0) {
        return [];
      }

      logger.debug(`Finding provisions by IDs: ${ids.length} provisions`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(inArray(constitutional_provisions.id, ids))
        .orderBy(
          constitutional_provisions.article_number,
          constitutional_provisions.hierarchy_level
        );

      logger.debug(`Found ${provisions.length} provisions by IDs`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      return provisions;

    } catch (error) {
      logger.error('Failed to find provisions by IDs', {
        component: 'ConstitutionalProvisionsRepository',
        idsCount: ids.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Full-text search across provision content
   */
  async fullTextSearch(searchTerm: string, limit: number = 20): Promise<ConstitutionalProvision[]> {
    try {
      logger.debug(`Performing full-text search: ${searchTerm}`, {
        component: 'ConstitutionalProvisionsRepository'
      });

      const provisions = await this.db
        .select()
        .from(constitutional_provisions)
        .where(
          and(
            eq(constitutional_provisions.is_active, true),
            or(
              sql`to_tsvector('english', ${constitutional_provisions.provision_text}) @@ plainto_tsquery('english', ${searchTerm})`,
              sql`to_tsvector('english', ${constitutional_provisions.provision_summary}) @@ plainto_tsquery('english', ${searchTerm})`,
              sql`to_tsvector('english', ${constitutional_provisions.article_title}) @@ plainto_tsquery('english', ${searchTerm})`
            )
          )
        )
        .orderBy(
          // Order by text search ranking
          desc(
            sql`ts_rank(to_tsvector('english', ${constitutional_provisions.provision_text}), plainto_tsquery('english', ${searchTerm}))`
          )
        )
        .limit(limit);

      logger.debug(`Full-text search found ${provisions.length} provisions`, {
        component: 'ConstitutionalProvisionsRepository',
        searchTerm
      });

      return provisions;

    } catch (error) {
      logger.error(`Failed to perform full-text search: ${searchTerm}`, {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search provisions by category
   */
  async searchByCategory(category: string): Promise<ConstitutionalProvision[]> {
    return this.findByRightsCategory(category);
  }

  /**
   * Get provision statistics (alias for compatibility)
   */
  async getStatistics() {
    return this.getProvisionStatistics();
  }

  /**
   * Get provision statistics
   */
  async getProvisionStatistics(): Promise<{
    totalProvisions: number;
    activeProvisions: number;
    provisionsByCategory: Record<string, number>;
    provisionsByChapter: Record<string, number>;
  }> {
    try {
      logger.debug('Getting provision statistics', {
        component: 'ConstitutionalProvisionsRepository'
      });

      // Get total and active counts
      const [totalResult] = await this.db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${constitutional_provisions.is_active} = true)`
        })
        .from(constitutional_provisions);

      // Get provisions by category
      const categoryResults = await this.db
        .select({
          category: constitutional_provisions.rights_category,
          count: sql<number>`count(*)`
        })
        .from(constitutional_provisions)
        .where(
          and(
            eq(constitutional_provisions.is_active, true),
            sql`${constitutional_provisions.rights_category} IS NOT NULL`
          )
        )
        .groupBy(constitutional_provisions.rights_category);

      // Get provisions by chapter
      const chapterResults = await this.db
        .select({
          chapter: constitutional_provisions.chapter_number,
          count: sql<number>`count(*)`
        })
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.is_active, true))
        .groupBy(constitutional_provisions.chapter_number)
        .orderBy(constitutional_provisions.chapter_number);

      const provisionsByCategory = categoryResults.reduce((acc, row) => {
        if (row.category) {
          acc[row.category] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

      const provisionsByChapter = chapterResults.reduce((acc, row) => {
        if (row.chapter !== null) {
          acc[`Chapter ${row.chapter}`] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

      const statistics = {
        totalProvisions: totalResult.total,
        activeProvisions: totalResult.active,
        provisionsByCategory,
        provisionsByChapter
      };

      logger.debug('Retrieved provision statistics', {
        component: 'ConstitutionalProvisionsRepository',
        statistics
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get provision statistics', {
        component: 'ConstitutionalProvisionsRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}