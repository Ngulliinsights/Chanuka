/**
 * Security Utilities Module
 *
 * Provides comprehensive utilities for security-related operations,
 * including input sanitization, validation, encryption helpers,
 * and security checks.
 *
 * This module consolidates security-related utilities from various sources
 * into a unified, framework-agnostic interface.
 */

import * as crypto from 'crypto';

import { logger } from '../observability/logging';

// ==================== Type Definitions ====================

export interface SanitizationOptions {
  allowHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  maxConsecutiveChars: number;
}

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
}

export interface TokenOptions {
  expiresIn: string | number;
  issuer?: string;
  audience?: string;
}

// ==================== Input Sanitization ====================

/**
 * Sanitizes HTML input to prevent XSS attacks.
 */
export function sanitizeHtml(input: string, options: SanitizationOptions = {}): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // Remove potentially dangerous HTML
  if (!options.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else if (options.allowedTags) {
    // Keep only allowed tags
    const allowedTagsPattern = new RegExp(
      `<(?!/?(${options.allowedTags.join('|')})\\b)[^>]*>`,
      'gi'
    );
    sanitized = sanitized.replace(allowedTagsPattern, '');
  }

  // Remove dangerous attributes
  if (options.allowedAttributes) {
    sanitized = sanitized.replace(
      /<([^>]+)>/g,
      (_match, tagContent) => {
        return tagContent.replace(
          /(\w+)=["']([^"']*)["']/g,
          (attrMatch: string, attrName: string, attrValue: string) => {
            const allowedAttrs = options.allowedAttributes?.[attrName.toLowerCase()];
            if (allowedAttrs?.includes(attrValue)) {
              return attrMatch;
            }
            return '';
          }
        );
      }
    );
  }

  // Remove script and event handlers
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes SQL input to prevent SQL injection.
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove block comments
    .trim();
}

/**
 * Sanitizes filename to prevent directory traversal and other attacks.
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';

  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove dangerous characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .substring(0, 255); // Limit length
}

// ==================== Password Security ====================

/**
 * Default password policy.
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  maxConsecutiveChars: 3
};

/**
 * Validates password strength against a policy.
 */
export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): ValidationResult {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>\-_=+\[\]~`/]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (policy.preventCommonPasswords) {
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      'password123', 'qwerty', 'abc123', 'admin', 'welcome123'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
  }

  if (policy.maxConsecutiveChars > 0) {
    const consecutivePattern = new RegExp(`(.)\\1{${policy.maxConsecutiveChars},}`);
    if (consecutivePattern.test(password)) {
      errors.push(`Password cannot contain more than ${policy.maxConsecutiveChars} consecutive identical characters`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a secure random password.
 */
export function generateSecurePassword(length: number = 12): string {
  const chars = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  let password = '';

  // Ensure at least one character from each category
  password += chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)];
  password += chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)];
  password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
  password += chars.special[Math.floor(Math.random() * chars.special.length)];

  // Fill the rest randomly
  const allChars = chars.lowercase + chars.uppercase + chars.numbers + chars.special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ==================== Encryption Utilities ====================

/**
 * Generates a secure random key.
 */
export function generateKey(length: number = 32): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Encrypts data using AES-256-CBC.
 */
export function encrypt(
  data: string,
  key: Buffer | string,
  options: EncryptionOptions = {}
): string {
  const algorithm = options.algorithm || 'aes-256-cbc';
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  const iv = crypto.randomBytes(options.ivLength || 16);

  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    algorithm
  });
}

/**
 * Decrypts data encrypted with the encrypt function.
 */
export function decrypt(
  encryptedData: string,
  key: Buffer | string
): string {
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  const { encrypted, iv, algorithm } = JSON.parse(encryptedData);

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, Buffer.from(iv, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a hash of data using SHA-256.
 */
export function hash(data: string, salt?: string): string {
  const saltedData = salt ? data + salt : data;
  return crypto.createHash('sha256').update(saltedData).digest('hex');
}

/**
 * Generates a secure salt.
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Compares a plain text password with a hashed password.
 */
export function comparePassword(password: string, hashedPassword: string, salt?: string): boolean {
  return hash(password, salt) === hashedPassword;
}

// ==================== Token Security ====================

/**
 * Generates a secure random token.
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a secure session ID.
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Generates a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ==================== Input Validation ====================

/**
 * Validates email format and security.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Check for suspicious patterns
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    errors.push('Invalid email format');
  }

  // Check length
  if (email.length > 254) {
    errors.push('Email is too long');
  }

  const sanitized = email.toLowerCase().trim();

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  };
}

/**
 * Validates URL format and security.
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('URL is required');
    return { isValid: false, errors };
  }

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }

    // Check for localhost in production (basic check)
    if (process.env.NODE_ENV === 'production' &&
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      errors.push('Localhost URLs not allowed in production');
    }

  } catch {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: url.trim()
  };
}

// ==================== Security Headers ====================

/**
 * Generates security headers for HTTP responses.
 */
export function generateSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

/**
 * Validates and sanitizes user input for general use.
 */
export function sanitizeUserInput(input: string, options: SanitizationOptions = {}): string {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Apply HTML sanitization
  sanitized = sanitizeHtml(sanitized, options);

  return sanitized;
}

// ==================== Rate Limiting Helpers ====================

/**
 * Generates a rate limit key for a client.
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${action}:${hash(identifier)}`;
}

/**
 * Checks if a request should be rate limited.
 */
export function shouldRateLimit(
  attempts: number,
  maxAttempts: number,
  _windowMs: number
): boolean {
  return attempts >= maxAttempts;
}

// ==================== Audit Logging ====================

/**
 * Logs security events.
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  logger.warn(`Security event: ${event}`, {
    component: 'security',
    severity,
    ...details
  });
}



