/**
 * Search Feature - Validation Schemas
 * 
 * Zod schemas for validating search-related inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Search Type and Filter Enums
// ============================================================================

export const SearchTypeSchema = z.enum([
  'bills',
  'users',
  'comments',
  'discussions',
  'all'
]);

export const SearchSortSchema = z.enum([
  'relevance',
  'date',
  'popularity',
  'engagement'
]);

export const SearchFilterSchema = z.object({
  type: SearchTypeSchema.optional(),
  category: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ============================================================================
// Search Query Schemas
// ============================================================================

export const GlobalSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  type: SearchTypeSchema.default('all'),
  filters: SearchFilterSchema.optional(),
  sort: SearchSortSchema.default('relevance'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const BillSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  category: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  sponsor_id: CommonSchemas.id.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: SearchSortSchema.default('relevance'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const UserSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  role: z.string().max(50).optional(),
  verification_status: z.string().max(50).optional(),
  expertise: z.array(z.string().max(100)).max(20).optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const CommentSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  highlighted: z.boolean().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: SearchSortSchema.default('relevance'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Autocomplete and Suggestions Schemas
// ============================================================================

export const AutocompleteSchema = z.object({
  query: z.string().min(1).max(100),
  type: SearchTypeSchema.default('all'),
  limit: z.number().int().positive().max(20).default(10),
});

export const SearchSuggestionsSchema = z.object({
  query: z.string().min(1).max(100),
  context: z.enum(['bills', 'users', 'topics', 'tags']).optional(),
  limit: z.number().int().positive().max(20).default(5),
});

// ============================================================================
// Search History and Analytics Schemas
// ============================================================================

export const SaveSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  type: SearchTypeSchema,
  filters: SearchFilterSchema.optional(),
  result_count: z.number().int().nonnegative(),
});

export const GetSearchHistorySchema = z.object({
  user_id: CommonSchemas.id,
  limit: CommonSchemas.limit.optional(),
});

export const GetPopularSearchesSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week'),
  type: SearchTypeSchema.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Advanced Search Schemas
// ============================================================================

export const AdvancedSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  must_include: z.array(z.string().max(100)).max(10).optional(),
  must_exclude: z.array(z.string().max(100)).max(10).optional(),
  exact_phrase: z.string().max(200).optional(),
  type: SearchTypeSchema.default('all'),
  filters: SearchFilterSchema.optional(),
  sort: SearchSortSchema.default('relevance'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const FacetedSearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  facets: z.array(z.enum(['category', 'status', 'date', 'tags', 'author'])).min(1).max(5),
  type: SearchTypeSchema.default('all'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GlobalSearchInput = z.infer<typeof GlobalSearchSchema>;
export type BillSearchInput = z.infer<typeof BillSearchSchema>;
export type UserSearchInput = z.infer<typeof UserSearchSchema>;
export type CommentSearchInput = z.infer<typeof CommentSearchSchema>;
export type AutocompleteInput = z.infer<typeof AutocompleteSchema>;
export type SearchSuggestionsInput = z.infer<typeof SearchSuggestionsSchema>;
export type SaveSearchInput = z.infer<typeof SaveSearchSchema>;
export type GetSearchHistoryInput = z.infer<typeof GetSearchHistorySchema>;
export type GetPopularSearchesInput = z.infer<typeof GetPopularSearchesSchema>;
export type AdvancedSearchInput = z.infer<typeof AdvancedSearchSchema>;
export type FacetedSearchInput = z.infer<typeof FacetedSearchSchema>;
export type SearchType = z.infer<typeof SearchTypeSchema>;
export type SearchSort = z.infer<typeof SearchSortSchema>;
export type SearchFilter = z.infer<typeof SearchFilterSchema>;
