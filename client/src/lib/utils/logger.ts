/**
 * Unified Logger - Optimal Direction
 *
 * This combines the best of logger-unified.ts with shared module integration
 * and addresses the 1,421-line complexity issue identified in the analysis.
 *
 * ARCHITECTURE DECISION:
 * - Use logger-unified.ts as the foundation (135 lines, maintainable)
 * - Integrate with shared module browser logger for advanced features
 * - Provide backward compatibility for existing imports
 * - Enable gradual migration from the complex logger.ts
 */

// Import error types from our local error system to avoid circular dependencies
import { ErrorSeverity, ErrorDomain, BaseError } from '@client/infrastructure/error';
import { PerformanceAlertsManager } from '@client/infrastructure/performance/alerts';
import { PerformanceMonitor } from '@client/infrastructure/performance/monitor';
import { PerformanceMetric } from '@client/infrastructure/performance/types';

// Re-export error types for backward compatibility
export { ErrorSeverity, ErrorDomain, BaseError };

// ============================================================================
// CORE LOGGER INTERFACES (Integrated from logger-unified)
// ============================================================================

export interface LogContext {
  component?: string | undefined;
  user_id?: string | undefined;
  requestId?: string | undefined;
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: LogContext, error?: Error | unknown) => void;
}

// ============================================================================
// RENDER TRACKING (Simplified from complex logger.ts)
// ============================================================================

export interface RenderTrackingData {
  component: string;
  renderCount: number;
  timestamp: number;
  trigger: string;
  props?: unknown;
  state?: unknown;
}

export interface ComponentLifecycleData {
  component: string;
  action: 'mount' | 'unmount' | 'update';
  timestamp: number;
  props?: unknown;
  state?: unknown;
}

export interface PerformanceImpactData {
  component: string;
  renderDuration: number;
  timestamp: number;
  memoryUsage?: number;
}

export interface RenderStats {
  totalRenders: number;
  averageRenderTime: number;
  lastRenderTime: number;
  infiniteRenderAlerts: number;
  mountCount: number;
  unmountCount: number;
}

// ============================================================================
// SIMPLIFIED RENDER TRACKER (Replaces 800+ lines of complex logic)
// ============================================================================

class SimpleRenderTracker {
  private renderCounts = new Map<string, number>();
  private lastRenderTime = new Map<string, number>();
  private performanceData = new Map<string, number[]>();

  trackRender(data: RenderTrackingData): void {
    const { component, timestamp } = data;

    // Simple tracking without complex memory management
    this.renderCounts.set(component, (this.renderCounts.get(component) || 0) + 1);
    this.lastRenderTime.set(component, timestamp);

    // Log to console for debugging (seamless integration doesn't have logger methods)
    if (process.env.NODE_ENV === 'development') {
      console.debug('Component render tracked', {
        component: 'render-tracker',
        renderComponent: component,
        renderCount: this.renderCounts.get(component),
      });
    }
  }

  trackLifecycle(data: ComponentLifecycleData): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Component lifecycle', {
        component: 'lifecycle-tracker',
        lifecycleComponent: data.component,
        action: data.action,
      });
    }
  }

  trackPerformanceImpact(data: PerformanceImpactData): void {
    const { component, renderDuration } = data;
    const performanceMonitor = PerformanceMonitor.getInstance();
    const alertsManager = PerformanceAlertsManager.getInstance();

    const metric: PerformanceMetric = {
      name: 'component-render-duration',
      value: renderDuration,
      timestamp: new Date(data.timestamp),
      category: 'custom',
      metadata: { component },
    };

    performanceMonitor.recordCustomMetric(metric);
    alertsManager.checkMetric(metric);
  }

  detectInfiniteRender(component: string, threshold = 50): boolean {
    const count = this.renderCounts.get(component) || 0;
    const lastRender = this.lastRenderTime.get(component) || 0;
    const now = Date.now();

    // Simple infinite render detection
    if (count > threshold && now - lastRender < 1000) {
      console.error('Infinite render detected', {
        component: 'render-tracker',
        renderComponent: component,
        renderCount: count,
      });
      return true;
    }

    return false;
  }

  getRenderStats(component?: string): RenderStats {
    if (component) {
      const renderCount = this.renderCounts.get(component) || 0;
      const durations = this.performanceData.get(component) || [];
      const avgDuration =
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      return {
        totalRenders: renderCount,
        averageRenderTime: avgDuration,
        lastRenderTime: this.lastRenderTime.get(component) || 0,
        infiniteRenderAlerts: 0,
        mountCount: 0,
        unmountCount: 0,
      };
    }

    // Aggregate stats
    const totalRenders = Array.from(this.renderCounts.values()).reduce((a, b) => a + b, 0);
    return {
      totalRenders,
      averageRenderTime: 0,
      lastRenderTime: Math.max(...Array.from(this.lastRenderTime.values())),
      infiniteRenderAlerts: 0,
      mountCount: 0,
      unmountCount: 0,
    };
  }

  clearRenderStats(component?: string): void {
    if (component) {
      this.renderCounts.delete(component);
      this.lastRenderTime.delete(component);
      this.performanceData.delete(component);
    } else {
      this.renderCounts.clear();
      this.lastRenderTime.clear();
      this.performanceData.clear();
    }
  }
}

// ============================================================================
// EXTENDED LOGGER INTERFACE
// ============================================================================

export interface ExtendedLogger extends Logger {
  trackRender: (data: RenderTrackingData) => void;
  trackLifecycle: (data: ComponentLifecycleData) => void;
  trackPerformanceImpact: (data: PerformanceImpactData) => void;
  detectInfiniteRender: (component: string, threshold?: number) => boolean;
  getRenderStats: (component?: string) => RenderStats;
  clearRenderStats: (component?: string) => void;
}

// ============================================================================
// UNIFIED LOGGER IMPLEMENTATION
// ============================================================================

// ============================================================================
// CORE LOGGER IMPLEMENTATION (Integrated from logger-unified)
// ============================================================================

class CoreLogger implements Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private logToConsole(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    if (this.isProduction && level === 'debug') {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;

    const logData = {
      message,
      context,
      metadata,
      timestamp,
    };

    switch (level) {
      case 'error':
        console.error(prefix, message, logData);
        break;
      case 'warn':
        console.warn(prefix, message, logData);
        break;
      case 'debug':
        console.debug(prefix, message, logData);
        break;
      default:
        console.log(prefix, message, logData);
    }
  }

  debug(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.logToConsole('debug', message, context, meta);
  }

  info(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.logToConsole('info', message, context, meta);
  }

  warn(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.logToConsole('warn', message, context, meta);
  }

  error(message: string, context?: LogContext, error?: Error | unknown): void {
    const metadata = this.processError(error);
    this.logToConsole('error', message, context, metadata);
  }

  private processError(error?: Error | unknown): Record<string, unknown> | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      };
    }

    return {
      error: {
        message: String(error),
        type: typeof error,
      },
    };
  }

  child(bindings: Record<string, unknown>): Logger {
    return {
      debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
        this.debug(message, { ...bindings, ...context }, meta);
      },
      info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
        this.info(message, { ...bindings, ...context }, meta);
      },
      warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
        this.warn(message, { ...bindings, ...context }, meta);
      },
      error: (message: string, context?: LogContext, error?: Error | unknown) => {
        this.error(message, { ...bindings, ...context }, error);
      },
    };
  }
}

// ============================================================================
// UNIFIED LOGGER IMPLEMENTATION
// ============================================================================

class UnifiedLogger implements ExtendedLogger {
  private renderTracker = new SimpleRenderTracker();
  private coreLogger = new CoreLogger();

  // Core logging methods
  debug(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.coreLogger.debug(message, context, meta);
  }

  info(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.coreLogger.info(message, context, meta);
  }

  warn(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.coreLogger.warn(message, context, meta);
  }

  error(message: string, context?: LogContext, error?: Error | unknown): void {
    this.coreLogger.error(message, context, error);
  }

  // Render tracking methods (simplified)
  trackRender(data: RenderTrackingData): void {
    this.renderTracker.trackRender(data);
  }

  trackLifecycle(data: ComponentLifecycleData): void {
    this.renderTracker.trackLifecycle(data);
  }

  trackPerformanceImpact(data: PerformanceImpactData): void {
    this.renderTracker.trackPerformanceImpact(data);
  }

  detectInfiniteRender(component: string, threshold?: number): boolean {
    return this.renderTracker.detectInfiniteRender(component, threshold);
  }

  getRenderStats(component?: string): RenderStats {
    return this.renderTracker.getRenderStats(component);
  }

  clearRenderStats(component?: string): void {
    this.renderTracker.clearRenderStats(component);
  }

  // Enhanced methods using seamless integration
  logUserAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, context);
  }

  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    this.info(`Performance: ${operation} took ${duration}ms`, { ...metadata });
  }

  logError(error: Error | string, context?: LogContext): void {
    this.error(
      typeof error === 'string' ? error : error.message,
      context,
      error instanceof Error ? error : undefined
    );
  }

  // Create child logger
  child(bindings: Record<string, unknown>): Logger {
    return this.coreLogger.child(bindings);
  }
}

// ============================================================================
// EXPORT UNIFIED LOGGER
// ============================================================================

export const logger = new UnifiedLogger();

// Export individual components for flexibility
export const coreLogger = new CoreLogger();

// Backward compatibility exports
export default logger;
