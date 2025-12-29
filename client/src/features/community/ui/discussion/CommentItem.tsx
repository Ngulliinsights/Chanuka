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
  AlertTriangle,
  User,
  Award,
  MessageSquare
} from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';

import { cn } from '@client/shared/design-system';
import type { CommunityComment } from '@client/features/community/types';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent } from '@client/shared/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';

type ModerationViolationType = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';

interface CommentItemProps {
  comment: CommunityComment;
  currentUserId?: string;
  canModerate?: boolean;
  maxDepth?: number;
  depth?: number;
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string, violationType: ModerationViolationType, reason: string) => void;
  onModerate: (commentId: string, action: string, reason: string) => void;
  className?: string;
  showReplies?: boolean;
  replies?: CommunityComment[];
}

/**
 * CommentItem - Individual comment with voting, replying, and moderation actions
 * 
 * Features:
 * - Nested threading up to 5 levels deep
 * - Voting system with visual feedback
 * - Reply functionality with proper threading
 * - Moderation controls for authorized users
 * - Expert verification badges
 * - Quality scoring and indicators
 */
export function CommentItem({
  comment,
  currentUserId,
  canModerate = false,
  maxDepth = 5,
  depth = 0,
  onVote,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onModerate,
  className,
  showReplies = true,
  replies = []
}: CommentItemProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);

  const isOwnComment = currentUserId === comment.author?.id;
  const canReply = depth < maxDepth;
  const hasReplies = replies.length > 0;

  // Calculate relative time
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  }, [comment.createdAt]);

  // Handle voting
  const handleVote = useCallback((voteType: 'up' | 'down') => {
    // Optimistic update
    setUserVote(prev => prev === voteType ? null : voteType);
    onVote(comment.id, voteType);
  }, [comment.id, onVote]);

  // Get quality indicator
  const getQualityIndicator = (score?: number) => {
    if (!score) return null;
    
    if (score >= 80) return { color: 'text-green-600', label: 'High Quality' };
    if (score >= 60) return { color: 'text-yellow-600', label: 'Good' };
    if (score >= 40) return { color: 'text-orange-600', label: 'Fair' };
    return { color: 'text-red-600', label: 'Low Quality' };
  };

  const qualityIndicator = getQualityIndicator(comment.qualityScore);

  // Get user role badge
  const getUserRoleBadge = (role?: string) => {
    switch (role) {
      case 'expert':
        return <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">Expert</Badge>;
      case 'official':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Official</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Moderator</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("comment-item", className)}>
      <Card className={cn(
        "transition-colors",
        comment.isModerated && "border-orange-200 bg-orange-50/50",
        depth > 0 && "ml-4 border-l-2 border-l-muted"
      )}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Comment Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.avatar} alt={comment.author?.name} />
                  <AvatarFallback>
                    {comment.author?.name?.split(' ').map(n => n[0]).join('') || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.author?.name || 'Anonymous'}
                  </span>
                  
                  {comment.author?.isVerified && (
                    <Award className="h-4 w-4 text-blue-500" />
                  )}
                  
                  {getUserRoleBadge(comment.author?.role)}
                  
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{relativeTime}</span>
                  
                  {comment.updatedAt !== comment.createdAt && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">edited</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Menu */}
              <div className="flex items-center gap-1">
                {qualityIndicator && (
                  <Badge variant="outline" className={cn("text-xs", qualityIndicator.color)}>
                    {qualityIndicator.label}
                  </Badge>
                )}
                
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Moderation Notice */}
            {comment.isModerated && (
              <div className="flex items-center gap-2 p-2 bg-orange-100 border border-orange-200 rounded text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-800">This comment has been moderated</span>
              </div>
            )}

            {/* Comment Content */}
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>

            {/* Comment Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('up')}
                    className={cn(
                      "h-8 px-2",
                      userVote === 'up' && "text-green-600 bg-green-50"
                    )}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-xs ml-1">{comment.upvotes || 0}</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('down')}
                    className={cn(
                      "h-8 px-2",
                      userVote === 'down' && "text-red-600 bg-red-50"
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-xs ml-1">{comment.downvotes || 0}</span>
                  </Button>
                </div>

                {/* Reply */}
                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(comment.id)}
                    className="h-8 px-2"
                  >
                    <Reply className="h-4 w-4" />
                    <span className="text-xs ml-1">Reply</span>
                  </Button>
                )}

                {/* Reply Count */}
                {hasReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 px-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs ml-1">
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Report */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Flag className="h-4 w-4" />
                </Button>

                {/* Edit (own comments) */}
                {isOwnComment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(comment.id)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}

                {/* Delete (own comments or moderator) */}
                {(isOwnComment || canModerate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                    className="h-8 px-2 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Moderate */}
                {canModerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onModerate(comment.id, 'hide', 'Inappropriate content')}
                    className="h-8 px-2 text-muted-foreground hover:text-orange-600"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {showReplies && hasReplies && isExpanded && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              canModerate={canModerate}
              maxDepth={maxDepth}
              depth={depth + 1}
              onVote={onVote}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={onReport}
              onModerate={onModerate}
              showReplies={showReplies}
              replies={[]} // Would be populated with nested replies
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentItem;