/**
 * Unified Search Interface Types
 *
 * Types for the unified search interface wrapper
 */

import type { SearchResult, SearchMetadata } from '../../features/search/types';

export type SearchStrategy = 'intelligent' | 'streaming' | 'api';

export interface SearchStrategyConfig {
  strategy: SearchStrategy;
  fallbackStrategy?: SearchStrategy;
  thresholds: {
    resultCountForStreaming: number;
    queryLengthForIntelligent: number;
    timeoutMs: number;
  };
  options: {
    enableFuzzySearch: boolean;
    enableCaching: boolean;
    enableAnalytics: boolean;
    maxResults: number;
  };
}

export interface UnifiedSearchQuery {
  q: string;
  type?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  strategy?: SearchStrategy;
}

export interface UnifiedSearchResult {
  results: SearchResult[];
  metadata: SearchMetadata & {
    strategy: SearchStrategy;
    fallbackUsed: boolean;
    searchTime: number;
    totalResults: number;
  };
  suggestions?: string[];
  facets?: {
    categories: string[];
    sponsors: string[];
    tags: string[];
    statuses: string[];
  };
}

export interface SearchProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentStrategy: SearchStrategy;
  searchTime: number;
}

export interface UnifiedSearchInterfaceProps {
  variant?: 'header' | 'page' | 'embedded';
  placeholder?: string;
  autoFocus?: boolean;
  showFilters?: boolean;
  showSuggestions?: boolean;
  enableVoiceSearch?: boolean;
  className?: string;
  config?: Partial<SearchStrategyConfig>;
  onSearch?: (query: UnifiedSearchQuery) => void;
  onResults?: (results: UnifiedSearchResult) => void;
  onProgress?: (progress: SearchProgress) => void;
  onError?: (error: Error) => void;
}

export interface SearchDecisionMatrix {
  query: string;
  expectedResultCount?: number;
  userPreference?: SearchStrategy;
  networkCondition?: 'fast' | 'slow' | 'offline';
  deviceType?: 'mobile' | 'desktop';
}

export interface SearchStrategyDecision {
  strategy: SearchStrategy;
  reason: string;
  confidence: number;
  fallback?: SearchStrategy;
}
