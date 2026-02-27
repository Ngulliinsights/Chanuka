/**
 * @deprecated This file is deprecated. Use @server/features/security instead.
 * 
 * Backward compatibility wrapper for secure query builder.
 * All functionality has been moved to server/features/security with proper DDD structure.
 * 
 * Migration path:
 * - Old: import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder'
 * - New: import { secureQueryBuilderService } from '@server/features/security'
 */

import { SQL } from 'drizzle-orm';
import { 
  secureQueryBuilderService,
  QueryValidationResult as NewQueryValidationResult,
  SecureQuery as NewSecureQuery,
  PaginationParams
} from '@server/features/security';

/**
 * @deprecated Use QueryValidationResult from @server/features/security
 */
export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedParams?: Record<string, unknown>;
}

/**
 * @deprecated Use SecureQuery from @server/features/security
 */
export interface SecureQuery {
  sql: SQL;
  params: Record<string, unknown>;
  queryId: string;
}

/**
 * @deprecated Use SecureQueryBuilderService from @server/features/security
 * 
 * Backward compatibility wrapper that delegates to the new DDD-structured service
 */
export class SecureQueryBuilder {
  private static instance: SecureQueryBuilder;

  private constructor() {}

  public static getInstance(): SecureQueryBuilder {
    if (!SecureQueryBuilder.instance) {
      SecureQueryBuilder.instance = new SecureQueryBuilder();
    }
    return SecureQueryBuilder.instance;
  }

  /**
   * @deprecated Use secureQueryBuilderService.buildParameterizedQuery()
   */
  public buildParameterizedQuery(
    template: string,
    params: Record<string, unknown>
  ): SecureQuery {
    return secureQueryBuilderService.buildParameterizedQuery(template, params);
  }

  /**
   * @deprecated Use secureQueryBuilderService.validateInputs()
   */
  public validateInputs(inputs: unknown[]): QueryValidationResult {
    const result = secureQueryBuilderService.validateInputs(inputs);
    return {
      isValid: result.isValid,
      errors: result.errors,
      sanitizedParams: result.sanitizedParams
    };
  }

  /**
   * @deprecated Use secureQueryBuilderService.sanitizeOutput()
   */
  public sanitizeOutput(data: unknown): unknown {
    return secureQueryBuilderService.sanitizeOutput(data);
  }

  /**
   * @deprecated Use secureQueryBuilderService.createSafeLikePattern()
   */
  public createSafeLikePattern(searchTerm: string): string {
    return secureQueryBuilderService.createSafeLikePattern(searchTerm);
  }

  /**
   * @deprecated Use secureQueryBuilderService.validatePaginationParams()
   */
  public validatePaginationParams(page?: string, limit?: string): {
    page: number;
    limit: number;
    offset: number;
  } {
    const params = secureQueryBuilderService.validatePaginationParams(page, limit);
    return {
      page: params.page,
      limit: params.limit,
      offset: params.offset
    };
  }
}

/**
 * @deprecated Use secureQueryBuilderService from @server/features/security
 */
export const secureQueryBuilder = SecureQueryBuilder.getInstance();
