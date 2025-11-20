// ============================================================================
// ADVANCED SEARCH SYNTAX PARSER
// ============================================================================
// Parses complex search syntax including field search, boolean operators,
// exact phrases, exclusions, and semantic search prefixes

export interface ParsedQuery {
  originalQuery: string;
  searchType: 'semantic' | 'traditional' | 'hybrid' | 'field_specific' | 'boolean';
  semanticQuery?: string;
  traditionalQuery?: string;
  fieldQueries: {
    title?: string;
    sponsor?: string;
    status?: string;
    content?: string;
    comments?: string;
  };
  booleanOperators: {
    and: string[];
    or: string[];
    not: string[];
  };
  exactPhrases: string[];
  exclusions: string[];
  fuzzyIndicators: boolean;
  proximityDistance?: number;
  metadata: {
    hasBooleanOperators: boolean;
    hasFieldSearches: boolean;
    hasExactPhrases: boolean;
    hasExclusions: boolean;
    semanticWeight: number;
    traditionalWeight: number;
  };
}

export class SearchSyntaxParser {
  private readonly fieldPrefixes = ['title:', 'sponsor:', 'status:', 'content:', 'comments:'];
  private readonly booleanOperators = ['AND', 'OR', 'NOT', '&&', '||', '!'];
  private readonly semanticPrefixes = ['semantic:', 'similar:', '~'];

  /**
   * Parse a search query into structured components
   */
  parse(query: string): ParsedQuery {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return this.createEmptyParsedQuery(query);
    }

    // Initialize result structure
    const result: ParsedQuery = {
      originalQuery: query,
      searchType: 'traditional',
      fieldQueries: {},
      booleanOperators: { and: [], or: [], not: [] },
      exactPhrases: [],
      exclusions: [],
      fuzzyIndicators: false,
      metadata: {
        hasBooleanOperators: false,
        hasFieldSearches: false,
        hasExactPhrases: false,
        hasExclusions: false,
        semanticWeight: 0.3,
        traditionalWeight: 0.7,
      },
    };

    // Check for semantic prefixes
    const semanticMatch = this.checkSemanticPrefixes(trimmedQuery);
    if (semanticMatch) {
      result.searchType = 'semantic';
      result.semanticQuery = semanticMatch.query;
      result.metadata.semanticWeight = 0.8;
      result.metadata.traditionalWeight = 0.2;
      return result;
    }

    // Parse field-specific searches
    const fieldResult = this.parseFieldSearches(trimmedQuery);
    result.fieldQueries = fieldResult.fields;
    result.metadata.hasFieldSearches = fieldResult.hasFields;

    // Parse boolean operators
    const booleanResult = this.parseBooleanOperators(fieldResult.remaining);
    result.booleanOperators = booleanResult.operators;
    result.metadata.hasBooleanOperators = booleanResult.hasOperators;

    // Parse exact phrases
    const phraseResult = this.parseExactPhrases(booleanResult.remaining);
    result.exactPhrases = phraseResult.phrases;
    result.metadata.hasExactPhrases = phraseResult.hasPhrases;

    // Parse exclusions
    const exclusionResult = this.parseExclusions(phraseResult.remaining);
    result.exclusions = exclusionResult.exclusions;
    result.metadata.hasExclusions = exclusionResult.hasExclusions;

    // Set remaining as traditional query
    result.traditionalQuery = exclusionResult.remaining.trim();

    // Determine search type based on parsed components
    result.searchType = this.determineSearchType(result);

    // Check for fuzzy indicators
    result.fuzzyIndicators = this.hasFuzzyIndicators(trimmedQuery);

    // Set weights based on search type
    this.setWeights(result);

    return result;
  }

  /**
   * Check for semantic search prefixes
   */
  private checkSemanticPrefixes(query: string): { query: string } | null {
    for (const prefix of this.semanticPrefixes) {
      if (query.toLowerCase().startsWith(prefix)) {
        return { query: query.slice(prefix.length).trim() };
      }
    }
    return null;
  }

  /**
   * Parse field-specific searches (title:, sponsor:, etc.)
   */
  private parseFieldSearches(query: string): { fields: ParsedQuery['fieldQueries']; remaining: string; hasFields: boolean } {
    const fields: ParsedQuery['fieldQueries'] = {};
    let remaining = query;
    let hasFields = false;

    for (const prefix of this.fieldPrefixes) {
      const regex = new RegExp(`(${prefix})"([^"]*)"`, 'gi');
      let match;

      while ((match = regex.exec(query)) !== null) {
        const fieldName = prefix.slice(0, -1); // Remove colon
        const fieldValue = match[2];
        fields[fieldName as keyof typeof fields] = fieldValue;
        hasFields = true;
      }

      // Also handle unquoted field searches
      const unquotedRegex = new RegExp(`(${prefix})([^\\s"']+)`, 'gi');
      while ((match = unquotedRegex.exec(query)) !== null) {
        const fieldName = prefix.slice(0, -1);
        const fieldValue = match[2];
        fields[fieldName as keyof typeof fields] = fieldValue;
        hasFields = true;
      }
    }

    // Remove field searches from remaining query
    for (const [field, value] of Object.entries(fields)) {
      const prefix = `${field}:`;
      remaining = remaining.replace(new RegExp(`${prefix}"${value}"`, 'gi'), '');
      remaining = remaining.replace(new RegExp(`${prefix}${value}`, 'gi'), '');
    }

    return { fields, remaining: remaining.trim(), hasFields };
  }

  /**
   * Parse boolean operators
   */
  private parseBooleanOperators(query: string): { operators: ParsedQuery['booleanOperators']; remaining: string; hasOperators: boolean } {
    const operators: ParsedQuery['booleanOperators'] = { and: [], or: [], not: [] };
    let remaining = query;
    let hasOperators = false;

    // Handle AND operators
    const andRegex = /\bAND\b|&&/gi;
    let match;
    while ((match = andRegex.exec(query)) !== null) {
      operators.and.push(match[0]);
      hasOperators = true;
    }

    // Handle OR operators
    const orRegex = /\bOR\b|\|\|/gi;
    while ((match = orRegex.exec(query)) !== null) {
      operators.or.push(match[0]);
      hasOperators = true;
    }

    // Handle NOT operators
    const notRegex = /\bNOT\b|!/gi;
    while ((match = notRegex.exec(query)) !== null) {
      operators.not.push(match[0]);
      hasOperators = true;
    }

    // For now, keep the operators in the remaining query for PostgreSQL to handle
    // In a more advanced implementation, we might parse the full boolean expression

    return { operators, remaining, hasOperators };
  }

  /**
   * Parse exact phrases in quotes
   */
  private parseExactPhrases(query: string): { phrases: string[]; remaining: string; hasPhrases: boolean } {
    const phrases: string[] = [];
    let remaining = query;
    let hasPhrases = false;

    const phraseRegex = /"([^"]*)"/g;
    let match;

    while ((match = phraseRegex.exec(query)) !== null) {
      if (match[1]) {
        phrases.push(match[1]);
        hasPhrases = true;
        // Remove the quoted phrase from remaining
        remaining = remaining.replace(match[0], '');
      }
    }

    return { phrases, remaining: remaining.trim(), hasPhrases };
  }

  /**
   * Parse exclusions (terms starting with -)
   */
  private parseExclusions(query: string): { exclusions: string[]; remaining: string; hasExclusions: boolean } {
    const exclusions: string[] = [];
    let remaining = query;
    let hasExclusions = false;

    const exclusionRegex = /-(\w+)/g;
    let match;

    while ((match = exclusionRegex.exec(query)) !== null) {
      if (match[1]) {
        exclusions.push(match[1]);
        hasExclusions = true;
        // Remove the exclusion from remaining
        remaining = remaining.replace(match[0], '');
      }
    }

    return { exclusions, remaining: remaining.trim(), hasExclusions };
  }

  /**
   * Determine the overall search type based on parsed components
   */
  private determineSearchType(result: ParsedQuery): ParsedQuery['searchType'] {
    if (result.metadata.hasFieldSearches) return 'field_specific';
    if (result.metadata.hasBooleanOperators) return 'boolean';
    if (result.metadata.hasExactPhrases || result.metadata.hasExclusions) return 'hybrid';
    return 'traditional';
  }

  /**
   * Check for fuzzy matching indicators
   */
  private hasFuzzyIndicators(query: string): boolean {
    return /\*|~|\?/.test(query);
  }

  /**
   * Set appropriate weights based on search type
   */
  private setWeights(result: ParsedQuery): void {
    switch (result.searchType) {
      case 'semantic':
        result.metadata.semanticWeight = 0.8;
        result.metadata.traditionalWeight = 0.2;
        break;
      case 'field_specific':
        result.metadata.semanticWeight = 0.3;
        result.metadata.traditionalWeight = 0.7;
        break;
      case 'boolean':
        result.metadata.semanticWeight = 0.2;
        result.metadata.traditionalWeight = 0.8;
        break;
      case 'hybrid':
        result.metadata.semanticWeight = 0.5;
        result.metadata.traditionalWeight = 0.5;
        break;
      default:
        result.metadata.semanticWeight = 0.3;
        result.metadata.traditionalWeight = 0.7;
    }
  }

  /**
   * Create empty parsed query for invalid input
   */
  private createEmptyParsedQuery(originalQuery: string): ParsedQuery {
    return {
      originalQuery,
      searchType: 'traditional',
      fieldQueries: {},
      booleanOperators: { and: [], or: [], not: [] },
      exactPhrases: [],
      exclusions: [],
      fuzzyIndicators: false,
      metadata: {
        hasBooleanOperators: false,
        hasFieldSearches: false,
        hasExactPhrases: false,
        hasExclusions: false,
        semanticWeight: 0.3,
        traditionalWeight: 0.7,
      },
    };
  }

  /**
   * Convert parsed query back to PostgreSQL full-text search query
   */
  toPostgresQuery(parsed: ParsedQuery): string {
    const parts: string[] = [];

    // Add field-specific searches
    for (const [field, value] of Object.entries(parsed.fieldQueries)) {
      if (value) {
        switch (field) {
          case 'title':
            parts.push(`search_vector @@ plainto_tsquery('english', '${value}') AND search_vector @@ to_tsquery('english', 'A:*')`);
            break;
          case 'sponsor':
            parts.push(`search_vector @@ plainto_tsquery('english', '${value}')`);
            break;
          case 'status':
            parts.push(`status = '${value}'`);
            break;
          case 'content':
            parts.push(`search_vector @@ plainto_tsquery('english', '${value}') AND search_vector @@ to_tsquery('english', 'C:*')`);
            break;
          case 'comments':
            parts.push(`search_vector @@ plainto_tsquery('english', '${value}')`);
            break;
        }
      }
    }

    // Add traditional search terms
    if (parsed.traditionalQuery) {
      parts.push(`search_vector @@ plainto_tsquery('english', '${parsed.traditionalQuery}')`);
    }

    // Add exact phrases
    for (const phrase of parsed.exactPhrases) {
      parts.push(`search_vector @@ phraseto_tsquery('english', '${phrase}')`);
    }

    // Add exclusions
    for (const exclusion of parsed.exclusions) {
      parts.push(`NOT (search_vector @@ plainto_tsquery('english', '${exclusion}'))`);
    }

    return parts.length > 0 ? parts.join(' AND ') : '';
  }

  /**
   * Get ranking configuration based on parsed query
   */
  getRankingConfig(parsed: ParsedQuery): { semanticWeight: number; traditionalWeight: number; recencyWeight: number; popularityWeight: number } {
    return {
      semanticWeight: parsed.metadata.semanticWeight,
      traditionalWeight: parsed.metadata.traditionalWeight,
      recencyWeight: 0.1, // Default recency weight
      popularityWeight: 0.1, // Default popularity weight
    };
  }
}

// Export singleton instance
export const searchSyntaxParser = new SearchSyntaxParser();
