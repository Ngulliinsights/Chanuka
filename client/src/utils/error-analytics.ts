/**
 * Error Analytics Service (Optimized)
 *
 * Provides a unified interface for multiple analytics providers (Sentry, DataDog, etc.)
 * with lazy loading, module caching, and comprehensive error handling.
 * 
 * Key optimizations:
 * - Cached module imports to avoid redundant dynamic imports
 * - Enhanced error boundary patterns for provider failures
 * - Improved type safety and configuration validation
 * - Better performance monitoring and debugging capabilities
 */

import { AppError, ErrorSeverity } from './unified-error-handler';
import { logger } from './logger';

// ============================================================================
// Type Declarations for Optional Packages
// ============================================================================

// Sentry types
interface SentryModule {
  init(config: any): void;
  captureException(error: any, options?: any): void;
  BrowserTracing: new () => any;
  Replay: new () => any;
}

// DataDog types
interface DataDogModule {
  datadogRum: {
    init(config: any): void;
    addError(error: any, context?: any): void;
  };
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ErrorAnalyticsProvider {
  name: string;
  track: (error: AppError) => Promise<void>;
  setup?: (config?: any) => Promise<void>;
  isEnabled: () => boolean;
  getHealth: () => ProviderHealth;
}

export interface ProviderHealth {
  configured: boolean;
  moduleLoaded: boolean;
  lastError?: string;
  trackCount: number;
}

export interface ErrorAnalyticsConfig {
  sentry?: {
    dsn: string;
    environment: string;
    release?: string;
    sampleRate?: number;
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  };
  datadog?: {
    applicationId: string;
    clientToken: string;
    site?: string;
    service?: string;
    env?: string;
    version?: string;
    sampleRate?: number;
    premiumSampleRate?: number;
  };
  custom?: {
    endpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
  enabled: boolean;
  // Global settings that apply to all providers
  suppressErrors?: boolean; // If true, provider failures won't throw
  retryFailedTracks?: boolean; // If true, failed tracks will be retried once
}

// ============================================================================
// Base Provider Class (for shared functionality)
// ============================================================================

abstract class BaseProvider implements ErrorAnalyticsProvider {
  abstract name: string;
  protected isConfigured = false;
  protected moduleLoaded = false;
  protected lastError?: string;
  protected trackCount = 0;

  abstract setup(config: any): Promise<void>;
  abstract track(error: AppError): Promise<void>;

  isEnabled(): boolean {
    return this.isConfigured && this.moduleLoaded;
  }

  getHealth(): ProviderHealth {
    return {
      configured: this.isConfigured,
      moduleLoaded: this.moduleLoaded,
      lastError: this.lastError,
      trackCount: this.trackCount,
    };
  }

  protected setError(error: string): void {
    this.lastError = error;
    logger.warn(`${this.name} provider error: ${error}`, {
      component: 'ErrorAnalytics',
      provider: this.name,
    });
  }

  protected clearError(): void {
    this.lastError = undefined;
  }
}

// ============================================================================
// Sentry Provider (Optimized)
// ============================================================================

class SentryProvider extends BaseProvider {
  name = 'Sentry';
  private sentryModule?: SentryModule;

  async setup(config: ErrorAnalyticsConfig['sentry']): Promise<void> {
    if (!config?.dsn) {
      throw new Error('Sentry DSN is required');
    }

    try {
      // Load Sentry module once and cache it
      if (!this.sentryModule) {
        try {
          this.sentryModule = await import('@sentry/browser' as any);
          this.moduleLoaded = true;
        } catch (importError) {
          this.setError('Sentry package not available');
          logger.warn('Sentry package not installed. Install with: npm install @sentry/browser', {
            component: 'ErrorAnalytics',
            error: importError,
          });
          return;
        }
      }

      // Initialize Sentry with the provided configuration
      this.sentryModule!.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        sampleRate: config.sampleRate ?? 1.0,
        integrations: [
          new this.sentryModule!.BrowserTracing(),
          new this.sentryModule!.Replay(),
        ],
        tracesSampleRate: config.tracesSampleRate ?? 1.0,
        replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.1,
        replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0,
      });

      this.isConfigured = true;
      this.clearError();
      logger.info('Sentry analytics configured successfully', {
        component: 'ErrorAnalytics',
        environment: config.environment,
      });
    } catch (error) {
      this.setError(`Setup failed: ${error}`);
      throw error;
    }
  }

  async track(error: AppError): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      // Use cached module instead of re-importing
      this.sentryModule!.captureException(error, {
        tags: {
          domain: error.type,
          severity: error.severity,
          recoverable: String(error.recoverable),
          retryable: String(error.retryable),
        },
        extra: {
          context: error.context,
          details: error.details,
          timestamp: error.timestamp,
          retryCount: error.retryCount,
          recovered: error.recovered,
          recoveryStrategy: error.recoveryStrategy,
        },
        level: this.mapSeverityToSentryLevel(error.severity),
      });

      this.trackCount++;
      this.clearError();
    } catch (trackError) {
      this.setError(`Track failed: ${trackError}`);
      logger.error('Failed to track error with Sentry', {
        component: 'ErrorAnalytics',
        error: trackError,
        errorId: error.id,
      });
    }
  }

  private mapSeverityToSentryLevel(severity: ErrorSeverity): string {
    const severityMap: Record<ErrorSeverity, string> = {
      [ErrorSeverity.CRITICAL]: 'fatal',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.MEDIUM]: 'warning',
      [ErrorSeverity.LOW]: 'info',
    };
    return severityMap[severity] ?? 'error';
  }
}

// ============================================================================
// DataDog Provider (Optimized)
// ============================================================================

class DataDogProvider extends BaseProvider {
  name = 'DataDog';
  private datadogModule?: DataDogModule;

  async setup(config: ErrorAnalyticsConfig['datadog']): Promise<void> {
    if (!config?.applicationId || !config?.clientToken) {
      throw new Error('DataDog applicationId and clientToken are required');
    }

    try {
      // Load DataDog module once and cache it
      if (!this.datadogModule) {
        try {
          this.datadogModule = await import('@datadog/browser-rum' as any);
          this.moduleLoaded = true;
        } catch (importError) {
          this.setError('DataDog package not available');
          logger.warn('DataDog package not installed. Install with: npm install @datadog/browser-rum', {
            component: 'ErrorAnalytics',
            error: importError,
          });
          return;
        }
      }

      // Initialize DataDog RUM
      this.datadogModule!.datadogRum.init({
        applicationId: config.applicationId,
        clientToken: config.clientToken,
        site: config.site ?? 'datadoghq.com',
        service: config.service ?? 'web-app',
        env: config.env ?? 'production',
        version: config.version,
        sampleRate: config.sampleRate ?? 100,
        premiumSampleRate: config.premiumSampleRate ?? 100,
        trackInteractions: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      this.isConfigured = true;
      this.clearError();
      logger.info('DataDog analytics configured successfully', {
        component: 'ErrorAnalytics',
        service: config.service,
        env: config.env,
      });
    } catch (error) {
      this.setError(`Setup failed: ${error}`);
      throw error;
    }
  }

  async track(error: AppError): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      // Use cached module instead of re-importing
      this.datadogModule!.datadogRum.addError(error, {
        domain: error.type,
        severity: error.severity,
        recoverable: error.recoverable,
        retryable: error.retryable,
        context: error.context,
        details: error.details,
        timestamp: error.timestamp,
        retryCount: error.retryCount,
        recovered: error.recovered,
        recoveryStrategy: error.recoveryStrategy,
      });

      this.trackCount++;
      this.clearError();
    } catch (trackError) {
      this.setError(`Track failed: ${trackError}`);
      logger.error('Failed to track error with DataDog', {
        component: 'ErrorAnalytics',
        error: trackError,
        errorId: error.id,
      });
    }
  }
}

// ============================================================================
// Custom Analytics Provider (Optimized)
// ============================================================================

class CustomAnalyticsProvider extends BaseProvider {
  name = 'Custom';
  private config?: ErrorAnalyticsConfig['custom'];
  private retryQueue: AppError[] = [];

  async setup(config: ErrorAnalyticsConfig['custom']): Promise<void> {
    if (!config?.endpoint) {
      throw new Error('Custom analytics endpoint is required');
    }

    // Validate endpoint URL format
    try {
      new URL(config.endpoint);
    } catch {
      throw new Error('Custom analytics endpoint must be a valid URL');
    }

    this.config = config;
    this.isConfigured = true;
    this.moduleLoaded = true; // No external module needed
    this.clearError();
    
    logger.info('Custom analytics configured successfully', {
      component: 'ErrorAnalytics',
      endpoint: config.endpoint,
    });
  }

  async track(error: AppError): Promise<void> {
    if (!this.isEnabled() || !this.config) {
      return;
    }

    try {
      await this.sendError(error);
      this.trackCount++;
      this.clearError();
    } catch (trackError) {
      this.setError(`Track failed: ${trackError}`);
      logger.error('Failed to track error with custom analytics', {
        component: 'ErrorAnalytics',
        error: trackError,
        errorId: error.id,
      });
      
      // Add to retry queue if configured
      this.retryQueue.push(error);
    }
  }

  private async sendError(error: AppError): Promise<void> {
    if (!this.config) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 5000
    );

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          error: {
            id: error.id,
            type: error.type,
            severity: error.severity,
            message: error.message,
            details: error.details,
            context: error.context,
            timestamp: error.timestamp,
            recoverable: error.recoverable,
            retryable: error.retryable,
            retryCount: error.retryCount,
            recovered: error.recovered,
            recoveryStrategy: error.recoveryStrategy,
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async retryFailed(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const errors = [...this.retryQueue];
    this.retryQueue = [];

    for (const error of errors) {
      try {
        await this.sendError(error);
      } catch {
        // Failed again, don't re-queue to avoid infinite loops
        logger.warn('Failed to retry error tracking', {
          component: 'ErrorAnalytics',
          errorId: error.id,
        });
      }
    }
  }
}

// ============================================================================
// Error Analytics Service (Optimized)
// ============================================================================

class ErrorAnalyticsService {
  private static instance: ErrorAnalyticsService;
  private providers: Map<string, ErrorAnalyticsProvider> = new Map();
  private isEnabled = false;
  private config?: ErrorAnalyticsConfig;

  private constructor() {
    // Initialize all available providers
    this.providers.set('sentry', new SentryProvider());
    this.providers.set('datadog', new DataDogProvider());
    this.providers.set('custom', new CustomAnalyticsProvider());
  }

  static getInstance(): ErrorAnalyticsService {
    if (!ErrorAnalyticsService.instance) {
      ErrorAnalyticsService.instance = new ErrorAnalyticsService();
    }
    return ErrorAnalyticsService.instance;
  }

  /**
   * Configure analytics providers with optimized parallel initialization
   */
  async configure(config: ErrorAnalyticsConfig): Promise<void> {
    this.config = config;
    this.isEnabled = config.enabled;

    if (!this.isEnabled) {
      logger.info('Error analytics disabled', { component: 'ErrorAnalytics' });
      return;
    }

    // Setup providers in parallel for better performance
    const setupTasks: Array<{ name: string; promise: Promise<void> }> = [];

    if (config.sentry) {
      const provider = this.providers.get('sentry');
      if (provider?.setup) {
        setupTasks.push({
          name: 'sentry',
          promise: provider.setup(config.sentry),
        });
      }
    }

    if (config.datadog) {
      const provider = this.providers.get('datadog');
      if (provider?.setup) {
        setupTasks.push({
          name: 'datadog',
          promise: provider.setup(config.datadog),
        });
      }
    }

    if (config.custom) {
      const provider = this.providers.get('custom');
      if (provider?.setup) {
        setupTasks.push({
          name: 'custom',
          promise: provider.setup(config.custom),
        });
      }
    }

    // Execute all setups and collect results
    const results = await Promise.allSettled(
      setupTasks.map(task => task.promise)
    );

    // Log results for each provider
    results.forEach((result, index) => {
      const taskName = setupTasks[index]!.name;
      if (result.status === 'rejected') {
        logger.warn(`Failed to setup ${taskName} provider`, {
          component: 'ErrorAnalytics',
          error: result.reason,
        });
      }
    });

    const enabledProviders = Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .map(provider => provider.name);

    logger.info('Error analytics configuration complete', {
      component: 'ErrorAnalytics',
      enabledProviders,
      totalProviders: this.providers.size,
    });
  }

  /**
   * Track an error across all enabled providers with optimized parallel execution
   */
  async track(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    // Track across all enabled providers in parallel
    const trackPromises = Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .map(provider => 
        provider.track(error).catch(err => {
          // Individual provider failures shouldn't break the whole tracking
          logger.error(`Provider ${provider.name} tracking failed`, {
            component: 'ErrorAnalytics',
            provider: provider.name,
            error: err,
            errorId: error.id,
          });
        })
      );

    await Promise.allSettled(trackPromises);
  }

  /**
   * Get comprehensive analytics statistics including health metrics
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
        name: key,
        displayName: provider.name,
        enabled: provider.isEnabled(),
        health: provider.getHealth(),
      })),
      config: {
        suppressErrors: this.config?.suppressErrors ?? false,
        retryFailedTracks: this.config?.retryFailedTracks ?? false,
      },
    };
  }

  /**
   * Setup a specific provider (useful for lazy initialization)
   */
  async setupProvider(name: string, config: any): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown analytics provider: ${name}`);
    }

    if (!provider.setup) {
      throw new Error(`Provider ${name} does not support setup`);
    }

    await provider.setup(config);
  }

  /**
   * Check if a specific provider is enabled and healthy
   */
  isProviderEnabled(name: string): boolean {
    const provider = this.providers.get(name);
    return provider?.isEnabled() ?? false;
  }

  /**
   * Get health status for a specific provider
   */
  getProviderHealth(name: string): ProviderHealth | null {
    const provider = this.providers.get(name);
    return provider?.getHealth() ?? null;
  }

  /**
   * Retry failed tracks for providers that support it (mainly custom provider)
   */
  async retryFailedTracks(): Promise<void> {
    const customProvider = this.providers.get('custom') as CustomAnalyticsProvider;
    if (customProvider && customProvider.isEnabled()) {
      await customProvider.retryFailed();
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export const errorAnalytics = ErrorAnalyticsService.getInstance();

/**
 * Setup Sentry analytics provider
 */
export async function setupSentry(config: ErrorAnalyticsConfig['sentry']): Promise<void> {
  await errorAnalytics.setupProvider('sentry', config);
}

/**
 * Setup DataDog analytics provider
 */
export async function setupDataDog(config: ErrorAnalyticsConfig['datadog']): Promise<void> {
  await errorAnalytics.setupProvider('datadog', config);
}

/**
 * Setup custom analytics provider
 */
export async function setupCustomAnalytics(config: ErrorAnalyticsConfig['custom']): Promise<void> {
  await errorAnalytics.setupProvider('custom', config);
}

/**
 * Initialize error analytics with full configuration
 */
export async function initializeErrorAnalytics(config: ErrorAnalyticsConfig): Promise<void> {
  await errorAnalytics.configure(config);
}

/**
 * Get current analytics statistics and health metrics
 */
export function getAnalyticsStats() {
  return errorAnalytics.getStats();
}

/**
 * Check if a specific provider is operational
 */
export function isProviderHealthy(provider: string): boolean {
  return errorAnalytics.isProviderEnabled(provider);
}