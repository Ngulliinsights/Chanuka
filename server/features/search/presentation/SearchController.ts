import { Router } from 'express';
import {
  searchBills,
  getSearchSuggestions,
  getPopularSearchTerms,
  rebuildSearchIndexes,
  getSearchIndexHealth,
} from '../application/SearchService';
import { ApiSuccess, ApiError, ApiValidationError } from '../../../utils/api-response';
import { logger } from '../../../utils/logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const query: Parameters<typeof searchBills>[0] = {
      text: (req.query.q as string) ?? '',
      filters: {
        category: req.query.category ? String(req.query.category).split(',') : undefined,
        status: req.query.status ? String(req.query.status).split(',') : undefined,
        sponsorId: req.query.sponsorId ? String(req.query.sponsorId).split(',').map(Number) : undefined,
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
    if (!query.text.trim()) return ApiValidationError(res, 'Query parameter "q" is required');
    const dto = await searchBills(query);
    return ApiSuccess(res, dto);
  } catch (e) {
    logger.error('Search controller error', { error: e });
    return ApiError(res, (e as Error).message, 500);
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

export { router };