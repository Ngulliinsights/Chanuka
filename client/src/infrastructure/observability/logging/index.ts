/**
 * Logging Sub-module (Observability)
 * 
 * Re-exports the core logging utility for infrastructure-wide use.
 * This facade allows for future enhancements (e.g., logging to external services)
 * without changing consumer code.
 */

import { logger } from '@client/lib/utils/logger';

export { logger };
export default logger;

// Export types for convenience
export type { LogContext, Logger, ExtendedLogger } from '@client/lib/utils/logger';
