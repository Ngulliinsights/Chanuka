import type { SearchQuery, SearchResponseDto } from './search.dto';

export interface SearchAnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  query: string;
  filters: any;
  resultCount: number;
  clickedResults: number[];
  searchTime: number;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
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
    userId?: string,
    sessionId?: string,
    additionalData?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<SearchAnalyticsEvent> {
    const event: SearchAnalyticsEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: sessionId || this.generateSessionId(),
      query: query.text.substring(0, this.MAX_QUERY_LENGTH),
      filters: query.filters || {},
      resultCount: response.results.length,
      clickedResults: [],
      searchTime: response.metadata.searchTime,
      timestamp: new Date(),
      userAgent: additionalData?.userAgent,
      ipAddress: additionalData?.ipAddress,
    };

    // Store event (in a real implementation, this would go to a database)
    await this.storeEvent(event);

    return event;
  }

  /**
   * Record when a user clicks on a search result
   */
  static recordResultClick(
    eventId: string,
    billId: number,
    position: number
  ): void {
    // In a real implementation, update the event in database
    this.updateEventClicks(eventId, billId, position);
  }

  /**
   * Get search metrics for a time period
   */
  static async getSearchMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SearchMetrics> {
    // In a real implementation, query analytics database
    const events = await this.getEventsInRange(startDate, endDate);

    const totalSearches = events.length;
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const averageSearchTime = events.reduce((sum, e) => sum + e.searchTime, 0) / totalSearches || 0;

    // Calculate cache hit rate (this would need to be tracked separately)
    const cacheHitRate = 0.75; // Placeholder

    // Get popular queries
    const queryCounts = new Map<string, { count: number; totalResults: number }>();
    events.forEach(event => {
      const existing = queryCounts.get(event.query) || { count: 0, totalResults: 0 };
      queryCounts.set(event.query, {
        count: existing.count + 1,
        totalResults: existing.totalResults + event.resultCount,
      });
    });

    const popularQueries = Array.from(queryCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, this.MAX_POPULAR_QUERIES)
      .map(([query, data]) => ({
        query,
        count: data.count,
        averageResults: Math.round(data.totalResults / data.count),
      }));

    // Get queries with no results
    const noResultQueries = events
      .filter(e => e.resultCount === 0)
      .reduce((acc, event) => {
        const existing = acc.find(q => q.query === event.query);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ query: event.query, count: 1 });
        }
        return acc;
      }, [] as Array<{ query: string; count: number }>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return {
      totalSearches,
      uniqueUsers,
      averageSearchTime,
      cacheHitRate,
      popularQueries,
      noResultQueries,
      timeRange: { start: startDate, end: endDate },
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
    // Placeholder - in real implementation, store in database
    console.log('Storing search analytics event:', event.id);
  }

  private static async updateEventClicks(
    eventId: string,
    billId: number,
    position: number
  ): Promise<void> {
    // Placeholder - in real implementation, update database
    console.log(`Recording click on bill ${billId} at position ${position} for event ${eventId}`);
  }

  private static async getEventsInRange(
    startDate: Date,
    endDate: Date
  ): Promise<SearchAnalyticsEvent[]> {
    // Placeholder - in real implementation, query database
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