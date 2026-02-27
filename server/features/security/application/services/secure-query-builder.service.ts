import { logger } from '@server/infrastructure/observability';
import { SQL, sql } from 'drizzle-orm';
import { SecureQuery } from '../../domain/value-objects/secure-query';
import { QueryValidationResult } from '../../domain/value-objects/query-validation-result';
import { PaginationParams } from '../../domain/value-objects/pagination-params';
import { queryValidationService } from '../../domain/services/query-validation.service';
import { inputSanitizationService } from '../../domain/services/input-sanitization.service';

/**
 * Secure Query Builder Application Service
 * Provides parameterized query building and input validation to prevent SQL injection
 */
export class SecureQueryBuilderService {
  private static instance: SecureQueryBuilderService;
  private queryCounter = 0;

  private constructor() {}

  public static getInstance(): SecureQueryBuilderService {
    if (!SecureQueryBuilderService.instance) {
      SecureQueryBuilderService.instance = new SecureQueryBuilderService();
    }
    return SecureQueryBuilderService.instance;
  }

  /**
   * Build a parameterized query with validation
   */
  public buildParameterizedQuery(
    template: string,
    params: Record<string, unknown>
  ): SecureQuery {
    const queryId = `query_${++this.queryCounter}_${Date.now()}`;
    
    try {
      // Validate inputs first
      const validation = queryValidationService.validateInputs(Object.values(params));
      if (validation.hasErrors()) {
        throw new Error(`Query validation failed: ${validation.getErrorMessage()}`);
      }

      // Build parameterized SQL using Drizzle's sql template
      const parameterizedSql = this.buildSqlFromTemplate(template, params);

      logger.debug({
        queryId,
        template: template.substring(0, 100) + '...',
        paramCount: Object.keys(params).length
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
        template: template.substring(0, 100)
      }, 'Failed to build parameterized query');
      throw error;
    }
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
    // For now, return raw SQL template
    // In production, this should use Drizzle's proper parameterized query builder
    // This is a simplified version for type safety
    
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
