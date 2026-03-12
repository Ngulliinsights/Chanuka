// ============================================================================
// PROVISION MATCHER - Constitutional Provision Discovery
// ============================================================================
// Service that identifies which constitutional provisions are relevant to a bill

import { logger } from '@server/infrastructure/observability';
import { constitutional_provisions } from '@server/infrastructure/schema/index';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export type ConstitutionalProvision = typeof constitutional_provisions.$inferSelect;

export interface ProvisionMatch {
  provision: ConstitutionalProvision;
  relevanceScore: number; // 0-100
  matchReasons: string[];
  keywordMatches: string[];
  contextSnippets: string[];
}

export class ProvisionMatcherService {
  constructor() {}

  /**
   * Finds constitutional provisions relevant to the given bill content
   */
  async findRelevantProvisions(
    billContent: string,
    billTitle?: string
  ) {
    return safeAsync(async () => {
      logger.info({
        contentLength: billContent.length,
        hasTitle: !!billTitle
      }, '🔍 Finding relevant constitutional provisions');

      // Note: Repository integration pending
      // For now, return empty array until repository is available
      const allProvisions: ConstitutionalProvision[] = [];
      
      // Analyze each provision for relevance
      const matches: ProvisionMatch[] = [];
      
      for (const provision of allProvisions) {
        const match = this.analyzeProvisionRelevance(provision, billContent, billTitle);
        if (match.relevanceScore >= 30) { // Threshold for relevance
          matches.push(match);
        }
      }

      // Sort by relevance score (highest first)
      matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Return top matches (limit to prevent overwhelming analysis)
      const topMatches = matches.slice(0, 10);
      
      logger.info({
        totalAnalyzed: allProvisions.length,
        relevantFound: topMatches.length,
        topScores: topMatches.slice(0, 3).map(m => ({
          article: m.provision.article_number,
          score: m.relevanceScore
        }))
      }, `📋 Found ${topMatches.length} relevant constitutional provisions`);

      return topMatches.map(m => m.provision);

    }, { service: 'ProvisionMatcherService', operation: 'findRelevantProvisions' });
  }

  /**
   * Analyzes how relevant a specific provision is to the bill content
   */
  private analyzeProvisionRelevance(
    provision: ConstitutionalProvision,
    billContent: string,
    billTitle?: string
  ): ProvisionMatch {
    const content = billContent.toLowerCase();
    const title = billTitle?.toLowerCase() || '';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const provisionText = provision.full_text?.toLowerCase() || '';
    
    let relevanceScore = 0;
    const matchReasons: string[] = [];
    const keywordMatches: string[] = [];
    const contextSnippets: string[] = [];

    // 1. Direct keyword matching (highest weight)
    const keywords = provision.keywords || [];
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      if (content.includes(keywordLower) || title.includes(keywordLower)) {
        relevanceScore += 15;
        keywordMatches.push(keyword);
        matchReasons.push(`Keyword match: "${keyword}"`);
        
        // Extract context snippet
        const snippet = this.extractContextSnippet(billContent, keyword);
        if (snippet) {
          contextSnippets.push(snippet);
        }
      }
    }

    // 2. Rights category matching
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (provision.is_fundamental_right) {
      const categoryScore = this.analyzeFundamentalRightsRelevance(content, title);
      if (categoryScore > 0) {
        relevanceScore += categoryScore;
        matchReasons.push(`Fundamental rights provision`);
      }
    }

    // 3. Semantic similarity (basic implementation)
    const semanticScore = this.calculateSemanticSimilarity(provisionText, content);
    relevanceScore += semanticScore;
    if (semanticScore > 5) {
      matchReasons.push(`Semantic similarity detected`);
    }

    // 4. Constitutional structure matching
    const structureScore = this.analyzeStructuralRelevance(provision, content, title);
    relevanceScore += structureScore;
    if (structureScore > 0) {
      matchReasons.push(`Structural relevance to constitutional framework`);
    }

    // 5. Legal terminology matching
    const legalTermScore = this.analyzeLegalTerminology(provision, content);
    relevanceScore += legalTermScore;
    if (legalTermScore > 0) {
      matchReasons.push(`Legal terminology alignment`);
    }

    return {
      provision,
      relevanceScore: Math.min(relevanceScore, 100), // Cap at 100
      matchReasons,
      keywordMatches,
      contextSnippets
    };
  }

  /**
   * Analyzes relevance based on fundamental rights
   */
  private analyzeFundamentalRightsRelevance(content: string, title: string): number {
    const rightsTerms = [
      'rights', 'freedom', 'liberty', 'expression', 'speech', 'religion',
      'privacy', 'equality', 'discrimination', 'due process', 'fair trial',
      'assembly', 'association', 'movement', 'property', 'life', 'dignity'
    ];

    let score = 0;
    for (const term of rightsTerms) {
      if (content.includes(term) || title.includes(term)) {
        score += 8;
      }
    }

    return Math.min(score, 25); // Cap category score
  }

  /**
   * Basic semantic similarity calculation
   */
  private calculateSemanticSimilarity(provisionText: string, billContent: string): number {
    // Simple word overlap calculation
    const provisionWords = new Set(
      provisionText.split(/\s+/)
        .map(w => w.replace(/[^\w]/g, '').toLowerCase())
        .filter(w => w.length > 3) // Only meaningful words
    );
    
    const billWords = new Set(
      billContent.split(/\s+/)
        .map(w => w.replace(/[^\w]/g, '').toLowerCase())
        .filter(w => w.length > 3)
    );

    const intersection = new Set([...provisionWords].filter(w => billWords.has(w)));
    const union = new Set([...provisionWords, ...billWords]);

    if (union.size === 0) return 0;

    const similarity = intersection.size / union.size;
    return Math.round(similarity * 20); // Scale to 0-20 points
  }

  /**
   * Analyzes structural relevance based on constitutional framework
   */
  private analyzeStructuralRelevance(
    _provision: ConstitutionalProvision,
    content: string,
    title: string
  ): number {
    let score = 0;

    // Check for references to constitutional structure
    const structuralTerms = [
      'constitution', 'constitutional', 'article', 'amendment', 'bill of rights',
      'fundamental', 'basic rights', 'human rights', 'charter'
    ];

    for (const term of structuralTerms) {
      if (content.includes(term) || title.includes(term)) {
        score += 3;
      }
    }

    // Check for government structure references
    const governmentTerms = [
      'government', 'parliament', 'executive', 'legislature', 'judicial',
      'president', 'minister', 'authority', 'power', 'jurisdiction'
    ];

    for (const term of governmentTerms) {
      if (content.includes(term) || title.includes(term)) {
        score += 2;
      }
    }

    return Math.min(score, 15); // Cap structural score
  }

  /**
   * Analyzes legal terminology alignment
   */
  private analyzeLegalTerminology(_provision: ConstitutionalProvision, content: string): number {
    let score = 0;

    // Common legal terms that might indicate constitutional relevance
    const legalTerms = [
      'shall', 'may not', 'prohibited', 'authorized', 'empowered',
      'subject to', 'in accordance with', 'pursuant to', 'notwithstanding',
      'provided that', 'except', 'unless', 'violation', 'compliance'
    ];

    for (const term of legalTerms) {
      if (content.includes(term)) {
        score += 1;
      }
    }

    // Check for enforcement-related terms
    const enforcementTerms = [
      'penalty', 'fine', 'imprisonment', 'sanction', 'enforcement',
      'violation', 'offense', 'crime', 'punishment', 'liability'
    ];

    for (const term of enforcementTerms) {
      if (content.includes(term)) {
        score += 2;
      }
    }

    return Math.min(score, 10); // Cap legal terminology score
  }

  /**
   * Extracts context snippet around a keyword match
   */
  private extractContextSnippet(content: string, keyword: string): string | null {
    const keywordLower = keyword.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(keywordLower);
    
    if (index === -1) return null;

    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + keyword.length + 100);
    
    let snippet = content.substring(start, end).trim();
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }

  /**
   * Finds provisions by specific criteria (for targeted analysis)
   */
  async findProvisionsByCategory(category: string) {
    return safeAsync(async () => {
      // Check cache first (ADR-013)
      const cacheKey = typeof cacheKeys !== 'undefined' && cacheKeys.entity ? cacheKeys.entity('provision_category', category) : `provision_category:${category}`;
      if (typeof cacheService !== 'undefined') {
        const cached = await cacheService.get<ConstitutionalProvision[]>(cacheKey);
        if (cached) return cached;
      }

      logger.debug({ category }, 'Finding provisions by category');
      
      // Note: Repository integration pending
      const results: ConstitutionalProvision[] = [];

      // Set cache
      if (typeof cacheService !== 'undefined') {
        const ttl = typeof CACHE_TTL !== 'undefined' ? CACHE_TTL.HOUR : 3600;
        await cacheService.set(cacheKey, results, ttl);
      }

      return results;
    }, { service: 'ProvisionMatcherService', operation: 'findProvisionsByCategory' });
  }

  /**
   * Finds provisions by article number
   */
  async findProvisionsByArticle(articleNumber: number) {
    return safeAsync(async () => {
      const cacheKey = typeof cacheKeys !== 'undefined' && cacheKeys.entity ? cacheKeys.entity('provision_article', String(articleNumber)) : `provision_article:${articleNumber}`;
      if (typeof cacheService !== 'undefined') {
        const cached = await cacheService.get<ConstitutionalProvision[]>(cacheKey);
        if (cached) return cached;
      }

      logger.debug({ articleNumber }, 'Finding provisions by article number');
      
      // Note: Repository integration pending
      const results: ConstitutionalProvision[] = [];

      if (typeof cacheService !== 'undefined') {
        const ttl = typeof CACHE_TTL !== 'undefined' ? CACHE_TTL.HOUR : 3600;
        await cacheService.set(cacheKey, results, ttl);
      }

      return results;
    }, { service: 'ProvisionMatcherService', operation: 'findProvisionsByArticle' });
  }

  /**
   * Searches provisions by keywords
   */
  async searchProvisions(keywords: string[]) {
    return safeAsync(async () => {
      const cacheKey = typeof cacheKeys !== 'undefined' && cacheKeys.entity ? cacheKeys.entity('provision_search', keywords.join('_')) : `provision_search:${keywords.join('_')}`;
      if (typeof cacheService !== 'undefined') {
        const cached = await cacheService.get<ConstitutionalProvision[]>(cacheKey);
        if (cached) return cached;
      }

      logger.debug({ keywords }, 'Searching provisions by keywords');
      
      // Note: Repository integration pending
      const results: ConstitutionalProvision[] = [];

      if (typeof cacheService !== 'undefined') {
        const ttl = typeof CACHE_TTL !== 'undefined' ? CACHE_TTL.HOUR : 3600;
        await cacheService.set(cacheKey, results, ttl);
      }

      return results;
    }, { service: 'ProvisionMatcherService', operation: 'searchProvisions' });
  }
}

export const provisionMatcherService = new ProvisionMatcherService();
