/**
 * Comment Moderation Domain Service
 * 
 * Encapsulates business rules for comment moderation decisions.
 * Determines when comments should be auto-approved, flagged, or require review.
 */

import { Comment } from '../entities/comment.entity';

export interface ModerationContext {
  userReputationScore: number;
  userCommentCount: number;
  userAccountAge: number; // days
  commentLength: number;
  containsProfanity: boolean;
  containsSpam: boolean;
  containsPersonalInfo: boolean;
  similarityToSpam: number; // 0-1
}

export interface ModerationDecision {
  action: 'approve' | 'flag' | 'reject';
  reason: string;
  confidence: number; // 0-1
  requiresHumanReview: boolean;
}

export class CommentModerationService {
  private readonly AUTO_APPROVE_REPUTATION_THRESHOLD = 75;
  private readonly AUTO_APPROVE_COMMENT_COUNT = 10;
  private readonly AUTO_APPROVE_ACCOUNT_AGE_DAYS = 30;
  private readonly MIN_COMMENT_LENGTH = 10;
  private readonly MAX_COMMENT_LENGTH = 5000;
  private readonly SPAM_SIMILARITY_THRESHOLD = 0.7;

  /**
   * Determine moderation action for a comment
   */
  moderateComment(comment: Comment, context: ModerationContext): ModerationDecision {
    // Immediate rejection criteria
    if (context.containsProfanity) {
      return {
        action: 'reject',
        reason: 'Contains profanity or offensive language',
        confidence: 1.0,
        requiresHumanReview: false,
      };
    }

    if (context.containsPersonalInfo) {
      return {
        action: 'reject',
        reason: 'Contains personal information (PII)',
        confidence: 1.0,
        requiresHumanReview: false,
      };
    }

    if (context.commentLength < this.MIN_COMMENT_LENGTH) {
      return {
        action: 'reject',
        reason: 'Comment too short (minimum 10 characters)',
        confidence: 1.0,
        requiresHumanReview: false,
      };
    }

    if (context.commentLength > this.MAX_COMMENT_LENGTH) {
      return {
        action: 'reject',
        reason: 'Comment too long (maximum 5000 characters)',
        confidence: 1.0,
        requiresHumanReview: false,
      };
    }

    // Spam detection
    if (context.containsSpam || context.similarityToSpam > this.SPAM_SIMILARITY_THRESHOLD) {
      return {
        action: 'flag',
        reason: 'Potential spam detected',
        confidence: context.similarityToSpam,
        requiresHumanReview: true,
      };
    }

    // Auto-approve for trusted users
    if (this.isTrustedUser(context)) {
      return {
        action: 'approve',
        reason: 'Trusted user with good reputation',
        confidence: 0.95,
        requiresHumanReview: false,
      };
    }

    // New users require review
    if (this.isNewUser(context)) {
      return {
        action: 'flag',
        reason: 'New user - requires review',
        confidence: 0.5,
        requiresHumanReview: true,
      };
    }

    // Default: approve with moderate confidence
    return {
      action: 'approve',
      reason: 'Passes basic moderation checks',
      confidence: 0.7,
      requiresHumanReview: false,
    };
  }

  /**
   * Check if user is trusted enough for auto-approval
   */
  private isTrustedUser(context: ModerationContext): boolean {
    return (
      context.userReputationScore >= this.AUTO_APPROVE_REPUTATION_THRESHOLD &&
      context.userCommentCount >= this.AUTO_APPROVE_COMMENT_COUNT &&
      context.userAccountAge >= this.AUTO_APPROVE_ACCOUNT_AGE_DAYS
    );
  }

  /**
   * Check if user is new and requires extra scrutiny
   */
  private isNewUser(context: ModerationContext): boolean {
    return (
      context.userCommentCount < 3 ||
      context.userAccountAge < 7
    );
  }

  /**
   * Calculate priority for human review queue
   */
  calculateReviewPriority(context: ModerationContext): 'high' | 'medium' | 'low' {
    if (context.containsSpam || context.similarityToSpam > 0.8) {
      return 'high';
    }

    if (this.isNewUser(context)) {
      return 'medium';
    }

    return 'low';
  }
}
