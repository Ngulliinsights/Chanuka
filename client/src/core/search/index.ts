/**
 * Unified Search Module
 *
 * Exports for unified search interface and strategy selection
 */

export type {
  SearchStrategy,
  SearchStrategyConfig,
  UnifiedSearchQuery,
  UnifiedSearchResult,
  SearchProgress,
  UnifiedSearchInterfaceProps,
  SearchDecisionMatrix,
  SearchStrategyDecision,
} from './types';

export {
  SearchStrategySelector,
  DEFAULT_SEARCH_STRATEGY_CONFIG,
  createSearchStrategySelector,
} from './search-strategy-selector';

export { UnifiedSearchInterface as default } from './UnifiedSearchInterface';
