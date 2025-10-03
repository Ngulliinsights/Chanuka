import { db } from '../db.js';
import { bills, sponsors, billComments } from '../../shared/schema.js';
import { sql, or, and, ilike, desc, asc } from 'drizzle-orm';

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
      const conditions = [];

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

      // Build the query
      let query = db.select().from(bills);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'date':
          query = query.orderBy(filters.sortOrder === 'asc' ? asc(bills.introducedDate) : desc(bills.introducedDate));
          break;
        case 'title':
          query = query.orderBy(filters.sortOrder === 'asc' ? asc(bills.title) : desc(bills.title));
          break;
        case 'status':
          query = query.orderBy(filters.sortOrder === 'asc' ? asc(bills.status) : desc(bills.status));
          break;
        default:
          // Default to date descending for relevance
          query = query.orderBy(desc(bills.introducedDate));
      }

      const results = await query.limit(limit).offset(offset);

      // Get total count
      let countQuery = db.select({ count: sql`count(*)` }).from(bills);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count }] = await countQuery;

      // Get facets for filtering UI
      const facets = await this.getFacets(conditions);

      return {
        bills: results,
        sponsors: [], // Could add sponsor search here
        total: Number(count),
        facets
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  private async getFacets(existingConditions: any[]) {
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
      console.error('Error getting facets:', error);
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
      console.error('Sponsor search error:', error);
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
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();