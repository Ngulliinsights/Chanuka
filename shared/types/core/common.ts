export type UserProfileId = string & { readonly __brand: 'UserProfileId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type UserSessionId = string & { readonly __brand: 'UserSessionId' };
export type OAuthTokenId = string & { readonly __brand: 'OAuthTokenId' };
export type OAuthProviderId = string & { readonly __brand: 'OAuthProviderId' };

// Legislative Entities
export type BillId = string & { readonly __brand: 'BillId' };
export type SponsorId = string & { readonly __brand: 'SponsorId' };
export type LegislatorId = string & { readonly __brand: 'LegislatorId' };
export type CommitteeId = string & { readonly __brand: 'CommitteeId' };
export type CommitteeMemberId = string & { readonly __brand: 'CommitteeMemberId' };
export type GovernorId = string & { readonly __brand: 'GovernorId' };
export type AmendmentId = string & { readonly __brand: 'AmendmentId' };
export type ParliamentarySessionId = string & { readonly __brand: 'ParliamentarySessionId' };
export type ParliamentarySittingId = string & { readonly __brand: 'ParliamentarySittingId' };

// Participation & Engagement
export type CommentId = string & { readonly __brand: 'CommentId' };
export type CommentVoteId = string & { readonly __brand: 'CommentVoteId' };
export type BillVoteId = string & { readonly __brand: 'BillVoteId' };
export type BillEngagementId = string & { readonly __brand: 'BillEngagementId' };
export type NotificationId = string & { readonly __brand: 'NotificationId' };
export type UserInterestId = string & { readonly __brand: 'UserInterestId' };

// Moderation & Safety
export type ModerationId = string & { readonly __brand: 'ModerationId' };
export type ModerationQueueId = string & { readonly __brand: 'ModerationQueueId' };
export type ModerationActionId = string & { readonly __brand: 'ModerationActionId' };

// Advocacy & Campaigns
export type CampaignId = string & { readonly __brand: 'CampaignId' };
export type ActionItemId = string & { readonly __brand: 'ActionItemId' };
export type CampaignParticipantId = string & { readonly __brand: 'CampaignParticipantId' };
export type ActionCompletionId = string & { readonly __brand: 'ActionCompletionId' };

// Intelligence & Analysis
export type ConstitutionalAnalysisId = string & { readonly __brand: 'ConstitutionalAnalysisId' };
export type ConstitutionalProvisionId = string & { readonly __brand: 'ConstitutionalProvisionId' };
export type LegalPrecedentId = string & { readonly __brand: 'LegalPrecedentId' };
export type ArgumentId = string & { readonly __brand: 'ArgumentId' };
export type ClaimId = string & { readonly __brand: 'ClaimId' };
export type EvidenceId = string & { readonly __brand: 'EvidenceId' };

// Discovery & Search
export type SearchQueryId = string & { readonly __brand: 'SearchQueryId' };
export type DiscoveryPatternId = string & { readonly __brand: 'DiscoveryPatternId' };
export type TrendingTopicId = string & { readonly __brand: 'TrendingTopicId' };
export type UserRecommendationId = string & { readonly __brand: 'UserRecommendationId' };

// Impact & Measurement
export type LegislativeOutcomeId = string & { readonly __brand: 'LegislativeOutcomeId' };
export type BillImplementationId = string & { readonly __brand: 'BillImplementationId' };
export type AttributionAssessmentId = string & { readonly __brand: 'AttributionAssessmentId' };

// Graph & Sync
export type GraphSyncStatusId = string & { readonly __brand: 'GraphSyncStatusId' };
export type GraphSyncErrorId = string & { readonly __brand: 'GraphSyncErrorId' };

// API & System
export type ApiRequestId = string & { readonly __brand: 'ApiRequestId' };
export type ConferenceId = string & { readonly __brand: 'ConferenceId' };

/**
 * Utility to create branded types
 */
export function createBrandedId<T extends string>(
  value: string
): string & { readonly __brand: T } {
  return value as string & { readonly __brand: T };
}

/**
 * Type guard for branded IDs
 */
export function isBrandedId<T extends string>(
  value: unknown
): value is string & { readonly __brand: T } {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Common utility types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};
export type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
};