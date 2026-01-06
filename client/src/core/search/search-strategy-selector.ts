/**
 * Search Strategy Selector
 *
 * Implements decision matrix logic for selecting the optimal search strategy
 * Requirements: 2.1, 2.2, 2.3
 */

import type {
  SearchStrategy,
  SearchDecisionMatrix,
  SearchStrategyDecision,
  SearchStrategyConfig,
} from './types';

export class SearchStrategySelector {
  private config: SearchStrategyConfig;

  constructor(config: SearchStrategyConfig) {
    this.config = config;
  }

  /**
   * Select the optimal search strategy based on query characteristics
   */
  selectStrategy(matrix: SearchDecisionMatrix): SearchStrategyDecision {
    const decisions: Array<{
      strategy: SearchStrategy;
      score: number;
      reason: string;
    }> = [];

    // Evaluate intelligent search
    decisions.push(this.evaluateIntelligentSearch(matrix));

    // Evaluate streaming search
    decisions.push(this.evaluateStreamingSearch(matrix));

    // Evaluate API search
    decisions.push(this.evaluateApiSearch(matrix));

    // Sort by score (highest first)
    decisions.sort((a, b) => b.score - a.score);

    const primary = decisions[0];
    const fallback = decisions[1];

    return {
      strategy: primary.strategy,
      reason: primary.reason,
      confidence: primary.score,
      fallback: fallback.strategy !== primary.strategy ? fallback.strategy : undefined,
    };
  }

  /**
   * Evaluate intelligent search strategy
   */
  private evaluateIntelligentSearch(matrix: SearchDecisionMatrix): {
    strategy: SearchStrategy;
    score: number;
    reason: string;
  } {
    let score = 0.5; // Base score
    const reasons: string[] = [];

    // Query complexity bonus
    if (matrix.query.length >= this.config.thresholds.queryLengthForIntelligent) {
      score += 0.3;
      reasons.push('complex query benefits from intelligent processing');
    }

    // Fuzzy search needs
    if (this.hasTypos(matrix.query) || this.hasPartialWords(matrix.query)) {
      score += 0.4;
      reasons.push('query may contain typos or partial matches');
    }

    // Network condition consideration
    if (matrix.networkCondition === 'fast') {
      score += 0.2;
      reasons.push('fast network supports intelligent processing');
    } else if (matrix.networkCondition === 'slow') {
      score -= 0.2;
      reasons.push('slow network may impact intelligent processing');
    }

    // Device type consideration
    if (matrix.deviceType === 'desktop') {
      score += 0.1;
      reasons.push('desktop device can handle complex processing');
    }

    // User preference
    if (matrix.userPreference === 'intelligent') {
      score += 0.3;
      reasons.push('user preference for intelligent search');
    }

    // Expected result count
    if (matrix.expectedResultCount && matrix.expectedResultCount < 100) {
      score += 0.2;
      reasons.push('small result set suitable for intelligent processing');
    }

    return {
      strategy: 'intelligent',
      score: Math.min(1, Math.max(0, score)),
      reason: reasons.join(', ') || 'default intelligent search',
    };
  }

  /**
   * Evaluate streaming search strategy
   */
  private evaluateStreamingSearch(matrix: SearchDecisionMatrix): {
    strategy: SearchStrategy;
    score: number;
    reason: string;
  } {
    let score = 0.3; // Lower base score
    const reasons: string[] = [];

    // Large result set bonus
    if (
      matrix.expectedResultCount &&
      matrix.expectedResultCount >= this.config.thresholds.resultCountForStreaming
    ) {
      score += 0.5;
      reasons.push('large result set benefits from streaming');
    }

    // Simple query penalty (streaming is overkill for simple queries)
    if (matrix.query.length < 5) {
      score -= 0.2;
      reasons.push('simple query may not need streaming');
    }

    // Network condition consideration
    if (matrix.networkCondition === 'fast') {
      score += 0.3;
      reasons.push('fast network supports streaming');
    } else if (matrix.networkCondition === 'slow') {
      score -= 0.3;
      reasons.push('slow network not ideal for streaming');
    }

    // Mobile device consideration
    if (matrix.deviceType === 'mobile') {
      score += 0.2;
      reasons.push('mobile benefits from progressive loading');
    }

    // User preference
    if (matrix.userPreference === 'streaming') {
      score += 0.3;
      reasons.push('user preference for streaming search');
    }

    return {
      strategy: 'streaming',
      score: Math.min(1, Math.max(0, score)),
      reason: reasons.join(', ') || 'streaming for large datasets',
    };
  }

  /**
   * Evaluate API search strategy
   */
  private evaluateApiSearch(matrix: SearchDecisionMatrix): {
    strategy: SearchStrategy;
    score: number;
    reason: string;
  } {
    let score = 0.4; // Moderate base score
    const reasons: string[] = [];

    // Simple query bonus
    if (matrix.query.length < this.config.thresholds.queryLengthForIntelligent) {
      score += 0.3;
      reasons.push('simple query suitable for direct API');
    }

    // Offline/poor network bonus
    if (matrix.networkCondition === 'offline' || matrix.networkCondition === 'slow') {
      score += 0.4;
      reasons.push('poor network conditions favor simple API calls');
    }

    // Small result set bonus
    if (matrix.expectedResultCount && matrix.expectedResultCount < 50) {
      score += 0.2;
      reasons.push('small result set suitable for direct API');
    }

    // Exact match queries
    if (this.isExactMatchQuery(matrix.query)) {
      score += 0.3;
      reasons.push('exact match query works well with API search');
    }

    // User preference
    if (matrix.userPreference === 'api') {
      score += 0.3;
      reasons.push('user preference for API search');
    }

    // Fallback scenario
    if (reasons.length === 0) {
      reasons.push('reliable fallback option');
    }

    return {
      strategy: 'api',
      score: Math.min(1, Math.max(0, score)),
      reason: reasons.join(', '),
    };
  }

  /**
   * Check if query likely contains typos
   */
  private hasTypos(query: string): boolean {
    // Simple heuristics for typo detection
    const words = query.toLowerCase().split(/\s+/);

    // Check for common typo patterns
    return words.some(word => {
      // Repeated characters (e.g., "helllo")
      if (/(.)\1{2,}/.test(word)) return true;

      // Common letter swaps
      if (word.includes('teh') || word.includes('adn') || word.includes('hte')) return true;

      // Very short words with numbers (likely typos)
      if (word.length <= 3 && /\d/.test(word)) return true;

      return false;
    });
  }

  /**
   * Check if query contains partial words
   */
  private hasPartialWords(query: string): boolean {
    const words = query.toLowerCase().split(/\s+/);

    return words.some(word => {
      // Words ending with common prefixes
      if (word.endsWith('*') || word.endsWith('...')) return true;

      // Very short words that might be partial
      if (word.length <= 2 && word.length > 0) return true;

      // Words with wildcards
      if (word.includes('*') || word.includes('?')) return true;

      return false;
    });
  }

  /**
   * Check if query is an exact match query
   */
  private isExactMatchQuery(query: string): boolean {
    // Quoted strings
    if (query.startsWith('"') && query.endsWith('"')) return true;

    // ID-like patterns
    if (/^[A-Z0-9-]+$/.test(query.trim())) return true;

    // Numbers only
    if (/^\d+$/.test(query.trim())) return true;

    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SearchStrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SearchStrategyConfig {
    return { ...this.config };
  }
}

/**
 * Default configuration for search strategy selection
 */
export const DEFAULT_SEARCH_STRATEGY_CONFIG: SearchStrategyConfig = {
  strategy: 'intelligent',
  fallbackStrategy: 'api',
  thresholds: {
    resultCountForStreaming: 1000,
    queryLengthForIntelligent: 3,
    timeoutMs: 5000,
  },
  options: {
    enableFuzzySearch: true,
    enableCaching: true,
    enableAnalytics: true,
    maxResults: 100,
  },
};

/**
 * Create a search strategy selector with default or custom config
 */
export const createSearchStrategySelector = (
  config?: Partial<SearchStrategyConfig>
): SearchStrategySelector => {
  const finalConfig = { ...DEFAULT_SEARCH_STRATEGY_CONFIG, ...config };
  return new SearchStrategySelector(finalConfig);
};
