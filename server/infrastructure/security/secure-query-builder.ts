import { sql, SQL, Placeholder } from 'drizzle-orm';
import { z } from 'zod';
import { logger  } from '@shared/core/src/index.js';

/**
 * Secure Query Builder Service
 * Provides parameterized query building and input validation to prevent SQL injection
 */

export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedParams?: Record<string, any>;
}

export interface SecureQuery {
  sql: SQL;
  params: Record<string, any>;
  queryId: string;
}

export class SecureQueryBuilder {
  private static instance: SecureQueryBuilder;
  private queryCounter = 0;

  private constructor() {}

  public static getInstance(): SecureQueryBuilder {
    if (!SecureQueryBuilder.instance) {
      SecureQueryBuilder.instance = new SecureQueryBuilder();
    }
    return SecureQueryBuilder.instance;
  }

  /**
   * Build a parameterized query with validation
   */
  public buildParameterizedQuery(
    template: string,
    params: Record<string, any>
  ): SecureQuery {
    const queryId = `query_${++this.queryCounter}_${Date.now()}`;
    
    try {
      // Validate inputs first
      const validation = this.validateInputs(Object.values(params));
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      // Build parameterized SQL using Drizzle's sql template
      const parameterizedSql = this.buildSqlFromTemplate(template, params);

      logger.debug('Built secure parameterized query', {
        queryId,
        template: template.substring(0, 100) + '...',
        paramCount: Object.keys(params).length
      });

      return {
        sql: parameterizedSql,
        params: validation.sanitizedParams || params,
        queryId
      };
    } catch (error) {
      logger.error('Failed to build parameterized query', {
        queryId,
        error: error instanceof Error ? error.message : String(error),
        template: template.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Validate and sanitize query inputs
   */
  public validateInputs(inputs: unknown[]): QueryValidationResult {
    const errors: string[] = [];
    const sanitizedParams: Record<string, any> = {};

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const paramKey = `param_${i}`;

      try {
        // Basic type validation and sanitization
        if (input === null || input === undefined) {
          sanitizedParams[paramKey] = null;
          continue;
        }

        if (typeof input === 'string') {
          // Sanitize string inputs
          const sanitized = this.sanitizeStringInput(input);
          if (sanitized.length > 10000) {
            errors.push(`Parameter ${i}: String too long (max 10000 characters)`);
            continue;
          }
          sanitizedParams[paramKey] = sanitized;
        } else if (typeof input === 'number') {
          // Validate numeric inputs
          if (!Number.isFinite(input)) {
            errors.push(`Parameter ${i}: Invalid number`);
            continue;
          }
          sanitizedParams[paramKey] = input;
        } else if (typeof input === 'boolean') {
          sanitizedParams[paramKey] = input;
        } else if (input instanceof Date) {
          sanitizedParams[paramKey] = input;
        } else if (Array.isArray(input)) {
          // Validate array inputs
          if (input.length > 1000) {
            errors.push(`Parameter ${i}: Array too large (max 1000 items)`);
            continue;
          }
          const sanitizedArray = input.map(item => 
            typeof item === 'string' ? this.sanitizeStringInput(item) : item
          );
          sanitizedParams[paramKey] = sanitizedArray;
        } else {
          // For objects, stringify and validate
          try {
            const jsonString = JSON.stringify(input);
            if (jsonString.length > 50000) {
              errors.push(`Parameter ${i}: Object too large`);
              continue;
            }
            sanitizedParams[paramKey] = input;
          } catch {
            errors.push(`Parameter ${i}: Invalid object`);
          }
        }
      } catch (error) {
        errors.push(`Parameter ${i}: Validation error - ${error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedParams: errors.length === 0 ? sanitizedParams : undefined
    };
  }

  /**
   * Sanitize string inputs to prevent injection attacks
   */
  private sanitizeStringInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '');
    
    // Remove or escape potentially dangerous SQL keywords in user input
    // Note: This is defense in depth - parameterized queries are the primary protection
    const dangerousPatterns = [
      /--/g,           // SQL comments
      /\/\*/g,         // Block comment start
      /\*\//g,         // Block comment end
      /;[\s]*$/g,      // Trailing semicolons
    ];

    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Build SQL from template with parameters
   */
  private buildSqlFromTemplate(template: string, params: Record<string, any>): SQL {
    // Replace named parameters in template with Drizzle placeholders
    let processedTemplate = template;
    const placeholders: Placeholder[] = [];

    // Find all parameter placeholders in the format ${paramName}
    const paramRegex = /\$\{(\w+)\}/g;
    let match;
    
    while ((match = paramRegex.exec(template)) !== null) {
      const paramName = match[1];
      if (params.hasOwnProperty(paramName)) {
        const placeholder = new Placeholder(params[paramName]);
        placeholders.push(placeholder);
        processedTemplate = processedTemplate.replace(match[0], '?');
      } else {
        throw new Error(`Missing parameter: ${paramName}`);
      }
    }

    // Create SQL object with placeholders
    return sql.raw(processedTemplate, ...placeholders);
  }

  /**
   * Sanitize output data to prevent data leakage
   */
  public sanitizeOutput(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remove sensitive fields that shouldn't be exposed
        if (this.isSensitiveField(key)) {
          continue;
        }
        
        sanitized[key] = this.sanitizeOutput(value);
      }
      
      return sanitized;
    }

    if (typeof data === 'string') {
      // Remove any potential XSS vectors from output
      return this.sanitizeHtmlOutput(data);
    }

    return data;
  }

  /**
   * Check if a field contains sensitive information
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'password_hash',
      'password_hash',
      'token',
      'secret',
      'key',
      'salt',
      'refreshToken',
      'refresh_token',
      'accessToken',
      'access_token',
      'sessionId',
      'session_id'
    ];

    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Sanitize HTML output to prevent XSS
   */
  private sanitizeHtmlOutput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Basic HTML entity encoding for common XSS vectors
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Create a safe LIKE pattern for search queries
   */
  public createSafeLikePattern(searchTerm: string): string {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return '%';
    }

    // Escape special LIKE characters
    const escaped = searchTerm
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape percent signs
      .replace(/_/g, '\\_');   // Escape underscores

    return `%${escaped}%`;
  }

  /**
   * Validate and sanitize pagination parameters
   */
  public validatePaginationParams(page?: string, limit?: string): {
    page: number;
    limit: number;
    offset: number;
  } {
    const pageNum = Math.max(1, parseInt(page || '1') || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20') || 20));
    const offset = (pageNum - 1) * limitNum;

    return { page: pageNum, limit: limitNum, offset };
  }
}

// Export singleton instance
export const secureQueryBuilder = SecureQueryBuilder.getInstance();
