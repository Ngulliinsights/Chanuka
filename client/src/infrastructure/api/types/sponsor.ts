/**
 * Sponsor Types - CANONICAL RE-EXPORT
 *
 * Re-exports Sponsor types from the canonical source.
 * All Sponsor type definitions should import from @shared/types.
 * 
 * @module client/infrastructure/api/types/sponsor
 * @canonical @shared/types/domains/legislative/bill
 */

// ============================================================================
// Re-exports from Canonical Source
// ============================================================================

export type {
  Sponsor,
  SponsorRole,
  SponsorType,
} from '@shared/types/domains/legislative/bill';

export {
  type SponsorRole as SponsorRoleType,
  type SponsorType as SponsorTypeEnum,
} from '@shared/types';
