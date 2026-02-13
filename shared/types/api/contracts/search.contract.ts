/**
 * Search API Contracts
 * Type-safe API contracts for search-related endpoints
 */

import { Bill } from '../../domains/legislative';
import { User } from '../../domains/authentication';

// ============================================================================
// Domain Types
// ============================================================================

export interface SearchResult<T = unknown> {
  id: string;
  type: 'bill' | 'user' | 'comment' | 'document';
  title: string;
  snippet: string;
  relevanceScore: number;
  data: T;
  highlights?: string[];
}

export interface SearchFilters {
  type?: Array<'bill' | 'user' | 'comment' | 'document'>;
  status?: string[];
  chamber?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface SearchFacets {
  types: Record<string, number>;
  statuses: Record<string, number>;
  chambers: Record<string, number>;
  tags: Record<string, number>;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Search Request (query params)
 */
export interface SearchRequest {
  query: string;
  page?: number;
  limit?: number;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search Bills Request (query params)
 */
export interface SearchBillsRequest {
  query: string;
  page?: number;
  limit?: number;
  status?: string[];
  chamber?: string[];
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search Users Request (query params)
 */
export interface SearchUsersRequest {
  query: string;
  page?: number;
  limit?: number;
  role?: string[];
  sortBy?: 'relevance' | 'username';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get Search Suggestions Request (query params)
 */
export interface GetSearchSuggestionsRequest {
  query: string;
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Search Response
 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets: SearchFacets;
  query: string;
  processingTime: number;
}

/**
 * Search Bills Response
 */
export interface SearchBillsResponse {
  results: SearchResult<Bill>[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query: string;
  processingTime: number;
}

/**
 * Search Users Response
 */
export interface SearchUsersResponse {
  results: SearchResult<User>[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query: string;
  processingTime: number;
}

/**
 * Get Search Suggestions Response
 */
export interface GetSearchSuggestionsResponse {
  suggestions: Array<{
    text: string;
    type: 'bill' | 'user' | 'tag';
    count: number;
  }>;
  query: string;
}
