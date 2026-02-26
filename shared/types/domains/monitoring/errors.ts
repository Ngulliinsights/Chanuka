/**
 * Monitoring Domain - Error Analytics Types
 * Comprehensive error analytics types following error hierarchy patterns
 *
 * Key features:
 * - Error hierarchy with base and specialized error types
 * - Error analytics and tracking interfaces
 * - Error classification and severity systems
 * - Error trend analysis and reporting
 */

// ============================================================================
// Error Analytics Branded Types
// ============================================================================

export type ErrorEventId = string & { readonly __brand: 'ErrorEventId' };
export type ErrorGroupId = string & { readonly __brand: 'ErrorGroupId' };
export type ErrorFingerprint = string & { readonly __brand: 'ErrorFingerprint' };
export type ErrorAnalysisId = string & { readonly __brand: 'ErrorAnalysisId' };

// ============================================================================
// Error Classification and Severity
// ============================================================================

export type ErrorType =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'database'
  | 'configuration'
  | 'business_logic'
  | 'integration'
  | 'timeout'
  | 'resource_exhaustion'
  | 'unknown';

export type MonitoringErrorSeverity = 'low' | 'medium' | 'high' | 'critical' | 'blocker';
export type ErrorStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'rejected';
export type ErrorImpact = 'none' | 'minor' | 'moderate' | 'major' | 'catastrophic';
export type ErrorFrequency = 'one-time' | 'intermittent' | 'frequent' | 'constant';

// ============================================================================
// Base Error Analytics Interface
// ============================================================================

/**
 * Base error event interface
 */
export interface BaseErrorEvent {
  readonly id: ErrorEventId;
  readonly timestamp: number; // Unix timestamp in milliseconds
  readonly type: ErrorType;
  readonly severity: MonitoringErrorSeverity;
  readonly message: string;
  readonly stackTrace?: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly source: 'frontend' | 'backend' | 'database' | 'external' | 'infrastructure';
  readonly environment: 'development' | 'staging' | 'production' | 'test';
  readonly tags?: Readonly<Record<string, string>>;
}

// ============================================================================
// Specialized Error Event Types
// ============================================================================

/**
 * Validation error event
 */
export interface ValidationErrorEvent extends BaseErrorEvent {
  readonly type: 'validation';
  readonly field?: string;
  readonly validationRule?: string;
  readonly invalidValue?: unknown;
  readonly expectedFormat?: string;
}

/**
 * Authentication error event
 */
export interface AuthenticationErrorEvent extends BaseErrorEvent {
  readonly type: 'authentication';
  readonly authMethod?: 'password' | 'oauth' | 'jwt' | 'api-key' | 'sso';
  readonly userId?: string;
  readonly ipAddress?: string;
  readonly attemptCount?: number;
}

/**
 * Authorization error event
 */
export interface AuthorizationErrorEvent extends BaseErrorEvent {
  readonly type: 'authorization';
  readonly userId?: string;
  readonly resource?: string;
  readonly requiredPermission?: string;
  readonly userRoles?: readonly string[];
}

/**
 * Network error event
 */
export interface NetworkErrorEvent extends BaseErrorEvent {
  readonly type: 'network';
  readonly url?: string;
  readonly method?: string;
  readonly statusCode?: number;
  readonly responseTime?: number; // in milliseconds
  readonly isTimeout?: boolean;
  readonly isRetryable?: boolean;
}

/**
 * Database error event
 */
export interface DatabaseErrorEvent extends BaseErrorEvent {
  readonly type: 'database';
  readonly query?: string;
  readonly operation?: 'read' | 'write' | 'update' | 'delete' | 'transaction';
  readonly table?: string;
  readonly databaseType?: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'other';
  readonly isConnectionError?: boolean;
  readonly isTimeout?: boolean;
}

/**
 * Configuration error event
 */
export interface ConfigurationErrorEvent extends BaseErrorEvent {
  readonly type: 'configuration';
  readonly configKey?: string;
  readonly expectedType?: string;
  readonly actualValue?: unknown;
  readonly isMissing?: boolean;
}

/**
 * Business logic error event
 */
export interface BusinessLogicErrorEvent extends BaseErrorEvent {
  readonly type: 'business_logic';
  readonly businessRule?: string;
  readonly entityId?: string;
  readonly entityType?: string;
  readonly conflictType?: 'constraint_violation' | 'state_conflict' | 'validation_failure';
}

/**
 * Integration error event
 */
export interface IntegrationErrorEvent extends BaseErrorEvent {
  readonly type: 'integration';
  readonly service?: string;
  readonly endpoint?: string;
  readonly integrationType?: 'api' | 'websocket' | 'queue' | 'rpc' | 'sdk';
  readonly isRetryable?: boolean;
  readonly retryCount?: number;
}

/**
 * Timeout error event
 */
export interface TimeoutErrorEvent extends BaseErrorEvent {
  readonly type: 'timeout';
  readonly operation?: string;
  readonly timeoutDuration?: number; // in milliseconds
  readonly elapsedTime?: number; // in milliseconds
  readonly isRetryable?: boolean;
}

/**
 * Resource exhaustion error event
 */
export interface ResourceExhaustionErrorEvent extends BaseErrorEvent {
  readonly type: 'resource_exhaustion';
  readonly resourceType?: 'memory' | 'cpu' | 'disk' | 'connections' | 'threads' | 'queue';
  readonly limit?: number;
  readonly currentUsage?: number;
  readonly threshold?: number;
}

/**
 * Unknown error event
 */
export interface UnknownErrorEvent extends BaseErrorEvent {
  readonly type: 'unknown';
  readonly originalError?: unknown;
  readonly isUnhandled?: boolean;
}

// ============================================================================
// Error Grouping and Fingerprinting
// ============================================================================

/**
 * Error fingerprint for grouping similar errors
 */
export interface ErrorFingerprintData {
  readonly fingerprint: ErrorFingerprint;
  readonly errorType: ErrorType;
  readonly messagePattern: string;
  readonly stackTracePattern?: string;
  readonly contextHash?: string;
  readonly createdAt: number;
  readonly lastSeen: number;
  readonly occurrenceCount: number;
  readonly firstOccurrenceId: ErrorEventId;
  readonly lastOccurrenceId: ErrorEventId;
}

/**
 * Error group for related errors
 */
export interface ErrorGroup {
  readonly id: ErrorGroupId;
  readonly fingerprint: ErrorFingerprint;
  readonly errorType: ErrorType;
  readonly title: string;
  readonly description?: string;
  readonly severity: MonitoringErrorSeverity;
  readonly status: ErrorStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly firstOccurrence: number;
  readonly lastOccurrence: number;
  readonly occurrenceCount: number;
  readonly affectedUsers: number;
  readonly impact: ErrorImpact;
  readonly frequency: ErrorFrequency;
  readonly assignedTo?: string;
  readonly tags?: readonly string[];
}

// ============================================================================
// Error Analytics and Tracking
// ============================================================================

/**
 * Error analytics summary
 */
export interface ErrorAnalyticsSummary {
  readonly timeRange: {
    readonly start: number;
    readonly end: number;
  };
  readonly totalErrors: number;
  readonly errorsByType: Readonly<Record<ErrorType, number>>;
  readonly errorsBySeverity: Readonly<Record<MonitoringErrorSeverity, number>>;
  readonly errorsBySource: Readonly<Record<'frontend' | 'backend' | 'database' | 'external' | 'infrastructure', number>>;
  readonly errorRate: number; // errors per minute
  readonly uniqueErrorGroups: number;
  readonly newErrorGroups: number;
  readonly resolvedErrorGroups: number;
  readonly openCriticalErrors: number;
  readonly meanTimeToResolution?: number; // in milliseconds
  readonly meanTimeToAcknowledgment?: number; // in milliseconds
}

/**
 * Error trend analysis
 */
export interface ErrorTrendAnalysis {
  readonly errorType: ErrorType | 'all';
  readonly timeRange: '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d';
  readonly dataPoints: readonly {
    readonly timestamp: number;
    readonly count: number;
    readonly uniqueGroups: number;
    readonly severityDistribution: Readonly<Record<MonitoringErrorSeverity, number>>;
  }[];
  readonly trend: 'increasing' | 'decreasing' | 'stable' | 'spiking';
  readonly percentageChange: number;
  readonly isAnomaly: boolean;
  readonly anomalySeverity?: 'low' | 'medium' | 'high';
}

/**
 * Error impact analysis
 */
export interface ErrorImpactAnalysis {
  readonly errorGroupId: ErrorGroupId;
  readonly errorType: ErrorType;
  readonly affectedUsers: number;
  readonly affectedSessions: number;
  readonly userImpact: ErrorImpact;
  readonly businessImpact: ErrorImpact;
  readonly revenueImpact?: number; // estimated revenue loss
  readonly reputationImpact?: 'low' | 'medium' | 'high' | 'severe';
  readonly affectedFeatures: readonly string[];
  readonly affectedEndpoints: readonly string[];
  readonly timePeriod: {
    readonly start: number;
    readonly end: number;
  };
}

// ============================================================================
// Error Reporting and Alerting
// ============================================================================

/**
 * Error alert configuration
 */
export interface ErrorAlertConfiguration {
  readonly alertId: string;
  readonly name: string;
  readonly description: string;
  readonly errorTypeFilter?: readonly ErrorType[];
  readonly severityFilter?: readonly MonitoringErrorSeverity[];
  readonly threshold: number; // error count threshold
  readonly timeWindow: number; // in milliseconds
  readonly notificationChannels: readonly ('email' | 'slack' | 'pagerduty' | 'sms' | 'webhook')[];
  readonly recipients: readonly string[];
  readonly isEnabled: boolean;
  readonly lastTriggered?: number;
  readonly cooldownPeriod?: number; // in milliseconds
}

/**
 * Error alert trigger
 */
export interface ErrorAlertTrigger {
  readonly alertId: string;
  readonly triggeredAt: number;
  readonly errorGroupId: ErrorGroupId;
  readonly errorType: ErrorType;
  readonly severity: MonitoringErrorSeverity;
  readonly count: number;
  readonly timeWindow: number; // in milliseconds
  readonly message: string;
  readonly status: 'triggered' | 'acknowledged' | 'resolved';
  readonly acknowledgedBy?: string;
  readonly acknowledgedAt?: number;
  readonly resolvedBy?: string;
  readonly resolvedAt?: number;
}

/**
 * Error notification
 */
export interface ErrorNotification {
  readonly notificationId: string;
  readonly alertId: string;
  readonly errorGroupId: ErrorGroupId;
  readonly sentAt: number;
  readonly channel: 'email' | 'slack' | 'pagerduty' | 'sms' | 'webhook';
  readonly recipient: string;
  readonly status: 'sent' | 'delivered' | 'read' | 'failed';
  readonly message: string;
  readonly errorDetails?: {
    readonly errorType: ErrorType;
    readonly severity: MonitoringErrorSeverity;
    readonly count: number;
    readonly firstOccurrence: number;
    readonly lastOccurrence: number;
  };
}

// ============================================================================
// Error Analytics Actions
// ============================================================================

/**
 * Error analytics action payloads
 */
export interface ReportErrorPayload {
  readonly error: BaseErrorEvent;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly additionalContext?: Readonly<Record<string, unknown>>;
}

export interface GroupErrorPayload {
  readonly errorId: ErrorEventId;
  readonly fingerprint: ErrorFingerprint;
  readonly groupId?: ErrorGroupId;
}

export interface UpdateErrorStatusPayload {
  readonly errorGroupId: ErrorGroupId;
  readonly status: ErrorStatus;
  readonly assignedTo?: string;
  readonly comment?: string;
}

export interface AnalyzeErrorTrendsPayload {
  readonly errorType?: ErrorType;
  readonly timeRange: string;
  readonly severityFilter?: readonly MonitoringErrorSeverity[];
}

export interface GenerateErrorReportPayload {
  readonly timeRange: {
    readonly start: number;
    readonly end: number;
  };
  readonly format: 'json' | 'csv' | 'pdf' | 'html';
  readonly includeDetails?: boolean;
  readonly severityFilter?: readonly MonitoringErrorSeverity[];
}

/**
 * Error analytics action discriminated union
 */
export type ErrorAnalyticsAction =
  | { type: 'REPORT_ERROR'; payload: ReportErrorPayload }
  | { type: 'GROUP_ERROR'; payload: GroupErrorPayload }
  | { type: 'UPDATE_ERROR_STATUS'; payload: UpdateErrorStatusPayload }
  | { type: 'ANALYZE_ERROR_TRENDS'; payload: AnalyzeErrorTrendsPayload }
  | { type: 'GENERATE_ERROR_REPORT'; payload: GenerateErrorReportPayload }
  | { type: 'CREATE_ERROR_ALERT'; payload: ErrorAlertConfiguration }
  | { type: 'UPDATE_ERROR_ALERT'; payload: Partial<ErrorAlertConfiguration> & { alertId: string } }
  | { type: 'TRIGGER_ERROR_ALERT'; payload: { alertId: string; errorGroupId: ErrorGroupId } }
  | { type: 'ACKNOWLEDGE_ERROR_ALERT'; payload: { alertId: string; userId: string } }
  | { type: 'RESOLVE_ERROR_ALERT'; payload: { alertId: string; userId: string; resolutionNotes?: string } };

// ============================================================================
// Error Analytics Error Classes
// ============================================================================

/**
 * Error analytics specific error classes
 */
export class ErrorGroupingFailedError extends Error {
  constructor(
    public readonly errorId: ErrorEventId,
    message: string,
    public readonly reason: 'fingerprint_failed' | 'database_error' | 'invalid_data'
  ) {
    super(message);
    this.name = 'ErrorGroupingFailedError';
    Object.setPrototypeOf(this, ErrorGroupingFailedError.prototype);
  }
}

export class ErrorAnalysisFailedError extends Error {
  constructor(
    public readonly analysisId: ErrorAnalysisId,
    message: string,
    public readonly step: 'data_collection' | 'trend_analysis' | 'impact_assessment' | 'report_generation',
    public readonly underlyingError?: Error
  ) {
    super(message);
    this.name = 'ErrorAnalysisFailedError';
    Object.setPrototypeOf(this, ErrorAnalysisFailedError.prototype);
  }
}

export class ErrorAlertThresholdBreachedError extends Error {
  constructor(
    public readonly alertId: string,
    message: string,
    public readonly errorGroupId: ErrorGroupId,
    public readonly threshold: number,
    public readonly actualCount: number,
    public readonly timeWindow: number
  ) {
    super(message);
    this.name = 'ErrorAlertThresholdBreachedError';
    Object.setPrototypeOf(this, ErrorAlertThresholdBreachedError.prototype);
  }
}

export class ErrorNotificationFailedError extends Error {
  constructor(
    public readonly notificationId: string,
    message: string,
    public readonly channel: 'email' | 'slack' | 'pagerduty' | 'sms' | 'webhook',
    public readonly recipient: string,
    public readonly underlyingError?: Error
  ) {
    super(message);
    this.name = 'ErrorNotificationFailedError';
    Object.setPrototypeOf(this, ErrorNotificationFailedError.prototype);
  }
}