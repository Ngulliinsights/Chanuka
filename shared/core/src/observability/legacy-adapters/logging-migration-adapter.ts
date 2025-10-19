/**
 * Migration adapter for legacy logging system
 * 
 * This adapter provides backward compatibility during the migration from
 * shared/core/src/logging to shared/core/src/observability/logging
 * 
 * @deprecated This adapter is temporary and will be removed after migration is complete
 */

import { logger as modernLogger } from '../logging/logger';
import type { LogContext } from '../logging/types';

/**
 * Legacy logger interface compatibility
 */
export class LegacyLoggerAdapter {
  /**
   * @deprecated Use modernLogger.info() directly
   */
  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    modernLogger.info(message, context, metadata);
  }

  /**
   * @deprecated Use modernLogger.error() directly
   */
  error(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    modernLogger.error(message, context, metadata);
  }

  /**
   * @deprecated Use modernLogger.warn() directly
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    modernLogger.warn(message, context, metadata);
  }

  /**
   * @deprecated Use modernLogger.debug() directly
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    modernLogger.debug(message, context, metadata);
  }

  /**
   * @deprecated Use modernLogger.trace() directly
   */
  trace(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    modernLogger.trace(message, context, metadata);
  }

  /**
   * Legacy log method for backward compatibility
   * @deprecated Use level-specific methods instead
   */
  log(obj: object | string, msg?: string, ...args: any[]): void {
    if (typeof obj === 'string') {
      modernLogger.info(obj, undefined, { args: [msg, ...args] });
    } else {
      modernLogger.info(msg || 'Log entry', undefined, { data: obj, args });
    }
  }
}

/**
 * Legacy logger instance for backward compatibility
 * @deprecated Import { logger } from '../observability/logging' instead
 */
export const legacyLogger = new LegacyLoggerAdapter();

/**
 * Re-export modern logger as the primary export
 */
export { logger } from '../logging/logger';
export default modernLogger;




































