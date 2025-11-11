/**
 * Enhanced Input Sanitization Service
 * Provides comprehensive input validation and sanitization using Zod schemas
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';

// Common validation schemas
export const ValidationSchemas = {
  // Basic string validation
  safeString: z.string()
    .min(1, 'Field is required')
    .max(1000, 'Input too long')
    .refine(
      (val) => !/<script|javascript:|data:|vbscript:/i.test(val),
      'Potentially dangerous content detected'
    ),

  // Email validation
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),

  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (val) => /^https?:\/\//.test(val),
      'Only HTTP and HTTPS URLs are allowed'
    ),

  // Bill number validation
  billNumber: z.string()
    .regex(/^[A-Z]{1,3}\s?\d{1,5}$/, 'Invalid bill number format')
    .transform(val => val.toUpperCase().replace(/\s+/g, ' ').trim()),

  // Search query validation
  searchQuery: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .refine(
      (val) => !/[<>'"&]/.test(val),
      'Search query contains invalid characters'
    ),

  // Comment validation
  comment: z.string()
    .min(10, 'Comment must be at least 10 characters')
    .max(2000, 'Comment too long')
    .refine(
      (val) => !/<script|javascript:|data:|vbscript:/i.test(val),
      'Potentially dangerous content detected'
    ),

  // User ID validation
  userId: z.string()
    .uuid('Invalid user ID format'),

  // Pagination validation
  pagination: z.object({
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Filter validation
  billFilters: z.object({
    status: z.array(z.string().max(50)).max(10).optional(),
    policyAreas: z.array(z.string().max(100)).max(20).optional(),
    urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional(),
    sponsors: z.array(z.string().uuid()).max(50).optional()
  })
};

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  removeScripts?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export class InputSanitizer {
  private static instance: InputSanitizer;

  private constructor() {}

  public static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer();
    }
    return InputSanitizer.instance;
  }

  /**
   * Sanitize HTML content using DOMPurify
   */
  public sanitizeHtml(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: options.allowedAttributes || ['class'],
      REMOVE_DATA_ATTRIBUTES: true,
      REMOVE_UNKNOWN_PROTOCOLS: true,
      USE_PROFILES: { html: true }
    };

    if (options.removeScripts !== false) {
      config.FORBID_TAGS = ['script', 'object', 'embed', 'form', 'input'];
      config.FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover'];
    }

    let sanitized = DOMPurify.sanitize(input, config);

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize plain text input
   */
  public sanitizeText(input: string, maxLength?: number): string {
    let sanitized = input
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize using Zod schema
   */
  public async validateAndSanitize<T>(
    schema: z.ZodSchema<T>,
    input: unknown
  ): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    try {
      const result = await schema.parseAsync(input);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { success: false, errors };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Sanitize object recursively
   */
  public sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
    if (typeof obj === 'string') {
      return options.allowHtml 
        ? this.sanitizeHtml(obj, options)
        : this.sanitizeText(obj, options.maxLength);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names too
        const sanitizedKey = this.sanitizeText(key, 100);
        sanitized[sanitizedKey] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Check for SQL injection patterns
   */
  public detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /('(''|[^'])*')/,
      /(;|\||&)/,
      /(\b(or|and)\b.*[=<>])/i,
      /(\/\*.*\*\/)/,
      /(--.*)/
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS patterns
   */
  public detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive security check
   */
  public performSecurityCheck(input: string): {
    isSafe: boolean;
    threats: string[];
    sanitized: string;
  } {
    const threats: string[] = [];
    
    if (this.detectSQLInjection(input)) {
      threats.push('SQL Injection attempt detected');
    }
    
    if (this.detectXSS(input)) {
      threats.push('XSS attempt detected');
    }

    // Check for path traversal
    if (/\.\.\/|\.\.\\/.test(input)) {
      threats.push('Path traversal attempt detected');
    }

    // Check for command injection
    if (/[;&|`$(){}[\]\\]/.test(input)) {
      threats.push('Command injection attempt detected');
    }

    const sanitized = this.sanitizeText(input);
    
    return {
      isSafe: threats.length === 0,
      threats,
      sanitized
    };
  }
}

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance();

// Export validation schemas for easy access
export { ValidationSchemas as schemas };