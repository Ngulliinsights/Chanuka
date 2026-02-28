/**
 * Search Controller - Migrated to Modern Error Handling
 * 
 * Migration changes:
 * - Removed local error classes (ValidationError, BaseError, ErrorDomain)
 * - Removed all try-catch blocks
 * - Uses AsyncServiceResult from SearchService
 * - Uses boomFromStandardized for error conversion
 * - Uses Zod validation with safeParse()
 * - Consistent error handling pattern across all routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/error-management';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { boomFromStandardized } from '@server/infrastructure/error-handling';
import { logger } from '../../infrastructure/observability/core/logger';
import { searchRepository } from './infrastructure/SearchRepository';
import { searchService } from './application/SearchServiceWrapper';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  status: z.string().optional(),
  sponsor_id: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z.string().optional(),
  complexityMin: z.string().optional(),
  complexityMax: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['relevance', 'date', 'title', 'engagement']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  snippets: z.string().optional(),
  highlights: z.string().optional(),
  minScore: z.string().optional(),
  searchType: z.enum(['simple', 'phrase', 'boolean']).optional(),
});

const RebuildIndexSchema = z.object({
  batchSize: z.number().positive().optional(),
});

const SavedSearchExecuteSchema = z.object({
  id: z.string().min(1, 'Search ID is required'),
});

const ExportSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  format: z.enum(['json', 'csv', 'xlsx']).optional(),
});

// ============================================================================
// MAIN SEARCH ENDPOINTS
// ============================================================================

/**
 * GET /search - Search bills with advanced filtering and pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query parameters
  const validation = SearchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'search',
        field: error.path.join('.'),
      },
    });
  }

  const query = validation.data;
  
  // Build search parameters
  const searchParams = {
    text: query.q,
    filters: {
      category: query.category?.split(','),
      status: query.status?.split(','),
      sponsor_id: query.sponsor_id?.split(',').map(Number),
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      tags: query.tags?.split(','),
      complexityMin: query.complexityMin ? Number(query.complexityMin) : undefined,
      complexityMax: query.complexityMax ? Number(query.complexityMax) : undefined,
    },
    pagination: {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
    },
    options: {
      includeSnippets: query.snippets === 'true',
      includeHighlights: query.highlights === 'true',
      minRelevanceScore: query.minScore ? Number(query.minScore) : undefined,
      searchType: query.searchType || 'simple',
    },
  };

  const result = await searchService.searchBills(searchParams);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /search/suggestions - Get search suggestions for a query
 */
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) ?? '';
  const limit = Math.min(Number(req.query.limit) || 5, 20);

  // Return empty suggestions for short queries
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  const result = await searchService.getSearchSuggestions(q, limit);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json({ query: q, suggestions: result.value });
}));

/**
 * GET /search/popular - Get popular search terms
 */
router.get('/popular', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  
  const result = await searchService.getPopularSearchTerms(limit);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json({ terms: result.value });
}));

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * POST /search/admin/rebuild-index - Rebuild search indexes (admin only)
 */
router.post('/admin/rebuild-index', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const validation = RebuildIndexSchema.safeParse(req.body);
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'rebuildIndex',
        field: error.path.join('.'),
      },
    });
  }

  const { batchSize } = validation.data;
  const result = await searchService.rebuildSearchIndexes(batchSize || 1000);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /search/admin/index-health - Get search index health status (admin only)
 */
router.get('/admin/index-health', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const result = await searchService.getSearchIndexHealth();
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

// ============================================================================
// STREAMING AND ANALYTICS
// ============================================================================

/**
 * GET /search/stream - Stream search results
 */
router.get('/stream', asyncHandler(async (req: Request, res: Response) => {
  const validation = SearchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'streamSearch',
        field: error.path.join('.'),
      },
    });
  }

  const query = validation.data;
  
  const searchParams = {
    text: query.q,
    filters: {
      category: query.category?.split(','),
      status: query.status?.split(','),
      sponsor_id: query.sponsor_id?.split(',').map(Number),
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      tags: query.tags?.split(','),
      complexityMin: query.complexityMin ? Number(query.complexityMin) : undefined,
      complexityMax: query.complexityMax ? Number(query.complexityMax) : undefined,
    },
    pagination: {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
    },
    options: {
      includeSnippets: query.snippets === 'true',
      includeHighlights: query.highlights === 'true',
      minRelevanceScore: query.minScore ? Number(query.minScore) : undefined,
      searchType: query.searchType || 'simple',
    },
  };

  const result = await searchService.streamSearchBills(searchParams, res, req);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
}));

/**
 * DELETE /search/cancel/:searchId - Cancel an active search
 */
router.delete('/cancel/:searchId', asyncHandler(async (req: Request, res: Response) => {
  const { searchId } = req.params;

  if (!searchId) {
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: 'Search ID is required',
      userMessage: 'Search ID parameter is required',
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'cancelSearch',
        field: 'searchId',
      },
    });
  }

  const result = await searchService.cancelSearch(searchId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /search/analytics - Get search analytics for a date range
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

  const result = await searchService.getSearchAnalytics(startDate, endDate);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

/**
 * GET /search/analytics/metrics - Get current search metrics
 */
router.get('/analytics/metrics', asyncHandler(async (req: Request, res: Response) => {
  const result = await searchService.getSearchMetrics();
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }
  
  res.json(result.value);
}));

// ============================================================================
// DATABASE-BACKED ENDPOINTS
// ============================================================================

/**
 * GET /search/postgresql - PostgreSQL full-text search
 */
router.get('/postgresql', asyncHandler(async (req: Request, res: Response) => {
  const validation = SearchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'postgresqlSearch',
        field: error.path.join('.'),
      },
    });
  }

  const query = validation.data;
  
  const searchParams = {
    text: query.q,
    filters: {
      category: query.category?.split(','),
      status: query.status?.split(','),
    },
    pagination: {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
    },
    options: {
      searchType: 'simple' as const,
    },
  };

  const result = await searchService.searchBills(searchParams);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  // Record in history via repository
  searchRepository.recordSearch(query.q, result.value.results?.length ?? 0).catch(() => {});

  res.json(result.value);
}));

/**
 * GET /search/data - Return search data for client-side fuzzy matching
 */
router.get('/data', asyncHandler(async (req: Request, res: Response) => {
  const result = await searchService.searchBills({
    text: '',
    pagination: { page: 1, limit: 100, sortBy: 'relevance', sortOrder: 'desc' },
    options: { searchType: 'simple' },
  });
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  // Transform to simplified format for fuzzy matching
  const data = (result.value.results || []).map((r: any) => ({
    id: r.id || r.bill_id,
    type: 'bill',
    title: r.title || '',
    description: r.summary || r.snippet || '',
    relevanceScore: r.relevanceScore || 0,
    metadata: r.metadata || {},
  }));

  res.json(data);
}));

/**
 * GET /search/live - Live search / typeahead
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) ?? '';
  const limit = Math.min(Number(req.query.limit) || 10, 20);

  if (q.length < 1) {
    res.json([]);
    return;
  }

  const result = await searchService.getSearchSuggestions(q, limit);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  // Format as SearchSuggestion[]
  const formatted = (result.value || []).map((s: any) => ({
    text: typeof s === 'string' ? s : s.term || s.text || '',
    term: typeof s === 'string' ? s : s.term || s.text || '',
    type: s.type || 'completion',
    score: s.frequency || s.score || 0,
    frequency: s.frequency || 0,
  }));

  res.json(formatted);
}));

// ============================================================================
// SEARCH HISTORY ENDPOINTS
// ============================================================================

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

// ============================================================================
// SAVED SEARCHES
// ============================================================================

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
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: 'Search ID is required',
      userMessage: 'Search ID parameter is required',
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'deleteSavedSearch',
        field: 'id',
      },
    });
  }
  const userId = (req as any).user?.id;
  const deleted = await searchRepository.deleteSavedSearch(id, userId ?? 'anonymous');
  res.json({ success: deleted });
}));

/**
 * POST /search/saved/:id/execute - Execute a saved search
 */
router.post('/saved/:id/execute', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: 'Search ID is required',
      userMessage: 'Search ID parameter is required',
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'executeSavedSearch',
        field: 'id',
      },
    });
  }
  const userId = (req as any).user?.id;

  const query = await searchRepository.getAndUpdateSavedSearch(id, userId ?? 'anonymous');

  if (!query) {
    throw boomFromStandardized({
      category: 'BUSINESS' as any,
      code: 'NOT_FOUND',
      message: `Saved search '${id}' not found`,
      userMessage: `Saved search not found`,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'executeSavedSearch',
        savedSearchId: id,
      },
    });
  }

  const q = query as Record<string, unknown>;
  const result = await searchService.searchBills({
    text: (q.q as string) || (q.text as string) || '',
    filters: (q.filters as Record<string, unknown>) || {},
    pagination: (q.pagination as { page: number; limit: number; sortBy: string; sortOrder: string }) || { page: 1, limit: 10, sortBy: 'relevance', sortOrder: 'desc' },
    options: (q.options as Record<string, unknown>) || { searchType: 'simple' },
  });

  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

// ============================================================================
// METADATA AND RELATED SEARCHES
// ============================================================================

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

  const related = await searchRepository.getRelatedSearches(q, limit).catch(() => []);
  res.json(related);
}));

/**
 * GET /search/result/:type/:id - Get a single search result detail
 */
router.get('/result/:type/:id', asyncHandler(async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const result = await searchRepository.getSearchResultById(type ?? '', id ?? '');

  if (!result) {
    throw boomFromStandardized({
      category: 'BUSINESS' as any,
      code: 'NOT_FOUND',
      message: `${type} '${id}' not found`,
      userMessage: `Search result not found`,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'getSearchResult',
        type,
        id,
      },
    });
  }

  res.json(result);
}));

/**
 * POST /search/export - Export search results
 */
router.post('/export', asyncHandler(async (req: Request, res: Response) => {
  const validation = ExportSearchSchema.safeParse({ ...req.body, ...req.query });
  if (!validation.success) {
    const error = validation.error.errors[0];
    throw boomFromStandardized({
      category: 'VALIDATION' as any,
      code: 'VALIDATION_FAILED',
      message: error.message,
      userMessage: error.message,
      severity: 'LOW' as any,
      isRetryable: false,
      context: {
        service: 'SearchController',
        operation: 'exportSearch',
        field: error.path.join('.'),
      },
    });
  }

  const { q, format } = validation.data;

  const result = await searchService.searchBills({
    text: q,
    pagination: { page: 1, limit: 500, sortBy: 'relevance', sortOrder: 'desc' },
    options: { searchType: 'simple' },
  });

  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  // Return export response (stub — no actual file download)
  res.json({
    downloadUrl: `/api/search/export/download/${Date.now()}`,
    format: format || 'json',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    totalRecords: result.value.results?.length ?? 0,
  });
}));

export { router };
