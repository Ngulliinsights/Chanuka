import { Router } from 'express';
import { billsService } from '../bills/bills.js';
import { ApiSuccess, ApiError, ApiValidationError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/search
 * Search across bills, sponsors, and other content
 */
router.get('/', async (req, res) => {
  try {
    const queryParam = req.query.q;
    const query = Array.isArray(queryParam) ? queryParam[0] : queryParam as string | undefined;
    const typeParam = req.query.type;
    const type = Array.isArray(typeParam) ? typeParam[0] : typeParam as string | undefined || 'all';
    const limitParam = req.query.limit;
    const limit = Array.isArray(limitParam) ? limitParam[0] : limitParam as string | undefined;
    const offsetParam = req.query.offset;
    const offset = Array.isArray(offsetParam) ? offsetParam[0] : offsetParam as string | undefined;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return ApiValidationError(res, 'Search query is required');
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit as string || '20') || 20, 100); // Max 100 results
    const searchOffset = Math.max(parseInt(offset as string || '0') || 0, 0);

    const results = {
      query: searchQuery,
      type,
      results: [] as any[],
      total: 0,
      limit: searchLimit,
      offset: searchOffset
    };

    // Search bills by title, description, and content
    if (type === 'all' || type === 'bills') {
      try {
        const allBills = await billsService.getBills();
        const matchingBills = allBills.filter(bill => {
          const searchText = `${bill.title} ${bill.description || ''} ${bill.content || ''}`.toLowerCase();
          return searchText.includes(searchQuery.toLowerCase());
        });

        results.results.push(...matchingBills.slice(searchOffset, searchOffset + searchLimit).map(bill => ({
          type: 'bill',
          id: bill.id,
          title: bill.title,
          description: bill.description,
          status: bill.status,
          category: bill.category,
          createdAt: bill.createdAt,
          relevanceScore: calculateRelevanceScore(searchQuery, bill.title, bill.description)
        })));
      } catch (error) {
        logger.error('Error searching bills:', { component: 'SimpleTool' }, error);
      }
    }

    // Sort results by relevance score
    results.results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    results.total = results.results.length;

    // Apply pagination
    results.results = results.results.slice(searchOffset, searchOffset + searchLimit);

    return ApiSuccess(res, results);
  } catch (error) {
    logger.error('Search error:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Search failed', 500);
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
router.get('/suggestions', async (req, res) => {
  try {
    const queryParam = req.query.q;
    const query = Array.isArray(queryParam) ? queryParam[0] : queryParam as string | undefined;
    const limitParam = req.query.limit;
    const limit = Array.isArray(limitParam) ? limitParam[0] : limitParam as string | undefined;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return ApiSuccess(res, { suggestions: [] });
    }

    const searchQuery = query.trim().toLowerCase();
    const suggestionLimit = Math.min(parseInt(limit as string || '5') || 5, 10);

    const suggestions: string[] = [];

    try {
      // Get suggestions from bill titles
      const allBills = await billsService.getBills();
      const titleSuggestions = allBills
        .filter(bill => bill.title.toLowerCase().includes(searchQuery))
        .map(bill => bill.title)
        .slice(0, suggestionLimit);

      suggestions.push(...titleSuggestions);

      // Add category suggestions
      const categories = [...new Set(allBills.map(bill => bill.category).filter(Boolean))] as string[];
      const categorySuggestions = categories
        .filter(category => category.toLowerCase().includes(searchQuery))
        .slice(0, Math.max(0, suggestionLimit - suggestions.length));

      suggestions.push(...categorySuggestions);
    } catch (error) {
      logger.error('Error generating suggestions:', { component: 'SimpleTool' }, error);
    }

    return ApiSuccess(res, {
      query: searchQuery,
      suggestions: suggestions.slice(0, suggestionLimit)
    });
  } catch (error) {
    logger.error('Suggestions error:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to generate suggestions', 500);
  }
});

/**
 * GET /api/search/filters
 * Get available search filters
 */
router.get('/filters', async (req, res) => {
  try {
    const filters = {
      types: [
        { value: 'all', label: 'All Content' },
        { value: 'bills', label: 'Bills' },
        { value: 'sponsors', label: 'Sponsors' },
        { value: 'comments', label: 'Comments' }
      ],
      categories: [] as { value: string; label: string }[],
      statuses: [
        { value: 'introduced', label: 'Introduced' },
        { value: 'committee', label: 'In Committee' },
        { value: 'passed', label: 'Passed' },
        { value: 'failed', label: 'Failed' },
        { value: 'signed', label: 'Signed into Law' }
      ]
    };

    try {
      // Get available categories from bills
      const allBills = await billsService.getBills();
      const categories = [...new Set(allBills.map(bill => bill.category).filter(Boolean))];
      filters.categories = categories.map(category => ({
        value: category!,
        label: category!.charAt(0).toUpperCase() + category!.slice(1)
      }));
    } catch (error) {
      logger.error('Error fetching filter options:', { component: 'SimpleTool' }, error);
    }

    return ApiSuccess(res, filters);
  } catch (error) {
    logger.error('Filters error:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch search filters', 500);
  }
});

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(query: string, title: string, description?: string | null): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const descriptionLower = (description || '').toLowerCase();

  let score = 0;

  // Exact title match gets highest score
  if (titleLower === queryLower) {
    score += 100;
  } else if (titleLower.includes(queryLower)) {
    // Title contains query
    score += 50;
    // Bonus for query at start of title
    if (titleLower.startsWith(queryLower)) {
      score += 25;
    }
  }

  // Description match gets lower score
  if (descriptionLower.includes(queryLower)) {
    score += 20;
  }

  // Bonus for shorter titles (more specific)
  if (title.length < 50) {
    score += 10;
  }

  return score;
}

export { router };








