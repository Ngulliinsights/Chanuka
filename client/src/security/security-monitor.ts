/**
 * Security Monitor
 * Centralized security event monitoring and alerting system
 */

import { SecurityEvent, SecurityAlert, SecurityMetrics, SecuritySeverity } from '@client/types';

import { logger } from '@client/utils/logger';

export interface SecurityMonitorConfig {
  enabled: boolean;
  alertThreshold: number;
  monitoringInterval: number;
  maxEvents?: number;
  enableRealTimeAlerts?: boolean;
  alertEndpoint?: string;
}

export class SecurityMonitor {
  private config: SecurityMonitorConfig;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private monitoringTimer: NodeJS.Timeout | null = null;
  private eventCounter: number = 0;

  constructor(config: SecurityMonitorConfig) {
    this.config = {
      maxEvents: 1000,
      enableRealTimeAlerts: true,
      alertEndpoint: '/api/security/alerts',
      ...config
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
        monitoringInterval: this.config.monitoringInterval
      });
    } catch (error) {
      logger.error('Failed to initialize Security Monitor', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for security events from other components
    document.addEventListener('security-event', (event: CustomEvent) => {
      this.recordEvent(event.detail);
    });

    // Listen for browser security events
    window.addEventListener('error', (event) => {
      this.handleError(event);
    });

    window.addEventListener('unhandledrejection', (event) => {
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
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this.analyzeMutation(mutation);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['onclick', 'onload', 'onerror', 'src', 'href']
    });
  }

  private analyzeMutation(mutation: MutationRecord): void {
    // Check for suspicious script injections
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check for script tags
          if (element.tagName === 'SCRIPT') {
            this.recordEvent({
              type: 'suspicious_activity',
              severity: 'high',
              source: 'SecurityMonitor',
              details: {
                type: 'script_injection',
                tagName: element.tagName,
                src: (element as HTMLScriptElement).src,
                innerHTML: element.innerHTML.substring(0, 100)
              }
            });
          }
          
          // Check for iframe injections
          if (element.tagName === 'IFRAME') {
            this.recordEvent({
              type: 'suspicious_activity',
              severity: 'high',
              source: 'SecurityMonitor',
              details: {
                type: 'iframe_injection',
                src: (element as HTMLIFrameElement).src
              }
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
            tagName: element.tagName
          }
        });
      }
    }
  }

  private isSuspiciousAttribute(name: string, value: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ];

    const suspiciousAttributes = ['onclick', 'onload', 'onerror', 'onmouseover'];
    
    return suspiciousAttributes.includes(name.toLowerCase()) ||
           suspiciousPatterns.some(pattern => pattern.test(value));
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
      'mixed content'
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
          colno: event.colno
        }
      });
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason?.toString().toLowerCase() || '';
    const securityKeywords = [
      'network error',
      'cors',
      'blocked',
      'unauthorized',
      'forbidden'
    ];

    if (securityKeywords.some(keyword => reason.includes(keyword))) {
      this.recordEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'SecurityMonitor',
        details: {
          type: 'security_rejection',
          reason: event.reason?.toString().substring(0, 200)
        }
      });
    }
  }

  private recordEvent(eventData: Partial<SecurityEvent>): void {
    const event: SecurityEvent = {
      id: `sec-${Date.now()}-${++this.eventCounter}`,
      timestamp: new Date(),
      type: eventData.type || 'suspicious_activity',
      severity: eventData.severity || 'medium',
      source: eventData.source || 'Unknown',
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      details: eventData.details || {},
      resolved: false
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
      severity: event.severity
    });

    // Check if we should create an alert
    this.checkForAlerts(event);

    // Real-time alerting for critical events
    if (this.config.enableRealTimeAlerts && event.severity === 'critical') {
      this.sendRealTimeAlert(event);
    }
  }

  private checkForAlerts(event: SecurityEvent): void {
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
          events: sameTypeEvents.map(e => e.id)
        }
      });
    }

    // Check for attack patterns
    this.checkAttackPatterns(event);
  }

  private checkAttackPatterns(event: SecurityEvent): void {
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
            pattern: 'rate_limit_exceeded'
          }
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
            pattern: 'xss_attempt'
          }
        });
      }
    }

    // Check for session hijacking patterns
    const sessionEvents = recentEvents.filter(e => 
      e.sessionId === event.sessionId && 
      e.userAgent !== event.userAgent
    );
    
    if (sessionEvents.length >= 2) {
      this.createAlert({
        type: 'session_hijack_attempt',
        severity: 'critical',
        message: 'Potential session hijacking detected',
        details: {
          sessionId: event.sessionId,
          userAgents: [...new Set(sessionEvents.map(e => e.userAgent))]
        }
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
      acknowledged: false
    };

    this.alerts.push(alert);

    logger.warn('Security alert created', {
      component: 'SecurityMonitor',
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      logger.error('Failed to send security alert to backend', error);
    }
  }

  private async sendRealTimeAlert(event: SecurityEvent): Promise<void> {
    // Create immediate alert for critical events
    const alert: SecurityAlert = {
      id: `critical-${event.id}`,
      timestamp: new Date(),
      type: event.type,
      severity: 'critical',
      message: `Critical security event: ${event.type}`,
      details: event.details,
      acknowledged: false
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
      metrics
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
          timeWindow: '1 hour'
        }
      });
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
    this.events = this.events.filter(event => event.timestamp > cutoff);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  private generateMetrics(): SecurityMetrics {
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecuritySeverity, number>);

    const criticalEvents = this.events.filter(e => e.severity === 'critical').length;
    const highEvents = this.events.filter(e => e.severity === 'high').length;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalEvents > 0) {
      systemHealth = 'critical';
    } else if (highEvents > 5) {
      systemHealth = 'warning';
    }

    return {
      totalEvents: this.events.length,
      eventsByType: eventsByType as Record<any, number>,
      eventsBySeverity,
      vulnerabilitiesFound: 0, // Would be populated by vulnerability scanner
      vulnerabilitiesFixed: 0,
      rateLimitViolations: eventsByType['rate_limit_exceeded'] || 0,
      cspViolations: eventsByType['csp_violation'] || 0,
      lastScanTime: new Date(),
      systemHealth
    };
  }

  private getRecentEvents(timeWindowMs: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.events.filter(event => event.timestamp > cutoff);
  }

  private escalateSeverity(severity: SecuritySeverity): SecuritySeverity {
    const escalation: Record<SecuritySeverity, SecuritySeverity> = {
      'low': 'medium',
      'medium': 'high',
      'high': 'critical',
      'critical': 'critical'
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

  private getClientIP(): string | undefined {
    // Client-side IP detection is limited and unreliable
    // This would typically be handled server-side
    return undefined;
  }

  private setupCleanup(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
  }

  /**
   * Get all security events
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity): SecurityEvent[] {
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
  getMetrics(): SecurityMetrics {
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