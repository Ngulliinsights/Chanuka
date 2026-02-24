/**
 * Safeguards Facade for Middleware
 * 
 * Provides a clean interface for middleware to access safeguards functionality
 * without directly depending on features layer.
 * 
 * This facade delegates to the actual services in features/safeguards,
 * maintaining proper layer separation while enabling middleware functionality.
 */

import { 
  cibDetectionService,
  type SuspiciousActivityContext 
} from '@server/features/safeguards/application/cib-detection-service';
import { 
  moderationService,
  type ModerationContext 
} from '@server/features/safeguards/application/moderation-service';
import { 
  rateLimitService,
  type RateLimitContext,
  type RateLimitResult 
} from '@server/features/safeguards/application/rate-limit-service';

// Re-export types for middleware convenience
export type { RateLimitContext, RateLimitResult, ModerationContext, SuspiciousActivityContext };

/**
 * Safeguards Facade
 * 
 * Provides middleware-friendly interface to safeguards services
 */
export class SafeguardsFacade {
  /**
   * Check and record rate limit atomically
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    return rateLimitService.checkAndRecordRateLimit(context);
  }

  /**
   * Queue content for moderation
   */
  async queueForModeration(context: ModerationContext) {
    return moderationService.queueForModeration(context);
  }

  /**
   * Log suspicious activity for CIB detection
   */
  async logSuspiciousActivity(context: SuspiciousActivityContext): Promise<void> {
    return cibDetectionService.logSuspiciousActivity(context);
  }
}

// Export singleton instance
export const safeguardsFacade = new SafeguardsFacade();
