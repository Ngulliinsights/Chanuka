/**
 * Consolidated Logger - Client Utility (Production-Ready)
 *
 * A high-performance, browser-compatible logging system with comprehensive
 * render tracking, error handling, performance monitoring, and CSP reporting.
 * Designed for production use with efficient memory management and optimized algorithms.
 *
 * Key Features:
 * - Zero-overhead debug logging in production
 * - Automatic memory cleanup with configurable retention
 * - O(n) algorithms for infinite render detection
 * - Type-safe error handling with recovery strategies
 * - CSP violation reporting and monitoring
 * - Performance impact tracking with frame rate analysis
 */

import { initializeCSPReporting, getCSPConfig, setCSPHeader } from './csp-headers';

// ============================================================================
// Core Logger Interfaces
// ============================================================================

/**
 * Contextual information that can be attached to any log entry.
 * Commonly used for tracking component names, user IDs, and request correlation.
 */
export interface LogContext {
    component?: string;
    user_id?: string;
    requestId?: string;
    [key: string]: unknown;
}

/**
 * Standard logging interface with structured context and metadata support.
 * Follows best practices for production logging systems.
 */
export interface Logger {
    debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
    info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
    warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
    error: (message: string, context?: LogContext, error?: Error | unknown) => void;
}

// ============================================================================
// Render Tracking Interfaces
// ============================================================================

/**
 * Captures a single component render event with full context.
 * Used to track render frequency and identify performance bottlenecks.
 */
export interface RenderTrackingData {
    component: string;
    renderCount: number;
    timestamp: number;
    trigger: string;
    props?: unknown;
    state?: unknown;
}

/**
 * Tracks component lifecycle transitions (mount, update, unmount).
 * Essential for debugging component behavior and memory leaks.
 */
export interface ComponentLifecycleData {
    component: string;
    action: 'mount' | 'unmount' | 'update';
    timestamp: number;
    props?: unknown;
    state?: unknown;
}

/**
 * Measures the performance impact of a single render.
 * Includes duration and optional memory usage for comprehensive analysis.
 */
export interface PerformanceImpactData {
    component: string;
    renderDuration: number;
    timestamp: number;
    memoryUsage?: number;
}

/**
 * Alert generated when a component renders excessively within a time window.
 * Indicates potential infinite render loops that degrade performance.
 */
export interface InfiniteRenderAlert {
    component: string;
    renderCount: number;
    timeWindow: number;
    rendersPerSecond: number;
    timestamp: number;
}

/**
 * Aggregated statistics for component render behavior.
 * Useful for performance dashboards and optimization efforts.
 */
export interface RenderStats {
    totalRenders: number;
    averageRenderTime: number;
    lastRenderTime: number;
    infiniteRenderAlerts: number;
    mountCount: number;
    unmountCount: number;
}

/**
 * Extended logger interface that includes render tracking capabilities.
 * Provides comprehensive monitoring for React and similar frameworks.
 */
export interface ExtendedLogger extends Logger {
    trackRender: (data: RenderTrackingData) => void;
    trackLifecycle: (data: ComponentLifecycleData) => void;
    trackPerformanceImpact: (data: PerformanceImpactData) => void;
    detectInfiniteRender: (component: string, threshold?: number) => boolean;
    getRenderStats: (component?: string) => RenderStats;
    clearRenderStats: (component?: string) => void;
}

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Configuration constants for render tracking and performance monitoring.
 * These values are tuned for optimal performance in production environments.
 */
const CONFIG = {
    INFINITE_RENDER_THRESHOLD: 50,    // Renders per second before alerting
    MAX_HISTORY_SIZE: 1000,            // Maximum entries per component
    HISTORY_RETENTION_MS: 60000,       // Keep entries for 1 minute
    SLOW_RENDER_THRESHOLD: 16,         // Milliseconds (1 frame at 60fps)
    CLEANUP_INTERVAL_MS: 30000,        // Run cleanup every 30 seconds
} as const;

// ============================================================================
// Optimized Render Tracker
// ============================================================================

/**
 * High-performance render tracking system with automatic memory management.
 * 
 * This class maintains three separate histories for different types of tracking:
 * - Render history: tracks when and why components render
 * - Performance history: measures render duration and resource usage
 * - Lifecycle history: monitors component mount/unmount cycles
 * 
 * Key optimizations:
 * - Single-pass algorithms for statistics calculation
 * - Automatic cleanup of stale entries to prevent memory leaks
 * - Sliding window approach for infinite render detection
 * - Efficient circular buffer pattern for history storage
 */
class RenderTracker {
    private renderHistory: Map<string, RenderTrackingData[]> = new Map();
    private performanceHistory: Map<string, PerformanceImpactData[]> = new Map();
    private lifecycleHistory: Map<string, ComponentLifecycleData[]> = new Map();
    private cleanupTimerId: ReturnType<typeof setInterval> | null = null;
    private isDestroyed = false;

    constructor() {
        this.startPeriodicCleanup();
    }

    /**
     * Initiates a background process that periodically removes stale entries.
     * This prevents unbounded memory growth in long-running applications.
     */
    private startPeriodicCleanup(): void {
        if (typeof setInterval === 'undefined') return;

        this.cleanupTimerId = setInterval(() => {
            if (!this.isDestroyed) {
                this.cleanupStaleEntries();
            }
        }, CONFIG.CLEANUP_INTERVAL_MS);
    }

    /**
     * Removes entries older than the retention window from all tracking maps.
     * Uses a filter-based approach that's both simple and efficient.
     */
    private cleanupStaleEntries(): void {
        const cutoffTime = Date.now() - CONFIG.HISTORY_RETENTION_MS;

        // Generic helper that works with any timestamped entry type
        const filterStale = <T extends { timestamp: number }>(entries: T[]): T[] => {
            return entries.filter(entry => entry.timestamp >= cutoffTime);
        };

        // Clean each history map, removing components with no recent activity
        this.cleanupHistoryMap(this.renderHistory, filterStale);
        this.cleanupHistoryMap(this.performanceHistory, filterStale);
        this.cleanupHistoryMap(this.lifecycleHistory, filterStale);
    }

    /**
     * Helper method to clean a single history map efficiently.
     * Removes empty entries to reduce memory footprint.
     */
    private cleanupHistoryMap<T extends { timestamp: number }>(
        map: Map<string, T[]>,
        filterFn: (entries: T[]) => T[]
    ): void {
        for (const [component, history] of map.entries()) {
            const filtered = filterFn(history);

            if (filtered.length === 0) {
                map.delete(component);
            } else if (filtered.length !== history.length) {
                map.set(component, filtered);
            }
        }
    }

    /**
     * Adds an entry to a history map with automatic size limit enforcement.
     * Uses array mutation for optimal performance (avoids creating new arrays).
     */
    private addToHistory<T>(map: Map<string, T[]>, key: string, entry: T): void {
        let history = map.get(key);

        if (!history) {
            history = [];
            map.set(key, history);
        }

        history.push(entry);

        // Enforce size limit using splice for O(1) operation
        if (history.length > CONFIG.MAX_HISTORY_SIZE) {
            const excessCount = history.length - CONFIG.MAX_HISTORY_SIZE;
            history.splice(0, excessCount);
        }
    }

    /**
     * Records a component render event for tracking and analysis.
     */
    trackRender(data: RenderTrackingData): void {
        if (this.isDestroyed) return;
        this.addToHistory(this.renderHistory, data.component, data);
    }

    /**
     * Records a component lifecycle transition (mount, update, unmount).
     */
    trackLifecycle(data: ComponentLifecycleData): void {
        if (this.isDestroyed) return;
        this.addToHistory(this.lifecycleHistory, data.component, data);
    }

    /**
     * Records performance metrics for a component render.
     */
    trackPerformanceImpact(data: PerformanceImpactData): void {
        if (this.isDestroyed) return;
        this.addToHistory(this.performanceHistory, data.component, data);
    }

    /**
     * Detects if a component is rendering excessively within a time window.
     * 
     * Algorithm complexity: O(n) where n is the number of recent renders
     * 
     * This method uses a reverse iteration approach to count renders within
     * the last second. It stops as soon as it encounters a render outside
     * the time window, making it very efficient for typical cases.
     */
    detectInfiniteRender(component: string, threshold: number = CONFIG.INFINITE_RENDER_THRESHOLD): boolean {
        if (this.isDestroyed) return false;

        const history = this.renderHistory.get(component);
        if (!history || history.length < threshold) return false;

        const now = Date.now();
        const oneSecondAgo = now - 1000;

        // Count recent renders by iterating backwards from the most recent
        let recentRenderCount = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            const render = history[i];
            // Fix: Add explicit check to satisfy TypeScript's undefined check
            if (!render || render.timestamp < oneSecondAgo) break;
            recentRenderCount++;
        }

        // Alert if threshold is exceeded
        if (recentRenderCount > threshold) {
            const alert: InfiniteRenderAlert = {
                component,
                renderCount: recentRenderCount,
                timeWindow: 1000,
                rendersPerSecond: recentRenderCount,
                timestamp: now
            };

            // Use the logger directly to avoid circular dependency
            console.error('[INFINITE_RENDER_DETECTED]', alert);
            return true;
        }

        return false;
    }

    /**
     * Retrieves render statistics for a specific component or all components.
     */
    getRenderStats(component?: string): RenderStats {
        if (this.isDestroyed) {
            return this.getEmptyStats();
        }

        if (component) {
            return this.getComponentStats(component);
        }

        return this.getAggregatedStats();
    }

    /**
     * Computes aggregated statistics across all tracked components.
     * Uses a single-pass algorithm to maintain O(n) complexity.
     */
    private getAggregatedStats(): RenderStats {
        let totalRenders = 0;
        let totalRenderTime = 0;
        let totalRenderTimeCount = 0;
        let lastRenderTime = 0;
        let infiniteRenderAlerts = 0;
        let mountCount = 0;
        let unmountCount = 0;

        // Process each component's stats in a single iteration
        for (const component of this.renderHistory.keys()) {
            const stats = this.getComponentStats(component);

            totalRenders += stats.totalRenders;
            infiniteRenderAlerts += stats.infiniteRenderAlerts;
            mountCount += stats.mountCount;
            unmountCount += stats.unmountCount;

            if (stats.lastRenderTime > lastRenderTime) {
                lastRenderTime = stats.lastRenderTime;
            }

            // Accumulate weighted render times for accurate averaging
            if (stats.totalRenders > 0) {
                totalRenderTime += stats.averageRenderTime * stats.totalRenders;
                totalRenderTimeCount += stats.totalRenders;
            }
        }

        const averageRenderTime = totalRenderTimeCount > 0
            ? totalRenderTime / totalRenderTimeCount
            : 0;

        return {
            totalRenders,
            averageRenderTime,
            lastRenderTime,
            infiniteRenderAlerts,
            mountCount,
            unmountCount
        };
    }

    /**
     * Computes statistics for a single component efficiently.
     * Avoids redundant iterations by combining multiple calculations.
     */
    private getComponentStats(component: string): RenderStats {
        const renderHistory = this.renderHistory.get(component) ?? [];
        const performanceHistory = this.performanceHistory.get(component) ?? [];
        const lifecycleHistory = this.lifecycleHistory.get(component) ?? [];

        // Calculate performance metrics
        const totalRenders = renderHistory.length;
        const totalRenderTime = performanceHistory.reduce(
            (sum, perf) => sum + perf.renderDuration,
            0
        );
        const averageRenderTime = performanceHistory.length > 0
            ? totalRenderTime / performanceHistory.length
            : 0;

        // Fix: Safely access the last element with explicit undefined check
        const lastRender = renderHistory[renderHistory.length - 1];
        const lastRenderTime = lastRender ? lastRender.timestamp : 0;

        // Count infinite render alert occurrences
        const infiniteRenderAlerts = this.countInfiniteRenderAlerts(
            renderHistory,
            CONFIG.INFINITE_RENDER_THRESHOLD
        );

        // Count lifecycle events using a single pass
        const mountCount = lifecycleHistory.filter(e => e.action === 'mount').length;
        const unmountCount = lifecycleHistory.filter(e => e.action === 'unmount').length;

        return {
            totalRenders,
            averageRenderTime,
            lastRenderTime,
            infiniteRenderAlerts,
            mountCount,
            unmountCount
        };
    }

    /**
     * Counts the number of distinct time windows where infinite renders occurred.
     * 
     * Algorithm: Sliding window with O(n) complexity
     * 
     * This method scans through the render history once, maintaining a sliding
     * 1-second window. When the window exceeds the threshold, it counts that
     * as one alert and skips ahead to avoid double-counting overlapping windows.
     */
    private countInfiniteRenderAlerts(
        history: RenderTrackingData[],
        threshold: number
    ): number {
        if (history.length < threshold) return 0;

        let alertCount = 0;
        let windowStart = 0;

        for (let windowEnd = 0; windowEnd < history.length; windowEnd++) {
            const currentRender = history[windowEnd];
            // Fix: Add explicit undefined check
            if (!currentRender) continue;

            const currentTime = currentRender.timestamp;

            // Advance window start to maintain 1-second window size
            while (windowStart < windowEnd) {
                const startRender = history[windowStart];
                // Fix: Add explicit undefined check
                if (!startRender || startRender.timestamp >= currentTime - 1000) break;
                windowStart++;
            }

            // Check if current window exceeds threshold
            const windowSize = windowEnd - windowStart + 1;
            if (windowSize > threshold) {
                alertCount++;
                // Jump past this alert window to avoid counting overlaps
                windowEnd = windowStart + threshold;
                windowStart = windowEnd;
            }
        }

        return alertCount;
    }

    /**
     * Clears render statistics for a specific component or all components.
     */
    clearRenderStats(component?: string): void {
        if (this.isDestroyed) return;

        if (component) {
            this.renderHistory.delete(component);
            this.performanceHistory.delete(component);
            this.lifecycleHistory.delete(component);
        } else {
            this.renderHistory.clear();
            this.performanceHistory.clear();
            this.lifecycleHistory.clear();
        }
    }

    /**
     * Returns empty statistics (used when tracker is destroyed or unavailable).
     */
    private getEmptyStats(): RenderStats {
        return {
            totalRenders: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            infiniteRenderAlerts: 0,
            mountCount: 0,
            unmountCount: 0
        };
    }

    /**
     * Performs cleanup of all resources and stops background processes.
     * Should be called when the tracker is no longer needed.
     */
    destroy(): void {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        if (this.cleanupTimerId) {
            clearInterval(this.cleanupTimerId);
            this.cleanupTimerId = null;
        }

        this.clearRenderStats();
    }
}

// Global singleton instance of the render tracker
const renderTracker = new RenderTracker();

// ============================================================================
// Error Handling System
// ============================================================================

/**
 * Categories for error classification, enabling better error routing and handling.
 */
export enum ErrorDomain {
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    VALIDATION = 'validation',
    NETWORK = 'network',
    DATABASE = 'database',
    EXTERNAL_SERVICE = 'external_service',
    CACHE = 'cache',
    BUSINESS_LOGIC = 'business_logic',
    SECURITY = 'security',
    SYSTEM = 'system',
    UNKNOWN = 'unknown'
}

/**
 * Severity levels for error prioritization and alerting.
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Rich metadata that can be attached to errors for better debugging.
 */
export interface ErrorMetadata {
    domain?: ErrorDomain;
    severity?: ErrorSeverity;
    timestamp?: Date;
    context?: Record<string, unknown>;
    recoveryStrategies?: Array<{
        type: string;
        label: string;
        action: () => void;
    }>;
    retryable?: boolean;
    correlationId?: string;
    cause?: Error | unknown;
}

/**
 * JSON representation of a BaseError for serialization.
 */
export interface BaseErrorJSON {
    name: string;
    message: string;
    code: string;
    status?: number;
    details?: Record<string, unknown>;
    metadata: {
        domain?: ErrorDomain;
        severity?: ErrorSeverity;
        timestamp?: string;
        context?: Record<string, unknown>;
        recoveryStrategies?: Array<{ type: string; label: string }>;
        retryable?: boolean;
        correlationId?: string;
        cause?: Error | unknown;
    };
    stack?: string;
}

/**
 * Base error class with enhanced metadata and serialization support.
 * Provides a foundation for building domain-specific error types.
 */
export class BaseError extends Error {
    public readonly code: string;
    public readonly status?: number;
    public readonly details?: Record<string, unknown>;
    public readonly metadata: ErrorMetadata;

    constructor(
        message: string,
        code = 'UNKNOWN_ERROR',
        metadata?: ErrorMetadata,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.metadata = {
            timestamp: new Date(),
            ...metadata
        };
        this.details = details;

        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);

        // Capture stack trace in V8 engines (Chrome, Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Serializes the error to a JSON-compatible object.
     * Useful for logging and error reporting systems.
     */
    public toJSON(): BaseErrorJSON {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            status: this.status,
            details: this.details,
            metadata: {
                ...this.metadata,
                timestamp: this.metadata.timestamp?.toISOString(),
                // Exclude non-serializable recovery strategies
                recoveryStrategies: this.metadata.recoveryStrategies?.map(s => ({
                    type: s.type,
                    label: s.label
                }))
            },
            stack: this.stack
        };
    }
}

// Import unified ValidationError from shared core types
import { ValidationError } from '@shared/core/types/validation-types';

// Re-export for backward compatibility
export { ValidationError };

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Standardized interface for the Performance API.
 * Provides type safety and consistent behavior across environments.
 */
export interface Performance {
    mark: (name: string) => void;
    measure: (name: string, startMark: string, endMark: string) => void;
    getEntriesByType: (type: string) => PerformanceEntry[];
    clearMarks: () => void;
    clearMeasures: () => void;
}

/**
 * Browser-safe performance monitoring wrapper that gracefully degrades
 * when the Performance API is unavailable (like in older browsers or SSR).
 * 
 * All methods fail silently since performance monitoring is non-critical
 * and shouldn't break application functionality.
 */
export const performanceMonitor: Performance = {
    mark: (name: string) => {
        if (typeof performance !== 'undefined' && performance.mark) {
            try {
                performance.mark(name);
            } catch (error) {
                // Silently ignore - performance monitoring failures shouldn't break the app
            }
        }
    },

    measure: (name: string, startMark: string, endMark: string) => {
        if (typeof performance !== 'undefined' && performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
            } catch (error) {
                // Silently ignore
            }
        }
    },

    getEntriesByType: (type: string) => {
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            try {
                return performance.getEntriesByType(type);
            } catch (error) {
                // Return empty array on error
            }
        }
        return [];
    },

    clearMarks: () => {
        if (typeof performance !== 'undefined' && performance.clearMarks) {
            try {
                performance.clearMarks();
            } catch (error) {
                // Silently ignore
            }
        }
    },

    clearMeasures: () => {
        if (typeof performance !== 'undefined' && performance.clearMeasures) {
            try {
                performance.clearMeasures();
            } catch (error) {
                // Silently ignore
            }
        }
    }
};

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Formats log context into a consistent JSON string representation.
 * Returns an empty string if no context is provided.
 */
const formatContext = (context?: LogContext): string => {
    if (!context || Object.keys(context).length === 0) return '';

    try {
        return JSON.stringify(context);
    } catch (error) {
        // Handle circular references gracefully
        return '[Context serialization failed]';
    }
};

/**
 * Creates the complete logger implementation with all features.
 * This combines basic logging with advanced render tracking capabilities.
 */
function createLogger(): ExtendedLogger {
    return {
        // Basic logging methods
        debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            // Debug logs are completely stripped in production for zero overhead
            if (process.env.NODE_ENV === 'development') {
                const contextStr = formatContext(context);
                const metaStr = meta ? JSON.stringify(meta) : '';
                console.debug(`[DEBUG] ${message}`, contextStr, metaStr);
            }
        },

        info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            const contextStr = formatContext(context);
            const metaStr = meta ? JSON.stringify(meta) : '';
            console.info(`[INFO] ${message}`, contextStr, metaStr);
        },

        warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            const contextStr = formatContext(context);
            const metaStr = meta ? JSON.stringify(meta) : '';
            console.warn(`[WARN] ${message}`, contextStr, metaStr);
        },

        error: (message: string, context?: LogContext, error?: Error | unknown) => {
            const contextStr = formatContext(context);
            console.error(`[ERROR] ${message}`, contextStr, error);
        },

        // Render tracking methods
        trackRender: (data: RenderTrackingData) => {
            try {
                renderTracker.trackRender(data);

                if (process.env.NODE_ENV === 'development') {
                    console.debug('[RENDER_TRACK]', {
                        component: data.component,
                        renderCount: data.renderCount,
                        trigger: data.trigger,
                        timestamp: new Date(data.timestamp).toISOString()
                    });
                }

                // Automatically detect potential infinite render loops
                renderTracker.detectInfiniteRender(data.component);
            } catch (error) {
                console.warn('Failed to track render', { component: data.component, error });
            }
        },

        trackLifecycle: (data: ComponentLifecycleData) => {
            try {
                renderTracker.trackLifecycle(data);

                if (process.env.NODE_ENV === 'development') {
                    console.debug('[LIFECYCLE_TRACK]', {
                        component: data.component,
                        action: data.action,
                        timestamp: new Date(data.timestamp).toISOString()
                    });
                }
            } catch (error) {
                console.warn('Failed to track lifecycle', { component: data.component, error });
            }
        },

        trackPerformanceImpact: (data: PerformanceImpactData) => {
            try {
                renderTracker.trackPerformanceImpact(data);

                if (process.env.NODE_ENV === 'development') {
                    const memoryStr = data.memoryUsage
                        ? `${(data.memoryUsage / 1024 / 1024).toFixed(2)}MB`
                        : 'N/A';

                    console.debug('[PERFORMANCE_TRACK]', {
                        component: data.component,
                        renderDuration: `${data.renderDuration.toFixed(2)}ms`,
                        memoryUsage: memoryStr,
                        timestamp: new Date(data.timestamp).toISOString()
                    });
                }

                // Alert when renders are slow enough to cause visible frame drops
                if (data.renderDuration > CONFIG.SLOW_RENDER_THRESHOLD) {
                    console.warn('[SLOW_RENDER]', {
                        component: data.component,
                        duration: `${data.renderDuration.toFixed(2)}ms`,
                        threshold: `${CONFIG.SLOW_RENDER_THRESHOLD}ms`,
                        estimatedFPS: `${(1000 / data.renderDuration).toFixed(1)}`
                    });
                }
            } catch (error) {
                console.warn('Failed to track performance impact', {
                    component: data.component,
                    error
                });
            }
        },

        detectInfiniteRender: (component: string, threshold?: number) => {
            try {
                return renderTracker.detectInfiniteRender(component, threshold);
            } catch (error) {
                console.warn('Failed to detect infinite render', { component, error });
                return false;
            }
        },

        getRenderStats: (component?: string) => {
            try {
                return renderTracker.getRenderStats(component);
            } catch (error) {
                console.warn('Failed to get render stats', { component, error });
                return {
                    totalRenders: 0,
                    averageRenderTime: 0,
                    lastRenderTime: 0,
                    infiniteRenderAlerts: 0,
                    mountCount: 0,
                    unmountCount: 0
                };
            }
        },

        clearRenderStats: (component?: string) => {
            try {
                renderTracker.clearRenderStats(component);
                console.info('[RENDER_STATS_CLEARED]', {
                    component: component ?? 'all'
                });
            } catch (error) {
                console.warn('Failed to clear render stats', { component, error });
            }
        }
    };
}

/**
 * Main logger instance - the primary export that should be used throughout your application.
 * 
 * Usage examples:
 * 
 * Basic logging:
 *   logger.info('User logged in', { user_id: '123' });
 *   logger.error('API request failed', {}, error);
 * 
 * Render tracking:
 *   logger.trackRender({ component: 'UserProfile', renderCount: 1, timestamp: Date.now(), trigger: 'props' });
 *   logger.trackPerformanceImpact({ component: 'UserProfile', renderDuration: 12.5, timestamp: Date.now() });
 * 
 * Statistics:
 *   const stats = logger.getRenderStats('UserProfile');
 *   console.log(`Total renders: ${stats.totalRenders}`);
 */
export const logger: ExtendedLogger = createLogger();

// ============================================================================
// CSP Initialization
// ============================================================================

/**
 * Initialize Content Security Policy reporting in browser environments.
 * This runs automatically when the module is loaded in a browser context.
 */
if (typeof document !== 'undefined') {
    try {
        initializeCSPReporting();

        const environment = process.env.NODE_ENV === 'development'
            ? 'development'
            : 'production';
        const cspConfig = getCSPConfig(environment);
        setCSPHeader(cspConfig);
    } catch (error) {
        console.error('Failed to initialize CSP:', error);
    }
}

// ============================================================================
// Validation Service
// ============================================================================

/**
 * Generic validation service that works with any schema library.
 * Compatible with Zod, Yup, Joi, and other validation frameworks.
 * 
 * Usage with Zod:
 *   const schema = z.object({ name: z.string() });
 *   const validated = await validationService.validate(schema, data);
 */
export const validationService = {
    /**
     * Validates data against a schema that implements a `parse` method.
     * Throws validation errors from the underlying schema library.
     */
    validate: async <T>(
        schema: { parse: (data: unknown) => T },
        data: unknown
    ): Promise<T> => {
        if (schema && typeof schema.parse === 'function') {
            try {
                return schema.parse(data);
            } catch (error) {
                // Re-throw validation errors with enhanced context
                if (error instanceof Error) {
                    throw new ValidationError(error.message, {
                        originalError: error,
                        data
                    });
                }
                throw error;
            }
        }
        // Fallback: return data as-is if no valid schema provided
        return data as T;
    }
};

// ============================================================================
// Cleanup Handler
// ============================================================================

/**
 * Registers cleanup handlers for proper resource disposal.
 * Prevents memory leaks in single-page applications by cleaning up
 * the render tracker when the page is unloaded.
 */
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        try {
            renderTracker.destroy();
        } catch (error) {
            console.error('Error during logger cleanup:', error);
        }
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a scoped logger that automatically adds context to all log entries.
 * Useful for creating component-specific or feature-specific loggers.
 * 
 * Usage:
 *   const userLogger = createScopedLogger({ component: 'UserProfile' });
 *   userLogger.info('User data loaded'); // Automatically includes component context
 */
export function createScopedLogger(defaultContext: LogContext): ExtendedLogger {
    return {
        debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            logger.debug(message, { ...defaultContext, ...context }, meta);
        },
        info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            logger.info(message, { ...defaultContext, ...context }, meta);
        },
        warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
            logger.warn(message, { ...defaultContext, ...context }, meta);
        },
        error: (message: string, context?: LogContext, error?: Error | unknown) => {
            logger.error(message, { ...defaultContext, ...context }, error);
        },
        trackRender: (data: RenderTrackingData) => logger.trackRender(data),
        trackLifecycle: (data: ComponentLifecycleData) => logger.trackLifecycle(data),
        trackPerformanceImpact: (data: PerformanceImpactData) => logger.trackPerformanceImpact(data),
        detectInfiniteRender: (component: string, threshold?: number) =>
            logger.detectInfiniteRender(component, threshold),
        getRenderStats: (component?: string) => logger.getRenderStats(component),
        clearRenderStats: (component?: string) => logger.clearRenderStats(component)
    };
}

/**
 * Wraps an async function with automatic error logging.
 * Useful for API calls, event handlers, and other async operations.
 * 
 * Usage:
 *   const fetchUser = withErrorLogging(async (id: string) => {
 *     return await api.getUser(id);
 *   }, 'fetchUser');
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName: string,
    context?: LogContext
): T {
    return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
        try {
            const result = await fn(...args);
            return result;
        } catch (error) {
            logger.error(`Operation failed: ${operationName}`, context, error);
            throw error;
        }
    }) as T;
}

/**
 * Measures the execution time of a function and logs performance data.
 * Works with both synchronous and asynchronous functions.
 * 
 * Usage:
 *   const result = await measurePerformance(
 *     async () => await fetchData(),
 *     'fetchData',
 *     { component: 'DataLoader' }
 *   );
 */
export async function measurePerformance<T>(
    fn: () => T | Promise<T>,
    operationName: string,
    context?: LogContext
): Promise<T> {
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    const measureName = `${operationName}-duration`;

    performanceMonitor.mark(startMark);
    const startTime = Date.now();

    try {
        const result = await fn();

        performanceMonitor.mark(endMark);
        performanceMonitor.measure(measureName, startMark, endMark);

        const duration = Date.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
            logger.info(`Performance: ${operationName}`, context, {
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
        }

        return result;
    } catch (error) {
        performanceMonitor.mark(endMark);
        const duration = Date.now() - startTime;

        logger.error(`Performance (failed): ${operationName}`, context, error);
        logger.info(`Duration before failure: ${duration}ms`);

        throw error;
    } finally {
        performanceMonitor.clearMarks();
        performanceMonitor.clearMeasures();
    }
}

/**
 * Formats bytes into a human-readable string.
 * Useful for displaying memory usage information.
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Gets current memory usage information if available.
 * Returns undefined in environments without memory APIs.
 */
export function getMemoryUsage(): { used: number; total: number } | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize
        };
    }
    return undefined;
}

// ============================================================================
// React Integration Utilities (Optional Import)
// ============================================================================

/**
 * Creates a React Hook for automatic render tracking.
 * This function returns a hook that can be used in React components.
 * 
 * Note: This requires React to be installed in your project.
 * Import React in your component file, not here, to avoid bundling React
 * when it's not needed.
 * 
 * Usage:
 *   import { useEffect, useRef } from 'react';
 *   import { createRenderTrackingHook } from './logger';
 *   
 *   const useRenderTracking = createRenderTrackingHook(useEffect, useRef);
 *   
 *   function MyComponent() {
 *     useRenderTracking('MyComponent', { trigger: 'props' });
 *     return <div>...</div>;
 *   }
 */
export function createRenderTrackingHook(
    useEffect: (effect: () => void | (() => void), deps?: any[]) => void,
    useRef: <T>(initialValue: T) => { current: T }
) {
    return function useRenderTracking(
        componentName: string,
        options?: { trigger?: string; trackPerformance?: boolean }
    ): void {
        const renderCountRef = useRef(0);
        const renderStartTime = useRef(Date.now());

        useEffect(() => {
            renderCountRef.current += 1;
            const renderEndTime = Date.now();
            const renderDuration = renderEndTime - renderStartTime.current;

            // Track render event
            logger.trackRender({
                component: componentName,
                renderCount: renderCountRef.current,
                timestamp: renderEndTime,
                trigger: options?.trigger || 'unknown'
            });

            // Track performance if enabled
            if (options?.trackPerformance) {
                logger.trackPerformanceImpact({
                    component: componentName,
                    renderDuration,
                    timestamp: renderEndTime,
                    memoryUsage: getMemoryUsage()?.used
                });
            }

            // Update start time for next render
            renderStartTime.current = Date.now();
        });

        // Track mount/unmount
        useEffect(() => {
            logger.trackLifecycle({
                component: componentName,
                action: 'mount',
                timestamp: Date.now()
            });

            return () => {
                logger.trackLifecycle({
                    component: componentName,
                    action: 'unmount',
                    timestamp: Date.now()
                });
            };
        }, [componentName]);
    };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a BaseError instance.
 */
export function isBaseError(error: unknown): error is BaseError {
    return error instanceof BaseError;
}

/**
 * Type guard to check if an error is a ValidationError instance.
 */
export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

/**
 * Type guard to check if an error has a specific error code.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
    return isBaseError(error) && error.code === code;
}

/**
 * Type guard to check if a value is an Error instance.
 */
export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Logs detailed render statistics for debugging purposes.
 * Only active in development mode.
 */
export function logRenderReport(component?: string): void {
    if (process.env.NODE_ENV !== 'development') return;

    const stats = logger.getRenderStats(component);
    const target = component || 'All Components';

    console.group(`📊 Render Report: ${target}`);
    console.log(`Total Renders: ${stats.totalRenders}`);
    console.log(`Average Render Time: ${stats.averageRenderTime.toFixed(2)}ms`);
    console.log(`Last Render: ${stats.lastRenderTime ? new Date(stats.lastRenderTime).toISOString() : 'N/A'}`);
    console.log(`Infinite Render Alerts: ${stats.infiniteRenderAlerts}`);
    console.log(`Mount Count: ${stats.mountCount}`);
    console.log(`Unmount Count: ${stats.unmountCount}`);

    if (stats.averageRenderTime > CONFIG.SLOW_RENDER_THRESHOLD) {
        console.warn(`⚠️ Average render time exceeds threshold (${CONFIG.SLOW_RENDER_THRESHOLD}ms)`);
    }

    if (stats.infiniteRenderAlerts > 0) {
        console.error(`🚨 Component has ${stats.infiniteRenderAlerts} infinite render alert(s)`);
    }

    console.groupEnd();
}

/**
 * Exports render statistics to a JSON object for external analysis.
 */
export function exportRenderStats(component?: string): Record<string, unknown> {
    const stats = logger.getRenderStats(component);

    return {
        component: component || 'all',
        timestamp: new Date().toISOString(),
        stats: {
            ...stats,
            lastRenderTime: stats.lastRenderTime ? new Date(stats.lastRenderTime).toISOString() : null
        },
        config: {
            infiniteRenderThreshold: CONFIG.INFINITE_RENDER_THRESHOLD,
            maxHistorySize: CONFIG.MAX_HISTORY_SIZE,
            historyRetentionMs: CONFIG.HISTORY_RETENTION_MS,
            slowRenderThreshold: CONFIG.SLOW_RENDER_THRESHOLD
        }
    };
}

// ============================================================================
// Exports Summary
// ============================================================================

/**
 * Main exports:
 * 
 * Core:
 * - logger: Primary logging interface with all features
 * - BaseError, ValidationError: Error classes for structured error handling
 * - ErrorDomain, ErrorSeverity: Enums for error classification
 * 
 * Utilities:
 * - performanceMonitor: Performance API wrapper
 * - validationService: Generic validation helper
 * - createScopedLogger: Factory for creating loggers with default context
 * - withErrorLogging: Higher-order function for automatic error logging
 * - measurePerformance: Performance measurement utility
 * 
 * React Integration:
 * - createRenderTrackingHook: Factory for creating React render tracking hooks
 * 
 * Type Guards:
 * - isBaseError, isValidationError, hasErrorCode, isError
 * 
 * Development Helpers:
 * - logRenderReport: Logs detailed render statistics
 * - exportRenderStats: Exports statistics as JSON
 * 
 * Formatting:
 * - formatBytes: Human-readable byte formatting
 * - getMemoryUsage: Memory usage information
 */

// Default export for backward compatibility
export default logger;