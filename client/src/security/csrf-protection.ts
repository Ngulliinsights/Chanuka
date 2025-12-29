/**
 * CSRF Protection Implementation
 * Provides token-based CSRF protection for forms and API requests
 */

import { SecurityEvent } from '@client/shared/types';
import { logger } from '@client/utils/logger';

export interface CSRFConfig {
  enabled: boolean;
  tokenName: string;
  headerName: string;
  cookieName?: string;
  tokenLength?: number;
  refreshInterval?: number;
}

// Interface to extend XMLHttpRequest with our custom properties
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _csrfMethod?: string;
  _csrfUrl?: string;
}
export class CSRFProtection {
  private config: CSRFConfig;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(config: CSRFConfig) {
    this.config = {
      tokenLength: 32,
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      cookieName: 'chanuka-csrf-cookie',
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('CSRF Protection disabled');
      return;
    }

    try {
      // Generate initial token
      await this.refreshToken();

      // Set up automatic token refresh
      this.setupTokenRefresh();

      // Intercept forms and AJAX requests
      this.setupRequestInterception();

      // Set up token validation
      this.setupTokenValidation();

      logger.info('CSRF Protection initialized successfully', {
        component: 'CSRFProtection',
        mode: process.env.NODE_ENV === 'development' ? 'development' : 'production'
      });
    } catch (error) {
      // Properly handle the unknown error type by converting to an Error object
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to initialize CSRF Protection', {
        component: 'CSRFProtection',
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // In development mode, don't throw - just continue with client-side token
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Continuing with client-side CSRF protection in development mode');
        return;
      }
      throw error;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      // Try to get token from server first
      const serverToken = await this.fetchTokenFromServer();

      if (serverToken) {
        this.currentToken = serverToken;
      } else {
        // Generate client-side token as fallback
        this.currentToken = this.generateToken();
      }

      // Set expiry time
      this.tokenExpiry = new Date(Date.now() + (this.config.refreshInterval || 30 * 60 * 1000));

      // Store token in various places for access
      this.storeToken(this.currentToken);

      logger.debug('CSRF token refreshed', {
        component: 'CSRFProtection',
        tokenPreview: this.currentToken.substring(0, 8) + '...',
        expiresAt: this.tokenExpiry.toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to refresh CSRF token', {
        component: 'CSRFProtection',
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // In development mode, generate a fallback token instead of throwing
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Using fallback token generation in development mode');
        this.currentToken = this.generateToken();
        this.tokenExpiry = new Date(Date.now() + (this.config.refreshInterval || 30 * 60 * 1000));
        this.storeToken(this.currentToken);
        return;
      }
      throw error;
    }
  }

  private async fetchTokenFromServer(): Promise<string | null> {
    // In development mode, skip server fetch and generate client-side token
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Development mode: using client-side CSRF token generation');
      return this.generateToken();
    }

    try {
      const response = await fetch('/api/security/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.token;
      } else if (response.status === 404 || response.status === 500) {
        // Server doesn't have CSRF endpoint or is failing, generate client-side token
        logger.debug('CSRF endpoint not available or failing, using client-side token generation');
        return this.generateToken();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.debug('Failed to fetch CSRF token from server, using client-side generation', {
        component: 'CSRFProtection',
        error: errorMessage
      });
    }

    // Always fallback to client-side generation
    return this.generateToken();
  }

  private generateToken(): string {
    const array = new Uint8Array(this.config.tokenLength || 32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private storeToken(token: string): void {
    // Store in meta tag
    let meta = document.querySelector(`meta[name="${this.config.tokenName}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = this.config.tokenName;
      document.head.appendChild(meta);
    }
    meta.content = token;

    // Store in window for JavaScript access
    (window as unknown as Record<string, unknown>).__CSRF_TOKEN__ = token;

    // Store in sessionStorage for persistence
    try {
      sessionStorage.setItem(this.config.tokenName, token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Storage failed';
      logger.warn('Failed to store CSRF token in sessionStorage', {
        component: 'CSRFProtection',
        error: errorMessage
      });
    }

    // Set cookie if configured
    if (this.config.cookieName) {
      document.cookie = `${this.config.cookieName}=${token}; path=/; secure; samesite=strict`;
    }
  }

  private setupTokenRefresh(): void {
    if (this.config.refreshInterval) {
      this.refreshTimer = setInterval(() => {
        this.refreshToken().catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          logger.error('Automatic CSRF token refresh failed', {
            component: 'CSRFProtection',
            error: errorMessage
          });
        });
      }, this.config.refreshInterval);
    }
  }

  private setupRequestInterception(): void {
    // Intercept fetch requests
    this.interceptFetch();

    // Intercept XMLHttpRequest
    this.interceptXHR();

    // Intercept form submissions
    this.interceptForms();
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;

    // Use arrow function to preserve 'this' binding
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Convert input to URL string to avoid Request reuse issues
      const url = typeof input === 'string' ? input :
        input instanceof URL ? input.toString() :
          input.url;

      // Create fresh init object to avoid modifying original
      const freshInit: RequestInit = {
        method: 'GET',
        ...init,
        headers: new Headers(init?.headers || {})
      };

      // Only add CSRF token to same-origin requests that need protection
      const tempRequest = new Request(url, { method: freshInit.method || 'GET' });
      if (this.shouldAddToken(tempRequest)) {
        const token = this.getToken();
        if (token) {
          (freshInit.headers as Headers).set(this.config.headerName, token);
        }
      }

      // Make the request with fresh objects
      const response = await originalFetch(url, freshInit);

      // Check for CSRF validation errors
      if (response.status === 403 && response.headers.get('X-CSRF-Error')) {
        this.handleCSRFError(tempRequest);
      }

      return response;
    };
  }

  private interceptXHR(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // Override the open method to capture request details
    XMLHttpRequest.prototype.open = function (
      this: ExtendedXMLHttpRequest,
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      // Store method and URL on the XHR instance for later use
      this._csrfMethod = method;
      this._csrfUrl = url.toString();

      // Call the original open method with proper typing
      if (username !== undefined) {
        originalOpen.call(this, method, url, async, username, password ?? undefined);
      } else {
        originalOpen.call(this, method, url, async);
      }
    };

    // Override the send method to add CSRF token
    XMLHttpRequest.prototype.send = function (
      this: ExtendedXMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null
    ): void {
      // Check if we have the necessary information and should add token
      if (this._csrfMethod && this._csrfUrl) {
        const request = new Request(this._csrfUrl, { method: this._csrfMethod });

        if (self.shouldAddToken(request)) {
          const token = self.getToken();
          if (token) {
            this.setRequestHeader(self.config.headerName, token);
          }
        }
      }

      // Call the original send method
      originalSend.call(this, body);
    };
  }

  private interceptForms(): void {
    // Add event listener for form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form && this.shouldProtectForm(form)) {
        this.addTokenToForm(form);
      }
    });

    // Handle dynamically created forms using MutationObserver
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const forms = element.tagName === 'FORM'
              ? [element as HTMLFormElement]
              : Array.from(element.querySelectorAll('form'));

            forms.forEach(form => {
              if (this.shouldProtectForm(form)) {
                this.addTokenToForm(form);
              }
            });
          }
        });
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private shouldAddToken(request: Request): boolean {
    // Only add token to same-origin requests
    const url = new URL(request.url, window.location.origin);
    if (url.origin !== window.location.origin) {
      return false;
    }

    // Only add token to state-changing methods
    const method = request.method.toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  }

  private shouldProtectForm(form: HTMLFormElement): boolean {
    // Check if form is same-origin
    const action = form.action || window.location.href;
    const url = new URL(action, window.location.origin);
    if (url.origin !== window.location.origin) {
      return false;
    }

    // Check if form method requires protection
    const method = (form.method || 'GET').toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  }

  private addTokenToForm(form: HTMLFormElement): void {
    const token = this.getToken();
    if (!token) return;

    // Check if token field already exists
    let tokenField = form.querySelector(`input[name="${this.config.tokenName}"]`) as HTMLInputElement;

    if (!tokenField) {
      tokenField = document.createElement('input');
      tokenField.type = 'hidden';
      tokenField.name = this.config.tokenName;
      form.appendChild(tokenField);
    }

    tokenField.value = token;
  }

  private handleCSRFError(request: Request): void {
    logger.warn('CSRF validation failed', {
      component: 'CSRFProtection',
      url: request.url,
      method: request.method
    });

    // Create security event
    const securityEvent: Partial<SecurityEvent> = {
      type: 'csrf_attack',
      severity: 'high',
      details: {
        url: request.url,
        method: request.method,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    // Report security event
    this.reportSecurityEvent(securityEvent);

    // Refresh token for next request
    this.refreshToken().catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to refresh CSRF token after validation error', {
        component: 'CSRFProtection',
        error: errorMessage
      });
    });
  }

  private reportSecurityEvent(event: Partial<SecurityEvent>): void {
    const customEvent = new CustomEvent('security-event', {
      detail: event
    });
    document.dispatchEvent(customEvent);
  }

  private setupTokenValidation(): void {
    // Validate token periodically
    setInterval(() => {
      if (this.tokenExpiry && new Date() > this.tokenExpiry) {
        logger.warn('CSRF token expired, refreshing', {
          component: 'CSRFProtection'
        });
        this.refreshToken().catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          logger.error('Failed to refresh expired CSRF token', {
            component: 'CSRFProtection',
            error: errorMessage
          });
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Manually refresh token
   */
  async forceRefresh(): Promise<string | null> {
    await this.refreshToken();
    return this.currentToken;
  }

  /**
   * Validate a token
   */
  validateToken(token: string): boolean {
    return token === this.currentToken && this.currentToken !== null;
  }

  /**
   * Get token for manual form/request inclusion
   */
  getTokenForRequest(): { name: string; value: string } | null {
    const token = this.getToken();
    if (!token) return null;

    return {
      name: this.config.headerName,
      value: token
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * Get token metadata
   */
  getTokenMetadata(): { hasToken: boolean; isExpired: boolean; expiresIn: number } | null {
    if (!this.currentToken) return null;

    const now = Date.now();
    const isExpired = this.tokenExpiry ? now > this.tokenExpiry.getTime() : false;
    const expiresIn = this.tokenExpiry ? Math.max(0, this.tokenExpiry.getTime() - now) : 0;

    return {
      hasToken: true,
      isExpired,
      expiresIn
    };
  }
}

// Export singleton instance
export const csrfProtection = new CSRFProtection({
  enabled: true,
  tokenName: 'csrf-token',
  headerName: 'X-CSRF-Token'
});

// Export setup function for axios or other HTTP clients
export function setupCSRFInterceptor(axiosInstance: { interceptors: { request: { use: (callback: (config: Record<string, unknown>) => Record<string, unknown>) => void } } }): void {
  axiosInstance.interceptors.request.use((config: Record<string, unknown>) => {
    const token = csrfProtection.getToken();
    if (token) {
      const headers = config.headers as Record<string, string>;
      headers['X-CSRF-Token'] = token;
    }
    return config;
  });
}