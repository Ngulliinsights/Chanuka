/**
 * Unified CSP Manager
 * Combines server-side and client-side CSP approaches
 */

import { logger } from '@client/lib/utils/logger';

import { CSPDirectives, SecurityEvent, CSPViolation } from './security-interface';

export interface CSPConfig {
  enabled: boolean;
  reportOnly: boolean;
  directives: CSPDirectives;
  nonce?: string;
  reportUri: string;
}

export class UnifiedCSPManager {
  private config: CSPConfig;
  private nonce: string;
  private violations: CSPViolation[] = [];
  private healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  constructor(config: CSPConfig) {
    this.config = config;
    this.nonce = config.nonce || this.generateNonce();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Unified CSP Manager disabled');
      return;
    }

    try {
      // Set up CSP policy
      this.setupCSP();

      // Set up violation reporting
      this.setupViolationReporting();

      // Apply security headers
      this.applySecurityHeaders();

      logger.info('Unified CSP Manager initialized successfully', {
        reportOnly: this.config.reportOnly,
        nonce: this.nonce.substring(0, 8) + '...',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize Unified CSP Manager', { error: errorMessage });
      this.healthStatus = 'unhealthy';
      throw error;
    }
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
  }

  private setupCSP(): void {
    // Generate CSP header
    const cspHeader = this.generateCSPHeader();

    // Apply via meta tag (fallback for client-side)
    this.applyMetaTagCSP(cspHeader);

    // Store nonce for reference
    window.__CSP_NONCE__ = this.nonce;
    window.__CSP_POLICY__ = cspHeader;

    logger.info('Unified CSP Manager initialized with policy');
  }

  public generateCSPHeader(): string {
    // Get base directives
    const baseDirectives = this.getBaseDirectives();

    // Get environment-specific directives
    const environmentDirectives = this.getEnvironmentDirectives();

    // Merge directives with priority: base <- environment <- config
    const mergedDirectives = this.mergeDirectives(baseDirectives, environmentDirectives, this.config.directives);

    return (Object.entries(mergedDirectives) as [keyof CSPDirectives, string[]][])
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return String(directive);
        }
        return `${String(directive)} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  private getBaseDirectives(): CSPDirectives {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'child-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'frame-src': ["'none'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
    };
  }

  private getEnvironmentDirectives(): Partial<CSPDirectives> {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return {
        'script-src': [
          "'self'",
          "'unsafe-eval'", // Required for Vite HMR
          "'unsafe-inline'", // Required for development
          'https://cdn.chanuka.ke',
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'", // Required for Tailwind CSS
          'https://fonts.googleapis.com',
        ],
        'connect-src': [
          "'self'",
          'ws://localhost:*',
          'http://localhost:*',
          'https://api.chanuka.ke',
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
      };
    }

    return {
      'script-src': [
        "'self'",
        "'strict-dynamic'",
        'https://cdn.chanuka.ke',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS
        'https://fonts.googleapis.com',
      ],
      'connect-src': [
        "'self'",
        'wss://ws.chanuka.ke',
        'https://api.chanuka.ke',
      ],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.chanuka.ke'],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': [],
    };
  }

  private mergeDirectives(...directives: Array<Partial<CSPDirectives>>): CSPDirectives {
    const result: CSPDirectives = this.getBaseDirectives();

    for (const current of directives) {
      if (!current) continue;
      for (const [key, value] of Object.entries(current) as [keyof CSPDirectives, string[]][]) {
        if (value && value.length > 0) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  private applyMetaTagCSP(cspHeader: string): void {
    // Remove existing CSP meta tag
    const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existing) {
      existing.remove();
    }

    // Add new CSP meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspHeader;
    document.head.appendChild(meta);
  }

  private setupViolationReporting(): void {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', event => {
      this.handleCSPViolation(event);
    });

    // Set up reporting endpoint
    if (typeof window !== 'undefined') {
      window.__reportCSPViolation__ = (violation) => {
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
        statusCode: event.statusCode,
      };
    } else {
      // Already a CSPViolation object
      violation = event;
    }

    this.violations.push(violation);

    // Log violation
    logger.warn('CSP Violation detected', {
      component: 'UnifiedCSPManager',
      violation,
    });

    // Create security event
    const securityEvent: Partial<SecurityEvent> = {
      type: 'csp_violation',
      severity: this.assessViolationSeverity(violation),
      source: 'UnifiedCSPManager',
      timestamp: new Date(),
      details: violation as unknown as Record<string, unknown>,
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
    if (
      violation.violatedDirective.includes('object-src') ||
      violation.violatedDirective.includes('frame-src')
    ) {
      return 'critical'; // Object/frame violations could indicate XSS
    }
    if (
      violation.violatedDirective.includes('img-src') ||
      violation.violatedDirective.includes('style-src')
    ) {
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
        body: JSON.stringify(violation),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to report CSP violation to backend', { error: errorMessage });
    }
  }

  private reportSecurityEvent(event: Partial<SecurityEvent>): void {
    // Emit custom event for security monitor
    const customEvent = new CustomEvent('security-event', {
      detail: event,
    });
    document.dispatchEvent(customEvent);
  }

  private applySecurityHeaders(): void {
    // Apply additional security headers via meta tags where possible
    const headers = [
      { name: 'X-Content-Type-Options', content: 'nosniff' },
      { name: 'X-Frame-Options', content: 'DENY' },
      { name: 'X-XSS-Protection', content: '1; mode=block' },
      { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
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
    window.__CSP_NONCE__ = this.nonce;
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
    const policy = window.__CSP_POLICY__;
    if (!policy) return false;

    const directiveMatch = policy.match(new RegExp(`${directive}\\s+([^;]+)`));
    if (!directiveMatch) return false;

    const sources = directiveMatch[1].split(/\s+/);
    return sources.includes(source) || sources.includes("'self'") || sources.includes('*');
  }

  /**
   * Get health status
   */
  getHealthStatus(): { enabled: boolean; status: string; lastCheck: Date; issues: string[] } {
    const issues: string[] = [];

    if (this.violations.length > 10) {
      issues.push(`High number of CSP violations: ${this.violations.length}`);
      this.healthStatus = 'degraded';
    }

    if (this.healthStatus === 'unhealthy') {
      issues.push('CSP Manager initialization failed');
    }

    return {
      enabled: this.config.enabled,
      status: this.healthStatus,
      lastCheck: new Date(),
      issues,
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): { requestsProcessed: number; threatsBlocked: number; averageResponseTime: number; errorRate: number } {
    return {
      requestsProcessed: 0, // CSP doesn't process requests directly
      threatsBlocked: this.violations.length,
      averageResponseTime: 0,
      errorRate: this.violations.length > 0 ? 1 : 0,
    };
  }

  /**
   * Shutdown the CSP manager
   */
  async shutdown(): Promise<void> {
    // Clean up event listeners
    document.removeEventListener('securitypolicyviolation', () => {});

    // Clear violations
    this.violations = [];

    logger.info('Unified CSP Manager shutdown complete');
  }
}
