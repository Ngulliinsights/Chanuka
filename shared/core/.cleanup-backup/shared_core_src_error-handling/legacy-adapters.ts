// Legacy adapters for backward compatibility with existing error handling code

import { ErrorTracker } from '../../../server/core/errors/error-tracker.js';
import { ErrorBoundaryAdapter, withErrorBoundary } from './platform/client/error-boundary-adapter.js';
import { ErrorReportingService } from './services/error-reporting.js';
import { AlertRuleManager } from './patterns/alert-rules.js';
import { ErrorPatternManager } from './patterns/error-patterns.js';
import { RequestContextCapture } from './platform/server/request-context.js';

// Re-export legacy ErrorTracker interface for backward compatibility
export { ErrorTracker } from '../../../server/core/errors/error-tracker.js';

// Create a unified error tracker that combines server and client features
export class UnifiedErrorTracker {
  private serverTracker?: ErrorTracker;
  private clientReporter?: ErrorReportingService;
  private alertManager?: AlertRuleManager;
  private patternManager?: ErrorPatternManager;

  constructor(options: { isServer?: boolean; isClient?: boolean } = {}) {
    const { isServer = false, isClient = false } = options;

    if (isServer) {
      // Import server-specific modules only on server
      this.serverTracker = new ErrorTracker();
      this.alertManager = new AlertRuleManager();
      this.patternManager = new ErrorPatternManager();
    }

    if (isClient) {
      // Import client-specific modules only on client
      this.clientReporter = new ErrorReportingService();
    }
  }

  // Unified error tracking method
  trackError(error: Error | string, context: any = {}, severity?: string, category?: string): string | void {
    if (this.serverTracker) {
      // Server-side tracking
      return this.serverTracker.trackError(error, context, severity as any, category as any);
    } else if (this.clientReporter) {
      // Client-side reporting
      this.clientReporter.reportError(error instanceof Error ? error : new Error(error), context);
    }
  }

  // Unified request error tracking
  trackRequestError(error: Error | string, req: any, severity?: string, category?: string): string | void {
    if (this.serverTracker && req) {
      return this.serverTracker.trackRequestError(error, req, severity as any, category as any);
    } else if (this.clientReporter) {
      this.clientReporter.reportError(error instanceof Error ? error : new Error(error), req);
    }
  }

  // Unified error resolution
  resolveError(errorId: string, resolvedBy?: string): boolean {
    if (this.serverTracker) {
      return this.serverTracker.resolveError(errorId, resolvedBy);
    }
    return false;
  }

  // Unified error retrieval
  getError(errorId: string): any {
    if (this.serverTracker) {
      return this.serverTracker.getError(errorId);
    }
    return null;
  }

  // Unified error statistics
  getErrorStats(timeWindow?: number): any {
    if (this.serverTracker) {
      return this.serverTracker.getErrorStats(timeWindow);
    }
    return {};
  }

  // Unified alert rule management
  addAlertRule(rule: any): string | void {
    if (this.alertManager) {
      return this.alertManager.addAlertRule(rule);
    }
  }

  getAlertRules(): any[] {
    if (this.alertManager) {
      return this.alertManager.getAlertRules();
    }
    return [];
  }

  // Unified error pattern management
  getErrorPatterns(resolved?: boolean): any[] {
    if (this.patternManager) {
      return this.patternManager.getAllPatterns(resolved);
    }
    return [];
  }

  // Shutdown method
  shutdown(): void {
    if (this.serverTracker) {
      this.serverTracker.shutdown();
    }
  }
}

// Legacy error boundary exports for backward compatibility
export { ErrorBoundaryAdapter as PageErrorBoundary } from './platform/client/error-boundary-adapter.js';
export { withErrorBoundary } from './platform/client/error-boundary-adapter.js';

// Legacy error reporting service
export { ErrorReportingService as ErrorReportingService } from './services/error-reporting.js';

// Legacy request context capture
export { RequestContextCapture } from './platform/server/request-context.js';

// Create singleton instances for backward compatibility
let legacyErrorTracker: UnifiedErrorTracker | null = null;

export function getLegacyErrorTracker(): UnifiedErrorTracker {
  if (!legacyErrorTracker) {
    // Detect environment
    const isServer = typeof window === 'undefined';
    const isClient = typeof window !== 'undefined';

    legacyErrorTracker = new UnifiedErrorTracker({ isServer, isClient });
  }
  return legacyErrorTracker;
}

// Export legacy singleton for backward compatibility
export const errorTracker = getLegacyErrorTracker();





































