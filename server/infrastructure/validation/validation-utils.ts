import DOMPurify from 'dompurify';
import { z } from 'zod';

/**
 * Shared validation utilities used across validation services
 * Contains common validation functions, sanitization helpers, and Zod schemas
 */

// Email validation
export function validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string } {
  try {
    const sanitized = sanitizeString(email, { maxLength: 254 });

    if (!isValidEmailFormat(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true, sanitized };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

// Phone validation
export function validatePhone(phone: string): { isValid: boolean; sanitized?: string; error?: string } {
  try {
    const sanitized = sanitizeString(phone, { maxLength: 20 });

    // Remove all non-digit characters except + and -
    const cleaned = sanitized.replace(/[^\d+\-\s()]/g, '');

    // Basic phone validation (international format)
    const phoneRegex = /^[+]?[1-9][\d\s\-()]{7,15}$/;

    if (!phoneRegex.test(cleaned)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true, sanitized: cleaned };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

// HTML sanitization
export function sanitizeHtml(input: string, options: { allowTags?: string[] } = {}): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  const { allowTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'] } = options;

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowTags,
    ALLOWED_ATTR: []
  });
}

// Date validation
export function validateDate(date: string | Date): { isValid: boolean; parsed?: Date; error?: string } {
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    return { isValid: true, parsed };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

// String sanitization
export function sanitizeString(input: string, options: {
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
    maxLength = 10000,
    stripSQL = true,
    stripXSS = true
  } = options;

  let sanitized = input;

  // Remove null bytes and control characters (excluding tab, newline, carriage return)
  // sanitized = sanitized.replace(/[\0\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x7F]/g, '');

  // Limit length to prevent DoS
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Strip SQL injection patterns
  if (stripSQL) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /('|(\\')|(;)|(--)|(\s)|(\/\*)|(\*\/))/gi,
      /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi,
      /(\bxp_\w+)/gi,
      /(\bsp_\w+)/gi,
    ];
    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potential SQL injection detected');
      }
    }
  }

  // Strip XSS patterns
  if (stripXSS) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ];
    for (const pattern of xssPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potential XSS attack detected');
      }
    }
  }

  // Check for path traversal
  const pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ];
  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Path traversal attempt detected');
    }
  }

  // HTML sanitization
  if (allowHTML) {
    sanitized = sanitizeHtml(sanitized);
  } else {
    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;');
  }

  return sanitized.trim();
}

// URL validation
export function validateURL(url: string): { isValid: boolean; sanitized?: string; error?: string } {
  try {
    const sanitized = sanitizeString(url, { maxLength: 2048 });

    // Basic URL validation
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

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

// Private helper functions
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Common Zod schemas
export const commonZodSchemas = {
  email: z.string()
    .min(1, 'Email is required')
    .max(254, 'Email too long')
    .refine((email) => validateEmail(email).isValid, 'Invalid email format'),

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
        sanitizeString(name);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid characters in name'),

  url: z.string()
    .max(2048, 'URL too long')
    .refine((url) => validateURL(url).isValid, 'Invalid URL format'),

  phone: z.string()
    .max(20, 'Phone number too long')
    .refine((phone) => validatePhone(phone).isValid, 'Invalid phone number format'),

  text: z.string()
    .max(10000, 'Text too long')
    .refine((text) => {
      try {
        sanitizeString(text);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid characters in text'),

  html: z.string()
    .max(10000, 'HTML content too long')
    .refine((html) => {
      try {
        sanitizeString(html, { allowHTML: true });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid HTML content'),

  id: z.string()
    .uuid('Invalid ID format')
    .refine((id) => {
      try {
        sanitizeString(id);
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
    .max(1000, 'Array too large'),

  object: z.record(z.any())
    .refine((obj) => validateObjectStructure(obj), 'Object structure too complex')
};

// Object structure validation helper
function validateObjectStructure(obj: unknown, depth: number = 0): boolean {
  if (depth > 10) {
    return false;
  }

  if (Array.isArray(obj)) {
    if (obj.length > 1000) {
      return false;
    }
    return obj.every(item => validateObjectStructure(item, depth + 1));
  }

  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 100) { // Max 100 properties per object
      return false;
    }
    return keys.every(key => validateObjectStructure(record[key], depth + 1));
  }

  return true;
}

// Export types
export type EmailValidationResult = ReturnType<typeof validateEmail>;
export type PhoneValidationResult = ReturnType<typeof validatePhone>;
export type DateValidationResult = ReturnType<typeof validateDate>;
export type URLValidationResult = ReturnType<typeof validateURL>;
