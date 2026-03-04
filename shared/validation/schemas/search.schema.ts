/**
 * Search Feature - Shared Validation Schemas
 * 
 * Zod schemas for validating search-related inputs.
 * Shared between client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const IdSchema = z.number().int().positive();
const SearchQuerySchema = z.string().min(1).max(500);
const PageSchema = z.number().int().positive().default(1);
const LimitSchema = z.number().int().positive().max(100).default(20);

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
  query: SearchQuerySchema,
  type: SearchTypeSchema.default('all'),
  filters: SearchFilterSchema.optional(),
  sort: SearchSortSchema.default('relevance'),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const BillSearchSchema = z.object({
  query: SearchQuerySchema,
  category: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  sponsor_id: IdSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: SearchSortSchema.default('relevance'),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const UserSearchSchema = z.object({
  query: SearchQuerySchema,
  role: z.string().max(50).optional(),
  verification_status: z.string().max(50).optional(),
  expertise: z.array(z.string().max(100)).max(20).optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const CommentSearchSchema = z.object({
  query: SearchQuerySchema,
  bill_id: IdSchema.optional(),
  user_id: IdSchema.optional(),
  highlighted: z.boolean().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: SearchSortSchema.default('relevance'),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
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
  query: SearchQuerySchema,
  type: SearchTypeSchema,
  filters: SearchFilterSchema.optional(),
  result_count: z.number().int().nonnegative(),
});

export const GetSearchHistorySchema = z.object({
  user_id: IdSchema,
  limit: LimitSchema.optional(),
});

export const GetPopularSearchesSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week'),
  type: SearchTypeSchema.optional(),
  limit: LimitSchema.optional(),
});

// ============================================================================
// Advanced Search Schemas
// ============================================================================

export const AdvancedSearchSchema = z.object({
  query: SearchQuerySchema,
  must_include: z.array(z.string().max(100)).max(10).optional(),
  must_exclude: z.array(z.string().max(100)).max(10).optional(),
  exact_phrase: z.string().max(200).optional(),
  type: SearchTypeSchema.default('all'),
  filters: SearchFilterSchema.optional(),
  sort: SearchSortSchema.default('relevance'),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const FacetedSearchSchema = z.object({
  query: SearchQuerySchema,
  facets: z.array(z.enum(['category', 'status', 'date', 'tags', 'author'])).min(1).max(5),
  type: SearchTypeSchema.default('all'),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SearchType = z.infer<typeof SearchTypeSchema>;
export type SearchSort = z.infer<typeof SearchSortSchema>;
export type SearchFilter = z.infer<typeof SearchFilterSchema>;
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
