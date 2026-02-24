/**
 * Safeguards Infrastructure
 * 
 * Provides infrastructure-level access to safeguards functionality
 * for use by middleware and other infrastructure components.
 */

export {
  SafeguardsFacade,
  safeguardsFacade,
  type RateLimitContext,
  type RateLimitResult,
  type ModerationContext,
  type SuspiciousActivityContext
} from './safeguards-facade';
