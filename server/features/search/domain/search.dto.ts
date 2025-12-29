import type { Bill } from '@shared/schema';

/* ----------  Search Query  ---------- */
export interface SearchFilters {
  query?: string;
  category?: string[];
  status?: string[];
  sponsor_id?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  complexityMin?: number;
  complexityMax?: number;
  tags?: string[];
}

export interface SearchPagination {
  page: number;
  limit: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'engagement';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  includeSnippets?: boolean;
  includeHighlights?: boolean;
  minRelevanceScore?: number;
  searchType?: 'simple' | 'phrase' | 'boolean';
}

export interface SearchQuery {
  text: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  options?: SearchOptions;
}

/* ----------  Plain Entity  ---------- */
export interface PlainBill extends Bill {
  // ensures we never leak Drizzle proxies outside repository
}

/* ----------  Response  ---------- */
export interface SearchResultDto {
  bill: PlainBill;
  relevanceScore: number;
  snippet?: string;
  highlights?: string[];
  matchedFields: string[];
}

export interface SearchResponseDto {
  results: SearchResultDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  facets: {
    status: Array<{ value: string; count: number }>;
    category: Array<{ value: string; count: number }>;
    sponsors: Array<{ value: number; count: number }>;
    complexity: Array<{ range: string; count: number; min: number; max: number }>;
    dateRanges: Array<{ range: string; count: number; from: Date; to: Date }>;
  };
  suggestions?: string[];
  metadata: {
    searchTime: number;
    source: 'cache' | 'db' | 'fallback';
    queryType: string;
  };
}








































