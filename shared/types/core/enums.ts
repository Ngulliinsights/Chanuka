/**
 * Core Enums - Single Source of Truth
 * All enums used across multiple layers are defined here
 * 
 * IMPORTANT: This is the canonical location for shared enums.
 * Do not redefine these enums in other files.
 * 
 * This file consolidates all enum definitions from across the codebase.
 * Server schema (Drizzle pgEnum) should mirror these values exactly.
 */

// ============================================================================
// User & Authentication Enums
// ============================================================================

/**
 * User role in the system - Platform access levels
 * Determines access permissions and capabilities
 * 
 * Consolidated from multiple sources to provide comprehensive role system
 * for the Kenyan legislative platform
 */
export enum UserRole {
  /** Public user - read-only access */
  Public = 'public',
  /** Registered citizen - can comment and vote */
  Citizen = 'citizen',
  /** Verified citizen with enhanced privileges */
  VerifiedCitizen = 'verified_citizen',
  /** Ambassador - community representative */
  Ambassador = 'ambassador',
  /** Expert user - can provide expert analysis */
  Expert = 'expert',
  /** Expert verifier - can verify expert credentials */
  ExpertVerifier = 'expert_verifier',
  /** MP staff member */
  MpStaff = 'mp_staff',
  /** Parliamentary clerk */
  Clerk = 'clerk',
  /** Moderator - can moderate content */
  Moderator = 'moderator',
  /** Administrator - full system access */
  Admin = 'admin',
  /** Auditor - can audit system activities */
  Auditor = 'auditor',
  /** Journalist - media access */
  Journalist = 'journalist',
}

/**
 * User account status
 */
export enum UserStatus {
  /** Account is active and in good standing */
  Active = 'active',
  /** Account is temporarily inactive */
  Inactive = 'inactive',
  /** Account is suspended due to violations */
  Suspended = 'suspended',
  /** Account is pending verification */
  Pending = 'pending',
}

/**
 * Verification status for user identity
 */
export enum VerificationStatus {
  /** Not verified */
  Unverified = 'unverified',
  /** Verification pending */
  Pending = 'pending',
  /** Verification in progress */
  InProgress = 'in_progress',
  /** Needs review */
  NeedsReview = 'needs_review',
  /** Successfully verified */
  Verified = 'verified',
  /** Approved (alias for Verified) */
  Approved = 'approved',
  /** Verification failed */
  Failed = 'failed',
  /** Verification rejected */
  Rejected = 'rejected',
  /** Verification disputed */
  Disputed = 'disputed',
}

/**
 * Anonymity level for user actions
 */
export enum AnonymityLevel {
  /** Full identity visible */
  Public = 'public',
  /** Verified pseudonym */
  VerifiedPseudonym = 'verified_pseudonym',
  /** Full anonymity */
  Anonymous = 'anonymous',
}

// ============================================================================
// Legislative Enums
// ============================================================================

/**
 * Bill status in the legislative process
 * 
 * Follows the actual Kenyan parliamentary procedure:
 * 1. First Reading - Introduction and title reading
 * 2. Second Reading - Debate on general principles
 * 3. Committee Stage - Detailed examination clause by clause
 * 4. Third Reading - Final debate and vote
 * 5. Presidential Assent - Approval by the President
 * 6. Gazetted - Published in the Kenya Gazette
 */
export enum BillStatus {
  /** Bill is in draft state */
  Draft = 'draft',
  /** Bill has been introduced */
  Introduced = 'introduced',
  /** First Reading - Introduction and title reading */
  FirstReading = 'first_reading',
  /** Second Reading - Debate on general principles */
  SecondReading = 'second_reading',
  /** Bill is in committee review */
  InCommittee = 'in_committee',
  /** Committee Stage - Detailed examination clause by clause */
  CommitteeStage = 'committee_stage',
  /** Third Reading - Final debate and vote */
  ThirdReading = 'third_reading',
  /** Bill is scheduled for floor vote */
  ScheduledForVote = 'scheduled_for_vote',
  /** Bill passed in one chamber */
  Passed = 'passed',
  /** Presidential Assent - Approval by the President */
  PresidentialAssent = 'presidential_assent',
  /** Bill became law */
  Enacted = 'enacted',
  /** Gazetted - Published in the Kenya Gazette */
  Gazetted = 'gazetted',
  /** Bill was rejected */
  Rejected = 'rejected',
  /** Bill was lost */
  Lost = 'lost',
  /** Bill was vetoed */
  Vetoed = 'vetoed',
  /** Bill is withdrawn */
  Withdrawn = 'withdrawn',
}

/**
 * Legislative chamber - Kenyan Bicameral System
 */
export enum Chamber {
  /** National Assembly */
  NationalAssembly = 'national_assembly',
  /** Senate */
  Senate = 'senate',
  /** County Assembly */
  CountyAssembly = 'county_assembly',
  /** Both chambers (bicameral) */
  Both = 'both',
}

/**
 * Bill type classification
 */
export enum BillType {
  /** Public bill */
  Public = 'public',
  /** Private bill */
  Private = 'private',
  /** Money bill */
  Money = 'money',
  /** Constitutional amendment */
  Constitutional = 'constitutional',
}

/**
 * Committee status for bill review
 */
export enum CommitteeStatus {
  /** Assigned to committee */
  Assigned = 'assigned',
  /** Under review */
  Reviewed = 'reviewed',
  /** Reported out of committee */
  Reported = 'reported',
  /** Committee work completed */
  Completed = 'completed',
}

// ============================================================================
// Engagement & Interaction Enums
// ============================================================================

/**
 * Vote type - Parliamentary voting
 */
export enum VoteType {
  /** Vote in favor (Aye) */
  Aye = 'aye',
  /** Vote against (Nay) */
  Nay = 'nay',
  /** Abstain from voting */
  Abstain = 'abstain',
  /** Absent from vote */
  Absent = 'absent',
}

/**
 * Argument Position - Stance on a bill
 */
export enum ArgumentPosition {
  /** Support the bill */
  Support = 'support',
  /** Oppose the bill */
  Oppose = 'oppose',
  /** Neutral stance */
  Neutral = 'neutral',
  /** Conditional support/opposition */
  Conditional = 'conditional',
}

/**
 * Bill Vote Type - Citizen voting on bills
 */
export enum BillVoteType {
  /** Support the bill */
  Support = 'support',
  /** Oppose the bill */
  Oppose = 'oppose',
  /** Suggest amendments */
  Amend = 'amend',
}

/**
 * Comment status
 */
export enum CommentStatus {
  /** Comment is active */
  Active = 'active',
  /** Comment is flagged for review */
  Flagged = 'flagged',
  /** Comment is hidden */
  Hidden = 'hidden',
  /** Comment is deleted */
  Deleted = 'deleted',
}

/**
 * Moderation Status - Content moderation states
 */
export enum ModerationStatus {
  /** Pending moderation */
  Pending = 'pending',
  /** Approved by moderator */
  Approved = 'approved',
  /** Rejected by moderator */
  Rejected = 'rejected',
  /** Flagged for review */
  FlaggedForReview = 'flagged_for_review',
  /** Auto-moderated by system */
  AutoModerated = 'auto_moderated',
}

/**
 * Notification type
 */
export enum NotificationType {
  /** Bill update notification */
  BillUpdate = 'bill_update',
  /** Comment reply notification */
  CommentReply = 'comment_reply',
  /** Vote reminder notification */
  VoteReminder = 'vote_reminder',
  /** System alert notification */
  SystemAlert = 'system_alert',
  /** Call to action notification */
  CallToAction = 'call_to_action',
  /** Price alert notification */
  PriceAlert = 'price_alert',
  /** Accountability report notification */
  AccountabilityReport = 'accountability_report',
}

/**
 * Notification channel
 */
export enum NotificationChannel {
  /** Email notification */
  Email = 'email',
  /** SMS notification */
  Sms = 'sms',
  /** Push notification */
  Push = 'push',
  /** In-app notification */
  InApp = 'in_app',
}

// ============================================================================
// System & UI Enums
// ============================================================================

/**
 * Loading state
 */
export enum LoadingState {
  /** Not loading */
  Idle = 'idle',
  /** Currently loading */
  Loading = 'loading',
  /** Successfully loaded */
  Success = 'success',
  /** Failed to load */
  Error = 'error',
}

/**
 * Component size variants
 */
export enum Size {
  /** Small size */
  Small = 'sm',
  /** Medium size */
  Medium = 'md',
  /** Large size */
  Large = 'lg',
}

/**
 * Component visual variants
 */
export enum Variant {
  /** Primary variant */
  Primary = 'primary',
  /** Secondary variant */
  Secondary = 'secondary',
  /** Outline variant */
  Outline = 'outline',
  /** Ghost variant */
  Ghost = 'ghost',
}

/**
 * Theme mode
 */
export enum Theme {
  /** Light theme */
  Light = 'light',
  /** Dark theme */
  Dark = 'dark',
  /** Auto theme (system preference) */
  Auto = 'auto',
}

// ============================================================================
// Priority & Classification Enums
// ============================================================================

/**
 * Urgency Level - Bill urgency classification
 */
export enum UrgencyLevel {
  /** Low urgency */
  Low = 'low',
  /** Medium urgency */
  Medium = 'medium',
  /** High urgency */
  High = 'high',
  /** Critical urgency */
  Critical = 'critical',
}

/**
 * Complexity Level - Bill complexity classification
 */
export enum ComplexityLevel {
  /** Low complexity */
  Low = 'low',
  /** Medium complexity */
  Medium = 'medium',
  /** High complexity */
  High = 'high',
  /** Expert level complexity */
  Expert = 'expert',
}

// ============================================================================
// Error Classification Enums
// ============================================================================
// Error Types
// ============================================================================
// Note: ErrorClassification is now in core/errors.ts to avoid duplication

/**
 * Numeric error codes for specific error types
 * Note: For string-based error codes, use ErrorCode type from constants
 */
export enum NumericErrorCode {
  // Validation errors (1000-1999)
  VALIDATION_FAILED = 1000,
  INVALID_INPUT = 1001,
  MISSING_REQUIRED_FIELD = 1002,
  INVALID_FORMAT = 1003,
  
  // Authorization errors (2000-2999)
  UNAUTHORIZED = 2000,
  FORBIDDEN = 2001,
  TOKEN_EXPIRED = 2002,
  INVALID_CREDENTIALS = 2003,
  
  // Server errors (3000-3999)
  INTERNAL_ERROR = 3000,
  DATABASE_ERROR = 3001,
  EXTERNAL_SERVICE_ERROR = 3002,
  CONFIGURATION_ERROR = 3003,
  
  // Network errors (4000-4999)
  NETWORK_ERROR = 4000,
  TIMEOUT = 4001,
  SERVICE_UNAVAILABLE = 4002,
  CONNECTION_FAILED = 4003,
}

// ============================================================================
// Enum Utilities
// ============================================================================

/**
 * Type guard to check if a value is a valid enum value
 */
export function isEnumValue<T extends Record<string, string | number>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

/**
 * Get all enum values as an array
 */
export function getEnumValues<T extends Record<string, string | number>>(
  enumObj: T
): Array<T[keyof T]> {
  return Object.values(enumObj) as Array<T[keyof T]>;
}

/**
 * Get all enum keys as an array
 */
export function getEnumKeys<T extends Record<string, string | number>>(
  enumObj: T
): Array<keyof T> {
  return Object.keys(enumObj) as Array<keyof T>;
}

// ============================================================================
// String Literal Types for Runtime Validation
// ============================================================================

/** String literal type for BillStatus */
export type BillStatusValue = `${BillStatus}`;

/** String literal type for Chamber */
export type ChamberValue = `${Chamber}`;

/** String literal type for UserRole */
export type UserRoleValue = `${UserRole}`;

/** String literal type for ArgumentPosition */
export type ArgumentPositionValue = `${ArgumentPosition}`;

/** String literal type for BillVoteType */
export type BillVoteTypeValue = `${BillVoteType}`;

/** String literal type for ModerationStatus */
export type ModerationStatusValue = `${ModerationStatus}`;

/** String literal type for UrgencyLevel */
export type UrgencyLevelValue = `${UrgencyLevel}`;

/** String literal type for ComplexityLevel */
export type ComplexityLevelValue = `${ComplexityLevel}`;

// ============================================================================
// Enum Value Arrays for Validation
// ============================================================================

/** Array of all valid bill status values for validation */
export const BILL_STATUS_VALUES = Object.values(BillStatus) as readonly BillStatusValue[];

/** Array of all valid chamber values for validation */
export const CHAMBER_VALUES = Object.values(Chamber) as readonly ChamberValue[];

/** Array of all valid user role values for validation */
export const USER_ROLE_VALUES = Object.values(UserRole) as readonly UserRoleValue[];

/** Array of all valid argument position values for validation */
export const ARGUMENT_POSITION_VALUES = Object.values(ArgumentPosition) as readonly ArgumentPositionValue[];

/** Array of all valid bill vote type values for validation */
export const BILL_VOTE_TYPE_VALUES = Object.values(BillVoteType) as readonly BillVoteTypeValue[];

/** Array of all valid moderation status values for validation */
export const MODERATION_STATUS_VALUES = Object.values(ModerationStatus) as readonly ModerationStatusValue[];

/** Array of all valid urgency level values for validation */
export const URGENCY_LEVEL_VALUES = Object.values(UrgencyLevel) as readonly UrgencyLevelValue[];

/** Array of all valid complexity level values for validation */
export const COMPLEXITY_LEVEL_VALUES = Object.values(ComplexityLevel) as readonly ComplexityLevelValue[];

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Check if a value is a valid BillStatus
 */
export function isValidBillStatus(value: unknown): value is BillStatusValue {
  return typeof value === 'string' && BILL_STATUS_VALUES.includes(value as BillStatusValue);
}

/**
 * Check if a value is a valid Chamber
 */
export function isValidChamber(value: unknown): value is ChamberValue {
  return typeof value === 'string' && CHAMBER_VALUES.includes(value as ChamberValue);
}

/**
 * Check if a value is a valid UserRole
 */
export function isValidUserRole(value: unknown): value is UserRoleValue {
  return typeof value === 'string' && USER_ROLE_VALUES.includes(value as UserRoleValue);
}


// ============================================================================
// Geographic & Political Enums (Kenya-Specific)
// ============================================================================

/**
 * Kenyan Counties (47 counties as per 2010 Constitution)
 */
export enum KenyanCounty {
  Baringo = 'baringo',
  Bomet = 'bomet',
  Bungoma = 'bungoma',
  Busia = 'busia',
  ElgeyoMarakwet = 'elgeyo_marakwet',
  Embu = 'embu',
  Garissa = 'garissa',
  HomaBay = 'homa_bay',
  Isiolo = 'isiolo',
  Kajiado = 'kajiado',
  Kakamega = 'kakamega',
  Kericho = 'kericho',
  Kiambu = 'kiambu',
  Kilifi = 'kilifi',
  Kirinyaga = 'kirinyaga',
  Kisii = 'kisii',
  Kisumu = 'kisumu',
  Kitui = 'kitui',
  Kwale = 'kwale',
  Laikipia = 'laikipia',
  Lamu = 'lamu',
  Machakos = 'machakos',
  Makueni = 'makueni',
  Mandera = 'mandera',
  Marsabit = 'marsabit',
  Meru = 'meru',
  Migori = 'migori',
  Mombasa = 'mombasa',
  Muranga = 'muranga',
  Nairobi = 'nairobi',
  Nakuru = 'nakuru',
  Nandi = 'nandi',
  Narok = 'narok',
  Nyamira = 'nyamira',
  Nyandarua = 'nyandarua',
  Nyeri = 'nyeri',
  Samburu = 'samburu',
  Siaya = 'siaya',
  TaitaTaveta = 'taita_taveta',
  TanaRiver = 'tana_river',
  TharakaNithi = 'tharaka_nithi',
  TransNzoia = 'trans_nzoia',
  Turkana = 'turkana',
  UasinGishu = 'uasin_gishu',
  Vihiga = 'vihiga',
  Wajir = 'wajir',
  WestPokot = 'west_pokot',
}

/**
 * Political Parties (major parties in Kenya)
 */
export enum PoliticalParty {
  UDA = 'uda',
  ODM = 'odm',
  Jubilee = 'jubilee',
  Wiper = 'wiper',
  ANC = 'anc',
  FordKenya = 'ford_kenya',
  KANU = 'kanu',
  Independent = 'independent',
  Other = 'other',
  Safina = 'safina',
  NarkKenya = 'nark_kenya',
  DapKe = 'dap_ke',
  PAA = 'paa',
  MCC = 'mcc',
  UDP = 'udp',
  KDU = 'kdu',
  CCK = 'cck',
  KUPA = 'kupa',
  GDCP = 'gdcp',
  TSP = 'tsp',
}

// ============================================================================
// Engagement & Interaction Enums (Extended)
// ============================================================================

/**
 * Comment vote type
 */
export enum CommentVoteType {
  Upvote = 'upvote',
  Downvote = 'downvote',
  Report = 'report',
}

/**
 * Engagement type for tracking user interactions
 */
export enum EngagementType {
  View = 'view',
  Comment = 'comment',
  Vote = 'vote',
  Share = 'share',
  Follow = 'follow',
  Download = 'download',
  TimeSpent = 'time_spent',
}

/**
 * Severity level for issues and alerts
 */
export enum Severity {
  Info = 'info',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// ============================================================================
// Market Intelligence Enums (The Bazaar / Soko Haki)
// ============================================================================

/**
 * Commodity categories for market tracking
 */
export enum CommodityCategory {
  FoodSecurity = 'food_security',
  Transport = 'transport',
  Administrative = 'administrative',
  Healthcare = 'healthcare',
  Education = 'education',
  Housing = 'housing',
  Communication = 'communication',
  Agriculture = 'agriculture',
}

/**
 * Reliability score for data sources
 */
export enum ReliabilityScore {
  Unverified = 'unverified',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  VerifiedOracle = 'verified_oracle',
}

// ============================================================================
// Accountability Ledger Enums (The Shadow System)
// ============================================================================

/**
 * Types of violations for accountability tracking
 */
export enum ViolationType {
  Bribery = 'bribery',
  InflatedProcurement = 'inflated_procurement',
  GhostProject = 'ghost_project',
  Nepotism = 'nepotism',
  RegulatoryExtortion = 'regulatory_extortion',
  BudgetDiversion = 'budget_diversion',
  FalsePromises = 'false_promises',
  ConflictOfInterest = 'conflict_of_interest',
}

/**
 * Promise status for tracking political promises
 */
export enum PromiseStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Fulfilled = 'fulfilled',
  Broken = 'broken',
  Stalled = 'stalled',
  Abandoned = 'abandoned',
}

/**
 * Verification level for accountability claims
 */
export enum VerificationLevel {
  Alleged = 'alleged',
  CitizenReported = 'citizen_reported',
  Investigated = 'investigated',
  Substantiated = 'substantiated',
  Proven = 'proven',
}

// ============================================================================
// Notification & Communication Enums
// ============================================================================

/**
 * Notification frequency preferences
 */
export enum NotificationFrequency {
  Realtime = 'realtime',
  Daily = 'daily',
  Weekly = 'weekly',
  Never = 'never',
}

/**
 * Digest frequency for email summaries
 */
export enum DigestFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

/**
 * Notification language preferences
 */
export enum NotificationLanguage {
  English = 'english',
  Swahili = 'swahili',
  Sheng = 'sheng',
}

/**
 * Accessibility format preferences
 */
export enum AccessibilityFormat {
  Standard = 'standard',
  ScreenReader = 'screen_reader',
  SimplifiedText = 'simplified_text',
  AudioSummary = 'audio_summary',
}

/**
 * Priority levels
 */
export enum Priority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

/**
 * Delivery status for notifications
 */
export enum DeliveryStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Bounced = 'bounced',
}

/**
 * Contact type for communication
 */
export enum ContactType {
  Email = 'email',
  SMS = 'sms',
  WhatsApp = 'whatsapp',
  Push = 'push',
}

/**
 * Device type for tracking
 */
export enum DeviceType {
  Mobile = 'mobile',
  Desktop = 'desktop',
  Tablet = 'tablet',
  USSD = 'ussd',
}

// ============================================================================
// Expert & System Enums
// ============================================================================

/**
 * Expert domain areas
 */
export enum ExpertDomain {
  Legal = 'legal',
  Economic = 'economic',
  Environmental = 'environmental',
  PublicHealth = 'public_health',
  Education = 'education',
  Technology = 'technology',
  Infrastructure = 'infrastructure',
}

/**
 * Position on an issue
 */
export enum Position {
  For = 'for',
  Against = 'against',
  Neutral = 'neutral',
  Undecided = 'undecided',
}

/**
 * Court level for legal cases
 */
export enum CourtLevel {
  Magistrate = 'magistrate',
  HighCourt = 'high_court',
  CourtOfAppeal = 'court_of_appeal',
  SupremeCourt = 'supreme_court',
}

/**
 * Campaign status
 */
export enum CampaignStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Archived = 'archived',
}

/**
 * Action type for campaigns
 */
export enum ActionType {
  Petition = 'petition',
  EmailMP = 'email_mp',
  SocialShare = 'social_share',
  AttendMeeting = 'attend_meeting',
  SubmitMemoranda = 'submit_memoranda',
}

/**
 * Action status
 */
export enum ActionStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Ambassador status
 */
export enum AmbassadorStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  PendingApproval = 'pending_approval',
}

/**
 * Session type for user sessions
 */
export enum SessionType {
  Web = 'web',
  MobileApp = 'mobile_app',
  USSD = 'ussd',
}

/**
 * Participation method
 */
export enum ParticipationMethod {
  OnlineForm = 'online_form',
  Email = 'email',
  PhysicalHearing = 'physical_hearing',
  WhatsApp = 'whatsapp',
  SMS = 'sms',
}

// ============================================================================
// Argument Intelligence Enums
// ============================================================================

/**
 * Job status for async processing tasks
 */
export enum JobStatus {
  /** Job is pending execution */
  Pending = 'pending',
  /** Job is currently processing */
  Processing = 'processing',
  /** Job completed successfully */
  Completed = 'completed',
  /** Job failed */
  Failed = 'failed',
}

/**
 * Relationship type between arguments
 */
export enum RelationshipType {
  /** Argument supports another */
  Supports = 'supports',
  /** Argument contradicts another */
  Contradicts = 'contradicts',
  /** Argument clarifies another */
  Clarifies = 'clarifies',
  /** Argument expands on another */
  Expands = 'expands',
}

// ============================================================================
// System Audit Enums
// ============================================================================

/**
 * Payload type for audit logs
 */
export enum PayloadType {
  /** Action details payload */
  ActionDetails = 'action_details',
  /** Resource usage payload */
  ResourceUsage = 'resource_usage',
}
