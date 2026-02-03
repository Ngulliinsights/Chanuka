/**
 * Main Security Service
 * Coordinates all security components and provides unified security management
 */

import { cspNonceManager } from './csp-nonce';
import { csrfProtection, setupCSRFInterceptor } from './csrf-protection';
import { inputSanitizer } from './input-sanitizer';
import { clientRateLimiter, RateLimitConfigs } from './rate-limiter';
import { vulnerabilityScanner, SecurityThreat } from './vulnerability-scanner';

export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableVulnerabilityScanning: boolean;
  enableInputSanitization: boolean;
  scanInterval?: number; // in milliseconds
}

export interface SecurityStatus {
  csp: {
    enabled: boolean;
    currentNonce: string;
  };
  csrf: {
    enabled: boolean;
    hasValidToken: boolean;
    tokenExpiresIn: number;
  };
  rateLimit: {
    enabled: boolean;
    activeKeys: number;
  };
  vulnerabilityScanning: {
    enabled: boolean;
    lastScanScore: number;
    threatsFound: number;
  };
  inputSanitization: {
    enabled: boolean;
  };
}

export class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private scanInterval?: NodeJS.Timeout;
  private threatMonitoringCleanup?: () => void;
  private threatCallbacks: ((threat: SecurityThreat) => void)[] = [];

  private constructor(config: Partial<SecurityConfig> = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.config = {
      enableCSP: !isDevelopment, // Disable CSP in development to avoid Vite conflicts
      enableCSRF: true,
      enableRateLimit: !isDevelopment, // Disable rate limiting in development
      enableVulnerabilityScanning: true,
      enableInputSanitization: true,
      scanInterval: isDevelopment ? 600000 : 300000, // 10 minutes in dev, 5 minutes in prod
      ...config,
    };

    // Initialize asynchronously
    this.initialize().catch(error => {
      console.error('Failed to initialize security service:', error);
    });
  }

  public static getInstance(config?: Partial<SecurityConfig>): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService(config);
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security service
   */
  private async initialize(): Promise<void> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(
      `🔒 Initializing Security Service (${isDevelopment ? 'Development' : 'Production'} mode)...`
    );

    try {
      // Initialize CSP if enabled
      if (this.config.enableCSP) {
        this.initializeCSP();
      }

      // Initialize CSRF protection if enabled
      if (this.config.enableCSRF) {
        await this.initializeCSRF();
      }

      // Initialize rate limiter if enabled
      if (this.config.enableRateLimit) {
        await clientRateLimiter.initialize();
      }

      // Initialize vulnerability scanner if enabled
      if (this.config.enableVulnerabilityScanning) {
        await vulnerabilityScanner.initialize();
        this.startVulnerabilityScanning();
      }

      // Start threat monitoring
      this.startThreatMonitoring();

      console.log('✅ Security service initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Security service initialization failed:', errorMessage);

      // In development mode, continue with reduced functionality
      if (isDevelopment) {
        console.warn('⚠️ Continuing with reduced security functionality in development mode');
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize Content Security Policy
   * Note: frame-ancestors directive cannot be set via meta tag and must be delivered via HTTP headers
   */
  private initializeCSP(): void {
    // CSP is ideally set server-side via HTTP headers for better security
    // The meta tag approach is a fallback and has limitations (frame-ancestors directive not supported)
    const cspHeader = cspNonceManager.generateCSPHeader();

    // Add meta tag for CSP (fallback - note: some directives like frame-ancestors won't work)
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = cspHeader;
      document.head.appendChild(meta);
    }

    console.log('🛡️ CSP initialized with nonce:', cspNonceManager.getCurrentNonce());
  }

  /**
   * Initialize CSRF protection
   */
  private async initializeCSRF(): Promise<void> {
    // Initialize CSRF protection
    await csrfProtection.initialize();
    console.log('🔐 CSRF protection initialized');
  }

  /**
   * Start vulnerability scanning
   */
  private async startVulnerabilityScanning(): Promise<void> {
    try {
      // Perform initial scan
      const initialScan = await vulnerabilityScanner.scan();
      console.log(`🔍 Initial security scan completed. Score: ${initialScan.score}/100`);

      if (initialScan.threats.length > 0) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.info(
            `ℹ️ Security scan found ${initialScan.threats.length} expected development issues. Score: ${initialScan.score}/100`
          );
          console.debug('Development security issues (expected):', initialScan.threats);
        } else {
          console.warn(
            `⚠️ Found ${initialScan.threats.length} security threats:`,
            initialScan.threats
          );
        }
      }

      // Set up periodic scanning
      if (this.config.scanInterval && this.config.scanInterval > 0) {
        this.scanInterval = setInterval(async () => {
          try {
            const scan = await vulnerabilityScanner.scan();
            if (scan.threats.length > 0) {
              console.warn(
                `🚨 Security scan found ${scan.threats.length} threats. Score: ${scan.score}/100`
              );
              this.notifyThreats(scan.threats);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.debug('Periodic security scan failed:', errorMessage);
          }
        }, this.config.scanInterval);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to start vulnerability scanning:', errorMessage);

      // In development mode, don't throw
      if (process.env.NODE_ENV === 'development') {
        console.warn('Continuing without vulnerability scanning in development mode');
      } else {
        throw error;
      }
    }
  }

  /**
   * Start real-time threat monitoring
   */
  private startThreatMonitoring(): void {
    this.threatMonitoringCleanup = vulnerabilityScanner.startMonitoring(
      (threat: SecurityThreat) => {
        console.warn('🚨 Real-time threat detected:', threat);
        this.notifyThreats([threat]);
      }
    );
  }

  /**
   * Notify threat callbacks
   */
  private notifyThreats(threats: SecurityThreat[]): void {
    threats.forEach(threat => {
      this.threatCallbacks.forEach(callback => {
        try {
          callback(threat);
        } catch (error) {
          console.error('Error in threat callback:', error);
        }
      });
    });
  }

  /**
   * Setup axios interceptors for security
   */
  public setupAxiosInterceptors(axiosInstance: {
    interceptors: {
      request: {
        use: (callback: (config: Record<string, unknown>) => Record<string, unknown>) => void;
      };
    };
  }): void {
    if (this.config.enableCSRF) {
      setupCSRFInterceptor(axiosInstance);
    }

    // Add security headers to all requests
    axiosInstance.interceptors.request.use((config: Record<string, unknown>) => {
      // Add CSP nonce if available
      if (this.config.enableCSP) {
        const headers = config.headers as Record<string, string>;
        headers['X-CSP-Nonce'] = cspNonceManager.getCurrentNonce();
      }

      // Add security headers
      const headers = config.headers as Record<string, string>;
      headers['X-Requested-With'] = 'XMLHttpRequest';
      // cspell: disable-next-line
      headers['X-Content-Type-Options'] = 'nosniff';

      return config;
    });

    console.log('🔗 Axios security interceptors configured');
  }

  /**
   * Sanitize input using configured sanitizer
   */
  public sanitizeInput(input: string): string {
    if (!this.config.enableInputSanitization) {
      return input;
    }
    return inputSanitizer.sanitizeText(input).sanitized;
  }

  /**
   * Sanitize HTML content
   */
  public sanitizeHtml(html: string): string {
    if (!this.config.enableInputSanitization) {
      return html;
    }
    return inputSanitizer.sanitizeHTML(html).sanitized;
  }

  /**
   * Validate input with schema
   */
  public async validateInput<T>(
    schema: Record<string, unknown>,
    input: unknown
  ): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    if (!this.config.enableInputSanitization) {
      return { success: true, data: input as T };
    }
    const result = await inputSanitizer.validateAndSanitize(schema, input);
    return result as { success: true; data: T } | { success: false; errors: string[] };
  }

  /**
   * Check rate limit for an action
   */
  public checkRateLimit(key: string, configName: keyof typeof RateLimitConfigs) {
    if (!this.config.enableRateLimit) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }
    return clientRateLimiter.checkLimit(key, RateLimitConfigs[configName]);
  }

  /**
   * Perform security check on input
   */
  public performSecurityCheck(input: string) {
    return inputSanitizer.performSecurityCheck(input);
  }

  /**
   * Get current security status
   */
  public getSecurityStatus(): SecurityStatus {
    const csrfMetadata = csrfProtection.getTokenMetadata();
    const latestScan = vulnerabilityScanner.getLatestScan();

    return {
      csp: {
        enabled: this.config.enableCSP,
        currentNonce: cspNonceManager.getCurrentNonce(),
      },
      csrf: {
        enabled: this.config.enableCSRF,
        hasValidToken: (csrfMetadata?.hasToken && !csrfMetadata?.isExpired) || false,
        tokenExpiresIn: csrfMetadata?.expiresIn || 0,
      },
      rateLimit: {
        enabled: this.config.enableRateLimit,
        activeKeys: clientRateLimiter.getActiveKeys(),
      },
      vulnerabilityScanning: {
        enabled: this.config.enableVulnerabilityScanning,
        lastScanScore: latestScan?.score || 0,
        threatsFound: latestScan?.threats.length || 0,
      },
      inputSanitization: {
        enabled: this.config.enableInputSanitization,
      },
    };
  }

  /**
   * Perform manual security scan
   */
  public async performSecurityScan() {
    if (!this.config.enableVulnerabilityScanning) {
      throw new Error('Vulnerability scanning is disabled');
    }
    return await vulnerabilityScanner.scan();
  }

  /**
   * Subscribe to threat notifications
   */
  public onThreatDetected(callback: (threat: SecurityThreat) => void): () => void {
    this.threatCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.threatCallbacks.indexOf(callback);
      if (index > -1) {
        this.threatCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update security configuration
   */
  public async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Restart services if needed
    if (newConfig.scanInterval !== undefined) {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
      }
      if (this.config.enableVulnerabilityScanning) {
        await this.startVulnerabilityScanning();
      }
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    if (this.threatMonitoringCleanup) {
      this.threatMonitoringCleanup();
    }

    cspNonceManager.stopRotation();
    clientRateLimiter.destroy();
    csrfProtection.destroy();
    await vulnerabilityScanner.shutdown();

    console.log('🔒 Security service destroyed');
  }
}

// Export validation schemas for easy access (if available)
export const ValidationSchemas = {
  User: {
    registration: {
      email: { type: 'string', format: 'email', required: true },
      password: { type: 'string', minLength: 8, required: true },
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
      acceptTerms: { type: 'boolean', required: true },
    },
    login: {
      email: { type: 'string', format: 'email', required: true },
      password: { type: 'string', required: true },
    },
  },
};

// Export singleton instance
export const securityService = SecurityService.getInstance();

// Export individual services for direct access if needed
export { cspNonceManager, inputSanitizer, csrfProtection, clientRateLimiter, vulnerabilityScanner };
