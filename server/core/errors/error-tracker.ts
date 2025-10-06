import { Request } from 'express';

export interface ErrorContext {
  traceId?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  params?: any;
  endpoint?: string;
  currentAvg?: number;
  baselineAvg?: number;
  regressionPercent?: number;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic';
  timestamp: Date;
  context: ErrorContext;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  fingerprint: string; // For grouping similar errors
}

export interface ErrorPattern {
  fingerprint: string;
  message: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  alertSent: boolean;
  alertThreshold: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    errorRate?: number; // Percentage
    errorCount?: number; // Count in time window
    timeWindow: number; // Minutes
    severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
    category?: Array<'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic'>;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log';
    target: string;
    template?: string;
  }>;
  enabled: boolean;
  cooldown: number; // Minutes between alerts for same condition
  lastTriggered?: Date;
}

class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private readonly MAX_ERRORS = 10000;
  private readonly MAX_PATTERNS = 1000;

  constructor() {
    // Initialize default alert rules
    this.initializeDefaultAlertRules();

    // Clean up old errors periodically
    setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000); // 1 hour

    // Check alert conditions periodically
    setInterval(() => {
      this.checkAlertConditions();
    }, 60000); // 1 minute
  }

  /**
   * Track an error
   */
  trackError(
    error: Error | string,
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic' = 'system'
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    const fingerprint = this.generateFingerprint(errorMessage, errorStack, category);
    
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Check if this error pattern exists
    let pattern = this.patterns.get(fingerprint);
    if (!pattern) {
      pattern = {
        fingerprint,
        message: errorMessage,
        category,
        severity,
        occurrences: 0,
        firstSeen: timestamp,
        lastSeen: timestamp,
        resolved: false,
        alertSent: false,
        alertThreshold: this.getAlertThreshold(severity)
      };
      this.patterns.set(fingerprint, pattern);
    }

    // Update pattern
    pattern.occurrences++;
    pattern.lastSeen = timestamp;
    if (severity === 'critical' || severity === 'high') {
      pattern.severity = severity; // Escalate severity if needed
    }

    // Create tracked error
    const trackedError: TrackedError = {
      id: errorId,
      message: errorMessage,
      stack: errorStack,
      code: this.extractErrorCode(error),
      severity,
      category,
      timestamp,
      context,
      resolved: false,
      occurrenceCount: 1,
      firstOccurrence: timestamp,
      lastOccurrence: timestamp,
      fingerprint
    };

    this.errors.set(errorId, trackedError);

    // Check if we need to send alerts
    this.checkPatternAlerts(pattern);

    // Prevent memory leaks
    if (this.errors.size > this.MAX_ERRORS) {
      this.cleanupOldErrors();
    }

    console.error(`[ErrorTracker] ${severity.toUpperCase()} ${category}: ${errorMessage}`, {
      errorId,
      fingerprint,
      context
    });

    return errorId;
  }

  /**
   * Track error from Express request
   */
  trackRequestError(
    error: Error | string,
    req: Request,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic' = 'system'
  ): string {
    const context: ErrorContext = {
      traceId: (req as any).traceId,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      url: req.originalUrl || req.url,
      method: req.method,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params
    };

    return this.trackError(error, context, severity, category);
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy;

    // Also mark pattern as resolved if this was the last unresolved error
    const pattern = this.patterns.get(error.fingerprint);
    if (pattern) {
      const unresolvedErrors = Array.from(this.errors.values())
        .filter(e => e.fingerprint === error.fingerprint && !e.resolved);
      
      if (unresolvedErrors.length === 0) {
        pattern.resolved = true;
      }
    }

    return true;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): TrackedError | null {
    return this.errors.get(errorId) || null;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100, resolved?: boolean): TrackedError[] {
    return Array.from(this.errors.values())
      .filter(error => resolved === undefined || error.resolved === resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error patterns
   */
  getErrorPatterns(resolved?: boolean): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => resolved === undefined || pattern.resolved === resolved)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow: number = 60): {
    totalErrors: number;
    errorRate: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topPatterns: Array<{ fingerprint: string; message: string; count: number }>;
    recentTrends: Array<{ timestamp: Date; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp > cutoffTime);

    const totalErrors = recentErrors.length;
    const errorRate = totalErrors / timeWindow; // Errors per minute

    // Group by category
    const errorsByCategory: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    // Group by severity
    const errorsBySeverity: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    // Top patterns
    const patternCounts = new Map<string, number>();
    recentErrors.forEach(error => {
      patternCounts.set(error.fingerprint, (patternCounts.get(error.fingerprint) || 0) + 1);
    });

    const topPatterns = Array.from(patternCounts.entries())
      .map(([fingerprint, count]) => {
        const pattern = this.patterns.get(fingerprint);
        return {
          fingerprint,
          message: pattern?.message || 'Unknown',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent trends (5-minute buckets)
    const bucketSize = 5 * 60 * 1000; // 5 minutes in ms
    const buckets = new Map<number, number>();
    recentErrors.forEach(error => {
      const bucket = Math.floor(error.timestamp.getTime() / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    const recentTrends = Array.from(buckets.entries())
      .map(([timestamp, count]) => ({ timestamp: new Date(timestamp), count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      totalErrors,
      errorRate,
      errorsByCategory,
      errorsBySeverity,
      topPatterns,
      recentTrends
    };
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.set(ruleId, { ...rule, id: ruleId });
    return ruleId;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(message: string, stack?: string, category?: string): string {
    // Normalize error message by removing dynamic parts
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL') // Replace file paths
      .toLowerCase();

    // Use first few lines of stack trace for better grouping
    const stackLines = stack?.split('\n').slice(0, 3).join('\n') || '';
    const normalizedStack = stackLines
      .replace(/\d+/g, 'N')
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL');

    const combined = `${category || 'unknown'}:${normalizedMessage}:${normalizedStack}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: Error | string): string | undefined {
    if (typeof error === 'string') return undefined;
    
    return (error as any).code || 
           (error as any).errno || 
           (error as any).status || 
           undefined;
  }

  /**
   * Get alert threshold based on severity
   */
  private getAlertThreshold(severity: string): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 3;
      case 'medium': return 10;
      case 'low': return 50;
      default: return 10;
    }
  }

  /**
   * Check if pattern should trigger alerts
   */
  private checkPatternAlerts(pattern: ErrorPattern): void {
    if (pattern.alertSent || pattern.resolved) return;
    
    if (pattern.occurrences >= pattern.alertThreshold) {
      this.sendPatternAlert(pattern);
      pattern.alertSent = true;
    }
  }

  /**
   * Send alert for error pattern
   */
  private sendPatternAlert(pattern: ErrorPattern): void {
    console.warn(`[ErrorTracker] ALERT: Error pattern threshold exceeded`, {
      fingerprint: pattern.fingerprint,
      message: pattern.message,
      occurrences: pattern.occurrences,
      threshold: pattern.alertThreshold,
      severity: pattern.severity,
      category: pattern.category
    });

    // Here you would integrate with actual alerting systems
    // For now, we'll just log the alert
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // Critical errors - immediate alert
    this.addAlertRule({
      name: 'Critical Errors',
      condition: {
        errorCount: 1,
        timeWindow: 1,
        severity: ['critical']
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 5
    });

    // High error rate
    this.addAlertRule({
      name: 'High Error Rate',
      condition: {
        errorRate: 10, // 10% error rate
        timeWindow: 5
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 15
    });

    // Database errors
    this.addAlertRule({
      name: 'Database Errors',
      condition: {
        errorCount: 5,
        timeWindow: 5,
        category: ['database']
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 10
    });
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(): void {
    const now = new Date();

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastAlert = now.getTime() - rule.lastTriggered.getTime();
        if (timeSinceLastAlert < rule.cooldown * 60 * 1000) {
          return; // Still in cooldown
        }
      }

      const stats = this.getErrorStats(rule.condition.timeWindow);
      let shouldAlert = false;

      // Check error rate condition
      if (rule.condition.errorRate && stats.errorRate > rule.condition.errorRate) {
        shouldAlert = true;
      }

      // Check error count condition
      if (rule.condition.errorCount && stats.totalErrors > rule.condition.errorCount) {
        shouldAlert = true;
      }

      // Check severity condition
      if (rule.condition.severity) {
        const severityCount = rule.condition.severity.reduce((sum, severity) => {
          return sum + (stats.errorsBySeverity[severity] || 0);
        }, 0);
        if (severityCount > 0) {
          shouldAlert = true;
        }
      }

      // Check category condition
      if (rule.condition.category) {
        const categoryCount = rule.condition.category.reduce((sum, category) => {
          return sum + (stats.errorsByCategory[category] || 0);
        }, 0);
        if (categoryCount > 0) {
          shouldAlert = true;
        }
      }

      if (shouldAlert) {
        this.triggerAlert(rule, stats);
        rule.lastTriggered = now;
      }
    });
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, stats: any): void {
    console.warn(`[ErrorTracker] ALERT TRIGGERED: ${rule.name}`, {
      rule: rule.name,
      condition: rule.condition,
      stats: {
        totalErrors: stats.totalErrors,
        errorRate: stats.errorRate,
        errorsByCategory: stats.errorsByCategory,
        errorsBySeverity: stats.errorsBySeverity
      }
    });

    // Execute alert actions
    rule.actions.forEach(action => {
      switch (action.type) {
        case 'log':
          console.error(`[ALERT] ${rule.name}: Alert condition met`);
          break;
        // Add other action types (email, webhook) here
      }
    });
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.keys(headers).forEach(key => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = headers[key];
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Clean up old errors to prevent memory leaks
   */
  private cleanupOldErrors(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Remove old errors
    const errorsToDelete: string[] = [];
    this.errors.forEach((error, id) => {
      if (error.timestamp < cutoffTime && error.resolved) {
        errorsToDelete.push(id);
      }
    });
    errorsToDelete.forEach(id => this.errors.delete(id));

    // Clean up patterns with no recent errors
    const patternsToDelete: string[] = [];
    this.patterns.forEach((pattern, fingerprint) => {
      if (pattern.lastSeen < cutoffTime && pattern.resolved) {
        patternsToDelete.push(fingerprint);
      }
    });
    patternsToDelete.forEach(fingerprint => this.patterns.delete(fingerprint));

    // If still too many errors, remove oldest resolved ones
    if (this.errors.size > this.MAX_ERRORS) {
      const resolvedErrors = Array.from(this.errors.entries())
        .filter(([_, error]) => error.resolved)
        .sort(([_, a], [__, b]) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, this.errors.size - this.MAX_ERRORS / 2);

      resolvedErrors.forEach(([id]) => this.errors.delete(id));
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();