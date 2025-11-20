// ============================================================================
// FUZZY MATCHING SEARCH ENGINE
// ============================================================================
// Typo-tolerant search using PostgreSQL's pg_trgm extension for similarity matching

import { database } from '@shared/database';
import { bills } from '@shared/schema';
import { sql, desc } from 'drizzle-orm';
import { SearchQuery, SearchResult } from '@server/types/search.types.ts';

export class FuzzyMatchingEngine {

  /**
   * Execute fuzzy matching search for typo tolerance.
   * Uses PostgreSQL's pg_trgm extension for similarity matching.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const limit = query.pagination?.limit || 50;
    const offset = query.pagination?.offset || 0;

    try {
      // Use PostgreSQL similarity function for fuzzy matching
      const results = await database
        .select({
          id: bills.id,
          title: bills.title,
          description: bills.description,
          status: bills.status,
          chamber: bills.chamber,
          created_at: bills.created_at,
          similarity: sql<number>`similarity(${bills.title}, ${query.query})`
        })
        .from(bills)
        .where(sql`similarity(${bills.title}, ${query.query}) > 0.3`)
        .orderBy(sql`similarity(${bills.title}, ${query.query}) DESC`)
        .limit(limit)
        .offset(offset);

      return results.map(bill => ({
        id: bill.id.toString(),
        title: bill.title || '',
        description: bill.description || '',
        type: 'bill' as const,
        relevanceScore: bill.similarity || 0,
        metadata: {
          status: bill.status,
          chamber: bill.chamber,
          created_at: bill.created_at?.toISOString()
        }
      }));
    } catch (error) {
      // If pg_trgm extension is not available, return empty results
      return [];
    }
  }

}
