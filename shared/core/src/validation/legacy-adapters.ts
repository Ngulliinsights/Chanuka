/**
 * Legacy Validation Adapters
 * 
 * Adapters to integrate existing validation implementations with the core validation system
 */

import { z } from 'zod';
import { ValidationService } from './validation-service';
import { ValidationResult, ValidationError } from './types';
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
  validatePropertyId(id: string): ValidationResult<number> {
    const schema = z.string().transform((val) => {
      const parsed = parseInt(val.trim());
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Property ID must be a positive number');
      }
      return parsed;
    });

    try {
      const result = this.validationService.validateSafe(schema, id);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'Property ID validation failed' 
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
  validateUserId(userId: unknown): ValidationResult<number> {
    const schema = z.union([z.string(), z.number()]).transform((val) => {
      const parsed = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('User ID must be a positive number');
      }
      return parsed;
    });

    try {
      const result = this.validationService.validateSafe(schema, userId);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'User ID validation failed' 
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
  validateEmail(email: string): ValidationResult<string> {
    const schema = z.string().email('Invalid email format').min(1, 'Email is required');

    try {
      const result = this.validationService.validateSafe(schema, email);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'Email validation failed' 
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
  validatePassword(password: string): ValidationResult<string> {
    const schema = z.string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

    try {
      const result = this.validationService.validateSafe(schema, password);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'Password validation failed' 
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
  validateUsername(username: string): ValidationResult<string> {
    const schema = z.string()
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username must be no more than 30 characters long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

    try {
      const result = this.validationService.validateSafe(schema, username);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'Username validation failed' 
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
  validateSearchFilters(filters: unknown): ValidationResult<any> {
    const schema = z.object({
      location: z.string().optional(),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().min(0).optional(),
      propertyType: z.string().optional(),
      bedrooms: z.number().min(0).optional(),
      bathrooms: z.number().min(0).optional(),
      verified: z.boolean().optional()
    }).partial();

    try {
      const result = this.validationService.validateSafe(schema, filters);
      if (result.success) {
        return { valid: true, data: result.data };
      } else {
        return { 
          valid: false, 
          error: result.error.issues[0]?.message || 'Search filters validation failed' 
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
    body?: z.ZodSchema<any>;
    query?: z.ZodSchema<any>;
    params?: z.ZodSchema<any>;
  }) {
    return async (req: any, res: any, next: any) => {
      try {
        const correlationId = req.correlationId || `req_${Date.now()}`;

        // Validate body
        if (config.body && req.body) {
          const bodyResult = this.validationService.validateSafe(config.body, req.body);
          if (!bodyResult.success) {
            throw new ValidationError('Request body validation failed', {
              issues: bodyResult.error.issues,
              correlationId
            });
          }
          req.validatedBody = bodyResult.data;
        }

        // Validate query
        if (config.query && req.query) {
          const queryResult = this.validationService.validateSafe(config.query, req.query);
          if (!queryResult.success) {
            throw new ValidationError('Query parameters validation failed', {
              issues: queryResult.error.issues,
              correlationId
            });
          }
          req.validatedQuery = queryResult.data;
        }

        // Validate params
        if (config.params && req.params) {
          const paramsResult = this.validationService.validateSafe(config.params, req.params);
          if (!paramsResult.success) {
            throw new ValidationError('Path parameters validation failed', {
              issues: paramsResult.error.issues,
              correlationId
            });
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
          details: error.details,
          correlationId: error.details?.correlationId
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






