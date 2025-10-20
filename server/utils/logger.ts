/**
 * LEGACY ADAPTER: Server Logger
 */

import { UnifiedLogger } from '../../shared/core/utilities/logging/unified-logger';

console.warn(
  '[DEPRECATED] server/utils/logger.ts is deprecated. ' +
  'Please import from @shared/core/utilities/logging instead.'
);

const serverLogger = UnifiedLogger.createServerLogger({
  level: process.env.LOG_LEVEL as any || 'INFO'
});

export const logger = {
  info: (message: string, meta?: any) => serverLogger.info(message, meta),
  error: (message: string, error?: Error, meta?: any) => serverLogger.error(message, error, meta),
  warn: (message: string, meta?: any) => serverLogger.warn(message, meta),
  debug: (message: string, meta?: any) => serverLogger.debug(message, meta),
  log: (message: string, meta?: any) => serverLogger.info(message, meta)
};

export default logger;
