import { SearchContext, SearchSuggestion } from "../types/search.types";

export interface RankingWeights {
  exactMatch: number;
  prefixMatch: number;
  containsMatch: number;
  frequency: number;
  recency: number;
  contextMatch: number;
  popularity: number;
}

export interface RankingContext {
  query: string;
  searchContext: SearchContext;
  userHistory?: string[];
  popularTerms?: Map<string, number>;
}

/**
 * Service responsible for ranking and scoring search suggestions using multiple algorithms
 */
export class SuggestionRankingService {
  private readonly defaultWeights: RankingWeights = {
    exactMatch: 10.0,
    prefixMatch: 5.0,
    containsMatch: 2.0,
    frequency: 1.0,
    recency: 1.5,
    contextMatch: 3.0,
    popularity: 0.8
  };

  /**
   * Rank suggestions using composite scoring algorithm
   */
  rankSuggestions(
    suggestions: SearchSuggestion[],
    context: RankingContext,
    weights: Partial<RankingWeights> = {}
  ): SearchSuggestion[] {
    const finalWeights = { ...this.defaultWeights, ...weights };

    const scoredSuggestions = suggestions.map(suggestion => ({
      ...suggestion,
      score: this.calculateCompositeScore(suggestion, context, finalWeights)
    }));

    return scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...suggestion }) => suggestion); // Remove score from final result
  }

  /**
   * Calculate relevance score for a single suggestion
   */
  calculateRelevanceScore(
    suggestion: SearchSuggestion,
    query: string,
    weights: Partial<RankingWeights> = {}
  ): number {
    const finalWeights = { ...this.defaultWeights, ...weights };
    const term = suggestion.term.toLowerCase();
    const queryLower = query.toLowerCase();

    let score = 0;

    // Text matching scores
    if (term === queryLower) {
      score += finalWeights.exactMatch;
    } else if (term.startsWith(queryLower)) {
      score += finalWeights.prefixMatch;
    } else if (term.includes(queryLower)) {
      score += finalWeights.containsMatch;
    }

    // Frequency score (normalized)
    const normalizedFrequency = Math.log(suggestion.frequency + 1);
    score += normalizedFrequency * finalWeights.frequency;

    return score;
  }

  /**
   * Apply contextual boosting to suggestions
   */
  applyContextualBoosting(
    suggestions: SearchSuggestion[],
    context: SearchContext,
    boostFactor: number = 1.5
  ): SearchSuggestion[] {
    return suggestions.map(suggestion => {
      let boostedFrequency = suggestion.frequency;

      // Category context boost
      if (context.category && suggestion.metadata?.category === context.category) {
        boostedFrequency *= boostFactor;
      }

      // Sponsor context boost
      if (context.sponsor_id && suggestion.metadata?.sponsor_id === context.sponsor_id) {
        boostedFrequency *= boostFactor;
      }

      // Recent searches boost
      if (context.recentSearches?.includes(suggestion.term)) {
        boostedFrequency *= (boostFactor * 0.8); // Slightly less boost for recency
      }

      return {
        ...suggestion,
        frequency: boostedFrequency
      };
    });
  }

  /**
   * Diversify suggestions to avoid over-representation of single types
   */
  diversifySuggestions(
    suggestions: SearchSuggestion[],
    maxPerType: number = 3
  ): SearchSuggestion[] {
    const typeGroups = new Map<string, SearchSuggestion[]>();

    // Group suggestions by type
    suggestions.forEach(suggestion => {
      const type = suggestion.type;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(suggestion);
    });

    // Take top suggestions from each type
    const diversified: SearchSuggestion[] = [];
    const typeOrder = ['bill_title', 'sponsor', 'category', 'tag', 'popular', 'recent'];

    typeOrder.forEach(type => {
      const group = typeGroups.get(type);
      if (group) {
        diversified.push(...group.slice(0, maxPerType));
      }
    });

    // Add remaining suggestions if we haven't reached the limit
    const usedTerms = new Set(diversified.map(s => s.term));
    suggestions.forEach(suggestion => {
      if (!usedTerms.has(suggestion.term)) {
        diversified.push(suggestion);
      }
    });

    return diversified;
  }

  /**
   * Apply machine learning-inspired ranking using feature vectors
   */
  applyMLRanking(
    suggestions: SearchSuggestion[],
    context: RankingContext
  ): SearchSuggestion[] {
    const features = suggestions.map(suggestion =>
      this.extractFeatureVector(suggestion, context)
    );

    const scores = features.map(feature => this.calculateMLScore(feature));

    return suggestions
      .map((suggestion, index) => ({
        ...suggestion,
        mlScore: scores[index]
      }))
      .sort((a, b) => (b.mlScore ?? 0) - (a.mlScore ?? 0))
      .map(({ mlScore, ...suggestion }) => suggestion);
  }

  /**
   * Calculate composite score using multiple ranking factors
   */
  private calculateCompositeScore(
    suggestion: SearchSuggestion,
    context: RankingContext,
    weights: RankingWeights
  ): number {
    const query = context.query.toLowerCase();
    const term = suggestion.term.toLowerCase();

    let score = 0;

    // Text matching component
    score += this.calculateTextMatchScore(term, query, weights);

    // Frequency component (with logarithmic scaling)
    score += Math.log(suggestion.frequency + 1) * weights.frequency;

    // Context matching component
    score += this.calculateContextScore(suggestion, context.searchContext, weights);

    // Popularity component
    if (context.popularTerms?.has(suggestion.term)) {
      const popularityScore = context.popularTerms.get(suggestion.term)! || 0;
      score += Math.log(popularityScore + 1) * weights.popularity;
    }

    // User history component
    if (context.userHistory?.includes(suggestion.term)) {
      score += weights.recency;
    }

    // Type-specific boosting
    score += this.calculateTypeBoost(suggestion.type);

    return score;
  }

  /**
   * Calculate text matching score
   */
  private calculateTextMatchScore(
    term: string,
    query: string,
    weights: RankingWeights
  ): number {
    if (term === query) {
      return weights.exactMatch;
    }

    if (term.startsWith(query)) {
      return weights.prefixMatch;
    }

    if (term.includes(query)) {
      // Calculate partial match score based on position
      const position = term.indexOf(query);
      const positionFactor = 1 - (position / term.length);
      return weights.containsMatch * positionFactor;
    }

    // Fuzzy matching for typos
    const similarity = this.calculateStringSimilarity(term, query);
    if (similarity > 0.7) {
      return weights.containsMatch * similarity * 0.5;
    }

    return 0;
  }

  /**
   * Calculate context-based score
   */
  private calculateContextScore(
    suggestion: SearchSuggestion,
    context: SearchContext,
    weights: RankingWeights
  ): number {
    let contextScore = 0;

    if (context.category && suggestion.metadata?.category === context.category) {
      contextScore += weights.contextMatch;
    }

    if (context.sponsor_id && suggestion.metadata?.sponsor_id === context.sponsor_id) {
      contextScore += weights.contextMatch;
    }

    return contextScore;
  }

  /**
   * Calculate type-specific boost
   */
  private calculateTypeBoost(type: SearchSuggestion['type']): number {
    const typeBoosts: Record<string, number> = {
      'bill_title': 2.0,
      'sponsor': 1.5,
      'category': 1.2,
      'tag': 1.0,
      'popular': 0.8,
      'recent': 1.3
    };

    return typeBoosts[type] || 1.0;
  }

  /**
   * Extract feature vector for ML-style ranking
   */
  private extractFeatureVector(
    suggestion: SearchSuggestion,
    context: RankingContext
  ): number[] {
    const query = context.query.toLowerCase();
    const term = suggestion.term.toLowerCase();

    return [
      // Text features
      term === query ? 1 : 0, // Exact match
      term.startsWith(query) ? 1 : 0, // Prefix match
      term.includes(query) ? 1 : 0, // Contains match
      this.calculateStringSimilarity(term, query), // Similarity score

      // Frequency features
      Math.log(suggestion.frequency + 1), // Log frequency
      suggestion.frequency / 100, // Normalized frequency

      // Type features
      suggestion.type === 'bill_title' ? 1 : 0,
      suggestion.type === 'sponsor' ? 1 : 0,
      suggestion.type === 'category' ? 1 : 0,

      // Context features
      context.searchContext.category === suggestion.metadata?.category ? 1 : 0,
      context.searchContext.sponsor_id === suggestion.metadata?.sponsor_id ? 1 : 0,

      // Length features
      term.length,
      query.length,
      Math.abs(term.length - query.length)
    ];
  }

  /**
   * Calculate ML-style score from feature vector
   */
  private calculateMLScore(features: number[]): number {
    // Simple linear model weights (in practice, these would be learned)
    const weights = [
      10.0, // Exact match
      5.0,  // Prefix match
      2.0,  // Contains match
      3.0,  // Similarity
      1.0,  // Log frequency
      2.0,  // Normalized frequency
      2.0,  // Bill title type
      1.5,  // Sponsor type
      1.2,  // Category type
      3.0,  // Category context
      3.0,  // Sponsor context
      -0.1, // Term length (shorter is better)
      0.0,  // Query length (neutral)
      -0.2  // Length difference (smaller is better)
    ];

    return features.reduce((score, feature, index) => {
      return score + (feature * (weights[index] || 0));
    }, 0);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const rows = str2.length + 1;
    const cols = str1.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () =>
      new Array<number>(cols).fill(0)
    );

    for (let i = 0; i <= str1.length; i++) {
      const row = matrix[0];
      if (row) row[i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      const row = matrix[j];
      if (row) row[0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const currentRow = matrix[j];
        const prevRow = matrix[j - 1];
        if (currentRow && prevRow) {
          currentRow[i] = Math.min(
            (currentRow[i - 1] ?? 0) + 1,         // deletion
            (prevRow[i] ?? 0) + 1,                // insertion
            (prevRow[i - 1] ?? 0) + indicator     // substitution
          );
        }
      }
    }

    const lastRow = matrix[str2.length];
    const distance = lastRow?.[str1.length] ?? 0;
    const maxLength = Math.max(str1.length, str2.length);

    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }
}

export const suggestionRankingService = new SuggestionRankingService();