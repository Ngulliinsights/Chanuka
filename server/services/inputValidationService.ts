/**
 * Input Validation Service
 * 
 * Full implementation for comprehensive input validation including:
 * - XSS prevention
 * - SQL injection prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - Integration with Zod schemas
 */

import { logger } from '@shared/core';
import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  sanitized?: unknown;
}

export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

/**
 * Input Validation Service
 */
export class InputValidationService {
  // XSS patterns to detect
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /<meta/gi,
    /<link/gi,
    /<style/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  // SQL injection patterns to detect
  private readonly sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(--|\#|\/\*|\*\/)/g, // SQL comments
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi, // OR 1=1
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi, // AND 1=1
    /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/gi, // ' OR '=' or " OR "="
  ];

  // Command injection patterns to detect
  private readonly commandPatterns = [
    /[;&|`$()]/g, // Shell metacharacters
    /\$\{.*\}/g, // Variable expansion
    /\$\(.*\)/g, // Command substitution
    /`.*`/g, // Backtick command substitution
  ];

  // Path traversal patterns to detect
  private readonly pathTraversalPatterns = [
    /\.\.[\/\\]/g, // ../ or ..\
    /[\/\\]\.\.[\/\\]/g, // /../ or \..\
    /^\.\.$/g, // Just ..
    /%2e%2e[\/\\]/gi, // URL encoded ../
    /%252e%252e[\/\\]/gi, // Double URL encoded ../
  ];

  /**
   * Validate input against rules
   */
  validate(input: unknown, rules: ValidationRule[]): ValidationResult {
    try {
      const errors: string[] = [];
      let sanitized = input;

      for (const rule of rules) {
        const fieldValue = this.getFieldValue(input, rule.field);

        for (const ruleName of rule.rules) {
          const result = this.applyRule(fieldValue, ruleName);
          if (!result.valid) {
            errors.push(
              rule.message || `Field "${rule.field}" failed validation rule "${ruleName}"`
            );
          } else if (result.sanitized !== undefined) {
            sanitized = this.setFieldValue(sanitized, rule.field, result.sanitized);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        sanitized,
      };
    } catch (error) {
      logger.error('Validation failed', { error, rules });
      return {
        valid: false,
        errors: ['Validation error occurred'],
        sanitized: input,
      };
    }
  }

  /**
   * Apply a single validation rule
   */
  private applyRule(value: unknown, ruleName: string): ValidationResult {
    switch (ruleName) {
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
        };
      case 'string':
        return {
          valid: typeof value === 'string',
        };
      case 'number':
        return {
          valid: typeof value === 'number' && !isNaN(value),
        };
      case 'email':
        return {
          valid: typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        };
      case 'url':
        try {
          new URL(value as string);
          return { valid: true };
        } catch {
          return { valid: false };
        }
      case 'xss':
        return this.validateXSS(value as string);
      case 'sql':
        return this.validateSQL(value as string);
      case 'path':
        return this.validatePath(value as string);
      case 'command':
        return this.validateCommand(value as string);
      default:
        logger.warn('Unknown validation rule', { ruleName });
        return { valid: true };
    }
  }

  /**
   * Get field value from object
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    return (obj as Record<string, unknown>)[field];
  }

  /**
   * Set field value in object
   */
  private setFieldValue(obj: unknown, field: string, value: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    return {
      ...obj,
      [field]: value,
    };
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeXSS(input: string): string {
    try {
      let sanitized = input;

      // Remove dangerous patterns
      for (const pattern of this.xssPatterns) {
        sanitized = sanitized.replace(pattern, '');
      }

      // HTML encode special characters
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

      return sanitized;
    } catch (error) {
      logger.error('XSS sanitization failed', { error, input: input.substring(0, 50) });
      return '';
    }
  }

  /**
   * Validate XSS input
   */
  private validateXSS(input: string): ValidationResult {
    try {
      for (const pattern of this.xssPatterns) {
        if (pattern.test(input)) {
          return {
            valid: false,
            errors: ['Input contains potentially dangerous XSS patterns'],
          };
        }
      }

      return {
        valid: true,
        sanitized: this.sanitizeXSS(input),
      };
    } catch (error) {
      logger.error('XSS validation failed', { error });
      return {
        valid: false,
        errors: ['XSS validation error'],
      };
    }
  }

  /**
   * Validate SQL input to prevent injection
   */
  validateSQL(input: string): ValidationResult {
    try {
      for (const pattern of this.sqlPatterns) {
        if (pattern.test(input)) {
          logger.warn('Potential SQL injection detected', {
            input: input.substring(0, 100),
          });
          return {
            valid: false,
            errors: ['Input contains potentially dangerous SQL patterns'],
          };
        }
      }

      return {
        valid: true,
        sanitized: input,
      };
    } catch (error) {
      logger.error('SQL validation failed', { error });
      return {
        valid: false,
        errors: ['SQL validation error'],
      };
    }
  }

  /**
   * Validate file path to prevent traversal
   */
  validatePath(path: string): ValidationResult {
    try {
      for (const pattern of this.pathTraversalPatterns) {
        if (pattern.test(path)) {
          logger.warn('Potential path traversal detected', { path });
          return {
            valid: false,
            errors: ['Path contains potentially dangerous traversal patterns'],
          };
        }
      }

      // Additional check: path should not start with /
      if (path.startsWith('/') || path.startsWith('\\')) {
        return {
          valid: false,
          errors: ['Path should not be absolute'],
        };
      }

      return {
        valid: true,
        sanitized: path,
      };
    } catch (error) {
      logger.error('Path validation failed', { error });
      return {
        valid: false,
        errors: ['Path validation error'],
      };
    }
  }

  /**
   * Validate command to prevent injection
   */
  validateCommand(command: string): ValidationResult {
    try {
      for (const pattern of this.commandPatterns) {
        if (pattern.test(command)) {
          logger.warn('Potential command injection detected', {
            command: command.substring(0, 100),
          });
          return {
            valid: false,
            errors: ['Command contains potentially dangerous injection patterns'],
          };
        }
      }

      return {
        valid: true,
        sanitized: command,
      };
    } catch (error) {
      logger.error('Command validation failed', { error });
      return {
        valid: false,
        errors: ['Command validation error'],
      };
    }
  }

  /**
   * Validate with Zod schema
   */
  validateWithSchema<T>(input: unknown, schema: z.ZodSchema<T>): ValidationResult {
    try {
      const result = schema.safeParse(input);

      if (result.success) {
        return {
          valid: true,
          sanitized: result.data,
        };
      } else {
        return {
          valid: false,
          errors: result.error.errors.map(
            err => `${err.path.join('.')}: ${err.message}`
          ),
        };
      }
    } catch (error) {
      logger.error('Schema validation failed', { error });
      return {
        valid: false,
        errors: ['Schema validation error'],
      };
    }
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.sanitizeXSS(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

/**
 * Global instance
 */
export const inputValidationService = new InputValidationService();

/**
 * Export default
 */
export default inputValidationService;
