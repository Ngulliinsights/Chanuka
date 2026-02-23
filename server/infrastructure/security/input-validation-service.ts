import { logger } from '@server/infrastructure/observability';
import { ApiValidationError } from '@shared/types/api';
import { NextFunction,Request, Response } from 'express';
import { z } from 'zod';
import { emailSchema, userRoleSchema } from '@shared/validation';

/**
 * Centralized Input Validation Service
 * Provides comprehensive input validation using Zod schemas
 */

export interface ValidationResult {
  isValid: boolean;
  data?: any;
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
    try {
      const result = schema.safeParse(input);
      
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

        logger.warn('Input validation failed', {
          component: 'input-validation',
          errors: errors.map(e => `${e.field}: ${e.message}`)
        });

        return {
          isValid: false,
          errors
        };
      }
    } catch (error) {
      logger.error('Validation error', {
        component: 'input-validation',
        error: error instanceof Error ? error.message : String(error)
      });

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
   * Sanitize HTML input to prevent XSS
   */
  public sanitizeHtmlInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove script tags and their content
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove dangerous event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove data: URLs (can contain scripts)
    sanitized = sanitized.replace(/data:/gi, '');
    
    // Remove dangerous tags
    const dangerousTags = ['script', 'object', 'embed', 'link', 'style', 'meta', 'iframe'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate file upload
   */
  public validateFileUpload(file: unknown, options: FileValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];

    if (!file) {
      errors.push({
        field: 'file',
        message: 'No file provided'
      });
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

    return {
      isValid: errors.length === 0,
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
    return (req: Request, res: Response, next: NextFunction) => {
      const input = req[source];
      const validation = this.validateApiInput(schema, input);

      if (!validation.isValid) {
        return ApiValidationError(res, validation.errors);
      }

      // Replace the original input with validated/sanitized data
      (req as any)[source] = validation.data;
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
   * Validate email format
   */
  public validateEmail(email: string): ValidationResult {
    return this.validateApiInput(emailSchema, email);
  }

  /**
   * Validate and sanitize search query
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

    return this.validateApiInput(schema, { page, limit });
  }

  /**
   * Check if file contains malicious content
   */
  private containsMaliciousContent(file: unknown): boolean {
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
      allowedTypes: ['application/pdf', 'text/plain', 'application/msword'],
      allowedExtensions: ['pdf', 'txt', 'doc', 'docx']
    }
  }
};

// Export singleton instance
export const inputValidationService = InputValidationService.getInstance();
