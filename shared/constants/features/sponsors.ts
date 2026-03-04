/**
 * Sponsors Feature - Constants
 * 
 * Shared constants for sponsors feature
 * Used by both client and server
 */

// ============================================================================
// Sponsor Types
// ============================================================================

export const SPONSOR_TYPES = {
  PRIMARY: 'primary',
  CO_SPONSOR: 'co_sponsor',
  SUPPORTER: 'supporter',
} as const;

export const SPONSOR_TYPE_LABELS = {
  [SPONSOR_TYPES.PRIMARY]: 'Primary Sponsor',
  [SPONSOR_TYPES.CO_SPONSOR]: 'Co-Sponsor',
  [SPONSOR_TYPES.SUPPORTER]: 'Supporter',
} as const;

// ============================================================================
// Sponsor Roles
// ============================================================================

export const SPONSOR_ROLES = {
  LEGISLATOR: 'legislator',
  SENATOR: 'senator',
  REPRESENTATIVE: 'representative',
  COMMITTEE_MEMBER: 'committee_member',
} as const;

export const SPONSOR_ROLE_LABELS = {
  [SPONSOR_ROLES.LEGISLATOR]: 'Legislator',
  [SPONSOR_ROLES.SENATOR]: 'Senator',
  [SPONSOR_ROLES.REPRESENTATIVE]: 'Representative',
  [SPONSOR_ROLES.COMMITTEE_MEMBER]: 'Committee Member',
} as const;

// ============================================================================
// Sponsor Limits
// ============================================================================

export const SPONSOR_LIMITS = {
  MIN_QUERY_LENGTH: 1,
  MAX_QUERY_LENGTH: 200,
  MAX_STATUS_LENGTH: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// Sponsor Defaults
// ============================================================================

export const SPONSOR_DEFAULTS = {
  INCLUDE_BILLS: true,
  INCLUDE_VOTING_RECORD: false,
  PAGE: 1,
  LIMIT: 20,
} as const;
