/**
 * Logger
 *
 * Responsibility: emit structured log lines via Pino.
 * - No in-memory storage (delegated to LogBuffer)
 * - Domain helpers (logPerformance, logSecurityEvent) are thin wrappers
 *   that add a `type` discriminator so consumers can filter by intent.
 */

import pino from 'pino';
import { loggingConfig } from '../logging-config';
import { LogBuffer } from './log-buffer';

// ─── Buffer ───────────────────────────────────────────────────────────────────
// Single shared instance; imported by log-aggregator for queries.
export const logBuffer = new LogBuffer(loggingConfig);

// ─── Pino setup ───────────────────────────────────────────────────────────────

const pinoOptions: pino.LoggerOptions = {
  level: loggingConfig.level ?? 'info',
  base: {
    service: 'chanuka-server',
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (loggingConfig.pretty) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
  };
}

/** Writable stream that feeds the in-memory buffer without affecting stdout. */
const bufferStream = {
  write(msg: string) {
    logBuffer.ingest(msg);
  },
};

const baseLogger: pino.Logger =
  loggingConfig.enableInMemoryStorage && !loggingConfig.pretty
    ? pino(pinoOptions, pino.multistream([
        { stream: process.stdout },
        { stream: bufferStream },
      ]))
    : pino(pinoOptions);

// ─── Extended logger ──────────────────────────────────────────────────────────

export const logger = Object.assign(baseLogger, {
  /**
   * Log a performance measurement.
   * Adds `type: 'performance'` so aggregators can isolate perf logs.
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    baseLogger.info(
      { type: 'performance', operation, duration, ...metadata },
      `Performance: ${operation} completed in ${duration.toFixed(2)}ms`,
    );
  },

  /**
   * Log a security-relevant event.
   * Adds `type: 'security'` so SIEM exporters can filter by intent.
   */
  logSecurityEvent(event: Record<string, unknown>, message: string): void {
    baseLogger.warn({ type: 'security', ...event }, message);
  },
});

export type Logger = typeof logger;