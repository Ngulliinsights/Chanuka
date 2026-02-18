/**
 * Centralized Logging Configuration
 *
 * Provides environment-based configuration for all logging components
 * including log levels, transports, performance thresholds, and audit settings.
 */

export interface LoggingConfig {
  // Core logging settings
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  pretty: boolean;
  asyncTransport: boolean;

  // Performance monitoring
  slowQueryThreshold: number;
  verySlowQueryThreshold: number;
  slowRequestThreshold: number;

  // Storage and retention
  enableInMemoryStorage: boolean;
  maxStoredLogs: number;
  logRetentionHours: number;

  // File logging
  enableFileLogging: boolean;
  logDirectory: string;
  maxFileSize: string;
  maxFiles: number;
  compressLogs: boolean;

  // Audit logging
  enableAuditLogging: boolean;
  auditSensitiveOperations: boolean;
  auditLogRetentionDays: number;

  // Security monitoring
  enableSecurityMonitoring: boolean;
  securityEventThreshold: 'low' | 'medium' | 'high' | 'critical';

  // Metrics and monitoring
  enableMetrics: boolean;
  metricsReportInterval: number;
  enableTracing: boolean;
  tracingSampleRate: number;

  // Correlation and context
  enableCorrelationIds: boolean;
  correlationIdGenerator: () => string;

  // Sensitive data handling
  redactSensitivePaths: string[];
  enablePiiDetection: boolean;
}

export interface EnvironmentOverrides {
  development: Partial<LoggingConfig>;
  test: Partial<LoggingConfig>;
  staging: Partial<LoggingConfig>;
  production: Partial<LoggingConfig>;
}

// Default configuration
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  // Core settings
  level: 'info',
  pretty: false,
  asyncTransport: true,

  // Performance thresholds (in milliseconds)
  slowQueryThreshold: 1000,
  verySlowQueryThreshold: 5000,
  slowRequestThreshold: 3000,

  // Storage settings
  enableInMemoryStorage: true,
  maxStoredLogs: 10000,
  logRetentionHours: 24,

  // File logging
  enableFileLogging: true,
  logDirectory: './logs',
  maxFileSize: '10MB',
  maxFiles: 5,
  compressLogs: true,

  // Audit settings
  enableAuditLogging: true,
  auditSensitiveOperations: true,
  auditLogRetentionDays: 90,

  // Security settings
  enableSecurityMonitoring: true,
  securityEventThreshold: 'medium',

  // Metrics settings
  enableMetrics: true,
  metricsReportInterval: 300000, // 5 minutes
  enableTracing: false,
  tracingSampleRate: 0.1,

  // Correlation settings
  enableCorrelationIds: true,
  correlationIdGenerator: () => `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Sensitive data settings
  redactSensitivePaths: [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'session',
    'cookie',
    'authorization',
    'x-api-key'
  ],
  enablePiiDetection: true
};

// Environment-specific overrides
export const ENVIRONMENT_OVERRIDES: EnvironmentOverrides = {
  development: {
    level: 'debug',
    pretty: true,
    enableTracing: true,
    tracingSampleRate: 0.5,
    maxStoredLogs: 5000,
    enableFileLogging: false // Console only in development
  },

  test: {
    level: 'error', // Only log errors during tests
    enableInMemoryStorage: false,
    enableFileLogging: false,
    enableMetrics: false,
    enableTracing: false,
    enableAuditLogging: false,
    enableSecurityMonitoring: false
  },

  staging: {
    level: 'warn',
    enableTracing: true,
    tracingSampleRate: 0.2,
    auditLogRetentionDays: 30
  },

  production: {
    level: 'info',
    pretty: false,
    enableTracing: true,
    tracingSampleRate: 0.05,
    maxStoredLogs: 50000,
    auditLogRetentionDays: 2555, // 7 years for compliance
    enablePiiDetection: true
  }
};

/**
 * Get logging configuration for current environment
 */
export function getLoggingConfig(): LoggingConfig {
  const env = (process.env.NODE_ENV || 'development') as keyof EnvironmentOverrides;
  const baseConfig = { ...DEFAULT_LOGGING_CONFIG };
  const envOverrides = ENVIRONMENT_OVERRIDES[env] || {};

  // Override from environment variables
  const envVarOverrides = getEnvironmentVariableOverrides();

  return {
    ...baseConfig,
    ...envOverrides,
    ...envVarOverrides
  };
}

/**
 * Get configuration overrides from environment variables
 */
function getEnvironmentVariableOverrides(): Partial<LoggingConfig> {
  const overrides: Partial<LoggingConfig> = {};

  // Core settings
  if (process.env.LOG_LEVEL) {
    overrides.level = process.env.LOG_LEVEL as LoggingConfig['level'];
  }

  if (process.env.LOG_PRETTY) {
    overrides.pretty = process.env.LOG_PRETTY === 'true';
  }

  // Performance thresholds
  if (process.env.SLOW_QUERY_THRESHOLD) {
    overrides.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD, 10);
  }

  if (process.env.SLOW_REQUEST_THRESHOLD) {
    overrides.slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD, 10);
  }

  // Storage settings
  if (process.env.MAX_STORED_LOGS) {
    overrides.maxStoredLogs = parseInt(process.env.MAX_STORED_LOGS, 10);
  }

  if (process.env.LOG_RETENTION_HOURS) {
    overrides.logRetentionHours = parseInt(process.env.LOG_RETENTION_HOURS, 10);
  }

  // File logging
  if (process.env.ENABLE_FILE_LOGGING) {
    overrides.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
  }

  if (process.env.LOG_DIRECTORY) {
    overrides.logDirectory = process.env.LOG_DIRECTORY;
  }

  if (process.env.LOG_MAX_FILE_SIZE) {
    overrides.maxFileSize = process.env.LOG_MAX_FILE_SIZE;
  }

  if (process.env.LOG_MAX_FILES) {
    overrides.maxFiles = parseInt(process.env.LOG_MAX_FILES, 10);
  }

  if (process.env.LOG_COMPRESS) {
    overrides.compressLogs = process.env.LOG_COMPRESS === 'true';
  }

  // Audit settings
  if (process.env.ENABLE_AUDIT_LOGGING) {
    overrides.enableAuditLogging = process.env.ENABLE_AUDIT_LOGGING === 'true';
  }

  if (process.env.AUDIT_LOG_RETENTION_DAYS) {
    overrides.auditLogRetentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10);
  }

  // Security settings
  if (process.env.ENABLE_SECURITY_MONITORING) {
    overrides.enableSecurityMonitoring = process.env.ENABLE_SECURITY_MONITORING === 'true';
  }

  if (process.env.SECURITY_EVENT_THRESHOLD) {
    overrides.securityEventThreshold = process.env.SECURITY_EVENT_THRESHOLD as LoggingConfig['securityEventThreshold'];
  }

  // Metrics settings
  if (process.env.ENABLE_LOG_METRICS) {
    overrides.enableMetrics = process.env.ENABLE_LOG_METRICS === 'true';
  }

  if (process.env.METRICS_REPORT_INTERVAL) {
    overrides.metricsReportInterval = parseInt(process.env.METRICS_REPORT_INTERVAL, 10);
  }

  if (process.env.ENABLE_TRACING) {
    overrides.enableTracing = process.env.ENABLE_TRACING === 'true';
  }

  if (process.env.TRACING_SAMPLE_RATE) {
    overrides.tracingSampleRate = parseFloat(process.env.TRACING_SAMPLE_RATE);
  }

  // Correlation settings
  if (process.env.ENABLE_CORRELATION_IDS) {
    overrides.enableCorrelationIds = process.env.ENABLE_CORRELATION_IDS === 'true';
  }

  return overrides;
}

/**
 * Validate logging configuration
 */
export function validateLoggingConfig(config: LoggingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate log level
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  if (!validLevels.includes(config.level)) {
    errors.push(`Invalid log level: ${config.level}. Must be one of: ${validLevels.join(', ')}`);
  }

  // Validate thresholds
  if (config.slowQueryThreshold < 0) {
    errors.push('slowQueryThreshold must be non-negative');
  }

  if (config.verySlowQueryThreshold <= config.slowQueryThreshold) {
    errors.push('verySlowQueryThreshold must be greater than slowQueryThreshold');
  }

  // Validate storage settings
  if (config.maxStoredLogs < 0) {
    errors.push('maxStoredLogs must be non-negative');
  }

  if (config.logRetentionHours < 1) {
    errors.push('logRetentionHours must be at least 1');
  }

  // Validate audit settings
  if (config.auditLogRetentionDays < 1) {
    errors.push('auditLogRetentionDays must be at least 1');
  }

  // Validate security settings
  const validThresholds = ['low', 'medium', 'high', 'critical'];
  if (!validThresholds.includes(config.securityEventThreshold)) {
    errors.push(`Invalid securityEventThreshold: ${config.securityEventThreshold}. Must be one of: ${validThresholds.join(', ')}`);
  }

  // Validate tracing settings
  if (config.tracingSampleRate < 0 || config.tracingSampleRate > 1) {
    errors.push('tracingSampleRate must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Initialize logging configuration and validate it
 */
export function initializeLoggingConfig(): LoggingConfig {
  const config = getLoggingConfig();
  const validation = validateLoggingConfig(config);

  if (!validation.valid) {
    console.error('Invalid logging configuration:', validation.errors);
    throw new Error(`Logging configuration validation failed: ${validation.errors.join(', ')}`);
  }

  return config;
}

// Export singleton configuration
export const loggingConfig = initializeLoggingConfig();