/**
 * LEGACY ADAPTER: Server Logger
 */

import { UnifiedLogger } from '../../shared/core/src/observability/logging/logger';

console.warn(
  '[DEPRECATED] server/utils/logger.ts is deprecated. ' +
  'Please import from @shared/core/utilities/logging instead.'
);

const serverLogger = new UnifiedLogger({
  level: (process.env.LOG_LEVEL as any) || 'info'
});

export const logger = {
  info: (message: string, meta?: any) => serverLogger.info(message, undefined, meta),
  error: (message: string, error?: Error, meta?: any) => serverLogger.error(message, undefined, { error, ...meta }),
  warn: (message: string, meta?: any) => serverLogger.warn(message, undefined, meta),
  debug: (message: string, meta?: any) => serverLogger.debug(message, undefined, meta),
  log: (message: string, meta?: any) => serverLogger.info(message, undefined, meta)
};

export default logger;
