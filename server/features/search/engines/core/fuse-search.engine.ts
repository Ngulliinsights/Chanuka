// ============================================================================
// FUSE.JS FUZZY SEARCH ENGINE
// ============================================================================
// Typo-tolerant search using Fuse.js library for client-side fuzzy matching
// Replaces PostgreSQL trigram-based fuzzy matching with more flexible scoring

import { SearchEngine, SearchQuery, SearchResult } from '../types/search.types';
import { db as database } from '../../../../infrastructure/database/pool';
import { bills, comments, sponsors, users } from '@server/infrastructure/schema';
import { sql, and, eq } from 'drizzle-orm';
import Fuse from 'fuse.js';

interface FuseSearchOptions {
  threshold?: number;
  distance?: number;
  includeScore?: boolean;
  includeMatches?: boolean;
  minMatchCharLength?: number;
  keys?: Array<{
    name: string;
    weight?: number;
  }>;
}

interface SearchableBill {
  id: string;
  title: string;
  summary: string;
  status: string;
  chamber: string;
  created_at: string;
}

interface SearchableSponsor {
  id: string;
  name: string;
  party: string;
  county: string;
  chamber: string;
  bio: string;
}

interface SearchableComment {
  id: string;
  content: string;
  bill_id: string;
  created_at: string;
  user_name: string;
}

export class FuseSearchEngine implements SearchEngine {
  name = 'fuse-search';
  priority = 1;
  isAvailable = true;

  /**
   * Get index statistics for monitoring
   */
  getIndexStats(): { isAvailable: boolean; totalItems?: number } {
    return {
      isAvailable: this.isAvailable,
      totalItems: 0 // Fuse.js loads data dynamically, no persistent index
    };
  }

  private readonly defaultOptions: FuseSearchOptions = {
    threshold: 0.4, // More lenient than default 0.6
    distance: 100,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'summary', weight: 0.3 }
    ]
  };

  /**
   * Execute fuzzy search using Fuse.js for typo tolerance.
   * Loads data into memory and performs client-side fuzzy matching.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const limit = query.pagination?.limit || 50;
    const offset = query.pagination?.page ? (query.pagination.page - 1) * limit : 0;

    try {
      const results: SearchResult[] = [];

      // Search bills if requested
      if (this.shouldSearchType(query, 'bills')) {
        const billResults = await this.searchBills(query);
        results.push(...billResults);
      }

      // Search sponsors if requested
      if (this.shouldSearchType(query, 'sponsors')) {
        const sponsorResults = await this.searchSponsors(query);
        results.push(...sponsorResults);
      }

      // Search comments if requested
      if (this.shouldSearchType(query, 'comments')) {
        const commentResults = await this.searchComments(query);
        results.push(...commentResults);
      }

      // Sort by relevance score and apply pagination
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(offset, offset + limit);

      return sortedResults;
    } catch (error) {
      console.error('Fuse.js search failed:', error);
      return [];
    }
  }

  /**
   * Search bills using Fuse.js fuzzy matching
   */
  private async searchBills(query: SearchQuery): Promise<SearchResult[]> {
    // Build where conditions
    const conditions = [];
    if (query.filters?.status) {
      conditions.push(sql`${bills.status} = ANY(${query.filters.status})`);
    }
    if (query.filters?.chamber) {
      conditions.push(sql`${bills.chamber} = ANY(${query.filters.chamber})`);
    }

    const billsData = await database
      .select({
        id: bills.id,
        title: bills.title,
        summary: bills.summary,
        status: bills.status,
        chamber: bills.chamber,
        created_at: bills.created_at
      })
      .from(bills)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const searchableBills: SearchableBill[] = billsData.map((bill: any) => ({
      id: bill.id.toString(),
      title: bill.title || '',
      summary: bill.summary || '',
      status: bill.status || '',
      chamber: bill.chamber || '',
      created_at: bill.created_at?.toISOString() || ''
    }));

    const fuse = new Fuse(searchableBills, {
      ...this.defaultOptions,
      keys: [
        { name: 'title', weight: 0.8 },
        { name: 'summary', weight: 0.2 }
      ]
    });

    const fuseResults = fuse.search(query.query);

    return fuseResults.map((result: Fuse.FuseResult<SearchableBill>) => ({
      id: result.item.id,
      title: result.item.title,
      summary: result.item.summary,
      type: 'bill' as const,
      relevanceScore: (1 - (result.score || 0)) * 100, // Convert Fuse score to 0-100 scale
      metadata: {
        status: result.item.status,
        chamber: result.item.chamber,
        created_at: result.item.created_at
      },
      highlights: this.generateHighlights(result.item.title + ' ' + result.item.summary, query.query)
    }));
  }

  /**
   * Search sponsors using Fuse.js fuzzy matching
   */
  private async searchSponsors(query: SearchQuery): Promise<SearchResult[]> {
    // Build where conditions
    const conditions = [eq(sponsors.is_active, true)];
    if (query.filters?.chamber) {
      conditions.push(sql`${sponsors.chamber} = ANY(${query.filters.chamber})`);
    }
    if (query.filters?.county) {
      conditions.push(sql`${sponsors.county} = ANY(${query.filters.county})`);
    }

    const sponsorsData = await database
      .select({
        id: sponsors.id,
        name: sponsors.name,
        party: sponsors.party,
        county: sponsors.county,
        chamber: sponsors.chamber,
        bio: sponsors.bio
      })
      .from(sponsors)
      .where(and(...conditions));

    const searchableSponsors: SearchableSponsor[] = sponsorsData.map((sponsor: any) => ({
      id: sponsor.id.toString(),
      name: sponsor.name || '',
      party: sponsor.party || '',
      county: sponsor.county || '',
      chamber: sponsor.chamber || '',
      bio: sponsor.bio || ''
    }));

    const fuse = new Fuse(searchableSponsors, {
      ...this.defaultOptions,
      keys: [
        { name: 'name', weight: 0.9 },
        { name: 'bio', weight: 0.1 }
      ]
    });

    const fuseResults = fuse.search(query.query);

    return fuseResults.map((result: Fuse.FuseResult<SearchableSponsor>) => ({
      id: result.item.id,
      title: result.item.name,
      summary: result.item.bio,
      type: 'sponsor' as const,
      relevanceScore: (1 - (result.score || 0)) * 100,
      metadata: {
        party: result.item.party,
        county: result.item.county,
        chamber: result.item.chamber
      },
      highlights: this.generateHighlights(result.item.name + ' ' + result.item.bio, query.query)
    }));
  }

  /**
   * Search comments using Fuse.js fuzzy matching
   */
  private async searchComments(query: SearchQuery): Promise<SearchResult[]> {
    // Build where conditions
    const conditions = [];
    if (query.filters?.dateRange?.start) {
      conditions.push(sql`${comments.created_at} >= ${query.filters.dateRange.start}`);
    }
    if (query.filters?.dateRange?.end) {
      conditions.push(sql`${comments.created_at} <= ${query.filters.dateRange.end}`);
    }

    const commentsData = await database
      .select({
        id: comments.id,
        content: comments.comment_text,
        bill_id: comments.bill_id,
        created_at: comments.created_at,
        user_name: users.email
      })
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const searchableComments: SearchableComment[] = commentsData.map((comment: any) => ({
      id: comment.id.toString(),
      content: comment.content || '',
      bill_id: comment.bill_id?.toString() || '',
      created_at: comment.created_at?.toISOString() || '',
      user_name: comment.user_name || ''
    }));

    const fuse = new Fuse(searchableComments, {
      ...this.defaultOptions,
      keys: [
        { name: 'content', weight: 1.0 }
      ]
    });

    const fuseResults = fuse.search(query.query);

    return fuseResults.map((result: Fuse.FuseResult<SearchableComment>) => ({
      id: result.item.id,
      title: `Comment by ${result.item.user_name}`,
      summary: this.truncateText(result.item.content, 200),
      type: 'comment' as const,
      relevanceScore: (1 - (result.score || 0)) * 100,
      metadata: {
        bill_id: result.item.bill_id,
        userName: result.item.user_name,
        created_at: result.item.created_at
      },
      highlights: this.generateHighlights(result.item.content, query.query)
    }));
  }

  /**
   * Check if a specific type should be searched based on filters
   */
  private shouldSearchType(query: SearchQuery, type: 'bills' | 'sponsors' | 'comments'): boolean {
    return !query.filters?.type || query.filters.type.includes(type);
  }

  /**
   * Generate highlighted text snippets for search results
   */
  private generateHighlights(text: string, searchTerm: string): string[] {
    const highlights: string[] = [];
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();

    const index = lowerText.indexOf(lowerTerm);
    if (index === -1) return highlights;

    // Extract context around the match (50 chars before and after)
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + searchTerm.length + 50);
    let snippet = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Wrap matching term in mark tags
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');

    highlights.push(snippet);
    return highlights;
  }

  /**
   * Truncate text to specified length with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}


