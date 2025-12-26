import { schemaValidationService } from '@server/core/validation/schema-validation-service.ts';
import { logger  } from '@shared/core';

export class MonitoringScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  initialize() {
    this.start();
  }

  start() {
    if (this.isRunning) {
      logger.warn('Monitoring scheduler already running', { component: 'Chanuka' });
      return;
    }

    this.isRunning = true;
    logger.info('Monitoring scheduler started', { component: 'Chanuka' });

    // Schedule basic health checks every 5 minutes
    this.schedule('health-check', () => {
      logger.debug('Scheduled health check', { 
        component: 'Chanuka',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    }, 5 * 60 * 1000);

    // Schedule memory monitoring every minute
    this.schedule('memory-monitor', () => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

      if (heapUsedMB > 500) {
        logger.warn('High memory usage detected', {
          component: 'Chanuka',
          heapUsedMB,
          usage
        });
      }
    }, 60 * 1000);

    // Schedule schema validation monitoring every 30 minutes
    this.schedule('schema-validation', async () => {
      try {
        logger.debug('Running periodic schema validation check', { component: 'Chanuka' });

        const report = await schemaValidationService.generateValidationReport();

        if (report.criticalIssues > 0) {
          logger.error('Critical schema validation issues detected', {
            component: 'Chanuka',
            criticalIssues: report.criticalIssues,
            totalIssues: report.totalIssues,
            overallStatus: report.overallStatus,
            recommendations: report.recommendations
          });
        } else if (report.totalIssues > 0) {
          logger.warn('Schema validation issues detected', {
            component: 'Chanuka',
            totalIssues: report.totalIssues,
            overallStatus: report.overallStatus,
            recommendations: report.recommendations
          });
        } else {
          logger.debug('Schema validation passed', {
            component: 'Chanuka',
            validatedTables: report.validatedTables,
            overallStatus: report.overallStatus
          });
        }
      } catch (error) {
        logger.error('Periodic schema validation failed', {
          component: 'Chanuka',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      logger.debug('Stopped monitoring task', { component: 'Chanuka', task: name });
    });

    this.intervals.clear();
    this.isRunning = false;
    logger.info('Monitoring scheduler stopped', { component: 'Chanuka' });
  }

  schedule(name: string, task: () => void, intervalMs: number) {
    if (this.intervals.has(name)) {
      logger.warn('Task already scheduled, replacing', { component: 'Chanuka', task: name });
      clearInterval(this.intervals.get(name)!);
    }

    const interval = setInterval(() => {
      try {
        task();
      } catch (error) {
        logger.error('Scheduled task failed', {
          component: 'Chanuka',
          task: name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);

    this.intervals.set(name, interval);
    logger.info('Monitoring task scheduled', { 
      component: 'Chanuka', 
      task: name, 
      intervalMs 
    });
  }

  unschedule(name: string) {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      logger.info('Monitoring task unscheduled', { component: 'Chanuka', task: name });
    }
  }
}

export const monitoringScheduler = new MonitoringScheduler();

