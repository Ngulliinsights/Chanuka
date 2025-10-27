/**
 * Legacy Validation Adapters
 * 
 * Adapters to integrate existing validation implementations with the core validation system
 */

import { z } from 'zod';
import { ValidationService } from './validation-service';
import { ValidationResult, ValidationError, LegacyValidationResult } from './types';
import { logger } from '../observability/logging';

/**
 * Adapter for the existing validators from server/utils/validators.ts
 */
export class LegacyValidatorsAdapter {
  private validationService: ValidationService;

  constructor(validationService: ValidationService) {
    this.validationService = validationService;
  }

  /**
   * Validates property ID using core validation system
   */
  async validatePropertyId(id: string | number): Promise<LegacyValidationResult<number>> {
    const schema = z.union([z.string(), z.number()]).transform((val) => {
      const parsed = typeof val === 'string' ? parseInt(val.trim(), 10) : Number(val);
      if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        throw new Error('Property ID must be a positive integer');
      }
      return parsed;
    });

    try {
      const result = await this.validationService.validateSafe(schema, id);
      if (result.success) {
        return { valid: true, data: result.data as number };
      } else {
        return {
          valid: false,
          error: result.error?.errors[0]?.message || 'Property ID validation failed'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Property ID validation failed'
      };
    }
  }

  /**
   * Validates user ID using core validation system
   */
  async validateUserId(userId: string | number): Promise<LegacyValidationResult<number>> {
    const schema = z.union([z.string(), z.number()]).transform((val) => {
      const parsed = typeof val === 'string' ? parseInt(val.toString().trim(), 10) : Number(val);
      if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        throw new Error('User ID must be a positive integer');
      }
      return parsed;
    });

    try {
      const result = await this.validationService.validateSafe(schema, userId);
      if (result.success) {
        return { valid: true, data: result.data as number };
      } else {
        return {
          valid: false,
          error: result.error?.errors[0]?.message || 'User ID validation failed'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'User ID validation failed'
      };
    }
  }

  /**
   * Validates email using core validation system
   */
  async validateEmail(email: string): Promise<LegacyValidationResult<string>> {
    const schema = z.string().email('Invalid email format').min(1, 'Email is required');

    try {
      const result = await this.validationService.validateSafe(schema, email);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error?.errors[0]?.message || 'Email validation failed' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Email validation failed' 
      };
    }
  }

  /**
   * Validates password using core validation system
   */
  async validatePassword(password: string): Promise<LegacyValidationResult<string>> {
    const schema = z.string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

    try {
      const result = await this.validationService.validateSafe(schema, password);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error?.errors[0]?.message || 'Password validation failed' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Password validation failed' 
      };
    }
  }

  /**
   * Validates username using core validation system
   */
  async validateUsername(username: string): Promise<LegacyValidationResult<string>> {
    const schema = z.string()
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username must be no more than 30 characters long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

    try {
      const result = await this.validationService.validateSafe(schema, username);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error?.errors[0]?.message || 'Username validation failed' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Username validation failed' 
      };
    }
  }

  /**
   * Sanitizes search query
   */
  sanitizeSearchQuery(query: string, maxLength: number = 100): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    return query.trim().substring(0, maxLength);
  }

  /**
   * Validates search filters using core validation system
   */
  async validateSearchFilters(filters: Record<string, unknown>): Promise<LegacyValidationResult<Record<string, unknown>>> {
    const schema = z.object({
      location: z.string().optional(),
      priceMin: z.union([z.string(), z.number()]).transform((val) => {
        const parsed = typeof val === 'string' ? parseFloat(val.trim()) : Number(val);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }).optional(),
      priceMax: z.union([z.string(), z.number()]).transform((val) => {
        const parsed = typeof val === 'string' ? parseFloat(val.trim()) : Number(val);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }).optional(),
      propertyType: z.string().optional(),
      bedrooms: z.union([z.string(), z.number()]).transform((val) => {
        const parsed = typeof val === 'string' ? parseInt(val.trim(), 10) : Number(val);
        return isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed) ? 0 : parsed;
      }).optional(),
      bathrooms: z.union([z.string(), z.number()]).transform((val) => {
        const parsed = typeof val === 'string' ? parseFloat(val.trim()) : Number(val);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }).optional(),
      verified: z.union([z.string(), z.boolean()]).transform((val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const lower = val.toLowerCase().trim();
          return lower === 'true' || lower === '1' || lower === 'yes';
        }
        return false;
      }).optional()
    }).partial();

    try {
      const result = await this.validationService.validateSafe(schema, filters);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return {
          valid: false,
          error: result.error?.errors[0]?.message || 'Search filters validation failed'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Search filters validation failed'
      };
    }
  }
}

/**
 * Adapter for middleware validation functions
 */
export class ValidationMiddlewareAdapter {
  private validationService: ValidationService;

  constructor(validationService: ValidationService) {
    this.validationService = validationService;
  }

  /**
   * Creates validation middleware compatible with existing patterns
   */
  createValidationMiddleware(config: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  }) {
    return async (req: any, res: any, next: any) => {
      try {
        const correlationId = req.correlationId || `req_${Date.now()}`;

        // Validate body
        if (config.body && req.body) {
          const bodyResult = await this.validationService.validateSafe(config.body, req.body);
          if (!bodyResult.success) {
            throw new ValidationError('Request body validation failed', bodyResult.error?.errors);
          }
          req.validatedBody = bodyResult.data;
        }

        // Validate query
        if (config.query && req.query) {
          const queryResult = await this.validationService.validateSafe(config.query, req.query);
          if (!queryResult.success) {
            throw new ValidationError('Query parameters validation failed', queryResult.error?.errors);
          }
          req.validatedQuery = queryResult.data;
        }

        // Validate params
        if (config.params && req.params) {
          const paramsResult = await this.validationService.validateSafe(config.params, req.params);
          if (!paramsResult.success) {
            throw new ValidationError('Path parameters validation failed', paramsResult.error?.errors);
          }
          req.validatedParams = paramsResult.data;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Creates validation error handler middleware
   */
  createValidationErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
          correlationId: req.correlationId
        });
      }
      next(error);
    };
  }
}

/**
 * Factory function to create legacy validation adapters
 */
export function createLegacyValidationAdapters(validationService: ValidationService) {
  return {
    validators: new LegacyValidatorsAdapter(validationService),
    middleware: new ValidationMiddlewareAdapter(validationService)
  };
}











































