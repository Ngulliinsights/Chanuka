/**
 * Error Analytics Service
 *
 * Service for tracking errors across multiple analytics platforms.
 * Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { AppError, ErrorAnalyticsProvider } from './types';

/**
 * Service for tracking errors across multiple analytics platforms.
 * Supports pluggable providers for flexibility.
 */
export class ErrorAnalyticsService {
  private static instance: ErrorAnalyticsService;
  private providers = new Map<string, ErrorAnalyticsProvider>();
  private isEnabled = false;

  static getInstance(): ErrorAnalyticsService {
    if (!ErrorAnalyticsService.instance) {
      ErrorAnalyticsService.instance = new ErrorAnalyticsService();
    }
    return ErrorAnalyticsService.instance;
  }

  configure(config: { 
    enabled: boolean; 
    sentry?: Record<string, unknown>; 
    datadog?: Record<string, unknown>; 
    custom?: Record<string, unknown> 
  }): void {
    this.isEnabled = config.enabled;

    // Add providers if configured
    if (config.sentry) {
      this.addProvider('sentry', {
        name: 'Sentry',
        track: async (error) => {
          // Sentry tracking would go here
          console.log('Tracking error with Sentry:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.datadog) {
      this.addProvider('datadog', {
        name: 'DataDog',
        track: async (error) => {
          // DataDog tracking would go here
          console.log('Tracking error with DataDog:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.custom) {
      this.addProvider('custom', {
        name: 'Custom Analytics',
        track: async (error) => {
          // Custom analytics tracking would go here
          console.log('Tracking error with Custom Analytics:', error);
        },
        isEnabled: () => true,
      });
    }
  }

  addProvider(name: string, provider: ErrorAnalyticsProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Tracks an error across all enabled analytics providers
   */
  async track(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    const trackPromises = Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .map(provider => 
        provider.track(error).catch(err => {
          console.error(`Analytics provider ${provider.name} failed`, {
            component: 'ErrorAnalytics',
            error: err,
            errorId: error.id,
          });
        })
      );

    await Promise.allSettled(trackPromises);
  }

  getStats() {
    return {
      enabled: this.isEnabled,
      providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
        name: key,
        enabled: provider.isEnabled(),
      })),
    };
  }
}