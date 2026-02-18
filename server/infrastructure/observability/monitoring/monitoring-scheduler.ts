/**
 * Monitoring Scheduler
 *
 * Responsibility: own the interval lifecycle for recurring monitoring tasks.
 * All thresholds and intervals come from monitoring-policy — none are
 * hard-coded here. Task implementations are injected or imported; the
 * scheduler has no opinion about what the tasks do.
 */

import { schemaValidationService } from '../../core/validation/schema-validation-service';
import { logger } from '../core/logger';
import {
  INTERVALS,
  MEMORY_WARN_BYTES,
} from './monitoring-policy';

const COMPONENT = 'MonitoringScheduler';

export class MonitoringScheduler {
  private readonly tasks = new Map<string, NodeJS.Timeout>();
  private running = false;

  /** Start all built-in monitoring tasks. */
  start(): void {
    if (this.running) {
      logger.warn({
        component: COMPONENT,
      }, 'MonitoringScheduler already running — ignoring duplicate start');
      return;
    }

    this.running = true;
    logger.info({ component: COMPONENT }, 'MonitoringScheduler started');

    this.register('health-check', this.healthCheckTask, INTERVALS.HEALTH_CHECK);
    this.register('memory-monitor', this.memoryMonitorTask, INTERVALS.MEMORY_MONITOR);
    this.register('schema-validation', this.schemaValidationTask, INTERVALS.SCHEMA_VALIDATION);
  }

  /** Alias for start() — satisfies the initialize() call-site convention. */
  initialize(): void {
    this.start();
  }

  /** Stop all running tasks and reset state. */
  stop(): void {
    if (!this.running) return;

    for (const [name, handle] of this.tasks) {
      clearInterval(handle);
      logger.debug({ component: COMPONENT, task: name }, 'Stopped monitoring task');
    }

    this.tasks.clear();
    this.running = false;
    logger.info({ component: COMPONENT }, 'MonitoringScheduler stopped');
  }

  /**
   * Register a named recurring task.
   * Replaces any existing task with the same name.
   */
  register(name: string, task: () => void | Promise<void>, intervalMs: number): void {
    if (this.tasks.has(name)) {
      clearInterval(this.tasks.get(name)!);
      logger.warn({ component: COMPONENT, task: name }, 'Replacing existing monitoring task');
    }

    const handle = setInterval(() => {
      Promise.resolve()
        .then(() => task())
        .catch((err: unknown) => {
          logger.error({
            component: COMPONENT,
            task: name,
            error: err instanceof Error ? err.message : String(err),
          }, 'Scheduled task threw an unhandled error');
        });
    }, intervalMs);

    this.tasks.set(name, handle);
    logger.info({ component: COMPONENT, task: name, intervalMs }, 'Monitoring task registered');
  }

  /** Deregister and stop a named task. */
  unregister(name: string): void {
    const handle = this.tasks.get(name);
    if (!handle) return;
    clearInterval(handle);
    this.tasks.delete(name);
    logger.info({ component: COMPONENT, task: name }, 'Monitoring task unregistered');
  }

  // ─── Built-in task implementations ────────────────────────────────────────
  // Defined as arrow functions so `this` is always the class instance.

  private readonly healthCheckTask = (): void => {
    logger.debug({
      component: COMPONENT,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }, 'Scheduled health check');
  };

  private readonly memoryMonitorTask = (): void => {
    const usage      = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const warnMB     = Math.round(MEMORY_WARN_BYTES / 1024 / 1024);

    if (usage.heapUsed > MEMORY_WARN_BYTES) {
      logger.warn({
        component: COMPONENT,
        heapUsedMB,
        thresholdMB: warnMB,
        usage,
      }, 'High memory usage detected');
    } else {
      logger.debug({
        component: COMPONENT,
        heapUsedMB,
        thresholdMB: warnMB,
      }, 'Memory usage within limits');
    }
  };

  private readonly schemaValidationTask = async (): Promise<void> => {
    logger.debug({ component: COMPONENT }, 'Running periodic schema validation');

    const report = await schemaValidationService.generateValidationReport();

    if (report.criticalIssues > 0) {
      logger.error({
        component: COMPONENT,
        criticalIssues: report.criticalIssues,
        totalIssues: report.totalIssues,
        overallStatus: report.overallStatus,
        recommendations: report.recommendations,
      }, 'Critical schema validation issues detected');
    } else if (report.totalIssues > 0) {
      logger.warn({
        component: COMPONENT,
        totalIssues: report.totalIssues,
        overallStatus: report.overallStatus,
        recommendations: report.recommendations,
      }, 'Schema validation issues detected');
    } else {
      logger.debug({
        component: COMPONENT,
        validatedTables: report.validatedTables,
        overallStatus: report.overallStatus,
      }, 'Schema validation passed');
    }
  };
}

export const monitoringScheduler = new MonitoringScheduler();