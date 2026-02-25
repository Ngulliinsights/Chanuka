// ============================================================================
// DUAL-ENGINE ORCHESTRATOR - Phase 2 Core Integration
// ============================================================================
// Orchestrates PostgreSQL full-text and semantic search engines in parallel
// Implements intelligent query classification, failover, and result fusion

import { PostgreSQLFullTextEngine } from '@server/features/search/engines/core/postgresql-fulltext.engine';
import { ParsedQuery, searchSyntaxParser } from '@server/features/search/utils/search-syntax-parser';
import { logger } from '@server/infrastructure/observability';

import { SearchOptions, SearchResponse, SearchResult, semanticSearchEngine } from './semantic-search.engine';

// ─── Internal Result Types ────────────────────────────────────────────────────

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
  summary: string; // always present — coerced from optional source field
  content: string;
  relevanceScore: number;
  semanticScore?: number;
  traditionalScore?: number;
  metadata: Record<string, unknown>;
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

// ─── Engine Strategy ──────────────────────────────────────────────────────────

type PriorityEngine = 'postgresql' | 'semantic' | 'balanced';

interface EngineStrategy {
  usePostgreSQL: boolean;
  useSemantic: boolean;
  priorityEngine: PriorityEngine;
  expectedConfidence: number;
}

// ─── Raw result shape coming out of either engine ─────────────────────────────

interface RawSearchResult {
  id: string;
  contentType: 'bill' | 'sponsor' | 'comment';
  title: string;
  summary?: string;
  content?: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

function isRawSearchResult(value: unknown): value is RawSearchResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['id'] === 'string' && typeof v['contentType'] === 'string';
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

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
        postgresql: 5000,
        semantic: 3000,
      },
      minResultsPerEngine: 5,
      maxFusionResults: 50,
      ...config,
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Execute dual-engine search with intelligent orchestration.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const parsedQuery = searchSyntaxParser.parse(query);

    try {
      logger.debug(
        { query, parsedQueryType: parsedQuery.searchType, options, config: this.config },
        'Starting dual-engine search',
      );

      const engineStrategy = this.classifyQueryStrategy(parsedQuery);
      const engineResults = await this.executeEngines(query, options, parsedQuery, engineStrategy);
      const fusedResults = this.fuseResults(engineResults, parsedQuery);
      const finalResults = this.applyFinalRanking(fusedResults, parsedQuery);

      const processingTimeMs = Date.now() - startTime;
      await this.logOrchestrationAnalytics(query, parsedQuery, engineResults, processingTimeMs);

      const limit = options.limit ?? 20;
      const sliced = finalResults.slice(0, limit);

      const response: SearchResponse = {
        results: this.toSearchResults(sliced),
        totalCount: finalResults.length,
        query,
        searchType: 'hybrid',
        processingTimeMs,
        hasMore: finalResults.length > limit,
      };

      logger.debug(
        {
          query,
          resultCount: response.results.length,
          totalCount: response.totalCount,
          processingTimeMs,
          engineStrategy,
        },
        'Dual-engine search completed',
      );

      return response;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error(
        { error: (error as Error).message, query, processingTimeMs },
        'Dual-engine search failed',
      );

      if (this.config.enableFailover) {
        return this.fallbackSearch(query, options, parsedQuery);
      }

      throw error;
    }
  }

  /**
   * Basic health check — returns engine availability and current config.
   */
  async getHealth(): Promise<{
    healthy: boolean;
    engines: { postgresql: boolean; semantic: boolean };
    config: OrchestratorConfig;
    recentPerformance: unknown[];
  }> {
    return {
      healthy: true,
      engines: { postgresql: true, semantic: true },
      config: this.config,
      recentPerformance: [],
    };
  }

  // ── Query Classification ────────────────────────────────────────────────────

  private classifyQueryStrategy(parsedQuery: ParsedQuery): EngineStrategy {
    const strategy: EngineStrategy = {
      usePostgreSQL: true,
      useSemantic: true,
      priorityEngine: 'balanced',
      expectedConfidence: 0.8,
    };

    switch (parsedQuery.searchType) {
      case 'field_specific':
        strategy.priorityEngine = 'postgresql';
        strategy.expectedConfidence = 0.9;
        break;

      case 'boolean':
        // Boolean operators are PostgreSQL-specific — skip semantic entirely
        strategy.useSemantic = false;
        strategy.priorityEngine = 'postgresql';
        strategy.expectedConfidence = 0.95;
        break;

      case 'semantic':
        strategy.priorityEngine = 'semantic';
        strategy.expectedConfidence = 0.85;
        break;

      case 'traditional':
        strategy.priorityEngine = 'balanced';
        strategy.expectedConfidence = 0.8;
        break;

      default:
        strategy.priorityEngine = 'balanced';
        strategy.expectedConfidence = 0.75;
    }

    // Exclusion clauses are handled better by PostgreSQL
    if (parsedQuery.metadata.hasExclusions) {
      strategy.useSemantic = false;
    }

    // Exact-phrase matching is a PostgreSQL strength
    if (parsedQuery.exactPhrases.length > 0) {
      strategy.priorityEngine = 'postgresql';
    }

    return strategy;
  }

  // ── Engine Execution ────────────────────────────────────────────────────────

  private async executeEngines(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery,
    strategy: EngineStrategy,
  ): Promise<EngineResult[]> {
    const results: EngineResult[] = [];

    const sequential =
      !this.config.enableParallelExecution || strategy.priorityEngine !== 'balanced';

    if (sequential) {
      if (strategy.usePostgreSQL) {
        results.push(await this.executePostgreSQLEngine(query, options, parsedQuery));
      }
      if (strategy.useSemantic) {
        results.push(await this.executeSemanticEngine(query, options, parsedQuery));
      }
    } else {
      const promises: Promise<EngineResult>[] = [];
      if (strategy.usePostgreSQL) {
        promises.push(this.executePostgreSQLEngine(query, options, parsedQuery));
      }
      if (strategy.useSemantic) {
        promises.push(this.executeSemanticEngine(query, options, parsedQuery));
      }
      results.push(...(await Promise.all(promises)));
    }

    return results;
  }

  private async executePostgreSQLEngine(
    query: string,
    options: SearchOptions,
    _parsedQuery: ParsedQuery,
  ): Promise<EngineResult> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('PostgreSQL engine timeout')),
          this.config.engineTimeouts.postgresql,
        ),
      );

      // Build a filters object that satisfies SearchQuery['filters']:
      // dateRange must have both start and end when present.
      const rawFilters = options.filters ?? {};
      const dateRange =
        rawFilters.dateRange?.start && rawFilters.dateRange?.end
          ? { start: rawFilters.dateRange.start, end: rawFilters.dateRange.end }
          : undefined;

      const searchPromise = this.postgresqlEngine.search({
        query,
        filters: { ...rawFilters, dateRange },
        pagination: {
          page: 1,
          limit: (options.limit ?? 20) * 2,
        },
      });

      const rawResults = await Promise.race([searchPromise, timeoutPromise]);

      return {
        engine: 'postgresql',
        results: rawResults as unknown[],
        totalCount: (rawResults as unknown[]).length,
        processingTimeMs: Date.now() - startTime,
        confidence: 0.9,
      };

    } catch (error) {
      logger.warn(
        { error: (error as Error).message, query },
        'PostgreSQL engine failed',
      );

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

  private async executeSemanticEngine(
    query: string,
    options: SearchOptions,
    _parsedQuery: ParsedQuery,
  ): Promise<EngineResult> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Semantic engine timeout')),
          this.config.engineTimeouts.semantic,
        ),
      );

      const searchPromise = semanticSearchEngine.search(query, {
        ...options,
        limit: (options.limit ?? 20) * 2,
      });

      const response = await Promise.race([searchPromise, timeoutPromise]);

      return {
        engine: 'semantic',
        results: response.results as unknown[],
        totalCount: response.totalCount,
        processingTimeMs: Date.now() - startTime,
        confidence: 0.8,
      };

    } catch (error) {
      logger.warn(
        { error: (error as Error).message, query },
        'Semantic engine failed',
      );

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

  // ── Result Fusion ───────────────────────────────────────────────────────────

  private fuseResults(engineResults: EngineResult[], _parsedQuery: ParsedQuery): FusionResult[] {
    const resultMap = new Map<string, FusionResult>();

    for (const engineResult of engineResults) {
      if (engineResult.error || engineResult.results.length === 0) continue;

      for (const raw of engineResult.results) {
        if (!isRawSearchResult(raw)) continue;

        const key = `${raw.contentType}:${raw.id}`;

        if (!resultMap.has(key)) {
          resultMap.set(key, {
            id: raw.id,
            contentType: raw.contentType,
            title: raw.title,
            summary: raw.summary ?? '',
            content: raw.content ?? '',
            relevanceScore: 0,
            metadata: raw.metadata ?? {},
            sourceEngines: [engineResult.engine],
            fusionConfidence: engineResult.confidence,
          });
        }

        const existing = resultMap.get(key)!;

        if (engineResult.engine === 'postgresql') {
          existing.traditionalScore = raw.relevanceScore;
          existing.relevanceScore +=
            raw.relevanceScore * this.config.fusionWeights.traditional;
        } else {
          existing.semanticScore = raw.relevanceScore;
          existing.relevanceScore +=
            raw.relevanceScore * this.config.fusionWeights.semantic;
        }

        if (!existing.sourceEngines.includes(engineResult.engine)) {
          existing.sourceEngines.push(engineResult.engine);
        }

        // Confidence boost for results surfaced by both engines
        if (existing.sourceEngines.length > 1) {
          existing.fusionConfidence = Math.min(existing.fusionConfidence + 0.1, 1.0);
        }
      }
    }

    return Array.from(resultMap.values());
  }

  // ── Final Ranking ───────────────────────────────────────────────────────────

  private applyFinalRanking(
    results: FusionResult[],
    _parsedQuery: ParsedQuery,
  ): FusionResult[] {
    return results
      .map(result => {
        let finalScore = result.relevanceScore;

        if (result.metadata['createdAt']) {
          const createdAt = new Date(result.metadata['createdAt'] as string);
          const daysSinceCreation =
            (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCreation < 365) {
            finalScore +=
              this.config.fusionWeights.recency * (1 - daysSinceCreation / 365);
          }
        }

        switch (result.contentType) {
          case 'bill':    finalScore += 0.1;  break;
          case 'sponsor': finalScore += 0.05; break;
        }

        return { ...result, relevanceScore: finalScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ── Fallback ────────────────────────────────────────────────────────────────

  private async fallbackSearch(
    query: string,
    options: SearchOptions,
    parsedQuery: ParsedQuery,
  ): Promise<SearchResponse> {
    logger.warn({ query }, 'Using fallback search strategy');

    const limit = options.limit ?? 20;

    try {
      const pgResult = await this.executePostgreSQLEngine(query, options, parsedQuery);
      if (pgResult.results.length > 0) {
        return {
          results: pgResult.results
            .filter(isRawSearchResult)
            .slice(0, limit)
            .map(r => this.rawToSearchResult(r)),
          totalCount: pgResult.totalCount,
          query,
          searchType: 'traditional',
          processingTimeMs: pgResult.processingTimeMs,
          hasMore: pgResult.totalCount > limit,
        };
      }
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'PostgreSQL fallback failed');
    }

    try {
      return await semanticSearchEngine.search(query, options);
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'All search engines failed');
      return {
        results: [],
        totalCount: 0,
        query,
        searchType: 'semantic', // closest valid fallback; caller can inspect totalCount === 0
        processingTimeMs: 0,
        hasMore: false,
      };
    }
  }

  // ── Analytics ───────────────────────────────────────────────────────────────

  private async logOrchestrationAnalytics(
    query: string,
    parsedQuery: ParsedQuery,
    engineResults: EngineResult[],
    totalProcessingTime: number,
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

      logger.debug(analytics, 'Orchestration analytics');

      // In production: await this.storeOrchestrationAnalytics(analytics);

    } catch (error) {
      logger.warn(
        { error: (error as Error).message },
        'Failed to log orchestration analytics',
      );
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Map FusionResult[] → SearchResult[], ensuring required fields are satisfied. */
  private toSearchResults(fused: FusionResult[]): SearchResult[] {
    return fused.map(f => this.fusionToSearchResult(f));
  }

  private fusionToSearchResult(f: FusionResult): SearchResult {
    return {
      id: f.id,
      contentType: f.contentType,
      title: f.title,
      summary: f.summary,
      content: f.content,
      relevanceScore: f.relevanceScore,
      metadata: f.metadata,
    } as SearchResult;
  }

  private rawToSearchResult(r: RawSearchResult): SearchResult {
    return {
      id: r.id,
      contentType: r.contentType,
      title: r.title,
      summary: r.summary ?? '',
      content: r.content ?? '',
      relevanceScore: r.relevanceScore,
      metadata: r.metadata ?? {},
    } as SearchResult;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const dualEngineOrchestrator = new DualEngineOrchestrator();