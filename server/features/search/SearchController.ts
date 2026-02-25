import {
  cancelSearch,
  getPopularSearchTerms,
  getSearchAnalytics,
  getSearchIndexHealth,
  getSearchMetrics,
  getSearchSuggestions,
  rebuildSearchIndexes,
  searchBills,
  streamSearchBills,
} from './application/SearchService';
import { logger } from '../../infrastructure/observability/core/logger';
import { Router, Request, Response } from 'express';
import { searchRepository } from './infrastructure/SearchRepository';

import { asyncHandler } from '../../middleware/error-management';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { ErrorSeverity } from '../../infrastructure/error-handling';
import { ERROR_CODES } from '@shared/constants';

// Helper to create error context from request
function createErrorContext(req: Request, endpoint: string) {
  return {
    endpoint,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  };
}

// Custom error classes for better error handling
class ValidationError extends Error {
  constructor(message: string, public details?: Array<{ field: string; message: string; code: string }>) {
    super(message);
    this.name = 'ValidationError';
  }
}

class BaseError extends Error {
  constructor(
    message: string,
    public options: {
      statusCode: number;
      code: string;
      domain: string;
      severity: ErrorSeverity;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'BaseError';
  }
}

// Error domain constant
const ErrorDomain = {
  SYSTEM: 'SYSTEM',
  BUSINESS: 'BUSINESS',
  VALIDATION: 'VALIDATION',
} as const;

// Type guards for query parameters
function isSortBy(value: unknown): value is 'relevance' | 'date' | 'title' | 'engagement' {
  return typeof value === 'string' && ['relevance', 'date', 'title', 'engagement'].includes(value);
}

function isSortOrder(value: unknown): value is 'asc' | 'desc' {
  return typeof value === 'string' && ['asc', 'desc'].includes(value);
}

function isSearchType(value: unknown): value is 'simple' | 'phrase' | 'boolean' {
  return typeof value === 'string' && ['simple', 'phrase', 'boolean'].includes(value);
}

const router: Router = Router();

/**
 * GET /search - Search bills with advanced filtering and pagination
 * Query parameters:
 * - q: search query (required)
 * - category, status, sponsor_id: filters
 * - dateFrom, dateTo: date range filters
 * - tags: tag filters
 * - complexityMin, complexityMax: complexity range
 * - page, limit: pagination (default: page=1, limit=10)
 * - sortBy, sortOrder: sorting (default: relevance, desc)
 * - snippets, highlights: boolean options
 * - minScore: minimum relevance score
 * - searchType: 'simple' or advanced (default: simple)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search');

  try {
    const query: Parameters<typeof searchBills>[0] = {
      text: (req.query.q as string) ?? '',
      filters: {
        category: req.query.category ? String(req.query.category).split(',') : undefined,
        status: req.query.status ? String(req.query.status).split(',') : undefined,
        sponsor_id: req.query.sponsor_id ? String(req.query.sponsor_id).split(',').map(Number) : undefined,
        dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
        dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
        tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
        complexityMin: req.query.complexityMin ? Number(req.query.complexityMin) : undefined,
        complexityMax: req.query.complexityMax ? Number(req.query.complexityMax) : undefined,
      },
      pagination: {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: isSortBy(req.query.sortBy) ? req.query.sortBy : 'relevance',
        sortOrder: isSortOrder(req.query.sortOrder) ? req.query.sortOrder : 'desc',
      },
      options: {
        includeSnippets: req.query.snippets === 'true',
        includeHighlights: req.query.highlights === 'true',
        minRelevanceScore: req.query.minScore ? Number(req.query.minScore) : undefined,
        searchType: isSearchType(req.query.searchType) ? req.query.searchType : 'simple',
      },
    };

    // Validate required search query
    if (!query.text.trim()) {
      throw new ValidationError('Search query is required', [
        { field: 'q', message: 'Query parameter "q" is required and cannot be empty', code: 'REQUIRED_FIELD' }
      ]);
    }

    const dto = await searchBills(query);
    res.json(dto);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error({ component: 'search-routes', context, error }, 'Search controller error');

    throw new BaseError('Search failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes', query: req.query.q }
    });
  }
}));

/**
 * GET /search/suggestions - Get search suggestions for a query
 * Query parameters:
 * - q: partial query (minimum 2 characters)
 * - limit: max suggestions to return (default: 5, max: 20)
 */
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/suggestions');

  try {
    const q = (req.query.q as string) ?? '';
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    // Return empty suggestions for short queries
    if (q.length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    const suggestions = await getSearchSuggestions(q, limit);
    res.json({ query: q, suggestions });
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Search suggestions error');

    throw new BaseError('Failed to fetch search suggestions', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * GET /search/popular - Get popular search terms
 * Query parameters:
 * - limit: number of popular terms (default: 20, max: 50)
 */
router.get('/popular', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/popular');

  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const terms = await getPopularSearchTerms(limit);

    res.json({ terms });
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Popular search terms error');

    throw new BaseError('Failed to fetch popular search terms', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * POST /search/admin/rebuild-index - Rebuild search indexes (admin only)
 * Request body:
 * - batchSize: number of items per batch (default: 1000)
 *
 * Note: This route requires admin authentication
 */
router.post('/admin/rebuild-index', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /api/search/admin/rebuild-index');

  try {
    const { batchSize } = req.body;

    // Validate batch size if provided
    if (batchSize !== undefined && (typeof batchSize !== 'number' || batchSize < 1)) {
      throw new ValidationError('Invalid batch size', [
        { field: 'batchSize', message: 'Batch size must be a positive number', code: 'INVALID_VALUE' }
      ]);
    }

    const report = await rebuildSearchIndexes(batchSize || 1000);
    res.json(report);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error({ component: 'search-routes', context, error }, 'Rebuild search index error');

    throw new BaseError('Failed to rebuild search indexes', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * GET /search/admin/index-health - Get search index health status (admin only)
 * Returns health metrics for all search indexes
 *
 * Note: This route requires admin authentication
 */
router.get('/admin/index-health', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/admin/index-health');

  try {
    const health = await getSearchIndexHealth();
    res.json(health);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Get index health error');

    throw new BaseError('Failed to fetch index health', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

// ============================================================================
// ADVANCED FEATURES - Streaming and Analytics Endpoints
// ============================================================================

/**
 * GET /search/stream - Stream search results
 * Query parameters: Same as GET / (main search endpoint)
 * Streams results in chunks as they become available
 */
router.get('/stream', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/stream');

  try {
    const filters: any = {};
    if (req.query.category) filters.category = String(req.query.category).split(',');
    if (req.query.status) filters.status = String(req.query.status).split(',');
    if (req.query.sponsor_id) filters.sponsor_id = String(req.query.sponsor_id).split(',').map(Number);
    if (req.query.dateFrom) filters.dateFrom = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) filters.dateTo = new Date(String(req.query.dateTo));
    if (req.query.tags) filters.tags = String(req.query.tags).split(',');
    if (req.query.complexityMin) filters.complexityMin = Number(req.query.complexityMin);
    if (req.query.complexityMax) filters.complexityMax = Number(req.query.complexityMax);

    const options: any = {};
    if (req.query.snippets) options.includeSnippets = req.query.snippets === 'true';
    if (req.query.highlights) options.includeHighlights = req.query.highlights === 'true';
    if (req.query.minScore) options.minRelevanceScore = Number(req.query.minScore);
    if (req.query.searchType) options.searchType = req.query.searchType;

    const query: Parameters<typeof searchBills>[0] = {
      text: (req.query.q as string) ?? '',
      filters,
      pagination: {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: isSortBy(req.query.sortBy) ? req.query.sortBy : 'relevance',
        sortOrder: isSortOrder(req.query.sortOrder) ? req.query.sortOrder : 'desc',
      },
      options,
    };

    // Validate required search query
    if (!query.text.trim()) {
      throw new ValidationError('Search query is required', [
        { field: 'q', message: 'Query parameter "q" is required and cannot be empty', code: 'REQUIRED_FIELD' }
      ]);
    }

    // Start streaming search
    await streamSearchBills(query, res, req);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error({ component: 'search-routes', context, error }, 'Streaming search error');

    throw new BaseError('Streaming search failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes', query: req.query.q }
    });
  }
}));

/**
 * DELETE /search/cancel/:searchId - Cancel an active search
 * Path parameters:
 * - searchId: unique identifier of the search to cancel
 */
router.delete('/cancel/:searchId', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'DELETE /api/search/cancel/:searchId');

  try {
    const { searchId } = req.params;

    // Validate search ID is provided
    if (!searchId) {
      throw new ValidationError('Search ID is required', [
        { field: 'searchId', message: 'Search ID parameter is required', code: 'REQUIRED_FIELD' }
      ]);
    }

    const result = await cancelSearch(searchId);
    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error({ component: 'search-routes', context, searchId: req.params.searchId, error }, 'Cancel search error');

    throw new BaseError('Failed to cancel search', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes', searchId: req.params.searchId }
    });
  }
}));

/**
 * GET /search/analytics - Get search analytics for a date range
 * Query parameters:
 * - startDate: start of analytics period (ISO date string)
 * - endDate: end of analytics period (ISO date string)
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/analytics');

  try {
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    const analytics = await getSearchAnalytics(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Search analytics error');

    throw new BaseError('Failed to fetch search analytics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * GET /search/analytics/metrics - Get current search metrics
 * Returns real-time metrics about search performance and usage
 */
router.get('/analytics/metrics', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/analytics/metrics');

  try {
    const metrics = await getSearchMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Search metrics error');

    throw new BaseError('Failed to fetch search metrics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

// ============================================================================
// DATABASE-BACKED ENDPOINTS via SearchRepository
// ============================================================================

// ============================================================================
// MISSING ENDPOINTS - Stub implementations for client integration
// ============================================================================

/**
 * GET /search/postgresql - PostgreSQL full-text search
 * Aliases to main search endpoint since PostgreSQL is the default engine
 */
router.get('/postgresql', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/postgresql');

  try {
    const query: Parameters<typeof searchBills>[0] = {
      text: (req.query.q as string) ?? '',
      filters: {
        category: req.query.category ? String(req.query.category).split(',') : undefined,
        status: req.query.status ? String(req.query.status).split(',') : undefined,
      },
      pagination: {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        sortBy: isSortBy(req.query.sortBy) ? req.query.sortBy : 'relevance',
        sortOrder: isSortOrder(req.query.sortOrder) ? req.query.sortOrder : 'desc',
      },
      options: {
        searchType: 'simple',
      },
    };

    if (!query.text.trim()) {
      throw new ValidationError('Search query is required', [
        { field: 'q', message: 'Query parameter "q" is required and cannot be empty', code: 'REQUIRED_FIELD' }
      ]);
    }

    const dto = await searchBills(query);

    // Record in history via repository
    searchRepository.recordSearch(query.text, dto.results?.length ?? 0).catch(() => {});

    res.json(dto);
  } catch (error) {
    if (error instanceof ValidationError) throw error;

    logger.error({ component: 'search-routes', context, error }, 'PostgreSQL search error');
    throw new BaseError('PostgreSQL search failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes', query: req.query.q }
    });
  }
}));

/**
 * GET /search/data - Return search data for client-side fuzzy matching
 * Query parameters:
 * - type: content type filter (default: 'bills')
 */
router.get('/data', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/data');

  try {
    // Return a basic search with empty query to get all available bills
    const dto = await searchBills({
      text: '',
      pagination: { page: 1, limit: 100 },
      options: { searchType: 'simple' },
    });

    // Transform to simplified format for fuzzy matching
    const data = (dto.results || []).map((r: any) => ({
      id: r.id || r.bill_id,
      type: 'bill',
      title: r.title || '',
      description: r.summary || r.snippet || '',
      relevanceScore: r.relevanceScore || 0,
      metadata: r.metadata || {},
    }));

    res.json(data);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Search data error');
    throw new BaseError('Failed to fetch search data', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * GET /search/live - Live search / typeahead
 * Aliases to suggestions endpoint with slightly different formatting
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/live');

  try {
    const q = (req.query.q as string) ?? '';
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    if (q.length < 1) {
      res.json([]);
      return;
    }

    const suggestions = await getSearchSuggestions(q, limit);
    // Format as SearchSuggestion[]
    const formatted = (suggestions || []).map((s: any) => ({
      text: typeof s === 'string' ? s : s.term || s.text || '',
      term: typeof s === 'string' ? s : s.term || s.text || '',
      type: s.type || 'completion',
      score: s.frequency || s.score || 0,
      frequency: s.frequency || 0,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Live search error');
    throw new BaseError('Live search failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * GET /search/recent - Get recent searches
 */
router.get('/recent', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const userId = (req as any).user?.id;
  const results = await searchRepository.getRecentSearches(limit, userId);
  res.json(results);
}));

/**
 * GET /search/history - Get search history
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const userId = (req as any).user?.id;
  const results = await searchRepository.getHistory(userId, limit);
  res.json(results);
}));

/**
 * DELETE /search/history - Clear search history
 */
router.delete('/history', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  await searchRepository.clearHistory(userId);
  res.json({ success: true });
}));

/**
 * POST /search/saved - Save a search
 */
router.post('/saved', asyncHandler(async (req: Request, res: Response) => {
  const { name, query, description, is_public, tags } = req.body;
  const userId = (req as any).user?.id;

  const saved = await searchRepository.saveSearch({
    userId,
    name: name || 'Untitled Search',
    query: query || {},
    description,
    is_public: is_public ?? false,
    tags: tags || [],
  });

  res.status(201).json(saved);
}));

/**
 * GET /search/saved - Get saved searches
 */
router.get('/saved', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const results = await searchRepository.getSavedSearches(userId);
  res.json(results);
}));

/**
 * DELETE /search/saved/:id - Delete a saved search
 */
router.delete('/saved/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new ValidationError('Search ID is required');
  }
  const userId = (req as any).user?.id;
  const deleted = await searchRepository.deleteSavedSearch(id, userId ?? 'anonymous');
  res.json({ success: deleted });
}));

/**
 * POST /search/saved/:id/execute - Execute a saved search
 */
router.post('/saved/:id/execute', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /api/search/saved/:id/execute');
  const { id } = req.params;
  if (!id) {
    throw new ValidationError('Search ID is required');
  }
  const userId = (req as any).user?.id;

  const query = await searchRepository.getAndUpdateSavedSearch(id, userId ?? 'anonymous');

  if (!query) {
    throw new ValidationError('Saved search not found', [
      { field: 'id', message: `Saved search '${id}' not found`, code: 'NOT_FOUND' }
    ]);
  }

  try {
    const q = query as Record<string, unknown>;
    const dto = await searchBills({
      text: (q.q as string) || (q.text as string) || '',
      filters: (q.filters as Record<string, unknown>) || {},
      pagination: (q.pagination as { page: number; limit: number }) || { page: 1, limit: 10 },
      options: (q.options as Record<string, unknown>) || { searchType: 'simple' },
    });

    res.json(dto);
  } catch (error) {
    logger.error({ component: 'search-routes', context, error }, 'Execute saved search error');
    throw new BaseError('Failed to execute saved search', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes', savedSearchId: id }
    });
  }
}));

/**
 * GET /search/metadata - Return available filter options and metadata
 */
router.get('/metadata', asyncHandler(async (_req: Request, res: Response) => {
  const metadata = await searchRepository.getMetadata();
  res.json(metadata);
}));

/**
 * GET /search/related - Get related searches
 */
router.get('/related', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) ?? '';
  const limit = Math.min(Number(req.query.limit) || 5, 20);

  if (q.length < 2) {
    res.json([]);
    return;
  }

  try {
    const related = await searchRepository.getRelatedSearches(q, limit);
    res.json(related);
  } catch {
    // Fallback: return empty
    res.json([]);
  }
}));

/**
 * GET /search/result/:type/:id - Get a single search result detail
 */
router.get('/result/:type/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/result/:type/:id');

  try {
    const { type, id } = req.params;
    const result = await searchRepository.getSearchResultById(type ?? '', id ?? '');

    if (!result) {
      throw new ValidationError('Search result not found', [
        { field: 'id', message: `${type} '${id}' not found`, code: 'NOT_FOUND' }
      ]);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error({ component: 'search-routes', context, error }, 'Search result detail error');
    throw new BaseError('Failed to fetch search result', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

/**
 * POST /search/export - Export search results
 */
router.post('/export', asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /api/search/export');

  try {
    const format = (req.query.format as string) || 'json';
    const q = req.body.q || (req.query.q as string) || '';

    if (!q.trim()) {
      throw new ValidationError('Search query is required for export', [
        { field: 'q', message: 'Query parameter "q" is required', code: 'REQUIRED_FIELD' }
      ]);
    }

    // Perform the search
    const dto = await searchBills({
      text: q,
      pagination: { page: 1, limit: 500 },
      options: { searchType: 'simple' },
    });

    // Return export response (stub — no actual file download)
    res.json({
      downloadUrl: `/api/search/export/download/${Date.now()}`,
      format,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      totalRecords: dto.results?.length ?? 0,
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;

    logger.error({ component: 'search-routes', context, error }, 'Search export error');
    throw new BaseError('Search export failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

export { router };
