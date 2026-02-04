/**
 * Safeguards Domain - Moderation Types
 * Standardized moderation types following the exemplary loading pattern
 * with readonly properties, discriminated unions, and branded IDs
 */

import { BaseEntity } from '../../core/base';
import { UserId, ModerationId } from '../../core/common';

// ============================================================================
// Core Enums & Types
// ============================================================================

export type ContentType =
  | 'comment'
  | 'post'
  | 'bill'
  | 'user_profile'
  | 'discussion'
  | 'media'
  | 'external_link';

export type ModerationTriggerType =
  | 'user_report'
  | 'automated_flag'
  | 'moderator_review'
  | 'appeal'
  | 'system_alert'
  | 'community_feedback';

export type ModerationPriority = 1 | 2 | 3 | 4 | 5;

export type ModerationQueueStatus =
  | 'pending'
  | 'in_review'
  | 'resolved'
  | 'appealed'
  | 'escalated'
  | 'dismissed';

// ============================================================================
// Moderation Context (Standardized with readonly properties)
// ============================================================================

/**
 * Standardized moderation context following loading pattern
 * All properties are readonly for immutability
 */
export interface ModerationContext extends BaseEntity {
  readonly contentType: ContentType;
  readonly contentId: string;
  readonly authorId: UserId;
  readonly triggerType: ModerationTriggerType;
  readonly triggerConfidence?: number;
  readonly automatedSignals?: Readonly<Record<string, unknown>>;
  readonly priority: ModerationPriority;
  readonly flagReasons?: readonly string[];
  readonly flaggedBy?: readonly UserId[];
  readonly flagCount?: number;
  readonly tribalIncitementDetected?: boolean;
  readonly hateSpeechLanguage?: string;
  readonly targetsProtectedGroup?: boolean;
  readonly violenceThreatLevel?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Moderation Actions (Discriminated Union)
// ============================================================================

export interface QueueForReviewPayload {
  readonly context: ModerationContext;
  readonly queueItemId?: ModerationId;
  readonly assignedModeratorId?: UserId;
  readonly notes?: string;
}

export interface ApproveContentPayload {
  readonly queueItemId: ModerationId;
  readonly moderatorId: UserId;
  readonly decisionReason: string;
  readonly isPublic?: boolean;
}

export interface RejectContentPayload {
  readonly queueItemId: ModerationId;
  readonly moderatorId: UserId;
  readonly decisionReason: string;
  readonly violatedPolicies: readonly string[];
  readonly actionTaken: 'remove' | 'warn_user' | 'suspend_user' | 'ban_user' | 'require_edit';
  readonly suspensionDurationHours?: number;
  readonly reputationPenalty?: number;
  readonly isPermanentBan?: boolean;
  readonly isAppealable?: boolean;
}

export interface EscalateContentPayload {
  readonly queueItemId: ModerationId;
  readonly moderatorId: UserId;
  readonly escalationReason: string;
  readonly escalationLevel: 'board_review' | 'legal_review' | 'expert_review';
  readonly priorityBoost?: ModerationPriority;
}

export interface DismissContentPayload {
  readonly queueItemId: ModerationId;
  readonly moderatorId: UserId;
  readonly dismissalReason: string;
  readonly isFalsePositive?: boolean;
}

/**
 * Moderation action discriminated union
 * Following the exemplary pattern from loading.ts
 */
export type ModerationAction =
  | { type: 'QUEUE_FOR_REVIEW'; payload: QueueForReviewPayload }
  | { type: 'APPROVE_CONTENT'; payload: ApproveContentPayload }
  | { type: 'REJECT_CONTENT'; payload: RejectContentPayload }
  | { type: 'ESCALATE_CONTENT'; payload: EscalateContentPayload }
  | { type: 'DISMISS_CONTENT'; payload: DismissContentPayload };

// ============================================================================
// Moderation Decision Types
// ============================================================================

export interface ModerationDecision extends BaseEntity {
  readonly queueItemId: ModerationId;
  readonly moderatorId: UserId;
  readonly actionTaken: string;
  readonly decisionReason: string;
  readonly violatedPolicies: readonly string[];
  readonly userAffected: UserId | null;
  readonly penaltyDurationHours: number | null;
  readonly reputationImpact: number | null;
  readonly requiredPeerReview: boolean;
  readonly peerReviewCount: number;
  readonly isAppealable: boolean;
  readonly isPublic: boolean;
  readonly status: ModerationQueueStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Moderation Appeal Types
// ============================================================================

export interface ModerationAppeal extends BaseEntity {
  readonly decisionId: ModerationId;
  readonly appellantUserId: UserId;
  readonly appealReasoning: string;
  readonly appealGrounds?: readonly string[];
  readonly supportingEvidence?: Readonly<Record<string, unknown>>;
  readonly status: ModerationQueueStatus;
  readonly assignedToBoardMember?: UserId;
  readonly boardDecision?: string;
  readonly decisionReason?: string;
  readonly originalPenaltyReversed?: boolean;
  readonly appealResolutionDate?: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Rate Limiting Types with Branded IDs
// ============================================================================

export type RateLimitId = string & { readonly __brand: 'RateLimitId' };

export interface RateLimitRule extends BaseEntity {
  readonly ruleId: RateLimitId;
  readonly ruleName: string;
  readonly description: string;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly appliesTo: 'user' | 'ip' | 'device' | 'session';
  readonly actionType: 'read' | 'write' | 'create' | 'update' | 'delete';
  readonly resourceType: 'api' | 'content' | 'auth' | 'search';
  readonly severityLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly isActive: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RateLimitEvent extends BaseEntity {
  readonly rateLimitId: RateLimitId;
  readonly userId?: UserId;
  readonly ipAddress?: string;
  readonly deviceId?: string;
  readonly sessionId?: string;
  readonly actionType: string;
  readonly resourceType: string;
  readonly count: number;
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly isBlocked: boolean;
  readonly blockReason?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for ModerationContext
 */
export function isModerationContext(value: unknown): value is ModerationContext {
  if (typeof value !== 'object' || value === null) return false;

  const context = value as Partial<ModerationContext>;
  return (
    typeof context.contentType === 'string' &&
    typeof context.contentId === 'string' &&
    typeof context.authorId === 'string' &&
    typeof context.triggerType === 'string' &&
    typeof context.priority === 'number' &&
    (context.priority >= 1 && context.priority <= 5) &&
    (context.triggerConfidence === undefined || typeof context.triggerConfidence === 'number') &&
    (context.flagReasons === undefined ||
      (Array.isArray(context.flagReasons) && context.flagReasons.every(item => typeof item === 'string')))
  );
}

/**
 * Type guard for ModerationAction
 */
export function isModerationAction(value: unknown): value is ModerationAction {
  if (typeof value !== 'object' || value === null) return false;

  const action = value as Partial<ModerationAction>;
  return (
    typeof action.type === 'string' &&
    action.type in ['QUEUE_FOR_REVIEW', 'APPROVE_CONTENT', 'REJECT_CONTENT', 'ESCALATE_CONTENT', 'DISMISS_CONTENT'] &&
    typeof action.payload === 'object' &&
    action.payload !== null
  );
}

/**
 * Type guard for ModerationDecision
 */
export function isModerationDecision(value: unknown): value is ModerationDecision {
  if (typeof value !== 'object' || value === null) return false;

  const decision = value as Partial<ModerationDecision>;
  return (
    typeof decision.queueItemId === 'string' &&
    typeof decision.moderatorId === 'string' &&
    typeof decision.actionTaken === 'string' &&
    typeof decision.decisionReason === 'string' &&
    typeof decision.requiredPeerReview === 'boolean' &&
    typeof decision.peerReviewCount === 'number' &&
    typeof decision.isAppealable === 'boolean' &&
    typeof decision.isPublic === 'boolean' &&
    typeof decision.status === 'string'
  );
}

/**
 * Type guard for ModerationAppeal
 */
export function isModerationAppeal(value: unknown): value is ModerationAppeal {
  if (typeof value !== 'object' || value === null) return false;

  const appeal = value as Partial<ModerationAppeal>;
  return (
    typeof appeal.decisionId === 'string' &&
    typeof appeal.appellantUserId === 'string' &&
    typeof appeal.appealReasoning === 'string' &&
    typeof appeal.status === 'string'
  );
}

/**
 * Type guard for RateLimitRule
 */
export function isRateLimitRule(value: unknown): value is RateLimitRule {
  if (typeof value !== 'object' || value === null) return false;

  const rule = value as Partial<RateLimitRule>;
  return (
    typeof rule.ruleId === 'string' &&
    typeof rule.ruleName === 'string' &&
    typeof rule.description === 'string' &&
    typeof rule.limit === 'number' &&
    typeof rule.windowSeconds === 'number' &&
    typeof rule.appliesTo === 'string' &&
    typeof rule.actionType === 'string' &&
    typeof rule.resourceType === 'string' &&
    typeof rule.severityLevel === 'string' &&
    typeof rule.isActive === 'boolean'
  );
}

/**
 * Type guard for RateLimitEvent
 */
export function isRateLimitEvent(value: unknown): value is RateLimitEvent {
  if (typeof value !== 'object' || value === null) return false;

  const event = value as Partial<RateLimitEvent>;
  return (
    typeof event.rateLimitId === 'string' &&
    typeof event.actionType === 'string' &&
    typeof event.resourceType === 'string' &&
    typeof event.count === 'number' &&
    event.windowStart instanceof Date &&
    event.windowEnd instanceof Date &&
    typeof event.isBlocked === 'boolean'
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new ModerationId with branding
 */
export function createModerationId(id: string): ModerationId {
  return id as ModerationId;
}

/**
 * Create a new RateLimitId with branding
 */
export function createRateLimitId(id: string): RateLimitId {
  return id as RateLimitId;
}

/**
 * Create a standardized moderation context
 */
export function createModerationContext(context: Omit<ModerationContext, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ModerationContext {
  const now = new Date();
  return {
    id: context.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...context,
    flagReasons: context.flagReasons ?? [],
    flaggedBy: context.flaggedBy ?? [],
    automatedSignals: context.automatedSignals ?? {},
    metadata: context.metadata ?? {}
  };
}

/**
 * Create a standardized moderation decision
 */
export function createModerationDecision(decision: Partial<ModerationDecision> & { queueItemId: ModerationId; moderatorId: UserId; actionTaken: string; decisionReason: string; status: ModerationQueueStatus }): ModerationDecision {
  const now = new Date();
  return {
    id: decision.id ?? crypto.randomUUID(),
    createdAt: decision.createdAt ?? now,
    updatedAt: decision.updatedAt ?? now,
    queueItemId: decision.queueItemId,
    moderatorId: decision.moderatorId,
    actionTaken: decision.actionTaken,
    decisionReason: decision.decisionReason,
    userAffected: decision.userAffected ?? null,
    penaltyDurationHours: decision.penaltyDurationHours ?? null,
    reputationImpact: decision.reputationImpact ?? null,
    requiredPeerReview: decision.requiredPeerReview ?? false,
    peerReviewCount: decision.peerReviewCount ?? 0,
    isAppealable: decision.isAppealable ?? true,
    isPublic: decision.isPublic ?? false,
    status: decision.status,
    violatedPolicies: decision.violatedPolicies ?? [],
    metadata: decision.metadata ?? {}
  };
}

/**
 * Create a standardized moderation appeal
 */
export function createModerationAppeal(appeal: Omit<ModerationAppeal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ModerationAppeal {
  const now = new Date();
  return {
    id: appeal.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    appealGrounds: appeal.appealGrounds ?? [],
    supportingEvidence: appeal.supportingEvidence ?? {},
    metadata: appeal.metadata ?? {},
    ...appeal
  };
}

/**
 * Create a standardized rate limit rule
 */
export function createRateLimitRule(rule: Omit<RateLimitRule, 'id' | 'createdAt' | 'updatedAt' | 'ruleId'> & { id?: string; ruleId?: RateLimitId }): RateLimitRule {
  const now = new Date();
  return {
    id: rule.id ?? crypto.randomUUID(),
    ruleId: rule.ruleId ?? createRateLimitId(crypto.randomUUID()),
    createdAt: now,
    updatedAt: now,
    metadata: rule.metadata ?? {},
    ...rule
  };
}

/**
 * Create a standardized rate limit event
 */
export function createRateLimitEvent(event: Omit<RateLimitEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): RateLimitEvent {
  const now = new Date();
  return {
    id: event.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    metadata: event.metadata ?? {},
    ...event
  };
}
