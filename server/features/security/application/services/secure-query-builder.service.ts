import { logger } from '@server/infrastructure/observability';
import { SQL, sql } from 'drizzle-orm';
import { SecureQuery } from '../../domain/value-objects/secure-query';
import { QueryValidationResult } from '../../domain/value-objects/query-validation-result';
import { PaginationParams } from '../../domain/value-objects/pagination-params';
import { queryValidationService } from '../../domain/services/query-validation.service';
import { inputSanitizationService } from '../../domain/services/input-sanitization.service';
import { QueryMetricsService } from '../../infrastructure/metrics/query-metrics.service';
import { SecurityConfig, defaultSecurityConfig } from '../../domain/config/security-config';

interface BulkOperationOptions {
  batchSize?: number;
  validateEach?: boolean;
  continueOnError?: boolean;
  timeout?: number;
}

interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{ 
    index: number; 
    error: string; 
    data: unknown;
    retryable: boolean;
  }>;
  totalProcessed: number;
  checkpointId?: string;
}

interface QueryOptions {
  timeout?: number;
  skipValidation?: boolean;
}

/**
 * Secure Query Builder Application Service
 * 
 * KEY FEATURES:
 * 1. Dependency injection instead of singleton
 * 2. Proper SQL parameterization using Drizzle's sql template tag
 * 3. Externalized metrics service
 * 4. Query timeout support
 * 5. Enhanced bulk operation error handling with retry support
 * 6. Configurable behavior via SecurityConfig
 * 
 * SECURITY FEATURES:
 * - SQL injection prevention via parameterization
 * - Input validation and sanitization
 * - Identifier validation for table/column names
 * - Output sanitization to prevent data leakage
 * - Query timeout to prevent DoS
 */
export class SecureQueryBuilderService {
  private queryCounter = 0;
  private readonly metricsService: QueryMetricsService;
  private readonly config: SecurityConfig;

  constructor(
    config: Partial<SecurityConfig> = {},
    metricsService?: QueryMetricsService
  ) {
    this.config = { ...defaultSecurityConfig, ...config };
    this.metricsService = metricsService || new QueryMetricsService(this.config.maxMetricsHistory);
  }

  /**
   * Build a parameterized query with validation and performance monitoring
   * 
   * CRITICAL: Uses Drizzle's sql template tag for proper parameterization
   * This is the SAFE way to build dynamic queries
   */
  public buildParameterizedQuery(
    queryBuilder: (params: Record<string, unknown>) => SQL,
    params: Record<string, unknown>,
    options: QueryOptions = {}
  ): SecureQuery {
    const queryId = `query_${++this.queryCounter}_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Validate inputs first (unless explicitly skipped)
      if (!options.skipValidation) {
        const validation = queryValidationService.validateInputs(Object.values(params));
        if (validation.hasErrors()) {
          throw new Error(`Query validation failed: ${validation.getErrorMessage()}`);
        }
      }

      // Build parameterized SQL using the provided query builder
      // The query builder MUST use Drizzle's sql template tag
      const parameterizedSql = queryBuilder(params);

      // Add timeout if specified
      const timeout = options.timeout || this.config.defaultQueryTimeout;
      const sqlWithTimeout = this.wrapWithTimeout(parameterizedSql, timeout);

      const duration = Date.now() - startTime;
      
      if (this.config.enablePerformanceMonitoring) {
        this.metricsService.recordMetric({
          queryId,
          duration,
          paramCount: Object.keys(params).length,
          timestamp: new Date()
        });
      }

      if (this.config.enableQueryLogging) {
        logger.debug({
          queryId,
          paramCount: Object.keys(params).length,
          duration,
          timeout
        }, 'Built secure parameterized query');
      }

      return SecureQuery.create(
        sqlWithTimeout,
        params,
        queryId
      );
    } catch (error) {
      logger.error({
        queryId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      }, 'Failed to build parameterized query');
      throw error;
    }
  }

  /**
   * Build complex query with JOINs
   * Uses proper SQL template tag for safety
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

    if (select) {
      select.forEach(col => this.validateIdentifier(col));
    }

    // Build query using sql template tag
    const queryBuilder = (params: Record<string, unknown>) => {
      // This is a simplified example - in production, you'd build this more dynamically
      // The key is to ALWAYS use sql template tag, never string concatenation
      const whereConditions = Object.entries(params).map(([key, value]) => 
        sql`${sql.identifier(key)} = ${value}`
      );
      
      // Build SELECT clause safely
      const selectClause = select && select.length > 0
        ? sql.join(select.map(col => sql.identifier(col)), sql`, `)
        : sql`*`;
      
      // Build JOIN clauses safely
      const joinClauses = joins.map(j => {
        const joinType = j.type || 'INNER';
        // Parse the ON clause to extract table.column = table.column format
        const onParts = j.on.split('=').map(p => p.trim());
        if (onParts.length === 2) {
          const [left, right] = onParts;
          const leftParts = left!.split('.');
          const rightParts = right!.split('.');
          if (leftParts.length === 2 && rightParts.length === 2) {
            return sql`${sql.raw(joinType)} JOIN ${sql.identifier(j.table)} ON ${sql.identifier(leftParts[0]!)}.${sql.identifier(leftParts[1]!)} = ${sql.identifier(rightParts[0]!)}.${sql.identifier(rightParts[1]!)}`;
          }
        }
        // Fallback for complex ON clauses - should be validated separately
        throw new Error(`Complex JOIN ON clause not supported: ${j.on}`);
      });
      
      return sql`
        SELECT ${selectClause}
        FROM ${sql.identifier(baseTable)}
        ${sql.join(joinClauses, sql` `)}
        WHERE ${sql.join(whereConditions, sql` AND `)}
      `;
    };

    return this.buildParameterizedQuery(queryBuilder, where);
  }

  /**
   * Execute bulk operations with enhanced error handling
   * 
   * IMPROVEMENTS:
   * - Retryable flag on failures
   * - Checkpoint support for resuming
   * - Better error categorization
   */
  public async executeBulkOperation<T>(
    items: unknown[],
    operation: (item: unknown) => Promise<T>,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult<T>> {
    const {
      batchSize = this.config.defaultBatchSize,
      validateEach = true,
      continueOnError = false,
      timeout
    } = options;

    const result: BulkOperationResult<T> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      checkpointId: `checkpoint_${Date.now()}`
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

          // Execute with timeout if specified
          const operationResult = timeout
            ? await this.executeWithTimeout(operation(item), timeout)
            : await operation(item);
            
          result.successful.push(operationResult);
          result.totalProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const retryable = this.isRetryableError(error);
          
          result.failed.push({ 
            index, 
            error: errorMessage, 
            data: item,
            retryable
          });
          result.totalProcessed++;

          if (!continueOnError) {
            logger.error({
              index,
              error: errorMessage,
              totalProcessed: result.totalProcessed,
              checkpointId: result.checkpointId
            }, 'Bulk operation failed, stopping');
            return result;
          }

          logger.warn({
            index,
            error: errorMessage,
            retryable
          }, 'Bulk operation item failed, continuing');
        }
      }
    }

    logger.info({
      total: items.length,
      successful: result.successful.length,
      failed: result.failed.length,
      retryableFailures: result.failed.filter(f => f.retryable).length
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
   * Validate SQL identifier (table/column name)
   * Identifiers cannot be parameterized, so they need strict validation
   */
  private validateIdentifier(identifier: string): string {
    // Only allow alphanumeric, underscore, and dot (for qualified names)
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
    
    // Additional check: prevent SQL keywords
    const sqlKeywords = ['SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION', 'WHERE'];
    if (sqlKeywords.includes(identifier.toUpperCase())) {
      throw new Error(`SQL keyword not allowed as identifier: ${identifier}`);
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
   * Wrap SQL with timeout
   */
  private wrapWithTimeout(query: SQL, timeoutMs: number): SQL {
    // PostgreSQL-specific timeout
    // For other databases, this would need to be adapted
    return sql`
      SET LOCAL statement_timeout = ${timeoutMs};
      ${query}
    `;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const retryablePatterns = [
      /timeout/i,
      /connection/i,
      /deadlock/i,
      /lock wait timeout/i,
      /temporary/i
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return this.metricsService.getMetrics();
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.metricsService.clearMetrics();
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

// Export factory function instead of singleton
export function createSecureQueryBuilderService(
  config?: Partial<SecurityConfig>,
  metricsService?: QueryMetricsService
): SecureQueryBuilderService {
  return new SecureQueryBuilderService(config, metricsService);
}

// Export default instance for backward compatibility
export const secureQueryBuilderService = createSecureQueryBuilderService();
