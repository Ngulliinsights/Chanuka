/**
 * Security System Error Middleware
 *
 * Handles authentication and authorization error patterns with specialized
 * recovery strategies, security logging, and cross-system error propagation.
 */

import {
  AppError,
  ErrorDomain,
  ErrorSeverity,
  ErrorReporter,
  ErrorTransformer,
  RecoveryStrategy,
  RecoveryAction,
  coreErrorHandler,
  ErrorAnalyticsService,
} from '../index';

/**
 * Security-specific error codes
 */
export enum SecurityErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

/**
 * Security error context
 */
interface SecurityErrorContext {
  userId?: string;
  sessionId?: string;
  resource?: string;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
  attemptedAt?: number;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Security middleware configuration
 */
interface SecurityMiddlewareConfig {
  enableSecurityLogging: boolean;
  enableIntrusionDetection: boolean;
  maxFailedAttempts: number;
  lockoutDurationMs: number;
  enableAutoRecovery: boolean;
  securityAnalyticsEnabled: boolean;
}

/**
 * Security Error Middleware
 *
 * Handles authentication and authorization errors with specialized processing,
 * security monitoring, and recovery strategies.
 */
export class SecurityErrorMiddleware implements ErrorReporter, ErrorTransformer {
  private config: SecurityMiddlewareConfig;
  private analyticsService: ErrorAnalyticsService;
  private failedAttempts = new Map<string, number>();
  private lockouts = new Map<string, number>();
  private securityEvents: SecurityErrorContext[] = [];

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = {
      enableSecurityLogging: true,
      enableIntrusionDetection: true,
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
      enableAutoRecovery: true,
      securityAnalyticsEnabled: true,
      ...config,
    };

    this.analyticsService = ErrorAnalyticsService.getInstance();

    // Register with core error handler
    coreErrorHandler.addReporter(this);
  }

  /**
   * Report security errors with enhanced context
   */
  async report(error: AppError): Promise<void> {
    if (!this.isSecurityError(error)) {
      return;
    }

    const securityContext = this.extractSecurityContext(error);

    // Enhanced security logging
    if (this.config.enableSecurityLogging) {
      await this.logSecurityEvent(error, securityContext);
    }

    // Intrusion detection
    if (this.config.enableIntrusionDetection) {
      await this.detectIntrusion(error, securityContext);
    }

    // Security analytics
    if (this.config.securityAnalyticsEnabled) {
      await this.trackSecurityAnalytics(error, securityContext);
    }

    // Account lockout logic
    if (this.shouldTriggerLockout(error, securityContext)) {
      await this.handleAccountLockout(securityContext);
    }
  }

  /**
   * Transform security errors with additional context and recovery strategies
   */
  transform(error: AppError): AppError {
    if (!this.isSecurityError(error)) {
      return error;
    }

    const securityContext = this.extractSecurityContext(error);
    const recoveryStrategies = this.getSecurityRecoveryStrategies(error, securityContext);

    return new AppError(
      error.message,
      error.code,
      error.type,
      error.severity,
      {
        ...error,
        context: {
          ...error.context,
          ...securityContext,
        },
        recoveryStrategies,
        recoverable: this.isRecoverableSecurityError(error),
        retryable: this.isRetryableSecurityError(error),
      }
    );
  }

  /**
   * Check if error is security-related
   */
  private isSecurityError(error: AppError): boolean {
    return (
      error.type === ErrorDomain.SECURITY ||
      Object.values(SecurityErrorCode).includes(error.code as SecurityErrorCode) ||
      error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('security') ||
      error.message.toLowerCase().includes('permission')
    );
  }

  /**
   * Extract security-specific context from error
   */
  private extractSecurityContext(error: AppError): SecurityErrorContext {
    const context: SecurityErrorContext = {
      userId: error.context?.userId || error.userId,
      sessionId: error.context?.sessionId || error.sessionId,
      attemptedAt: error.timestamp,
      securityLevel: this.determineSecurityLevel(error),
    };

    // Extract additional context from error details
    if (error.details) {
      context.resource = error.details.resource as string;
      context.action = error.details.action as string;
      context.ipAddress = error.details.ipAddress as string;
      context.userAgent = error.details.userAgent as string;
    }

    return context;
  }

  /**
   * Determine security level based on error type
   */
  private determineSecurityLevel(error: AppError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case SecurityErrorCode.SECURITY_VIOLATION:
        return 'critical';
      case SecurityErrorCode.AUTHENTICATION_FAILED:
      case SecurityErrorCode.AUTHORIZATION_DENIED:
        return 'high';
      case SecurityErrorCode.TOKEN_EXPIRED:
      case SecurityErrorCode.SESSION_EXPIRED:
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Get recovery strategies for security errors
   */
  private getSecurityRecoveryStrategies(
    error: AppError,
    context: SecurityErrorContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (error.code) {
      case SecurityErrorCode.TOKEN_EXPIRED:
        strategies.push({
          id: 'security-token-refresh',
          type: RecoveryAction.RETRY,
          name: 'Refresh Authentication Token',
          description: 'Attempt to refresh the expired authentication token',
          automatic: true,
          priority: 1,
          maxRetries: 1,
          asyncAction: async () => {
            // Implementation would integrate with auth service
            return false; // Placeholder
          },
        });
        break;

      case SecurityErrorCode.SESSION_EXPIRED:
        strategies.push({
          id: 'security-session-restore',
          type: RecoveryAction.REDIRECT,
          name: 'Restore Session',
          description: 'Redirect to login to restore session',
          automatic: false,
          priority: 1,
        });
        break;

      case SecurityErrorCode.MFA_REQUIRED:
        strategies.push({
          id: 'security-mfa-prompt',
          type: RecoveryAction.MANUAL_RECOVERY,
          name: 'Complete MFA',
          description: 'Prompt user to complete multi-factor authentication',
          automatic: false,
          priority: 1,
        });
        break;
    }

    return strategies;
  }

  /**
   * Check if security error is recoverable
   */
  private isRecoverableSecurityError(error: AppError): boolean {
    const recoverableCodes = [
      SecurityErrorCode.TOKEN_EXPIRED,
      SecurityErrorCode.SESSION_EXPIRED,
      SecurityErrorCode.MFA_REQUIRED,
    ];

    return recoverableCodes.includes(error.code as SecurityErrorCode);
  }

  /**
   * Check if security error is retryable
   */
  private isRetryableSecurityError(error: AppError): boolean {
    const retryableCodes = [
      SecurityErrorCode.TOKEN_EXPIRED,
    ];

    return retryableCodes.includes(error.code as SecurityErrorCode);
  }

  /**
   * Log security events with enhanced context
   */
  private async logSecurityEvent(
    error: AppError,
    context: SecurityErrorContext
  ): Promise<void> {
    const securityLog = {
      timestamp: new Date().toISOString(),
      level: context.securityLevel,
      event: error.code,
      userId: context.userId,
      sessionId: context.sessionId,
      resource: context.resource,
      action: context.action,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity,
      },
    };

    console.warn('[Security Event]', securityLog);

    // Store for analytics
    this.securityEvents.push(context);
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }
  }

  /**
   * Detect potential intrusion attempts
   */
  private async detectIntrusion(
    error: AppError,
    context: SecurityErrorContext
  ): Promise<void> {
    const userId = context.userId || 'anonymous';
    const currentTime = Date.now();

    // Track failed attempts
    const attempts = this.failedAttempts.get(userId) || 0;
    this.failedAttempts.set(userId, attempts + 1);

    // Check for rapid failed attempts (potential brute force)
    if (attempts >= this.config.maxFailedAttempts) {
      const intrusionError = new AppError(
        `Potential security intrusion detected for user ${userId}`,
        SecurityErrorCode.SECURITY_VIOLATION,
        ErrorDomain.SECURITY,
        ErrorSeverity.CRITICAL,
        {
          context: {
            ...context,
            intrusionType: 'brute_force_attempt',
            failedAttempts: attempts + 1,
          },
        }
      );

      await coreErrorHandler.handleError(intrusionError);
    }
  }

  /**
   * Track security analytics
   */
  private async trackSecurityAnalytics(
    error: AppError,
    context: SecurityErrorContext
  ): Promise<void> {
    await this.analyticsService.track(error);
  }

  /**
   * Check if account should be locked out
   */
  private shouldTriggerLockout(
    error: AppError,
    context: SecurityErrorContext
  ): boolean {
    if (!context.userId) return false;

    const userId = context.userId;
    const attempts = this.failedAttempts.get(userId) || 0;
    const lastLockout = this.lockouts.get(userId);

    // Check if already locked out
    if (lastLockout && Date.now() - lastLockout < this.config.lockoutDurationMs) {
      return false;
    }

    return (
      error.code === SecurityErrorCode.AUTHENTICATION_FAILED &&
      attempts >= this.config.maxFailedAttempts
    );
  }

  /**
   * Handle account lockout
   */
  private async handleAccountLockout(context: SecurityErrorContext): Promise<void> {
    if (!context.userId) return;

    const userId = context.userId;
    this.lockouts.set(userId, Date.now());

    const lockoutError = new AppError(
      `Account temporarily locked due to multiple failed authentication attempts`,
      SecurityErrorCode.ACCOUNT_LOCKED,
      ErrorDomain.SECURITY,
      ErrorSeverity.HIGH,
      {
        context: {
          ...context,
          lockoutDuration: this.config.lockoutDurationMs,
          unlockTime: new Date(Date.now() + this.config.lockoutDurationMs).toISOString(),
        },
        recoverable: true,
        retryable: false,
      }
    );

    await coreErrorHandler.handleError(lockoutError);
  }

  /**
   * Check if user account is currently locked
   */
  isAccountLocked(userId: string): boolean {
    const lastLockout = this.lockouts.get(userId);
    if (!lastLockout) return false;

    return Date.now() - lastLockout < this.config.lockoutDurationMs;
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;

    const recentEvents = this.securityEvents.filter(
      event => event.attemptedAt && event.attemptedAt > lastHour
    );

    return {
      totalSecurityEvents: this.securityEvents.length,
      recentSecurityEvents: recentEvents.length,
      activeLockouts: Array.from(this.lockouts.entries()).filter(
        ([, timestamp]) => now - timestamp < this.config.lockoutDurationMs
      ).length,
      failedAttemptsByUser: Object.fromEntries(this.failedAttempts),
    };
  }

  /**
   * Cleanup expired lockouts and old events
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old lockouts
    for (const [userId, timestamp] of this.lockouts.entries()) {
      if (now - timestamp > this.config.lockoutDurationMs) {
        this.lockouts.delete(userId);
      }
    }

    // Clean up old events
    this.securityEvents = this.securityEvents.filter(
      event => event.attemptedAt && now - event.attemptedAt < maxAge
    );
  }
}

// Export singleton instance
export const securityErrorMiddleware = new SecurityErrorMiddleware();

// Export types
export type { SecurityErrorContext, SecurityMiddlewareConfig };
