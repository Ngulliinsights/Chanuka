import { formatDistanceToNow } from 'date-fns';
import { 
  ChevronUp, 
  ChevronDown, 
  Reply, 
  Flag, 
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  AlertTriangle
} from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';

import { cn } from '@client/lib/utils';
import { Comment, ModerationViolationType } from '@client/types/community';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { ExpertBadge } from '../verification/ExpertBadge';


interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  canModerate?: boolean;
  maxDepth?: number;
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string, violationType: ModerationViolationType, reason: string) => void;
  onModerate: (commentId: string, action: string, reason: string) => void;
  className?: string;
}

/**
 * CommentItem - Individual comment with voting, replying, and moderation actions
 * 
 * Features:
 * - Nested threading up to 5 levels deep
 * - Voting system with visual feedback
 * - Reply functionality with proper threading
 * - Moderation actions for authorized users
 * - Community reporting system
 * - Expert verification display
 * - Quality indicators and warnings
 */
export function CommentItem({
  comment,
  currentUserId,
  canModerate = false,
  maxDepth = 5,
  onVote,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onModerate,
  className
}: CommentItemProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine if user can interact with this comment
  const isOwnComment = currentUserId === comment.authorId;
  const canReply = comment.depth < maxDepth - 1;
  const canEdit = isOwnComment && comment.status === 'active';
  const canDelete = isOwnComment || canModerate;

  // Calculate vote score and user's vote status
  const voteScore = comment.upvotes - comment.downvotes;
  const hasUpvoted = comment.userVote === 'up';
  const hasDownvoted = comment.userVote === 'down';

  // Determine comment status styling
  const getStatusStyling = useCallback(() => {
    switch (comment.status) {
      case 'hidden':
        return 'opacity-50 bg-gray-50 border-gray-200';
      case 'removed':
        return 'opacity-30 bg-red-50 border-red-200';
      case 'under_review':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return '';
    }
  }, [comment.status]);

  // Format relative time
  const relativeTime = useMemo(() => {
    return formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  }, [comment.createdAt]);

  // Handle voting with optimistic updates
  const handleVote = useCallback((voteType: 'up' | 'down') => {
    if (!currentUserId) return;
    
    // Prevent double voting
    if ((voteType === 'up' && hasUpvoted) || (voteType === 'down' && hasDownvoted)) {
      return;
    }
    
    onVote(comment.id, voteType);
  }, [comment.id, currentUserId, hasUpvoted, hasDownvoted, onVote]);

  // Handle reply action
  const handleReply = useCallback(() => {
    if (!currentUserId || !canReply) return;
    onReply(comment.id);
  }, [comment.id, currentUserId, canReply, onReply]);

  // Handle report submission
  const handleReport = useCallback((violationType: ModerationViolationType, reason: string) => {
    if (!currentUserId) return;
    onReport(comment.id, violationType, reason);
    setShowReportDialog(false);
  }, [comment.id, currentUserId, onReport]);

  // Render moderation status indicators
  const renderModerationIndicators = () => {
    if (comment.moderationFlags.length === 0 && comment.reportCount === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 mt-2">
        {comment.reportCount > 0 && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Flag className="h-3 w-3" />
            {comment.reportCount} report{comment.reportCount !== 1 ? 's' : ''}
          </Badge>
        )}
        
        {comment.status === 'under_review' && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Under Review
          </Badge>
        )}
      </div>
    );
  };

  // Render quality indicators
  const renderQualityIndicators = () => {
    if (!comment.isHighQuality && comment.qualityScore < 0.3) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 mt-2">
        {comment.isHighQuality && (
          <Badge variant="secondary" className="text-xs">
            High Quality
          </Badge>
        )}
        
        {comment.qualityScore > 0.8 && (
          <Badge variant="outline" className="text-xs">
            Well Researched
          </Badge>
        )}
      </div>
    );
  };

  // Don't render removed comments for non-moderators
  if (comment.status === 'removed' && !canModerate) {
    return (
      <div className={cn(
        "chanuka-card p-4 border-l-4 border-l-red-300 bg-red-50",
        className
      )}>
        <p className="text-sm text-gray-500 italic">
          This comment has been removed by moderators.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "chanuka-card transition-all duration-200",
      getStatusStyling(),
      className
    )}>
      <div className="chanuka-card-content">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Author Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              {comment.authorAvatar ? (
                <img 
                  src={comment.authorAvatar} 
                  alt={comment.authorName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {comment.authorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Author Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.authorName}</span>
                
                {/* Expert Badge */}
                {comment.isExpertComment && comment.expertVerification && (
                  <ExpertBadge
                    verificationType={comment.expertVerification.type}
                    credibilityScore={comment.expertVerification.credibilityScore}
                    size="sm"
                    showScore={true}
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{relativeTime}</span>
                {comment.editedAt && (
                  <span className="italic">(edited)</span>
                )}
                {comment.depth > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Reply
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(comment.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(comment.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
              
              {!isOwnComment && currentUserId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </>
              )}
              
              {canModerate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onModerate(comment.id, 'hide', 'Moderator action')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Hide Comment
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onModerate(comment.id, 'remove', 'Moderator action')}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Comment
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Comment Content */}
        <div className="mb-4">
          {comment.status === 'hidden' ? (
            <p className="text-sm text-gray-500 italic">
              This comment has been hidden. {canModerate && 'Click to view content.'}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}
        </div>

        {/* Quality and Moderation Indicators */}
        {renderQualityIndicators()}
        {renderModerationIndicators()}

        {/* Comment Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          {/* Voting */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('up')}
              disabled={!currentUserId}
              className={cn(
                "h-8 px-2 text-xs",
                hasUpvoted && "text-green-600 bg-green-50"
              )}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              {comment.upvotes}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('down')}
              disabled={!currentUserId}
              className={cn(
                "h-8 px-2 text-xs",
                hasDownvoted && "text-red-600 bg-red-50"
              )}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              {comment.downvotes}
            </Button>
            
            {voteScore !== 0 && (
              <span className={cn(
                "text-xs font-medium ml-2",
                voteScore > 0 ? "text-green-600" : "text-red-600"
              )}>
                {voteScore > 0 ? '+' : ''}{voteScore}
              </span>
            )}
          </div>

          {/* Reply Action */}
          {canReply && currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReply}
              className="h-8 px-3 text-xs"
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          )}
        </div>

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {isExpanded ? (
              <>
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="ml-6 border-l-2 border-gray-100 pl-4">
                    <CommentItem
                      comment={reply}
                      currentUserId={currentUserId}
                      canModerate={canModerate}
                      maxDepth={maxDepth}
                      onVote={onVote}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReport={onReport}
                      onModerate={onModerate}
                    />
                  </div>
                ))}
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-xs text-gray-500"
              >
                Show {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
              </Button>
            )}
            
            {isExpanded && comment.replies.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-xs text-gray-500"
              >
                Collapse replies
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Report Dialog - Simple implementation for now */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Report Comment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Why are you reporting this comment?
            </p>
            
            <div className="space-y-2 mb-4">
              {[
                { value: 'spam', label: 'Spam or unwanted content' },
                { value: 'harassment', label: 'Harassment or bullying' },
                { value: 'misinformation', label: 'Misinformation' },
                { value: 'off_topic', label: 'Off-topic or irrelevant' },
                { value: 'inappropriate_language', label: 'Inappropriate language' },
                { value: 'personal_attack', label: 'Personal attack' },
                { value: 'other', label: 'Other violation' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleReport(option.value as ModerationViolationType, option.label)}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm"
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReportDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}