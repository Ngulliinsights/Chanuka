/**
 * Advocacy Feature - Constants
 * 
 * Shared constants for advocacy feature
 * Used by both client and server
 */

// ============================================================================
// Campaign Types
// ============================================================================

export const CAMPAIGN_TYPES = {
  PETITION: 'petition',
  CALL_TO_ACTION: 'call_to_action',
  LETTER_WRITING: 'letter_writing',
  SOCIAL_MEDIA: 'social_media',
  GRASSROOTS: 'grassroots',
} as const;

export const CAMPAIGN_TYPE_LABELS = {
  [CAMPAIGN_TYPES.PETITION]: 'Petition',
  [CAMPAIGN_TYPES.CALL_TO_ACTION]: 'Call to Action',
  [CAMPAIGN_TYPES.LETTER_WRITING]: 'Letter Writing',
  [CAMPAIGN_TYPES.SOCIAL_MEDIA]: 'Social Media Campaign',
  [CAMPAIGN_TYPES.GRASSROOTS]: 'Grassroots Movement',
} as const;

// ============================================================================
// Campaign Status
// ============================================================================

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export const CAMPAIGN_STATUS_LABELS = {
  [CAMPAIGN_STATUS.DRAFT]: 'Draft',
  [CAMPAIGN_STATUS.ACTIVE]: 'Active',
  [CAMPAIGN_STATUS.PAUSED]: 'Paused',
  [CAMPAIGN_STATUS.COMPLETED]: 'Completed',
  [CAMPAIGN_STATUS.ARCHIVED]: 'Archived',
} as const;

export const CAMPAIGN_STATUS_COLORS = {
  [CAMPAIGN_STATUS.DRAFT]: 'gray',
  [CAMPAIGN_STATUS.ACTIVE]: 'green',
  [CAMPAIGN_STATUS.PAUSED]: 'yellow',
  [CAMPAIGN_STATUS.COMPLETED]: 'blue',
  [CAMPAIGN_STATUS.ARCHIVED]: 'gray',
} as const;

// ============================================================================
// Action Types
// ============================================================================

export const ACTION_TYPES = {
  SIGN_PETITION: 'sign_petition',
  CALL_REPRESENTATIVE: 'call_representative',
  SEND_EMAIL: 'send_email',
  SHARE_SOCIAL: 'share_social',
  ATTEND_EVENT: 'attend_event',
  DONATE: 'donate',
} as const;

export const ACTION_TYPE_LABELS = {
  [ACTION_TYPES.SIGN_PETITION]: 'Sign Petition',
  [ACTION_TYPES.CALL_REPRESENTATIVE]: 'Call Representative',
  [ACTION_TYPES.SEND_EMAIL]: 'Send Email',
  [ACTION_TYPES.SHARE_SOCIAL]: 'Share on Social Media',
  [ACTION_TYPES.ATTEND_EVENT]: 'Attend Event',
  [ACTION_TYPES.DONATE]: 'Donate',
} as const;

// ============================================================================
// Campaign Limits
// ============================================================================

export const CAMPAIGN_LIMITS = {
  MIN_TITLE_LENGTH: 5,
  MAX_TITLE_LENGTH: 200,
  MIN_DESCRIPTION_LENGTH: 20,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS: 20,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// Campaign Defaults
// ============================================================================

export const CAMPAIGN_DEFAULTS = {
  INCLUDE_ACTIONS: true,
  INCLUDE_STATS: true,
  INCLUDE_DEMOGRAPHICS: false,
  PAGE: 1,
  LIMIT: 20,
} as const;
