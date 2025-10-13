import { database as db } from '../../shared/database/connection';
import { bills, sponsors, billComments } from '../../shared/schema';
import { sql, or, and, ilike, desc, asc, SQL } from 'drizzle-orm';
import { logger } from '../../shared/utils/logger';

export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  sponsor?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  bills: any[];
  sponsors: any[];
  total: number;
  facets: {
    categories: { name: string; count: number }[];
    statuses: { name: string; count: number }[];
    sponsors: { name: string; count: number }[];
  };
}

export class SearchService {
  async searchBills(filters: SearchFilters, page = 1, limit = 20): Promise<SearchResult> {
    try {
      const offset = (page - 1) * limit;
      const conditions: (SQL<unknown> | undefined)[] = [];

      // Text search across title, summary, and description
      if (filters.query) {
        const searchTerm = `%${filters.query.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(bills.title, searchTerm),
            ilike(bills.summary, searchTerm),
            ilike(bills.description, searchTerm)
          )
        );
      }

      // Category filter
      if (filters.category) {
        conditions.push(sql`${bills.category} = ${filters.category}`);
      }

      // Status filter
      if (filters.status) {
        conditions.push(sql`${bills.status} = ${filters.status}`);
      }

      // Date range filter
      if (filters.dateFrom) {
        conditions.push(sql`${bills.introducedDate} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${bills.introducedDate} <= ${filters.dateTo}`);
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(sql`${bills.tags} && ${filters.tags}`);
      }

      const filteredConditions = conditions.filter(c => c !== undefined) as SQL<unknown>[];

      // Build the query
      let orderByClause;
      switch (filters.sortBy) {
        case 'date':
          orderByClause = filters.sortOrder === 'asc' ? asc(bills.introducedDate) : desc(bills.introducedDate);
          break;
        case 'title':
          orderByClause = filters.sortOrder === 'asc' ? asc(bills.title) : desc(bills.title);
          break;
        case 'status':
          orderByClause = filters.sortOrder === 'asc' ? asc(bills.status) : desc(bills.status);
          break;
        default:
          // Default to date descending for relevance
          orderByClause = desc(bills.introducedDate);
      }

      const results = await db.select().from(bills)
        .where(filteredConditions.length > 0 ? and(...filteredConditions) : undefined)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db.select({ count: sql`count(*)` }).from(bills).where(filteredConditions.length > 0 ? and(...filteredConditions) : undefined);

      // Get facets for filtering UI
      const facets = await this.getFacets(filteredConditions);

      return {
        bills: results,
        sponsors: [], // Could add sponsor search here
        total: Number(count),
        facets
      };
    } catch (error) {
      logger.error('Search error:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  private async getFacets(existingConditions: SQL<unknown>[]) {
    try {
      // Get category counts
      const categoryQuery = db
        .select({
          category: bills.category,
          count: sql`count(*)`
        })
        .from(bills)
        .groupBy(bills.category);

      if (existingConditions.length > 0) {
        categoryQuery.where(and(...existingConditions));
      }

      const categories = await categoryQuery;

      // Get status counts
      const statusQuery = db
        .select({
          status: bills.status,
          count: sql`count(*)`
        })
        .from(bills)
        .groupBy(bills.status);

      if (existingConditions.length > 0) {
        statusQuery.where(and(...existingConditions));
      }

      const statuses = await statusQuery;

      return {
        categories: categories.map(c => ({ name: c.category || 'Unknown', count: Number(c.count) })),
        statuses: statuses.map(s => ({ name: s.status, count: Number(s.count) })),
        sponsors: [] // Could add sponsor facets
      };
    } catch (error) {
      logger.error('Error getting facets:', { component: 'SimpleTool' }, error);
      return {
        categories: [],
        statuses: [],
        sponsors: []
      };
    }
  }

  async searchSponsors(query: string, limit = 10) {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const results = await db
        .select()
        .from(sponsors)
        .where(
          or(
            ilike(sponsors.name, searchTerm),
            ilike(sponsors.constituency, searchTerm),
            ilike(sponsors.party, searchTerm)
          )
        )
        .limit(limit);

      return results;
    } catch (error) {
      logger.error('Sponsor search error:', { component: 'SimpleTool' }, error);
      return [];
    }
  }

  async getSearchSuggestions(query: string, limit = 5) {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Get bill title suggestions
      const billSuggestions = await db
        .select({ title: bills.title, type: sql`'bill'` })
        .from(bills)
        .where(ilike(bills.title, searchTerm))
        .limit(limit);

      // Get sponsor name suggestions
      const sponsorSuggestions = await db
        .select({ title: sponsors.name, type: sql`'sponsor'` })
        .from(sponsors)
        .where(ilike(sponsors.name, searchTerm))
        .limit(limit);

      return [...billSuggestions, ...sponsorSuggestions];
    } catch (error) {
      logger.error('Error getting search suggestions:', { component: 'SimpleTool' }, error);
      return [];
    }
  }
}

export const searchService = new SearchService();








