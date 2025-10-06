import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { encryptionService } from '../../features/security/encryption-service.js';

/**
 * Comprehensive input validation and sanitization service
 * Prevents SQL injection, XSS, and other injection attacks
 */
export class InputValidationService {
  private readonly maxStringLength = 10000;
  private readonly maxArrayLength = 1000;
  private readonly maxObjectDepth = 10;

  // SQL injection patterns to detect and block
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\s)|(\/\*)|(\*\/))/gi,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi,
    /(\bxp_\w+)/gi,
    /(\bsp_\w+)/gi,
  ];

  // XSS patterns to detect and block
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];

  // Path traversal patterns
  private readonly pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ];

  /**
   * Sanitize string input to prevent injection attacks
   */
  sanitizeString(input: string, options: {
    allowHTML?: boolean;
    maxLength?: number;
    stripSQL?: boolean;
    stripXSS?: boolean;
  } = {}): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    const {
      allowHTML = false,
      maxLength = this.maxStringLength,
      stripSQL = true,
      stripXSS = true
    } = options;

    let sanitized = input;

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit length to prevent DoS
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Strip SQL injection patterns
    if (stripSQL) {
      for (const pattern of this.sqlInjectionPatterns) {
        if (pattern.test(sanitized)) {
          throw new Error('Potential SQL injection detected');
        }
      }
    }

    // Strip XSS patterns
    if (stripXSS) {
      for (const pattern of this.xssPatterns) {
        if (pattern.test(sanitized)) {
          throw new Error('Potential XSS attack detected');
        }
      }
    }

    // Check for path traversal
    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Path traversal attempt detected');
      }
    }

    // HTML sanitization
    if (allowHTML) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
      });
    } else {
      // Escape HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    return sanitized.trim();
  }

  /**
   * Validate and sanitize email addresses
   */
  validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string } {
    try {
      const sanitized = this.sanitizeString(email, { maxLength: 254 });
      
      if (!encryptionService.validateEmail(sanitized)) {
        return { isValid: false, error: 'Invalid email format' };
      }

      return { isValid: true, sanitized };
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }
  }

  /**
   * Validate and sanitize URLs
   */
  validateURL(url: string): { isValid: boolean; sanitized?: string; error?: string } {
    try {
      const sanitized = this.sanitizeString(url, { maxLength: 2048 });
      
      // Basic URL validation
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      
      if (!urlRegex.test(sanitized)) {
        return { isValid: false, error: 'Invalid URL format' };
      }

      // Check for suspicious protocols
      if (sanitized.match(/^(javascript|data|vbscript|file|ftp):/i)) {
        return { isValid: false, error: 'Unsafe URL protocol' };
      }

      return { isValid: true, sanitized };
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }
  }

  /**
   * Validate and sanitize phone numbers
   */
  validatePhone(phone: string): { isValid: boolean; sanitized?: string; error?: string } {
    try {
      const sanitized = this.sanitizeString(phone, { maxLength: 20 });
      
      // Remove all non-digit characters except + and -
      const cleaned = sanitized.replace(/[^\d+\-\s()]/g, '');
      
      // Basic phone validation (international format)
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      
      if (!phoneRegex.test(cleaned)) {
        return { isValid: false, error: 'Invalid phone number format' };
      }

      return { isValid: true, sanitized: cleaned };
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }
  }

  /**
   * Validate and sanitize JSON input
   */
  validateJSON(input: string): { isValid: boolean; parsed?: any; error?: string } {
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
  private validateObjectStructure(obj: any, depth: number = 0): boolean {
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
      const keys = Object.keys(obj);
      if (keys.length > 100) { // Max 100 properties per object
        return false;
      }
      return keys.every(key => this.validateObjectStructure(obj[key], depth + 1));
    }

    return true;
  }

  /**
   * Create Zod schema with security validations
   */
  createSecureSchema() {
    return {
      email: z.string()
        .min(1, 'Email is required')
        .max(254, 'Email too long')
        .refine((email) => this.validateEmail(email).isValid, 'Invalid email format'),

      password: z.string()
        .min(12, 'Password must be at least 12 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain uppercase, lowercase, number, and special character'),

      name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .refine((name) => {
          try {
            this.sanitizeString(name);
            return true;
          } catch {
            return false;
          }
        }, 'Invalid characters in name'),

      url: z.string()
        .max(2048, 'URL too long')
        .refine((url) => this.validateURL(url).isValid, 'Invalid URL format'),

      phone: z.string()
        .max(20, 'Phone number too long')
        .refine((phone) => this.validatePhone(phone).isValid, 'Invalid phone number format'),

      text: z.string()
        .max(this.maxStringLength, 'Text too long')
        .refine((text) => {
          try {
            this.sanitizeString(text);
            return true;
          } catch {
            return false;
          }
        }, 'Invalid characters in text'),

      html: z.string()
        .max(this.maxStringLength, 'HTML content too long')
        .refine((html) => {
          try {
            this.sanitizeString(html, { allowHTML: true });
            return true;
          } catch {
            return false;
          }
        }, 'Invalid HTML content'),

      id: z.string()
        .uuid('Invalid ID format')
        .refine((id) => {
          try {
            this.sanitizeString(id);
            return true;
          } catch {
            return false;
          }
        }, 'Invalid ID'),

      integer: z.number()
        .int('Must be an integer')
        .min(-2147483648, 'Number too small')
        .max(2147483647, 'Number too large'),

      positiveInteger: z.number()
        .int('Must be an integer')
        .min(1, 'Must be positive'),

      array: z.array(z.any())
        .max(this.maxArrayLength, 'Array too large'),

      object: z.record(z.any())
        .refine((obj) => this.validateObjectStructure(obj), 'Object structure too complex')
    };
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
        errors: ['Validation failed: ' + (error as Error).message] 
      };
    }
  }

  /**
   * Sanitize database query parameters
   */
  sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

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
  createParameterizedQuery(query: string, params: any[]): { query: string; params: any[] } {
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
}

// Singleton instance
export const inputValidationService = new InputValidationService();