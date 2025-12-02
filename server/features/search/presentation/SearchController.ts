import { Router } from 'express';
import {
  searchBills,
  getSearchSuggestions,
  getPopularSearchTerms,
  rebuildSearchIndexes,
  getSearchIndexHealth,
  streamSearchBills,
  cancelSearch,
  getSearchAnalytics,
  getSearchMetrics,
} from '@shared/application/SearchService';
import { ApiSuccess, ApiError, ApiValidationError  } from '@shared/core/utils/api';
import { logger   } from '@shared/core';

const router = Router();

router.get('/', async (req, res) => {
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
  if (!query.text.trim()) return ApiValidationError(res, { field: 'q', message: 'Query parameter "q" is required' });
    const dto = await searchBills(query);
    return ApiSuccess(res, dto);
  } catch (e) {
    logger.error('Search controller error', { error: e });
    return ApiError(res, { code: 'INTERNAL_ERROR', message: (e as Error).message }, 500);
  }
});

router.get('/suggestions', async (req, res) => {
  const q = (req.query.q as string) ?? '';
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  if (q.length < 2) return ApiSuccess(res, { suggestions: [] });
  const suggestions = await getSearchSuggestions(q, limit);
  return ApiSuccess(res, { query: q, suggestions });
});

router.get('/popular', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const terms = await getPopularSearchTerms(limit);
  return ApiSuccess(res, { terms });
});

router.post('/admin/rebuild-index', async (req, res) => {
  /*  admin-only route – kept original signature  */
  const { batchSize } = req.body;
  const report = await rebuildSearchIndexes(batchSize || 1000);
  return ApiSuccess(res, report);
});

router.get('/admin/index-health', async (_req, res) => {
  const health = await getSearchIndexHealth();
  return ApiSuccess(res, health);
});

// ============================================================================
// PHASE 3: ADVANCED FEATURES - Streaming and Analytics Endpoints
// ============================================================================

router.get('/stream', async (req, res) => {
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

    if (!query.text.trim()) return ApiValidationError(res, { field: 'q', message: 'Query parameter "q" is required' });

    // Start streaming search
    await streamSearchBills(query, res, req);
  } catch (e) {
    logger.error('Streaming search controller error', { error: e });
    return ApiError(res, { code: 'INTERNAL_ERROR', message: (e as Error).message }, 500);
  }
});

router.delete('/cancel/:searchId', async (req, res) => {
  try {
    const { searchId } = req.params;
    if (!searchId) return ApiValidationError(res, { field: 'searchId', message: 'Search ID is required' });

    const result = await cancelSearch(searchId);
    return ApiSuccess(res, result);
  } catch (e) {
    logger.error('Cancel search controller error', { error: e });
    return ApiError(res, { code: 'INTERNAL_ERROR', message: (e as Error).message }, 500);
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    const analytics = await getSearchAnalytics(startDate, endDate);
    return ApiSuccess(res, analytics);
  } catch (e) {
    logger.error('Search analytics controller error', { error: e });
    return ApiError(res, { code: 'INTERNAL_ERROR', message: (e as Error).message }, 500);
  }
});

router.get('/analytics/metrics', async (_req, res) => {
  try {
    const metrics = await getSearchMetrics();
    return ApiSuccess(res, metrics);
  } catch (e) {
    logger.error('Search metrics controller error', { error: e });
    return ApiError(res, { code: 'INTERNAL_ERROR', message: (e as Error).message }, 500);
  }
});

export { router };













































