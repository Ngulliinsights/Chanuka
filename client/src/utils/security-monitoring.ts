/**
 * Security Monitoring Utilities
 * Detects and tracks suspicious activities and security events
 */

import { SecurityEvent, SuspiciousActivityAlert } from '@client/types/auth';
import { logger } from './logger';

interface DeviceFingerprint {
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
}

interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isp?: string;
}

interface LoginAttempt {
  timestamp: number;
  ip: string;
  userAgent: string;
  success: boolean;
  userId?: string;
}

class SecurityMonitor {
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private deviceFingerprints: Map<string, DeviceFingerprint[]> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  
  // Configuration
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly _LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly _UNUSUAL_HOUR_THRESHOLD = 2; // 2 AM to 6 AM considered unusual
  private readonly _MAX_REQUESTS_PER_MINUTE = 60;

  /**
   * Records a login attempt and analyzes for suspicious patterns
   */
  recordLoginAttempt(
    ip: string,
    userAgent: string,
    success: boolean,
    userId?: string
  ): SuspiciousActivityAlert[] {
    const now = Date.now();
    const attempt: LoginAttempt = {
      timestamp: now,
      ip,
      userAgent,
      success,
      userId,
    };

    // Get existing attempts for this IP
    const ipAttempts = this.loginAttempts.get(ip) || [];
    ipAttempts.push(attempt);
    
    // Clean old attempts (outside window)
    const recentAttempts = ipAttempts.filter(
      a => now - a.timestamp < this.ATTEMPT_WINDOW
    );
    this.loginAttempts.set(ip, recentAttempts);

    const alerts: SuspiciousActivityAlert[] = [];

    // Check for multiple failed logins
    const failedAttempts = recentAttempts.filter(a => !a.success);
    if (failedAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      alerts.push(this.createAlert(
        userId || 'unknown',
        'multiple_failed_logins',
        'high',
        `${failedAttempts.length} failed login attempts from IP ${ip} in the last hour`
      ));
      this.suspiciousIPs.add(ip);
    }

    // Check for unusual login times
    const hour = new Date().getHours();
    if (success && (hour >= 2 && hour <= 6)) {
      alerts.push(this.createAlert(
        userId!,
        'unusual_time',
        'medium',
        `Login at unusual hour: ${hour}:00`
      ));
    }

    // Check for rapid login attempts
    const rapidAttempts = recentAttempts.filter(
      a => now - a.timestamp < 60000 // Last minute
    );
    if (rapidAttempts.length > 10) {
      alerts.push(this.createAlert(
        userId || 'unknown',
        'rapid_requests',
        'high',
        `${rapidAttempts.length} login attempts in the last minute`
      ));
    }

    return alerts;
  }

  /**
   * Analyzes device fingerprint for new device detection
   */
  analyzeDeviceFingerprint(
    userId: string,
    fingerprint: DeviceFingerprint
  ): SuspiciousActivityAlert[] {
    const userFingerprints = this.deviceFingerprints.get(userId) || [];
    const alerts: SuspiciousActivityAlert[] = [];

    // Check if this is a completely new device
    const isNewDevice = !userFingerprints.some(fp => 
      this.fingerprintSimilarity(fp, fingerprint) > 0.8
    );

    if (isNewDevice && userFingerprints.length > 0) {
      alerts.push(this.createAlert(
        userId,
        'new_device',
        'medium',
        `Login from new device: ${fingerprint.userAgent}`
      ));
    }

    // Store the fingerprint
    userFingerprints.push(fingerprint);
    this.deviceFingerprints.set(userId, userFingerprints);

    return alerts;
  }

  /**
   * Analyzes location for unusual access patterns
   */
  analyzeLocation(
    userId: string,
    currentLocation: LocationInfo,
    previousLocations: LocationInfo[]
  ): SuspiciousActivityAlert[] {
    const alerts: SuspiciousActivityAlert[] = [];

    if (previousLocations.length === 0) {
      return alerts; // First login, no baseline
    }

    // Check for impossible travel (different countries in short time)
    const lastLocation = previousLocations[previousLocations.length - 1];
    if (lastLocation.country && currentLocation.country) {
      if (lastLocation.country !== currentLocation.country) {
        alerts.push(this.createAlert(
          userId,
          'unusual_location',
          'high',
          `Login from different country: ${currentLocation.country} (previous: ${lastLocation.country})`
        ));
      }
    }

    return alerts;
  }

  /**
   * Checks if an IP address is suspicious
   */
  isSuspiciousIP(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Checks if account should be locked due to failed attempts
   */
  shouldLockAccount(ip: string): boolean {
    const attempts = this.loginAttempts.get(ip) || [];
    const recentFailures = attempts.filter(
      a => !a.success && Date.now() - a.timestamp < this.ATTEMPT_WINDOW
    );
    return recentFailures.length >= this.MAX_FAILED_ATTEMPTS;
  }

  /**
   * Calculates risk score for a login attempt
   */
  calculateRiskScore(
    ip: string,
    userAgent: string,
    location?: LocationInfo,
    _userId?: string
  ): number {
    let score = 0;

    // Base score
    score += 10;

    // IP reputation
    if (this.suspiciousIPs.has(ip)) {
      score += 30;
    }

    // Failed attempts from this IP
    const attempts = this.loginAttempts.get(ip) || [];
    const recentFailures = attempts.filter(
      a => !a.success && Date.now() - a.timestamp < this.ATTEMPT_WINDOW
    );
    score += recentFailures.length * 5;

    // Time of day
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) {
      score += 15;
    }

    // User agent analysis
    if (this.isAutomatedUserAgent(userAgent)) {
      score += 25;
    }

    // Location analysis
    if (location && this.isHighRiskLocation(location)) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Generates device fingerprint from browser information
   */
  generateDeviceFingerprint(): DeviceFingerprint {
    return {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
    };
  }

  /**
   * Creates a security event record
   */
  createSecurityEvent(
    userId: string,
    eventType: SecurityEvent['event_type'],
    details: Record<string, any> = {}
  ): SecurityEvent {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      event_type: eventType,
      ip_address: this.getCurrentIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      risk_score: this.calculateRiskScore(
        this.getCurrentIP(),
        navigator.userAgent,
        undefined,
        userId
      ),
      details,
    };
  }

  /**
   * Logs security event for audit trail
   */
  logSecurityEvent(event: SecurityEvent): void {
    logger.info('Security event recorded', {
      component: 'SecurityMonitor',
      eventType: event.event_type,
      userId: event.user_id,
      riskScore: event.risk_score,
      details: event.details,
    });

    // In production, this would be sent to a security monitoring service
    this.sendToSecurityService(event);
  }

  private createAlert(
    userId: string,
    alertType: SuspiciousActivityAlert['alert_type'],
    severity: SuspiciousActivityAlert['severity'],
    description: string
  ): SuspiciousActivityAlert {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      alert_type: alertType,
      severity,
      description,
      triggered_at: new Date().toISOString(),
      resolved: false,
      resolved_at: null,
      actions_taken: [],
    };
  }

  private fingerprintSimilarity(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let matches = 0;
    let total = 0;

    const fields: (keyof DeviceFingerprint)[] = [
      'userAgent', 'screen', 'timezone', 'language', 'platform'
    ];

    for (const field of fields) {
      total++;
      if (fp1[field] === fp2[field]) {
        matches++;
      }
    }

    return matches / total;
  }

  private isAutomatedUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i,
      /postman/i, /insomnia/i
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  private isHighRiskLocation(location: LocationInfo): boolean {
    // This would typically check against a database of high-risk countries/regions
    // For demo purposes, we'll use a simple list
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    return highRiskCountries.includes(location.country || '');
  }

  private getCurrentIP(): string {
    // In a real application, this would be provided by the server
    // For client-side demo, we'll use a placeholder
    return '0.0.0.0';
  }

  private async sendToSecurityService(_event: SecurityEvent): Promise<void> {
    try {
      // In production, send to security monitoring service
      // await fetch('/api/security/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      logger.error('Failed to send security event', {
        component: 'SecurityMonitor',
        error
      });
    }
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

/**
 * Rate limiting utility
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isRateLimited(identifier: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return true;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return false;
  }

  getRemainingRequests(identifier: string, maxRequests: number = 60, windowMs: number = 60000): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    return Math.max(0, maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string, windowMs: number = 60000): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + windowMs;
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Session security utilities
 */
export const sessionSecurity = {
  /**
   * Generates a secure session token
   */
  generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Validates session token format
   */
  isValidSessionToken(token: string): boolean {
    return /^[a-f0-9]{64}$/.test(token);
  },

  /**
   * Creates secure cookie options
   */
  getSecureCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: window.location.protocol === 'https:',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
  },

  /**
   * Detects session hijacking attempts
   */
  detectSessionHijacking(
    currentFingerprint: DeviceFingerprint,
    sessionFingerprint: DeviceFingerprint
  ): boolean {
    // Check for significant changes in fingerprint
    const similarity = securityMonitor['fingerprintSimilarity'](
      currentFingerprint,
      sessionFingerprint
    );
    
    return similarity < 0.7; // Threshold for suspicious changes
  },
};