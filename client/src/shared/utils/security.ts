/**
 * Security utilities — thin compatibility layer
 *
 * This file re-exports and adapts the canonical security implementations
 * from client/src/security so callers that expect the legacy API (getInstance,
 * simple validate helpers, an instance named `securityMonitor`) continue to work.
 */

import {
  CSPManager as CanonCSPManager,
  InputSanitizer as CanonInputSanitizer,
  SecurityMonitor as CanonSecurityMonitor,
} from '@client/core/security';

// CSPManager adapter that adds a legacy `getInstance()` API while delegating
// to the canonical implementation
export class CSPManager extends CanonCSPManager {
  private static _instance: CSPManager | null = null;

  constructor(config: any) {
    super(config);
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new CSPManager({
        enabled: false,
        reportUri: '/api/security/csp-report',
        reportOnly: process.env.NODE_ENV !== 'production',
      });
    }
    return this._instance;
  }

  // Provide a simple compatibility method expected by older callers
  generateCSPHeader(environment: 'production' | 'development' = 'development') {
    if (environment === 'production') {
      return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
    }
    return "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:;";
  }
}

// DOMSanitizer: adapter around the canonical InputSanitizer
export class DOMSanitizer {
  private static _instance: CanonInputSanitizer | null = null;

  static getInstance() {
    if (!this._instance) {
      // Create with sensible defaults; feature-level code should initialize real config
      this._instance = new CanonInputSanitizer({
        enabled: true,
        allowedTags: ['p', 'b', 'i', 'em', 'strong', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'] },
      });
    }
    return this._instance;
  }

  static sanitize(input: string) {
    return this.getInstance().sanitizeHTML(input);
  }
}

// InputValidator: lightweight adapter that exposes a getInstance() and validate()
export class InputValidator {
  private static _instance: InputValidator | null = null;
  private impl: CanonInputSanitizer;

  constructor() {
    this.impl = DOMSanitizer.getInstance();
  }

  static getInstance() {
    if (!this._instance) this._instance = new InputValidator();
    return this._instance;
  }

  // Returns true when the input is considered valid (no modification needed)
  validate(value: string) {
    const result = this.impl.sanitizeText(value);
    return !result.wasModified;
  }
}

// PasswordValidator: simple compatibility wrapper
export class PasswordValidator {
  private static _instance: PasswordValidator | null = null;

  static getInstance() {
    if (!this._instance) this._instance = new PasswordValidator();
    return this._instance;
  }

  validate(password: string) {
    const feedback: string[] = [];
    if (!password || password.length < 8) feedback.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(password)) feedback.push('Include an uppercase letter');
    if (!/[0-9]/.test(password)) feedback.push('Include a number');
    return { isValid: feedback.length === 0, feedback };
  }
}

// Provide a default SecurityMonitor instance to satisfy existing imports
const defaultMonitor = new CanonSecurityMonitor({ enabled: false, alertThreshold: 5, monitoringInterval: 30000 });
export { defaultMonitor as securityMonitor };

// Convenience export for validatePassword used across the codebase
export function validatePassword(password: string) {
  return PasswordValidator.getInstance().validate(password);
}

export type PasswordValidationResult = { isValid: boolean; feedback: string[] };
