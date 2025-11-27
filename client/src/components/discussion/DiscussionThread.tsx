import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Users, 
  Filter, 
  Lock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { cn } from '@client/lib/utils';
import { 
  DiscussionThread as DiscussionThreadType, 
  Comment, 
  CommentFormData,
  CommentSortOption,
  CommentFilterOption,
  ModerationViolationType
} from '@client/types/community';

interface DiscussionThreadProps {
  thread: DiscussionThreadType;
  currentUserId?: string;
  canModerate?: boolean;
  onAddComment: (data: CommentFormData) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onVoteComment: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  onReportComment: (commentId: string, violationType: ModerationViolationType, reason: string) => Promise<void>;
  onModerateComment: (commentId: string, action: string, reason: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
}

/**
 * DiscussionThread - Main component for displaying and managing bill discussions
 * 
 * Features:
 * - Nested comment threading (5 levels maximum)
 * - Real-time comment updates via WebSocket integration
 * - Sorting and filtering options
 * - Community moderation and reporting
 * - Expert verification display
 * - Quality indicators and engagement metrics
 */
export function DiscussionThread({
  thread,
  currentUserId,
  canModerate = false,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onVoteComment,
  onReportComment,
  onModerateComment,
  onRefresh,
  className
}: DiscussionThreadProps) {
  const [sortBy, setSortBy] = useState<CommentSortOption>('newest');
  const [filterBy, setFilterBy] = useState<CommentFilterOption>('all');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sort and filter comments
  const processedComments = useMemo(() => {
    let comments = [...thread.comments];

    // Apply filters
    switch (filterBy) {
      case 'expert_only':
        comments = comments.filter(comment => comment.isExpertComment);
        break;
      case 'high_quality':
        comments = comments.filter(comment => comment.isHighQuality || comment.qualityScore > 0.7);
        break;
      case 'recent':
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        comments = comments.filter(comment => new Date(comment.createdAt) > oneDayAgo);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'newest':
        comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'most_voted':
        comments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        break;
      case 'controversial':
        comments.sort((a, b) => {
          const aControversy = Math.min(a.upvotes, a.downvotes) / Math.max(a.upvotes + a.downvotes, 1);
          const bControversy = Math.min(b.upvotes, b.downvotes) / Math.max(b.upvotes + b.downvotes, 1);
          return bControversy - aControversy;
        });
        break;
      case 'expert_first':
        comments.sort((a, b) => {
          if (a.isExpertComment && !b.isExpertComment) return -1;
          if (!a.isExpertComment && b.isExpertComment) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }

    return comments;
  }, [thread.comments, sortBy, filterBy]);

  // Handle comment submission
  const handleCommentSubmit = useCallback(async (data: CommentFormData) => {
    await onAddComment(data);
    setShowCommentForm(false);
    setReplyingTo(null);
  }, [onAddComment]);

  // Handle comment editing
  const handleCommentEdit = useCallback(async (commentId: string, content: string) => {
    await onUpdateComment(commentId, content);
    setEditingComment(null);
  }, [onUpdateComment]);

  // Handle reply action
  const handleReply = useCallback((parentId: string) => {
    setReplyingTo(parentId);
    setShowCommentForm(false); // Close main form if open
  }, []);

  // Handle edit action
  const handleEdit = useCallback((commentId: string) => {
    setEditingComment(commentId);
    setReplyingTo(null); // Close reply form if open
    setShowCommentForm(false); // Close main form if open
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // Get comment by ID for editing
  const getCommentById = useCallback((commentId: string): Comment | null => {
    const findComment = (comments: Comment[]): Comment | null => {
      for (const comment of comments) {
        if (comment.id === commentId) return comment;
        const found = findComment(comment.replies);
        if (found) return found;
      }
      return null;
    };
    return findComment(thread.comments);
  }, [thread.comments]);

  // Render thread statistics
  const renderThreadStats = () => (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <div className="flex items-center gap-1">
        <MessageSquare className="h-4 w-4" />
        <span>{thread.totalComments} comment{thread.totalComments !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4" />
        <span>{thread.participantCount} participant{thread.participantCount !== 1 ? 's' : ''}</span>
      </div>
      
      {thread.expertParticipation > 0 && (
        <Badge variant="secondary" className="text-xs">
          {Math.round(thread.expertParticipation * 100)}% Expert Participation
        </Badge>
      )}
      
      {thread.isLocked && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Locked
        </Badge>
      )}
    </div>
  );

  // Render controls
  const renderControls = () => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={sortBy} onValueChange={(value: CommentSortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="most_voted">Most Voted</SelectItem>
              <SelectItem value="controversial">Controversial</SelectItem>
              <SelectItem value="expert_first">Expert First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Options */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filterBy} onValueChange={(value: CommentFilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Comments</SelectItem>
              <SelectItem value="expert_only">Expert Only</SelectItem>
              <SelectItem value="high_quality">High Quality</SelectItem>
              <SelectItem value="recent">Recent (24h)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}

        {/* Add Comment Button */}
        {!thread.isLocked && currentUserId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="h-8 px-3 text-xs"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Add Comment
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("chanuka-card", className)}>
      <div className="chanuka-card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Discussion</h3>
          {renderThreadStats()}
        </div>
        
        {thread.isLocked && thread.lockReason && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Discussion Locked</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">{thread.lockReason}</p>
          </div>
        )}
      </div>

      <div className="chanuka-card-content">
        {renderControls()}

        {/* Main Comment Form */}
        {showCommentForm && !thread.isLocked && currentUserId && (
          <div className="py-4 border-b border-gray-200">
            <CommentForm
              billId={thread.billId}
              onSubmit={handleCommentSubmit}
              onCancel={() => setShowCommentForm(false)}
              placeholder="Share your thoughts on this bill..."
              autoFocus
            />
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4 py-4">
          {processedComments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {filterBy === 'all' 
                  ? "No comments yet. Be the first to share your thoughts!"
                  : "No comments match the current filter."
                }
              </p>
              {filterBy !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterBy('all')}
                  className="mt-2 text-xs"
                >
                  Show all comments
                </Button>
              )}
            </div>
          ) : (
            processedComments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                {editingComment === comment.id ? (
                  <CommentForm
                    billId={thread.billId}
                    initialContent={comment.content}
                    isEditing
                    onSubmit={(data) => handleCommentEdit(comment.id, data.content)}
                    onCancel={() => setEditingComment(null)}
                    placeholder="Edit your comment..."
                    autoFocus
                  />
                ) : (
                  <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    canModerate={canModerate}
                    onVote={onVoteComment}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={onDeleteComment}
                    onReport={onReportComment}
                    onModerate={onModerateComment}
                  />
                )}

                {/* Reply Form */}
                {replyingTo === comment.id && !thread.isLocked && (
                  <div className="ml-6 border-l-2 border-gray-100 pl-4">
                    <CommentForm
                      billId={thread.billId}
                      parentId={comment.id}
                      onSubmit={handleCommentSubmit}
                      onCancel={() => setReplyingTo(null)}
                      placeholder={`Reply to ${comment.authorName}...`}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Load More / Pagination could go here */}
        {processedComments.length > 0 && processedComments.length < thread.totalComments && (
          <div className="text-center py-4 border-t border-gray-200">
            <Button variant="outline" size="sm">
              Load More Comments ({thread.totalComments - processedComments.length} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}