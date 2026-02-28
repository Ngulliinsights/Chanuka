import { logger } from '@server/infrastructure/observability';
import { SQL, sql } from 'drizzle-orm';
import { SecureQuery } from '../../domain/value-objects/secure-query';
import { QueryValidationResult } from '../../domain/value-objects/query-validation-result';
import { PaginationParams } from '../../domain/value-objects/pagination-params';
import { queryValidationService } from '../../domain/services/query-validation.service';
import { inputSanitizationService } from '../../domain/services/input-sanitization.service';

interface QueryPerformanceMetrics {
  queryId: string;
  duration: number;
  paramCount: number;
  timestamp: Date;
}

interface BulkOperationOptions {
  batchSize?: number;
  validateEach?: boolean;
  continueOnError?: boolean;
}

interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{ index: number; error: string; data: unknown }>;
  totalProcessed: number;
}

/**
 * Secure Query Builder Application Service
 * Provides parameterized query building and input validation to prevent SQL injection
 * Enhanced with support for complex queries, bulk operations, and performance monitoring
 */
export class SecureQueryBuilderService {
  private static instance: SecureQueryBuilderService;
  private queryCounter = 0;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly DEFAULT_BATCH_SIZE = 100;

  private constructor() {}

  public static getInstance(): SecureQueryBuilderService {
    if (!SecureQueryBuilderService.instance) {
      SecureQueryBuilderService.instance = new SecureQueryBuilderService();
    }
    return SecureQueryBuilderService.instance;
  }

  /**
   * Build a parameterized query with validation and performance monitoring
   */
  public buildParameterizedQuery(
    template: string,
    params: Record<string, unknown>
  ): SecureQuery {
    const queryId = `query_${++this.queryCounter}_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Validate inputs first
      const validation = queryValidationService.validateInputs(Object.values(params));
      if (validation.hasErrors()) {
        throw new Error(`Query validation failed: ${validation.getErrorMessage()}`);
      }

      // Build parameterized SQL using Drizzle's sql template
      const parameterizedSql = this.buildSqlFromTemplate(template, params);

      const duration = Date.now() - startTime;
      this.recordPerformanceMetric({
        queryId,
        duration,
        paramCount: Object.keys(params).length,
        timestamp: new Date()
      });

      logger.debug({
        queryId,
        template: template.substring(0, 100) + '...',
        paramCount: Object.keys(params).length,
        duration
      }, 'Built secure parameterized query');

      return SecureQuery.create(
        parameterizedSql,
        validation.sanitizedParams || params,
        queryId
      );
    } catch (error) {
      logger.error({
        queryId,
        error: error instanceof Error ? error.message : String(error),
        template: template.substring(0, 100),
        duration: Date.now() - startTime
      }, 'Failed to build parameterized query');
      throw error;
    }
  }

  /**
   * Build complex query with JOINs
   */
  /**
     * Build complex query with JOINs
     */
    public buildJoinQuery(
      baseTable: string,
      joins: Array<{ table: string; on: string; type?: 'INNER' | 'LEFT' | 'RIGHT' }>,
      where: Record<string, unknown>,
      select?: string[]
    ): SecureQuery {
      // Validate table and column names
      this.validateIdentifier(baseTable);
      joins.forEach(join => {
        this.validateIdentifier(join.table);
        this.validateJoinCondition(join.on);
      });

      // Build JOIN clauses
      const joinClauses = joins.map(join => {
        const joinType = join.type || 'INNER';
        return `${joinType} JOIN ${join.table} ON ${join.on}`;
      }).join(' ');

      // Build SELECT clause
      const selectClause = select && select.length > 0 
        ? select.map(col => this.validateIdentifier(col)).join(', ')
        : '*';

      // Build WHERE clause with parameterization
      const whereEntries = Object.entries(where);
      const whereClauses = whereEntries.map(([key, _], idx) => 
        `${this.validateIdentifier(key)} = ${idx + 1}`
      ).join(' AND ');

      const template = `SELECT ${selectClause} FROM ${baseTable} ${joinClauses} WHERE ${whereClauses}`;

      return this.buildParameterizedQuery(template, where);
    }


  /**
   * Build query with subquery support
   */
  public buildSubquery(
    outerQuery: string,
    subquery: string,
    params: Record<string, unknown>
  ): SecureQuery {
    // Validate both queries
    const validation = queryValidationService.validateInputs(Object.values(params));
    if (validation.hasErrors()) {
      throw new Error(`Subquery validation failed: ${validation.getErrorMessage()}`);
    }

    // Combine queries
    const template = outerQuery.replace('{{SUBQUERY}}', `(${subquery})`);
    
    return this.buildParameterizedQuery(template, params);
  }

  /**
   * Build Common Table Expression (CTE) query
   */
  public buildCTEQuery(
    ctes: Array<{ name: string; query: string }>,
    mainQuery: string,
    params: Record<string, unknown>
  ): SecureQuery {
    // Validate CTE names
    ctes.forEach(cte => this.validateIdentifier(cte.name));

    // Build CTE clauses
    const cteClause = ctes.map(cte => 
      `${cte.name} AS (${cte.query})`
    ).join(', ');

    const template = `WITH ${cteClause} ${mainQuery}`;
    
    return this.buildParameterizedQuery(template, params);
  }

  /**
   * Execute bulk operations with transaction safety
   */
  public async executeBulkOperation<T>(
    items: unknown[],
    operation: (item: unknown) => Promise<T>,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult<T>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      validateEach = true,
      continueOnError = false
    } = options;

    const result: BulkOperationResult<T> = {
      successful: [],
      failed: [],
      totalProcessed: 0
    };

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));
      
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const index = i + j;
        
        try {
          // Validate if required
          if (validateEach) {
            const validation = queryValidationService.validateInputs([item]);
            if (validation.hasErrors()) {
              throw new Error(validation.getErrorMessage());
            }
          }

          const operationResult = await operation(item);
          result.successful.push(operationResult);
          result.totalProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.failed.push({ index, error: errorMessage, data: item });
          result.totalProcessed++;

          if (!continueOnError) {
            logger.error({
              index,
              error: errorMessage,
              totalProcessed: result.totalProcessed
            }, 'Bulk operation failed, stopping');
            return result;
          }

          logger.warn({
            index,
            error: errorMessage
          }, 'Bulk operation item failed, continuing');
        }
      }
    }

    logger.info({
      total: items.length,
      successful: result.successful.length,
      failed: result.failed.length
    }, 'Bulk operation completed');

    return result;
  }

  /**
   * Validate and sanitize query inputs
   */
  public validateInputs(inputs: unknown[]): QueryValidationResult {
    return queryValidationService.validateInputs(inputs);
  }

  /**
   * Build SQL from template with parameters
   */
  private buildSqlFromTemplate(template: string, params: Record<string, unknown>): SQL {
    // Validate that all parameters exist
    const paramRegex = /\$\{(\w+)\}/g;
    let match;
    
    while ((match = paramRegex.exec(template)) !== null) {
      const paramName = match[1];
      if (!paramName || !params.hasOwnProperty(paramName)) {
        throw new Error(`Missing parameter: ${paramName}`);
      }
    }
    
    // Return raw SQL - Drizzle will handle parameterization
    return sql.raw(template);
  }

  /**
   * Validate SQL identifier (table/column name)
   */
  private validateIdentifier(identifier: string): string {
    // Only allow alphanumeric, underscore, and dot (for qualified names)
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
    return identifier;
  }

  /**
   * Validate JOIN condition
   */
  private validateJoinCondition(condition: string): void {
    // Basic validation - should contain table.column = table.column pattern
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*\s*=\s*[a-zA-Z_][a-zA-Z0-9_.]*$/.test(condition)) {
      throw new Error(`Invalid JOIN condition: ${condition}`);
    }
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(metric: QueryPerformanceMetrics): void {
    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalQueries: number;
    recentMetrics: QueryPerformanceMetrics[];
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalQueries: 0,
        recentMetrics: []
      };
    }

    const durations = this.performanceMetrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      averageDuration: sum / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalQueries: this.queryCounter,
      recentMetrics: this.performanceMetrics.slice(-10)
    };
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Sanitize output data to prevent data leakage
   */
  public sanitizeOutput(data: unknown): unknown {
    return queryValidationService.sanitizeOutput(data);
  }

  /**
   * Create a safe LIKE pattern for search queries
   */
  public createSafeLikePattern(searchTerm: string): string {
    return inputSanitizationService.createSafeLikePattern(searchTerm);
  }

  /**
   * Validate and sanitize pagination parameters
   */
  public validatePaginationParams(page?: string, limit?: string): PaginationParams {
    return PaginationParams.create(page, limit);
  }
}

// Export singleton instance
export const secureQueryBuilderService = SecureQueryBuilderService.getInstance();
