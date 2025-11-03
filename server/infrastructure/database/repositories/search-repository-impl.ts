import { databaseService } from '../database-service.js';
import { bills, sponsors, comments, users } from '@shared/schema';
import { eq, and, or, sql, desc, inArray, ilike, asc } from 'drizzle-orm';
import { ISearchRepository } from './search-repository.js';
import { SearchQuery, SearchResult } from '../../../features/search/engines/types/search.types.js';

/**
 * Search repository implementation that encapsulates all search-related database operations
 */
export class SearchRepositoryImpl implements ISearchRepository {
  async searchBillsFullText(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const billResults = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select({
            id: bills.id,
            bill_number: bills.bill_number,
            title: bills.title,
            summary: bills.summary,
            status: bills.status,
            chamber: bills.chamber,
            created_at: bills.created_at,
            // Calculate relevance score using PostgreSQL's ts_rank function
            rank: sql<number>`ts_rank(
              to_tsvector('english', ${bills.title} || ' ' || COALESCE(${bills.summary}, '')),
              to_tsquery('english', ${tsQuery})
            )`
          })
          .from(bills)
          .where(and(
            sql`to_tsvector('english', ${bills.title} || ' ' || COALESCE(${bills.summary}, '')) @@ to_tsquery('english', ${tsQuery})`,
            this.buildBillFilters(query.filters)
          ))
          .orderBy(desc(sql`ts_rank(
            to_tsvector('english', ${bills.title} || ' ' || COALESCE(${bills.summary}, '')),
            to_tsquery('english', ${tsQuery})
          )`))
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchBillsFullText'
    );

    return billResults.data.map(bill => ({
      id: bill.id,
      type: 'bill' as const,
      title: bill.title,
      summary: bill.summary || undefined,
      relevanceScore: Number(bill.rank) || 0,
      metadata: {
        billNumber: bill.bill_number,
        status: bill.status,
        chamber: bill.chamber,
        createdAt: bill.created_at
      },
      highlights: this.generateHighlights(
        `${bill.title} ${bill.summary || ''}`,
        searchTerms
      )
    }));
  }

  async searchSponsorsFullText(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const sponsorResults = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select({
            id: sponsors.id,
            name: sponsors.name,
            party: sponsors.party,
            county: sponsors.county,
            chamber: sponsors.chamber,
            bio: sponsors.bio,
            rank: sql<number>`ts_rank(
              to_tsvector('english', ${sponsors.name} || ' ' || COALESCE(${sponsors.bio}, '')),
              to_tsquery('english', ${tsQuery})
            )`
          })
          .from(sponsors)
          .where(and(
            sql`to_tsvector('english', ${sponsors.name} || ' ' || COALESCE(${sponsors.bio}, '')) @@ to_tsquery('english', ${tsQuery})`,
            this.buildSponsorFilters(query.filters)
          ))
          .orderBy(desc(sql`ts_rank(
            to_tsvector('english', ${sponsors.name} || ' ' || COALESCE(${sponsors.bio}, '')),
            to_tsquery('english', ${tsQuery})
          )`))
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchSponsorsFullText'
    );

    return sponsorResults.data.map(sponsor => ({
      id: sponsor.id,
      type: 'sponsor' as const,
      title: sponsor.name,
      summary: sponsor.bio || undefined,
      relevanceScore: Number(sponsor.rank) || 0,
      metadata: {
        party: sponsor.party,
        county: sponsor.county,
        chamber: sponsor.chamber
      },
      highlights: this.generateHighlights(
        `${sponsor.name} ${sponsor.bio || ''}`,
        searchTerms
      )
    }));
  }

  async searchCommentsFullText(
    tsQuery: string,
    searchTerms: string[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const commentResults = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select({
            id: comments.id,
            content: comments.content,
            bill_id: comments.bill_id,
            user_name: users.email,
            created_at: comments.created_at,
            rank: sql<number>`ts_rank(
              to_tsvector('english', ${comments.content}),
              to_tsquery('english', ${tsQuery})
            )`
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(and(
            sql`to_tsvector('english', ${comments.content}) @@ to_tsquery('english', ${tsQuery})`,
            this.buildCommentFilters(query.filters)
          ))
          .orderBy(desc(sql`ts_rank(
            to_tsvector('english', ${comments.content}),
            to_tsquery('english', ${tsQuery})
          )`))
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchCommentsFullText'
    );

    return commentResults.data.map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      title: `Comment by ${comment.user_name}`,
      summary: this.truncateText(comment.content, 200),
      relevanceScore: Number(comment.rank) || 0,
      metadata: {
        billId: comment.bill_id,
        userName: comment.user_name,
        createdAt: comment.created_at
      },
      highlights: this.generateHighlights(comment.content, searchTerms)
    }));
  }

  async searchBillsFuzzy(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerms = this.extractSearchTerms(query.query);

    const billResults = await databaseService.withFallback(
      async () => {
        // Build conditions for each search term with similarity threshold
        const conditions = searchTerms.map(term =>
          or(
            sql`similarity(${bills.title}, ${term}) > 0.3`,
            sql`similarity(COALESCE(${bills.summary}, ''), ${term}) > 0.3`
          )
        );

        return await databaseService.db
          .select({
            id: bills.id,
            bill_number: bills.bill_number,
            title: bills.title,
            summary: bills.summary,
            status: bills.status,
            chamber: bills.chamber,
            created_at: bills.created_at,
            similarity: sql<number>`GREATEST(
              similarity(${bills.title}, ${query.query}),
              similarity(COALESCE(${bills.summary}, ''), ${query.query})
            )`
          })
          .from(bills)
          .where(and(
            or(...conditions),
            this.buildBillFilters(query.filters)
          ))
          .orderBy(sql`GREATEST(
            similarity(${bills.title}, ${query.query}),
            similarity(COALESCE(${bills.summary}, ''), ${query.query})
          ) DESC`)
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchBillsFuzzy'
    );

    results.push(...billResults.data.map(bill => ({
      id: bill.id,
      type: 'bill' as const,
      title: bill.title,
      summary: bill.summary || undefined,
      relevanceScore: Number(bill.similarity) || 0,
      metadata: {
        billNumber: bill.bill_number,
        status: bill.status,
        chamber: bill.chamber,
        createdAt: bill.created_at
      }
    })));

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async searchSimple(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPattern = `%${query.query.toLowerCase()}%`;

    // Search bills
    const billResults = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select()
          .from(bills)
          .where(and(
            or(
              ilike(bills.title, searchPattern),
              ilike(bills.summary, searchPattern)
            ),
            this.buildBillFilters(query.filters)
          ))
          .orderBy(desc(bills.created_at))
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchSimpleBills'
    );

    results.push(...billResults.data.map(bill => ({
      id: bill.id,
      type: 'bill' as const,
      title: bill.title,
      summary: bill.summary || undefined,
      relevanceScore: this.calculateSimpleRelevance(
        `${bill.title} ${bill.summary || ''}`,
        query.query
      ),
      metadata: {
        billNumber: bill.bill_number,
        status: bill.status,
        chamber: bill.chamber,
        createdAt: bill.created_at
      }
    })));

    // Search sponsors
    const sponsorResults = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select()
          .from(sponsors)
          .where(and(
            or(
              ilike(sponsors.name, searchPattern),
              ilike(sponsors.bio, searchPattern)
            ),
            this.buildSponsorFilters(query.filters)
          ))
          .orderBy(asc(sponsors.name))
          .limit(query.pagination?.limit || 50);
      },
      [],
      'searchSimpleSponsors'
    );

    results.push(...sponsorResults.data.map(sponsor => ({
      id: sponsor.id,
      type: 'sponsor' as const,
      title: sponsor.name,
      summary: sponsor.bio || undefined,
      relevanceScore: this.calculateSimpleRelevance(
        `${sponsor.name} ${sponsor.bio || ''}`,
        query.query
      ),
      metadata: {
        party: sponsor.party,
        county: sponsor.county,
        chamber: sponsor.chamber
      }
    })));

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async getBillSuggestions(pattern: string, limit: number): Promise<string[]> {
    const results = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select({ title: bills.title })
          .from(bills)
          .where(ilike(bills.title, pattern))
          .orderBy(desc(bills.engagement_score))
          .limit(limit);
      },
      [],
      'getBillSuggestions'
    );

    return results.data.map(b => b.title);
  }

  async getSponsorSuggestions(pattern: string, limit: number): Promise<string[]> {
    const results = await databaseService.withFallback(
      async () => {
        return await databaseService.db
          .select({ name: sponsors.name })
          .from(sponsors)
          .where(ilike(sponsors.name, pattern))
          .orderBy(asc(sponsors.name))
          .limit(limit);
      },
      [],
      'getSponsorSuggestions'
    );

    return results.data.map(s => s.name);
  }

  // Helper methods
  private buildBillFilters(filters?: SearchQuery['filters']): any {
    const conditions = [];

    if (filters?.status?.length) {
      conditions.push(sql`${bills.status} IN ${filters.status}`);
    }

    if (filters?.chamber?.length) {
      conditions.push(sql`${bills.chamber} IN ${filters.chamber}`);
    }

    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(sql`${bills.created_at} >= ${filters.dateRange.start}`);
      }
      if (filters.dateRange.end) {
        conditions.push(sql`${bills.created_at} <= ${filters.dateRange.end}`);
      }
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private buildSponsorFilters(filters?: SearchQuery['filters']): any {
    const conditions = [];

    if (filters?.chamber?.length) {
      conditions.push(sql`${sponsors.chamber} IN ${filters.chamber}`);
    }

    if (filters?.county?.length) {
      conditions.push(sql`${sponsors.county} IN ${filters.county}`);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private buildCommentFilters(filters?: SearchQuery['filters']): any {
    const conditions = [];

    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(sql`${comments.created_at} >= ${filters.dateRange.start}`);
      }
      if (filters.dateRange.end) {
        conditions.push(sql`${comments.created_at} <= ${filters.dateRange.end}`);
      }
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter out short words
      .slice(0, 10); // Limit to 10 terms for performance
  }

  private generateHighlights(text: string, searchTerms: string[]): string[] {
    const highlights: string[] = [];
    const lowerText = text.toLowerCase();

    for (const term of searchTerms) {
      const index = lowerText.indexOf(term.toLowerCase());
      if (index === -1) continue;

      // Extract context around the match (50 chars before and after)
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + term.length + 50);
      let snippet = text.substring(start, end);

      // Add ellipsis if truncated
      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';

      // Wrap matching term in mark tags
      const regex = new RegExp(`(${term})`, 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');

      highlights.push(snippet);

      if (highlights.length >= 3) break; // Limit to 3 highlights
    }

    return highlights;
  }

  private calculateSimpleRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match gets highest score
    if (lowerText.includes(lowerQuery)) {
      return 1.0;
    }

    // Calculate partial match score based on matching words
    const queryWords = lowerQuery.split(/\s+/);
    const matchingWords = queryWords.filter(word => lowerText.includes(word));

    return matchingWords.length / queryWords.length;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}