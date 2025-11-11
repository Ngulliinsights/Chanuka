/**
 * Session Management Utilities
 * Secure session handling with monitoring and security features
 */

import { logger } from './logger';
import { authBackendService } from '../services/authBackendService';
import { SessionInfo, SecurityEvent, User } from '../types/auth';

export interface SessionConfig {
  maxIdleTime: number; // milliseconds
  warningTime: number; // milliseconds before session expires
  checkInterval: number; // milliseconds between activity checks
  enableActivityTracking: boolean;
  enableSecurityMonitoring: boolean;
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
  private isActive: boolean = true;
  private sessionId: string | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      maxIdleTime: 30 * 60 * 1000, // 30 minutes
      warningTime: 5 * 60 * 1000, // 5 minutes warning
      checkInterval: 60 * 1000, // Check every minute
      enableActivityTracking: true,
      enableSecurityMonitoring: true,
      ...config
    };

    this.initialize();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initialize(): void {
    if (typeof window === 'undefined') return;

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

    logger.info('Session manager initialized', { 
      component: 'SessionManager',
      config: this.config
    });
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
    const now = Date.now();
    this.lastActivity = now;

    if (this.config.enableActivityTracking) {
      const activity: SessionActivity = {
        timestamp: now,
        type,
        details
      };

      this.activityLog.push(activity);

      // Keep only last 100 activities
      if (this.activityLog.length > 100) {
        this.activityLog = this.activityLog.slice(-100);
      }
    }

    // Clear any pending warning
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
   * Get recent activity summary
   */
  getActivitySummary(minutes: number = 10): {
    totalActivities: number;
    activityTypes: Record<string, number>;
    lastActivity: number;
  } {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentActivities = this.activityLog.filter(a => a.timestamp > cutoff);

    const activityTypes: Record<string, number> = {};
    recentActivities.forEach(activity => {
      activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
    });

    return {
      totalActivities: recentActivities.length,
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
    const now = Date.now();
    const idleTime = now - this.lastActivity;

    // Check if session has expired
    if (idleTime > this.config.maxIdleTime) {
      this.handleSessionExpiry();
      return;
    }

    // Check for security anomalies
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
    
    // Clear session data
    this.clearSession();
    
    // Notify about expiry
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
    // Check for unusual activity patterns
    const summary = this.getActivitySummary(5);
    
    // Detect rapid-fire activities (potential bot behavior)
    if (summary.totalActivities > 100) {
      const warning: SessionWarning = {
        type: 'security_alert',
        message: 'Unusual activity pattern detected. Please verify your identity.',
        severity: 'high'
      };
      this.notifyWarning(warning);
    }

    // Check for concurrent sessions (would need backend integration)
    this.checkConcurrentSessions();
  }

  private async checkConcurrentSessions(): Promise<void> {
    try {
      const sessions = await authBackendService.getActiveSessions();
      
      // Filter out current session
      const otherSessions = sessions.filter(s => !s.is_current);
      
      if (otherSessions.length > 0) {
        const warning: SessionWarning = {
          type: 'concurrent_session',
          message: `You have ${otherSessions.length} other active session(s). If this wasn't you, please secure your account.`,
          severity: 'medium'
        };
        this.notifyWarning(warning);
      }
    } catch (error) {
      logger.error('Failed to check concurrent sessions:', { component: 'SessionManager' }, error);
    }
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start a new session
   */
  startSession(user: User, sessionId?: string): void {
    this.sessionId = sessionId || this.generateSessionId();
    this.isActive = true;
    this.lastActivity = Date.now();
    this.activityLog = [];

    // Record session start activity
    this.recordActivity('api', { action: 'session_start', userId: user.id });

    logger.info('Session started', { 
      component: 'SessionManager',
      sessionId: this.sessionId,
      userId: user.id
    });
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.isActive) return;

    this.isActive = false;

    // Record session end activity
    this.recordActivity('api', { action: 'session_end' });

    // Clear session data
    this.clearSession();

    logger.info('Session ended', { 
      component: 'SessionManager',
      sessionId: this.sessionId
    });
  }

  /**
   * Extend session (reset idle timer)
   */
  extendSession(): void {
    this.recordActivity('api', { action: 'session_extend' });
    logger.info('Session extended', { component: 'SessionManager' });
  }

  /**
   * Clear session data
   */
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

  // ============================================================================
  // Session Information
  // ============================================================================

  /**
   * Get current session info
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
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.isActive && (Date.now() - this.lastActivity) < this.config.maxIdleTime;
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    const idleTime = Date.now() - this.lastActivity;
    return Math.max(0, this.config.maxIdleTime - idleTime);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, reduce monitoring frequency
      logger.debug('Page hidden, reducing monitoring', { component: 'SessionManager' });
    } else {
      // Page is visible, record activity
      this.recordActivity('navigation', { action: 'page_visible' });
    }
  }

  private handleBeforeUnload(): void {
    // Record page unload
    this.recordActivity('navigation', { action: 'page_unload' });
  }

  // ============================================================================
  // Warning System
  // ============================================================================

  /**
   * Subscribe to session warnings
   */
  onWarning(callback: (warning: SessionWarning) => void): () => void {
    this.warningCallbacks.push(callback);
    
    // Return unsubscribe function
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
  // Utilities
  // ============================================================================

  private generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Update session configuration
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config
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
    
    // Remove activity listeners
    this.activityListeners.forEach(removeListener => removeListener());
    this.activityListeners = [];
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    this.warningCallbacks = [];
    
    logger.info('Session manager cleaned up', { component: 'SessionManager' });
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionManager.cleanup();
  });
}