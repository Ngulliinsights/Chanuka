/**
 * Security Monitor
 * Centralized security event monitoring and alerting system
 */

import { SecurityMetrics, ThreatLevel } from '@client/lib/types';
import { logger } from '@client/lib/utils/logger';

// Type definitions for missing types
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'permission_change'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'xss_attempt'
  | 'csp_violation'
  | 'script_injection'
  | 'iframe_injection'
  | 'session_hijack_attempt'
  | 'brute_force_attack';

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: string;
  severity: SecuritySeverity;
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
}

export interface ExtendedSecurityEvent {
  id: string;
  type: SecurityEventType;
  description: string;
  severity: SecuritySeverity;
  timestamp: string;
  metadata?: Record<string, unknown>;
  source: string;
  details: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  userId?: string;
  resolved: boolean;
}

export interface SecurityMonitorConfig {
  enabled: boolean;
  alertThreshold: number;
  monitoringInterval: number;
  maxEvents?: number;
  enableRealTimeAlerts?: boolean;
  alertEndpoint?: string;
}

export interface ExtendedSecurityMetrics extends SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  vulnerabilitiesFound: number;
  vulnerabilitiesFixed: number;
  rateLimitViolations: number;
  cspViolations: number;
  lastScanTime: Date;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export class SecurityMonitor {
  private config: SecurityMonitorConfig;
  private events: ExtendedSecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private monitoringTimer: NodeJS.Timeout | null = null;
  private eventCounter: number = 0;

  constructor(config: SecurityMonitorConfig) {
    this.config = {
      maxEvents: 1000,
      enableRealTimeAlerts: true,
      alertEndpoint: '/api/security/alerts',
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Security Monitor disabled');
      return;
    }

    try {
      // Set up event listeners
      this.setupEventListeners();

      // Start monitoring
      this.startMonitoring();

      // Set up periodic cleanup
      this.setupCleanup();

      logger.info('Security Monitor initialized successfully', {
        alertThreshold: this.config.alertThreshold,
        monitoringInterval: this.config.monitoringInterval,
      });
    } catch (error) {
      logger.error('Failed to initialize Security Monitor', { error });
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for security events from other components
    document.addEventListener('security-event', ((event: CustomEvent) => {
      this.recordEvent(event.detail);
    }) as EventListener);

    // Listen for browser security events
    window.addEventListener('error', event => {
      this.handleError(event);
    });

    window.addEventListener('unhandledrejection', event => {
      this.handleUnhandledRejection(event);
    });

    // Listen for navigation events that might indicate attacks
    window.addEventListener('beforeunload', () => {
      this.checkSuspiciousActivity();
    });

    // Monitor for suspicious DOM modifications
    this.setupDOMMonitoring();
  }

  private setupDOMMonitoring(): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        this.analyzeMutation(mutation);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['onclick', 'onload', 'onerror', 'src', 'href'],
    });
  }

  private analyzeMutation(mutation: MutationRecord): void {
    // Check for suspicious script injections
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // Check for script tags
          if (element.tagName === 'SCRIPT') {
            this.recordEvent({
              type: 'script_injection',
              severity: 'high',
              source: 'SecurityMonitor',
              details: {
                type: 'script_injection',
                tagName: element.tagName,
                src: (element as HTMLScriptElement).src,
                innerHTML: element.innerHTML.substring(0, 100),
              },
            });
          }

          // Check for iframe injections
          if (element.tagName === 'IFRAME') {
            this.recordEvent({
              type: 'iframe_injection',
              severity: 'high',
              source: 'SecurityMonitor',
              details: {
                type: 'iframe_injection',
                src: (element as HTMLIFrameElement).src,
              },
            });
          }
        }
      });
    }

    // Check for suspicious attribute changes
    if (mutation.type === 'attributes' && mutation.attributeName) {
      const element = mutation.target as Element;
      const attrValue = element.getAttribute(mutation.attributeName);

      if (attrValue && this.isSuspiciousAttribute(mutation.attributeName, attrValue)) {
        this.recordEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          source: 'SecurityMonitor',
          details: {
            type: 'suspicious_attribute',
            attributeName: mutation.attributeName,
            attributeValue: attrValue.substring(0, 100),
            tagName: element.tagName,
          },
        });
      }
    }
  }

  private isSuspiciousAttribute(name: string, value: string): boolean {
    const suspiciousPatterns = [/javascript:/i, /data:text\/html/i, /vbscript:/i, /on\w+\s*=/i];

    const suspiciousAttributes = ['onclick', 'onload', 'onerror', 'onmouseover'];

    return (
      suspiciousAttributes.includes(name.toLowerCase()) ||
      suspiciousPatterns.some(pattern => pattern.test(value))
    );
  }

  private handleError(event: ErrorEvent): void {
    // Check if error might be security-related
    const message = event.message.toLowerCase();
    const securityKeywords = [
      'script error',
      'cross-origin',
      'blocked',
      'csp',
      'content security policy',
      'mixed content',
    ];

    if (securityKeywords.some(keyword => message.includes(keyword))) {
      this.recordEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'SecurityMonitor',
        details: {
          type: 'security_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason?.toString().toLowerCase() || '';
    const securityKeywords = ['network error', 'cors', 'blocked', 'unauthorized', 'forbidden'];

    if (securityKeywords.some(keyword => reason.includes(keyword))) {
      this.recordEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'SecurityMonitor',
        details: {
          type: 'security_rejection',
          reason: event.reason?.toString().substring(0, 200),
        },
      });
    }
  }

  private recordEvent(eventData: Partial<ExtendedSecurityEvent>): void {
    const event: ExtendedSecurityEvent = {
      id: `sec-${Date.now()}-${++this.eventCounter}`,
      timestamp: new Date().toISOString(),
      type: (eventData.type || 'suspicious_activity') as SecurityEventType,
      description: eventData.description || 'Security event recorded',
      severity: eventData.severity || 'medium',
      source: eventData.source || 'Unknown',
      userId: this.getCurrentUserId(),
      details: eventData.details || {},
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      resolved: false,
    };

    this.events.push(event);

    // Trim events if we exceed max
    if (this.config.maxEvents && this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    logger.debug('Security event recorded', {
      component: 'SecurityMonitor',
      eventId: event.id,
      type: event.type,
      severity: event.severity,
    });

    // Check if we should create an alert
    this.checkForAlerts(event);

    // Real-time alerting for critical events
    if (this.config.enableRealTimeAlerts && event.severity === 'critical') {
      this.sendRealTimeAlert(event);
    }
  }

  private checkForAlerts(event: ExtendedSecurityEvent): void {
    // Count recent events of the same type
    const recentEvents = this.getRecentEvents(5 * 60 * 1000); // Last 5 minutes
    const sameTypeEvents = recentEvents.filter(e => e.type === event.type);

    if (sameTypeEvents.length >= this.config.alertThreshold) {
      this.createAlert({
        type: event.type,
        severity: this.escalateSeverity(event.severity),
        message: `${sameTypeEvents.length} ${event.type} events detected in the last 5 minutes`,
        details: {
          eventCount: sameTypeEvents.length,
          timeWindow: '5 minutes',
          events: sameTypeEvents.map(e => e.id),
        },
      });
    }

    // Check for attack patterns
    this.checkAttackPatterns(event);
  }

  private checkAttackPatterns(event: ExtendedSecurityEvent): void {
    const recentEvents = this.getRecentEvents(10 * 60 * 1000); // Last 10 minutes

    // Check for brute force patterns
    if (event.type === 'rate_limit_exceeded') {
      const rateLimitEvents = recentEvents.filter(e => e.type === 'rate_limit_exceeded');
      if (rateLimitEvents.length >= 10) {
        this.createAlert({
          type: 'brute_force_attack',
          severity: 'high',
          message: 'Potential brute force attack detected',
          details: {
            eventCount: rateLimitEvents.length,
            pattern: 'rate_limit_exceeded',
          },
        });
      }
    }

    // Check for XSS attack patterns
    if (event.type === 'xss_attempt') {
      const xssEvents = recentEvents.filter(e => e.type === 'xss_attempt');
      if (xssEvents.length >= 3) {
        this.createAlert({
          type: 'xss_attempt',
          severity: 'critical',
          message: 'Multiple XSS attempts detected',
          details: {
            eventCount: xssEvents.length,
            pattern: 'xss_attempt',
          },
        });
      }
    }

    // Check for session hijacking patterns
    const sessionEvents = recentEvents.filter(
      e => e.sessionId === event.sessionId && e.userAgent !== event.userAgent
    );

    if (sessionEvents.length >= 2) {
      this.createAlert({
        type: 'session_hijack_attempt',
        severity: 'critical',
        message: 'Potential session hijacking detected',
        details: {
          sessionId: event.sessionId,
          userAgents: [...new Set(sessionEvents.map(e => e.userAgent))],
        },
      });
    }
  }

  private createAlert(alertData: Partial<SecurityAlert>): void {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: alertData.type || 'suspicious_activity',
      severity: alertData.severity || 'medium',
      message: alertData.message || 'Security alert triggered',
      details: alertData.details || {},
      acknowledged: false,
    };

    this.alerts.push(alert);

    logger.warn('Security alert created', {
      component: 'SecurityMonitor',
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });

    // Send alert to backend
    this.sendAlert(alert);
  }

  private async sendAlert(alert: SecurityAlert): Promise<void> {
    if (!this.config.alertEndpoint) return;

    try {
      await fetch(this.config.alertEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      logger.error('Failed to send security alert to backend', { error });
    }
  }

  private async sendRealTimeAlert(event: ExtendedSecurityEvent): Promise<void> {
    // Create immediate alert for critical events
    const alert: SecurityAlert = {
      id: `critical-${event.id}`,
      timestamp: new Date(),
      type: event.type,
      severity: 'critical',
      message: `Critical security event: ${event.type}`,
      details: event.details,
      acknowledged: false,
    };

    await this.sendAlert(alert);
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performPeriodicChecks();
    }, this.config.monitoringInterval);
  }

  private performPeriodicChecks(): void {
    // Check for suspicious activity patterns
    this.checkSuspiciousActivity();

    // Clean up old events
    this.cleanupOldEvents();

    // Generate metrics
    const metrics = this.generateMetrics();

    logger.debug('Security monitoring check completed', {
      component: 'SecurityMonitor',
      metrics,
    });
  }

  private checkSuspiciousActivity(): void {
    const recentEvents = this.getRecentEvents(60 * 60 * 1000); // Last hour

    // Check for unusual activity volume
    if (recentEvents.length > 100) {
      this.createAlert({
        type: 'suspicious_activity',
        severity: 'medium',
        message: `Unusually high security event volume: ${recentEvents.length} events in the last hour`,
        details: {
          eventCount: recentEvents.length,
          timeWindow: '1 hour',
        },
      });
    }
  }

  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const cutoffDate = new Date(cutoffTime).toISOString();

    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    this.alerts = this.alerts.filter(alert => alert.timestamp.toISOString() > cutoffDate);
  }

  private generateMetrics(): ExtendedSecurityMetrics {
    const eventsByType = this.events.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const eventsBySeverity = this.events.reduce<Record<SecuritySeverity, number>>(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<SecuritySeverity, number>
    );

    const criticalEvents = this.events.filter(e => e.severity === 'critical').length;
    const highEvents = this.events.filter(e => e.severity === 'high').length;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalEvents > 0) {
      systemHealth = 'critical';
    } else if (highEvents > 5) {
      systemHealth = 'warning';
    }

    return {
      // Properties from SecurityMetrics
      totalIncidents: this.events.filter(e => e.severity === 'high' || e.severity === 'critical')
        .length,
      incidentsBySeverity: {
        low: eventsBySeverity.low || 0,
        medium: eventsBySeverity.medium || 0,
        high: eventsBySeverity.high || 0,
        critical: eventsBySeverity.critical || 0,
      } as Record<ThreatLevel, number>,
      averageResolutionTime: 0, // Would be calculated from resolved incidents
      complianceScore: Math.max(0, 100 - criticalEvents * 20 - highEvents * 5),
      lastAuditDate: new Date(),
      vulnerabilitiesCount:
        eventsByType['xss_attempt'] || 0 + eventsByType['script_injection'] || 0,
      activeThreats: this.events.filter(
        e => !e.resolved && (e.severity === 'high' || e.severity === 'critical')
      ).length,

      // Extended properties
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      vulnerabilitiesFound: 0, // Would be populated by vulnerability scanner
      vulnerabilitiesFixed: 0,
      rateLimitViolations: eventsByType['rate_limit_exceeded'] || 0,
      cspViolations: eventsByType['csp_violation'] || 0,
      lastScanTime: new Date(),
      systemHealth,
    };
  }

  private getRecentEvents(timeWindowMs: number): ExtendedSecurityEvent[] {
    const cutoffTime = Date.now() - timeWindowMs;
    const cutoffDate = new Date(cutoffTime).toISOString();

    return this.events.filter(event => event.timestamp > cutoffDate);
  }

  private escalateSeverity(severity: SecuritySeverity): SecuritySeverity {
    const escalation: Record<SecuritySeverity, SecuritySeverity> = {
      low: 'medium',
      medium: 'high',
      high: 'critical',
      critical: 'critical',
    };
    return escalation[severity];
  }

  private getCurrentUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.state?.user?.id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('session-id') || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private setupCleanup(): void {
    // Clean up old data every hour
    setInterval(
      () => {
        this.cleanupOldEvents();
      },
      60 * 60 * 1000
    );
  }

  /**
   * Get all security events
   */
  getEvents(): ExtendedSecurityEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): ExtendedSecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity): ExtendedSecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  /**
   * Get all alerts
   */
  getAlerts(): SecurityAlert[] {
    return [...this.alerts];
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Resolve a security event
   */
  resolveEvent(eventId: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
    }
  }

  /**
   * Get security metrics
   */
  getMetrics(): ExtendedSecurityMetrics {
    return this.generateMetrics();
  }

  /**
   * Clear all events and alerts
   */
  clear(): void {
    this.events = [];
    this.alerts = [];
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }
}
