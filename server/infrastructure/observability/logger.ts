import pino from 'pino';
import { loggingConfig } from './logging-config';

// ============================================================================
// Server Logger — Pino-based, replacing deleted @shared/core logger
// ============================================================================

// In-memory log buffer for aggregation (used by log-aggregator.ts)
const MAX_STORED_LOGS = loggingConfig.maxStoredLogs || 1000;
const logBuffer: Array<Record<string, unknown>> = [];

function pushToBuffer(entry: Record<string, unknown>) {
  if (!loggingConfig.enableInMemoryStorage) return;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_STORED_LOGS) {
    logBuffer.shift();
  }
}

// Build Pino options — avoid `transport: undefined` (exactOptionalPropertyTypes)
const pinoOptions: pino.LoggerOptions = {
  level: loggingConfig.level || 'info',
  base: {
    service: 'chanuka-server',
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (loggingConfig.pretty) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

// Custom writable stream for in-memory buffering
const memoryStream = {
  write(msg: string) {
    try {
      const parsed = JSON.parse(msg);
      parsed.timestamp = new Date(parsed.time || Date.now());
      pushToBuffer(parsed);
    } catch {
      // ignore parse errors
    }
  },
};

// Create logger — use multistream for in-memory buffering when not pretty-printing
const baseLogger: pino.Logger =
  loggingConfig.enableInMemoryStorage && !loggingConfig.pretty
    ? pino(pinoOptions, pino.multistream([
        { stream: process.stdout },
        { stream: memoryStream },
      ]))
    : pino(pinoOptions);

// ============================================================================
// Extended logger with domain-specific helpers
// ============================================================================

export const logger = Object.assign(baseLogger, {
  /** Log a performance measurement */
  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>) {
    baseLogger.info(
      { type: 'performance', operation, duration, ...metadata },
      `Performance: ${operation} completed in ${duration.toFixed(2)}ms`,
    );
  },

  /** Log a security event */
  logSecurityEvent(event: Record<string, unknown>, message: string) {
    baseLogger.warn({ type: 'security', ...event }, message);
  },

  /** Query buffered logs within a time range (for log-aggregator) */
  queryLogs(options: { timeRange: { start: Date; end: Date } }) {
    if (!loggingConfig.enableInMemoryStorage) return [];
    return logBuffer.filter((log) => {
      const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.time as number);
      return t >= options.timeRange.start && t <= options.timeRange.end;
    });
  },
});

export type Logger = typeof logger;
