import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database';
import { searchAnalytics, searchQueries } from '@server/infrastructure/schema/advanced_discovery';
import { sql, and, like, gte, desc, eq, lt } from 'drizzle-orm';

import type { SearchQuery, SearchResponseDto } from './search.dto';

export interface SearchAnalyticsEvent {
  id: string;
  user_id?: string | undefined;
  session_id: string;
  query: string;
  filters: any;
  resultCount: number;
  clickedResults: number[];
  searchTime: number;
  timestamp: Date;
  user_agent?: string | undefined;
  ip_address?: string | undefined;
}

export interface SearchMetrics {
  totalSearches: number;
  uniqueUsers: number;
  averageSearchTime: number;
  cacheHitRate: number;
  popularQueries: Array<{
    query: string;
    count: number;
    averageResults: number;
  }>;
  noResultQueries: Array<{
    query: string;
    count: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class SearchAnalytics {
  private static readonly MAX_QUERY_LENGTH = 500;

  /**
   * Record a search event for analytics
   */
  static async recordSearchEvent(
    query: SearchQuery,
    response: SearchResponseDto,
    user_id?: string,
    session_id?: string,
    additionalData?: {
      user_agent?: string;
      ip_address?: string;
    }
  ): Promise<SearchAnalyticsEvent> {
    const event: SearchAnalyticsEvent = {
      id: this.generateEventId(),
      user_id: user_id || undefined,
      session_id: session_id || this.generateSessionId(),
      query: query.text.substring(0, this.MAX_QUERY_LENGTH),
      filters: query.filters || {},
      resultCount: response.results.length,
      clickedResults: [],
      searchTime: response.metadata.searchTime,
      timestamp: new Date(),
      user_agent: additionalData?.user_agent,
      ip_address: additionalData?.ip_address,
    };

    // Store event in database
    await this.storeEvent(event);

    return event;
  }

  /**
   * Record when a user clicks on a search result
   */
  static recordResultClick(
    eventId: string,
    bill_id: number,
    position: number
  ): void { // In a real implementation, update the event in database
    this.updateEventClicks(eventId, bill_id, position);
  }

  /**
   * Get search metrics for a time period
   */
  static async getSearchMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SearchMetrics> {
    try {
      // Get total searches
      const totalSearchesResult = await readDatabase
        .select({ count: sql<number>`COUNT(*)` })
        .from(searchQueries)
        .where(
          and(
            gte(searchQueries.createdAt, startDate),
            lt(searchQueries.createdAt, endDate)
          )
        );

      // Get unique users
      const uniqueUsersResult = await readDatabase
        .select({ count: sql<number>`COUNT(DISTINCT ${searchQueries.userId})` })
        .from(searchQueries)
        .where(
          and(
            gte(searchQueries.createdAt, startDate),
            lt(searchQueries.createdAt, endDate),
            sql`${searchQueries.userId} IS NOT NULL`
          )
        );

      // Get average search time from analytics
      const avgSearchTimeResult = await readDatabase
        .select({ avg: sql<number>`AVG(${searchAnalytics.analyticsValue})` })
        .from(searchAnalytics)
        .innerJoin(searchQueries, eq(searchAnalytics.queryId, searchQueries.id))
        .where(
          and(
            eq(searchAnalytics.analyticsType, 'search_performance'),
            gte(searchQueries.createdAt, startDate),
            lt(searchQueries.createdAt, endDate)
          )
        );

      // Get popular queries
      const popularQueriesResult = await readDatabase
        .select({
          query: searchQueries.queryText,
          count: sql<number>`COUNT(*)`,
          averageResults: sql<number>`AVG(${searchQueries.resultsReturned})`,
        })
        .from(searchQueries)
        .where(
          and(
            gte(searchQueries.createdAt, startDate),
            lt(searchQueries.createdAt, endDate)
          )
        )
        .groupBy(searchQueries.queryText)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // Get no-result queries
      const noResultQueriesResult = await readDatabase
        .select({
          query: searchQueries.queryText,
          count: sql<number>`COUNT(*)`,
        })
        .from(searchQueries)
        .where(
          and(
            gte(searchQueries.createdAt, startDate),
            lt(searchQueries.createdAt, endDate),
            eq(searchQueries.resultsReturned, 0)
          )
        )
        .groupBy(searchQueries.queryText)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      return {
        totalSearches: totalSearchesResult[0]?.count || 0,
        uniqueUsers: uniqueUsersResult[0]?.count || 0,
        averageSearchTime: Math.round(avgSearchTimeResult[0]?.avg || 0),
        cacheHitRate: 0, // TODO: Implement cache hit rate tracking
        popularQueries: popularQueriesResult.map(row => ({
          query: row.query,
          count: row.count,
          averageResults: Math.round(row.averageResults),
        })),
        noResultQueries: noResultQueriesResult.map(row => ({
          query: row.query,
          count: row.count,
        })),
        timeRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      logger.error({ error: String(error), startDate, endDate }, 'Failed to get search metrics');
      // Return empty metrics on error
      return {
        totalSearches: 0,
        uniqueUsers: 0,
        averageSearchTime: 0,
        cacheHitRate: 0,
        popularQueries: [],
        noResultQueries: [],
        timeRange: { start: startDate, end: endDate },
      };
    }
  }

  /**
   * Get search suggestions based on analytics
   */
  static async getAnalyticsBasedSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }>> {
    const suggestions: Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }> = [];

    // Get popular queries that start with the partial query
    const popularQueries = await this.getPopularQueriesStartingWith(partialQuery, limit);

    // Get recent queries (last 24 hours)
    const recentQueries = await this.getRecentQueriesStartingWith(partialQuery, Math.max(1, limit - popularQueries.length));

    suggestions.push(...popularQueries, ...recentQueries);

    return suggestions.slice(0, limit);
  }

  /**
   * Clean up old analytics data
   */
  static async cleanupOldData(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // In a real implementation, delete old events from database
    return this.deleteEventsOlderThan(cutoffDate);
  }

  // Private helper methods

  private static generateEventId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async storeEvent(event: SearchAnalyticsEvent): Promise<void> {
    try {
      // Insert search query
      // @ts-ignore - Drizzle ORM type inference issue
      const [queryRecord] = await readDatabase
        .insert(searchQueries)
        .values({
          userId: event.user_id,
          queryText: event.query,
          searchContext: event.filters,
          filtersApplied: event.filters,
          resultsReturned: event.resultCount,
          sessionId: event.session_id,
          userAgent: event.user_agent,
          ipAddress: event.ip_address,
        })
        .returning();

      // Insert analytics event
      // @ts-ignore - Drizzle ORM type inference issue
      await readDatabase
        .insert(searchAnalytics)
        .values({
          queryId: queryRecord.id,
          analyticsType: 'search_performance',
          entityType: 'search',
          analyticsValue: event.searchTime,
          analyticsMetadata: {
            resultCount: event.resultCount,
            sessionId: event.session_id,
            timestamp: event.timestamp,
          },
        });

      logger.debug({ eventId: event.id, queryId: queryRecord.id }, 'Stored search analytics event');
    } catch (error) {
      logger.error({ error: String(error), eventId: event.id }, 'Failed to store search analytics event');
      // Don't throw - analytics failures shouldn't break search
    }
  }

  private static async updateEventClicks(
    eventId: string,
    bill_id: number,
    position: number
  ): Promise<void> {
    try {
      // Update the search analytics with click information
      await readDatabase
        .update(searchAnalytics)
        .set({
          analyticsMetadata: {
            clickedBillId: bill_id,
            clickPosition: position,
            clickTimestamp: new Date(),
          },
        })
        .where(eq(searchAnalytics.id, eventId));

      logger.debug({ eventId, bill_id, position }, 'Recorded search result click');
    } catch (error) {
      logger.error({ error: String(error), eventId, bill_id }, 'Failed to record click event');
      // Don't throw - analytics failures shouldn't break user experience
    }
  }

  private static async getPopularQueriesStartingWith(
    prefix: string,
    limit: number
  ): Promise<Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }>> {
    try {
      // Query database for popular queries matching prefix
      const result = await readDatabase
        .select({
          term: searchQueries.queryText,
          frequency: sql<number>`COUNT(*)`,
        })
        .from(searchQueries)
        .where(
          and(
            like(searchQueries.queryText, `${prefix}%`),
            gte(searchQueries.createdAt, sql`NOW() - INTERVAL '30 days'`)
          )
        )
        .groupBy(searchQueries.queryText)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      return result.map(row => ({
        term: row.term,
        frequency: row.frequency,
        type: 'popular' as const,
      }));
    } catch (error) {
      logger.error({ error: String(error), prefix }, 'Failed to get popular queries');
      return [];
    }
  }

  private static async getRecentQueriesStartingWith(
    prefix: string,
    limit: number
  ): Promise<Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }>> {
    try {
      // Query database for recent queries matching prefix
      const result = await readDatabase
        .select({
          term: searchQueries.queryText,
          frequency: sql<number>`COUNT(*)`,
        })
        .from(searchQueries)
        .where(
          and(
            like(searchQueries.queryText, `${prefix}%`),
            gte(searchQueries.createdAt, sql`NOW() - INTERVAL '24 hours'`)
          )
        )
        .groupBy(searchQueries.queryText)
        .orderBy(desc(searchQueries.createdAt))
        .limit(limit);

      return result.map(row => ({
        term: row.term,
        frequency: row.frequency,
        type: 'recent' as const,
      }));
    } catch (error) {
      logger.error({ error: String(error), prefix }, 'Failed to get recent queries');
      return [];
    }
  }

  private static async deleteEventsOlderThan(cutoffDate: Date): Promise<number> {
    try {
      // Delete old search queries and their analytics
      const result = await readDatabase
        .delete(searchQueries)
        .where(lt(searchQueries.createdAt, cutoffDate))
        .returning({ id: searchQueries.id });

      const deletedCount = result.length;
      
      logger.info({ deletedCount, cutoffDate }, 'Cleaned up old search analytics data');
      
      return deletedCount;
    } catch (error) {
      logger.error({ error: String(error), cutoffDate }, 'Failed to cleanup old analytics data');
      return 0;
    }
  }
}








































