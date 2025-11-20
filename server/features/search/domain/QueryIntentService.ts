// ============================================================================
// QUERY INTENT DETECTION SERVICE
// ============================================================================
// Classifies search queries by intent and adjusts search strategies accordingly
// Supports informational, navigational, transactional, and other query types

export enum QueryIntent {
  INFORMATIONAL = 'informational',     // "what is", "how to", "explain"
  NAVIGATIONAL = 'navigational',       // Looking for specific page/resource
  TRANSACTIONAL = 'transactional',     // "download", "apply for", "register"
  COMMERCIAL = 'commercial',          // Shopping/researching products
  LOCAL = 'local',                    // Location-based queries
  AMBIGUOUS = 'ambiguous'             // Unclear intent
}

export interface IntentClassification {
  intent: QueryIntent;
  confidence: number;
  features: {
    hasQuestionWords: boolean;
    hasNavigationalTerms: boolean;
    hasTransactionalVerbs: boolean;
    hasLocationTerms: boolean;
    queryLength: number;
    hasSpecificEntities: boolean;
    domain: string | null;
  };
  suggestedStrategy: SearchStrategy;
}

export interface SearchStrategy {
  engineWeights: {
    semantic: number;
    traditional: number;
    hybrid: number;
  };
  rankingBoosts: {
    recency: number;
    popularity: number;
    relevance: number;
    authority: number;
  };
  resultFilters: {
    contentType?: string[];
    dateRange?: { from: Date; to: Date };
    minRelevanceScore?: number;
  };
  maxResults: number;
}

export class QueryIntentService {
  private static instance: QueryIntentService;

  // Intent detection patterns
  private static readonly INTENT_PATTERNS = {
    [QueryIntent.INFORMATIONAL]: {
      questionWords: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'explain', 'describe', 'define'],
      patterns: ['what is', 'how to', 'how do', 'how can', 'why does', 'tell me about', 'explain', 'definition of'],
      weight: 1.0
    },
    [QueryIntent.NAVIGATIONAL]: {
      navigationalTerms: ['go to', 'visit', 'page', 'site', 'website', 'login', 'register', 'contact'],
      entityPatterns: ['ministry of', 'department of', 'office of', 'committee on'],
      weight: 0.9
    },
    [QueryIntent.TRANSACTIONAL]: {
      actionVerbs: ['download', 'apply', 'register', 'submit', 'file', 'request', 'get', 'obtain', 'access'],
      transactionalPhrases: ['application for', 'form for', 'how to apply', 'registration', 'permit', 'license'],
      weight: 0.8
    },
    [QueryIntent.COMMERCIAL]: {
      commercialTerms: ['buy', 'purchase', 'price', 'cost', 'shop', 'store', 'vendor', 'supplier'],
      weight: 0.7
    },
    [QueryIntent.LOCAL]: {
      locationTerms: ['near me', 'in my area', 'local', 'closest', 'nearby', 'county', 'constituency'],
      weight: 0.6
    }
  };

  // Domain-specific intent adjustments
  private static readonly DOMAIN_INTENTS: Record<string, QueryIntent> = {
    'healthcare': QueryIntent.INFORMATIONAL,
    'education': QueryIntent.INFORMATIONAL,
    'agriculture': QueryIntent.TRANSACTIONAL,
    'finance': QueryIntent.COMMERCIAL,
    'infrastructure': QueryIntent.NAVIGATIONAL,
    'government': QueryIntent.NAVIGATIONAL,
    'parliament': QueryIntent.NAVIGATIONAL,
    'policy': QueryIntent.INFORMATIONAL,
    'law': QueryIntent.INFORMATIONAL,
    'regulation': QueryIntent.INFORMATIONAL
  };

  static getInstance(): QueryIntentService {
    if (!QueryIntentService.instance) {
      QueryIntentService.instance = new QueryIntentService();
    }
    return QueryIntentService.getInstance();
  }

  /**
   * Classify the intent of a search query
   */
  async classifyIntent(query: string, context?: { userLocation?: string; previousQueries?: string[] }): Promise<IntentClassification> {
    const lowerQuery = query.toLowerCase().trim();
    const words = lowerQuery.split(/\s+/);

    // Extract features
    const features = this.extractFeatures(lowerQuery, words);

    // Calculate intent scores
    const intentScores = this.calculateIntentScores(lowerQuery, words, features);

    // Determine primary intent
    const primaryIntent = this.determinePrimaryIntent(intentScores);

    // Adjust based on domain context
    const domainAdjustedIntent = this.adjustForDomain(lowerQuery, primaryIntent);

    // Adjust based on user context
    const contextAdjustedIntent = this.adjustForUserContext(domainAdjustedIntent, context);

    // Generate search strategy
    const strategy = this.generateSearchStrategy(contextAdjustedIntent.intent);

    return {
      intent: contextAdjustedIntent.intent,
      confidence: contextAdjustedIntent.confidence,
      features,
      suggestedStrategy: strategy
    };
  }

  /**
   * Extract features from the query for intent classification
   */
  private extractFeatures(query: string, words: string[]): IntentClassification['features'] {
    const hasQuestionWords = QueryIntentService.INTENT_PATTERNS[QueryIntent.INFORMATIONAL].questionWords
      .some(word => words.includes(word));

    const hasNavigationalTerms = QueryIntentService.INTENT_PATTERNS[QueryIntent.NAVIGATIONAL].navigationalTerms
      .some(term => query.includes(term));

    const hasTransactionalVerbs = QueryIntentService.INTENT_PATTERNS[QueryIntent.TRANSACTIONAL].actionVerbs
      .some(verb => words.includes(verb));

    const hasLocationTerms = QueryIntentService.INTENT_PATTERNS[QueryIntent.LOCAL].locationTerms
      .some(term => query.includes(term));

    // Detect specific entities (bills, ministries, etc.)
    const hasSpecificEntities = this.detectSpecificEntities(query);

    // Determine domain
    const domain = this.detectDomain(query);

    return {
      hasQuestionWords,
      hasNavigationalTerms,
      hasTransactionalVerbs,
      hasLocationTerms,
      queryLength: words.length,
      hasSpecificEntities,
      domain
    };
  }

  /**
   * Calculate scores for each intent type
   */
  private calculateIntentScores(query: string, words: string[], features: IntentClassification['features']): Record<QueryIntent, number> {
    const scores: Record<QueryIntent, number> = {
      [QueryIntent.INFORMATIONAL]: 0,
      [QueryIntent.NAVIGATIONAL]: 0,
      [QueryIntent.TRANSACTIONAL]: 0,
      [QueryIntent.COMMERCIAL]: 0,
      [QueryIntent.LOCAL]: 0,
      [QueryIntent.AMBIGUOUS]: 0
    };

    // Base scoring from patterns
    for (const [intent, patterns] of Object.entries(QueryIntentService.INTENT_PATTERNS)) {
      const intentKey = intent as QueryIntent;
      let score = 0;

      // Check question words
      if (patterns.questionWords) {
        score += patterns.questionWords.filter(word => words.includes(word)).length * 0.3;
      }

      // Check navigational terms
      if (patterns.navigationalTerms) {
        score += patterns.navigationalTerms.filter(term => query.includes(term)).length * 0.4;
      }

      // Check action verbs
      if (patterns.actionVerbs) {
        score += patterns.actionVerbs.filter(verb => words.includes(verb)).length * 0.4;
      }

      // Check patterns
      if (patterns.patterns) {
        score += patterns.patterns.filter(pattern => query.includes(pattern)).length * 0.5;
      }

      // Check transactional phrases
      if (patterns.transactionalPhrases) {
        score += patterns.transactionalPhrases.filter(phrase => query.includes(phrase)).length * 0.4;
      }

      // Check commercial terms
      if (patterns.commercialTerms) {
        score += patterns.commercialTerms.filter(term => words.includes(term)).length * 0.3;
      }

      // Check location terms
      if (patterns.locationTerms) {
        score += patterns.locationTerms.filter(term => query.includes(term)).length * 0.3;
      }

      scores[intentKey] = score * patterns.weight;
    }

    // Feature-based adjustments
    if (features.hasQuestionWords) scores[QueryIntent.INFORMATIONAL] += 0.3;
    if (features.hasNavigationalTerms) scores[QueryIntent.NAVIGATIONAL] += 0.4;
    if (features.hasTransactionalVerbs) scores[QueryIntent.TRANSACTIONAL] += 0.4;
    if (features.hasLocationTerms) scores[QueryIntent.LOCAL] += 0.3;
    if (features.hasSpecificEntities) scores[QueryIntent.NAVIGATIONAL] += 0.2;

    // Length-based adjustments
    if (features.queryLength <= 2) {
      scores[QueryIntent.AMBIGUOUS] += 0.2; // Short queries are often ambiguous
    } else if (features.queryLength > 6) {
      scores[QueryIntent.INFORMATIONAL] += 0.1; // Longer queries tend to be informational
    }

    return scores;
  }

  /**
   * Determine the primary intent from scores
   */
  private determinePrimaryIntent(scores: Record<QueryIntent, number>): { intent: QueryIntent; confidence: number } {
    let maxScore = 0;
    let primaryIntent = QueryIntent.AMBIGUOUS;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent as QueryIntent;
      }
    }

    // Calculate confidence as the ratio of best score to second best
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const confidence = sortedScores.length > 1 && sortedScores[1] > 0
      ? sortedScores[0] / sortedScores[1]
      : sortedScores[0] > 0 ? 0.8 : 0.3;

    return { intent: primaryIntent, confidence: Math.min(confidence, 1.0) };
  }

  /**
   * Adjust intent based on detected domain
   */
  private adjustForDomain(query: string, current: { intent: QueryIntent; confidence: number }): { intent: QueryIntent; confidence: number } {
    const domain = this.detectDomain(query);
    if (domain && QueryIntentService.DOMAIN_INTENTS[domain]) {
      const domainIntent = QueryIntentService.DOMAIN_INTENTS[domain];
      // Blend current intent with domain intent
      return {
        intent: current.confidence > 0.7 ? current.intent : domainIntent,
        confidence: current.confidence
      };
    }
    return current;
  }

  /**
   * Adjust intent based on user context
   */
  private adjustForUserContext(
    current: { intent: QueryIntent; confidence: number },
    context?: { userLocation?: string; previousQueries?: string[] }
  ): { intent: QueryIntent; confidence: number } {
    if (!context) return current;

    // If user has location and query might be local
    if (context.userLocation && current.intent === QueryIntent.AMBIGUOUS) {
      return { intent: QueryIntent.LOCAL, confidence: 0.6 };
    }

    // If user has been doing transactional queries recently
    if (context.previousQueries) {
      const recentTransactional = context.previousQueries
        .slice(-3) // Last 3 queries
        .some(q => this.isTransactionalQuery(q));

      if (recentTransactional && current.intent === QueryIntent.AMBIGUOUS) {
        return { intent: QueryIntent.TRANSACTIONAL, confidence: 0.5 };
      }
    }

    return current;
  }

  /**
   * Generate search strategy based on intent
   */
  private generateSearchStrategy(intent: QueryIntent): SearchStrategy {
    const baseStrategy: SearchStrategy = {
      engineWeights: { semantic: 0.5, traditional: 0.5, hybrid: 0 },
      rankingBoosts: { recency: 0.1, popularity: 0.1, relevance: 0.7, authority: 0.1 },
      resultFilters: {},
      maxResults: 20
    };

    switch (intent) {
      case QueryIntent.INFORMATIONAL:
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.7, traditional: 0.3, hybrid: 0 },
          rankingBoosts: { recency: 0.05, popularity: 0.15, relevance: 0.7, authority: 0.1 },
          maxResults: 25
        };

      case QueryIntent.NAVIGATIONAL:
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.2, traditional: 0.8, hybrid: 0 },
          rankingBoosts: { recency: 0.2, popularity: 0.1, relevance: 0.6, authority: 0.1 },
          resultFilters: { minRelevanceScore: 0.7 },
          maxResults: 10
        };

      case QueryIntent.TRANSACTIONAL:
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.3, traditional: 0.7, hybrid: 0 },
          rankingBoosts: { recency: 0.15, popularity: 0.05, relevance: 0.7, authority: 0.1 },
          resultFilters: { contentType: ['bill', 'form', 'application'] },
          maxResults: 15
        };

      case QueryIntent.COMMERCIAL:
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.4, traditional: 0.6, hybrid: 0 },
          rankingBoosts: { recency: 0.1, popularity: 0.2, relevance: 0.6, authority: 0.1 },
          maxResults: 30
        };

      case QueryIntent.LOCAL:
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.6, traditional: 0.4, hybrid: 0 },
          rankingBoosts: { recency: 0.2, popularity: 0.1, relevance: 0.6, authority: 0.1 },
          maxResults: 15
        };

      default: // AMBIGUOUS
        return {
          ...baseStrategy,
          engineWeights: { semantic: 0.5, traditional: 0.5, hybrid: 0 },
          maxResults: 20
        };
    }
  }

  /**
   * Detect if query contains specific entities
   */
  private detectSpecificEntities(query: string): boolean {
    const entityPatterns = [
      /\bbill\s+\d+/i,  // "bill 123"
      /\bact\s+of\s+\d+/i,  // "act of 2023"
      /\bministry\s+of/i,  // "ministry of"
      /\bdepartment\s+of/i,  // "department of"
      /\boffice\s+of/i,  // "office of"
      /\bcommittee\s+on/i  // "committee on"
    ];

    return entityPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detect the domain of the query
   */
  private detectDomain(query: string): string | null {
    const domainKeywords: Record<string, string[]> = {
      'healthcare': ['health', 'medical', 'hospital', 'doctor', 'patient', 'disease'],
      'education': ['school', 'education', 'student', 'teacher', 'university', 'learning'],
      'finance': ['budget', 'tax', 'finance', 'economic', 'money', 'funding'],
      'infrastructure': ['road', 'transport', 'infrastructure', 'construction', 'building'],
      'government': ['government', 'parliament', 'ministry', 'department', 'official'],
      'agriculture': ['farm', 'agriculture', 'crop', 'farmer', 'food', 'rural'],
      'environment': ['environment', 'climate', 'pollution', 'conservation', 'nature'],
      'law': ['law', 'legal', 'regulation', 'policy', 'legislation', 'court']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return domain;
      }
    }

    return null;
  }

  /**
   * Check if a query is transactional
   */
  private isTransactionalQuery(query: string): boolean {
    const transactionalTerms = QueryIntentService.INTENT_PATTERNS[QueryIntent.TRANSACTIONAL].actionVerbs;
    return transactionalTerms.some(term => query.toLowerCase().includes(term));
  }

  /**
   * Get intent statistics for monitoring
   */
  getIntentStats(): Record<QueryIntent, number> {
    // In a real implementation, this would track actual intent distributions
    return {
      [QueryIntent.INFORMATIONAL]: 0.45,
      [QueryIntent.NAVIGATIONAL]: 0.25,
      [QueryIntent.TRANSACTIONAL]: 0.15,
      [QueryIntent.COMMERCIAL]: 0.08,
      [QueryIntent.LOCAL]: 0.05,
      [QueryIntent.AMBIGUOUS]: 0.02
    };
  }
}

// Export singleton instance
export const queryIntentService = QueryIntentService.getInstance();
