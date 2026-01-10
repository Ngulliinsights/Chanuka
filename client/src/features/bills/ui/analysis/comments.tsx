import {
  MessageSquare,
  ChevronUp as ChevronUp,
  ChevronDown as ChevronDown,
  BarChart3,
  Reply,
  Flag,
  Award,
  CheckCircle as CheckCircle,
  Users,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useBillAnalysis } from '@client/features/bills';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card } from '@client/shared/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/shared/design-system';
import { Input } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';
import { Textarea } from '@client/shared/design-system';
import { logger } from '@client/shared/utils/logger';
// Using a simple date formatting function instead of date-fns
const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

interface Comment {
  id: string;
  user_id: number;
  username: string;
  userInitials: string;
  expertise?: string;
  content: string;
  created_at: Date;
  endorsements: number;
  // cspell:ignore downvotes upvotes
  downvotes: number;
  upvotes: number;
  parent_id?: number;
  verifiedClaims: number;
  isHighlighted: boolean;
  replies?: Comment[];
  pollData?: {
    question: string;
    options: Array<{ text: string; votes: number }>;
    totalVotes: number;
    userVote?: number;
  };
}

interface Poll {
  question: string;
  options: string[];
}

interface CommentsProps {
  comments: Comment[];
  onAddComment: (content: string, expertise?: string) => Promise<void>;
  onEndorseComment: (commentId: string) => Promise<void>;
  isAddingComment: boolean;
  isEndorsing: boolean;
  sortOrder: 'newest' | 'oldest' | 'endorsed';
  bill_id: number;
  billSection?: string;
}

export function Comments({
  comments,
  onAddComment,
  onEndorseComment,
  isAddingComment,
  isEndorsing,
  sortOrder,
  bill_id,
  billSection,
}: CommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollData, setPollData] = useState<Poll>({ question: '', options: ['', ''] });
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [characterCount, setCharacterCount] = useState(0);

  const maxCommentLength = 2000;
  const minQualityLength = 50;

  // Update character count when comment changes
  useEffect(() => {
    setCharacterCount(newComment.length);
  }, [newComment]);

  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || newComment.length < minQualityLength) return;

    try {
      await onAddComment(newComment, newExpertise);
      setNewComment('');
      setNewExpertise('');
      setCharacterCount(0);
    } catch (error) {
      logger.error('Failed to add comment:', { component: 'Chanuka' }, error);
    }
  };

  const handleSubmitPoll = async () => {
    if (!pollData.question.trim() || pollData.options.some(opt => !opt.trim())) return;

    try {
      const response = await fetch(`/api/bills/${bill_id}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollData.question,
          options: pollData.options.filter(opt => opt.trim()),
          section: billSection,
        }),
      });

      if (response.ok) {
        setShowPollDialog(false);
        setPollData({ question: '', options: ['', ''] });
      }
    } catch (error) {
      logger.error('Failed to create poll:', { component: 'Chanuka' }, error);
    }
  };

  const handleVote = async (commentId: string, type: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        // Comments will be updated by parent
      }
    } catch (error) {
      logger.error('Failed to vote:', { component: 'Chanuka' }, error);
    }
  };

  const handlePollVote = async (commentId: string, optionIndex: number) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      });

      if (response.ok) {
        // Comments will be updated by parent
      }
    } catch (error) {
      logger.error('Failed to vote on poll:', { component: 'Chanuka' }, error);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      const response = await fetch(`/api/bills/${bill_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          parent_id: parentId,
          section: billSection,
        }),
      });

      if (response.ok) {
        setReplyingTo(null);
        setReplyContent('');
        // Comments will be updated by parent
      }
    } catch (error) {
      logger.error('Failed to reply:', { component: 'Chanuka' }, error);
    }
  };

  const handleHighlight = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/highlight`, {
        method: 'POST',
      });

      if (response.ok) {
        // Comments will be updated by parent
      }
    } catch (error) {
      logger.error('Failed to highlight comment:', { component: 'Chanuka' }, error);
    }
  };

  const addPollOption = () => {
    if (pollData.options.length < 6) {
      setPollData(prev => ({
        ...prev,
        options: [...prev.options, ''],
      }));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  };

  const removePollOption = (index: number) => {
    if (pollData.options.length > 2) {
      setPollData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const getCommentPreview = (content: string, maxLength = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getSortIcon = (sortType: string) => {
    switch (sortType) {
      case 'recent':
        return <Clock className="w-4 h-4" />;
      case 'popular':
        return <TrendingUp className="w-4 h-4" />;
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getEngagementScore = (comment: Comment) => {
    return comment.upvotes + comment.endorsements + (comment.replies?.length || 0) * 2;
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isExpanded = expandedComments.has(comment.id);
    const shouldTruncate = comment.content.length > 300;
    const displayContent =
      shouldTruncate && !isExpanded ? getCommentPreview(comment.content) : comment.content;
    const engagement_score = getEngagementScore(comment);

    return (
      <Card
        key={comment.id}
        className={`transition-all duration-200 hover:shadow-md ${
          isReply ? 'ml-8 border-l-4 border-blue-200 bg-blue-50/30' : ''
        } ${
          comment.isHighlighted
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-sm'
            : 'p-4 mb-4'
        } ${!isReply ? 'p-6 mb-6' : 'p-4 mb-4'}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-semibold ${
                isReply ? 'w-8 h-8 text-sm' : 'w-12 h-12'
              }`}
            >
              {comment.userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{comment.username}</span>
                {comment.expertise && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                  >
                    {comment.expertise}
                  </Badge>
                )}
                {comment.verifiedClaims > 0 && (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified Expert
                  </Badge>
                )}
                {comment.isHighlighted && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {engagement_score > 10 && (
                  <Badge
                    variant="outline"
                    className="text-purple-700 border-purple-300 bg-purple-50"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    High Engagement
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(comment.created_at))}
                </span>
                {engagement_score > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {engagement_score} engagement points
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{displayContent}</div>

          {shouldTruncate && (
            <button
              onClick={() => toggleCommentExpansion(comment.id)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}

          {comment.pollData && (
            <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                {comment.pollData.question}
              </h4>
              <div className="space-y-3">
                {comment.pollData.options.map((option, index) => {
                  const percentage =
                    comment.pollData!.totalVotes > 0
                      ? ((option.votes / comment.pollData!.totalVotes) * 100).toFixed(1)
                      : '0';
                  const isUserVote = comment.pollData!.userVote === index;

                  return (
                    <div key={index} className="relative">
                      <button
                        onClick={() => handlePollVote(comment.id, index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
                          isUserVote
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{option.text}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{option.votes} votes</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {comment.pollData.totalVotes} total votes
                </p>
                {comment.pollData.userVote !== undefined && (
                  <p className="text-sm text-blue-600 font-medium">You voted</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleVote(comment.id, 'up')}
              className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors group"
            >
              <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">{comment.upvotes}</span>
            </button>

            <button
              onClick={() => handleVote(comment.id, 'down')}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors group"
            >
              <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">{comment.downvotes}</span>
            </button>

            <button
              onClick={() => setReplyingTo(comment.id)}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group"
            >
              <Reply className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Reply</span>
              {comment.replies && comment.replies.length > 0 && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {comment.replies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleHighlight(comment.id)}
              className="flex items-center gap-2 text-gray-500 hover:text-amber-600 transition-colors group"
            >
              <Award className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          </div>

          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Report this comment"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        {replyingTo === comment.id && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Textarea
              value={replyContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReplyContent(e.target.value)
              }
              placeholder="Share your thoughtful response..."
              className="mb-3 bg-white border-blue-200 focus:border-blue-400"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleReply(comment.id)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Post Reply
              </Button>
              <Button
                onClick={() => setReplyingTo(null)}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
            </p>
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </Card>
    );
  };

  const getQualityIndicator = () => {
    if (characterCount < minQualityLength) {
      return {
        color: 'text-orange-600',
        message: `${minQualityLength - characterCount} more characters for quality analysis`,
      };
    }
    if (characterCount > maxCommentLength) {
      return {
        color: 'text-red-600',
        message: `${characterCount - maxCommentLength} characters over limit`,
      };
    }
    return { color: 'text-green-600', message: 'Good length for meaningful contribution' };
  };

  const qualityIndicator = getQualityIndicator();

  return (
    <div className="space-y-6">
      {/* Enhanced Comment Input Section */}
      <Card className="p-6 bg-gradient-to-br from-white to-blue-50/30 border-blue-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Contribute Your Analysis</h3>
            {billSection && (
              <p className="text-sm text-gray-600 mt-1">
                Commenting on: <span className="font-medium text-blue-700">{billSection}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              value={newComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewComment(e.target.value)
              }
              placeholder="Share your detailed legal analysis, policy concerns, potential impacts, or insights about this legislation. Quality contributions help inform public discourse..."
              className="min-h-[140px] text-base leading-relaxed border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              maxLength={maxCommentLength}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className={`text-xs ${qualityIndicator.color}`}>
                {characterCount}/{maxCommentLength}
              </span>
            </div>
          </div>

          {characterCount > 0 && (
            <div className={`text-sm ${qualityIndicator.color} bg-gray-50 p-3 rounded-lg border`}>
              {qualityIndicator.message}
            </div>
          )}

          <Input
            value={newExpertise}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpertise(e.target.value)}
            placeholder="Your relevant expertise (e.g., Constitutional Law, Public Policy, Healthcare Administration)"
            className="max-w-lg border-gray-300 focus:border-blue-500"
          />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmitComment}
              disabled={
                !newComment.trim() ||
                characterCount < minQualityLength ||
                characterCount > maxCommentLength ||
                isAddingComment
              }
              className="bg-blue-600 hover:bg-blue-700 px-6"
            >
              {isAddingComment ? 'Posting...' : 'Post Analysis'}
            </Button>

            <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create a Public Poll</DialogTitle>
                  <p className="text-gray-600">
                    Gather community input on specific aspects of this legislation
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    value={pollData.question}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPollData(prev => ({ ...prev, question: e.target.value }))
                    }
                    placeholder="What specific question would you like the community to vote on?"
                    className="text-base"
                  />

                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Answer Options:
                    </label>
                    {pollData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePollOption(index, e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                          className="flex-1"
                        />
                        {pollData.options.length > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePollOption(index)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={addPollOption}
                      disabled={pollData.options.length >= 6}
                    >
                      Add Option
                    </Button>
                    <Button
                      onClick={handleSubmitPoll}
                      disabled={
                        !pollData.question.trim() || pollData.options.some(opt => !opt.trim())
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Poll
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Enhanced Comments List */}
      <div>
        {comments.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="max-w-md mx-auto">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Start the Discussion</h3>
              <p className="text-gray-600 leading-relaxed">
                Be the first to contribute your analysis and help shape informed public discourse on
                this legislation. Your expertise and insights matter.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">{comments.map(comment => renderComment(comment))}</div>
        )}
      </div>
    </div>
  );
}
