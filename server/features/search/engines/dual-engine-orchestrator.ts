// ============================================================================
// DUAL-ENGINE ORCHESTRATOR - Phase 2 Core Integration
// ============================================================================
// Orchestrates PostgreSQL full-text and semantic search engines in parallel
// Implements intelligent query classification, failover, and result fusion

import { PostgreSQLFullTextEngine } from '@server/features/search/engines/core/postgresql-fulltext.engine';
import { ParsedQuery,searchSyntaxParser } from '@server/features/search/utils/search-syntax-parser.ts';
import { logger } from '@shared/core';

import { SearchOptions, SearchResponse,semanticSearchEngine } from './semantic-search-engine';

export interface EngineResult {
  engine: 'postgresql' | 'semantic';
  results: unknown[];
  totalCount: number;
  processingTimeMs: number;
  error?: Error;
  confidence: number;
}

export interface FusionResult {
  id: string;
  contentType: 'bill' | 'sponsor' | 'comment';
  title: string;
  summary?: string;
  content: string;
  relevanceScore: number;
  semanticScore?: number;
  traditionalScore?: number;
  metadata: any;
  sourceEngines: ('postgresql' | 'semantic')[];
  fusionConfidence: number;
}

export interface OrchestratorConfig {
  enableParallelExecution: boolean;
  enableFailover: boolean;
  fusionWeights: {
    semantic: number;
    traditional: number;
    recency: number;
    popularity: number;
  };
  engineTimeouts: {
    postgresql: number;
    semantic: number;
  };
  minResultsPerEngine: number;
  maxFusionResults: number;
}

export class DualEngineOrchestrator {
  private postgresqlEngine: PostgreSQLFullTextEngine;
  private config: OrchestratorConfig;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.postgresqlEngine = new PostgreSQLFullTextEngine();
    this.config = {
      enableParallelExecution: true,
      enableFailover: true,
      fusionWeights: {
        semantic: 0.6,
        traditional: 0.4,
        recency: 0.1,
        popularity: 0.1,
      },
      engineTimeouts: {
        postgresql: 5000, // 5 seconds
        semantic: 3000,   // 3 seconds
      },
      minResultsPerEngine: 5,
      maxFusionResults: 50,
      ...config,
    };
  }

  /**
   * Execute dual-engine search with intelligent orchestration
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const parsedQuery = searchSyntaxParser.parse(query);

    try {
      logger.debug('Starting dual-engine search', {
        query,
        parsedQuery: parsedQuery.searchType,
        options,
        config: this.config,
      });

      // Classify query to determine engine strategy
      const engineStrategy = this.classifyQueryStrategy(parsedQuery);

      // Execute engines based on strategy
      const engineResults = await this.executeEngines(query, options, parsedQuery, engineStrategy);

      // Fuse results from both engines
      const fusedResults = this.fuseResults(engineResults, parsedQuery);

      // Apply final ranking and filtering
      const finalResults = this.applyFinalRanking(fusedResults, parsedQuery);

      const processingTimeMs = Date.now() - startTime;

      // Log orchestration analytics
      await this.logOrchestrationAnalytics(query, parsedQuery, engineResults, processingTimeMs);

      const response: SearchResponse = {
        results: finalResults.slice(0, options.limit || 20),
        totalCount: finalResults.length,
        query,
        searchType: 'hybrid',
        processingTimeMs,
        hasMore: finalResults.length > (options.limit || 20),
      };

      logger.debug('Dual-engine search completed', {
        query,
        resultCount: response.results.length,
        totalCount: response.totalCount,
        processingTimeMs,
        engineStrategy,
      });

      return response;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error('Dual-engine search failed', {
        error: (error as Error).message,
        query,
        processingTimeMs,
      });

      // Fallback to single engine if dual-engine fails
      if (this.config.enableFailover) {
        return this.fallbackSearch(query, options, parsedQuery);
      }

      throw error;
    }
  }

  /**
   * Classify query to determine which engines to use and how
   */
  private classifyQueryStrategy(parsedQuery: ParsedQuery): {
    usePostgreSQL: boolean;
    useSemantic: boolean;
    priorityEngine: 'postgresql' | 'semantic' | 'balanced';
    expectedConfidence: number;
  } {
    // Default balanced approach
    const strategy = {
      usePostgreSQL: true,
      useSemantic: true,
      priorityEngine: 'balanced' as const,
      expectedConfidence: 0.8,
    };

    switch (parsedQuery.searchType) {
      case 'field_specific':
        // Field searches work better with PostgreSQL
        strategy.priorityEngine = 'postgresql';
        strategy.expectedConfidence = 0.9;
        break;

      case 'boolean':
        // Boolean operators are PostgreSQL-specific
        strategy.useSemantic = false;
        strategy.priorityEngine = 'postgresql';
        strategy.expectedConfidence = 0.95;
        break;

      case 'semantic':
        // Explicit semantic search
        strategy.priorityEngine = 'semantic';
        strategy.expectedConfidence = 0.85;
        break;

      case 'traditional':
        // Simple queries can use both engines
        strategy.priorityEngine = 'balanced';
        strategy.expectedConfidence = 0.8;
        break;

      default:
        // Hybrid queries benefit from both
        strategy.priorityEngine = 'balanced';
        strategy.expectedConfidence = 0.75;
    }

    // Adjust based on query characteristics
    if (parsedQuery.metadata.hasExclusions) {
      strategy.useSemantic = false; // Exclusions work better in PostgreSQL
    }

    if (parsedQuery.exactPhrases.length > 0) {
      strategy.priorityEngine = 'postgresql'; // Exact phrases are PostgreSQL strength
    }

    return strategy;
  }

  /**
   * Execute search engines in parallel or sequentially based on strategy
   */
  private async executeEngines(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery,
    strategy: any
  ): Promise<EngineResult[]> {
    const results: EngineResult[] = [];

    if (!this.config.enableParallelExecution || strategy.priorityEngine !== 'balanced') {
      // Sequential execution
      if (strategy.usePostgreSQL) {
        const pgResult = await this.executePostgreSQLEngine(query, options, parsedQuery);
        results.push(pgResult);
      }

      if (strategy.useSemantic) {
        const semanticResult = await this.executeSemanticEngine(query, options, parsedQuery);
        results.push(semanticResult);
      }
    } else {
      // Parallel execution
      const promises: Promise<EngineResult>[] = [];

      if (strategy.usePostgreSQL) {
        promises.push(this.executePostgreSQLEngine(query, options, parsedQuery));
      }

      if (strategy.useSemantic) {
        promises.push(this.executeSemanticEngine(query, options, parsedQuery));
      }

      results.push(...await Promise.all(promises));
    }

    return results;
  }

  /**
   * Execute PostgreSQL full-text engine with timeout
   */
  private async executePostgreSQLEngine(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery
  ): Promise<EngineResult> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PostgreSQL engine timeout')), this.config.engineTimeouts.postgresql)
      );

      const searchPromise = this.postgresqlEngine.search({
        query,
        filters: options.filters || {},
        pagination: { 
          page: 1,
          limit: (options.limit || 20) * 2 // Get more for fusion
        },
        options: { 
          searchType: 'fulltext-phase2' as const,
          includeHighlights: false
        },
      });

      const results = await Promise.race([searchPromise, timeoutPromise]);

      return {
        engine: 'postgresql',
        results: results,
        totalCount: results.length,
        processingTimeMs: Date.now() - startTime,
        confidence: 0.9,
      };

    } catch (error) {
      logger.warn('PostgreSQL engine failed', { error: (error as Error).message, query });

      return {
        engine: 'postgresql',
        results: [],
        totalCount: 0,
        processingTimeMs: Date.now() - startTime,
        error: error as Error,
        confidence: 0,
      };
    }
  }

  /**
   * Execute semantic search engine with timeout
   */
  private async executeSemanticEngine(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery
  ): Promise<EngineResult> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Semantic engine timeout')), this.config.engineTimeouts.semantic)
      );

      const searchPromise = semanticSearchEngine.search(query, {
        ...options,
        limit: (options.limit || 20) * 2, // Get more for fusion
      });

      const response = await Promise.race([searchPromise, timeoutPromise]);

      return {
        engine: 'semantic',
        results: response.results,
        totalCount: response.totalCount,
        processingTimeMs: Date.now() - startTime,
        confidence: 0.8,
      };

    } catch (error) {
      logger.warn('Semantic engine failed', { error: (error as Error).message, query });

      return {
        engine: 'semantic',
        results: [],
        totalCount: 0,
        processingTimeMs: Date.now() - startTime,
        error: error as Error,
        confidence: 0,
      };
    }
  }

  /**
   * Fuse results from multiple engines using intelligent ranking
   */
  private fuseResults(engineResults: EngineResult[], parsedQuery: ParsedQuery): FusionResult[] {
    const resultMap = new Map<string, FusionResult>();

    // Process each engine's results
    for (const engineResult of engineResults) {
      if (engineResult.error || engineResult.results.length === 0) continue;

      for (const result of engineResult.results) {
        const key = `${result.contentType}:${result.id}`;

        if (!resultMap.has(key)) {
          // New result
          resultMap.set(key, {
            id: result.id,
            contentType: result.contentType,
            title: result.title,
            summary: result.summary,
            content: result.content || '',
            relevanceScore: 0,
            metadata: result.metadata || {},
            sourceEngines: [engineResult.engine],
            fusionConfidence: engineResult.confidence,
          });
        }

        const existing = resultMap.get(key)!;

        // Update scores based on engine
        if (engineResult.engine === 'postgresql') {
          existing.traditionalScore = result.relevanceScore;
          existing.relevanceScore += result.relevanceScore * this.config.fusionWeights.traditional;
        } else if (engineResult.engine === 'semantic') {
          existing.semanticScore = result.relevanceScore;
          existing.relevanceScore += result.relevanceScore * this.config.fusionWeights.semantic;
        }

        // Track source engines
        if (!existing.sourceEngines.includes(engineResult.engine)) {
          existing.sourceEngines.push(engineResult.engine);
        }

        // Boost confidence for results found in multiple engines
        if (existing.sourceEngines.length > 1) {
          existing.fusionConfidence = Math.min(existing.fusionConfidence + 0.1, 1.0);
        }
      }
    }

    return Array.from(resultMap.values());
  }

  /**
   * Apply final ranking with configurable weights
   */
  private applyFinalRanking(results: FusionResult[], parsedQuery: ParsedQuery): FusionResult[] {
    return results.map(result => {
      let finalScore = result.relevanceScore;

      // Apply recency boost
      if (result.metadata.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(result.metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 365) {
          finalScore += this.config.fusionWeights.recency * (1 - daysSinceCreation / 365);
        }
      }

      // Apply content type priority
      switch (result.contentType) {
        case 'bill':
          finalScore += 0.1;
          break;
        case 'sponsor':
          finalScore += 0.05;
          break;
      }

      result.relevanceScore = finalScore;
      return result;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Fallback search when dual-engine fails
   */
  private async fallbackSearch(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery
  ): Promise<SearchResponse> {
    logger.warn('Using fallback search strategy', { query });

    // Try PostgreSQL first, then semantic
    try {
      const pgResult = await this.executePostgreSQLEngine(query, options, parsedQuery);
      if (pgResult.results.length > 0) {
        return {
          results: pgResult.results.slice(0, options.limit || 20),
          totalCount: pgResult.totalCount,
          query,
          searchType: 'traditional',
          processingTimeMs: pgResult.processingTimeMs,
          hasMore: pgResult.totalCount > (options.limit || 20),
        };
      }
    } catch (error) {
      logger.warn('PostgreSQL fallback failed', { error: (error as Error).message });
    }

    // Fallback to semantic search
    try {
      return await semanticSearchEngine.search(query, options);
    } catch (error) {
      logger.error('All search engines failed', { error: (error as Error).message });
      return {
        results: [],
        totalCount: 0,
        query,
        searchType: 'failed',
        processingTimeMs: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Log orchestration analytics for monitoring and optimization
   */
  private async logOrchestrationAnalytics(
    query: string,
    parsedQuery: ParsedQuery,
    engineResults: EngineResult[],
    totalProcessingTime: number
  ): Promise<void> {
    try {
      const analytics = {
        query,
        queryType: parsedQuery.searchType,
        engineResults: engineResults.map(r => ({
          engine: r.engine,
          resultCount: r.results.length,
          processingTimeMs: r.processingTimeMs,
          confidence: r.confidence,
          hasError: !!r.error,
        })),
        totalProcessingTime,
        fusionWeights: this.config.fusionWeights,
        timestamp: new Date(),
      };

      logger.debug('Orchestration analytics', analytics);

      // In production, this would be stored in a database for analysis
      // await this.storeOrchestrationAnalytics(analytics);

    } catch (error) {
      logger.warn('Failed to log orchestration analytics', { error: (error as Error).message });
    }
  }

  /**
   * Get orchestrator health and performance metrics
   */
  async getHealth(): Promise<{
    healthy: boolean;
    engines: {
      postgresql: boolean;
      semantic: boolean;
    };
    config: OrchestratorConfig;
    recentPerformance: unknown[];
  }> {
    // Basic health check - in production this would be more comprehensive
    return {
      healthy: true,
      engines: {
        postgresql: true, // Assume healthy for now
        semantic: true,
      },
      config: this.config,
      recentPerformance: [],
    };
  }
}

// Export singleton instance
export const dualEngineOrchestrator = new DualEngineOrchestrator();


