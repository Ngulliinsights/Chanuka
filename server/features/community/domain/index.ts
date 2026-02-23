/**
 * Community Domain Layer Exports
 * 
 * Pure domain logic with no infrastructure dependencies.
 */

// Entities
export { Comment, CommentEntity, CreateCommentInput, UpdateCommentInput } from './entities/comment.entity';
export { CommentVote, CommentVoteEntity, CreateVoteInput, VoteType } from './entities/comment-vote.entity';

// Value Objects
export { EngagementScore } from './value-objects/engagement-score';
export { TrendingScore, TrendingTimeframe } from './value-objects/trending-score';

// Domain Services
export { CommentModerationService, ModerationContext, ModerationDecision } from './services/comment-moderation.service';
export { CommentRankingService, RankableComment, RankingAlgorithm, RankedComment } from './services/comment-ranking.service';
