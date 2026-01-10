/**
 * Service Architecture Error Middleware
 *
 * Handles API service error patterns with response transformation, error
 * normalization, and service-specific recovery strategies.
 */

import { AppError, RecoveryStrategy } from '../types';
import {
  ErrorDomain,
  ErrorSeverity,
  ErrorReporter,
  ErrorTransformer,
  RecoveryAction,
  coreErrorHandler,
  ErrorAnalyticsService,
} from '../index';

/**
 * Service architecture error codes
 */
export enum ServiceErrorCode {
  API_ERROR = 'API_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATA_TRANSFORMATION_ERROR = 'DATA_TRANSFORMATION_ERROR',
  RESPONSE_PARSING_ERROR = 'RESPONSE_PARSING_ERROR',
}

/**
 * Service error context
 */
interface ServiceErrorContext {
  serviceName?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  contentType?: string;
  userAgent?: string;
  correlationId?: string;
  retryAttempt?: number;
  transformed?: boolean;
  originalError?: unknown;
  responseHeaders?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Service middleware configuration
 */
interface ServiceMiddlewareConfig {
  enableResponseTransformation: boolean;
  enableErrorNormalization: boolean;
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  maxResponseSize: number;
  timeoutThreshold: number;
  enableCorrelationTracking: boolean;
  enablePerformanceMonitoring: boolean;
  normalizeExternalErrors: boolean;
}

/**
 * Response Transformer
 */
class ResponseTransformer {
  private transformers = new Map<string, (response: unknown) => unknown>();

  registerTransformer(serviceName: string, transformer: (response: unknown) => unknown): void {
    this.transformers.set(serviceName, transformer);
  }

  transform(serviceName: string, response: unknown): unknown {
    const transformer = this.transformers.get(serviceName);
    if (transformer) {
      try {
        return transformer(response);
      } catch (error) {
        throw new AppError(
          `Response transformation failed for service: ${serviceName}`,
          ServiceErrorCode.DATA_TRANSFORMATION_ERROR,
          ErrorDomain.NETWORK,
          ErrorSeverity.MEDIUM,
          {
            context: { serviceName, originalResponse: response },
            cause: error as Error,
          }
        );
      }
    }
    return response;
  }
}

/**
 * Error Normalizer
 */
class ErrorNormalizer {
  private normalizers = new Map<string, (error: unknown) => AppError>();

  registerNormalizer(serviceName: string, normalizer: (error: unknown) => AppError): void {
    this.normalizers.set(serviceName, normalizer);
  }

  normalize(serviceName: string, error: unknown, context: ServiceErrorContext): AppError {
    const normalizer = this.normalizers.get(serviceName);
    if (normalizer) {
      try {
        return normalizer(error);
      } catch (normalizationError) {
        // Fallback to default normalization
        return this.defaultNormalize(error, context);
      }
    }
    return this.defaultNormalize(error, context);
  }

  private defaultNormalize(error: unknown, context: ServiceErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Response) {
      return this.normalizeHttpError(error, context);
    }

    if (error instanceof Error) {
      return this.normalizeGenericError(error, context);
    }

    return new AppError(
      'Unknown service error occurred',
      ServiceErrorCode.API_ERROR,
      ErrorDomain.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        context,
        details: { originalError: error },
      }
    );
  }

  private normalizeHttpError(response: Response, context: ServiceErrorContext): AppError {
    const statusCode = response.status;
    let errorCode = ServiceErrorCode.HTTP_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let message = `HTTP ${statusCode}: ${response.statusText}`;

    // Determine specific error type based on status code
    if (statusCode === 401) {
      errorCode = ServiceErrorCode.AUTHENTICATION_ERROR;
      severity = ErrorSeverity.HIGH;
      message = 'Authentication required';
    } else if (statusCode === 403) {
      errorCode = ServiceErrorCode.AUTHORIZATION_ERROR;
      severity = ErrorSeverity.HIGH;
      message = 'Access forbidden';
    } else if (statusCode === 400) {
      errorCode = ServiceErrorCode.VALIDATION_ERROR;
      message = 'Bad request';
    } else if (statusCode === 404) {
      errorCode = ServiceErrorCode.BUSINESS_LOGIC_ERROR;
      message = 'Resource not found';
    } else if (statusCode >= 500) {
      errorCode = ServiceErrorCode.EXTERNAL_SERVICE_ERROR;
      severity = ErrorSeverity.HIGH;
      message = 'Server error';
    }

    return new AppError(
      message,
      errorCode,
      ErrorDomain.NETWORK,
      severity,
      {
        context: {
          ...context,
          statusCode,
        },
        recoverable: statusCode >= 500 || statusCode === 408 || statusCode === 429,
        retryable: statusCode >= 500 || statusCode === 408 || statusCode === 429,
      }
    );
  }

  private normalizeGenericError(error: Error, context: ServiceErrorContext): AppError {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('network')) {
      return new AppError(
        error.message,
        ServiceErrorCode.NETWORK_ERROR,
        ErrorDomain.NETWORK,
        ErrorSeverity.MEDIUM,
        {
          context,
          cause: error,
          recoverable: true,
          retryable: true,
        }
      );
    }

    if (message.includes('json') || message.includes('parse')) {
      return new AppError(
        'Response parsing failed',
        ServiceErrorCode.RESPONSE_PARSING_ERROR,
        ErrorDomain.NETWORK,
        ErrorSeverity.MEDIUM,
        {
          context,
          cause: error,
          recoverable: true,
          retryable: false,
        }
      );
    }

    return new AppError(
      error.message,
      ServiceErrorCode.API_ERROR,
      ErrorDomain.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        context,
        cause: error,
        recoverable: true,
        retryable: false,
      }
    );
  }
}

/**
 * Service Architecture Error Middleware
 *
 * Handles API service errors with response transformation, error normalization,
 * and service-specific recovery strategies.
 */
export class ServiceErrorMiddleware implements ErrorReporter, ErrorTransformer {
  private config: ServiceMiddlewareConfig;
  private analyticsService: ErrorAnalyticsService;
  private responseTransformer = new ResponseTransformer();
  private errorNormalizer = new ErrorNormalizer();
  private serviceMetrics = new Map<string, ServiceErrorContext>();
  private correlationTracker = new Map<string, ServiceErrorContext>();

  constructor(config: Partial<ServiceMiddlewareConfig> = {}) {
    this.config = {
      enableResponseTransformation: true,
      enableErrorNormalization: true,
      enableRequestLogging: false,
      enableResponseLogging: false,
      maxResponseSize: 10 * 1024 * 1024, // 10MB
      timeoutThreshold: 30000, // 30 seconds
      enableCorrelationTracking: true,
      enablePerformanceMonitoring: true,
      normalizeExternalErrors: true,
      ...config,
    };

    this.analyticsService = ErrorAnalyticsService.getInstance();

    // Register with core error handler
    coreErrorHandler.addReporter(this);
  }

  /**
   * Execute service request with middleware processing
   */
  async executeServiceRequest<T>(
    serviceName: string,
    requestFn: () => Promise<T>,
    options: {
      timeout?: number;
      correlationId?: string;
      skipTransformation?: boolean;
      skipNormalization?: boolean;
    } = {}
  ): Promise<T> {
    const {
      timeout = this.config.timeoutThreshold,
      correlationId = crypto.randomUUID?.() || Math.random().toString(36),
      skipTransformation = false,
      skipNormalization = false,
    } = options;

    const startTime = Date.now();
    const context: ServiceErrorContext = {
      serviceName,
      correlationId,
      requestId: correlationId,
    };

    if (this.config.enableCorrelationTracking) {
      this.correlationTracker.set(correlationId, context);
    }

    try {
      // Execute request with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      const response = await Promise.race([requestFn(), timeoutPromise]);

      // Transform response if enabled
      const transformedResponse = skipTransformation || !this.config.enableResponseTransformation
        ? response
        : this.responseTransformer.transform(serviceName, response);

      // Update context with response metrics
      context.responseTime = Date.now() - startTime;
      context.transformed = !skipTransformation && this.config.enableResponseTransformation;

      // Log successful request if enabled
      if (this.config.enableResponseLogging) {
        this.logServiceRequest(context, 'success');
      }

      return transformedResponse as T;

    } catch (error) {
      context.responseTime = Date.now() - startTime;

      // Normalize error if enabled
      const normalizedError = skipNormalization || !this.config.enableErrorNormalization
        ? this.createGenericServiceError(error as Error, context)
        : this.errorNormalizer.normalize(serviceName, error, context);

      // Log failed request if enabled
      if (this.config.enableRequestLogging) {
        this.logServiceRequest(context, 'error', normalizedError);
      }

      await coreErrorHandler.handleError(normalizedError);
      throw normalizedError;
    } finally {
      // Update metrics
      this.updateServiceMetrics(context);

      // Cleanup correlation tracking
      if (this.config.enableCorrelationTracking) {
        setTimeout(() => {
          this.correlationTracker.delete(correlationId);
        }, 60000); // Keep for 1 minute
      }
    }
  }

  /**
   * Report service errors with enhanced context
   */
  async report(error: AppError): Promise<void> {
    if (!this.isServiceError(error)) {
      return;
    }

    const serviceContext = this.extractServiceContext(error);

    // Monitor service performance
    if (this.config.enablePerformanceMonitoring) {
      await this.monitorServicePerformance(error, serviceContext);
    }

    // Detect service degradation
    await this.detectServiceDegradation(error, serviceContext);

    // Analytics tracking
    await this.trackServiceAnalytics(error, serviceContext);
  }

  /**
   * Transform service errors with recovery strategies
   */
  transform(error: AppError): AppError {
    if (!this.isServiceError(error)) {
      return error;
    }

    const serviceContext = this.extractServiceContext(error);
    const recoveryStrategies = this.getServiceRecoveryStrategies(error, serviceContext);

    return new AppError(
      error.message,
      error.code,
      error.type,
      error.severity,
      {
        ...error,
        context: {
          ...error.context,
          ...serviceContext,
        },
        recoveryStrategies,
        recoverable: this.isRecoverableServiceError(error),
        retryable: this.isRetryableServiceError(error),
      }
    );
  }

  /**
   * Check if error is service-related
   */
  private isServiceError(error: AppError): boolean {
    return (
      error.type === ErrorDomain.NETWORK ||
      Object.values(ServiceErrorCode).includes(error.code as ServiceErrorCode) ||
      error.message.toLowerCase().includes('api') ||
      error.message.toLowerCase().includes('service') ||
      error.message.toLowerCase().includes('http') ||
      !!error.context?.serviceName ||
      !!error.context?.endpoint
    );
  }

  /**
   * Extract service-specific context from error
   */
  private extractServiceContext(error: AppError): ServiceErrorContext {
    const context: ServiceErrorContext = {
      serviceName: error.context?.serviceName as string,
      endpoint: error.context?.endpoint as string,
      method: error.context?.method as string,
      statusCode: error.context?.statusCode as number,
      requestId: error.context?.requestId as string,
      responseTime: error.context?.responseTime as number,
      requestSize: error.context?.requestSize as number,
      responseSize: error.context?.responseSize as number,
      contentType: error.context?.contentType as string,
      userAgent: error.context?.userAgent as string,
      correlationId: error.context?.correlationId as string,
      retryAttempt: error.context?.retryAttempt as number,
      transformed: error.context?.transformed as boolean,
      originalError: error.context?.originalError,
      responseHeaders: error.context?.responseHeaders as Record<string, string>,
      requestHeaders: error.context?.requestHeaders as Record<string, string>,
    };

    return context;
  }

  /**
   * Create generic service error
   */
  private createGenericServiceError(error: Error, context: ServiceErrorContext): AppError {
    return new AppError(
      error.message,
      ServiceErrorCode.API_ERROR,
      ErrorDomain.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        context,
        cause: error,
        recoverable: true,
        retryable: false,
      }
    );
  }

  /**
   * Get recovery strategies for service errors
   */
  private getServiceRecoveryStrategies(
    error: AppError,
    context: ServiceErrorContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (error.code) {
      case ServiceErrorCode.NETWORK_ERROR:
      case ServiceErrorCode.TIMEOUT_ERROR:
        strategies.push({
          id: 'service-network-retry',
          type: RecoveryAction.RETRY,
          name: 'Network Retry',
          description: 'Retry the network request',
          automatic: true,
          priority: 1,
          maxRetries: 3,
          asyncAction: async () => {
            // Implementation would retry the request
            return true; // Placeholder
          },
        });
        break;

      case ServiceErrorCode.HTTP_ERROR:
        if (context.statusCode && context.statusCode >= 500) {
          strategies.push({
            id: 'service-server-retry',
            type: RecoveryAction.RETRY,
            name: 'Server Error Retry',
            description: 'Retry after server error',
            automatic: true,
            priority: 1,
            maxRetries: 2,
          });
        }
        break;

      case ServiceErrorCode.AUTHENTICATION_ERROR:
        strategies.push({
          id: 'service-auth-refresh',
          type: RecoveryAction.RETRY,
          name: 'Refresh Authentication',
          description: 'Attempt to refresh authentication and retry',
          automatic: true,
          priority: 1,
          maxRetries: 1,
        });
        break;

      case ServiceErrorCode.RESPONSE_PARSING_ERROR:
        strategies.push({
          id: 'service-response-retry',
          type: RecoveryAction.RETRY,
          name: 'Response Retry',
          description: 'Retry request with different parsing strategy',
          automatic: true,
          priority: 2,
          maxRetries: 1,
        });
        break;
    }

    return strategies;
  }

  /**
   * Check if service error is recoverable
   */
  private isRecoverableServiceError(error: AppError): boolean {
    const recoverableCodes = [
      ServiceErrorCode.NETWORK_ERROR,
      ServiceErrorCode.TIMEOUT_ERROR,
      ServiceErrorCode.HTTP_ERROR,
      ServiceErrorCode.AUTHENTICATION_ERROR,
      ServiceErrorCode.RESPONSE_PARSING_ERROR,
    ];

    return recoverableCodes.includes(error.code as ServiceErrorCode);
  }

  /**
   * Check if service error is retryable
   */
  private isRetryableServiceError(error: AppError): boolean {
    const retryableCodes = [
      ServiceErrorCode.NETWORK_ERROR,
      ServiceErrorCode.TIMEOUT_ERROR,
      ServiceErrorCode.HTTP_ERROR,
      ServiceErrorCode.AUTHENTICATION_ERROR,
    ];

    return retryableCodes.includes(error.code as ServiceErrorCode);
  }

  /**
   * Update service metrics
   */
  private updateServiceMetrics(context: ServiceErrorContext): void {
    if (!context.serviceName) return;

    const existing = this.serviceMetrics.get(context.serviceName) || {};
    this.serviceMetrics.set(context.serviceName, {
      ...existing,
      ...context,
    });
  }

  /**
   * Monitor service performance
   */
  private async monitorServicePerformance(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    if (!context.responseTime || !context.serviceName) return;

    // Check for slow responses
    if (context.responseTime > this.config.timeoutThreshold) {
      const perfError = new AppError(
        `Slow service response from: ${context.serviceName}`,
        ServiceErrorCode.TIMEOUT_ERROR,
        ErrorDomain.NETWORK,
        ErrorSeverity.MEDIUM,
        {
          context,
        }
      );

      await coreErrorHandler.handleError(perfError);
    }
  }

  /**
   * Detect service degradation
   */
  private async detectServiceDegradation(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    if (!context.serviceName) return;

    // Simple degradation detection based on error frequency
    const serviceErrors = Array.from(this.serviceMetrics.values())
      .filter(m => m.serviceName === context.serviceName && m.responseTime);

    const errorRate = serviceErrors.length > 0 ? 1 / serviceErrors.length : 0;

    if (errorRate > 0.5) { // More than 50% errors
      const degradationError = new AppError(
        `Service degradation detected for: ${context.serviceName}`,
        ServiceErrorCode.EXTERNAL_SERVICE_ERROR,
        ErrorDomain.NETWORK,
        ErrorSeverity.HIGH,
        {
          context: {
            ...context,
            errorRate,
          },
        }
      );

      await coreErrorHandler.handleError(degradationError);
    }
  }

  /**
   * Track service analytics
   */
  private async trackServiceAnalytics(
    error: AppError,
    context: ServiceErrorContext
  ): Promise<void> {
    await this.analyticsService.track(error);
  }

  /**
   * Log service request
   */
  private logServiceRequest(
    context: ServiceErrorContext,
    status: 'success' | 'error',
    error?: AppError
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      serviceName: context.serviceName,
      endpoint: context.endpoint,
      method: context.method,
      status,
      responseTime: context.responseTime,
      statusCode: context.statusCode,
      error: error ? {
        code: error.code,
        message: error.message,
        severity: error.severity,
      } : undefined,
    };

    console.log(`[Service ${status.toUpperCase()}]`, logEntry);
  }

  /**
   * Register response transformer for a service
   */
  registerResponseTransformer(serviceName: string, transformer: (response: unknown) => unknown): void {
    this.responseTransformer.registerTransformer(serviceName, transformer);
  }

  /**
   * Register error normalizer for a service
   */
  registerErrorNormalizer(serviceName: string, normalizer: (error: unknown) => AppError): void {
    this.errorNormalizer.registerNormalizer(serviceName, normalizer);
  }

  /**
   * Get service metrics
   */
  getServiceMetrics() {
    return {
      services: Object.fromEntries(this.serviceMetrics),
      activeCorrelations: this.correlationTracker.size,
    };
  }

  /**
   * Get correlation context
   */
  getCorrelationContext(correlationId: string): ServiceErrorContext | undefined {
    return this.correlationTracker.get(correlationId);
  }

  /**
   * Reset service tracking
   */
  resetTracking(): void {
    this.serviceMetrics.clear();
    this.correlationTracker.clear();
  }
}

// Export singleton instance
export const serviceErrorMiddleware = new ServiceErrorMiddleware();

// Export types and classes
export type { ServiceErrorContext, ServiceMiddlewareConfig };
export { ResponseTransformer, ErrorNormalizer };
