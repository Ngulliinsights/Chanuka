/**
 * Create Comment Use Case
 * 
 * Handles the creation of a new comment with moderation and validation.
 */

import { Comment, CreateCommentInput } from '../../domain/entities/comment.entity';
import { CommentModerationService, ModerationContext } from '../../domain/services/comment-moderation.service';
import { logger } from '@server/infrastructure/observability';

export interface CreateCommentCommand {
  billId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
}

export interface CreateCommentResult {
  success: boolean;
  commentId?: string;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  message: string;
}

export class CreateCommentUseCase {
  constructor(
    private readonly moderationService: CommentModerationService,
  ) {}

  async execute(command: CreateCommentCommand): Promise<CreateCommentResult> {
    try {
      // Validate input
      if (!command.content || command.content.trim().length === 0) {
        return {
          success: false,
          moderationStatus: 'rejected',
          message: 'Comment content cannot be empty',
        };
      }

      // Create domain entity
      const input: CreateCommentInput = {
        billId: command.billId,
        userId: command.userId,
        content: command.content.trim(),
        parentCommentId: command.parentCommentId,
      };

      const comment = Comment.create(input);

      // Get moderation context (would be fetched from user service in real implementation)
      const moderationContext = await this.getModerationContext(command.userId, command.content);

      // Apply moderation rules
      const decision = this.moderationService.moderateComment(comment, moderationContext);

      // Apply moderation decision to comment
      if (decision.action === 'approve') {
        comment.approve('system');
      } else if (decision.action === 'reject') {
        comment.reject('system', decision.reason);
      } else {
        comment.flag(decision.reason);
      }

      // Persist comment (would be done through repository in real implementation)
      // const savedComment = await this.commentRepository.save(comment);

      logger.info({
        message: 'Comment created',
        commentId: comment.id,
        userId: command.userId,
        moderationStatus: decision.action,
        requiresReview: decision.requiresHumanReview,
      });

      return {
        success: true,
        commentId: comment.id,
        moderationStatus: decision.action === 'approve' ? 'approved' : decision.action === 'reject' ? 'rejected' : 'pending',
        message: decision.action === 'approve' 
          ? 'Comment posted successfully' 
          : decision.action === 'reject'
          ? `Comment rejected: ${decision.reason}`
          : 'Comment submitted for review',
      };
    } catch (error) {
      logger.error({
        message: 'Failed to create comment',
        error: error instanceof Error ? error.message : String(error),
        userId: command.userId,
        billId: command.billId,
      });

      return {
        success: false,
        moderationStatus: 'rejected',
        message: 'Failed to create comment. Please try again.',
      };
    }
  }

  private async getModerationContext(userId: string, content: string): Promise<ModerationContext> {
    // In real implementation, fetch from user service and content analysis service
    return {
      userReputationScore: 50,
      userCommentCount: 5,
      userAccountAge: 15,
      commentLength: content.length,
      containsProfanity: false,
      containsSpam: false,
      containsPersonalInfo: false,
      similarityToSpam: 0.1,
    };
  }
}
