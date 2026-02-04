/**
 * Shared Enums - Single Source of Truth
 * 
 * These enums are the canonical definitions used by both server and client.
 * Server schema (Drizzle pgEnum) should mirror these values exactly.
 * 
 * @module shared/types/enums
 */

// ============================================================================
// Legislative Process Enums
// ============================================================================

/**
 * Bill Status - Kenyan Legislative Process
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
  FIRST_READING = 'first_reading',
  SECOND_READING = 'second_reading',
  COMMITTEE_STAGE = 'committee_stage',
  THIRD_READING = 'third_reading',
  PRESIDENTIAL_ASSENT = 'presidential_assent',
  GAZETTED = 'gazetted',
  WITHDRAWN = 'withdrawn',
  LOST = 'lost',
  ENACTED = 'enacted',
}

/** String literal type for runtime validation */
export type BillStatusValue = `${BillStatus}`;

/** Array of all valid bill status values for validation */
export const BILL_STATUS_VALUES = Object.values(BillStatus) as readonly BillStatusValue[];

/**
 * Parliamentary Chamber - Kenyan Bicameral System
 */
export enum Chamber {
  NATIONAL_ASSEMBLY = 'national_assembly',
  SENATE = 'senate',
  COUNTY_ASSEMBLY = 'county_assembly',
}

export type ChamberValue = `${Chamber}`;
export const CHAMBER_VALUES = Object.values(Chamber) as readonly ChamberValue[];

// ============================================================================
// User & Role Enums
// ============================================================================

/**
 * User Role - Platform access levels
 */
export enum UserRole {
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  AMBASSADOR = 'ambassador',
  EXPERT_VERIFIER = 'expert_verifier',
  MP_STAFF = 'mp_staff',
  CLERK = 'clerk',
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  JOURNALIST = 'journalist',
}

export type UserRoleValue = `${UserRole}`;
export const USER_ROLE_VALUES = Object.values(UserRole) as readonly UserRoleValue[];

// ============================================================================
// Community & Engagement Enums
// ============================================================================

/**
 * Argument Position - Stance on a bill
 */
export enum ArgumentPosition {
  SUPPORT = 'support',
  OPPOSE = 'oppose',
  NEUTRAL = 'neutral',
  CONDITIONAL = 'conditional',
}

export type ArgumentPositionValue = `${ArgumentPosition}`;
export const ARGUMENT_POSITION_VALUES = Object.values(ArgumentPosition) as readonly ArgumentPositionValue[];

/**
 * Bill Vote Type - Citizen voting on bills
 */
export enum BillVoteType {
  SUPPORT = 'support',
  OPPOSE = 'oppose',
  AMEND = 'amend',
}

export type BillVoteTypeValue = `${BillVoteType}`;
export const BILL_VOTE_TYPE_VALUES = Object.values(BillVoteType) as readonly BillVoteTypeValue[];

/**
 * Moderation Status - Content moderation states
 */
export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED_FOR_REVIEW = 'flagged_for_review',
  AUTO_MODERATED = 'auto_moderated',
}

export type ModerationStatusValue = `${ModerationStatus}`;
export const MODERATION_STATUS_VALUES = Object.values(ModerationStatus) as readonly ModerationStatusValue[];

// ============================================================================
// Urgency & Priority Enums
// ============================================================================

/**
 * Urgency Level - Bill urgency classification
 */
export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type UrgencyLevelValue = `${UrgencyLevel}`;
export const URGENCY_LEVEL_VALUES = Object.values(UrgencyLevel) as readonly UrgencyLevelValue[];

/**
 * Complexity Level - Bill complexity classification
 */
export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert',
}

export type ComplexityLevelValue = `${ComplexityLevel}`;
export const COMPLEXITY_LEVEL_VALUES = Object.values(ComplexityLevel) as readonly ComplexityLevelValue[];

// ============================================================================
// Validation Helpers
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
