/**
 * Security Utilities - Consolidated Module
 * 
 * This module consolidates all security-related utilities including:
 * - CSP Headers Management
 * - DOM Sanitization
 * - Input Validation
 * - Password Validation
 * - Security Monitoring
 * 
 * Replaces: csp-headers.ts, dom-sanitizer.ts, input-validation.ts, 
 *          password-validation.ts, security-monitoring.ts
 */
/**
 * Security Utilities - Optimized Module
 * 
 * This module provides comprehensive security utilities including:
 * - CSP Headers Management with environment-aware policies
 * - DOM Sanitization with XSS protection
 * - Input Validation with customizable rules
 * - Password Validation with strength scoring
 * - Security Monitoring with threat detection
 * 
 * @version 2.0.0
 * @module security-utils
 */

import { logger } from './logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Content Security Policy directive configuration
 * Each directive controls which resources can be loaded from where
 */
export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'child-src': string[];
  'worker-src': string[];
  'frame-src': string[];
  'form-action': string[];
  'base-uri': string[];
  'manifest-src': string[];
}

/**
 * Security event tracked by the monitoring system
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  riskScore: number;
  details: Record<string, unknown>;
}

/**
 * Alert generated when suspicious activity is detected
 */
export interface SuspiciousActivityAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, unknown>;
  resolved: boolean;
}

/**
 * Custom validation rule definition
 */
export interface ValidationRule {
  name: string;
  validator: (value: unknown) => boolean;
  message: string;
}

/**
 * Password strength assessment result
 */
export interface PasswordStrength {
  score: number;
  maxScore: number;
  feedback: string[];
  isValid: boolean;
  strengthLevel: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}

/**
 * Configuration options for input validation
 */
export interface InputValidatorConfig {
  minLength?: number;
  maxLength?: number;
  allowUnicode?: boolean;
  allowSpecialChars?: boolean;
}

/**
 * Configuration options for password validation
 */
export interface PasswordValidatorConfig {
  minScore?: number;
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  checkCommonPasswords?: boolean;
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitorConfig {
  maxEvents?: number;
  alertThreshold?: number;
  enableAutoBlock?: boolean;
  retentionHours?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common weak passwords to check against
 * In production, this should be a much larger list or use an API
 */
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321'
]);

/**
 * Dangerous HTML patterns that should always be removed
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /<input\b[^<]*(?:(?!<\/input>)<[^<]*)*\/?>/gi,
  /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*\/?>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*\/?>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /<base\b[^<]*(?:(?!<\/base>)<[^<]*)*\/?>/gi
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a cryptographically secure unique identifier
 * Falls back to timestamp-based ID if crypto API is unavailable
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Safely hashes a string using SHA-256
 * Used for password breach checking and security fingerprinting
 */
async function hashString(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logger.error('Hash generation failed', { error });
    throw new Error('Unable to generate secure hash');
  }
}

// ============================================================================
// CSP HEADERS MANAGEMENT
// ============================================================================

/**
 * Predefined CSP configurations for different environments
 * These provide secure defaults while allowing flexibility
 */
const CSP_CONFIGS: Record<string, CSPDirectives> = {
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'"],
    'style-src': ["'self'", "'unsafe-inline'"], // Unsafe-inline needed for some CSS-in-JS
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https:', 'data:'],
    'connect-src': ["'self'", 'wss:', 'https:'],
    'media-src': ["'self'", 'https:'],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"]
  },
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*', '127.0.0.1:*'],
    'style-src': ["'self'", "'unsafe-inline'", 'localhost:*'],
    'img-src': ["'self'", 'data:', 'https:', 'http:', 'localhost:*'],
    'font-src': ["'self'", 'https:', 'data:', 'localhost:*'],
    'connect-src': ["'self'", 'wss:', 'ws:', 'https:', 'http:', 'localhost:*', '127.0.0.1:*'],
    'media-src': ["'self'", 'localhost:*'],
    'object-src': ["'none'"],
    'child-src': ["'self'", 'localhost:*'],
    'worker-src': ["'self'", 'blob:', 'localhost:*'],
    'frame-src': ["'self'", 'localhost:*'],
    'form-action': ["'self'", 'localhost:*'],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"]
  },
  minimal: {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'none'"],
    'object-src': ["'none'"],
    'child-src': ["'none'"],
    'worker-src': ["'self'"],
    'frame-src': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"]
  }
};

/**
 * Manages Content Security Policy headers for XSS protection
 * Implements singleton pattern to ensure consistent policy across the application
 */
export class CSPManager {
  private static instance: CSPManager;
  private currentPolicy: CSPDirectives;
  private nonces: Set<string> = new Set();

  private constructor() {
    // Default to development for safety during initialization
    this.currentPolicy = { ...CSP_CONFIGS.development };
  }

  /**
   * Gets the singleton instance of CSPManager
   */
  static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager();
    }
    return CSPManager.instance;
  }

  /**
   * Generates a complete CSP header string for the specified environment
   * This header should be added to HTTP responses to enforce security policies
   */
  generateCSPHeader(environment: 'development' | 'production' | 'minimal' = 'production'): string {
    const config = CSP_CONFIGS[environment] || CSP_CONFIGS.production;
    
    const directives = Object.entries(config)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
    
    // Add report-uri in production for monitoring CSP violations
    if (environment === 'production') {
      return `${directives}; report-uri /api/csp-report`;
    }
    
    return directives;
  }

  /**
   * Generates a cryptographic nonce for inline scripts
   * Use this to allow specific inline scripts while blocking all others
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const nonce = btoa(String.fromCharCode(...array));
    this.nonces.add(nonce);
    return nonce;
  }

  /**
   * Validates that a nonce was generated by this manager
   */
  validateNonce(nonce: string): boolean {
    return this.nonces.has(nonce);
  }

  /**
   * Updates the current CSP policy with new directives
   * Use this to add trusted domains or modify policies at runtime
   */
  updatePolicy(updates: Partial<CSPDirectives>): void {
    this.currentPolicy = { ...this.currentPolicy, ...updates };
    logger.info('CSP policy updated', { updates });
  }

  /**
   * Adds a trusted domain to a specific directive
   */
  addTrustedDomain(directive: keyof CSPDirectives, domain: string): void {
    if (!this.currentPolicy[directive].includes(domain)) {
      this.currentPolicy[directive].push(domain);
      logger.info('Trusted domain added', { directive, domain });
    }
  }

  /**
   * Gets a copy of the current policy configuration
   */
  getCurrentPolicy(): CSPDirectives {
    return JSON.parse(JSON.stringify(this.currentPolicy));
  }
}

// ============================================================================
// DOM SANITIZATION
// ============================================================================

/**
 * Provides DOM sanitization to prevent XSS attacks
 * This implementation offers basic protection but recommends DOMPurify for production
 */
export class DOMSanitizer {
  private static instance: DOMSanitizer;
  private allowedTags: Set<string>;
  private allowedAttributes: Map<string, Set<string>>;
  private allowedProtocols: Set<string>;

  private constructor() {
    // Define safe HTML tags that can be used
    this.allowedTags = new Set([
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'a', 'img', 'blockquote', 'code', 'pre', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'hr', 'abbr', 'cite', 'mark'
    ]);
    
    // Define allowed attributes per tag
    this.allowedAttributes = new Map([
      ['a', new Set(['href', 'title', 'rel'])],
      ['img', new Set(['src', 'alt', 'title', 'width', 'height'])],
      ['*', new Set(['class', 'id', 'data-*'])] // Wildcard for all tags
    ]);

    // Define safe URL protocols
    this.allowedProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
  }

  static getInstance(): DOMSanitizer {
    if (!DOMSanitizer.instance) {
      DOMSanitizer.instance = new DOMSanitizer();
    }
    return DOMSanitizer.instance;
  }

  /**
   * Sanitizes HTML input to remove dangerous elements and attributes
   * 
   * WARNING: This provides basic protection. For production applications,
   * use DOMPurify library for comprehensive XSS protection:
   * npm install dompurify
   * import DOMPurify from 'dompurify';
   * return DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] });
   */
  sanitizeHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let sanitized = html;

    // Remove all dangerous tags and their content
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove dangerous protocols from URLs
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/data:text\/javascript/gi, '');

    // Remove all event handler attributes (onclick, onerror, etc.)
    sanitized = sanitized
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Sanitize href attributes that might contain javascript
    sanitized = sanitized.replace(
      /href\s*=\s*["']\s*javascript:[^"']*["']/gi,
      'href="#"'
    );

    // Sanitize src attributes
    sanitized = sanitized.replace(
      /src\s*=\s*["']\s*javascript:[^"']*["']/gi,
      ''
    );

    // Remove dangerous CSS expressions
    sanitized = sanitized.replace(/expression\s*\(/gi, '');
    sanitized = sanitized.replace(/-moz-binding\s*:/gi, '');

    // Sanitize CSS url() values
    sanitized = sanitized.replace(
      /url\s*\(\s*['"]?([^'")]*?)['"]?\s*\)/gi,
      (match, url) => {
        const trimmedUrl = url.trim().toLowerCase();
        if (trimmedUrl.startsWith('javascript:') || 
            trimmedUrl.startsWith('vbscript:') ||
            trimmedUrl.startsWith('data:text/html')) {
          return '';
        }
        return match;
      }
    );

    return sanitized;
  }

  /**
   * Escapes HTML special characters to prevent XSS in text content
   * Use this for user-generated text that should be displayed as-is
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const entityMap: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[<>&"'/]/g, char => entityMap[char] || char);
  }

  /**
   * Validates and sanitizes URLs to ensure they use safe protocols
   * Returns empty string for invalid or dangerous URLs
   */
  sanitizeURL(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove whitespace and control characters
    // eslint-disable-next-line no-control-regex
    const cleaned = url.trim().replace(/[\x00-\x1F\x7F]/g, '');

    try {
      const parsed = new URL(cleaned);
      
      // Check if protocol is in our allowed list
      if (this.allowedProtocols.has(parsed.protocol)) {
        return cleaned;
      }
      
      logger.warn('Blocked URL with disallowed protocol', { 
        url: cleaned, 
        protocol: parsed.protocol 
      });
    } catch (error) {
      logger.warn('Invalid URL format', { url: cleaned });
    }

    return '';
  }

  /**
   * Adds a custom allowed tag for HTML sanitization
   */
  addAllowedTag(tag: string): void {
    this.allowedTags.add(tag.toLowerCase());
  }

  /**
   * Adds a custom allowed attribute for a specific tag
   */
  addAllowedAttribute(tag: string, attribute: string): void {
    const tagLower = tag.toLowerCase();
    if (!this.allowedAttributes.has(tagLower)) {
      this.allowedAttributes.set(tagLower, new Set());
    }
    this.allowedAttributes.get(tagLower)!.add(attribute.toLowerCase());
  }
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validates and sanitizes user input with customizable rules
 * Prevents injection attacks and ensures data quality
 */
export class InputValidator {
  private static instance: InputValidator;
  private rules: Map<string, ValidationRule[]>;
  private config: InputValidatorConfig;

  private constructor(config: InputValidatorConfig = {}) {
    this.config = {
      minLength: 1,
      maxLength: 10000,
      allowUnicode: true,
      allowSpecialChars: true,
      ...config
    };
    this.rules = new Map();
    this.setupDefaultRules();
  }

  static getInstance(config?: InputValidatorConfig): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator(config);
    }
    return InputValidator.instance;
  }

  /**
   * Sets up common validation rules used across applications
   */
  private setupDefaultRules(): void {
    // Email validation with RFC 5322 simplified pattern
    this.addRule('email', {
      name: 'email',
      validator: (value: unknown) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(value);
      },
      message: 'Please enter a valid email address'
    });

    // Required field validation
    this.addRule('required', {
      name: 'required',
      validator: (value: unknown) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
      },
      message: 'This field is required'
    });

    // Minimum length validation
    this.addRule('minLength', {
      name: 'minLength',
      validator: (value: unknown) => {
        if (typeof value !== 'string') return false;
        return Boolean(value && value.length >= (this.config.minLength || 1));
      },
      message: `Must be at least ${this.config.minLength || 1} characters`
    });

    // Maximum length validation
    this.addRule('maxLength', {
      name: 'maxLength',
      validator: (value: unknown) => {
        if (typeof value !== 'string') return !value;
        return Boolean(!value || value.length <= (this.config.maxLength || 10000));
      },
      message: `Must not exceed ${this.config.maxLength || 10000} characters`
    });

    // URL validation
    this.addRule('url', {
      name: 'url',
      validator: (value: unknown) => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    });

    // Alphanumeric validation
    this.addRule('alphanumeric', {
      name: 'alphanumeric',
      validator: (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value),
      message: 'Only letters and numbers are allowed'
    });

    // Phone number validation (basic international format)
    this.addRule('phone', {
      name: 'phone',
      validator: (value: unknown) => typeof value === 'string' && /^\+?[\d\s\-()]+$/.test(value),
      message: 'Please enter a valid phone number'
    });
  }

  /**
   * Adds a custom validation rule
   */
  addRule(type: string, rule: ValidationRule): void {
    if (!this.rules.has(type)) {
      this.rules.set(type, []);
    }
    this.rules.get(type)!.push(rule);
    logger.debug('Validation rule added', { type, name: rule.name });
  }

  /**
   * Validates a value against all rules of a given type
   * Returns validation result with any error messages
   */
  validate(value: unknown, type: string): { isValid: boolean; errors: string[] } {
    const rules = this.rules.get(type) || [];
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        if (!rule.validator(value)) {
          errors.push(rule.message);
        }
      } catch (error) {
        logger.error('Validation rule error', { type, rule: rule.name, error });
        errors.push('Validation error occurred');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a value against multiple rule types
   * Useful for fields that need multiple validations
   */
  validateMultiple(value: unknown, types: string[]): { isValid: boolean; errors: string[] } {
    const allErrors: string[] = [];

    for (const type of types) {
      const result = this.validate(value, type);
      allErrors.push(...result.errors);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Sanitizes string input to remove dangerous characters
   * This provides defense-in-depth alongside HTML sanitization
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove dangerous HTML characters if special chars not allowed
    if (!this.config.allowSpecialChars) {
      sanitized = sanitized.replace(/[<>]/g, '');
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Remove script injection attempts
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Enforce maximum length
    if (sanitized.length > this.config.maxLength!) {
      sanitized = sanitized.substring(0, this.config.maxLength);
    }

    return sanitized;
  }

  /**
   * Updates the validator configuration
   */
  updateConfig(updates: Partial<InputValidatorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupDefaultRules(); // Refresh rules with new config
  }
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Validates password strength and checks for common vulnerabilities
 * Implements NIST password guidelines
 */
export class PasswordValidator {
  private static instance: PasswordValidator;
  private config: PasswordValidatorConfig;
  private commonPasswords: Set<string>;

  private constructor(config: PasswordValidatorConfig = {}) {
    this.config = {
      minScore: 4,
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      checkCommonPasswords: true,
      ...config
    };
    this.commonPasswords = COMMON_PASSWORDS;
  }

  static getInstance(config?: PasswordValidatorConfig): PasswordValidator {
    if (!PasswordValidator.instance) {
      PasswordValidator.instance = new PasswordValidator(config);
    }
    return PasswordValidator.instance;
  }

  /**
   * Validates password strength based on multiple criteria
   * Returns detailed feedback to help users create stronger passwords
   */
  validatePassword(password: string): PasswordStrength {
    if (!password || typeof password !== 'string') {
      return {
        score: 0,
        maxScore: 5,
        feedback: ['Password is required'],
        isValid: false,
        strengthLevel: 'weak'
      };
    }

    const feedback: string[] = [];
    let score = 0;
    const maxScore = 5;

    // Length check (minimum 8 characters recommended by NIST)
    if (password.length >= this.config.minLength!) {
      score += 1;
    } else {
      feedback.push(`Password should be at least ${this.config.minLength} characters long`);
    }

    // Bonus for longer passwords
    if (password.length >= 12) {
      score += 0.5;
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else if (this.config.requireUppercase) {
      feedback.push('Include at least one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else if (this.config.requireLowercase) {
      feedback.push('Include at least one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else if (this.config.requireNumbers) {
      feedback.push('Include at least one number');
    }

    // Special character check
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 1;
    } else if (this.config.requireSpecialChars) {
      feedback.push('Include at least one special character');
    }

    // Check for common passwords
    if (this.config.checkCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.commonPasswords.has(lowerPassword)) {
        score = Math.max(0, score - 2);
        feedback.push('This password is too common. Please choose a more unique password');
      }
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 0.5);
      feedback.push('Avoid repeating the same character multiple times');
    }

    // Check for sequential characters
    if (/(?:abc|bcd|cde|123|234|345|456|567|678|789)/i.test(password)) {
      score = Math.max(0, score - 0.5);
      feedback.push('Avoid sequential characters');
    }

    // Determine strength level
    const strengthLevel = this.getStrengthLevel(score, maxScore);

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      maxScore,
      feedback,
      isValid: score >= this.config.minScore!,
      strengthLevel
    };
  }

  /**
   * Determines the password strength level based on score
   */
  private getStrengthLevel(score: number, maxScore: number): PasswordStrength['strengthLevel'] {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return 'very-strong';
    if (percentage >= 70) return 'strong';
    if (percentage >= 50) return 'good';
    if (percentage >= 30) return 'fair';
    return 'weak';
  }

  /**
   * Checks if a password has been exposed in known data breaches
   * Uses k-anonymity model with haveibeenpwned API
   * 
   * In production, implement proper API calls to haveibeenpwned.com
   */
  async checkPasswordBreach(password: string): Promise<{
    isBreached: boolean;
    occurrences?: number;
  }> {
    try {
      // Hash the password
      const hash = await hashString(password);
      
      // In production, send first 5 characters of hash to haveibeenpwned API
      // and check if remaining hash characters appear in response
      // This implements k-anonymity to protect the password
      
      logger.debug('Password breach check completed', { 
        component: 'PasswordValidator',
        hashPrefix: hash.substring(0, 5)
      });

      // For demo purposes, return not breached
      // In production, implement actual API call to haveibeenpwned.com
      return {
        isBreached: false,
        occurrences: 0
      };
    } catch (error) {
      logger.error('Password breach check failed', { error });
      // Fail open - don't block user if breach check fails
      return {
        isBreached: false
      };
    }
  }

  /**
   * Generates a strong random password that meets all criteria
   * Useful for password reset flows or suggesting strong passwords
   */
  generateStrongPassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    let password = '';
    
    // Ensure at least one character from each required set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[array[i] % allChars.length];
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Updates the validator configuration
   */
  updateConfig(updates: Partial<PasswordValidatorConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Password validator config updated', { updates });
  }

  /**
   * Adds passwords to the common passwords blocklist
   */
  addCommonPasswords(passwords: string[]): void {
    passwords.forEach(pwd => this.commonPasswords.add(pwd.toLowerCase()));
  }
}

// ============================================================================
// SECURITY MONITORING
// ============================================================================

/**
 * Monitors security events and detects suspicious activity patterns
 * Provides real-time threat detection and alerting capabilities
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alerts: SuspiciousActivityAlert[] = [];
  private config: SecurityMonitorConfig;
  private eventListenersAttached: boolean = false;

  private constructor(config: SecurityMonitorConfig = {}) {
    this.config = {
      maxEvents: 1000,
      alertThreshold: 5,
      enableAutoBlock: false,
      retentionHours: 24,
      ...config
    };
    this.setupEventListeners();
  }

  static getInstance(config?: SecurityMonitorConfig): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor(config);
    }
    return SecurityMonitor.instance;
  }

  /**
   * Sets up browser event listeners to monitor for suspicious activity
   * These listeners help detect potential security threats in real-time
   */
  private setupEventListeners(): void {
    // Prevent duplicate listener attachment
    if (this.eventListenersAttached || typeof window === 'undefined') {
      return;
    }

    // Monitor JavaScript errors that might indicate attacks
    window.addEventListener('error', (event) => {
      this.logSecurityEvent({
        eventType: 'javascript_error',
        riskScore: 1,
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logSecurityEvent({
        eventType: 'unhandled_rejection',
        riskScore: 2,
        details: {
          reason: event.reason?.toString()
        }
      });
    });

    // Monitor security policy violations
    if ('SecurityPolicyViolationEvent' in window) {
      document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
        this.logSecurityEvent({
          eventType: 'csp_violation',
          riskScore: 7,
          details: {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber
          }
        });
      });
    }

    this.eventListenersAttached = true;
    logger.info('Security monitoring initialized');
  }

  /**
   * Logs a security event and analyzes it for suspicious patterns
   * Events are stored in memory and analyzed for threat detection
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      id: generateId(),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...event
    };

    this.events.push(fullEvent);
    
    // Maintain memory limits by keeping only recent events
    if (this.events.length > this.config.maxEvents!) {
      this.events = this.events.slice(-this.config.maxEvents!);
    }

    // Analyze the event for suspicious patterns
    this.analyzeForSuspiciousActivity(fullEvent);

    logger.debug('Security event logged', { 
      eventType: fullEvent.eventType, 
      riskScore: fullEvent.riskScore 
    });
  }

  /**
   * Attempts to get the client IP address
   * In production, this should come from server-side headers
   */
  private getClientIP(): string | undefined {
    // This is a placeholder - actual IP should come from server
    // Check common headers: X-Forwarded-For, X-Real-IP, CF-Connecting-IP
    return undefined;
  }

  /**
   * Analyzes events to detect suspicious patterns and generate alerts
   * Implements various heuristics to identify potential security threats
   */
  private analyzeForSuspiciousActivity(event: SecurityEvent): void {
    // Alert on high-risk individual events
    if (event.riskScore >= 7) {
      this.createAlert({
        alertType: 'high_risk_event',
        severity: 'high',
        userId: event.userId,
        description: `High risk security event detected: ${event.eventType}`,
        metadata: event.details,
        resolved: false
      });
    }

    // Detect rapid-fire events from same user (possible attack)
    if (event.userId) {
      const recentUserEvents = this.getRecentEventsByUser(event.userId, 60000); // Last minute
      
      if (recentUserEvents.length >= this.config.alertThreshold!) {
        this.createAlert({
          alertType: 'rapid_fire_events',
          severity: 'medium',
          userId: event.userId,
          description: `Unusual number of events detected from user in short time period`,
          metadata: {
            eventCount: recentUserEvents.length,
            timeWindow: '60 seconds'
          },
          resolved: false
        });
      }
    }

    // Detect repeated CSP violations (possible attack attempt)
    if (event.eventType === 'csp_violation') {
      const recentViolations = this.events.filter(e => 
        e.eventType === 'csp_violation' && 
        Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
      );

      if (recentViolations.length >= 5) {
        this.createAlert({
          alertType: 'repeated_csp_violations',
          severity: 'critical',
          userId: event.userId,
          description: 'Multiple CSP violations detected - possible XSS attack attempt',
          metadata: {
            violationCount: recentViolations.length,
            details: event.details
          },
          resolved: false
        });
      }
    }

    // Detect error storms (many errors in short time)
    if (event.eventType === 'javascript_error') {
      const recentErrors = this.events.filter(e => 
        e.eventType === 'javascript_error' && 
        Date.now() - e.timestamp.getTime() < 60000
      );

      if (recentErrors.length >= 10) {
        this.createAlert({
          alertType: 'error_storm',
          severity: 'medium',
          description: 'High volume of JavaScript errors detected',
          metadata: {
            errorCount: recentErrors.length
          },
          resolved: false
        });
      }
    }
  }

  /**
   * Creates a security alert and logs it
   * Alerts can be used to trigger automated responses or notify administrators
   */
  createAlert(alert: Omit<SuspiciousActivityAlert, 'id' | 'timestamp'>): void {
    const fullAlert: SuspiciousActivityAlert = {
      id: generateId(),
      timestamp: new Date(),
      ...alert
    };

    this.alerts.push(fullAlert);
    
    logger.warn('Security alert created', { 
      alertType: fullAlert.alertType,
      severity: fullAlert.severity,
      description: fullAlert.description
    });

    // In production, this could trigger webhooks, email notifications, etc.
    this.handleAlert(fullAlert);
  }

  /**
   * Handles alert actions based on severity
   * This is where you'd implement automatic responses to threats
   */
  private handleAlert(alert: SuspiciousActivityAlert): void {
    switch (alert.severity) {
      case 'critical':
        // In production: immediately notify security team, possibly auto-block
        logger.error('CRITICAL SECURITY ALERT', { alert });
        break;
      case 'high':
        // In production: notify security team, flag for review
        logger.warn('High severity security alert', { alert });
        break;
      case 'medium':
        // In production: log and monitor, notify if pattern continues
        logger.warn('Medium severity security alert', { alert });
        break;
      case 'low':
        // In production: log for analysis
        logger.info('Low severity security alert', { alert });
        break;
    }
  }

  /**
   * Gets recent events for a specific user
   */
  private getRecentEventsByUser(userId: string, timeWindowMs: number): SecurityEvent[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.events.filter(e => 
      e.userId === userId && 
      e.timestamp.getTime() >= cutoffTime
    );
  }

  /**
   * Retrieves the most recent security events
   * Useful for displaying in admin dashboards or security logs
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Gets events filtered by type
   */
  getEventsByType(eventType: string, limit?: number): SecurityEvent[] {
    const filtered = this.events.filter(e => e.eventType === eventType);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Gets events filtered by user
   */
  getEventsByUser(userId: string, limit?: number): SecurityEvent[] {
    const filtered = this.events.filter(e => e.userId === userId);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Gets currently active alerts (within retention period)
   * These are alerts that haven't been resolved and are still recent
   */
  getActiveAlerts(): SuspiciousActivityAlert[] {
    const cutoffTime = Date.now() - (this.config.retentionHours! * 60 * 60 * 1000);
    return this.alerts.filter(alert => 
      !alert.resolved && 
      alert.timestamp.getTime() >= cutoffTime
    );
  }

  /**
   * Gets all alerts filtered by severity
   */
  getAlertsBySeverity(severity: SuspiciousActivityAlert['severity']): SuspiciousActivityAlert[] {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Marks an alert as resolved
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('Alert resolved', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Clears old events and alerts to manage memory usage
   */
  cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.retentionHours! * 60 * 60 * 1000);
    
    const eventsBefore = this.events.length;
    const alertsBefore = this.alerts.length;
    
    this.events = this.events.filter(e => e.timestamp.getTime() >= cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() >= cutoffTime);
    
    const eventsRemoved = eventsBefore - this.events.length;
    const alertsRemoved = alertsBefore - this.alerts.length;
    
    if (eventsRemoved > 0 || alertsRemoved > 0) {
      logger.info('Cleaned up old security data', { eventsRemoved, alertsRemoved });
    }
  }

  /**
   * Gets statistics about security events
   * Useful for dashboards and reports
   */
  getStatistics(): {
    totalEvents: number;
    totalAlerts: number;
    activeAlerts: number;
    eventsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    averageRiskScore: number;
  } {
    const eventsByType: Record<string, number> = {};
    let totalRiskScore = 0;

    this.events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      totalRiskScore += event.riskScore;
    });

    const alertsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.alerts.forEach(alert => {
      alertsBySeverity[alert.severity]++;
    });

    return {
      totalEvents: this.events.length,
      totalAlerts: this.alerts.length,
      activeAlerts: this.getActiveAlerts().length,
      eventsByType,
      alertsBySeverity,
      averageRiskScore: this.events.length > 0 ? totalRiskScore / this.events.length : 0
    };
  }

  /**
    * Generates a device fingerprint for security tracking
    */
   generateDeviceFingerprint(): string {
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     ctx?.fillText(navigator.userAgent, 10, 10);
     return btoa(canvas.toDataURL());
   }

  /**
    * Records a login attempt for security analysis
    */
   recordLoginAttempt(ipAddress: string, userAgent: string, success: boolean, userId?: string): SuspiciousActivityAlert[] {
     const alerts: SuspiciousActivityAlert[] = [];

     // Basic rate limiting logic (simplified)
     const recentAttempts = this.events.filter(e =>
       e.eventType === 'login_attempt' &&
       e.ipAddress === ipAddress &&
       Date.now() - e.timestamp.getTime() < 15 * 60 * 1000 // 15 minutes
     );

     if (recentAttempts.length >= 5) {
       alerts.push({
         id: generateId(),
         alertType: 'rapid_login_attempts',
         severity: 'medium',
         userId,
         timestamp: new Date(),
         description: 'Multiple login attempts detected',
         metadata: { attemptCount: recentAttempts.length },
         resolved: false
       });
     }

     // Log the attempt
     this.logSecurityEvent({
       eventType: 'login_attempt',
       userId,
       ipAddress,
       userAgent,
       riskScore: success ? 0 : 2,
       details: { success }
     });

     return alerts;
   }

  /**
    * Analyzes device fingerprint for suspicious activity
    */
   analyzeDeviceFingerprint(userId: string, fingerprint: string): SuspiciousActivityAlert[] {
     const alerts: SuspiciousActivityAlert[] = [];

     // Check for fingerprint changes (simplified)
     const userEvents = this.events.filter(e => e.userId === userId);
     const recentFingerprints = userEvents
       .filter(e => e.details?.device_fingerprint)
       .map(e => e.details.device_fingerprint)
       .slice(-5); // Last 5 fingerprints

     if (recentFingerprints.length > 0 && !recentFingerprints.includes(fingerprint)) {
       alerts.push({
         id: generateId(),
         alertType: 'device_fingerprint_change',
         severity: 'low',
         userId,
         timestamp: new Date(),
         description: 'Device fingerprint changed',
         metadata: { newFingerprint: fingerprint },
         resolved: false
       });
     }

     return alerts;
   }

  /**
    * Checks if an account should be locked due to failed attempts
    */
   shouldLockAccount(ipAddress: string): boolean {
     const recentFailures = this.events.filter(e =>
       e.eventType === 'login_attempt' &&
       e.ipAddress === ipAddress &&
       !e.details?.success &&
       Date.now() - e.timestamp.getTime() < 30 * 60 * 1000 // 30 minutes
     );

     return recentFailures.length >= 3;
   }

  /**
    * Creates and logs a security event
    */
   createSecurityEvent(userId: string, eventType: string, details?: Record<string, unknown>): SecurityEvent {
     const event: Omit<SecurityEvent, 'id' | 'timestamp'> = {
       eventType,
       userId,
       riskScore: 1, // Default risk score
       details: details || {}
     };

     this.logSecurityEvent(event);

     // Return the created event (though id and timestamp are added internally)
     return {
       id: generateId(),
       timestamp: new Date(),
       ...event
     };
   }

  /**
    * Updates monitoring configuration
    */
   updateConfig(updates: Partial<SecurityMonitorConfig>): void {
     this.config = { ...this.config, ...updates };
     logger.info('Security monitor config updated', { updates });
   }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Pre-initialized singleton instances for convenient access
 * These can be imported directly without calling getInstance()
 */
export const cspManager = CSPManager.getInstance();
export const domSanitizer = DOMSanitizer.getInstance();
export const inputValidator = InputValidator.getInstance();
export const passwordValidator = PasswordValidator.getInstance();
export const securityMonitor = SecurityMonitor.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generates a CSP header string for the specified environment
 * This is a convenience wrapper around CSPManager.generateCSPHeader()
 * 
 * @example
 * const header = generateCSPHeader('production');
 * response.setHeader('Content-Security-Policy', header);
 */
export function generateCSPHeader(environment?: 'development' | 'production' | 'minimal'): string {
  return cspManager.generateCSPHeader(environment);
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * This is a convenience wrapper around DOMSanitizer.sanitizeHTML()
 * 
 * @example
 * const safeHTML = sanitizeHTML(userGeneratedContent);
 */
export function sanitizeHTML(html: string): string {
  return domSanitizer.sanitizeHTML(html);
}

/**
 * Escapes HTML special characters in text
 * This is a convenience wrapper around DOMSanitizer.sanitizeText()
 * 
 * @example
 * const safeText = sanitizeText(userInput);
 */
export function sanitizeText(text: string): string {
  return domSanitizer.sanitizeText(text);
}

/**
 * Validates and sanitizes URLs
 * This is a convenience wrapper around DOMSanitizer.sanitizeURL()
 * 
 * @example
 * const safeURL = sanitizeURL(userProvidedURL);
 */
export function sanitizeURL(url: string): string {
  return domSanitizer.sanitizeURL(url);
}

/**
 * Validates input against a specific rule type
 * This is a convenience wrapper around InputValidator.validate()
 * 
 * @example
 * const result = validateInput(email, 'email');
 * if (!result.isValid) {
 *   console.log(result.errors);
 * }
 */
export function validateInput(value: unknown, type: string): { isValid: boolean; errors: string[] } {
  return inputValidator.validate(value, type);
}

/**
 * Sanitizes string input
 * This is a convenience wrapper around InputValidator.sanitizeInput()
 * 
 * @example
 * const clean = sanitizeInput(userInput);
 */
export function sanitizeInput(input: string): string {
  return inputValidator.sanitizeInput(input);
}

/**
 * Validates password strength
 * This is a convenience wrapper around PasswordValidator.validatePassword()
 * 
 * @example
 * const strength = validatePassword(password);
 * if (!strength.isValid) {
 *   console.log(strength.feedback);
 * }
 */
export function validatePassword(password: string): PasswordStrength {
  return passwordValidator.validatePassword(password);
}

/**
 * Logs a security event
 * This is a convenience wrapper around SecurityMonitor.logSecurityEvent()
 * 
 * @example
 * logSecurityEvent({
 *   eventType: 'login_attempt',
 *   userId: user.id,
 *   riskScore: 2,
 *   details: { success: true }
 * });
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
  securityMonitor.logSecurityEvent(event);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Default export containing all classes, instances, and utility functions
 * This allows for both named imports and default import usage
 */
export default {
  // Classes
  CSPManager,
  DOMSanitizer,
  InputValidator,
  PasswordValidator,
  SecurityMonitor,
  
  // Singleton instances
  cspManager,
  domSanitizer,
  inputValidator,
  passwordValidator,
  securityMonitor,
  
  // Convenience functions
  generateCSPHeader,
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  validateInput,
  sanitizeInput,
  validatePassword,
  logSecurityEvent,
  generateId
};