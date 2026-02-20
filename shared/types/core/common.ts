/**
 * Branded ID Types
 *
 * Nominal typing for entity identifiers, preventing accidental ID misuse
 * across domain boundaries. All IDs are strings at runtime.
 *
 * @example
 * const userId = createBrandedId<'UserProfileId'>('abc-123');
 * function getUser(id: UserProfileId) { ... }
 * getUser(userId); // ✓
 * getUser('abc-123'); // ✗ Type error
 */

// ============================================================================
// Brand Primitive
// ============================================================================

/** Base brand type. Prefer domain-specific aliases below over using this directly. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

// ============================================================================
// Identity & Auth
// ============================================================================

export type UserProfileId      = Brand<string, 'UserProfileId'>;
export type UserSessionId      = Brand<string, 'UserSessionId'>;
export type OAuthTokenId       = Brand<string, 'OAuthTokenId'>;
export type OAuthProviderId    = Brand<string, 'OAuthProviderId'>;

// ============================================================================
// Legislative Entities
// ============================================================================

export type CommitteeMemberId        = Brand<string, 'CommitteeMemberId'>;
export type GovernorId               = Brand<string, 'GovernorId'>;
export type ParliamentarySessionId   = Brand<string, 'ParliamentarySessionId'>;
export type ParliamentarySittingId   = Brand<string, 'ParliamentarySittingId'>;
export type ConferenceId             = Brand<string, 'ConferenceId'>;

// ============================================================================
// Participation & Engagement
// ============================================================================

export type CommentVoteId     = Brand<string, 'CommentVoteId'>;
export type BillVoteId        = Brand<string, 'BillVoteId'>;
export type BillEngagementId  = Brand<string, 'BillEngagementId'>;
export type UserInterestId    = Brand<string, 'UserInterestId'>;

// ============================================================================
// Moderation & Safety
// ============================================================================

export type ModerationId        = Brand<string, 'ModerationId'>;
export type ModerationQueueId   = Brand<string, 'ModerationQueueId'>;
export type ModerationActionId  = Brand<string, 'ModerationActionId'>;

// ============================================================================
// Advocacy & Campaigns
// ============================================================================

export type CampaignId             = Brand<string, 'CampaignId'>;
export type ActionItemId           = Brand<string, 'ActionItemId'>;
export type CampaignParticipantId  = Brand<string, 'CampaignParticipantId'>;
export type ActionCompletionId     = Brand<string, 'ActionCompletionId'>;

// ============================================================================
// Intelligence & Analysis
// ============================================================================

export type ConstitutionalAnalysisId  = Brand<string, 'ConstitutionalAnalysisId'>;
export type ConstitutionalProvisionId = Brand<string, 'ConstitutionalProvisionId'>;
export type LegalPrecedentId          = Brand<string, 'LegalPrecedentId'>;
export type ClaimId                   = Brand<string, 'ClaimId'>;
export type EvidenceId                = Brand<string, 'EvidenceId'>;

// ============================================================================
// Discovery & Search
// ============================================================================

export type SearchQueryId          = Brand<string, 'SearchQueryId'>;
export type DiscoveryPatternId     = Brand<string, 'DiscoveryPatternId'>;
export type TrendingTopicId        = Brand<string, 'TrendingTopicId'>;
export type UserRecommendationId   = Brand<string, 'UserRecommendationId'>;

// ============================================================================
// Impact & Measurement
// ============================================================================

export type LegislativeOutcomeId    = Brand<string, 'LegislativeOutcomeId'>;
export type BillImplementationId    = Brand<string, 'BillImplementationId'>;
export type AttributionAssessmentId = Brand<string, 'AttributionAssessmentId'>;

// ============================================================================
// Graph & Sync
// ============================================================================

export type GraphSyncStatusId = Brand<string, 'GraphSyncStatusId'>;
export type GraphSyncErrorId  = Brand<string, 'GraphSyncErrorId'>;

// ============================================================================
// API & System
// ============================================================================

export type ApiRequestId = Brand<string, 'ApiRequestId'>;

// ============================================================================
// Branded ID Utilities
// ============================================================================

/**
 * Cast a raw string to a branded ID.
 * Use at system boundaries (e.g. API responses, DB reads) where the
 * string's identity has been externally validated.
 *
 * @example
 * const id = brandId<UserProfileId>('abc-123');
 */
export function brandId<T extends Brand<string, string>>(value: string): T {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Invalid branded ID: expected a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value as T;
}

/**
 * Type guard — narrows `unknown` to a branded ID type.
 * Note: only validates that the value is a non-empty string;
 * it cannot verify domain correctness at runtime.
 */
export function isBrandedId<T extends Brand<string, string>>(
  value: unknown
): value is T {
  return typeof value === 'string' && value.length > 0;
}

// ============================================================================
// General Utility Types
// ============================================================================

export type Nullable<T>    = T | null;
export type Optional<T>    = T | undefined;
export type Maybe<T>       = T | null | undefined;

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};