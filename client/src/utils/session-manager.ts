/**
 * Unified Session Management Utility
 * Combines secure session handling, activity tracking, and security monitoring
 */

import { logger } from './logger';
import { authApiService, SessionInfo } from '../core/api/auth';

export interface SessionConfig {
  // Cookie settings
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // in seconds
  path: string;
  domain?: string;
  // Session management
  maxIdleTime: number; // milliseconds
  warningTime: number; // milliseconds before expiry warning
  checkInterval: number; // milliseconds between checks
  enableActivityTracking: boolean;
  enableSecurityMonitoring: boolean;
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

export interface SessionActivity {
  timestamp: number;
  type: 'mouse' | 'keyboard' | 'touch' | 'api' | 'navigation';
  details?: Record<string, any>;
}

export interface SessionWarning {
  type: 'idle_warning' | 'security_alert' | 'concurrent_session';
  message: string;
  timeRemaining?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SessionManager {
  private config: SessionConfig;
  private lastActivity: number = Date.now();
  private activityLog: SessionActivity[] = [];
  private warningCallbacks: Array<(warning: SessionWarning) => void> = [];
  private activityListeners: Array<() => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private lastErrorLog: number = 0;
  private sessionId: string | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      // Cookie defaults
      httpOnly: true,
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
      // Session defaults
      maxIdleTime: 30 * 60 * 1000, // 30 minutes
      warningTime: 5 * 60 * 1000, // 5 minutes
      checkInterval: 60 * 1000, // 1 minute
      enableActivityTracking: true,
      enableSecurityMonitoring: true,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;

    // Set up activity tracking
    if (this.config.enableActivityTracking) {
      this.setupActivityTracking();
    }

    // Start session monitoring
    this.startSessionMonitoring();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Handle beforeunload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    this.isInitialized = true;

    logger.info('Unified SessionManager initialized', {
      component: 'SessionManager',
      config: this.config
    });
  }

  // ============================================================================
  // Session Lifecycle
  // ============================================================================

  /**
   * Create a secure session with session data
   */
  createSession(sessionData: SessionData, config?: Partial<SessionConfig>): void {
    const finalConfig = { ...this.config, ...config };

    try {
      // Store session data securely
      this.setSecureStorage('session_data', sessionData);

      // Set session cookie
      this.setSecureCookie('session_id', sessionData.sessionId, finalConfig);

      // Set CSRF token
      this.setCSRFToken();

      // Start session tracking
      this.startSession(sessionData.userId, sessionData.sessionId);

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
   * Start session tracking (internal or external)
   */
  startSession(userId: string, sessionId?: string): void {
    this.sessionId = sessionId || this.generateSecureToken();
    this.isActive = true;
    this.lastActivity = Date.now();
    this.activityLog = [];

    // Record session start
    this.recordActivity('api', { action: 'session_start', userId });

    logger.info('Session started', {
      component: 'SessionManager',
      sessionId: this.sessionId,
      userId
    });
  }

  /**
   * Validate current session
   */
  validateSession(): SessionData | null {
    try {
      const sessionData = this.getSecureStorage<SessionData>('session_data');
      if (!sessionData) {
        this.isActive = false;
        return null;
      }

      // Check expiry
      const lastActivity = new Date(sessionData.lastActivity);
      const now = new Date();
      const maxAgeMs = this.config.maxAge * 1000;

      if (now.getTime() - lastActivity.getTime() > maxAgeMs) {
        this.destroySession();
        return null;
      }

      // Update activity
      sessionData.lastActivity = now.toISOString();
      this.setSecureStorage('session_data', sessionData);
      this.lastActivity = now.getTime();

      return sessionData;
    } catch (error) {
      logger.error('Session validation failed:', { component: 'SessionManager' }, error);
      this.isActive = false;
      return null;
    }
  }

  /**
   * Update session activity
   */
  updateActivity(): void {
    const sessionData = this.getSecureStorage<SessionData>('session_data');
    if (sessionData) {
      sessionData.lastActivity = new Date().toISOString();
      this.setSecureStorage('session_data', sessionData);
    }
    this.recordActivity('api', { action: 'activity_update' });
  }

  /**
   * Destroy/end current session
   */
  async destroySession(): Promise<void> {
    if (!this.isActive) return;

    this.isActive = false;

    try {
      // Clear secure storage
      this.removeSecureStorage('session_data');

      // Clear cookies
      this.clearCookie('session_id');
      this.clearCookie('csrf_token');

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');

      // Record session end
      this.recordActivity('api', { action: 'session_end' });

      // Clear session data
      this.clearSession();

      logger.info('Session destroyed successfully', {
        component: 'SessionManager',
      });
    } catch (error) {
      logger.error('Failed to destroy session:', { component: 'SessionManager' }, error);
    }
  }

  /**
   * Extend session (reset idle timer)
   */
  extendSession(): void {
    this.recordActivity('api', { action: 'session_extend' });
    logger.info('Session extended', { component: 'SessionManager' });
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.isActive && (Date.now() - this.lastActivity) < this.config.maxIdleTime;
  }

  /**
   * Get current session data
   */
  getSessionData(): SessionData | null {
    return this.validateSession();
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    sessionId: string | null;
    isActive: boolean;
    lastActivity: number;
    idleTime: number;
    timeUntilExpiry: number;
  } {
    const now = Date.now();
    const idleTime = now - this.lastActivity;
    const timeUntilExpiry = Math.max(0, this.config.maxIdleTime - idleTime);

    return {
      sessionId: this.sessionId,
      isActive: this.isActive,
      lastActivity: this.lastActivity,
      idleTime,
      timeUntilExpiry
    };
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    const idleTime = Date.now() - this.lastActivity;
    return Math.max(0, this.config.maxIdleTime - idleTime);
  }

  // ============================================================================
  // Activity Tracking
  // ============================================================================

  private setupActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      const listener = () => this.recordActivity(event as any);
      document.addEventListener(event, listener, { passive: true });
      this.activityListeners.push(() => {
        document.removeEventListener(event, listener);
      });
    });
  }

  /**
   * Record user activity
   */
  recordActivity(type: SessionActivity['type'], details?: Record<string, any>): void {
    // Skip if not active to prevent unnecessary processing
    if (!this.isActive) return;

    const now = Date.now();

    // Throttle activity recording to prevent excessive updates
    if (now - this.lastActivity < 1000) return; // Max once per second

    this.lastActivity = now;

    if (this.config.enableActivityTracking) {
      const activity: SessionActivity = {
        timestamp: now,
        type,
        details
      };

      this.activityLog.push(activity);

      // Keep last 100
      if (this.activityLog.length > 100) {
        this.activityLog = this.activityLog.slice(-100);
      }
    }

    // Clear pending warning
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    // Schedule new warning
    this.scheduleIdleWarning();

    logger.debug('Activity recorded', {
      component: 'SessionManager',
      type,
      details
    });
  }

  /**
   * Get activity summary
   */
  getActivitySummary(minutes: number = 10): {
    totalActivities: number;
    activityTypes: Record<string, number>;
    lastActivity: number;
  } {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recent = this.activityLog.filter(a => a.timestamp > cutoff);

    const activityTypes: Record<string, number> = {};
    recent.forEach(activity => {
      activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
    });

    return {
      totalActivities: recent.length,
      activityTypes,
      lastActivity: this.lastActivity
    };
  }

  // ============================================================================
  // Session Monitoring
  // ============================================================================

  private startSessionMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkSessionStatus();
    }, this.config.checkInterval);

    this.scheduleIdleWarning();
  }

  private checkSessionStatus(): void {
    // Skip if not active to prevent unnecessary processing
    if (!this.isActive) return;

    const now = Date.now();
    const idleTime = now - this.lastActivity;

    if (idleTime > this.config.maxIdleTime) {
      this.handleSessionExpiry();
      return;
    }

    if (this.config.enableSecurityMonitoring) {
      this.checkSecurityAnomalies();
    }
  }

  private scheduleIdleWarning(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    const warningDelay = this.config.maxIdleTime - this.config.warningTime;

    this.warningTimeout = setTimeout(() => {
      this.showIdleWarning();
    }, warningDelay);
  }

  private showIdleWarning(): void {
    const timeRemaining = this.config.warningTime;

    const warning: SessionWarning = {
      type: 'idle_warning',
      message: `Your session will expire in ${Math.ceil(timeRemaining / 60000)} minutes due to inactivity.`,
      timeRemaining,
      severity: 'medium'
    };

    this.notifyWarning(warning);
  }

  private handleSessionExpiry(): void {
    logger.warn('Session expired due to inactivity', { component: 'SessionManager' });

    this.isActive = false;
    this.clearSession();

    const warning: SessionWarning = {
      type: 'idle_warning',
      message: 'Your session has expired due to inactivity. Please log in again.',
      severity: 'high'
    };

    this.notifyWarning(warning);
  }

  // ============================================================================
  // Security Monitoring
  // ============================================================================

  private checkSecurityAnomalies(): void {
    const summary = this.getActivitySummary(5);

    // Detect rapid activities
    if (summary.totalActivities > 100) {
      const warning: SessionWarning = {
        type: 'security_alert',
        message: 'Unusual activity pattern detected. Please verify your identity.',
        severity: 'high'
      };
      this.notifyWarning(warning);
    }

    this.checkConcurrentSessions();
  }

  private async checkConcurrentSessions(): Promise<void> {
    try {
      if (!navigator.onLine) return;

      const sessions = await authApiService.getActiveSessions();
      const otherSessions = sessions.filter((s: SessionInfo) => !s.current);

      if (otherSessions.length > 0) {
        const warning: SessionWarning = {
          type: 'concurrent_session',
          message: `You have ${otherSessions.length} other active session(s). If this wasn't you, please secure your account.`,
          severity: 'medium'
        };
        this.notifyWarning(warning);
      }
    } catch (error) {
      const now = Date.now();
      if (!this.lastErrorLog || now - this.lastErrorLog > 60000) {
        logger.error('Failed to check concurrent sessions:', { component: 'SessionManager' }, error);
        this.lastErrorLog = now;
      }
    }
  }

  /**
   * Detect session hijacking
   */
  detectHijacking(): boolean {
    const sessionData = this.getSessionData();
    if (!sessionData) return false;

    const currentUA = navigator.userAgent;
    if (sessionData.deviceFingerprint !== currentUA) {
      logger.warn('Potential session hijacking detected', {
        component: 'SessionManager',
        sessionId: sessionData.sessionId,
        originalUA: sessionData.deviceFingerprint,
        currentUA,
      });
      return true;
    }

    return false;
  }

  /**
   * Force session refresh
   */
  forceRefresh(): void {
    this.destroySession();
    window.location.reload();
  }

  /**
   * Validate session integrity
   */
  validateIntegrity(): boolean {
    if (this.detectHijacking()) {
      this.forceRefresh();
      return false;
    }
    return true;
  }

  // ============================================================================
  // CSRF and Secure Storage
  // ============================================================================

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
      logger.warn('HttpOnly cookies must be set server-side', {
        component: 'SessionManager',
      });
    }

    cookieString += `; SameSite=${config.sameSite}`;

    document.cookie = cookieString;
  }

  private clearCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  private setCSRFToken(): void {
    const token = this.generateSecureToken();
    this.setSecureCookie('csrf_token', token, {
      ...this.config,
      httpOnly: false,
    });

    let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      document.head.appendChild(metaTag);
    }
    metaTag.content = token;
  }

  /**
   * Get CSRF token
   */
  getCSRFToken(): string | null {
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  private setSecureStorage<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify(data);
      sessionStorage.setItem(`chanuka_${key}`, serialized);
    } catch (error) {
      logger.error('Failed to set secure storage:', { component: 'SessionManager' }, error);
    }
  }

  private getSecureStorage<T>(key: string): T | null {
    try {
      const serialized = sessionStorage.getItem(`chanuka_${key}`);
      if (!serialized) return null;
      return JSON.parse(serialized) as T;
    } catch (error) {
      logger.error('Failed to get secure storage:', { component: 'SessionManager' }, error);
      return null;
    }
  }

  private removeSecureStorage(key: string): void {
    try {
      sessionStorage.removeItem(`chanuka_${key}`);
    } catch (error) {
      logger.error('Failed to remove secure storage:', { component: 'SessionManager' }, error);
    }
  }

  // ============================================================================
  // Warning System
  // ============================================================================

  /**
   * Subscribe to warnings
   */
  onWarning(callback: (warning: SessionWarning) => void): () => void {
    this.warningCallbacks.push(callback);

    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  private notifyWarning(warning: SessionWarning): void {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        logger.error('Warning callback failed:', { component: 'SessionManager' }, error);
      }
    });
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private handleVisibilityChange(): void {
    if (document.hidden) {
      logger.debug('Page hidden, reducing monitoring', { component: 'SessionManager' });
    } else {
      this.recordActivity('navigation', { action: 'page_visible' });
    }
  }

  private handleBeforeUnload(): void {
    this.recordActivity('navigation', { action: 'page_unload' });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private clearSession(): void {
    this.sessionId = null;
    this.activityLog = [];

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.isActive) {
      this.startSessionMonitoring();
    }

    logger.info('Session config updated', {
      component: 'SessionManager',
      config: this.config
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearSession();

    this.activityListeners.forEach(remove => remove());
    this.activityListeners = [];

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    this.warningCallbacks = [];
    this.isInitialized = false;

    logger.info('SessionManager cleaned up', { component: 'SessionManager' });
  }
}

// Export singleton
export const sessionManager = new SessionManager();

// Auto-start integrity validation (only if not already running)
if (typeof window !== 'undefined') {
  let integrityInterval: NodeJS.Timeout | null = null;

  const startIntegrityCheck = () => {
    if (!integrityInterval) {
      integrityInterval = setInterval(() => {
        sessionManager.validateIntegrity();
      }, 60000); // Every minute
    }
  };

  const stopIntegrityCheck = () => {
    if (integrityInterval) {
      clearInterval(integrityInterval);
      integrityInterval = null;
    }
  };

  // Start when session becomes active
  if (sessionManager.isSessionActive()) {
    startIntegrityCheck();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    stopIntegrityCheck();
    sessionManager.cleanup();
  });

  // Export control functions for external use
  (sessionManager as any).startIntegrityCheck = startIntegrityCheck;
  (sessionManager as any).stopIntegrityCheck = stopIntegrityCheck;
}