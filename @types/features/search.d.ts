/**
 * Features search type declarations
 */

export interface SearchQuery {
  term: string;
  filters?: Record<string, any>;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'bill' | 'discussion' | 'expert' | 'document';
  relevance: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets?: Record<string, any>;
  suggestions?: string[];
}
