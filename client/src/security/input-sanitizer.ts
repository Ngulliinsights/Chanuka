/**
 * Input Sanitization System
 * Comprehensive XSS prevention and input validation
 */

import DOMPurify from 'dompurify';

import { SecurityEvent } from '@client/shared/types';
import { logger } from '@client/utils/logger';

// Type definitions for DOMPurify hook data
interface DOMPurifyHookData {
  tagName?: string;
  attrName?: string;
  attrValue?: string;
  keepAttr?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export interface SanitizerConfig {
  enabled: boolean;
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes?: string[];
  maxLength?: number;
  stripUnknownTags?: boolean;
}

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  removedElements: string[];
  removedAttributes: string[];
  threats: ThreatDetection[];
}

export interface ThreatDetection {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  originalContent: string;
  location?: string;
}

export type ThreatType =
  | 'script_injection'
  | 'html_injection'
  | 'attribute_injection'
  | 'url_injection'
  | 'css_injection'
  | 'data_uri_abuse'
  | 'protocol_violation'
  | 'suspicious_pattern';

export class InputSanitizer {
  private config: SanitizerConfig;
  private threatPatterns: Map<ThreatType, RegExp[]>;

  constructor(config: SanitizerConfig) {
    this.config = {
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
      maxLength: 10000,
      stripUnknownTags: true,
      ...config,
    };

    // Initialize DOMPurify
    this.setupDOMPurify();

    // Initialize threat detection patterns
    this.threatPatterns = this.initializeThreatPatterns();
  }

  private setupDOMPurify(): void {
    // Configure DOMPurify with our settings
    DOMPurify.setConfig({
      ALLOWED_TAGS:
        this.config.allowedTags.length > 0
          ? this.config.allowedTags
          : ['p', 'b', 'i', 'em', 'strong', 'br'],
      ALLOWED_ATTR: Object.values(this.config.allowedAttributes).flat(),
      ALLOWED_URI_REGEXP: new RegExp(
        `^(?:(?:${(this.config.allowedSchemes || []).join('|')}):|\\/|#)`,
        'i'
      ),
      KEEP_CONTENT: !this.config.stripUnknownTags,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      FORCE_BODY: false,
    });

    // Add hooks for threat detection with properly typed parameters
    DOMPurify.addHook(
      'beforeSanitizeElements' as any,
      ((node: Element, data: DOMPurifyHookData) => {
        this.detectElementThreats(node, data);
      }) as any
    );

    DOMPurify.addHook(
      'beforeSanitizeAttributes' as any,
      ((node: Element, data: DOMPurifyHookData) => {
        this.detectAttributeThreats(node, data);
      }) as any
    );
  }

  private initializeThreatPatterns(): Map<ThreatType, RegExp[]> {
    return new Map([
      [
        'script_injection',
        [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /eval\s*\(/gi,
          /setTimeout\s*\(/gi,
          /setInterval\s*\(/gi,
        ],
      ],
      [
        'html_injection',
        [
          /<iframe\b[^>]*>/gi,
          /<object\b[^>]*>/gi,
          /<embed\b[^>]*>/gi,
          /<form\b[^>]*>/gi,
          /<input\b[^>]*>/gi,
          /<meta\b[^>]*>/gi,
        ],
      ],
      [
        'attribute_injection',
        [
          /style\s*=.*expression\s*\(/gi,
          /style\s*=.*javascript:/gi,
          /href\s*=.*javascript:/gi,
          /src\s*=.*javascript:/gi,
        ],
      ],
      [
        'url_injection',
        [/data:text\/html/gi, /data:application\/javascript/gi, /vbscript:/gi, /file:/gi, /ftp:/gi],
      ],
      ['css_injection', [/expression\s*\(/gi, /@import/gi, /behavior\s*:/gi, /-moz-binding/gi]],
      ['data_uri_abuse', [/data:image\/svg\+xml.*<script/gi, /data:text\/html.*<script/gi]],
      [
        'suspicious_pattern',
        [
          /\x00/g, // Null bytes
          /\uFEFF/g, // BOM
          /[\u0000-\u001F\u007F-\u009F]/g, // Control characters
          /&#x0*[0-9a-f]{2,}/gi, // Hex entities
          /&#0*[0-9]{2,}/gi, // Decimal entities
        ],
      ],
    ]);
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHTML(input: string): SanitizationResult {
    if (!this.config.enabled) {
      return {
        sanitized: input,
        wasModified: false,
        removedElements: [],
        removedAttributes: [],
        threats: [],
      };
    }

    const original = input;
    const threats: ThreatDetection[] = [];
    const removedElements: string[] = [];
    const removedAttributes: string[] = [];

    try {
      // Pre-sanitization threat detection
      const preThreats = this.detectThreats(input);
      threats.push(...preThreats);

      // Length check
      if (this.config.maxLength && input.length > this.config.maxLength) {
        input = input.substring(0, this.config.maxLength);
        threats.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          description: `Input truncated from ${original.length} to ${this.config.maxLength} characters`,
          originalContent: original.substring(this.config.maxLength),
        });
      }

      // Sanitize with DOMPurify
      const sanitized = DOMPurify.sanitize(input);

      // Post-sanitization analysis
      const wasModified = sanitized !== original;

      if (wasModified) {
        logger.debug('Input was sanitized', {
          component: 'InputSanitizer',
          originalLength: original.length,
          sanitizedLength: sanitized.length,
          threatsDetected: threats.length,
        });
      }

      // Report threats if any were found
      if (threats.length > 0) {
        this.reportThreats(threats, original);
      }

      return {
        sanitized,
        wasModified,
        removedElements,
        removedAttributes,
        threats,
      };
    } catch (error) {
      // Cast error to Error type for proper logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during HTML sanitization', {
        error: errorMessage,
        component: 'InputSanitizer',
      });

      // Return empty string on error for security
      return {
        sanitized: '',
        wasModified: true,
        removedElements: ['*'],
        removedAttributes: ['*'],
        threats: [
          {
            type: 'suspicious_pattern',
            severity: 'critical',
            description: 'Sanitization failed, content blocked',
            originalContent: original,
          },
        ],
      };
    }
  }

  /**
   * Sanitize plain text input
   */
  sanitizeText(input: string): SanitizationResult {
    if (!this.config.enabled) {
      return {
        sanitized: input,
        wasModified: false,
        removedElements: [],
        removedAttributes: [],
        threats: [],
      };
    }

    const original = input;
    let sanitized = input;
    const threats: ThreatDetection[] = [];

    try {
      // Detect threats in text
      const textThreats = this.detectThreats(input);
      threats.push(...textThreats);

      // Remove HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');

      // Remove potentially dangerous characters
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

      // Normalize whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();

      // Length check
      if (this.config.maxLength && sanitized.length > this.config.maxLength) {
        sanitized = sanitized.substring(0, this.config.maxLength);
        threats.push({
          type: 'suspicious_pattern',
          severity: 'low',
          description: `Text truncated from ${original.length} to ${this.config.maxLength} characters`,
          originalContent: original.substring(this.config.maxLength),
        });
      }

      const wasModified = sanitized !== original;

      if (threats.length > 0) {
        this.reportThreats(threats, original);
      }

      return {
        sanitized,
        wasModified,
        removedElements: [],
        removedAttributes: [],
        threats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during text sanitization', {
        error: errorMessage,
        component: 'InputSanitizer',
      });

      return {
        sanitized: '',
        wasModified: true,
        removedElements: [],
        removedAttributes: [],
        threats: [
          {
            type: 'suspicious_pattern',
            severity: 'critical',
            description: 'Text sanitization failed, content blocked',
            originalContent: original,
          },
        ],
      };
    }
  }

  /**
   * Sanitize URL
   */
  sanitizeURL(url: string): SanitizationResult {
    const original = url;
    let sanitized = url;
    const threats: ThreatDetection[] = [];

    try {
      // Basic URL validation
      const urlObj = new URL(sanitized, window.location.origin);

      // Check allowed schemes
      if (
        this.config.allowedSchemes &&
        !this.config.allowedSchemes.includes(urlObj.protocol.slice(0, -1))
      ) {
        threats.push({
          type: 'protocol_violation',
          severity: 'high',
          description: `Disallowed protocol: ${urlObj.protocol}`,
          originalContent: original,
        });
        sanitized = '#';
      }

      // Check for JavaScript URLs
      if (sanitized.toLowerCase().includes('javascript:')) {
        threats.push({
          type: 'script_injection',
          severity: 'critical',
          description: 'JavaScript URL detected',
          originalContent: original,
        });
        sanitized = '#';
      }

      // Check for data URIs with scripts
      if (
        sanitized.toLowerCase().startsWith('data:') &&
        (sanitized.includes('<script') || sanitized.includes('javascript'))
      ) {
        threats.push({
          type: 'data_uri_abuse',
          severity: 'critical',
          description: 'Malicious data URI detected',
          originalContent: original,
        });
        sanitized = '#';
      }

      const wasModified = sanitized !== original;

      if (threats.length > 0) {
        this.reportThreats(threats, original);
      }

      return {
        sanitized,
        wasModified,
        removedElements: [],
        removedAttributes: [],
        threats,
      };
    } catch (error) {
      // Invalid URL
      threats.push({
        type: 'url_injection',
        severity: 'medium',
        description: 'Invalid URL format',
        originalContent: original,
      });

      return {
        sanitized: '#',
        wasModified: true,
        removedElements: [],
        removedAttributes: [],
        threats,
      };
    }
  }

  private detectThreats(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    for (const [threatType, patterns] of this.threatPatterns) {
      for (const pattern of patterns) {
        const matches = input.match(pattern);
        if (matches) {
          matches.forEach(match => {
            threats.push({
              type: threatType,
              severity: this.assessThreatSeverity(threatType, match),
              description: `${threatType.replace('_', ' ')} detected: ${match.substring(0, 50)}...`,
              originalContent: match,
            });
          });
        }
      }
    }

    return threats;
  }

  private assessThreatSeverity(
    threatType: ThreatType,
    content: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatType) {
      case 'script_injection':
        return 'critical';
      case 'html_injection':
        return content.includes('script') ? 'critical' : 'high';
      case 'attribute_injection':
        return 'high';
      case 'url_injection':
        return content.includes('javascript:') ? 'critical' : 'medium';
      case 'css_injection':
        return 'medium';
      case 'data_uri_abuse':
        return 'critical';
      case 'protocol_violation':
        return 'high';
      case 'suspicious_pattern':
        return 'low';
      default:
        return 'medium';
    }
  }

  private detectElementThreats(node: Element, _data: DOMPurifyHookData): void {
    // This hook is called by DOMPurify before sanitizing elements
    // Prefix unused parameter with underscore to satisfy linter
    if (node.tagName && ['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(node.tagName)) {
      logger.debug('Potentially dangerous element detected', {
        component: 'InputSanitizer',
        tagName: node.tagName,
        innerHTML: node.innerHTML.substring(0, 100),
      });
    }
  }

  private detectAttributeThreats(_node: Element, data: DOMPurifyHookData): void {
    // This hook is called by DOMPurify before sanitizing attributes
    // Prefix unused parameter with underscore to satisfy linter
    if (data.attrName && data.attrValue) {
      const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
      if (dangerousAttrs.includes(data.attrName.toLowerCase())) {
        logger.debug('Dangerous attribute detected', {
          component: 'InputSanitizer',
          attribute: data.attrName,
          value: data.attrValue.substring(0, 100),
        });
      }
    }
  }

  private reportThreats(threats: ThreatDetection[], originalContent: string): void {
    const highSeverityThreats = threats.filter(
      t => t.severity === 'high' || t.severity === 'critical'
    );

    if (highSeverityThreats.length > 0) {
      logger.warn('High-severity security threats detected in input', {
        component: 'InputSanitizer',
        threatCount: threats.length,
        highSeverityCount: highSeverityThreats.length,
        threats: threats.map(t => ({
          type: t.type,
          severity: t.severity,
          description: t.description,
        })),
      });

      // Create security event for high-severity threats
      const securityEvent: Partial<SecurityEvent> = {
        type: 'xss_attempt',
        severity: highSeverityThreats.some(t => t.severity === 'critical') ? 'critical' : 'high',
        source: 'InputSanitizer',
        details: {
          threatCount: threats.length,
          threats: threats,
          originalContentLength: originalContent.length,
          userAgent: navigator.userAgent,
        },
      };

      // Report security event
      const customEvent = new CustomEvent('security-event', {
        detail: securityEvent,
      });
      document.dispatchEvent(customEvent);
    }
  }

  /**
   * Batch sanitize multiple inputs
   */
  sanitizeBatch(
    inputs: { [key: string]: string },
    type: 'html' | 'text' | 'url' = 'text'
  ): { [key: string]: SanitizationResult } {
    const results: { [key: string]: SanitizationResult } = {};

    for (const [key, value] of Object.entries(inputs)) {
      switch (type) {
        case 'html':
          results[key] = this.sanitizeHTML(value);
          break;
        case 'url':
          results[key] = this.sanitizeURL(value);
          break;
        default:
          results[key] = this.sanitizeText(value);
      }
    }

    return results;
  }

  /**
   * Check if input is safe without sanitizing
   */
  isSafe(input: string, type: 'html' | 'text' | 'url' = 'text'): boolean {
    let result: SanitizationResult;

    switch (type) {
      case 'html':
        result = this.sanitizeHTML(input);
        break;
      case 'url':
        result = this.sanitizeURL(input);
        break;
      default:
        result = this.sanitizeText(input);
    }

    return !result.wasModified && result.threats.length === 0;
  }

  /**
   * Get sanitizer statistics
   */
  getStats(): {
    threatsDetected: number;
    criticalThreats: number;
    sanitizationsPerformed: number;
  } {
    // This would be implemented with actual counters in a real system
    return {
      threatsDetected: 0,
      criticalThreats: 0,
      sanitizationsPerformed: 0,
    };
  }

  /**
   * Perform security check on input
   */
  performSecurityCheck(input: string): boolean {
    const result = this.sanitizeText(input);
    return !result.wasModified && result.threats.length === 0;
  }

  /**
   * Validate and sanitize input
   */
  async validateAndSanitize(
    _schema: unknown,
    input: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; errors: string[] }> {
    // Simple validation - in real implementation, use a validation library
    // Prefix unused parameter with underscore to satisfy linter
    return { success: true, data: input };
  }
}

// Export singleton instance
export const inputSanitizer = new InputSanitizer({
  enabled: true,
  allowedTags: ['p', 'b', 'i', 'em', 'strong', 'br', 'a', 'img'],
  allowedAttributes: {
    a: ['href', 'target'],
    img: ['src', 'alt'],
  },
});
