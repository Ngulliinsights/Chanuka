import { Router } from 'express';
import { searchService } from '../services/search.js';
import { z } from 'zod';

export const router = Router();

const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  sponsor: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'date', 'title', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

// Advanced search endpoint
router.get('/', async (req, res) => {
  try {
    const parsed = searchSchema.parse(req.query);
    
    const filters = {
      ...parsed,
      dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : undefined,
      dateTo: parsed.dateTo ? new Date(parsed.dateTo) : undefined
    };

    const page = parseInt(parsed.page || '1');
    const limit = parseInt(parsed.limit || '20');

    const results = await searchService.searchBills(filters, page, limit);

    res.json({
      ...results,
      pagination: {
        page,
        limit,
        total: results.total,
        pages: Math.ceil(results.total / limit)
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
    }
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search suggestions endpoint
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await searchService.getSearchSuggestions(query);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Sponsor search endpoint
router.get('/sponsors', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.json({ sponsors: [] });
    }

    const sponsors = await searchService.searchSponsors(query);
    res.json({ sponsors });
  } catch (error) {
    console.error('Sponsor search error:', error);
    res.status(500).json({ error: 'Sponsor search failed' });
  }
});