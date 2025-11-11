/**
 * Main Security Service
 * Coordinates all security components and provides unified security management
 */

import { cspNonceManager } from './csp-nonce';
import { inputSanitizer, ValidationSchemas } from './input-sanitizer';
import { csrfProtection, setupCSRFInterceptor } from './csrf-protection';
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
    this.config = {
      enableCSP: true,
      enableCSRF: true,
      enableRateLimit: true,
      enableVulnerabilityScanning: true,
      enableInputSanitization: true,
      scanInterval: 300000, // 5 minutes
      ...config
    };

    this.initialize();
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
  private initialize(): void {
    console.log('🔒 Initializing Chanuka Security Service...');

    // Initialize CSP if enabled
    if (this.config.enableCSP) {
      this.initializeCSP();
    }

    // Initialize CSRF protection if enabled
    if (this.config.enableCSRF) {
      this.initializeCSRF();
    }

    // Start vulnerability scanning if enabled
    if (this.config.enableVulnerabilityScanning) {
      this.startVulnerabilityScanning();
    }

    // Start threat monitoring
    this.startThreatMonitoring();

    console.log('✅ Security service initialized successfully');
  }

  /**
   * Initialize Content Security Policy
   */
  private initializeCSP(): void {
    // Set initial CSP header if we can (this would typically be done server-side)
    const cspHeader = cspNonceManager.generateCSPHeader();
    
    // Add meta tag for CSP (fallback)
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
  private initializeCSRF(): void {
    // Create initial CSRF token
    csrfProtection.getToken();
    console.log('🔐 CSRF protection initialized');
  }

  /**
   * Start vulnerability scanning
   */
  private startVulnerabilityScanning(): void {
    // Perform initial scan
    const initialScan = vulnerabilityScanner.performScan();
    console.log(`🔍 Initial security scan completed. Score: ${initialScan.score}/100`);
    
    if (initialScan.threats.length > 0) {
      console.warn(`⚠️ Found ${initialScan.threats.length} security threats:`, initialScan.threats);
    }

    // Set up periodic scanning
    if (this.config.scanInterval && this.config.scanInterval > 0) {
      this.scanInterval = setInterval(() => {
        const scan = vulnerabilityScanner.performScan();
        if (scan.threats.length > 0) {
          console.warn(`🚨 Security scan found ${scan.threats.length} threats. Score: ${scan.score}/100`);
          this.notifyThreats(scan.threats);
        }
      }, this.config.scanInterval);
    }
  }

  /**
   * Start real-time threat monitoring
   */
  private startThreatMonitoring(): void {
    this.threatMonitoringCleanup = vulnerabilityScanner.startMonitoring((threat) => {
      console.warn('🚨 Real-time threat detected:', threat);
      this.notifyThreats([threat]);
    });
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
  public setupAxiosInterceptors(axiosInstance: any): void {
    if (this.config.enableCSRF) {
      setupCSRFInterceptor(axiosInstance);
    }

    // Add security headers to all requests
    axiosInstance.interceptors.request.use((config: any) => {
      // Add CSP nonce if available
      if (this.config.enableCSP) {
        config.headers['X-CSP-Nonce'] = cspNonceManager.getCurrentNonce();
      }

      // Add security headers
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      config.headers['X-Content-Type-Options'] = 'nosniff';

      return config;
    });

    console.log('🔗 Axios security interceptors configured');
  }

  /**
   * Sanitize input using configured sanitizer
   */
  public sanitizeInput(input: string, options?: any): string {
    if (!this.config.enableInputSanitization) {
      return input;
    }
    return inputSanitizer.sanitizeText(input, options?.maxLength);
  }

  /**
   * Sanitize HTML content
   */
  public sanitizeHtml(html: string, options?: any): string {
    if (!this.config.enableInputSanitization) {
      return html;
    }
    return inputSanitizer.sanitizeHtml(html, options);
  }

  /**
   * Validate input with schema
   */
  public async validateInput<T>(schema: any, input: unknown): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    if (!this.config.enableInputSanitization) {
      return { success: true, data: input as T };
    }
    return inputSanitizer.validateAndSanitize(schema, input);
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
        currentNonce: cspNonceManager.getCurrentNonce()
      },
      csrf: {
        enabled: this.config.enableCSRF,
        hasValidToken: csrfMetadata?.hasToken && !csrfMetadata?.isExpired || false,
        tokenExpiresIn: csrfMetadata?.expiresIn || 0
      },
      rateLimit: {
        enabled: this.config.enableRateLimit,
        activeKeys: clientRateLimiter['storage']?.size || 0
      },
      vulnerabilityScanning: {
        enabled: this.config.enableVulnerabilityScanning,
        lastScanScore: latestScan?.score || 0,
        threatsFound: latestScan?.threats.length || 0
      },
      inputSanitization: {
        enabled: this.config.enableInputSanitization
      }
    };
  }

  /**
   * Perform manual security scan
   */
  public performSecurityScan() {
    if (!this.config.enableVulnerabilityScanning) {
      throw new Error('Vulnerability scanning is disabled');
    }
    return vulnerabilityScanner.performScan();
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
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart services if needed
    if (newConfig.scanInterval !== undefined) {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
      }
      if (this.config.enableVulnerabilityScanning) {
        this.startVulnerabilityScanning();
      }
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    if (this.threatMonitoringCleanup) {
      this.threatMonitoringCleanup();
    }

    cspNonceManager.stopRotation();
    clientRateLimiter.destroy();
    
    console.log('🔒 Security service destroyed');
  }
}

// Export validation schemas for easy access
export { ValidationSchemas };

// Export singleton instance
export const securityService = SecurityService.getInstance();

// Export individual services for direct access if needed
export {
  cspNonceManager,
  inputSanitizer,
  csrfProtection,
  clientRateLimiter,
  vulnerabilityScanner
};