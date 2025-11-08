/**
 * DOM Sanitization Utilities
 * Provides secure rendering of dynamic content using DOMPurify
 * Prevents XSS attacks by sanitizing HTML content
 */

import DOMPurify from 'dompurify';

// Configuration for different content types
export interface SanitizeConfig {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  ALLOW_UNKNOWN_PROTOCOLS?: boolean;
  SANITIZE_DOM?: boolean;
  KEEP_CONTENT?: boolean;
  IN_PLACE?: boolean;
  RETURN_DOM?: boolean;
  RETURN_DOM_FRAGMENT?: boolean;
  RETURN_DOM_IMPORT?: boolean;
}

// Predefined configurations for common use cases
export const SANITIZE_CONFIGS = {
  // Basic text with no HTML
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  } as SanitizeConfig,

  // Simple HTML with basic formatting
  basic: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span'],
    ALLOWED_ATTR: ['class', 'style'],
  } as SanitizeConfig,

  // Rich text with links
  rich: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel'],
  } as SanitizeConfig,

  // Comments and discussions
  comments: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'a', 'blockquote'],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel'],
  } as SanitizeConfig,

  // Minimal inline elements only
  inline: {
    ALLOWED_TAGS: ['strong', 'em', 'u', 'span', 'a'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
  } as SanitizeConfig,
};

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(
  dirty: string | Node,
  config: SanitizeConfig = SANITIZE_CONFIGS.basic
): string {
  if (!dirty) return '';

  try {
    return DOMPurify.sanitize(dirty, config);
  } catch (error) {
    console.warn('DOMPurify sanitization failed:', error);
    // Fallback: return plain text
    return typeof dirty === 'string' ? dirty.replace(/<[^>]*>/g, '') : '';
  }
}

/**
 * Sanitize text content (removes all HTML)
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return sanitizeHTML(text, SANITIZE_CONFIGS.text);
}

/**
 * Sanitize URL to prevent javascript: protocol and other attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Remove javascript: and other dangerous protocols
  const sanitized = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
  ];

  for (const protocol of dangerousProtocols) {
    if (sanitized.startsWith(protocol)) {
      console.warn('Blocked dangerous URL protocol:', protocol);
      return '';
    }
  }

  // For relative URLs, ensure they don't start with dangerous characters
  if (!sanitized.includes('://') && !sanitized.startsWith('/')) {
    if (sanitized.startsWith('//')) {
      return ''; // Protocol-relative URLs can be dangerous
    }
  }

  return url.trim();
}

/**
 * Sanitize CSS styles to prevent CSS injection
 */
export function sanitizeCSS(css: string): string {
  if (!css) return '';

  // Remove dangerous CSS properties
  const dangerousProps = [
    'behavior',
    'expression',
    'javascript',
    'vbscript',
    'data',
    'import',
  ];

  let sanitized = css;

  // Remove url() functions that might contain javascript:
  sanitized = sanitized.replace(/url\s*\(\s*['"]?([^'"]*)['"]?\s*\)/gi, (match, url) => {
    const cleanUrl = sanitizeUrl(url);
    return cleanUrl ? `url("${cleanUrl}")` : '';
  });

  // Remove dangerous properties
  for (const prop of dangerousProps) {
    const regex = new RegExp(`\\b${prop}\\s*:`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  return sanitized;
}

/**
 * Create a sanitized React element from HTML string
 */
export function createSanitizedElement(
  html: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.basic
): { __html: string } {
  return {
    __html: sanitizeHTML(html, config),
  };
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and symbols
      if (typeof value !== 'function' && typeof key !== 'symbol') {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate and sanitize user input for different contexts
 */
export function sanitizeUserInput(input: string, context: 'text' | 'html' | 'url' | 'css' = 'text'): string {
  switch (context) {
    case 'html':
      return sanitizeHTML(input, SANITIZE_CONFIGS.basic);
    case 'url':
      return sanitizeUrl(input);
    case 'css':
      return sanitizeCSS(input);
    case 'text':
    default:
      return sanitizeText(input);
  }
}

// Hook for React components to safely render HTML
export function useSanitizedHTML(html: string, config?: SanitizeConfig) {
  return createSanitizedElement(html, config);
}