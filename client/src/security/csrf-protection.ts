/**
 * CSRF Protection Implementation
 * Provides token-based CSRF protection for forms and API requests
 */

import { logger } from '../utils/logger';
import { SecurityEvent } from './types';

export interface CSRFConfig {
  enabled: boolean;
  tokenName: string;
  headerName: string;
  cookieName?: string;
  tokenLength?: number;
  refreshInterval?: number;
}

export class CSRFProtection {
  private config: CSRFConfig;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

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

      logger.info('CSRF Protection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CSRF Protection', error);
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
        expiresAt: this.tokenExpiry
      });
    } catch (error) {
      logger.error('Failed to refresh CSRF token', error);
      throw error;
    }
  }

  private async fetchTokenFromServer(): Promise<string | null> {
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
      }
    } catch (error) {
      logger.warn('Failed to fetch CSRF token from server, using client-side generation', error);
    }
    return null;
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
    (window as any).__CSRF_TOKEN__ = token;

    // Store in sessionStorage for persistence
    try {
      sessionStorage.setItem(this.config.tokenName, token);
    } catch (error) {
      logger.warn('Failed to store CSRF token in sessionStorage', error);
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
          logger.error('Automatic CSRF token refresh failed', error);
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
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      
      // Only add CSRF token to same-origin requests
      if (this.shouldAddToken(request)) {
        const token = this.getToken();
        if (token) {
          request.headers.set(this.config.headerName, token);
        }
      }
      
      const response = await originalFetch(request);
      
      // Check for CSRF validation errors
      if (response.status === 403 && response.headers.get('X-CSRF-Error')) {
        this.handleCSRFError(request);
      }
      
      return response;
    };
  }

  private interceptXHR(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._method = method;
      this._url = url.toString();
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      if (this._method && this._url) {
        const request = new Request(this._url, { method: this._method });
        const csrfProtection = (window as any).__CSRF_PROTECTION__;
        
        if (csrfProtection && csrfProtection.shouldAddToken(request)) {
          const token = csrfProtection.getToken();
          if (token) {
            this.setRequestHeader(csrfProtection.config.headerName, token);
          }
        }
      }
      
      return originalSend.apply(this, [body]);
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

    // Also handle dynamically created forms
    const observer = new MutationObserver((mutations) => {
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

    observer.observe(document.body, {
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
      source: 'CSRFProtection',
      details: {
        url: request.url,
        method: request.method,
        userAgent: navigator.userAgent
      }
    };

    // Report security event
    this.reportSecurityEvent(securityEvent);

    // Refresh token for next request
    this.refreshToken().catch(error => {
      logger.error('Failed to refresh CSRF token after validation error', error);
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
        logger.warn('CSRF token expired, refreshing');
        this.refreshToken().catch(error => {
          logger.error('Failed to refresh expired CSRF token', error);
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
  }
}