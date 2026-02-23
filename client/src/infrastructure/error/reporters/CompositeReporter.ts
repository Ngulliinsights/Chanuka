/**
 * Composite Reporter
 *
 * Coordinates multiple error reporters with configurable routing,
 * failover, and aggregation strategies.
 */

import { AppError, ErrorReporter } from '../types';

export interface ReporterConfig {
  reporter: ErrorReporter;
  enabled: boolean;
  priority: number;
  conditions?: (error: AppError) => boolean;
  weight?: number; // For load balancing
}

export interface CompositeReporterConfig {
  reporters: ReporterConfig[];
  strategy: 'parallel' | 'sequential' | 'failover' | 'weighted';
  failFast: boolean; // Stop on first failure in sequential mode
  timeout?: number; // Timeout for parallel operations
  onReporterError?: (
    reporter: ErrorReporter,
    reporterError: Error,
    originalError: AppError
  ) => void;
  onAllReportersFailed?: (
    errors: Array<{ reporter: ErrorReporter; error: Error }>,
    originalError: AppError
  ) => void;
}

export class CompositeReporter implements ErrorReporter {
  private config: Required<CompositeReporterConfig>;

  constructor(config: Partial<CompositeReporterConfig>) {
    this.config = {
      reporters: [],
      strategy: 'parallel',
      failFast: false,
      timeout: 30000,
      onReporterError: () => {},
      onAllReportersFailed: () => {},
      ...config,
    };
  }

  async report(error: AppError): Promise<void> {
    const enabledReporters = this.config.reporters
      .filter(r => r.enabled)
      .filter(r => !r.conditions || r.conditions(error))
      .sort((a, b) => a.priority - b.priority);

    if (enabledReporters.length === 0) {
      console.warn('No enabled reporters available for error:', error.id);
      return;
    }

    switch (this.config.strategy) {
      case 'parallel':
        await this.reportParallel(enabledReporters, error);
        break;
      case 'sequential':
        await this.reportSequential(enabledReporters, error);
        break;
      case 'failover':
        await this.reportFailover(enabledReporters, error);
        break;
      case 'weighted':
        await this.reportWeighted(enabledReporters, error);
        break;
    }
  }

  private async reportParallel(reporters: ReporterConfig[], error: AppError): Promise<void> {
    const promises = reporters.map(async config => {
      try {
        await config.reporter.report(error);
      } catch (reporterError) {
        this.config.onReporterError(config.reporter, reporterError as Error, error);
        throw reporterError;
      }
    });

    if (this.config.timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Composite reporter timeout')), this.config.timeout);
      });

      try {
        await Promise.race([Promise.allSettled(promises), timeoutPromise]);
      } catch (timeoutError) {
        console.error('Composite reporter timed out:', timeoutError);
      }
    } else {
      await Promise.allSettled(promises);
    }
  }

  private async reportSequential(reporters: ReporterConfig[], error: AppError): Promise<void> {
    const errors: Array<{ reporter: ErrorReporter; error: Error }> = [];

    for (const config of reporters) {
      try {
        await config.reporter.report(error);
      } catch (reporterError) {
        const reporterErr = reporterError as Error;
        errors.push({ reporter: config.reporter, error: reporterErr });
        this.config.onReporterError(config.reporter, reporterErr, error);

        if (this.config.failFast) {
          break;
        }
      }
    }

    if (errors.length === reporters.length) {
      this.config.onAllReportersFailed(errors, error);
    }
  }

  private async reportFailover(reporters: ReporterConfig[], error: AppError): Promise<void> {
    for (const config of reporters) {
      try {
        await config.reporter.report(error);
        return; // Success, stop trying other reporters
      } catch (reporterError) {
        this.config.onReporterError(config.reporter, reporterError as Error, error);
        // Continue to next reporter
      }
    }

    // All reporters failed
    this.config.onAllReportersFailed(
      reporters.map(config => ({
        reporter: config.reporter,
        error: new Error('Reporter failed'),
      })),
      error
    );
  }

  private async reportWeighted(reporters: ReporterConfig[], error: AppError): Promise<void> {
    // Calculate total weight
    const totalWeight = reporters.reduce((sum, r) => sum + (r.weight || 1), 0);

    // Select reporters based on weight (simple random selection)
    const selectedReporters: ReporterConfig[] = [];
    let remainingWeight = Math.random() * totalWeight;

    for (const reporter of reporters) {
      remainingWeight -= reporter.weight || 1;
      if (remainingWeight <= 0) {
        selectedReporters.push(reporter);
        break; // Select only one for weighted strategy
      }
    }

    if (selectedReporters.length > 0) {
      try {
        await selectedReporters[0].reporter.report(error);
      } catch (reporterError) {
        this.config.onReporterError(selectedReporters[0].reporter, reporterError as Error, error);
        throw reporterError;
      }
    }
  }

  addReporter(
    reporter: ErrorReporter,
    options: Partial<Omit<ReporterConfig, 'reporter'>> = {}
  ): void {
    this.config.reporters.push({
      reporter,
      enabled: true,
      priority: 0,
      weight: 1,
      ...options,
    });
  }

  removeReporter(reporter: ErrorReporter): boolean {
    const index = this.config.reporters.findIndex(r => r.reporter === reporter);
    if (index >= 0) {
      this.config.reporters.splice(index, 1);
      return true;
    }
    return false;
  }

  enableReporter(reporter: ErrorReporter): boolean {
    const config = this.config.reporters.find(r => r.reporter === reporter);
    if (config) {
      config.enabled = true;
      return true;
    }
    return false;
  }

  disableReporter(reporter: ErrorReporter): boolean {
    const config = this.config.reporters.find(r => r.reporter === reporter);
    if (config) {
      config.enabled = false;
      return true;
    }
    return false;
  }

  updateReporterConfig(
    reporter: ErrorReporter,
    updates: Partial<Omit<ReporterConfig, 'reporter'>>
  ): boolean {
    const config = this.config.reporters.find(r => r.reporter === reporter);
    if (config) {
      Object.assign(config, updates);
      return true;
    }
    return false;
  }

  getReporters(): ReporterConfig[] {
    return [...this.config.reporters];
  }

  getEnabledReporters(): ReporterConfig[] {
    return this.config.reporters.filter(r => r.enabled);
  }

  updateConfig(config: Partial<CompositeReporterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    // Clean up any resources if needed
    this.config.reporters = [];
  }
}
