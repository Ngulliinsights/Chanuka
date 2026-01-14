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
} from '@shared/application/SearchService';
import { logger } from '@shared/core';
import { Router, Response } from 'express';

import { asyncHandler } from '@/middleware/error-management';
import { BaseError, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES, ErrorDomain, ErrorSeverity } from '@shared/constants';
import { createErrorContext } from '@shared/core/observability/distributed-tracing';

const router = Router();

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
router.get('/', asyncHandler(async (req, res: Response) => {
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
        sortBy: (req.query.sortBy as any) ?? 'relevance',
        sortOrder: (req.query.sortOrder as any) ?? 'desc',
      },
      options: {
        includeSnippets: req.query.snippets === 'true',
        includeHighlights: req.query.highlights === 'true',
        minRelevanceScore: req.query.minScore ? Number(req.query.minScore) : undefined,
        searchType: (req.query.searchType as any) ?? 'simple',
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

    logger.error('Search controller error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.get('/suggestions', asyncHandler(async (req, res: Response) => {
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
    logger.error('Search suggestions error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.get('/popular', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/popular');

  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const terms = await getPopularSearchTerms(limit);

    res.json({ terms });
  } catch (error) {
    logger.error('Popular search terms error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.post('/admin/rebuild-index', asyncHandler(async (req, res: Response) => {
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

    logger.error('Rebuild search index error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.get('/admin/index-health', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/admin/index-health');

  try {
    const health = await getSearchIndexHealth();
    res.json(health);
  } catch (error) {
    logger.error('Get index health error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.get('/stream', asyncHandler(async (req, res: Response) => {
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
        sortBy: (req.query.sortBy as any) ?? 'relevance',
        sortOrder: (req.query.sortOrder as any) ?? 'desc',
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

    logger.error('Streaming search error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.delete('/cancel/:searchId', asyncHandler(async (req, res: Response) => {
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

    logger.error('Cancel search error', { component: 'search-routes', context, searchId: req.params.searchId }, error as Record<string, any> | undefined);

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
router.get('/analytics', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/analytics');

  try {
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    const analytics = await getSearchAnalytics(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    logger.error('Search analytics error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

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
router.get('/analytics/metrics', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/search/analytics/metrics');

  try {
    const metrics = await getSearchMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Search metrics error', { component: 'search-routes', context }, error as Record<string, any> | undefined);

    throw new BaseError('Failed to fetch search metrics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'search-routes' }
    });
  }
}));

export { router };
