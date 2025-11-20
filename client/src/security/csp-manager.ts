/**
 * Content Security Policy Manager
 * Implements CSP with nonce-based script execution and violation reporting
 */

import { logger } from '@client/utils/logger';
import { SecurityEvent, CSPViolation } from '@client/types';

export interface CSPConfig {
  enabled: boolean;
  reportUri: string;
  reportOnly: boolean;
  nonce?: string;
}

export class CSPManager {
  private config: CSPConfig;
  private nonce: string;
  private violations: CSPViolation[] = [];

  constructor(config: CSPConfig) {
    this.config = config;
    this.nonce = config.nonce || this.generateNonce();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('CSP Manager disabled');
      return;
    }

    try {
      // Set up CSP policy
      this.setupCSP();
      
      // Set up violation reporting
      this.setupViolationReporting();
      
      // Apply security headers
      this.applySecurityHeaders();

      logger.info('CSP Manager initialized successfully', {
        reportOnly: this.config.reportOnly,
        nonce: this.nonce.substring(0, 8) + '...'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize CSP Manager', { error: errorMessage });
      throw error;
    }
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
  }

  private setupCSP(): void {
    // CSP is now handled server-side via HTTP headers
    // Client-side CSP management is disabled to avoid conflicts

    // Store nonce for reference (scripts should already have nonces from server)
    (window as any).__CSP_NONCE__ = this.nonce;

    logger.info('CSP Manager initialized - using server-side CSP headers');
  }

  private buildCSPPolicy(): string {
    const directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        `'nonce-${this.nonce}'`,
        "'strict-dynamic'",
        // Allow specific trusted domains
        'https://cdn.chanuka.ke',
        // Development allowances
        ...(process.env.NODE_ENV === 'development' ? [
          "'unsafe-eval'", // For HMR
          'http://localhost:*',
          'ws://localhost:*',
          'wss://localhost:*'
        ] : [])
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
        'https://fonts.googleapis.com',
        'https://cdn.chanuka.ke'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://cdn.chanuka.ke'
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
        'https://cdn.chanuka.ke'
      ],
      'connect-src': [
        "'self'",
        'https://api.chanuka.ke',
        'wss://ws.chanuka.ke',
        // Development allowances
        ...(process.env.NODE_ENV === 'development' ? [
          'http://localhost:*',
          'ws://localhost:*',
          'wss://localhost:*'
        ] : [])
      ],
      'worker-src': [
        "'self'",
        'blob:'
      ],
      'child-src': [
        "'self'",
        'blob:'
      ],
      'frame-src': [
        "'none'"
      ],
      'object-src': [
        "'none'"
      ],
      'base-uri': [
        "'self'"
      ],
      'form-action': [
        "'self'"
      ],
      'frame-ancestors': [
        "'none'"
      ],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': [],
      'report-uri': [this.config.reportUri]
    };

    return Object.entries(directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  private setupViolationReporting(): void {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event);
    });

    // Set up reporting endpoint
    if (typeof window !== 'undefined') {
      (window as any).__reportCSPViolation__ = (violation: CSPViolation) => {
        this.handleCSPViolation(violation);
      };
    }
  }

  private handleCSPViolation(event: SecurityPolicyViolationEvent | CSPViolation): void {
    let violation: CSPViolation;
    
    if ('documentURI' in event) {
      // SecurityPolicyViolationEvent
      violation = {
        documentUri: event.documentURI,
        referrer: event.referrer,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        disposition: event.disposition as 'enforce' | 'report',
        blockedUri: event.blockedURI,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        sourceFile: event.sourceFile,
        statusCode: event.statusCode
      };
    } else {
      // Already a CSPViolation object
      violation = event;
    }

    this.violations.push(violation);

    // Log violation
    logger.warn('CSP Violation detected', {
      component: 'CSPManager',
      violation
    });

    // Create security event
    const securityEvent: Partial<SecurityEvent> = {
      type: 'csp_violation',
      severity: this.assessViolationSeverity(violation),
      source: 'CSPManager',
      details: violation
    };

    // Report to security monitor
    this.reportSecurityEvent(securityEvent);

    // Send to backend if configured
    this.reportViolationToBackend(violation);
  }

  private assessViolationSeverity(violation: CSPViolation): 'low' | 'medium' | 'high' | 'critical' {
    // Assess severity based on violation type
    if (violation.violatedDirective.includes('script-src')) {
      return 'high'; // Script violations are serious
    }
    if (violation.violatedDirective.includes('object-src') || 
        violation.violatedDirective.includes('frame-src')) {
      return 'critical'; // Object/frame violations could indicate XSS
    }
    if (violation.violatedDirective.includes('img-src') || 
        violation.violatedDirective.includes('style-src')) {
      return 'medium'; // Style/image violations are less critical
    }
    return 'low';
  }

  private async reportViolationToBackend(violation: CSPViolation): Promise<void> {
    try {
      await fetch(this.config.reportUri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violation)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to report CSP violation to backend', { error: errorMessage });
    }
  }

  private reportSecurityEvent(event: Partial<SecurityEvent>): void {
    // Emit custom event for security monitor
    const customEvent = new CustomEvent('security-event', {
      detail: event
    });
    document.dispatchEvent(customEvent);
  }

  private applySecurityHeaders(): void {
    // Apply additional security headers via meta tags where possible
    const headers = [
      { name: 'X-Content-Type-Options', content: 'nosniff' },
      { name: 'X-Frame-Options', content: 'DENY' },
      { name: 'X-XSS-Protection', content: '1; mode=block' },
      { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
    ];

    headers.forEach(({ name, content }) => {
      const existing = document.querySelector(`meta[http-equiv="${name}"]`);
      if (!existing) {
        const meta = document.createElement('meta');
        meta.setAttribute('http-equiv', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    });
  }

  /**
   * Get current nonce for script execution
   */
  getNonce(): string {
    return this.nonce;
  }

  /**
   * Refresh nonce (should be called on page navigation)
   */
  refreshNonce(): string {
    this.nonce = this.generateNonce();
    (window as any).__CSP_NONCE__ = this.nonce;
    this.setupCSP(); // Reapply CSP with new nonce
    return this.nonce;
  }

  /**
   * Get violation history
   */
  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  /**
   * Clear violation history
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Check if a source is allowed by current policy
   */
  isSourceAllowed(directive: string, source: string): boolean {
    // This is a simplified check - in practice, you'd parse the full CSP
    const policy = (window as any).__CSP_POLICY__;
    if (!policy) return false;

    const directiveMatch = policy.match(new RegExp(`${directive}\\s+([^;]+)`));
    if (!directiveMatch) return false;

    const sources = directiveMatch[1].split(/\s+/);
    return sources.includes(source) || sources.includes("'self'") || sources.includes('*');
  }
}