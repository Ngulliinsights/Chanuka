import { validationMetricsCollector } from '@server/infrastructure/validation/validation-metrics';
import { logger } from '@server/infrastructure/observability';
import { ApiValidationError } from '@shared/types/api';
import { NextFunction,Request, Response } from 'express';
import { z } from 'zod';
import { emailSchema, userRoleSchema } from '@shared/validation';

import {
  commonZodSchemas,
  sanitizeHtml,
  sanitizeString,
  validateEmail,
  validatePhone,
  validateURL} from './validation-utils';

/**
 * Unified Input Validation Service
 * Combines comprehensive input validation, sanitization, security checks, and API middleware
 * Prevents SQL injection, XSS, and other injection attacks
 */

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FileValidationOptions {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export class InputValidationService {
  private static instance: InputValidationService;

  private readonly maxArrayLength = 1000;
  private readonly maxObjectDepth = 10;

  // SQL injection patterns to detect and block
  // cspell:disable SYSOBJECTS SYSCOLUMNS
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\s)|(\/\*)|(\*\/))/gi,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi,
    /(\bxp_\w+)/gi,
    /(\bsp_\w+)/gi,
  ];


  private constructor() {}

  public static getInstance(): InputValidationService {
    if (!InputValidationService.instance) {
      InputValidationService.instance = new InputValidationService();
    }
    return InputValidationService.instance;
  }

  /**
    * Validate API input against a Zod schema
    */
   public validateApiInput<T>(schema: z.ZodSchema<T>, input: unknown): ValidationResult {
     const endMetric = validationMetricsCollector.startValidation('InputValidationService', 'validateApiInput');

     try {
       const result = schema.safeParse(input);

       if (result.success) {
         endMetric();
         return {
           isValid: true,
           data: result.data,
           errors: []
         };
       } else {
         const errors: ValidationError[] = result.error.errors.map(err => ({
           field: err.path.join('.'),
           message: err.message,
           code: err.code
         }));

         // Categorize the first error for metrics
         const primaryError = errors[0];
         let errorCategory: 'security' | 'format' | 'business_logic' | 'system' = 'format';

         if (primaryError && (primaryError.message.toLowerCase().includes('security') ||
             primaryError.message.toLowerCase().includes('injection') ||
             primaryError.message.toLowerCase().includes('xss'))) {
           errorCategory = 'security';
         }

         endMetric(false, primaryError?.code || 'validation_error', errorCategory);

         logger.warn({
           component: 'input-validation',
           errors: errors.map(e => `${e.field}: ${e.message}`)
         }, 'Input validation failed');

         return {
           isValid: false,
           errors
         };
       }
     } catch (error) {
       endMetric(false, 'internal_error', 'system');

       logger.error({
         component: 'input-validation',
         error: error instanceof Error ? error.message : String(error)
       }, 'Validation error');

       return {
         isValid: false,
         errors: [{
           field: 'validation',
           message: 'Internal validation error'
         }]
       };
     }
   }

  /**
   * Sanitize string input to prevent injection attacks
   */
  sanitizeString(input: string, options: {
    allowHTML?: boolean;
    maxLength?: number;
    stripSQL?: boolean;
    stripXSS?: boolean;
  } = {}): string {
    return sanitizeString(input, options);
  }

  /**
   * Validate and sanitize email addresses
   */
  validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string } {
    const endMetric = validationMetricsCollector.startValidation('InputValidationService', 'validateEmail');
    const result = validateEmail(email);
    endMetric(result.isValid, result.isValid ? undefined : 'invalid_email', 'format');
    return result;
  }

  /**
   * Validate and sanitize URLs
   */
  validateURL(url: string): { isValid: boolean; sanitized?: string; error?: string } {
    return validateURL(url);
  }

  /**
   * Validate and sanitize phone numbers
   */
  validatePhone(phone: string): { isValid: boolean; sanitized?: string; error?: string } {
    return validatePhone(phone);
  }

  /**
   * Validate and sanitize JSON input
   */
  validateJSON(input: string): { isValid: boolean; parsed?: unknown; error?: string } {
    try {
      const sanitized = this.sanitizeString(input, {
        maxLength: 50000,
        stripSQL: false, // JSON might contain legitimate SQL-like strings
        stripXSS: false   // JSON might contain legitimate HTML-like strings
      });

      const parsed = JSON.parse(sanitized);

      // Check object depth and size
      if (!this.validateObjectStructure(parsed)) {
        return { isValid: false, error: 'JSON structure too complex or large' };
      }

      return { isValid: true, parsed };
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
  }

  /**
   * Validate object structure to prevent DoS attacks
   */
  private validateObjectStructure(obj: unknown, depth: number = 0): boolean {
    if (depth > this.maxObjectDepth) {
      return false;
    }

    if (Array.isArray(obj)) {
      if (obj.length > this.maxArrayLength) {
        return false;
      }
      return obj.every(item => this.validateObjectStructure(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record);
      if (keys.length > 100) { // Max 100 properties per object
        return false;
      }
      return keys.every(key => this.validateObjectStructure(record[key], depth + 1));
    }

    return true;
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  public sanitizeHtmlInput(input: string): string {
    return sanitizeHtml(input);
  }

  /**
   * Validate file upload
   */
  public validateFileUpload(file: { size: number; mimetype: string; originalname?: string }, options: FileValidationOptions): ValidationResult {
    const endMetric = validationMetricsCollector.startValidation('InputValidationService', 'validateFileUpload');
    const errors: ValidationError[] = [];

    if (!file) {
      errors.push({
        field: 'file',
        message: 'No file provided'
      });
      endMetric(false, 'no_file', 'business_logic');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > options.maxSize) {
      errors.push({
        field: 'file.size',
        message: `File size exceeds maximum allowed size of ${options.maxSize} bytes`
      });
    }

    // Check MIME type
    if (!options.allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: 'file.type',
        message: `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      });
    }

    // Check file extension
    const fileExtension = file.originalname?.split('.').pop()?.toLowerCase();
    if (!fileExtension || !options.allowedExtensions.includes(fileExtension)) {
      errors.push({
        field: 'file.extension',
        message: `File extension .${fileExtension} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`
      });
    }

    // Additional security checks
    if (this.containsMaliciousContent(file)) {
      errors.push({
        field: 'file.content',
        message: 'File contains potentially malicious content'
      });
    }

    const isValid = errors.length === 0;
    endMetric(isValid, isValid ? undefined : 'malicious_content', isValid ? undefined : 'security');

    return {
      isValid,
      errors
    };
  }

  /**
   * Create validation middleware for Express routes
   */
  public createValidationMiddleware<T>(
    schema: z.ZodSchema<T>,
    source: 'body' | 'query' | 'params' = 'body'
  ) {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const input = req[source];
      const validation = this.validateApiInput(schema, input);

      if (!validation.isValid) {
        return new ApiValidationError(res, validation.errors);
      }

      // Replace the original input with validated/sanitized data
      (req as unknown as Record<string, unknown>)[source] = validation.data;
      next();
    };
  }

  /**
   * Validate and sanitize user role
   */
  public validateUserRole(role: string): ValidationResult {
    const validRoles = ['citizen', 'expert', 'admin', 'journalist', 'advocate'];

    if (!role || typeof role !== 'string') {
      return {
        isValid: false,
        errors: [{
          field: 'role',
          message: 'Role is required and must be a string'
        }]
      };
    }

    if (!validRoles.includes(role)) {
      return {
        isValid: false,
        errors: [{
          field: 'role',
          message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        }]
      };
    }

    return {
      isValid: true,
      data: role,
      errors: []
    };
  }

  /**
   * Validate search query
   */
  public validateSearchQuery(query: string): ValidationResult {
    if (!query || typeof query !== 'string') {
      return {
        isValid: false,
        errors: [{
          field: 'query',
          message: 'Search query is required'
        }]
      };
    }

    // Sanitize the query
    let sanitized = query.trim();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    // Limit length
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }

    // Ensure minimum length
    if (sanitized.length < 1) {
      return {
        isValid: false,
        errors: [{
          field: 'query',
          message: 'Search query must be at least 1 character long'
        }]
      };
    }

    return {
      isValid: true,
      data: sanitized,
      errors: []
    };
  }

  /**
   * Validate pagination parameters
   */
  public validatePaginationParams(page?: string, limit?: string): ValidationResult {
    const schema = z.object({
      page: z.string().optional().transform(val => {
        const num = parseInt(val || '1');
        return Math.max(1, isNaN(num) ? 1 : num);
      }),
      limit: z.string().optional().transform(val => {
        const num = parseInt(val || '20');
        return Math.min(100, Math.max(1, isNaN(num) ? 20 : num));
      })
    });

    try {
      const result = schema.safeParse({ page, limit });

      if (result.success) {
        return {
          isValid: true,
          data: result.data,
          errors: []
        };
      } else {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return {
          isValid: false,
          errors
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'pagination',
          message: 'Internal pagination validation error'
        }]
      };
    }
  }

  /**
   * Create Zod schema with security validations
   */
  createSecureSchema() {
    return commonZodSchemas;
  }

  /**
   * Validate request parameters against schema
   */
  validateRequest<T>(data: unknown, schema: z.ZodSchema<T>): {
    success: boolean;
    data?: T;
    errors?: string[]
  } {
    try {
      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : String(error))]
      };
    }
  }

  /**
   * Sanitize database query parameters
   */
  sanitizeQueryParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeString(key, { maxLength: 100 });

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
          throw new Error(`Invalid number value for ${key}`);
        }
        sanitized[sanitizedKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (value === null || value === undefined) {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        if (value.length > this.maxArrayLength) {
          throw new Error(`Array too large for ${key}`);
        }
        sanitized[sanitizedKey] = value.map(item =>
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else {
        // For objects, convert to JSON and validate
        const jsonResult = this.validateJSON(JSON.stringify(value));
        if (!jsonResult.isValid) {
          throw new Error(`Invalid object for ${key}: ${jsonResult.error}`);
        }
        sanitized[sanitizedKey] = jsonResult.parsed;
      }
    }

    return sanitized;
  }

  /**
   * Create parameterized query helper to prevent SQL injection
   */
  createParameterizedQuery(query: string, params: unknown[]): { query: string; params: unknown[] } {
    // Validate that the query doesn't contain dangerous patterns
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(query)) {
        throw new Error('Potentially unsafe SQL query detected');
      }
    }

    // Ensure all parameters are properly sanitized
    const sanitizedParams = params.map(param => {
      if (typeof param === 'string') {
        return this.sanitizeString(param);
      }
      return param;
    });

    return { query, params: sanitizedParams };
  }

  /**
   * Check if file contains malicious content
   */
  private containsMaliciousContent(file: { size: number; mimetype: string; originalname?: string }): boolean {
    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i
    ];

    const filename = file.originalname || '';
    if (suspiciousPatterns.some(pattern => pattern.test(filename))) {
      return true;
    }

    // Check for null bytes in filename (directory traversal attempt)
    if (filename.includes('\0')) {
      return true;
    }

    // Check for path traversal attempts
    if (filename.includes('../') || filename.includes('..\\')) {
      return true;
    }

    return false;
  }
}

// Common validation schemas
export const commonSchemas = {
  // User role validation
  user_role: userRoleSchema,

  // Pagination validation
  pagination: z.object({
    page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1') || 1)),
    limit: z.string().optional().transform(val => Math.min(100, Math.max(1, parseInt(val || '20') || 20)))
  }),

  // Search validation
  search: z.object({
    query: z.string().min(1).max(200).transform(val => val.trim()),
    filters: z.record(z.string()).optional()
  }),

  // User update validation
  userUpdate: z.object({
    role: userRoleSchema.optional(),
    is_active: z.boolean().optional(),
    name: z.string().min(1).max(255).optional(),
    email: emailSchema.optional()
  }),

  // Bill comment validation
  comments: z.object({
    content: z.string().min(1).max(5000),
    parent_id: z.number().optional(),
    commentType: z.enum(['general', 'expert_analysis', 'concern', 'support']).optional()
  }),

  // File upload validation options
  fileUpload: {
    image: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    },
    document: {
      maxSize: 10 * 1024 * 1024, // 10MB
      // cspell:disable msword
      allowedTypes: ['application/pdf', 'text/plain', 'application/msword'],
      allowedExtensions: ['pdf', 'txt', 'doc', 'docx']
    }
  }
};

// Export singleton instance
export const inputValidationService = InputValidationService.getInstance();

