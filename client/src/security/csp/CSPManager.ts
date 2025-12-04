/**
 * Content Security Policy Manager
 * 
 * Manages CSP headers, nonce generation, and violation reporting
 */

import type { CSPDirectives, SecurityEvent } from '@client/types/security-types';

import { securityConfig } from '../config/security-config';
import { SecurityMonitor } from '../monitoring/SecurityMonitor';

export class CSPManager {
  private static instance: CSPManager;
  private nonce: string | null = null;
  private violationReports: SecurityEvent[] = [];
  private monitor: SecurityMonitor;

  private constructor() {
    this.monitor = SecurityMonitor.getInstance();
    this.generateNonce();
    this.setupViolationReporting();
  }

  public static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager();
    }
    return CSPManager.instance;
  }

  /**
   * Generate a cryptographically secure nonce for script execution
   */
  public generateNonce(): string {
    const array = new Uint8Array(securityConfig.csp.nonce.length);
    crypto.getRandomValues(array);
    this.nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return this.nonce;
  }

  /**
   * Get the current nonce value
   */
  public getNonce(): string | null {
    return this.nonce;
  }

  /**
   * Build CSP header string from directives
   */
  public buildCSPHeader(customDirectives?: Partial<CSPDirectives>): string {
    const directives = { ...securityConfig.csp.directives, ...customDirectives };
    const cspParts: string[] = [];

    Object.entries(directives).forEach(([directive, values]) => {
      if (directive === 'upgrade-insecure-requests' || directive === 'block-all-mixed-content') {
        if (values === true) {
          cspParts.push(directive.replace(/([A-Z])/g, '-$1').toLowerCase());
        }
      } else if (Array.isArray(values) && values.length > 0) {
        const directiveValues = values.map(value => 
          value === "'nonce-{NONCE}'" ? `'nonce-${this.nonce}'` : value
        );
        cspParts.push(`${directive.replace(/([A-Z])/g, '-$1').toLowerCase()} ${directiveValues.join(' ')}`);
      }
    });

    return cspParts.join('; ');
  }

  /**
   * Apply CSP to the document
   */
  public applyCSP(customDirectives?: Partial<CSPDirectives>): void {
    if (!securityConfig.csp.enabled) {
      return;
    }

    const cspHeader = this.buildCSPHeader(customDirectives);
    const metaTag = document.createElement('meta');
    
    metaTag.httpEquiv = securityConfig.csp.reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';
    metaTag.content = cspHeader;

    // Remove existing CSP meta tag if present
    const existingTag = document.querySelector('meta[http-equiv*="Content-Security-Policy"]');
    if (existingTag) {
      existingTag.remove();
    }

    document.head.appendChild(metaTag);

    this.monitor.logEvent({
      id: crypto.randomUUID(),
      type: 'csp-violation',
      severity: 'info',
      message: 'CSP policy applied',
      source: 'CSPManager',
      timestamp: Date.now(),
      metadata: { policy: cspHeader }
    });
  }

  /**
   * Setup CSP violation reporting
   */
  private setupViolationReporting(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation: SecurityEvent = {
        id: crypto.randomUUID(),
        type: 'csp-violation',
        severity: 'warning',
        message: `CSP violation: ${event.violatedDirective}`,
        source: event.sourceFile || 'unknown',
        timestamp: Date.now(),
        metadata: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
          originalPolicy: event.originalPolicy,
          disposition: event.disposition
        }
      };

      this.violationReports.push(violation);
      this.monitor.logEvent(violation);

      // Limit stored violations to prevent memory leaks
      if (this.violationReports.length > 100) {
        this.violationReports = this.violationReports.slice(-50);
      }
    });
  }

  /**
   * Get recent CSP violation reports
   */
  public getViolationReports(limit = 10): SecurityEvent[] {
    return this.violationReports.slice(-limit);
  }

  /**
   * Clear violation reports
   */
  public clearViolationReports(): void {
    this.violationReports = [];
  }

  /**
   * Check if a URL is allowed by current CSP
   */
  public isURLAllowed(url: string, directive: keyof CSPDirectives): boolean {
    const directives = securityConfig.csp.directives;
    const allowedSources = directives[directive] || [];

    // Check for 'self'
    if (allowedSources.includes("'self'")) {
      try {
        const urlObj = new URL(url);
        const currentOrigin = window.location.origin;
        if (urlObj.origin === currentOrigin) {
          return true;
        }
      } catch {
        // Invalid URL
        return false;
      }
    }

    // Check for wildcard https:
    if (allowedSources.includes('https:') && url.startsWith('https:')) {
      return true;
    }

    // Check for specific domains
    return allowedSources.some(source => {
      if (source.startsWith('https://')) {
        return url.startsWith(source);
      }
      return false;
    });
  }

  /**
   * Add a trusted source to CSP directive
   */
  public addTrustedSource(directive: keyof CSPDirectives, source: string): void {
    const currentDirectives = { ...securityConfig.csp.directives };
    if (!currentDirectives[directive]) {
      currentDirectives[directive] = [];
    }
    
    if (!currentDirectives[directive].includes(source)) {
      currentDirectives[directive].push(source);
      this.applyCSP(currentDirectives);
    }
  }

  /**
   * Create a nonce-enabled script element
   */
  public createScript(src?: string, content?: string): HTMLScriptElement {
    const script = document.createElement('script');
    
    if (this.nonce && securityConfig.csp.nonce.enabled) {
      script.nonce = this.nonce;
    }
    
    if (src) {
      script.src = src;
    }
    
    if (content) {
      script.textContent = content;
    }
    
    return script;
  }

  /**
   * Validate and sanitize inline styles
   */
  public sanitizeInlineStyle(style: string): string {
    // Remove potentially dangerous CSS properties
    const dangerousProperties = [
      'expression',
      'javascript:',
      'vbscript:',
      'data:',
      'behavior',
      '-moz-binding'
    ];

    let sanitized = style;
    dangerousProperties.forEach(prop => {
      const regex = new RegExp(prop, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }
}