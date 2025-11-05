// ============================================================================
// ENUM DEFINITIONS - Shared across all schemas
// ============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

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

// Political Parties (major parties in Kenya)
export const partyEnum = pgEnum('party', [
  'jubilee', 'oda', 'wiper', 'kenya_kwanza', 'azimio', 'independent', 'other'
]);

// Bill Status Lifecycle
export const billStatusEnum = pgEnum('bill_status', [
  'drafted', 'introduced', 'first_reading', 'second_reading', 'committee_stage',
  'report_stage', 'third_reading', 'presidential_assent', 'act_of_parliament',
  'withdrawn', 'lapsed'
]);

// User Roles
export const userRoleEnum = pgEnum('user_role', [
  'citizen', 'admin', 'moderator', 'expert', 'ambassador', 'organizer'
]);

// Anonymity Levels
export const anonymityLevelEnum = pgEnum('anonymity_level', [
  'public',        // Full name and details visible
  'pseudonymous',  // Display name only, no real name
  'anonymous',     // Auto-generated anonymous ID only
  'private'        // Participation tracked but not visible publicly
]);

// Verification Status
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending', 'verified', 'disputed', 'false', 'outdated'
]);

// Moderation Status
export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending', 'approved', 'rejected', 'flagged', 'under_review'
]);

// Comment Vote Types
export const commentVoteTypeEnum = pgEnum('comment_vote_type', [
  'upvote', 'downvote'
]);

// Bill Vote Types
export const billVoteTypeEnum = pgEnum('bill_vote_type', [
  'for', 'against', 'abstain'
]);

// Engagement Types
export const engagementTypeEnum = pgEnum('engagement_type', [
  'view', 'comment', 'vote', 'share', 'track', 'report'
]);

// Notification Types
export const notificationTypeEnum = pgEnum('notification_type', [
  'bill_update', 'comment_reply', 'milestone', 'campaign_update', 'moderation_action'
]);

// Severity Levels
export const severityEnum = pgEnum('severity', [
  'low', 'medium', 'high', 'critical'
]);

// Court Levels
export const courtLevelEnum = pgEnum('court_level', [
  'supreme', 'appeal', 'high', 'magistrate', 'tribunal'
]);

// Campaign Status
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'active', 'paused', 'completed', 'cancelled'
]);

// Action Types for Advocacy Campaigns
export const actionTypeEnum = pgEnum('action_type', [
  'call_mp', 'submit_testimony', 'share_social', 'attend_hearing', 
  'organize_event', 'petition', 'email_campaign', 'community_meeting'
]);

// Action Status
export const actionStatusEnum = pgEnum('action_status', [
  'active', 'paused', 'completed', 'cancelled', 'archived'
]);

// Ambassador Status
export const ambassadorStatusEnum = pgEnum('ambassador_status', [
  'pending', 'active', 'inactive', 'suspended', 'certified'
]);

// Session Types for Facilitation
export const sessionTypeEnum = pgEnum('session_type', [
  'bill_discussion', 'civic_education', 'registration_drive', 'community_forum',
  'workshop', 'consultation', 'awareness_campaign'
]);

// Participation Methods
export const participationMethodEnum = pgEnum('participation_method', [
  'sms', 'ussd', 'voice', 'mobile_app', 'web', 'offline', 'hybrid'
]);

// Additional enums for advanced features
export const electoralCycleTypeEnum = pgEnum('electoral_cycle_type', [
  'general', 'by_election', 'referendum', 'local'
]);

export const disinformationTacticEnum = pgEnum('disinformation_tactic', [
  'astroturfing', 'bot_networks', 'coordinated_harassment', 
  'false_narratives', 'deepfakes', 'manipulation'
]);

export const influenceChannelEnum = pgEnum('influence_channel', [
  'diplomatic', 'economic', 'cultural', 'military', 'informational', 'technological'
]);

export const mediaTypeEnum = pgEnum('media_type', [
  'newspaper', 'tv', 'radio', 'online', 'social_media', 'podcast'
]);

export const organizationTypeEnum = pgEnum('organization_type', [
  'ngo', 'cbo', 'faith_based', 'professional_association', 'union', 'think_tank'
]);

export const riskCategoryEnum = pgEnum('risk_category', [
  'legislative', 'executive', 'judicial', 'social', 'economic', 'technological', 'international'
]);

// Export all enums for use in schemas
export type KenyanCounty = typeof kenyanCountyEnum.enumValues[number];
export type Chamber = typeof chamberEnum.enumValues[number];
export type Party = typeof partyEnum.enumValues[number];
export type BillStatus = typeof billStatusEnum.enumValues[number];
export type UserRole = typeof userRoleEnum.enumValues[number];
export type VerificationStatus = typeof verificationStatusEnum.enumValues[number];
export type ModerationStatus = typeof moderationStatusEnum.enumValues[number];
export type CommentVoteType = typeof commentVoteTypeEnum.enumValues[number];
export type BillVoteType = typeof billVoteTypeEnum.enumValues[number];
export type EngagementType = typeof engagementTypeEnum.enumValues[number];
export type NotificationType = typeof notificationTypeEnum.enumValues[number];
export type Severity = typeof severityEnum.enumValues[number];
export type CourtLevel = typeof courtLevelEnum.enumValues[number];
export type CampaignStatus = typeof campaignStatusEnum.enumValues[number];
export type ActionType = typeof actionTypeEnum.enumValues[number];
export type ActionStatus = typeof actionStatusEnum.enumValues[number];
export type AmbassadorStatus = typeof ambassadorStatusEnum.enumValues[number];
export type SessionType = typeof sessionTypeEnum.enumValues[number];
export type ParticipationMethod = typeof participationMethodEnum.enumValues[number];