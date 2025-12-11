/**
 * Content Security Policy Nonce Management
 * Provides secure nonce generation and management for CSP headers
 */

export class CSPNonceManager {
  private static instance: CSPNonceManager;
  private currentNonce: string = '';
  private nonceRotationInterval: number = 300000; // 5 minutes
  private rotationTimer?: NodeJS.Timeout;

  private constructor() {
    this.generateNewNonce();
    this.startNonceRotation();
  }

  public static getInstance(): CSPNonceManager {
    if (!CSPNonceManager.instance) {
      CSPNonceManager.instance = new CSPNonceManager();
    }
    return CSPNonceManager.instance;
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateNewNonce(): void {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    this.currentNonce = btoa(String.fromCharCode(...array));
  }

  /**
   * Get the current nonce value
   */
  public getCurrentNonce(): string {
    return this.currentNonce;
  }

  /**
   * Start automatic nonce rotation
   */
  private startNonceRotation(): void {
    this.rotationTimer = setInterval(() => {
      this.generateNewNonce();
    }, this.nonceRotationInterval);
  }

  /**
   * Stop nonce rotation (for cleanup)
   */
  public stopRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }

  /**
   * Set custom rotation interval
   */
  public setRotationInterval(intervalMs: number): void {
    this.nonceRotationInterval = intervalMs;
    this.stopRotation();
    this.startNonceRotation();
  }

  /**
   * Generate CSP header with current nonce
   */
  public generateCSPHeader(): string {
    const nonce = this.getCurrentNonce();
    
    const directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'"
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS libraries
        "https://fonts.googleapis.com"
      ],
      'font-src': [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      'img-src': [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      'connect-src': [
        "'self'",
        "ws:",
        "wss:",
        "https://api.chanuka.ke"
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      // frame-ancestors cannot be set via meta tag - must use HTTP headers only
      'upgrade-insecure-requests': []
    };

    return Object.entries(directives)
      .map(([directive, sources]) => 
        `${directive} ${sources.join(' ')}`
      )
      .join('; ');
  }
}

// Export singleton instance
export const cspNonceManager = CSPNonceManager.getInstance();