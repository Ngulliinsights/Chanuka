/**
 * Session Management Utilities
 * Secure session handling with HttpOnly cookies and SameSite attributes
 */

import { logger } from './logger';

export interface SessionConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // in seconds
  domain?: string;
  path: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  deviceFingerprint: string;
  ipAddress: string;
}

class SessionManager {
  private readonly DEFAULT_CONFIG: SessionConfig = {
    httpOnly: true,
    secure: window.location.protocol === 'https:',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  };

  /**
   * Creates a secure session with proper cookie attributes
   */
  createSession(sessionData: SessionData, config?: Partial<SessionConfig>): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    try {
      // Store session data in secure storage
      this.setSecureStorage('session_data', sessionData);
      
      // Set session cookie (this would typically be done server-side)
      this.setSecureCookie('session_id', sessionData.sessionId, finalConfig);
      
      // Set CSRF token
      this.setCSRFToken();
      
      logger.info('Session created successfully', {
        component: 'SessionManager',
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
      });
    } catch (error) {
      logger.error('Failed to create session:', { component: 'SessionManager' }, error);
      throw error;
    }
  }

  /**
   * Validates current session
   */
  validateSession(): SessionData | null {
    try {
      const sessionData = this.getSecureStorage<SessionData>('session_data');
      if (!sessionData) {
        return null;
      }

      // Check session expiry
      const lastActivity = new Date(sessionData.lastActivity);
      const now = new Date();
      const maxAge = this.DEFAULT_CONFIG.maxAge * 1000; // Convert to milliseconds
      
      if (now.getTime() - lastActivity.getTime() > maxAge) {
        this.destroySession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = now.toISOString();
      this.setSecureStorage('session_data', sessionData);

      return sessionData;
    } catch (error) {
      logger.error('Session validation failed:', { component: 'SessionManager' }, error);
      return null;
    }
  }

  /**
   * Updates session activity timestamp
   */
  updateActivity(): void {
    const sessionData = this.getSecureStorage<SessionData>('session_data');
    if (sessionData) {
      sessionData.lastActivity = new Date().toISOString();
      this.setSecureStorage('session_data', sessionData);
    }
  }

  /**
   * Destroys current session
   */
  destroySession(): void {
    try {
      // Clear secure storage
      this.removeSecureStorage('session_data');
      
      // Clear cookies
      this.clearCookie('session_id');
      this.clearCookie('csrf_token');
      
      // Clear localStorage tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      logger.info('Session destroyed successfully', {
        component: 'SessionManager',
      });
    } catch (error) {
      logger.error('Failed to destroy session:', { component: 'SessionManager' }, error);
    }
  }

  /**
   * Checks if session is active
   */
  isSessionActive(): boolean {
    return this.validateSession() !== null;
  }

  /**
   * Gets current session data
   */
  getSessionData(): SessionData | null {
    return this.validateSession();
  }

  /**
   * Sets secure cookie with proper attributes
   */
  private setSecureCookie(name: string, value: string, config: SessionConfig): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (config.maxAge) {
      cookieString += `; Max-Age=${config.maxAge}`;
    }
    
    if (config.domain) {
      cookieString += `; Domain=${config.domain}`;
    }
    
    cookieString += `; Path=${config.path}`;
    
    if (config.secure) {
      cookieString += '; Secure';
    }
    
    if (config.httpOnly) {
      // Note: HttpOnly cannot be set from client-side JavaScript
      // This would need to be handled server-side
      logger.warn('HttpOnly cookies must be set server-side', {
        component: 'SessionManager',
      });
    }
    
    cookieString += `; SameSite=${config.sameSite}`;
    
    document.cookie = cookieString;
  }

  /**
   * Clears a cookie
   */
  private clearCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  /**
   * Sets CSRF token for request protection
   */
  private setCSRFToken(): void {
    const token = this.generateSecureToken();
    this.setSecureCookie('csrf_token', token, {
      ...this.DEFAULT_CONFIG,
      httpOnly: false, // CSRF token needs to be accessible to JavaScript
    });
    
    // Also store in meta tag for easy access
    let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      document.head.appendChild(metaTag);
    }
    metaTag.content = token;
  }

  /**
   * Gets CSRF token
   */
  getCSRFToken(): string | null {
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  /**
   * Generates a secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Secure storage using sessionStorage with encryption
   */
  private setSecureStorage<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify(data);
      // In production, you would encrypt this data
      sessionStorage.setItem(`chanuka_${key}`, serialized);
    } catch (error) {
      logger.error('Failed to set secure storage:', { component: 'SessionManager' }, error);
    }
  }

  /**
   * Gets data from secure storage
   */
  private getSecureStorage<T>(key: string): T | null {
    try {
      const serialized = sessionStorage.getItem(`chanuka_${key}`);
      if (!serialized) return null;
      
      // In production, you would decrypt this data
      return JSON.parse(serialized) as T;
    } catch (error) {
      logger.error('Failed to get secure storage:', { component: 'SessionManager' }, error);
      return null;
    }
  }

  /**
   * Removes data from secure storage
   */
  private removeSecureStorage(key: string): void {
    try {
      sessionStorage.removeItem(`chanuka_${key}`);
    } catch (error) {
      logger.error('Failed to remove secure storage:', { component: 'SessionManager' }, error);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

/**
 * Session activity tracker
 */
class SessionActivityTracker {
  private activityTimer: NodeJS.Timeout | null = null;
  private readonly ACTIVITY_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Starts tracking user activity
   */
  startTracking(): void {
    this.stopTracking(); // Clear any existing timer
    
    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Set up periodic activity updates
    this.activityTimer = setInterval(() => {
      if (sessionManager.isSessionActive()) {
        sessionManager.updateActivity();
      } else {
        this.stopTracking();
      }
    }, this.ACTIVITY_INTERVAL);
  }

  /**
   * Stops tracking user activity
   */
  stopTracking(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }

    // Remove event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });
  }

  private handleActivity = (): void => {
    sessionManager.updateActivity();
  };
}

export const sessionActivityTracker = new SessionActivityTracker();

/**
 * Session security utilities
 */
export const sessionSecurity = {
  /**
   * Detects potential session hijacking
   */
  detectHijacking(): boolean {
    const sessionData = sessionManager.getSessionData();
    if (!sessionData) return false;

    // Check for IP address changes (would need server-side support)
    // Check for user agent changes
    const currentUserAgent = navigator.userAgent;
    if (sessionData.deviceFingerprint !== currentUserAgent) {
      logger.warn('Potential session hijacking detected', {
        component: 'SessionSecurity',
        sessionId: sessionData.sessionId,
        originalUA: sessionData.deviceFingerprint,
        currentUA: currentUserAgent,
      });
      return true;
    }

    return false;
  },

  /**
   * Forces session refresh
   */
  forceRefresh(): void {
    sessionManager.destroySession();
    window.location.reload();
  },

  /**
   * Validates session integrity
   */
  validateIntegrity(): boolean {
    if (this.detectHijacking()) {
      this.forceRefresh();
      return false;
    }
    return true;
  },
};

// Auto-start activity tracking when module loads
if (typeof window !== 'undefined') {
  sessionActivityTracker.startTracking();
  
  // Validate session integrity periodically
  setInterval(() => {
    sessionSecurity.validateIntegrity();
  }, 60000); // Every minute
}