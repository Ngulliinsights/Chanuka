import { logger } from '../core/logger';
import { Request } from 'express';
// TODO: Fix imports when shared/core modules are available
// Stub types for compilation
class ErrorTrackingIntegrationManager {
  private integrations = new Map<string, any>();

  registerIntegration(integration: any): void {
    this.integrations.set(integration.name, integration);
  }

  unregisterIntegration(name: string): void {
    this.integrations.delete(name);
  }

  getIntegration(name: string): any {
    return this.integrations.get(name);
  }

  getAllIntegrations(): any[] {
    return Array.from(this.integrations.values());
  }

  async shutdownAllIntegrations(): Promise<void> {
    for (const integration of this.integrations.values()) {
      if (integration.shutdown) {
        await integration.shutdown();
      }
    }
  }
}

interface IntegrationConfig {}

function createConsoleIntegration(): any {
  return {
    name: 'console',
    trackError: () => Promise.resolve(),
    shutdown: () => Promise.resolve()
  };
}

class BaseError {
  constructor(_message: string, _options: unknown) {}
}

interface SharedErrorContext {
  correlationId?: string;
  user_id?: string;
  metadata?: any;
}

export interface ErrorContext {
  traceId?: string;
  user_id?: string;
  user_agent?: string;
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
  fingerprint: string;
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
    errorRate?: number;
    errorCount?: number;
    timeWindow: number;
    severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
    category?: Array<'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic'>;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log' | 'external_integration';
    target: string;
    template?: string;
    integrationName?: string;
  }>;
  enabled: boolean;
  cooldown: number;
  lastTriggered?: Date;
}

export interface IntegrationFilter {
  severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
  category?: Array<'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic'>;
  minOccurrences?: number;
  enabled: boolean;
}

export interface IntegrationStatus {
  name: string;
  enabled: boolean;
  initialized: boolean;
  lastError?: string;
  errorCount: number;
  lastActivity?: Date;
}

type ErrorStats = ReturnType<ErrorTracker['getErrorStats']>;

class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private readonly MAX_ERRORS = 10000;

  private cleanupInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;

  private integrationManager: ErrorTrackingIntegrationManager;
  private integrationFilters: Map<string, IntegrationFilter> = new Map();
  private integrationStatuses: Map<string, IntegrationStatus> = new Map();

  constructor() {
    this.integrationManager = new ErrorTrackingIntegrationManager();

    const consoleIntegration = createConsoleIntegration();
    this.registerIntegration(consoleIntegration, {
      severity: ['critical', 'high'],
      enabled: true
    });

    this.initializeDefaultAlertRules();

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000);

    this.alertCheckInterval = setInterval(() => {
      this.checkAlertConditions();
    }, 60000);
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    await this.integrationManager.shutdownAllIntegrations();
  }

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

    pattern.occurrences++;
    pattern.lastSeen = timestamp;
    if (severity === 'critical' || severity === 'high') {
      pattern.severity = severity;
    }

    const trackedError: TrackedError = {
      id: errorId,
      message: errorMessage,
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

    const code = this.extractErrorCode(error);
    if (code) trackedError.code = code;
    if (errorStack) trackedError.stack = errorStack;

    this.errors.set(errorId, trackedError);
    this.checkPatternAlerts(pattern);
    this.forwardToIntegrations(errorMessage, severity, category, context, pattern.occurrences);

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

  trackRequestError(
    error: Error | string,
    req: Request,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic' = 'system'
  ): string {
    const context: ErrorContext = {
      traceId: (req as any).traceId,
      user_id: (req as any).user?.id,
      url: req.originalUrl || req.url,
      method: req.method,
      headers: this.sanitizeHeaders(req.headers as Record<string, string | string[] | undefined>),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params
    };

    const ip = req.ip || req.connection.remoteAddress;
    if (ip) context.ip = ip;

    const userAgent = req.get('User-Agent');
    if (userAgent) context.user_agent = userAgent;

    return this.trackError(error, context, severity, category);
  }

  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date();
    if (resolvedBy) error.resolvedBy = resolvedBy;

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

  getError(errorId: string): TrackedError | null {
    return this.errors.get(errorId) || null;
  }

  getRecentErrors(limit: number = 100, resolved?: boolean): TrackedError[] {
    return Array.from(this.errors.values())
      .filter(error => resolved === undefined || error.resolved === resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getErrorPatterns(resolved?: boolean): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => resolved === undefined || pattern.resolved === resolved)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

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
    const errorRate = totalErrors / timeWindow;

    const errorsByCategory: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    const errorsBySeverity: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    const patternCounts = new Map<string, number>();
    recentErrors.forEach(error => {
      patternCounts.set(error.fingerprint, (patternCounts.get(error.fingerprint) || 0) + 1);
    });

    const topPatterns = Array.from(patternCounts.entries())
      .map(([fingerprint, count]) => {
        const pattern = this.patterns.get(fingerprint);
        return { fingerprint, message: pattern?.message || 'Unknown', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bucketSize = 5 * 60 * 1000;
    const buckets = new Map<number, number>();
    recentErrors.forEach(error => {
      const bucket = Math.floor(error.timestamp.getTime() / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    const recentTrends = Array.from(buckets.entries())
      .map(([timestamp, count]) => ({ timestamp: new Date(timestamp), count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return { totalErrors, errorRate, errorsByCategory, errorsBySeverity, topPatterns, recentTrends };
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.set(ruleId, { ...rule, id: ruleId });
    return ruleId;
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;
    Object.assign(rule, updates);
    return true;
  }

  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  registerIntegration(
    integration: any,
    filter: IntegrationFilter,
    config?: IntegrationConfig
  ): void {
    this.integrationManager.registerIntegration(integration);
    this.integrationFilters.set(integration.name, filter);

    this.integrationStatuses.set(integration.name, {
      name: integration.name,
      enabled: filter.enabled,
      initialized: false,
      errorCount: 0
    });

    if (filter.enabled && config) {
      this.initializeIntegration(integration.name, config).catch(error => {
        // FIX: pino-style logger call — object first, message second
        logger.error(
          { component: 'ErrorTracker', integration: integration.name, error },
          `Failed to initialize integration ${integration.name}`
        );
      });
    }
  }

  async unregisterIntegration(name: string): Promise<void> {
    const integration = this.integrationManager.getIntegration(name);
    if (integration) {
      await integration.shutdown();
    }
    this.integrationManager.unregisterIntegration(name);
    this.integrationFilters.delete(name);
    this.integrationStatuses.delete(name);
  }

  private async initializeIntegration(name: string, config: IntegrationConfig): Promise<void> {
    const integration = this.integrationManager.getIntegration(name);
    if (!integration) return;

    try {
      await integration.initialize(config);
      const status = this.integrationStatuses.get(name);
      if (status) {
        status.initialized = true;
        status.lastActivity = new Date();
      }
    } catch (error) {
      const status = this.integrationStatuses.get(name);
      if (status) {
        status.lastError = error instanceof Error ? error.message : String(error);
        status.errorCount++;
      }
      throw error;
    }
  }

  updateIntegrationFilter(name: string, filter: Partial<IntegrationFilter>): boolean {
    const existingFilter = this.integrationFilters.get(name);
    if (!existingFilter) return false;
    Object.assign(existingFilter, filter);
    return true;
  }

  getIntegrationStatus(name: string): IntegrationStatus | null {
    return this.integrationStatuses.get(name) || null;
  }

  getAllIntegrationStatuses(): IntegrationStatus[] {
    return Array.from(this.integrationStatuses.values());
  }

  setIntegrationEnabled(name: string, enabled: boolean): boolean {
    const status = this.integrationStatuses.get(name);
    if (!status) return false;
    status.enabled = enabled;
    return true;
  }

  private generateFingerprint(message: string, stack?: string, category?: string): string {
    const normalizedMessage = message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL')
      .toLowerCase();

    const stackLines = stack?.split('\n').slice(0, 3).join('\n') || '';
    const normalizedStack = stackLines
      .replace(/\d+/g, 'N')
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL');

    const combined = `${category || 'unknown'}:${normalizedMessage}:${normalizedStack}`;

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  private extractErrorCode(error: Error | string): string | undefined {
    if (typeof error === 'string') return undefined;
    return (error as any).code || (error as any).errno || (error as any).status || undefined;
  }

  private getAlertThreshold(severity: string): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 3;
      case 'medium': return 10;
      case 'low': return 50;
      default: return 10;
    }
  }

  private checkPatternAlerts(pattern: ErrorPattern): void {
    if (pattern.alertSent || pattern.resolved) return;
    if (pattern.occurrences >= pattern.alertThreshold) {
      this.sendPatternAlert(pattern);
      pattern.alertSent = true;
    }
  }

  private sendPatternAlert(pattern: ErrorPattern): void {
    console.warn(`[ErrorTracker] ALERT: Error pattern threshold exceeded`, {
      fingerprint: pattern.fingerprint,
      message: pattern.message,
      occurrences: pattern.occurrences,
      threshold: pattern.alertThreshold,
      severity: pattern.severity,
      category: pattern.category
    });
  }

  private initializeDefaultAlertRules(): void {
    this.addAlertRule({
      name: 'Critical Errors',
      condition: { errorCount: 1, timeWindow: 1, severity: ['critical'] },
      actions: [{ type: 'log', target: 'console' }],
      enabled: true,
      cooldown: 5
    });

    this.addAlertRule({
      name: 'High Error Rate',
      condition: { errorRate: 10, timeWindow: 5 },
      actions: [{ type: 'log', target: 'console' }],
      enabled: true,
      cooldown: 15
    });

    this.addAlertRule({
      name: 'Database Errors',
      condition: { errorCount: 5, timeWindow: 5, category: ['database'] },
      actions: [{ type: 'log', target: 'console' }],
      enabled: true,
      cooldown: 10
    });
  }

  private checkAlertConditions(): void {
    const now = new Date();

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      if (rule.lastTriggered) {
        const timeSinceLastAlert = now.getTime() - rule.lastTriggered.getTime();
        if (timeSinceLastAlert < rule.cooldown * 60 * 1000) return;
      }

      const stats = this.getErrorStats(rule.condition.timeWindow);
      let shouldAlert = false;

      if (rule.condition.errorRate && stats.errorRate > rule.condition.errorRate) {
        shouldAlert = true;
      }

      if (rule.condition.errorCount && stats.totalErrors > rule.condition.errorCount) {
        shouldAlert = true;
      }

      if (rule.condition.severity) {
        const severityCount = rule.condition.severity.reduce((sum, severity) => {
          return sum + (stats.errorsBySeverity[severity] || 0);
        }, 0);
        if (severityCount > 0) shouldAlert = true;
      }

      if (rule.condition.category) {
        const categoryCount = rule.condition.category.reduce((sum, category) => {
          return sum + (stats.errorsByCategory[category] || 0);
        }, 0);
        if (categoryCount > 0) shouldAlert = true;
      }

      if (shouldAlert) {
        this.triggerAlert(rule, stats);
        rule.lastTriggered = now;
      }
    });
  }

  // FIX: stats is now typed as ErrorStats instead of unknown
  private async triggerAlert(rule: AlertRule, stats: ErrorStats): Promise<void> {
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

    for (const action of rule.actions) {
      switch (action.type) {
        case 'log':
          console.error(`[ALERT] ${rule.name}: Alert condition met`);
          break;
        case 'external_integration':
          if (action.integrationName) {
            await this.forwardAlertToIntegration(action.integrationName, rule, stats);
          }
          break;
      }
    }
  }

  private async forwardAlertToIntegration(
    integrationName: string,
    rule: AlertRule,
    stats: ErrorStats
  ): Promise<void> {
    const integration = this.integrationManager.getIntegration(integrationName);
    if (!integration) {
      // FIX: pino-style logger call
      logger.warn(
        { component: 'ErrorTracker', integration: integrationName, rule: rule.name },
        `Integration ${integrationName} not found for alert forwarding`
      );
      return;
    }

    try {
      const alertMessage = `Alert triggered: ${rule.name} - ${JSON.stringify(stats)}`;
      const baseError = new BaseError(alertMessage, {
        domain: 'alert' as unknown,
        severity: 'high' as unknown,
        source: 'error-tracker',
        correlationId: `alert_${Date.now()}`,
        context: { ruleName: rule.name, condition: rule.condition, stats, alertType: 'threshold' }
      });

      const context: SharedErrorContext = {
        correlationId: `alert_${Date.now()}`,
        metadata: { ruleName: rule.name, alertType: 'threshold' }
      };

      await integration.trackError(baseError, context);

      const status = this.integrationStatuses.get(integrationName);
      if (status) status.lastActivity = new Date();
    } catch (error) {
      const status = this.integrationStatuses.get(integrationName);
      if (status) {
        status.lastError = error instanceof Error ? error.message : String(error);
        status.errorCount++;
      }

      // FIX: pino-style logger call
      logger.error(
        { component: 'ErrorTracker', integration: integrationName, rule: rule.name, error },
        `Failed to forward alert to integration ${integrationName}`
      );
    }
  }

  // FIX: headers typed as Record<string, string | string[] | undefined> to match Express IncomingHttpHeaders
  private sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.keys(headers).forEach(key => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        const value = headers[key];
        sanitized[key] = Array.isArray(value) ? value.join(', ') : (value ?? '');
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    // FIX: cast to Record<string, any> for safe index access
    const sanitized: Record<string, any> = { ...(body as Record<string, any>) };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private async forwardToIntegrations(
    message: string,
    severity: string,
    category: string,
    context: ErrorContext,
    occurrences: number
  ): Promise<void> {
    for (const [integrationName, filter] of Array.from(this.integrationFilters.entries())) {
      if (!filter.enabled) continue;
      if (filter.severity && !filter.severity.includes(severity as any)) continue;
      if (filter.category && !filter.category.includes(category as any)) continue;
      if (filter.minOccurrences && occurrences < filter.minOccurrences) continue;

      const integration = this.integrationManager.getIntegration(integrationName);
      if (integration) {
        try {
          const baseError = new BaseError(message, {
            domain: 'system' as unknown,
            severity: severity as unknown,
            source: category,
            correlationId: context.traceId,
            context: { ...context, occurrences, integrationName }
          });

          const sharedContext: SharedErrorContext = {
            metadata: { session_id: context.traceId, ...context }
          };

          if (context.traceId) sharedContext.correlationId = context.traceId;
          if (context.user_id) sharedContext.user_id = context.user_id;

          await integration.trackError(baseError, sharedContext);

          const status = this.integrationStatuses.get(integrationName);
          if (status) status.lastActivity = new Date();
        } catch (error) {
          const status = this.integrationStatuses.get(integrationName);
          if (status) {
            status.lastError = error instanceof Error ? error.message : String(error);
            status.errorCount++;
          }

          // FIX: pino-style logger call
          logger.error(
            { component: 'ErrorTracker', integration: integrationName, error },
            `Failed to forward error to integration ${integrationName}`
          );
        }
      }
    }
  }

  async getCombinedAnalytics(timeWindow: number = 60): Promise<{
    internal: ErrorStats;
    external: Array<{ integration: string; analytics: any }>;
    combined: {
      totalErrors: number;
      errorRate: number;
      topIssues: Array<{ source: string; message: string; count: number }>;
      trends: any;
    };
  }> {
    const internalStats = this.getErrorStats(timeWindow);

    const externalAnalytics: Array<{ integration: string; analytics: any }> = [];
    // FIX: i is typed as any (was unknown), so i.name is safe
    for (const integrationName of this.integrationManager.getAllIntegrations().map((i: any) => i.name)) {
      const integration = this.integrationManager.getIntegration(integrationName);
      if (integration) {
        try {
          const analytics = await integration.getAnalytics();
          externalAnalytics.push({ integration: integrationName, analytics });
        } catch (error) {
          // FIX: pino-style logger call
          logger.warn(
            { component: 'ErrorTracker', integration: integrationName, error },
            `Failed to get analytics from integration ${integrationName}`
          );
        }
      }
    }

    const combined = this.combineAnalytics(internalStats, externalAnalytics);

    return { internal: internalStats, external: externalAnalytics, combined };
  }

  private combineAnalytics(
    internal: ErrorStats,
    external: Array<{ integration: string; analytics: any }>
  ): any {
    let totalErrors = internal.totalErrors;
    const topIssues: Array<{ source: string; message: string; count: number }> = [];

    // FIX: pattern is typed as the known shape from topPatterns
    internal.topPatterns.forEach((pattern) => {
      topIssues.push({
        source: 'internal',
        message: pattern.message,
        count: pattern.count
      });
    });

    external.forEach(({ integration, analytics }) => {
      if (analytics.totalErrors) {
        totalErrors += analytics.totalErrors;
      }

      if (analytics.topIssues) {
        // FIX: issue is typed as any — use explicit type annotation
        analytics.topIssues.forEach((issue: { error?: string; title?: string; count?: number; occurrences?: number }) => {
          topIssues.push({
            source: integration,
            message: issue.error || issue.title || 'Unknown',
            count: issue.count || issue.occurrences || 1
          });
        });
      }
    });

    topIssues.sort((a, b) => b.count - a.count);
    topIssues.splice(10);

    return {
      totalErrors,
      errorRate: internal.errorRate,
      topIssues,
      trends: internal.recentTrends
    };
  }

  private cleanupOldErrors(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const errorsToDelete: string[] = [];
    this.errors.forEach((error, id) => {
      if (error.timestamp < cutoffTime && error.resolved) {
        errorsToDelete.push(id);
      }
    });
    errorsToDelete.forEach(id => this.errors.delete(id));

    const patternsToDelete: string[] = [];
    this.patterns.forEach((pattern, fingerprint) => {
      if (pattern.lastSeen < cutoffTime && pattern.resolved) {
        patternsToDelete.push(fingerprint);
      }
    });
    patternsToDelete.forEach(fingerprint => this.patterns.delete(fingerprint));

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