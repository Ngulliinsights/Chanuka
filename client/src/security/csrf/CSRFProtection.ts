/**
 * CSRF Protection
 * 
 * Provides Cross-Site Request Forgery protection with token validation
 */

import type { CSRFToken, SecurityEvent } from '../types/security-types';
import { securityConfig } from '../config/security-config';
import { SecurityMonitor } from '../monitoring/SecurityMonitor';

export class CSRFProtection {
  private static instance: CSRFProtection;
  private currentToken: CSRFToken | null = null;
  private monitor: SecurityMonitor;

  private constructor() {
    this.monitor = SecurityMonitor.getInstance();
    this.initializeToken();
  }

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Initialize CSRF token from cookie or generate new one
   */
  private initializeToken(): void {
    const existingToken = this.getTokenFromCookie();
    if (existingToken && this.isTokenValid(existingToken)) {
      this.currentToken = existingToken;
    } else {
      this.generateNewToken();
    }
  }

  /**
   * Generate a new CSRF token
   */
  public generateNewToken(): CSRFToken {
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    
    const sessionId = this.getSessionId();
    const expiresAt = Date.now() + securityConfig.csrf.maxAge;

    this.currentToken = {
      token,
      expiresAt,
      sessionId
    };

    this.setTokenCookie(this.currentToken);
    this.setTokenMeta(token);

    this.monitor.logEvent({
      id: crypto.randomUUID(),
      type: 'csrf-attempt',
      severity: 'info',
      message: 'New CSRF token generated',
      source: 'CSRFProtection',
      timestamp: Date.now(),
      metadata: { sessionId }
    });

    return this.currentToken;
  }

  /**
   * Get current CSRF token
   */
  public getToken(): string | null {
    if (!this.currentToken || !this.isTokenValid(this.currentToken)) {
      this.generateNewToken();
    }
    return this.currentToken?.token || null;
  }

  /**
   * Validate CSRF token
   */
  public validateToken(token: string, sessionId?: string): boolean {
    if (!securityConfig.csrf.enabled) {
      return true;
    }

    if (!this.currentToken) {
      this.logCSRFAttempt('No CSRF token available', token);
      return false;
    }

    if (!this.isTokenValid(this.currentToken)) {
      this.logCSRFAttempt('CSRF token expired', token);
      return false;
    }

    if (this.currentToken.token !== token) {
      this.logCSRFAttempt('CSRF token mismatch', token);
      return false;
    }

    if (sessionId && this.currentToken.sessionId !== sessionId) {
      this.logCSRFAttempt('Session ID mismatch', token);
      return false;
    }

    return true;
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: CSRFToken): boolean {
    return Date.now() < token.expiresAt;
  }

  /**
   * Get session ID from storage or generate new one
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('chanuka_session_id');
    if (!sessionId) {
      const sessionBytes = new Uint8Array(16);
      crypto.getRandomValues(sessionBytes);
      sessionId = Array.from(sessionBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('chanuka_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Set CSRF token in cookie
   */
  private setTokenCookie(token: CSRFToken): void {
    const cookieValue = `${token.token}:${token.sessionId}:${token.expiresAt}`;
    const cookieOptions = [
      `${securityConfig.csrf.cookieName}=${cookieValue}`,
      `Max-Age=${Math.floor(securityConfig.csrf.maxAge / 1000)}`,
      `SameSite=${securityConfig.csrf.sameSite}`,
      'Path=/',
      'HttpOnly'
    ];

    if (securityConfig.csrf.secure) {
      cookieOptions.push('Secure');
    }

    document.cookie = cookieOptions.join('; ');
  }

  /**
   * Get CSRF token from cookie
   */
  private getTokenFromCookie(): CSRFToken | null {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${securityConfig.csrf.cookieName}=`)
    );

    if (!csrfCookie) {
      return null;
    }

    try {
      const cookieValue = csrfCookie.split('=')[1];
      const [token, sessionId, expiresAt] = cookieValue.split(':');
      
      return {
        token,
        sessionId,
        expiresAt: parseInt(expiresAt, 10)
      };
    } catch {
      return null;
    }
  }

  /**
   * Set CSRF token in meta tag for easy access
   */
  private setTokenMeta(token: string): void {
    let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      document.head.appendChild(metaTag);
    }
    
    metaTag.content = token;
  }

  /**
   * Add CSRF token to form
   */
  public addTokenToForm(form: HTMLFormElement): void {
    const token = this.getToken();
    if (!token) return;

    // Remove existing CSRF input
    const existingInput = form.querySelector(`input[name="${securityConfig.csrf.tokenName}"]`);
    if (existingInput) {
      existingInput.remove();
    }

    // Add new CSRF input
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = securityConfig.csrf.tokenName;
    input.value = token;
    form.appendChild(input);
  }

  /**
   * Add CSRF token to request headers
   */
  public addTokenToHeaders(headers: Record<string, string>): Record<string, string> {
    const token = this.getToken();
    if (token) {
      headers[securityConfig.csrf.headerName] = token;
    }
    return headers;
  }

  /**
   * Validate form submission
   */
  public validateFormSubmission(form: HTMLFormElement): boolean {
    const formData = new FormData(form);
    const token = formData.get(securityConfig.csrf.tokenName) as string;
    const sessionId = this.getSessionId();
    
    return this.validateToken(token, sessionId);
  }

  /**
   * Setup automatic form protection
   */
  public setupFormProtection(): void {
    // Add CSRF tokens to all forms on page load
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => this.addTokenToForm(form));
    });

    // Add CSRF tokens to dynamically created forms
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the added node is a form
            if (element.tagName === 'FORM') {
              this.addTokenToForm(element as HTMLFormElement);
            }
            
            // Check for forms within the added node
            const forms = element.querySelectorAll('form');
            forms.forEach(form => this.addTokenToForm(form));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Validate forms on submission
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (!this.validateFormSubmission(form)) {
        event.preventDefault();
        this.logCSRFAttempt('Form submission blocked - invalid CSRF token', '');
        
        // Show user-friendly error
        this.showCSRFError();
      }
    });
  }

  /**
   * Log CSRF attempt
   */
  private logCSRFAttempt(reason: string, token: string): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type: 'csrf-attempt',
      severity: 'warning',
      message: `CSRF protection triggered: ${reason}`,
      source: 'CSRFProtection',
      timestamp: Date.now(),
      metadata: {
        reason,
        token: token.substring(0, 8) + '...', // Log only first 8 chars for security
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.monitor.logEvent(event);
  }

  /**
   * Show CSRF error to user
   */
  private showCSRFError(): void {
    // Create or update error message
    let errorDiv = document.getElementById('csrf-error');
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'csrf-error';
      errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      errorDiv.setAttribute('role', 'alert');
      document.body.appendChild(errorDiv);
    }

    errorDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>Security error: Please refresh the page and try again.</span>
        <button class="ml-4 text-red-500 hover:text-red-700" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  /**
   * Refresh token (useful for long-running sessions)
   */
  public refreshToken(): CSRFToken {
    return this.generateNewToken();
  }

  /**
   * Clear current token
   */
  public clearToken(): void {
    this.currentToken = null;
    
    // Clear cookie
    document.cookie = `${securityConfig.csrf.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    
    // Clear meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      metaTag.remove();
    }
  }
}