// ============================================================================
// ENUM DEFINITIONS - Shared across all schemas
// ============================================================================
// Centralized source of truth for all enumerated types in the system

import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// FOUNDATION & GEOGRAPHY
// ============================================================================

// Kenyan Counties (47 counties as per 2010 Constitution)
export const kenyanCountyEnum = pgEnum('kenyan_county', [
  'baringo', 'bomet', 'bungoma', 'busia', 'elgeyo_marakwet', 'embu', 'garissa',
  'homa_bay', 'isiolo', 'kajiado', 'kakamega', 'kericho', 'kiambu', 'kilifi',
  'kirinyaga', 'kisii', 'kisumu', 'kitui', 'kwale', 'laikipia', 'lamu', 'machakos',
  'makueni', 'mandera', 'marsabit', 'meru', 'migori', 'mombasa', 'muranga',
  'nairobi', 'nakuru', 'nandi', 'narok', 'nyamira', 'nyandarua', 'nyeri',
  'samburu', 'siaya', 'taita_taveta', 'tana_river', 'tharaka_nithi', 'trans_nzoia',
  'turkana', 'uasin_gishu', 'vihiga', 'wajir', 'west_pokot'
]);

// Parliamentary Chambers
export const chamberEnum = pgEnum('chamber', [
  'national_assembly', 'senate', 'county_assembly'
]);

// Political Parties (major parties + coalition logic)
// NOTE: Abbreviations standardized to lowercase with underscores for consistency
// PRODUCTION RULE: Never edit this list without versioning. Enum changes require migration.
export const partyEnum = pgEnum('political_party', [
  'uda', 'odm', 'jubilee', 'wiper', 'anc', 'ford_kenya', 'kanu',
  'independent', 'other', 'safina', 'nark_kenya', 'dap_ke', 'paa', 'mcc',  // dap_k → dap_ke (Democratic Alliance Party of Kenya)
  'udp', 'kdu', 'cck', 'kupa', 'gdcp', 'tsp'
]);

// User Roles
export const userRoleEnum = pgEnum('user_role', [
  'citizen', 'verified_citizen', 'ambassador', 'expert_verifier',
  'mp_staff', 'clerk', 'admin', 'auditor', 'journalist'
]);

// Anonymity Levels
export const anonymityLevelEnum = pgEnum('anonymity_level', [
  'public', 'verified_pseudonym', 'anonymous'
]);

// ============================================================================
// LEGISLATIVE PROCESS
// ============================================================================

export const billStatusEnum = pgEnum('bill_status', [
  'first_reading', 'second_reading', 'committee_stage', 'third_reading',
  'presidential_assent', 'gazetted', 'withdrawn', 'lost', 'enacted'
]);

export const voteTypeEnum = pgEnum('vote_type', [
  'aye', 'nay', 'abstain', 'absent'
]);

// ============================================================================
// CITIZEN ENGAGEMENT & MODERATION
// ============================================================================

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending', 'approved', 'rejected', 'flagged_for_review', 'auto_moderated'
]);

export const commentVoteTypeEnum = pgEnum('comment_vote_type', [
  'upvote', 'downvote', 'report'
]);

export const billVoteTypeEnum = pgEnum('bill_vote_type', [
  'support', 'oppose', 'amend'
]);

export const engagementTypeEnum = pgEnum('engagement_type', [
  'view', 'comment', 'vote', 'share', 'follow', 'download', 'time_spent'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'bill_update', 'comment_reply', 'vote_reminder', 'system_alert',
  'call_to_action', 'price_alert', 'accountability_report'
]);

export const severityEnum = pgEnum('severity', [
  'info', 'low', 'medium', 'high', 'critical'
]);

// ============================================================================
// MARKET INTELLIGENCE (The Bazaar / Soko Haki)
// ============================================================================

export const commodityCategoryEnum = pgEnum('commodity_category', [
  'food_security',   // Maize, Unga, Milk, Sugar
  'transport',       // Matatu fares, Fuel
  'administrative',  // Permits, Licenses, IDs
  'healthcare',      // NHIF, Medicine
  'education',       // School fees, Uniforms
  'housing',         // Rent, Utilities
  'communication',   // Data, Airtime
  'agriculture'      // Fertilizer, Seeds
]);

export const reliabilityScoreEnum = pgEnum('reliability_score', [
  'unverified',      // Crowdsourced, single source
  'low',             // Multiple unverified sources
  'medium',          // Verified ambassador report
  'high',            // Multiple verified sources
  'verified_oracle'  // Official trusted data point
]);

// ============================================================================
// ACCOUNTABILITY LEDGER (The Shadow System)
// ============================================================================

export const violationTypeEnum = pgEnum('violation_type', [
  'bribery',               // Direct extraction
  'inflated_procurement',  // Overpricing
  'ghost_project',         // Budget spent, nothing built
  'nepotism',              // Hiring unqualified kin
  'regulatory_extortion',  // Arbitrary fines
  'budget_diversion',      // Misallocated funds
  'false_promises',        // Broken campaign pledges
  'conflict_of_interest'   // Undisclosed business ties
]);

export const promiseStatusEnum = pgEnum('promise_status', [
  'pending', 'in_progress', 'fulfilled', 'broken', 'stalled', 'abandoned'
]);

export const verificationLevelEnum = pgEnum('verification_level', [
  'alleged', 'citizen_reported', 'investigated', 'substantiated', 'proven'
]);

// ============================================================================
// USER PREFERENCES & NOTIFICATIONS
// ============================================================================

export const notificationFrequencyEnum = pgEnum('notification_frequency', [
  'realtime', 'daily', 'weekly', 'never'
]);

export const digestFrequencyEnum = pgEnum('digest_frequency', [
  'daily', 'weekly', 'monthly'
]);

export const notificationLanguageEnum = pgEnum('notification_language', [
  'english', 'swahili', 'sheng'
]);

export const accessibilityFormatEnum = pgEnum('accessibility_format', [
  'standard', 'screen_reader', 'simplified_text', 'audio_summary'
]);

export const priorityEnum = pgEnum('priority', [
  'low', 'normal', 'high', 'urgent'
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending', 'sent', 'delivered', 'failed', 'bounced'
]);

export const contactTypeEnum = pgEnum('contact_type', [
  'email', 'sms', 'whatsapp', 'push'
]);

export const deviceTypeEnum = pgEnum('device_type', [
  'mobile', 'desktop', 'tablet', 'ussd'
]);

// ============================================================================
// EXPERT & SYSTEM TYPES
// ============================================================================

export const expertDomainEnum = pgEnum('expert_domain', [
  'legal', 'economic', 'environmental', 'public_health', 'education',
  'technology', 'infrastructure'
]);

export const positionEnum = pgEnum('position', [
  'for', 'against', 'neutral', 'undecided'
]);

export const courtLevelEnum = pgEnum('court_level', [
  'magistrate', 'high_court', 'court_of_appeal', 'supreme_court'
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'active', 'paused', 'completed', 'archived'
]);

export const actionTypeEnum = pgEnum('action_type', [
  'petition', 'email_mp', 'social_share', 'attend_meeting', 'submit_memoranda'
]);

export const actionStatusEnum = pgEnum('action_status', [
  'pending', 'in_progress', 'completed', 'failed'
]);

export const ambassadorStatusEnum = pgEnum('ambassador_status', [
  'active', 'inactive', 'suspended', 'pending_approval'
]);

export const sessionTypeEnum = pgEnum('session_type', [
  'web', 'mobile_app', 'ussd'
]);

export const participationMethodEnum = pgEnum('participation_method', [
  'online_form', 'email', 'physical_hearing', 'whatsapp', 'sms'
]);

// ============================================================================
// TYPE EXPORTS - TypeScript Type Safety
// ============================================================================

export type KenyanCounty = typeof kenyanCountyEnum.enumValues[number];
export type Chamber = typeof chamberEnum.enumValues[number];
export type Party = typeof partyEnum.enumValues[number];
export type UserRole = typeof userRoleEnum.enumValues[number];
export type AnonymityLevel = typeof anonymityLevelEnum.enumValues[number];
export type BillStatus = typeof billStatusEnum.enumValues[number];
export type VoteType = typeof voteTypeEnum.enumValues[number];
export type ModerationStatus = typeof moderationStatusEnum.enumValues[number];
export type CommentVoteType = typeof commentVoteTypeEnum.enumValues[number];
export type BillVoteType = typeof billVoteTypeEnum.enumValues[number];
export type EngagementType = typeof engagementTypeEnum.enumValues[number];
export type NotificationType = typeof notificationTypeEnum.enumValues[number];
export type Severity = typeof severityEnum.enumValues[number];
export type CommodityCategory = typeof commodityCategoryEnum.enumValues[number];
export type ReliabilityScore = typeof reliabilityScoreEnum.enumValues[number];
export type ViolationType = typeof violationTypeEnum.enumValues[number];
export type PromiseStatus = typeof promiseStatusEnum.enumValues[number];
export type VerificationStatus = typeof verificationLevelEnum.enumValues[number];
export type NotificationFrequency = typeof notificationFrequencyEnum.enumValues[number];
export type DigestFrequency = typeof digestFrequencyEnum.enumValues[number];
export type NotificationLanguage = typeof notificationLanguageEnum.enumValues[number];
export type AccessibilityFormat = typeof accessibilityFormatEnum.enumValues[number];
export type Priority = typeof priorityEnum.enumValues[number];
export type DeliveryStatus = typeof deliveryStatusEnum.enumValues[number];
export type ContactType = typeof contactTypeEnum.enumValues[number];
export type DeviceType = typeof deviceTypeEnum.enumValues[number];
export type ExpertDomain = typeof expertDomainEnum.enumValues[number];
export type Position = typeof positionEnum.enumValues[number];
export type CourtLevel = typeof courtLevelEnum.enumValues[number];
export type CampaignStatus = typeof campaignStatusEnum.enumValues[number];
export type ActionType = typeof actionTypeEnum.enumValues[number];
export type ActionStatus = typeof actionStatusEnum.enumValues[number];
export type AmbassadorStatus = typeof ambassadorStatusEnum.enumValues[number];
export type SessionType = typeof sessionTypeEnum.enumValues[number];
export type ParticipationMethod = typeof participationMethodEnum.enumValues[number];
