import { logger } from '@shared/core';
import { readDatabase } from '@shared/database';
import { searchAnalytics,searchQueries } from '@shared/schema/advanced_discovery';

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
  private static readonly MAX_POPULAR_QUERIES = 100;

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
    _startDate: Date,
    _endDate: Date
  ): Promise<SearchMetrics> {
    // Placeholder implementation - in production this would query the database
    // For now, return mock data to demonstrate the API structure
    return {
      totalSearches: 1250,
      uniqueUsers: 340,
      averageSearchTime: 245,
      cacheHitRate: 0.75,
      popularQueries: [
        { query: 'healthcare reform', count: 45, averageResults: 12 },
        { query: 'climate change', count: 38, averageResults: 15 },
        { query: 'education funding', count: 32, averageResults: 8 },
        { query: 'tax policy', count: 28, averageResults: 10 },
        { query: 'infrastructure', count: 25, averageResults: 18 },
      ],
      noResultQueries: [
        { query: 'nonexistent topic', count: 5 },
        { query: 'invalid search', count: 3 },
      ],
      timeRange: { start: _startDate, end: _endDate },
    };
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

      logger.debug('Stored search analytics event', { eventId: event.id, queryId: queryRecord.id });
    } catch (error) {
      logger.error('Failed to store search analytics event', { error: String(error), eventId: event.id });
      // Don't throw - analytics failures shouldn't break search
    }
  }

  private static async updateEventClicks(
    eventId: string,
    bill_id: number,
    position: number
  ): Promise<void> { // Placeholder - in real implementation, update database
    console.log(`Recording click on bill ${bill_id} at position ${position} for event ${eventId}`);
  }

  private static async getEventsInRange(
    _start_date: Date,
    _end_date: Date
  ): Promise<SearchAnalyticsEvent[]> {
    // Placeholder - in real implementation, query database
    void _start_date;
    void _end_date;
    return [];
  }

  private static async getPopularQueriesStartingWith(
    prefix: string,
    limit: number
  ): Promise<Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }>> {
    // Placeholder - return some example popular queries
    const popular = [
      'healthcare reform',
      'climate change',
      'education funding',
      'tax policy',
      'infrastructure',
    ].filter(term => term.toLowerCase().startsWith(prefix.toLowerCase()));

    return popular.slice(0, limit).map(term => ({
      term,
      frequency: Math.floor(Math.random() * 100) + 10,
      type: 'popular' as const,
    }));
  }

  private static async getRecentQueriesStartingWith(
    prefix: string,
    limit: number
  ): Promise<Array<{ term: string; frequency: number; type: 'popular' | 'recent' | 'trending' }>> {
    // Placeholder - return some example recent queries
    const recent = [
      'artificial intelligence',
      'renewable energy',
      'social security',
      'voting rights',
    ].filter(term => term.toLowerCase().startsWith(prefix.toLowerCase()));

    return recent.slice(0, limit).map(term => ({
      term,
      frequency: Math.floor(Math.random() * 20) + 1,
      type: 'recent' as const,
    }));
  }

  private static async deleteEventsOlderThan(cutoffDate: Date): Promise<number> {
    // Placeholder - in real implementation, delete from database
    console.log(`Cleaning up analytics data older than ${cutoffDate.toISOString()}`);
    return 0;
  }
}








































