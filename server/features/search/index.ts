/**
 * Search domain public API – Unified intelligent search system
 * Phase 3: Advanced Features with streaming, analytics, and AI-powered enhancements
 * Every original function signature is preserved for backward compatibility.
 */

// Core search functionality
export {
  searchBills,
  getSearchSuggestions,
  getPopularSearchTerms,
  rebuildSearchIndexes,
  getSearchIndexHealth,
  warmupSearchCache,
  getSearchMetrics,
  // Phase 3: Streaming and analytics
  streamSearchBills,
  cancelSearch,
  getSearchAnalytics,
} from './application/SearchService';

// Phase 2: Intelligent search with semantic capabilities
export { dualEngineOrchestrator } from './engines/dual-engine-orchestrator';
export { semanticSearchEngine } from './engines/semantic-search.engine';
export { embeddingService } from './services/embedding.service';
export { searchSyntaxParser } from './utils/search-syntax-parser';

// Phase 3: Advanced features
export { queryIntentService } from './domain/QueryIntentService';
export { typoCorrectionService } from './domain/TypoCorrectionService';
export { suggestionEngineService } from './engines/suggestion/suggestion-engine.service';

// Engine interfaces
export type {
  SearchQuery,
  SearchResponseDto,
  SearchFilters,
  SearchPagination,
  SearchOptions,
  PlainBill,
} from './domain/search.dto';

// Phase 2 types
export type {
  ParsedQuery,
} from './utils/search-syntax-parser';

export type {
  EngineResult,
  FusionResult,
  OrchestratorConfig,
} from './engines/dual-engine-orchestrator';

// Phase 3 types
export type {
  QueryIntent,
  IntentClassification,
  SearchStrategy,
} from './domain/QueryIntentService';

export type {
  CorrectionResult,
  SynonymResult,
} from './domain/TypoCorrectionService';








































