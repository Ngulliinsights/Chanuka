/**
 * Input Sanitizer
 * 
 * Provides comprehensive input sanitization and XSS prevention
 */

import type { SecurityEvent } from '@client/types/security-types';

import { securityConfig } from '../config/security-config';
import { SecurityMonitor } from '../monitoring/SecurityMonitor';

export class InputSanitizer {
  private static instance: InputSanitizer;
  private monitor: SecurityMonitor;
  private xssPatterns: RegExp[];
  private sqlInjectionPatterns: RegExp[];

  private constructor() {
    this.monitor = SecurityMonitor.getInstance();
    this.initializePatterns();
  }

  public static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer();
    }
    return InputSanitizer.instance;
  }

  /**
   * Initialize security patterns for detection
   */
  private initializePatterns(): void {
    // XSS patterns
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
      /<\s*\/?\s*[a-z][^>]*>/gi // Generic tag pattern for further analysis
    ];

    // SQL injection patterns
    this.sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi, // ' OR
      /((\%27)|(\'))\s*((\%41)|a|(\%61))((\%4E)|n|(\%6E))((\%44)|d|(\%64))/gi, // ' AND
      /\b(or|and)\b\s*['"]*\s*['"]*\s*=\s*['"]*\s*['"]*\s*(or|and)\b/gi,
      /\b(or|and)\b\s*\d+\s*=\s*\d+/gi,
      /\bunion\b\s+\bselect\b/gi,
      /\bdrop\b\s+\btable\b/gi,
      /\bexec\b\s*\(/gi,
      /\bsp_\w+/gi // Stored procedures
    ];
  }

  /**
   * Sanitize HTML content
   */
  public sanitizeHTML(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove dangerous tags
    const dangerousTags = ['iframe', 'object', 'embed', 'link', 'meta', 'style', 'form', 'input', 'button'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
      
      // Also remove self-closing versions
      const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');
    });

    // Remove javascript: and vbscript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^"'\s>]+/gi, '');

    // Filter allowed tags and attributes
    if (securityConfig.sanitization.enabled) {
      sanitized = this.filterAllowedTags(sanitized);
    }

    // Check for XSS attempts
    if (this.detectXSS(input)) {
      this.logSecurityEvent('xss-attempt', 'XSS attempt detected and blocked', input);
    }

    return sanitized;
  }

  /**
   * Filter content to only allow specified tags and attributes
   */
  private filterAllowedTags(input: string): string {
    const { allowedTags, allowedAttributes } = securityConfig.sanitization;
    
    // Simple tag filtering - in production, consider using a library like DOMPurify
    let filtered = input;

    // Remove all tags not in allowed list
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    filtered = filtered.replace(tagRegex, (match, tagName) => {
      const tag = tagName.toLowerCase();
      
      if (!allowedTags.includes(tag)) {
        return ''; // Remove disallowed tags
      }

      // Filter attributes for allowed tags
      const allowedAttrs = allowedAttributes[tag] || allowedAttributes['*'] || [];
      
      // Simple attribute filtering
      const filteredTag = match.replace(/\s+([a-zA-Z-]+)\s*=\s*["'][^"']*["']/g, (attrMatch, attrName) => {
        return allowedAttrs.includes(attrName.toLowerCase()) ? attrMatch : '';
      });

      return filteredTag;
    });

    return filtered;
  }

  /**
   * Detect XSS attempts
   */
  public detectXSS(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect SQL injection attempts
   */
  public detectSQLInjection(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize user input for safe display
   */
  public sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // HTML encode special characters
    const sanitized = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Check for injection attempts
    if (this.detectXSS(input)) {
      this.logSecurityEvent('xss-attempt', 'XSS attempt in user input', input);
    }

    if (this.detectSQLInjection(input)) {
      this.logSecurityEvent('xss-attempt', 'SQL injection attempt detected', input);
    }

    return sanitized;
  }

  /**
   * Sanitize URL to prevent javascript: and data: protocols
   */
  public sanitizeURL(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove dangerous protocols
    const sanitized = url.replace(/^(javascript|vbscript|data):/gi, '');

    // Ensure URL is properly encoded
    try {
      const urlObj = new URL(sanitized, window.location.origin);
      return urlObj.href;
    } catch {
      // If URL is invalid, return empty string
      return '';
    }
  }

  /**
   * Sanitize CSS to prevent CSS injection
   */
  public sanitizeCSS(css: string): string {
    if (!css || typeof css !== 'string') {
      return '';
    }

    // Remove dangerous CSS properties and values
    const sanitized = css
      .replace(/expression\s*\(/gi, '') // IE expression()
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/@import/gi, '')
      .replace(/behavior\s*:/gi, '')
      .replace(/-moz-binding/gi, '');

    return sanitized;
  }

  /**
   * Validate and sanitize form data
   */
  public sanitizeFormData(formData: FormData): FormData {
    const sanitizedData = new FormData();

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        const sanitizedValue = this.sanitizeUserInput(value);
        sanitizedData.append(key, sanitizedValue);
      } else {
        // File or other non-string data
        sanitizedData.append(key, value);
      }
    }

    return sanitizedData;
  }

  /**
   * Sanitize JSON data
   */
  public sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeUserInput(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeJSON(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Setup automatic input sanitization for forms
   */
  public setupAutoSanitization(): void {
    // Sanitize form inputs on blur
    document.addEventListener('blur', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        
        if (input.type !== 'password' && input.type !== 'file') {
          const sanitized = this.sanitizeUserInput(input.value);
          if (sanitized !== input.value) {
            input.value = sanitized;
            this.logSecurityEvent('xss-attempt', 'Input sanitized on blur', input.value);
          }
        }
      }
    }, true);

    // Sanitize contenteditable elements
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.contentEditable === 'true') {
        const sanitized = this.sanitizeHTML(target.innerHTML);
        if (sanitized !== target.innerHTML) {
          target.innerHTML = sanitized;
          this.logSecurityEvent('xss-attempt', 'ContentEditable sanitized', target.innerHTML);
        }
      }
    }, true);
  }

  /**
   * Log security event
   */
  private logSecurityEvent(type: 'xss-attempt' | 'injection', message: string, payload: string): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity: 'warning',
      message,
      source: 'InputSanitizer',
      timestamp: Date.now(),
      metadata: {
        payload: payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.monitor.logEvent(event);
  }

  /**
   * Create a safe HTML parser
   */
  public createSafeParser(): DOMParser {
    const parser = new DOMParser();
    
    // Override parseFromString to add sanitization
    const originalParse = parser.parseFromString.bind(parser);
    parser.parseFromString = (source: string, mimeType: DOMParserSupportedType) => {
      const sanitizedSource = this.sanitizeHTML(source);
      return originalParse(sanitizedSource, mimeType);
    };

    return parser;
  }
}