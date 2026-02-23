/**
 * Vote on Comment Use Case
 * 
 * Handles upvoting, downvoting, and vote toggling on comments.
 */

import { CommentVote, CreateVoteInput, VoteType } from '../../domain/entities/comment-vote.entity';
import { logger } from '@server/infrastructure/observability';

export interface VoteOnCommentCommand {
  commentId: string;
  userId: string;
  voteType: VoteType;
  reason?: string;
}

export interface VoteOnCommentResult {
  success: boolean;
  action: 'added' | 'changed' | 'removed';
  newUpvotes: number;
  newDownvotes: number;
  netVotes: number;
  message: string;
}

export class VoteOnCommentUseCase {
  async execute(command: VoteOnCommentCommand): Promise<VoteOnCommentResult> {
    try {
      // Check for existing vote (would be done through repository in real implementation)
      const existingVote = await this.findExistingVote(command.commentId, command.userId);

      let action: 'added' | 'changed' | 'removed';
      let upvoteChange = 0;
      let downvoteChange = 0;

      if (existingVote) {
        if (existingVote.voteType === command.voteType) {
          // Same vote - toggle off (remove)
          // await this.voteRepository.delete(existingVote.id);
          action = 'removed';
          upvoteChange = command.voteType === 'upvote' ? -1 : 0;
          downvoteChange = command.voteType === 'downvote' ? -1 : 0;
        } else {
          // Different vote - change
          existingVote.changeVote(command.voteType);
          // await this.voteRepository.save(existingVote);
          action = 'changed';
          upvoteChange = command.voteType === 'upvote' ? 1 : -1;
          downvoteChange = command.voteType === 'downvote' ? 1 : -1;
        }
      } else {
        // New vote - add
        const input: CreateVoteInput = {
          commentId: command.commentId,
          userId: command.userId,
          voteType: command.voteType,
          votingReason: command.reason,
        };
        const vote = CommentVote.create(input);
        // await this.voteRepository.save(vote);
        action = 'added';
        upvoteChange = command.voteType === 'upvote' ? 1 : 0;
        downvoteChange = command.voteType === 'downvote' ? 1 : 0;
      }

      // Update comment vote counts (would be done through comment repository)
      const updatedComment = await this.updateCommentVotes(
        command.commentId,
        upvoteChange,
        downvoteChange,
      );

      logger.info({
        message: 'Vote processed',
        action,
        commentId: command.commentId,
        userId: command.userId,
        voteType: command.voteType,
      });

      return {
        success: true,
        action,
        newUpvotes: updatedComment.upvotes,
        newDownvotes: updatedComment.downvotes,
        netVotes: updatedComment.upvotes - updatedComment.downvotes,
        message: this.getSuccessMessage(action, command.voteType),
      };
    } catch (error) {
      logger.error({
        message: 'Failed to process vote',
        error: error instanceof Error ? error.message : String(error),
        commentId: command.commentId,
        userId: command.userId,
      });

      return {
        success: false,
        action: 'added',
        newUpvotes: 0,
        newDownvotes: 0,
        netVotes: 0,
        message: 'Failed to process vote. Please try again.',
      };
    }
  }

  private async findExistingVote(commentId: string, userId: string): Promise<CommentVote | null> {
    // Would query repository in real implementation
    return null;
  }

  private async updateCommentVotes(
    commentId: string,
    upvoteChange: number,
    downvoteChange: number,
  ): Promise<{ upvotes: number; downvotes: number }> {
    // Would update through repository in real implementation
    return { upvotes: 10, downvotes: 2 };
  }

  private getSuccessMessage(action: 'added' | 'changed' | 'removed', voteType: VoteType): string {
    if (action === 'removed') {
      return 'Vote removed';
    }
    if (action === 'changed') {
      return `Vote changed to ${voteType}`;
    }
    return `${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'} successfully`;
  }
}
