/**
 * Emergency Triage Tool - Frontend Race Condition Diagnostics
 * 
 * This tool captures and analyzes console errors in real-time to identify
 * the worst offending components causing infinite renders and race conditions.
 */

import { logger } from './browser-logger';

export interface ComponentError {
  component: string;
  errorType: 'infinite-render' | 'race-condition' | 'memory-leak' | 'dependency-issue' | 'state-mutation' | 'event-listener-leak' | 'unknown';
  message: string;
  stack?: string;
  timestamp: number;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  lineNumber?: number;
}

export interface TriageReport {
  totalErrors: number;
  errorsByComponent: Map<string, ComponentError[]>;
  errorsByType: Map<string, ComponentError[]>;
  topOffenders: ComponentError[];
  criticalIssues: ComponentError[];
  baseline: {
    startTime: number;
    endTime: number;
    duration: number;
    errorRate: number; // errors per minute
  };
}

export interface CircuitBreakerConfig {
  component: string;
  enabled: boolean;
  errorThreshold: number;
  timeWindow: number; // milliseconds
  fallbackComponent?: React.ComponentType<any>;
}

class EmergencyTriageTool {
  private errors: ComponentError[] = [];
  private errorCounts: Map<string, number> = new Map();
  private renderCounts: Map<string, number> = new Map();
  private lastRenderTime: Map<string, number> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerConfig> = new Map();
  private isMonitoring = false;
  private startTime = 0;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  constructor() {
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
  }

  /**
   * Start monitoring console errors and component renders
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Emergency triage already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.errors = [];
    this.errorCounts.clear();
    this.renderCounts.clear();
    this.lastRenderTime.clear();

    logger.info('🚨 Emergency triage monitoring started');

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.captureError('error', args);
      this.originalConsoleError(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.captureError('warn', args);
      this.originalConsoleWarn(...args);
    };

    // Monitor React DevTools if available
    this.setupReactDevToolsMonitoring();

    // Monitor performance observers
    this.setupPerformanceMonitoring();
  }

  /**
   * Stop monitoring and generate report
   */
  stopMonitoring(): TriageReport {
    if (!this.isMonitoring) {
      throw new Error('Triage monitoring not started');
    }

    this.isMonitoring = false;
    const endTime = Date.now();

    // Restore original console methods
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    const report = this.generateReport(endTime);
    logger.info('🚨 Emergency triage monitoring stopped', report);

    return report;
  }

  /**
   * Capture and analyze console errors
   */
  private captureError(level: 'error' | 'warn', args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    const componentError = this.analyzeError(message, level);
    if (componentError) {
      this.errors.push(componentError);
      
      // Update frequency count
      const key = `${componentError.component}-${componentError.errorType}`;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
      componentError.frequency = this.errorCounts.get(key) || 1;

      // Check circuit breaker thresholds
      this.checkCircuitBreaker(componentError);
    }
  }

  /**
   * Analyze error message to extract component and error type
   */
  private analyzeError(message: string, level: 'error' | 'warn'): ComponentError | null {
    const timestamp = Date.now();
    
    // Extract component name from common patterns
    const component = this.extractComponentName(message);
    if (!component) return null;

    // Classify error type
    const errorType = this.classifyErrorType(message);
    
    // Determine severity
    const severity = this.determineSeverity(message, errorType, level);

    // Extract file path and line number
    const { filePath, lineNumber } = this.extractLocationInfo(message);

    return {
      component,
      errorType,
      message,
      timestamp,
      frequency: 1,
      severity,
      filePath,
      lineNumber,
      stack: new Error().stack
    };
  }

  /**
   * Extract component name from error messages
   */
  private extractComponentName(message: string): string | null {
    // Common React component patterns
    const patterns = [
      /at (\w+) \(/,                           // Stack trace pattern
      /in (\w+) \(/,                           // React DevTools pattern
      /(\w+)\.tsx?:/,                          // File name pattern
      /Warning: (\w+)/,                        // React warning pattern
      /Error in (\w+)/,                        // Custom error pattern
      /component="(\w+)"/,                     // Logged component pattern
      /\[(\w+)\]/,                            // Bracketed component pattern
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Check for known problematic components
    const knownComponents = [
      'AppLayout', 'DesktopSidebar', 'MobileNavigation', 'WebSocketClient',
      'RealTimeTracker', 'PerformanceMonitor', 'NavigationPreferences',
      'BillCard', 'BillDetail', 'AuthPage', 'ErrorBoundary'
    ];

    for (const comp of knownComponents) {
      if (message.includes(comp)) {
        return comp;
      }
    }

    return 'Unknown';
  }

  /**
   * Classify error type based on message content
   */
  private classifyErrorType(message: string): ComponentError['errorType'] {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('maximum update depth') || 
        lowerMessage.includes('too many re-renders') ||
        lowerMessage.includes('infinite loop')) {
      return 'infinite-render';
    }

    if (lowerMessage.includes('race condition') ||
        lowerMessage.includes('state update') ||
        lowerMessage.includes('concurrent')) {
      return 'race-condition';
    }

    if (lowerMessage.includes('memory') ||
        lowerMessage.includes('leak') ||
        lowerMessage.includes('cleanup')) {
      return 'memory-leak';
    }

    if (lowerMessage.includes('dependency') ||
        lowerMessage.includes('useeffect') ||
        lowerMessage.includes('missing dep')) {
      return 'dependency-issue';
    }

    if (lowerMessage.includes('mutation') ||
        lowerMessage.includes('immutable') ||
        lowerMessage.includes('direct assignment')) {
      return 'state-mutation';
    }

    if (lowerMessage.includes('event listener') ||
        lowerMessage.includes('websocket') ||
        lowerMessage.includes('cleanup')) {
      return 'event-listener-leak';
    }

    return 'unknown';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(message: string, errorType: ComponentError['errorType'], level: 'error' | 'warn'): ComponentError['severity'] {
    // Critical errors that block the application
    if (errorType === 'infinite-render' || 
        message.includes('maximum update depth') ||
        message.includes('browser crash')) {
      return 'critical';
    }

    // High priority errors that degrade performance
    if (level === 'error' && (
        errorType === 'race-condition' ||
        errorType === 'memory-leak' ||
        message.includes('performance')
    )) {
      return 'high';
    }

    // Medium priority for warnings and less severe errors
    if (level === 'warn' || 
        errorType === 'dependency-issue' ||
        errorType === 'state-mutation') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract file path and line number from error
   */
  private extractLocationInfo(message: string): { filePath?: string; lineNumber?: number } {
    const filePattern = /at .+ \((.+):(\d+):\d+\)/;
    const match = message.match(filePattern);
    
    if (match) {
      return {
        filePath: match[1],
        lineNumber: parseInt(match[2], 10)
      };
    }

    return {};
  }

  /**
   * Track component render frequency
   */
  trackRender(componentName: string): void {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const lastRender = this.lastRenderTime.get(componentName) || 0;
    const renderCount = this.renderCounts.get(componentName) || 0;

    this.renderCounts.set(componentName, renderCount + 1);
    this.lastRenderTime.set(componentName, now);

    // Detect infinite renders (>50 renders per second)
    if (now - lastRender < 20) { // 20ms = 50 renders/second
      const error: ComponentError = {
        component: componentName,
        errorType: 'infinite-render',
        message: `Infinite render detected: ${componentName} rendered ${renderCount + 1} times`,
        timestamp: now,
        frequency: renderCount + 1,
        severity: 'critical'
      };

      this.errors.push(error);
      logger.error('🚨 INFINITE RENDER DETECTED:', componentName, renderCount + 1);
    }
  }

  /**
   * Setup React DevTools monitoring if available
   */
  private setupReactDevToolsMonitoring(): void {
    // Check if React DevTools is available
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Monitor fiber commits for render tracking
      if (hook.onCommitFiberRoot) {
        const originalOnCommit = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = (id: any, root: any, ...args: any[]) => {
          this.trackFiberCommit(root);
          return originalOnCommit(id, root, ...args);
        };
      }
    }
  }

  /**
   * Track fiber commits for render analysis
   */
  private trackFiberCommit(root: any): void {
    if (!root || !root.current) return;

    try {
      const fiber = root.current;
      this.traverseFiber(fiber);
    } catch (error) {
      // Silently ignore DevTools errors
    }
  }

  /**
   * Traverse fiber tree to track component renders
   */
  private traverseFiber(fiber: any): void {
    if (!fiber) return;

    if (fiber.type && typeof fiber.type === 'function') {
      const componentName = fiber.type.displayName || fiber.type.name || 'Anonymous';
      this.trackRender(componentName);
    }

    // Traverse children
    let child = fiber.child;
    while (child) {
      this.traverseFiber(child);
      child = child.sibling;
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              const error: ComponentError = {
                component: 'PerformanceMonitor',
                errorType: 'unknown',
                message: `Long task detected: ${entry.duration}ms`,
                timestamp: Date.now(),
                frequency: 1,
                severity: entry.duration > 100 ? 'high' : 'medium'
              };
              this.errors.push(error);
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        // PerformanceObserver not supported
      }
    }
  }

  /**
   * Check circuit breaker thresholds
   */
  private checkCircuitBreaker(error: ComponentError): void {
    const breaker = this.circuitBreakers.get(error.component);
    if (!breaker || !breaker.enabled) return;

    if (error.frequency >= breaker.errorThreshold) {
      logger.error('🔥 CIRCUIT BREAKER TRIGGERED:', error.component);
      this.triggerCircuitBreaker(error.component);
    }
  }

  /**
   * Trigger circuit breaker for a component
   */
  private triggerCircuitBreaker(componentName: string): void {
    // This would disable the component in a real implementation
    logger.error(`Circuit breaker activated for ${componentName}`);
    
    // Emit custom event for component to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('circuit-breaker-triggered', {
        detail: { component: componentName }
      }));
    }
  }

  /**
   * Configure circuit breaker for a component
   */
  configureCircuitBreaker(config: CircuitBreakerConfig): void {
    this.circuitBreakers.set(config.component, config);
    logger.info('Circuit breaker configured:', config.component);
  }

  /**
   * Generate comprehensive triage report
   */
  private generateReport(endTime: number): TriageReport {
    const duration = endTime - this.startTime;
    const errorRate = (this.errors.length / duration) * 60000; // errors per minute

    // Group errors by component
    const errorsByComponent = new Map<string, ComponentError[]>();
    const errorsByType = new Map<string, ComponentError[]>();

    for (const error of this.errors) {
      // By component
      if (!errorsByComponent.has(error.component)) {
        errorsByComponent.set(error.component, []);
      }
      errorsByComponent.get(error.component)!.push(error);

      // By type
      if (!errorsByType.has(error.errorType)) {
        errorsByType.set(error.errorType, []);
      }
      errorsByType.get(error.errorType)!.push(error);
    }

    // Find top offenders (by frequency and severity)
    const topOffenders = this.errors
      .sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aScore = a.frequency * severityWeight[a.severity];
        const bScore = b.frequency * severityWeight[b.severity];
        return bScore - aScore;
      })
      .slice(0, 10);

    // Find critical issues
    const criticalIssues = this.errors.filter(error => error.severity === 'critical');

    return {
      totalErrors: this.errors.length,
      errorsByComponent,
      errorsByType,
      topOffenders,
      criticalIssues,
      baseline: {
        startTime: this.startTime,
        endTime,
        duration,
        errorRate
      }
    };
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    errorCount: number;
    duration: number;
    topComponents: string[];
  } {
    const now = Date.now();
    const componentCounts = new Map<string, number>();

    for (const error of this.errors) {
      componentCounts.set(error.component, (componentCounts.get(error.component) || 0) + 1);
    }

    const topComponents = Array.from(componentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([component]) => component);

    return {
      isMonitoring: this.isMonitoring,
      errorCount: this.errors.length,
      duration: this.isMonitoring ? now - this.startTime : 0,
      topComponents
    };
  }
}

// Singleton instance
export const emergencyTriage = new EmergencyTriageTool();

// Utility functions for easy usage
export function startEmergencyTriage(): void {
  emergencyTriage.startMonitoring();
}

export function stopEmergencyTriage(): TriageReport {
  return emergencyTriage.stopMonitoring();
}

export function getTriageStatus() {
  return emergencyTriage.getStatus();
}

export function configureCircuitBreaker(config: CircuitBreakerConfig): void {
  emergencyTriage.configureCircuitBreaker(config);
}

// React hook for component render tracking
export function useRenderTracking(componentName: string): void {
  if (process.env.NODE_ENV === 'development') {
    emergencyTriage.trackRender(componentName);
  }
}