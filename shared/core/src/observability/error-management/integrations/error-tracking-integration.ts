/**
 * Error Tracking Integration System
 *
 * Provides integration with external error tracking and monitoring services
 * like Sentry, Rollbar, Bugsnag, and others.
 */

import { logger } from '../../logging/index.js';
import { BaseError } from '../errors/base-error.js';
import { ErrorContext, ErrorTrackingIntegration } from '../types.js';

export interface IntegrationConfig {
  dsn?: string;
  apiKey?: string;
  projectId?: string;
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  customData?: Record<string, unknown>;
}

export abstract class BaseErrorTrackingIntegration implements ErrorTrackingIntegration {
  protected config: IntegrationConfig;
  protected initialized = false;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  abstract get name(): string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async initialize(config: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...(config as Partial<IntegrationConfig>) };
    await this.doInitialize();
    this.initialized = true;

    logger.info(`Error tracking integration initialized: ${this.name}`, {
      component: 'ErrorTrackingIntegration',
      integration: this.name
    });
  }

  async trackError(error: BaseError, context?: ErrorContext): Promise<void> {
    if (!this.initialized) {
      logger.warn(`Error tracking integration not initialized: ${this.name}`, {
        component: 'ErrorTrackingIntegration',
        integration: this.name
      });
      return;
    }

    try {
      await this.doTrackError(error, context);
    } catch (trackingError) {
      logger.error(`Failed to track error with ${this.name}`, {
        component: 'ErrorTrackingIntegration',
        integration: this.name,
        errorId: error.errorId,
        trackingError: formatError(trackingError)
      });
    }
  }

  async getAnalytics(): Promise<import('../types.js').ErrorAnalytics> {
    if (!this.initialized) {
      throw new Error(`Integration not initialized: ${this.name}`);
    }

    return await this.doGetAnalytics();
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      await this.doShutdown();
      this.initialized = false;

      logger.info(`Error tracking integration shutdown: ${this.name}`, {
        component: 'ErrorTrackingIntegration',
        integration: this.name
      });
    }
  }

  protected abstract doInitialize(): Promise<void>;
  protected abstract doTrackError(error: BaseError, context?: ErrorContext): Promise<void>;
  protected abstract doGetAnalytics(): Promise<import('../types.js').ErrorAnalytics>;
  protected abstract doShutdown(): Promise<void>;
}

function formatError(err: unknown): unknown {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return err;
}

/**
 * Sentry Integration
 */
export class SentryIntegration extends BaseErrorTrackingIntegration {
  get name(): string {
    return 'sentry';
  }

  protected async doInitialize(): Promise<void> {
    // In a real implementation, this would initialize the Sentry SDK
    if (typeof window !== 'undefined') {
      // Browser environment
      logger.info('Initializing Sentry for browser', {
        component: 'SentryIntegration',
        dsn: this.config.dsn ? 'configured' : 'missing'
      });
    } else {
      // Node.js environment
      logger.info('Initializing Sentry for Node.js', {
        component: 'SentryIntegration',
        dsn: this.config.dsn ? 'configured' : 'missing'
      });
    }
  }

  protected async doTrackError(error: BaseError, context?: ErrorContext): Promise<void> {
    const sentryError = {
      message: error.message,
      stack: error.stack,
      tags: {
        errorId: error.errorId,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        correlationId: error.metadata.correlationId,
        ...this.config.tags
      },
      extra: { errorId: error.errorId,
        code: error.code,
        statusCode: error.statusCode,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        source: error.metadata.source,
        timestamp: error.metadata.timestamp.toISOString(),
        attemptCount: error.metadata.attemptCount,
        retryable: error.metadata.retryable,
        context: error.metadata.context,
        user_id: context?.user_id,
        session_id: context?.metadata?.session_id,
        ...this.config.customData
       },
      user: this.config.user || {
        id: context?.user_id
      },
      fingerprint: [
        error.code,
        error.metadata.domain,
        error.metadata.source || 'unknown'
      ]
    };

    // In a real implementation, this would send to Sentry
    logger.info('Tracking error with Sentry', {
      component: 'SentryIntegration',
      errorId: error.errorId,
      fingerprint: sentryError.fingerprint
    });
  }

  protected async doGetAnalytics(): Promise<import('../types.js').ErrorAnalytics> {
    // In a real implementation, this would fetch analytics from Sentry API
    return {
      totalErrors: 0,
      errorRate: 0,
      errorDistribution: {} as Record<string, number>,
      errorTrends: { daily: [], weekly: [], monthly: [] },
      topErrorTypes: [],
      recoverySuccessRate: 0,
      userImpact: { affectedUsers: 0, sessionsWithErrors: 0, errorPerSession: 0 }
    };
  }

  protected async doShutdown(): Promise<void> {
    // Cleanup Sentry resources
    logger.info('Shutting down Sentry integration', {
      component: 'SentryIntegration'
    });
  }
}

/**
 * Rollbar Integration
 */
export class RollbarIntegration extends BaseErrorTrackingIntegration {
  get name(): string {
    return 'rollbar';
  }

  protected async doInitialize(): Promise<void> {
    logger.info('Initializing Rollbar', {
      component: 'RollbarIntegration',
      access_token: this.config.apiKey ? 'configured' : 'missing'
    });
  }

  protected async doTrackError(error: BaseError, context?: ErrorContext): Promise<void> { const rollbarError = {
      level: this.mapSeverityToRollbar(error.metadata.severity),
      custom: {
        errorId: error.errorId,
        code: error.code,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        correlationId: error.metadata.correlationId,
        context: error.metadata.context,
        user_id: context?.user_id,
        session_id: context?.metadata?.session_id
       },
      person: {
        id: context?.user_id || this.config.user?.id,
        email: this.config.user?.email,
        username: this.config.user?.username
      },
      fingerprint: `${error.code}:${error.metadata.domain}`,
      title: error.message,
      message: error.stack || error.message
    };

    logger.info('Tracking error with Rollbar', {
      component: 'RollbarIntegration',
      errorId: error.errorId,
      level: rollbarError.level
    });
  }

  protected async doGetAnalytics(): Promise<import('../types.js').ErrorAnalytics> {
    return {
      totalErrors: 0,
      errorRate: 0,
      errorDistribution: {} as Record<string, number>,
      errorTrends: { daily: [], weekly: [], monthly: [] },
      topErrorTypes: [],
      recoverySuccessRate: 0,
      userImpact: { affectedUsers: 0, sessionsWithErrors: 0, errorPerSession: 0 }
    };
  }

  protected async doShutdown(): Promise<void> {
    logger.info('Shutting down Rollbar integration', {
      component: 'RollbarIntegration'
    });
  }

  private mapSeverityToRollbar(severity: string): string {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'error';
    }
  }
}

/**
 * Bugsnag Integration
 */
export class BugsnagIntegration extends BaseErrorTrackingIntegration {
  get name(): string {
    return 'bugsnag';
  }

  protected async doInitialize(): Promise<void> {
    logger.info('Initializing Bugsnag', {
      component: 'BugsnagIntegration',
      apiKey: this.config.apiKey ? 'configured' : 'missing'
    });
  }

  protected async doTrackError(error: BaseError, context?: ErrorContext): Promise<void> { const bugsnagError = {
      errorClass: error.name,
      errorMessage: error.message,
      stacktrace: error.stack,
      severity: this.mapSeverityToBugsnag(error.metadata.severity),
      metaData: {
        errorId: error.errorId,
        code: error.code,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        correlationId: error.metadata.correlationId,
        context: error.metadata.context,
        user_id: context?.user_id,
        session_id: context?.metadata?.session_id,
        ...this.config.customData
       },
      user: {
        id: context?.user_id || this.config.user?.id,
        email: this.config.user?.email,
        name: this.config.user?.username
      },
      groupingHash: `${error.code}:${error.metadata.domain}`
    };

    logger.info('Tracking error with Bugsnag', {
      component: 'BugsnagIntegration',
      errorId: error.errorId,
      severity: bugsnagError.severity
    });
  }

  protected async doGetAnalytics(): Promise<import('../types.js').ErrorAnalytics> {
    return {
      totalErrors: 0,
      errorRate: 0,
      errorDistribution: {} as Record<string, number>,
      errorTrends: { daily: [], weekly: [], monthly: [] },
      topErrorTypes: [],
      recoverySuccessRate: 0,
      userImpact: { affectedUsers: 0, sessionsWithErrors: 0, errorPerSession: 0 }
    };
  }

  protected async doShutdown(): Promise<void> {
    logger.info('Shutting down Bugsnag integration', {
      component: 'BugsnagIntegration'
    });
  }

  private mapSeverityToBugsnag(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'error';
    }
  }
}

/**
 * Console Integration (for development/testing)
 */
export class ConsoleIntegration extends BaseErrorTrackingIntegration {
  get name(): string {
    return 'console';
  }

  protected async doInitialize(): Promise<void> {
    logger.info('Initializing Console error tracking', {
      component: 'ConsoleIntegration'
    });
  }

  protected async doTrackError(error: BaseError, context?: ErrorContext): Promise<void> { const logData = {
      errorId: error.errorId,
      message: error.message,
      code: error.code,
      domain: error.metadata.domain,
      severity: error.metadata.severity,
      correlationId: error.metadata.correlationId,
      user_id: context?.user_id,
      session_id: context?.metadata?.session_id,
      stack: error.stack,
      context: error.metadata.context
     };

    console.group(`🚨 Error Tracked [${this.name.toUpperCase()}]`);
    console.error(error.message, logData);
    console.groupEnd();
  }

  protected async doGetAnalytics(): Promise<import('../types.js').ErrorAnalytics> {
    return {
      totalErrors: 0,
      errorRate: 0,
      errorDistribution: {} as Record<string, number>,
      errorTrends: { daily: [], weekly: [], monthly: [] },
      topErrorTypes: [],
      recoverySuccessRate: 0,
      userImpact: { affectedUsers: 0, sessionsWithErrors: 0, errorPerSession: 0 }
    };
  }

  protected async doShutdown(): Promise<void> {
    logger.info('Shutting down Console integration', {
      component: 'ConsoleIntegration'
    });
  }
}

/**
 * Integration Manager
 */
export class ErrorTrackingIntegrationManager {
  private integrations: Map<string, ErrorTrackingIntegration> = new Map();

  registerIntegration(integration: ErrorTrackingIntegration): void {
    this.integrations.set(integration.name, integration);

    logger.info('Registered error tracking integration', {
      component: 'ErrorTrackingIntegrationManager',
      integration: integration.name
    });
  }

  unregisterIntegration(name: string): void {
    if (this.integrations.delete(name)) {
      logger.info('Unregistered error tracking integration', {
        component: 'ErrorTrackingIntegrationManager',
        integration: name
      });
    }
  }

  getIntegration(name: string): ErrorTrackingIntegration | undefined {
    return this.integrations.get(name);
  }

  getAllIntegrations(): ErrorTrackingIntegration[] {
    return Array.from(this.integrations.values());
  }

  async initializeAllIntegrations(): Promise<void> {
    const promises = Array.from(this.integrations.values()).map(async (integration) => {
      try {
        await integration.initialize({});
      } catch (err: unknown) {
        logger.error(`Failed to initialize integration: ${integration.name}`, {
          component: 'ErrorTrackingIntegrationManager',
          integration: integration.name,
          error: formatError(err)
        });
      }
    });

    await Promise.allSettled(promises);
  }

  async trackErrorToAll(error: BaseError, context?: ErrorContext): Promise<void> {
    const promises = Array.from(this.integrations.values()).map(async (integration) => {
      try {
        await integration.trackError(error, context);
      } catch (err: unknown) {
        const originalErrorId = err instanceof BaseError ? err.errorId : undefined;
        logger.error(`Failed to track error with integration: ${integration.name}`, {
          component: 'ErrorTrackingIntegrationManager',
          integration: integration.name,
          originalErrorId,
          trackingError: formatError(err)
        });
      }
    });

    await Promise.allSettled(promises);
  }

  async shutdownAllIntegrations(): Promise<void> {
    const promises = Array.from(this.integrations.values()).map(async (integration) => {
      try {
        await integration.shutdown();
      } catch (err: unknown) {
        logger.error(`Failed to shutdown integration: ${integration.name}`, {
          component: 'ErrorTrackingIntegrationManager',
          integration: integration.name,
          error: formatError(err)
        });
      }
    });

    await Promise.allSettled(promises);
  }
}

/**
 * Factory functions for creating integrations
 */
export function createSentryIntegration(config: IntegrationConfig): ErrorTrackingIntegration {
  return new SentryIntegration(config);
}

export function createRollbarIntegration(config: IntegrationConfig): ErrorTrackingIntegration {
  return new RollbarIntegration(config);
}

export function createBugsnagIntegration(config: IntegrationConfig): ErrorTrackingIntegration {
  return new BugsnagIntegration(config);
}

export function createConsoleIntegration(config: IntegrationConfig = {}): ErrorTrackingIntegration {
  return new ConsoleIntegration(config);
}

export function createIntegrationManager(): ErrorTrackingIntegrationManager {
  return new ErrorTrackingIntegrationManager();
}



