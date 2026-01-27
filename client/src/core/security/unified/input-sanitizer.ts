/**
 * Unified Input Sanitizer
 * Combines basic and comprehensive sanitization approaches
 */

import DOMPurify from 'dompurify';

import { logger } from '@client/lib/utils/logger';

import {
  SanitizationResult,
  ThreatDetection,
  ThreatType,
  SanitizationOptions
} from './security-interface';

// Type definitions for DOMPurify hook data
interface DOMPurifyHookData {
  tagName?: string;
  attrName?: string;
  attrValue?: string;
  keepAttr?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export interface InputSanitizationConfig {
  enabled: boolean;
  mode: 'basic' | 'comprehensive';
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes?: string[];
  maxLength?: number;
  stripUnknownTags?: boolean;
}

export class UnifiedInputSanitizer {
  private config: InputSanitizationConfig;
  private threatPatterns: Map<ThreatType, RegExp[]>;
  private basicSanitizer: BasicSanitizer;
  private comprehensiveSanitizer: ComprehensiveSanitizer;
  private threatDetector: ThreatDetector;

  constructor(config: InputSanitizationConfig) {
    this.config = {
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
      maxLength: 10000,
      stripUnknownTags: true,
      ...config,
    };

    // Initialize sanitizers
    this.basicSanitizer = new BasicSanitizer();
    this.comprehensiveSanitizer = new ComprehensiveSanitizer(this.config);
    this.threatDetector = new ThreatDetector();

    // Initialize DOMPurify
    this.setupDOMPurify();

    // Initialize threat detection patterns
    this.threatPatterns = this.initializeThreatPatterns();
  }

  async initialize(config?: Partial<InputSanitizationConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
      this.setupDOMPurify();
      logger.info('Unified Input Sanitizer re-initialized');
    }
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
          /�*[0-9a-f]{2,}/gi, // Hex entities
          /�*[0-9]{2,}/gi, // Decimal entities
        ],
      ],
    ]);
  }

  async sanitize(input: string, options: SanitizationOptions = {}): Promise<SanitizationResult> {
    if (!this.config.enabled) {
      return { sanitized: input, wasModified: false, threats: [], removedElements: [], removedAttributes: [] };
    }

    const sanitizationMode = options.mode || this.config.mode;
    const result: SanitizationResult = {
      sanitized: input,
      wasModified: false,
      threats: [],
      removedElements: [],
      removedAttributes: [],
    };

    // Detect threats first
    const threats = this.threatDetector.detect(input);
    result.threats = threats;

    // Apply appropriate sanitization based on mode
    switch (sanitizationMode) {
      case 'basic':
        result.sanitized = this.basicSanitizer.sanitize(input);
        break;
      case 'comprehensive':
        const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input);
        result.sanitized = comprehensiveResult.sanitized;
        result.removedElements = comprehensiveResult.removedElements;
        result.removedAttributes = comprehensiveResult.removedAttributes;
        break;
      default:
        // Auto-detect based on threat level
        if (threats.some(t => t.severity === 'high' || t.severity === 'critical')) {
          const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input);
          result.sanitized = comprehensiveResult.sanitized;
          result.removedElements = comprehensiveResult.removedElements;
          result.removedAttributes = comprehensiveResult.removedAttributes;
        } else {
          result.sanitized = this.basicSanitizer.sanitize(input);
        }
    }

    result.wasModified = result.sanitized !== input;

    // Report high-severity threats
    if (threats.some(t => t.severity === 'high' || t.severity === 'critical')) {
      this.reportThreats(threats, input);
    }

    return result;
  }

  /**
   * Sanitize HTML content
   */
  async sanitizeHTML(input: string, options?: SanitizationOptions): Promise<SanitizationResult> {
    return this.sanitize(input, { ...options, mode: 'comprehensive' });
  }

  /**
   * Sanitize plain text input
   */
  async sanitizeText(input: string, options?: SanitizationOptions): Promise<SanitizationResult> {
    return this.sanitize(input, { ...options, mode: 'basic' });
  }

  /**
   * Sanitize URL
   */
  async sanitizeURL(url: string): Promise<SanitizationResult> {
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

  /**
   * Batch sanitize multiple inputs
   */
  async sanitizeBatch(
    inputs: Record<string, string>,
    type: 'html' | 'text' | 'url' = 'text'
  ): Promise<Record<string, SanitizationResult>> {
    const results: Record<string, SanitizationResult> = {};

    for (const [key, value] of Object.entries(inputs)) {
      switch (type) {
        case 'html':
          results[key] = await this.sanitizeHTML(value);
          break;
        case 'url':
          results[key] = await this.sanitizeURL(value);
          break;
        default:
          results[key] = await this.sanitizeText(value);
      }
    }

    return results;
  }

  /**
   * Check if input is safe without sanitizing
   */
  async isSafe(input: string, type: 'html' | 'text' | 'url' = 'text'): Promise<boolean> {
    const result = await this.sanitizeText(input);
    return !result.wasModified && result.threats.length === 0;
  }

  /**
   * Perform security check on input
   */
  async performSecurityCheck(input: string): Promise<boolean> {
    const result = await this.sanitizeText(input);
    return !result.wasModified && result.threats.length === 0;
  }

  private reportThreats(threats: ThreatDetection[], originalInput: string): void {
    const securityEvent = {
      type: 'input_threat_detected',
      severity: 'high',
      source: 'UnifiedInputSanitizer',
      timestamp: new Date(),
      details: {
        threats: threats,
        originalInputLength: originalInput.length,
        threatCount: threats.length,
      },
    };

    // Emit security event
    const customEvent = new CustomEvent('security-event', { detail: securityEvent });
    document.dispatchEvent(customEvent);

    // Log high-severity threats
    const highSeverityThreats = threats.filter(t => t.severity === 'high' || t.severity === 'critical');
    if (highSeverityThreats.length > 0) {
      logger.warn('High-severity security threats detected in input', {
        component: 'UnifiedInputSanitizer',
        threatCount: threats.length,
        highSeverityCount: highSeverityThreats.length,
        threats: threats.map(t => ({
          type: t.type,
          severity: t.severity,
          description: t.description,
        })),
      });
    }
  }

  private detectElementThreats(node: Element, _data: DOMPurifyHookData): void {
    // This hook is called by DOMPurify before sanitizing elements
    if (node.tagName && ['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(node.tagName)) {
      logger.debug('Potentially dangerous element detected', {
        component: 'UnifiedInputSanitizer',
        tagName: node.tagName,
        innerHTML: node.innerHTML.substring(0, 100),
      });
    }
  }

  private detectAttributeThreats(_node: Element, data: DOMPurifyHookData): void {
    // This hook is called by DOMPurify before sanitizing attributes
    if (data.attrName && data.attrValue) {
      const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
      if (dangerousAttrs.includes(data.attrName.toLowerCase())) {
        logger.debug('Dangerous attribute detected', {
          component: 'UnifiedInputSanitizer',
          attribute: data.attrName,
          value: data.attrValue.substring(0, 100),
        });
      }
    }
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
   * Get health status
   */
  getHealthStatus(): { enabled: boolean; status: string; lastCheck: Date; issues: string[] } {
    return {
      enabled: this.config.enabled,
      status: 'healthy',
      lastCheck: new Date(),
      issues: [],
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): { requestsProcessed: number; threatsBlocked: number; averageResponseTime: number; errorRate: number } {
    return {
      requestsProcessed: 0,
      threatsBlocked: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  /**
   * Shutdown the sanitizer
   */
  async shutdown(): Promise<void> {
    // Clean up DOMPurify hooks
    DOMPurify.removeHook('beforeSanitizeElements');
    DOMPurify.removeHook('beforeSanitizeAttributes');

    logger.info('Unified Input Sanitizer shutdown complete');
  }
}

/**
 * Basic Sanitizer - Lightweight regex-based approach
 */
class BasicSanitizer {
  sanitize(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#47;')
      .replace(/\\/g, '&#92;');
  }
}

/**
 * Comprehensive Sanitizer - DOMPurify-based approach
 */
class ComprehensiveSanitizer {
  constructor(private config: InputSanitizationConfig) {}

  async sanitize(input: string): Promise<SanitizationResult> {
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
          component: 'ComprehensiveSanitizer',
          originalLength: original.length,
          sanitizedLength: sanitized.length,
          threatsDetected: threats.length,
        });
      }

      return {
        sanitized,
        wasModified,
        removedElements,
        removedAttributes,
        threats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during HTML sanitization', {
        error: errorMessage,
        component: 'ComprehensiveSanitizer',
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

  private detectThreats(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];
    const threatPatterns = this.getThreatPatterns();

    for (const [threatType, patterns] of threatPatterns) {
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

  private getThreatPatterns(): Map<ThreatType, RegExp[]> {
    return new Map([
      [
        'script_injection',
        [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
        ],
      ],
      [
        'html_injection',
        [
          /<iframe\b[^>]*>/gi,
          /<object\b[^>]*>/gi,
          /<embed\b[^>]*>/gi,
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
        'suspicious_pattern',
        [
          /\x00/g,
          /\uFEFF/g,
          /[\u0000-\u001F\u007F-\u009F]/g,
          /�*[0-9a-f]{2,}/gi,
          /�*[0-9]{2,}/gi,
        ],
      ],
    ]);
  }

  private assessThreatSeverity(threatType: ThreatType, content: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatType) {
      case 'script_injection':
        return 'critical';
      case 'html_injection':
        return content.includes('script') ? 'critical' : 'high';
      case 'attribute_injection':
        return 'high';
      case 'suspicious_pattern':
        return 'low';
      default:
        return 'medium';
    }
  }
}

/**
 * Threat Detector - Unified threat detection system
 */
class ThreatDetector {
  private threatPatterns: Map<ThreatType, RegExp[]>;

  constructor() {
    this.threatPatterns = this.initializeThreatPatterns();
  }

  detect(input: string): ThreatDetection[] {
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
              location: this.findLocation(input, match),
            });
          });
        }
      }
    }

    return threats;
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
          /�*[0-9a-f]{2,}/gi, // Hex entities
          /�*[0-9]{2,}/gi, // Decimal entities
        ],
      ],
    ]);
  }

  private assessThreatSeverity(threatType: ThreatType, content: string): 'low' | 'medium' | 'high' | 'critical' {
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

  private findLocation(input: string, match: string): string {
    const index = input.indexOf(match);
    if (index === -1) return 'unknown';

    const before = input.substring(Math.max(0, index - 20), index);
    const after = input.substring(index + match.length, index + match.length + 20);

    return `${before}...${match}...${after}`;
  }
}
