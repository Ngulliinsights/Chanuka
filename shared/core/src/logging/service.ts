import { Logger } from './logger';
import type { LogContext, LoggerOptions, LogLevel } from './types';
import { Event, eventSchema } from './schemas';
import { LogRotationManager } from './rotation';
import { telemetryAggregator } from './telemetry';
import path from 'path';
import { ZodError } from 'zod';
import { logger } from '../../shared/core/src/utils/logger';

/**
 * Unified Logging Service
 * 
 * Central orchestrator for all logging operations across the core module.
 * This service acts as the single source of truth for logging configuration,
 * context management, and ensures consistent logging patterns throughout
 * the entire application.
 * 
 * Key Design Principles:
 * - Singleton pattern ensures unified configuration
 * - Module-specific loggers with inherited context
 * - Performance monitoring integration
 * - Automatic context merging and enrichment
 * - Environment-aware configuration
 */
class LoggingService {
  private static instance: LoggingService;
  private readonly logger: Logger;
  private readonly rotationManager: LogRotationManager;
  
  // Context management for persistent module-level information
  private readonly contextMap: Map<string, LogContext> = new Map();
  
  // Module logger cache to prevent recreation
  private readonly moduleLoggers: Map<string, Logger> = new Map();
  
  // Configuration state
  private readonly config: LoggerOptions;

  private constructor(options: LoggerOptions = {}) {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    
    // Establish base configuration with intelligent defaults
    this.config = {
      name: 'core',
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      pretty: process.env.NODE_ENV === 'development',
      redactPaths: [],
      asyncTransport: false,
      maxFileSize: '10MB',
      maxFiles: 5,
      enableMetrics: true,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ...options
    };

    // Initialize log rotation
    this.rotationManager = LogRotationManager.getInstance(logDir);

    // Initialize the root logger with our configuration
    this.logger = new Logger(this.config);
    
    // Register shutdown handler to ensure proper cleanup
    this.registerShutdownHandlers();
  }

  /**
   * Singleton accessor with lazy initialization
   * 
   * This ensures that all parts of the core module share the same
   * logging configuration and context, preventing fragmentation
   * of logging behavior across different utilities.
   */
  static getInstance(options?: LoggerOptions): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService(options);
    }
    return LoggingService.instance;
  }

  /**
   * Factory method for module-specific loggers
   * 
   * Creates or returns a cached logger instance for a specific module.
   * Each module logger inherits the base configuration but adds
   * module-specific context automatically to all log messages.
   * 
   * @param module - The module name (e.g., 'auth', 'database', 'api')
   * @returns A logger instance configured for the specific module
   */
  getLogger(module: string): Logger {
    // Return cached logger if it exists
    if (this.moduleLoggers.has(module)) {
      return this.moduleLoggers.get(module)!;
    }

    // Create new module logger with inherited context
    const moduleLogger = this.logger.child({ 
      module,
      // Add any persistent context for this module
      ...this.contextMap.get(module)
    });

    // Cache the logger for future use
    this.moduleLoggers.set(module, moduleLogger);
    return moduleLogger;
  }

  /**
   * Register persistent context for a module
   * 
   * This allows modules to set context information that will be
   * automatically included in all log messages from that module.
   * Useful for things like service versions, database connections,
   * or other module-specific metadata.
   */
  registerContext(module: string, context: LogContext): void {
    this.contextMap.set(module, context);
    
    // If a logger already exists for this module, we need to update it
    if (this.moduleLoggers.has(module)) {
      const updatedLogger = this.logger.child({ 
        module, 
        ...context 
      });
      this.moduleLoggers.set(module, updatedLogger);
    }
  }

  /**
   * Update context for an existing module
   * 
   * Allows modules to dynamically update their persistent context
   * without losing existing context data.
   */
  updateContext(module: string, contextUpdate: Partial<LogContext>): void {
    const existingContext = this.contextMap.get(module) || {};
    const mergedContext = { ...existingContext, ...contextUpdate };
    this.registerContext(module, mergedContext);
  }

  /**
   * Clear context for a module
   * 
   * Useful for cleanup or when module context is no longer relevant
   */
  clearContext(module: string): void {
    this.contextMap.delete(module);
    this.moduleLoggers.delete(module);
  }

  /**
   * Centralized logging methods with automatic context enrichment
   * 
   * These methods provide a convenient interface for logging at the
   * service level while automatically merging module-specific context
   * with message-specific context.
   */
  
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    // Enrich error context with stack trace and error details
    const errorContext = error ? {
      errorDetails: {
        type: error.name,
        description: error.message,
        stackTrace: error.stack
      }
    } : {};
    
    this.log('error', message, { ...context, ...errorContext });
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Internal logging method with context merging logic
   * 
   * This method handles the complex task of merging different
   * context sources in the correct priority order:
   * 1. Base service context (lowest priority)
   * 2. Module-specific persistent context
   * 3. Message-specific context (highest priority)
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Extract module context if specified
    const moduleContext = context?.module 
      ? this.contextMap.get(context.module) 
      : undefined;
    
    // Merge contexts in priority order
    const mergedContext = { 
      ...moduleContext, 
      ...context,
      // Add service-level metadata
      timestamp: new Date().toISOString(),
      service: 'core'
    };

    try {
      // Map fatal to error and trace to debug for logger compatibility
      const logLevel = level === 'fatal' ? 'error' : 
                      level === 'trace' ? 'debug' : level;

      // Execute the log operation using appropriate method
      switch (logLevel) {
        case 'error':
          this.logger.error(mergedContext, message);
          break;
        case 'warn':
          this.logger.warn(mergedContext, message);
          break;
        case 'debug':
          this.logger.debug(mergedContext, message);
          break;
        case 'info':
        default:
          this.logger.info(mergedContext, message);
      }

      // Create telemetry event based on log type
      const event: Event = {
        type: 'business',
        level: logLevel,
        message,
        module: context?.module || 'app',
        data: {
          action: level,
          entityType: 'log',
          entityId: new Date().getTime().toString(),
          metadata: mergedContext
        },
        timestamp: new Date()
      };

      try {
        // Validate and record event
        const validatedEvent = eventSchema.parse(event);
        telemetryAggregator.recordEvent(validatedEvent);
      } catch (error) {
        // Silently handle validation errors for telemetry
        console.warn('Telemetry validation failed:', error);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('Invalid event structure:', { component: 'Chanuka' }, error.errors);
      }
      // Still try to log the original message
      switch (level) {
        case 'error':
          this.logger.error(mergedContext, message);
          break;
        case 'warn':
          this.logger.warn(mergedContext, message);
          break;
        case 'debug':
          this.logger.debug(mergedContext, message);
          break;
        case 'info':
        default:
          this.logger.info(mergedContext, message);
      }
    }
  }

  /**
   * Performance monitoring utilities
   * 
   * These methods provide built-in performance tracking capabilities
   * that integrate seamlessly with the logging system.
   */
  
  /**
   * Create a high-resolution timer for performance monitoring
   * 
   * Returns a function that, when called, returns the elapsed time
   * in milliseconds with nanosecond precision.
   */
  startTimer(operation: string, context?: LogContext): () => number {
    const start = process.hrtime.bigint();
    
    // Log the start of the operation
    this.debug(`Starting operation: ${operation}`, {
      ...context,
      phase: 'start',
      operation
    });
    
    return () => {
      const end = process.hrtime.bigint();
      const durationNs = end - start;
      const duration = Number(durationNs) / 1e6; // Convert to milliseconds
      
      return duration;
    };
  }

  /**
   * Wrap an operation with automatic performance logging
   * 
   * This method provides a clean way to monitor the performance
   * of async operations while maintaining proper error handling
   * and logging consistency.
   */
  async logOperation<T>(
    operation: string, 
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const endTimer = this.startTimer(operation, context);
    const operationContext = { ...context, operation };

    try {
      // Execute the operation
      const result = await fn();
      
      // Log successful completion
      const duration = endTimer();
      this.info(`Operation completed successfully: ${operation}`, {
        ...operationContext,
        duration,
        success: true,
        phase: 'complete'
      });
      
      return result;
    } catch (error) {
      // Log operation failure
      const duration = endTimer();
      this.error(`Operation failed: ${operation}`, error as Error, {
        ...operationContext,
        duration,
        success: false,
        phase: 'error'
      });
      
      // Re-throw to maintain error propagation
      throw error;
    }
  }

  /**
   * Create a performance monitoring decorator for methods
   * 
   * This utility can be used to automatically wrap class methods
   * with performance monitoring and logging.
   */
  createPerformanceDecorator(defaultContext?: LogContext) {
    const loggingService = this;
    return (operation?: string) => {
      return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;
        const operationName = operation || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: any[]) {
          return loggingService.logOperation(
            operationName,
            () => originalMethod.apply(this, args),
            { ...defaultContext, method: propertyKey, class: target.constructor.name }
          );
        };

        return descriptor;
      };
    };
  }

  /**
   * Health check and diagnostics
   * 
   * Provides introspection into the logging service state
   * for debugging and monitoring purposes.
   */
  getHealthStatus() {
    return {
      config: this.config,
      registeredModules: Array.from(this.contextMap.keys()),
      activeLoggers: Array.from(this.moduleLoggers.keys()),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Graceful shutdown handling
   * 
   * Ensures that all pending log operations are completed
   * before the application terminates.
   */
  private registerShutdownHandlers(): void {
    const shutdown = async () => {
      this.info('Logging service shutting down gracefully');
      // Add any necessary cleanup logic here
      // For example, flushing buffered logs, closing file handles, etc.
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  }

  /**
   * Dynamic configuration updates
   * 
   * Allows runtime updates to logging configuration
   * without requiring service restart.
   */
  updateLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
    this.info(`Log level updated to: ${level}`, { 
      previousLevel: this.config.level,
      newLevel: level 
    });
  }
}

// Export singleton instance for immediate use
export const loggingService = LoggingService.getInstance();

// Export the class type for dependency injection or testing
export type { LoggingService };

// Convenience exports for common use cases
export const createModuleLogger = (module: string) => loggingService.getLogger(module);
export const logOperation = (operation: string, fn: () => Promise<any>, context?: LogContext) => 
  loggingService.logOperation(operation, fn, context);
export const startTimer = (operation: string, context?: LogContext) => 
  loggingService.startTimer(operation, context);

// Export for external configuration
export const configureLogging = (options: LoggerOptions) => 
  LoggingService.getInstance(options);






