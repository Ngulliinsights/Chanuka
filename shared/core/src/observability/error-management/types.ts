/**
 * Type definitions for Error Management System
 */

import { BaseError, ErrorSeverity } from './errors/base-error.js';

// Import existing types
export type {
  BaseErrorOptions,
  ErrorMetadata,
  RecoveryStrategy,
  ErrorDomain
} from './errors/base-error.js';

export type {
  CircuitBreakerOptions,
  CircuitBreakerMetrics,
  CircuitBreakerState
} from './patterns/circuit-breaker.js';

export type {
  RetryOptions,
  RetryResult
} from './patterns/retry-patterns.js';

// Common error handler interface
export interface ErrorHandler {
  handle(error: Error): Promise<void> | void;
  canHandle(error: Error): boolean;
}

// Error reporting interface
export interface ErrorReporter {
  report(error: Error, context?: Record<string, any>): Promise<void>;
}

// Error recovery interface
export interface ErrorRecovery {
  recover(error: Error): Promise<boolean>;
  canRecover(error: Error): boolean;
}

// Error context for tracking
export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

// Error metrics interface
export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError?: Date;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
}

// Enhanced error tracking interfaces

// Error aggregation and monitoring
export interface ErrorAggregation {
  timeWindow: number; // in milliseconds
  errorCount: number;
  uniqueErrors: number;
  topErrors: Array<{
    error: string;
    count: number;
    lastSeen: Date;
  }>;
  trends: {
    increasing: boolean;
    rate: number;
    period: string;
  };
}

// User-facing error reporting
export interface UserErrorReport {
  errorId: string;
  userMessage: string;
  technicalDetails?: string;
  recoveryOptions?: RecoveryOption[];
  feedback?: UserFeedback;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  automatic: boolean;
  priority: number;
}

export interface UserFeedback {
  rating?: number; // 1-5 scale
  comment?: string;
  contactInfo?: string;
  timestamp: Date;
}

// Error analytics and trends
export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  errorDistribution: Record<ErrorSeverity, number>;
  errorTrends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  topErrorTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  recoverySuccessRate: number;
  userImpact: {
    affectedUsers: number;
    sessionsWithErrors: number;
    errorPerSession: number;
  };
}

// Real-time error monitoring
export interface ErrorMonitor {
  start(): Promise<void>;
  stop(): Promise<void>;
  onError(callback: (error: BaseError, context: ErrorContext) => void): void;
  getMetrics(): ErrorMetrics;
  getAggregation(timeWindow?: number): ErrorAggregation;
}

// Automated error recovery
export interface ErrorRecoveryEngine {
  analyzeError(error: BaseError): Promise<RecoverySuggestion[]>;
  executeRecovery(suggestion: RecoverySuggestion): Promise<boolean>;
  learnFromOutcome(error: BaseError, success: boolean): void;
}

export interface RecoverySuggestion {
  id: string;
  description: string;
  confidence: number; // 0-1
  estimatedTime: number; // in milliseconds
  riskLevel: 'low' | 'medium' | 'high';
  action: () => Promise<void>;
  rollback?: () => Promise<void>;
}

// Error boundary with recovery
export interface ErrorBoundaryConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  showTechnicalDetails: boolean;
  enableFeedback: boolean;
  recoveryOptions: RecoveryOption[];
}

// Integration interfaces
export interface ErrorTrackingIntegration {
  name: string;
  initialize(config: Record<string, any>): Promise<void>;
  trackError(error: BaseError, context?: ErrorContext): Promise<void>;
  getAnalytics(): Promise<ErrorAnalytics>;
  shutdown(): Promise<void>;
}

// Error dashboard data
export interface ErrorDashboardData {
  summary: {
    totalErrors: number;
    activeErrors: number;
    resolvedErrors: number;
    errorRate: number;
  };
  recentErrors: UserErrorReport[];
  errorTrends: ErrorAnalytics['errorTrends'];
  topIssues: Array<{
    error: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    impact: 'high' | 'medium' | 'low';
  }>;
  recoveryStats: {
    successRate: number;
    averageRecoveryTime: number;
    mostEffectiveStrategies: string[];
  };
}
