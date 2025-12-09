/**
 * DiscussionIntegration - Example integration component for bill detail pages
 * 
 * Shows how to integrate the discussion system with existing bill detail views.
 * This component can be used as a reference or directly in bill detail pages.
 */

import { useDiscussion } from '@client/hooks/useDiscussion';
import { MessageSquare, Users, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@client/lib/utils';

import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

import { DiscussionThread } from './DiscussionThread';



interface DiscussionIntegrationProps {
  billId: number;
  currentUserId?: string;
  canModerate?: boolean;
  className?: string;
}

/**
 * DiscussionIntegration - Complete discussion integration for bill pages
 * 
 * Features:
 * - Automatic WebSocket subscription for real-time updates
 * - Error handling and loading states
 * - Integration with existing bill detail layout
 * - Responsive design for mobile and desktop
 */
export function DiscussionIntegration({
  billId,
  currentUserId,
  canModerate = false,
  className
}: DiscussionIntegrationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use the discussion hook for complete functionality
  const {
    thread,
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    voteComment,
    reportComment,
    moderateComment,
    refreshThread,
  } = useDiscussion({ 
    billId,
    autoSubscribe: true,
    enableTypingIndicators: true
  });

  // Show loading state
  if (loading && !thread) {
    return (
      <div className={cn("chanuka-card", className)}>
        <div className="chanuka-card-content">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>Loading discussion...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("chanuka-card", className)}>
        <div className="chanuka-card-content">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load discussion: {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshThread}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show empty state if no thread
  if (!thread) {
    return (
      <div className={cn("chanuka-card", className)}>
        <div className="chanuka-card-content">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Discussion Yet</h3>
            <p className="text-gray-500 mb-4">
              Be the first to start a discussion about this bill.
            </p>
            {currentUserId && (
              <Button onClick={() => setIsExpanded(true)}>
                Start Discussion
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Collapsed view - show summary
  if (!isExpanded) {
    return (
      <div className={cn("chanuka-card cursor-pointer hover:shadow-md transition-shadow", className)}>
        <div className="chanuka-card-content" onClick={() => setIsExpanded(true)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium">Discussion</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{thread.totalComments} comment{thread.totalComments !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {thread.participantCount} participant{thread.participantCount !== 1 ? 's' : ''}
                  </span>
                  {thread.expertParticipation > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(thread.expertParticipation * 100)}% Expert
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              View Discussion
            </Button>
          </div>
          
          {/* Show recent activity preview */}
          {comments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Recent activity:</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{comments[0].authorName}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comments[0].createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {comments[0].content}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded view - show full discussion
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Discussion</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsExpanded(false)}
        >
          Collapse
        </Button>
      </div>
      
      <DiscussionThread
        thread={thread}
        currentUserId={currentUserId}
        canModerate={canModerate}
        onAddComment={addComment}
        onUpdateComment={updateComment}
        onDeleteComment={deleteComment}
        onVoteComment={voteComment}
        onReportComment={reportComment}
        onModerateComment={moderateComment}
        onRefresh={refreshThread}
      />
    </div>
  );
}

/**
 * DiscussionSummary - Compact summary component for bill cards
 * 
 * Shows basic discussion metrics without full thread functionality.
 * Useful for bill listing pages or sidebar widgets.
 */
interface DiscussionSummaryProps {
  billId: number;
  totalComments?: number;
  participantCount?: number;
  expertParticipation?: number;
  lastActivity?: string;
  onClick?: () => void;
  className?: string;
}

export function DiscussionSummary({
  billId,
  totalComments = 0,
  participantCount = 0,
  expertParticipation = 0,
  lastActivity,
  onClick,
  className
}: DiscussionSummaryProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors",
        onClick && "cursor-pointer hover:bg-gray-50",
        className
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 text-gray-500" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">
            {totalComments} comment{totalComments !== 1 ? 's' : ''}
          </span>
          
          {participantCount > 0 && (
            <span className="text-gray-600">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          )}
          
          {expertParticipation > 0 && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(expertParticipation * 100)}% Expert
            </Badge>
          )}
        </div>
        
        {lastActivity && (
          <p className="text-xs text-gray-500 mt-1">
            Last activity: {new Date(lastActivity).toLocaleDateString()}
          </p>
        )}
      </div>
      
      {onClick && (
        <Button variant="ghost" size="sm" className="text-xs">
          View
        </Button>
      )}
    </div>
  );
}