/**
 * Input Sanitization Utilities
 *
 * Provides sanitization functions for user input to prevent XSS and other security issues.
 */

import DOMPurify from 'dompurify';

// ============================================================================
// Sanitization Options
// ============================================================================

export interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeExtraSpaces?: boolean;
  stripTags?: boolean;
}

// ============================================================================
// Security Patterns
// ============================================================================

export const SECURITY_PATTERNS = {
  sqlInjection:
    /('(''|[^'])*')|(;)|(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  htmlTags: /<[^>]*>/g,
  specialChars: /[<>'"&]/g,
} as const;

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize general input value
 */
export function sanitizeInput(value: string, options: SanitizeOptions = {}): string {
  if (typeof value !== 'string') {
    return '';
  }

  let sanitized = value;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Convert case
  if (options.lowercase) {
    sanitized = sanitized.toLowerCase();
  } else if (options.uppercase) {
    sanitized = sanitized.toUpperCase();
  }

  // Remove extra spaces
  if (options.removeExtraSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Strip HTML tags
  if (options.stripTags) {
    sanitized = sanitized.replace(SECURITY_PATTERNS.htmlTags, '');
  }

  // Limit length
  if (options.maxLength && options.maxLength > 0) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Sanitize HTML if not allowed
  if (!options.allowHtml) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return sanitizeInput(email, {
    lowercase: true,
    trim: true,
    maxLength: 254,
  });
}

/**
 * Sanitize phone number (remove non-numeric characters except + and -)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();

  // Ensure URL has protocol
  if (trimmed && !trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Sanitize HTML content (allow safe HTML tags)
 */
export function sanitizeHtml(html: string, allowedTags?: string[]): string {
  const config: DOMPurify.Config = allowedTags
    ? {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
      }
    : {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'title'],
      };

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizePlainText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '&': '&amp;',
  };

  return text.replace(SECURITY_PATTERNS.specialChars, char => escapeMap[char] || char);
}

/**
 * Unescape HTML special characters
 */
export function unescapeHtml(text: string): string {
  const unescapeMap: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&amp;': '&',
  };

  return text.replace(/&(lt|gt|quot|#x27|amp);/g, match => unescapeMap[match] || match);
}

/**
 * Check for potential SQL injection patterns
 */
export function hasSqlInjection(value: string): boolean {
  return SECURITY_PATTERNS.sqlInjection.test(value);
}

/**
 * Check for potential XSS patterns
 */
export function hasXss(value: string): boolean {
  return SECURITY_PATTERNS.xss.test(value);
}

/**
 * Sanitize filename (remove path traversal and special characters)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .substring(0, 255); // Limit length
}

/**
 * Sanitize username (alphanumeric, underscore, hyphen only)
 */
export function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 50);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return sanitizeInput(query, {
    trim: true,
    removeExtraSpaces: true,
    maxLength: 200,
    stripTags: true,
  });
}

/**
 * Sanitize number input (extract numeric value)
 */
export function sanitizeNumber(value: string): string {
  return value.replace(/[^\d.-]/g, '');
}

/**
 * Sanitize integer input (extract integer value)
 */
export function sanitizeInteger(value: string): string {
  return value.replace(/[^\d-]/g, '');
}

/**
 * Sanitize currency input (extract currency value)
 */
export function sanitizeCurrency(value: string): string {
  return value.replace(/[^\d.]/g, '');
}

/**
 * Sanitize credit card number (remove non-numeric characters)
 */
export function sanitizeCreditCard(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Sanitize postal code
 */
export function sanitizePostalCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').toUpperCase();
}

/**
 * Comprehensive security check
 */
export function checkSecurity(value: string): {
  safe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  if (hasSqlInjection(value)) {
    threats.push('SQL injection pattern detected');
  }

  if (hasXss(value)) {
    threats.push('XSS pattern detected');
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}
