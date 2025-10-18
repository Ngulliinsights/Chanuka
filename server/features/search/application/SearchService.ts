import { SearchRepository } from '../infrastructure/SearchRepository';
import { SearchQueryBuilder } from '../infrastructure/SearchQueryBuilder';
import { SearchCache } from '../infrastructure/SearchCache';
import { SearchIndexManager } from '../infrastructure/SearchIndexManager';
import { RelevanceScorer } from '../domain/RelevanceScorer';
import { SearchSuggestionsService } from './SearchSuggestionsService';
import { SearchAnalytics } from '../domain/SearchAnalytics';
import { SearchValidator } from '../domain/SearchValidator';
import { databaseService } from '../../../infrastructure/database/database-service';
import { logger } from '@shared/core/src/logging';
import type {
  SearchQuery,
  SearchResponseDto,
  SearchResultDto,
  PlainBill,
} from '../domain/search.dto';

const repo = new SearchRepository();
const cache = new SearchCache();
const scorer = new RelevanceScorer();
const suggestionsSvc = new SearchSuggestionsService();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_QUERY = 2;

/*  Original searchBills – every option honoured  */
export async function searchBills(query: SearchQuery): Promise<SearchResponseDto> {
  const start = Date.now();

  // Validate and sanitize input
  const validation = SearchValidator.validateSearchQuery(query);
  if (!validation.isValid) {
    throw new Error(`Search validation failed: ${validation.errors.join(', ')}`);
  }
  const sanitizedQuery = SearchValidator.sanitizeSearchQuery(query);

  const { text, filters = {}, pagination = {}, options = {} } = sanitizedQuery;
  const page = Math.max((pagination as any).page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max((pagination as any).limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  /*  1. Cache layer  */
  const cached = await cache.getResults<SearchResponseDto>(text, filters, pagination);
  if (cached) {
    // Record cache hit analytics
    await SearchAnalytics.recordSearchEvent(sanitizedQuery, cached, undefined, undefined, {
      userAgent: 'cached',
    }).catch(() => {}); // Fire and forget
    return { ...cached, metadata: { ...cached.metadata, searchTime: Date.now() - start } };
  }

  /*  2. Build search vector & conditions  */
  const vector = SearchQueryBuilder.buildVector(text, options.searchType);
  const conditions = SearchQueryBuilder.buildFilters(filters, vector);
  const orderBy = SearchQueryBuilder.buildOrder((pagination as any).sortBy ?? 'relevance', (pagination as any).sortOrder ?? 'desc', vector);

  /*  3. Parallel execution with fallback  */
  const result = await databaseService.withFallback(
    () =>
      Promise.all([
        repo.search(vector, conditions, orderBy, limit, offset, {
          includeSnippets: options.includeSnippets,
          includeHighlights: options.includeHighlights,
          searchTerms: text.trim().split(/\s+/),
        }),
        repo.count(conditions),
        repo.facets(conditions),
      ]),
    [[], 0, { status: [], category: [], sponsors: [], complexity: [], dateRanges: [] }],
    `searchBills(${text})`
  );
  const [rows, total, facets] = result.data;

  /*  4. Scoring & mapping (enhanced with domain logic)  */
  const minScore = options.minRelevanceScore ?? 0.001;
  const results: SearchResultDto[] = rows
    .filter(r => r.rank >= minScore)
    .map(r => {
      const highlights = options.includeHighlights ? RelevanceScorer.highlight(r.bill, text) : undefined;
      const enhancedScore = RelevanceScorer.score(text, r.bill);
      return {
        bill: r.bill,
        relevanceScore: Math.max(r.rank, enhancedScore), // Use the higher score
        snippet: r.snippet ?? undefined,
        highlights,
        matchedFields: highlights ?? [],
      };
    });

  /*  5. Suggestions when empty  */
  let suggestions: string[] | undefined;
  if (results.length === 0) {
    suggestions = await suggestionsSvc.getFallbackSuggestions(text, 5);
  }

  /*  6. Build DTO  */
  const dto: SearchResponseDto = {
    results,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    facets,
    suggestions,
    metadata: { searchTime: Date.now() - start, source: 'db', queryType: options.searchType ?? 'simple' },
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

  const sugs = await suggestionsSvc.getAutocompleteSuggestions(sanitizedPartial, sanitizedLimit);
  await cache.setSuggestions(sanitizedPartial, sanitizedLimit, sugs);

  // Record analytics for suggestions usage (optional - suggestions are lightweight)
  // SearchAnalytics.recordSearchEvent(...) - commented out to avoid noise

  return sugs;
}

export async function getPopularSearchTerms(limit = 20) {
  const cached = await cache.getPopular<string[]>();
  if (cached) return cached.slice(0, limit);
  const terms = await repo.popularTermCounts(limit);
  const list = terms.map(t => t.term);
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
