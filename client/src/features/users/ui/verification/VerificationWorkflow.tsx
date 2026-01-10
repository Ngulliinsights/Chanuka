import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Eye,
  MessageSquare,
  User,
  FileText,
  RotateCcw,
} from 'lucide-react';
import React from 'react';
import { useState, useCallback } from 'react';

import {
  VerificationWorkflow as VerificationWorkflowType,
  VerificationStatus,
} from '@client/features/users/types';
import { cn } from '@client/shared/lib/utils';
import { Avatar, AvatarFallback } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Textarea } from '@client/shared/design-system';

interface VerificationWorkflowProps {
  workflow: VerificationWorkflowType;
  onReview?: (workflowId: string, status: VerificationStatus, notes: string) => Promise<void>;
  onCommunityFeedback?: (
    workflowId: string,
    feedback: string,
    vote: 'approve' | 'reject' | 'needs_revision'
  ) => Promise<void>;
  canReview?: boolean;
  showCommunityFeedback?: boolean;
  className?: string;
}

/**
 * VerificationWorkflow - Workflow component for reviewing and validating expert contributions
 *
 * Features:
 * - Multi-stage review process (pending -> in_review -> approved/rejected/needs_revision)
 * - Community feedback integration
 * - Review notes and feedback history
 * - Status tracking with visual indicators
 * - Accessible review controls
 */
export function VerificationWorkflow({
  workflow,
  onReview,
  onCommunityFeedback,
  canReview = false,
  showCommunityFeedback = true,
  className,
}: VerificationWorkflowProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [communityFeedback, setCommunityFeedback] = useState('');
  const [selectedVote, setSelectedVote] = useState<'approve' | 'reject' | 'needs_revision' | null>(
    null
  );
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const getStatusConfig = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending Review',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      case 'in_review':
        return {
          icon: Eye,
          label: 'Under Review',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'approved':
        return {
          icon: CheckCircle,
          label: 'Approved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'rejected':
        return {
          icon: Circle,
          label: 'Rejected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'needs_revision':
        return {
          icon: RotateCcw,
          label: 'Needs Revision',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      default:
        return {
          icon: AlertCircle,
          label: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const handleReview = useCallback(
    async (status: VerificationStatus) => {
      if (!onReview || !reviewNotes.trim()) return;

      setIsReviewing(true);
      try {
        await onReview(workflow.id, status, reviewNotes.trim());
        setReviewNotes('');
      } catch (error) {
        console.error('Error submitting review:', error);
      } finally {
        setIsReviewing(false);
      }
    },
    [onReview, workflow.id, reviewNotes]
  );

  const handleCommunityFeedback = useCallback(async () => {
    if (!onCommunityFeedback || !communityFeedback.trim() || !selectedVote) return;

    setIsSubmittingFeedback(true);
    try {
      await onCommunityFeedback(workflow.id, communityFeedback.trim(), selectedVote);
      setCommunityFeedback('');
      setSelectedVote(null);
    } catch (error) {
      console.error('Error submitting community feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [onCommunityFeedback, workflow.id, communityFeedback, selectedVote]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusConfig = getStatusConfig(workflow.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Verification Review
          </CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1 px-3 py-1',
              statusConfig.color,
              statusConfig.bgColor,
              statusConfig.borderColor
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>
          Contribution ID: {workflow.contributionId} • Created {formatDate(workflow.createdAt)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Review Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expert ID:</span>
            <span className="font-medium">{workflow.expertId}</span>
          </div>

          {workflow.reviewerId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reviewer:</span>
              <span className="font-medium">{workflow.reviewerId}</span>
            </div>
          )}

          {workflow.reviewDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Review Date:</span>
              <span className="font-medium">{formatDate(workflow.reviewDate)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="font-medium">{formatDate(workflow.updatedAt)}</span>
          </div>
        </div>

        {/* Review Notes */}
        {workflow.reviewNotes && (
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Review Notes
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{workflow.reviewNotes}</p>
          </div>
        )}

        {/* Review Actions (for reviewers) */}
        {canReview && (workflow.status === 'pending' || workflow.status === 'in_review') && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900">Review This Contribution</h4>

            <Textarea
              placeholder="Add review notes (required)..."
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              className="min-h-[100px] text-sm"
              maxLength={1000}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {reviewNotes.length}/1000 characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview('needs_revision')}
                  disabled={!reviewNotes.trim() || isReviewing}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Needs Revision
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReview('rejected')}
                  disabled={!reviewNotes.trim() || isReviewing}
                  className="text-xs"
                >
                  <Circle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReview('approved')}
                  disabled={!reviewNotes.trim() || isReviewing}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Community Feedback Section */}
        {showCommunityFeedback && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Community Feedback ({workflow.communityFeedback.length})
            </h4>

            {/* Existing Community Feedback */}
            {workflow.communityFeedback.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {workflow.communityFeedback.map((feedback, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-md text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {feedback.userId.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{feedback.userId}</span>
                        <Badge
                          variant={
                            feedback.vote === 'approve'
                              ? 'default'
                              : feedback.vote === 'reject'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {feedback.vote.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(feedback.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{feedback.feedback}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Community Feedback */}
            {workflow.status !== 'approved' && workflow.status !== 'rejected' && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                <h5 className="text-sm font-medium">Add Your Feedback</h5>

                <div className="flex gap-2 mb-2">
                  <Button
                    variant={selectedVote === 'approve' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedVote('approve')}
                    className="text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant={selectedVote === 'needs_revision' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedVote('needs_revision')}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Needs Work
                  </Button>
                  <Button
                    variant={selectedVote === 'reject' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedVote('reject')}
                    className="text-xs"
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>

                <Textarea
                  placeholder="Explain your feedback..."
                  value={communityFeedback}
                  onChange={e => setCommunityFeedback(e.target.value)}
                  className="min-h-[80px] text-sm"
                  maxLength={500}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {communityFeedback.length}/500 characters
                  </span>
                  <Button
                    size="sm"
                    onClick={handleCommunityFeedback}
                    disabled={!communityFeedback.trim() || !selectedVote || isSubmittingFeedback}
                    className="text-xs"
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
