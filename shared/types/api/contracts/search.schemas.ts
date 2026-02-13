/**
 * Search API Validation Schemas
 * Zod schemas for runtime validation of search endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

const SearchFiltersSchema = z.object({
  type: z.array(z.enum(['bill', 'user', 'comment', 'document'])).optional(),
  status: z.array(z.string()).optional(),
  chamber: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  filters: SearchFiltersSchema.optional(),
  sortBy: z.enum(['relevance', 'date', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const SearchBillsRequestSchema = z.object({
  query: z.string().min(1).max(500),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  status: z.array(z.string()).optional(),
  chamber: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'date', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const SearchUsersRequestSchema = z.object({
  query: z.string().min(1).max(500),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  role: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'username']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const GetSearchSuggestionsRequestSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().positive().max(20).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['bill', 'user', 'comment', 'document']),
  title: z.string(),
  snippet: z.string(),
  relevanceScore: z.number().min(0).max(1),
  data: z.unknown(),
  highlights: z.array(z.string()).optional(),
});

const SearchFacetsSchema = z.object({
  types: z.record(z.number().int().nonnegative()),
  statuses: z.record(z.number().int().nonnegative()),
  chambers: z.record(z.number().int().nonnegative()),
  tags: z.record(z.number().int().nonnegative()),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  facets: SearchFacetsSchema,
  query: z.string(),
  processingTime: z.number().nonnegative(),
});

export const SearchBillsResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  query: z.string(),
  processingTime: z.number().nonnegative(),
});

export const SearchUsersResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  query: z.string(),
  processingTime: z.number().nonnegative(),
});

export const GetSearchSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string(),
    type: z.enum(['bill', 'user', 'tag']),
    count: z.number().int().nonnegative(),
  })),
  query: z.string(),
});
