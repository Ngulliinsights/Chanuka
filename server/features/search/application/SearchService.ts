import { SearchCache } from '@shared/infrastructure/SearchCache';
import { SearchIndexManager } from '@shared/infrastructure/SearchIndexManager';
import { suggestionEngineService } from '@shared/engines/suggestion/suggestion-engine.service';
import { SearchAnalytics, SearchMetrics } from '@shared/domain/SearchAnalytics';
import { SearchValidator } from '@shared/domain/SearchValidator';
import { queryIntentService } from '@shared/domain/QueryIntentService';
import { typoCorrectionService } from '@shared/domain/TypoCorrectionService';
import { dualEngineOrchestrator } from '@shared/engines/dual-engine-orchestrator';
import { logger   } from '@shared/core/index.js';
import type { Request, Response } from 'express';
import type {
  SearchQuery,
  SearchResponseDto,
  SearchResultDto,
  PlainBill,
} from '@shared/domain/search.dto';

// Define types for better type safety
interface OrchestratorResult {
  id: string;
  title: string;
  content: string;
  summary: string;
  relevanceScore: number;
  contentType: string;
  metadata: {
    status: string;
    createdAt: string;
  };
}

interface SuggestionResult {
  term: string;
  frequency: number;
  score: number;
  type: string;
  id: string;
  metadata?: Record<string, unknown>;
}

// Repository pattern replaced with direct service
const cache = new SearchCache();
const suggestionsSvc = suggestionEngineService;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_QUERY = 2;

/*  Phase 3: Advanced search with intent detection, typo correction, and streaming support  */
export async function searchBills(query: SearchQuery): Promise<SearchResponseDto> {
  const start = Date.now();

  // Validate and sanitize input
  const validation = SearchValidator.validateSearchQuery(query);
  if (!validation.isValid) {
    throw new Error(`Search validation failed: ${validation.errors.join(', ')}`);
  }
  const sanitizedQuery = SearchValidator.sanitizeSearchQuery(query);

  let { text, filters = {}, pagination = {}, options = {} } = sanitizedQuery;

  // Phase 3: Query Intent Detection
  const intentClassification = await queryIntentService.classifyIntent(text);
  logger.debug('Query intent classified', {
    query: text,
    intent: intentClassification.intent,
    confidence: intentClassification.confidence
  });

  // Phase 3: Typo Correction and Query Enhancement
  const correctionResult = await typoCorrectionService.correctQuery(text);
  if (correctionResult.correctedQuery !== text && correctionResult.confidence > 0.7) {
    text = correctionResult.correctedQuery;
    logger.debug('Query corrected', {
      original: correctionResult.originalQuery,
      corrected: correctionResult.correctedQuery,
      confidence: correctionResult.confidence
    });
  }

  // Phase 3: Query Expansion with Synonyms (for informational queries)
  if (intentClassification.intent === 'informational' && intentClassification.confidence > 0.6) {
    const expansions = await typoCorrectionService.expandQuery(text);
    if (expansions.length > 1 && expansions[0]) {
      // Use the most relevant expansion (could be enhanced with ML ranking)
      text = expansions[0];
      logger.debug('Query expanded with synonyms', { original: sanitizedQuery.text, expanded: text });
    }
  }
  const page = Math.max((pagination as { page?: number }).page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max((pagination as { limit?: number }).limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  /*  1. Cache layer  */
  const cached = await cache.getResults<SearchResponseDto>(text, filters, pagination);
  if (cached) {
    // Record cache hit analytics
    await SearchAnalytics.recordSearchEvent(sanitizedQuery, cached, undefined, undefined, {
      user_agent: 'cached',
    }).catch(() => {}); // Fire and forget
    return { ...cached, metadata: { ...cached.metadata, searchTime: Date.now() - start } };
  }

  /*  2. Phase 2: Use dual-engine orchestrator for intelligent search  */
  const searchOptions = {
    limit,
    filters,
    ...options,
  };

  const orchestratorResponse = await dualEngineOrchestrator.search(text, searchOptions);

  /*  3. Transform orchestrator results to SearchResponseDto format  */
  const results: SearchResultDto[] = orchestratorResponse.results.map((result: OrchestratorResult) => ({
    bill: {
      id: result.id,
      title: result.title,
      content: result.content,
      summary: result.summary,
      status: result.metadata.status,
      introduced_date: result.metadata.createdAt,
    } as PlainBill, // Type compatibility
    relevanceScore: result.relevanceScore,
    snippet: result.content.substring(0, 200),
    highlights: [], // Could be enhanced with actual highlighting
    matchedFields: [result.contentType],
  }));

  /*  4. Calculate facets from results (simplified)  */
  const facets = {
    status: [] as Array<{ value: string; count: number }>,
    category: [] as Array<{ value: string; count: number }>,
    sponsors: [] as Array<{ value: number; count: number }>,
    complexity: [] as Array<{ range: string; count: number; min: number; max: number }>,
    dateRanges: [] as Array<{ range: string; count: number; from: Date; to: Date }>,
  };

  // Extract facets from result metadata
  const statusCount = new Map<string, number>();
  results.forEach(result => {
    if (result.bill.status) {
      statusCount.set(result.bill.status, (statusCount.get(result.bill.status) || 0) + 1);
    }
  });

  facets.status = Array.from(statusCount.entries()).map(([value, count]) => ({ value, count }));

  /*  5. Suggestions when empty  */
  let suggestions: string[] | undefined;
  if (results.length === 0) {
    // Use consolidated suggestion engine for fallback suggestions
    const fallbackResult = await suggestionsSvc.getAutocompleteSuggestions(text, 5);
    suggestions = fallbackResult.suggestions.map((s: SuggestionResult) => s.term);
  }

  /*  6. Build DTO  */
  const dto: SearchResponseDto = {
    results,
    pagination: {
      page,
      limit,
      total: orchestratorResponse.totalCount,
      pages: Math.ceil(orchestratorResponse.totalCount / limit)
    },
    facets,
    suggestions: suggestions || [],
    metadata: {
      searchTime: Date.now() - start,
      source: 'db' as const,
      queryType: orchestratorResponse.searchType
    },
  };

  /*  7. Cache successful non-empty  */
  if (results.length) await cache.setResults(text, filters, pagination, dto);

  /*  8. Record analytics  */
  try {
    await SearchAnalytics.recordSearchEvent(sanitizedQuery, dto);
  } catch (error) {
    // Analytics failure shouldn't break search
    logger.warn('Failed to record search analytics', { error: String(error) });
  }

  return dto;
}

/*  Remaining exports – enhanced with validation and analytics  */
export async function getSearchSuggestions(partial: string, limit = 5) {
  // Validate input
  if (typeof partial !== 'string' || partial.length < MIN_QUERY) return [];

  const sanitizedPartial = partial.trim().substring(0, 100); // Reasonable limit
  const sanitizedLimit = Math.min(Math.max(limit, 1), 20); // Reasonable bounds

  const cached = await cache.getSuggestions<string[]>(sanitizedPartial, sanitizedLimit);
  if (cached) return cached;

  const sugs = (await suggestionsSvc.getAutocompleteSuggestions(sanitizedPartial, sanitizedLimit)).suggestions.map((s: SuggestionResult) => s.term);
  await cache.setSuggestions(sanitizedPartial, sanitizedLimit, sugs);

  // Record analytics for suggestions usage (optional - suggestions are lightweight)
  // SearchAnalytics.recordSearchEvent(...) - commented out to avoid noise

  return sugs;
}

export async function getPopularSearchTerms(limit = 20) {
  const cached = await cache.getPopular<string[]>();
  if (cached) return cached.slice(0, limit);

  // TODO: Implement popular terms retrieval from analytics/search logs
  // For now, return empty array to avoid errors
  const list: string[] = [];
  await cache.setPopular(list);
  return list.slice(0, limit);
}

export async function rebuildSearchIndexes(batchSize = 1000): Promise<{ updated: number; errors: number }> {
  // Validate batch size
  const validBatchSize = Math.min(Math.max(batchSize, 100), 10000); // Reasonable bounds
  const manager = new SearchIndexManager();
  return manager.rebuildAll(validBatchSize);
}

export async function getSearchIndexHealth() {
  const manager = new SearchIndexManager();
  return manager.getHealth();
}

export async function warmupSearchCache(commonQueries: string[] = []) {
  // Validate and sanitize queries
  const validQueries = commonQueries
    .filter(q => typeof q === 'string' && q.trim().length > 0)
    .map(q => q.trim().substring(0, 200)) // Reasonable length limit
    .slice(0, 50); // Limit to prevent abuse

  const manager = new SearchIndexManager();
  return manager.warmup(validQueries);
}

export async function getSearchMetrics() {
  // TODO aggregate from analytics table – placeholder returned
  return { avgSearchTime: 0, cacheHitRate: 0, totalSearches: 0, failedSearches: 0 };
}

// ============================================================================
// PHASE 3: ADVANCED FEATURES - Real-Time Streaming Support
// ============================================================================

import { EventEmitter } from 'events';

// Global search session manager for streaming and cancellation
class SearchSessionManager {
  private static instance: SearchSessionManager;
  private activeSearches = new Map<string, { controller: AbortController; emitter: EventEmitter }>();
  private searchTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  static getInstance(): SearchSessionManager {
    if (!SearchSessionManager.instance) {
      SearchSessionManager.instance = new SearchSessionManager();
    }
    return SearchSessionManager.instance;
  }

  createSearchSession(searchId: string): { controller: AbortController; emitter: EventEmitter } {
    const controller = new AbortController();
    const emitter = new EventEmitter();

    // Set timeout for search session (5 minutes)
    const timeout = setTimeout(() => {
      this.cancelSearch(searchId, 'timeout');
    }, 5 * 60 * 1000);

    this.activeSearches.set(searchId, { controller, emitter });
    this.searchTimeouts.set(searchId, timeout);

    return { controller, emitter };
  }

  getSearchSession(searchId: string) {
    return this.activeSearches.get(searchId);
  }

  cancelSearch(searchId: string, reason: string = 'cancelled') {
    const session = this.activeSearches.get(searchId);
    if (session) {
      session.controller.abort();
      session.emitter.emit('cancelled', { reason });

      // Clean up
      clearTimeout(this.searchTimeouts.get(searchId));
      this.activeSearches.delete(searchId);
      this.searchTimeouts.delete(searchId);
    }
  }

  cleanup() {
    for (const [searchId] of this.activeSearches) {
      this.cancelSearch(searchId, 'cleanup');
    }
  }
}

const searchSessionManager = SearchSessionManager.getInstance();

// Cleanup on process exit
process.on('SIGINT', () => searchSessionManager.cleanup());
process.on('SIGTERM', () => searchSessionManager.cleanup());

/**
 * Stream search results using Server-Sent Events
 */
export async function streamSearchBills(query: SearchQuery, res: Response, req?: Request): Promise<void> {
  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { controller } = searchSessionManager.createSearchSession(searchId);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    searchId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  if (req) {
    req.on('close', () => {
      searchSessionManager.cancelSearch(searchId, 'client_disconnect');
    });
  }

  try {
    // Send progress: starting
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      searchId,
      stage: 'starting',
      progress: 0,
      message: 'Initializing search...',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Validate and sanitize input
    const validation = SearchValidator.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Search validation failed: ${validation.errors.join(', ')}`);
    }
    const sanitizedQuery = SearchValidator.sanitizeSearchQuery(query);

    // Send progress: validation complete
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      searchId,
      stage: 'validation',
      progress: 10,
      message: 'Query validated',
      timestamp: new Date().toISOString()
    })}\n\n`);

    const { text, filters = {}, pagination = {}, options = {} } = sanitizedQuery;
    const page = Math.max((pagination as { page?: number }).page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max((pagination as { limit?: number }).limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    // Check cache
    const cached = await cache.getResults<SearchResponseDto>(text, filters, pagination);
    if (cached) {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        searchId,
        stage: 'cache_hit',
        progress: 100,
        message: 'Results found in cache',
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.write(`data: ${JSON.stringify({
        type: 'results',
        searchId,
        data: { ...cached, metadata: { ...cached.metadata, searchTime: Date.now() - Date.now() } },
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        searchId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
      return;
    }

    // Send progress: starting dual-engine search
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      searchId,
      stage: 'searching',
      progress: 20,
      message: 'Searching with dual-engine orchestrator...',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Execute search with streaming progress
    const searchOptions = {
      limit,
      filters,
      ...options,
      onProgress: (progress: { stage: string; progress: number; message: string }) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          searchId,
          ...progress,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    };

    const orchestratorResponse = await dualEngineOrchestrator.search(text, searchOptions);

    // Send progress: processing results
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      searchId,
      stage: 'processing',
      progress: 80,
      message: 'Processing search results...',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Transform results
    const results: SearchResultDto[] = orchestratorResponse.results.map((result: OrchestratorResult) => ({
      bill: {
        id: result.id,
        title: result.title,
        content: result.content,
        summary: result.summary,
        status: result.metadata.status,
        introduced_date: result.metadata.createdAt,
      } as PlainBill,
      relevanceScore: result.relevanceScore,
      snippet: result.content.substring(0, 200),
      highlights: [],
      matchedFields: [result.contentType],
    }));

    // Calculate facets
    const facets = {
      status: [] as Array<{ value: string; count: number }>,
      category: [] as Array<{ value: string; count: number }>,
      sponsors: [] as Array<{ value: number; count: number }>,
      complexity: [] as Array<{ range: string; count: number; min: number; max: number }>,
      dateRanges: [] as Array<{ range: string; count: number; from: Date; to: Date }>,
    };

    // Simple facet calculation
    const statusCount = new Map<string, number>();
    results.forEach(result => {
      if (result.bill.status) {
        statusCount.set(result.bill.status, (statusCount.get(result.bill.status) || 0) + 1);
      }
    });

    facets.status = Array.from(statusCount.entries()).map(([value, count]) => ({ value, count }));

    // Get suggestions
    let suggestions: string[] | undefined;
    if (results.length === 0) {
      const fallbackResult = await suggestionsSvc.getAutocompleteSuggestions(text, 5);
      suggestions = fallbackResult.suggestions.map((s: SuggestionResult) => s.term);
    }

    const dto: SearchResponseDto = {
      results,
      pagination: {
        page,
        limit,
        total: orchestratorResponse.totalCount,
        pages: Math.ceil(orchestratorResponse.totalCount / limit)
      },
      facets,
      suggestions: suggestions || [],
      metadata: {
        searchTime: Date.now() - Date.now(),
        source: 'db' as const,
        queryType: orchestratorResponse.searchType
      },
    };

    // Cache results
    if (results.length) await cache.setResults(text, filters, pagination, dto);

    // Send final progress
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      searchId,
      stage: 'complete',
      progress: 100,
      message: 'Search completed',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Send results
    res.write(`data: ${JSON.stringify({
      type: 'results',
      searchId,
      data: dto,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      searchId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();

    // Record analytics
    try {
      await SearchAnalytics.recordSearchEvent(sanitizedQuery, dto);
    } catch (error) {
      logger.warn('Failed to record search analytics', { error: String(error) });
    }

  } catch (error) {
    if (!controller.signal.aborted) {
      logger.error('Streaming search failed', { error: String(error), searchId });

      res.write(`data: ${JSON.stringify({
        type: 'error',
        searchId,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
    }
  } finally {
    // Clean up session
    setTimeout(() => {
      searchSessionManager.cancelSearch(searchId, 'completed');
    }, 1000);
  }
}

/**
 * Cancel an ongoing search
 */
export async function cancelSearch(searchId: string): Promise<{ success: boolean; message: string }> {
  try {
    searchSessionManager.cancelSearch(searchId, 'user_cancelled');
    return { success: true, message: 'Search cancelled successfully' };
  } catch (error) {
    logger.error('Failed to cancel search', { error: String(error), searchId });
    return { success: false, message: 'Failed to cancel search' };
  }
}

/**
 * Get search analytics data
 */
export async function getSearchAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<SearchMetrics> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate || new Date();

  try {
    return await SearchAnalytics.getSearchMetrics(start, end);
  } catch (error) {
    logger.error('Failed to get search analytics', { error: String(error) });
    return { totalSearches: 0, uniqueUsers: 0, averageSearchTime: 0, cacheHitRate: 0, popularQueries: [], noResultQueries: [], timeRange: { start, end } };
  }
}







































