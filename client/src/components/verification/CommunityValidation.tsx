import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Flag, 
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { CommunityValidation as CommunityValidationType } from '@client/types/expert';

interface CommunityValidationProps {
  validation: CommunityValidationType;
  contributionId: string;
  onVote?: (contributionId: string, vote: 'up' | 'down') => Promise<void>;
  onComment?: (contributionId: string, comment: string) => Promise<void>;
  onReport?: (contributionId: string, reason: string) => Promise<void>;
  showComments?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * CommunityValidation - Community validation system with upvote/downvote functionality
 * 
 * Features:
 * - Upvote/downvote with visual feedback
 * - Comment system integration
 * - Community reporting functionality
 * - Validation score calculation and display
 * - Accessible voting controls
 */
export function CommunityValidation({
  validation,
  contributionId,
  onVote,
  onComment,
  onReport,
  showComments = true,
  compact = false,
  className
}: CommunityValidationProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleVote = useCallback(async (vote: 'up' | 'down') => {
    if (!onVote || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(contributionId, vote);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  }, [onVote, contributionId, isVoting]);

  const handleComment = useCallback(async () => {
    if (!onComment || !commentText.trim() || isSubmittingComment) return;
    
    setIsSubmittingComment(true);
    try {
      await onComment(contributionId, commentText.trim());
      setCommentText('');
      setShowCommentForm(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [onComment, contributionId, commentText, isSubmittingComment]);

  const getValidationScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-amber-600';
    return 'text-red-600';
  };

  const getValidationScoreLabel = (score: number) => {
    if (score >= 0.7) return 'High Community Support';
    if (score >= 0.4) return 'Mixed Community Response';
    return 'Low Community Support';
  };

  const totalVotes = validation.upvotes + validation.downvotes;
  const upvotePercentage = totalVotes > 0 ? (validation.upvotes / totalVotes) * 100 : 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('up')}
          disabled={isVoting}
          className={cn(
            "text-xs h-auto p-1 transition-colors",
            validation.userVote === 'up' && "text-green-600 bg-green-50"
          )}
        >
          <ThumbsUp className="h-3 w-3 mr-1" />
          {validation.upvotes}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('down')}
          disabled={isVoting}
          className={cn(
            "text-xs h-auto p-1 transition-colors",
            validation.userVote === 'down' && "text-red-600 bg-red-50"
          )}
        >
          <ThumbsDown className="h-3 w-3 mr-1" />
          {validation.downvotes}
        </Button>
        
        {showComments && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-auto p-1"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            {validation.comments}
          </Button>
        )}
        
        <div className="flex items-center gap-1">
          <TrendingUp className={cn("h-3 w-3", getValidationScoreColor(validation.validationScore))} />
          <span className={cn("text-xs font-medium", getValidationScoreColor(validation.validationScore))}>
            {Math.round(validation.validationScore * 100)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community Validation
          </CardTitle>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("h-4 w-4", getValidationScoreColor(validation.validationScore))} />
            <span className={cn("font-semibold", getValidationScoreColor(validation.validationScore))}>
              {Math.round(validation.validationScore * 100)}%
            </span>
          </div>
        </div>
        <CardDescription>
          {getValidationScoreLabel(validation.validationScore)} • {totalVotes} total votes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant={validation.userVote === 'up' ? "default" : "outline"}
                size="sm"
                onClick={() => handleVote('up')}
                disabled={isVoting}
                className={cn(
                  "transition-all duration-200",
                  validation.userVote === 'up' && "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Helpful ({validation.upvotes})
              </Button>
              
              <Button
                variant={validation.userVote === 'down' ? "default" : "outline"}
                size="sm"
                onClick={() => handleVote('down')}
                disabled={isVoting}
                className={cn(
                  "transition-all duration-200",
                  validation.userVote === 'down' && "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Not Helpful ({validation.downvotes})
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {onReport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReport(contributionId, 'inappropriate')}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Vote Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Community Response</span>
              <span className="font-medium">
                {Math.round(upvotePercentage)}% positive
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${upvotePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{validation.upvotes} helpful</span>
              <span>{validation.downvotes} not helpful</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Discussion ({validation.comments})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="text-xs"
              >
                Add Comment
              </Button>
            </div>

            {showCommentForm && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                <Textarea
                  placeholder="Share your thoughts on this analysis..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px] text-sm"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {commentText.length}/500 characters
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCommentForm(false);
                        setCommentText('');
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="text-xs"
                    >
                      {isSubmittingComment ? (
                        <>
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        'Post Comment'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation Guidelines */}
        <div className="pt-3 border-t">
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Validation Guidelines
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Vote "Helpful" for accurate, well-sourced analysis
                </span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Vote "Not Helpful" for misleading or unsupported claims
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ValidationSummary - Compact validation summary for lists
 */
interface ValidationSummaryProps {
  validation: CommunityValidationType;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

export function ValidationSummary({
  validation,
  size = 'md',
  showScore = true,
  className
}: ValidationSummaryProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'gap-2',
          icon: 'h-3 w-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'gap-3',
          icon: 'h-5 w-5',
          text: 'text-sm'
        };
      default:
        return {
          container: 'gap-2',
          icon: 'h-4 w-4',
          text: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const totalVotes = validation.upvotes + validation.downvotes;

  return (
    <div className={cn("flex items-center", sizeClasses.container, className)}>
      <div className="flex items-center gap-1">
        <ThumbsUp className={cn(sizeClasses.icon, "text-green-600")} />
        <span className={cn(sizeClasses.text, "font-medium")}>
          {validation.upvotes}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <ThumbsDown className={cn(sizeClasses.icon, "text-red-600")} />
        <span className={cn(sizeClasses.text, "font-medium")}>
          {validation.downvotes}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <MessageCircle className={cn(sizeClasses.icon, "text-blue-600")} />
        <span className={cn(sizeClasses.text, "font-medium")}>
          {validation.comments}
        </span>
      </div>
      
      {showScore && (
        <Badge 
          variant="secondary" 
          className={cn(
            sizeClasses.text,
            getValidationScoreColor(validation.validationScore)
          )}
        >
          {Math.round(validation.validationScore * 100)}% validated
        </Badge>
      )}
    </div>
  );
}