import {
  MessageSquare,
  Users,
  Filter,
  Lock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { cn } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Separator } from '@client/lib/design-system';
import type { CommunityComment } from '@client/lib/types';
import type { Comment } from '@client/lib/types';

interface DiscussionThread {
  id: string;
  title: string;
  description?: string;
  billId?: string;
  status: 'active' | 'locked' | 'archived';
  commentCount: number;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isModerated: boolean;
  moderationReason?: string;
}

interface CommentFormData {
  content: string;
  parentId?: string;
  isAnonymous?: boolean;
}

type CommentSortOption = 'newest' | 'oldest' | 'most_liked' | 'most_replied';
type CommentFilterOption = 'all' | 'top_level' | 'replies' | 'flagged';
type ModerationViolationType = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';

interface DiscussionThreadProps {
  thread: DiscussionThread;
  comments: CommunityComment[];
  currentUserId?: string;
  canModerate?: boolean;
  onAddComment: (data: CommentFormData) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onVoteComment: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  onReportComment: (
    commentId: string,
    violationType: ModerationViolationType,
    reason: string
  ) => Promise<void>;
  onModerateComment: (commentId: string, action: string, reason: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
}

/**
 * DiscussionThread - Main discussion interface with comments and moderation
 */
export function DiscussionThread({
  thread,
  comments = [],
  currentUserId,
  canModerate = false,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onVoteComment,
  onReportComment,
  onModerateComment,
  onRefresh,
  className,
}: DiscussionThreadProps) {
  const [sortBy, setSortBy] = useState<CommentSortOption>('newest');
  const [filterBy, setFilterBy] = useState<CommentFilterOption>('all');
  const [showModerated, setShowModerated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Sort and filter comments
  const processedComments = useMemo(() => {
    let filtered = [...comments];

    // Apply filters
    switch (filterBy) {
      case 'top_level':
        filtered = filtered.filter(comment => !comment.parentId);
        break;
      case 'replies':
        filtered = filtered.filter(comment => comment.parentId);
        break;
      case 'flagged':
        // filtered = filtered.filter(comment => comment.flagCount && comment.flagCount > 0);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'most_liked':
        filtered.sort((a, b) => (b.votes?.up || 0) - (a.votes?.up || 0));
        break;
      case 'most_replied':
        filtered.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  }, [comments, sortBy, filterBy]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleAddComment = useCallback(
    async (data: CommentFormData) => {
      await onAddComment(data);
      setReplyingTo(null);
    },
    [onAddComment]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'locked':
        return 'text-red-600';
      case 'archived':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const isThreadLocked = thread.status === 'locked' || thread.status === 'archived';

  return (
    <div className={cn('discussion-thread space-y-6', className)}>
      {/* Thread Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{thread.title}</h2>
                <Badge variant="outline" className={getStatusColor(thread.status)}>
                  {thread.status}
                </Badge>
                {thread.isModerated && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Moderated
                  </Badge>
                )}
              </div>

              {thread.description && (
                <p className="text-muted-foreground mb-3">{thread.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {thread.commentCount} comments
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {thread.participantCount} participants
                </div>
                <span>Updated {new Date(thread.updatedAt).toLocaleDateString()}</span>
              </div>

              {thread.tags && thread.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {thread.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canModerate && (
                <Button variant="ghost" size="sm" onClick={() => setShowModerated(!showModerated)}>
                  {showModerated ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Moderation Notice */}
      {thread.isModerated && thread.moderationReason && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Moderated Discussion</h4>
                <p className="text-sm text-orange-700">{thread.moderationReason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as CommentSortOption)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_liked">Most Liked</option>
              <option value="most_replied">Most Replies</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <select
              value={filterBy}
              onChange={e => setFilterBy(e.target.value as CommentFilterOption)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Comments</option>
              <option value="top_level">Top Level</option>
              <option value="replies">Replies Only</option>
              {canModerate && <option value="flagged">Flagged</option>}
            </select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {processedComments.length} of {comments.length} comments
        </div>
      </div>

      {/* Add Comment Form */}
      {!isThreadLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join the Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentForm
              onSubmit={handleAddComment}
              placeholder="Share your thoughts on this topic..."
              submitLabel="Post Comment"
              allowAnonymous={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Thread Locked Notice */}
      {isThreadLocked && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700">
                This discussion has been {thread.status}. No new comments can be added.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <div className="space-y-4">
        {processedComments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
              <p className="text-muted-foreground">
                {isThreadLocked
                  ? 'This discussion is closed for new comments.'
                  : 'Be the first to share your thoughts on this topic.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          processedComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              canModerate={canModerate}
              showModerated={showModerated}
              onUpdate={onUpdateComment}
              onDelete={onDeleteComment}
              onVote={onVoteComment}
              onReport={onReportComment}
              onModerate={onModerateComment}
              onReply={parentId => setReplyingTo(parentId)}
              isReplying={replyingTo === String(comment.id)}
              onCancelReply={() => setReplyingTo(null)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Simple CommentForm component for this example
function CommentForm({
  onSubmit,
  placeholder,
  submitLabel,
  allowAnonymous,
}: {
  onSubmit: (data: CommentFormData) => Promise<void>;
  placeholder: string;
  submitLabel: string;
  allowAnonymous: boolean;
}) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), isAnonymous });
      setContent('');
      setIsAnonymous(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows={4}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        {allowAnonymous && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              disabled={isSubmitting}
            />
            Post anonymously
          </label>
        )}

        <Button type="submit" disabled={!content.trim() || isSubmitting}>
          {isSubmitting ? 'Posting...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// Simple CommentItem component for this example
function CommentItem({
  comment,
  currentUserId,
  canModerate,
  showModerated,
  onUpdate,
  onDelete,
  onVote,
  onReport,
  onModerate,
  onReply,
  isReplying,
  onCancelReply,
}: {
  comment: CommunityComment;
  currentUserId?: string;
  canModerate: boolean;
  showModerated: boolean;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onVote: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  onReport: (
    commentId: string,
    violationType: ModerationViolationType,
    reason: string
  ) => Promise<void>;
  onModerate: (commentId: string, action: string, reason: string) => Promise<void>;
  onReply: (parentId: string) => void;
  isReplying: boolean;
  onCancelReply: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{comment.authorName || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              {/* comment.isModerated */}
              {/* {comment.isModerated && (
                <Badge variant="destructive" className="text-xs">
                  Moderated
                </Badge>
              )} */}
            </div>
            <p className="text-sm mb-3">{comment.content}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <button
                onClick={() => onVote(String(comment.id), 'up')}
                className="flex items-center gap-1 hover:text-foreground"
              >
                👍 {comment.votes?.up || 0}
              </button>
              <button
                onClick={() => onVote(String(comment.id), 'down')}
                className="flex items-center gap-1 hover:text-foreground"
              >
                👎 {comment.votes?.down || 0}
              </button>
              <button onClick={() => onReply(String(comment.id))} className="hover:text-foreground">
                Reply
              </button>
              {canModerate && (
                <button
                  onClick={() => onModerate(String(comment.id), 'hide', 'Inappropriate content')}
                  className="hover:text-foreground"
                >
                  Moderate
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiscussionThread;
