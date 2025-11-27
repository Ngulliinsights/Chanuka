/**
 * Community Data Integration Component
 * 
 * Demonstrates the integration of community features with backend services
 * and real-time WebSocket updates. This component serves as a comprehensive
 * example of how community data flows through the system.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  useCommunityWebSocket,
  useDiscussionUpdates,
  useExpertUpdates,
  useCommunityAnalytics,
  useCommunityNotifications,
  useCommunityBackend
} from '@client/features/community/hooks/useCommunityWebSocket';
import { useActivityFeed, useTrendingTopics, useExpertInsights, useCommunityStats } from '@client/features/community/hooks/useCommunity';
import { useCommunityUI } from '@client/store/slices/communitySlice';
import { useSafeEffect } from '@client/hooks/useSafeEffect';
import { logger } from '@client/utils/logger';

interface CommunityDataIntegrationProps {
  billId?: number;
  showDebugInfo?: boolean;
}

export const CommunityDataIntegration: React.FC<CommunityDataIntegrationProps> = ({
  billId,
  showDebugInfo = false
}) => {
  const [selectedBillId, setSelectedBillId] = useState<number>(billId || 1);

  // Community WebSocket integration
  const {
    isConnected,
    isInitialized,
    error: wsError,
    subscribeToDiscussion,
    unsubscribeFromDiscussion,
    sendTypingIndicator,
    stopTypingIndicator
  } = useCommunityWebSocket();

  // Real-time updates hooks
  const { updates: discussionUpdates, typingUsers, clearUpdates: clearDiscussionUpdates } = useDiscussionUpdates(selectedBillId);
  const { updates: expertUpdates, clearUpdates: clearExpertUpdates } = useExpertUpdates();
  const { analytics, trendingTopics, clearAnalytics } = useCommunityAnalytics();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCommunityNotifications();

  // Backend integration
  const { isInitialized: backendInitialized, error: backendError, communityBackendService } = useCommunityBackend();

  // UI state
  const ui = useCommunityUI();

  // Server state hooks
  const activityFeed = useActivityFeed(ui.filters, ui.currentPage, ui.itemsPerPage);
  const trendingTopicsQuery = useTrendingTopics();
  const expertInsights = useExpertInsights(selectedBillId);
  const stats = useCommunityStats();

  // Refs to track latest state values to prevent race conditions
  const isConnectedRef = useRef(isConnected);
  const backendInitializedRef = useRef(backendInitialized);
  const selectedBillIdRef = useRef(selectedBillId);

  // Update refs when state changes
  isConnectedRef.current = isConnected;
  backendInitializedRef.current = backendInitialized;
  selectedBillIdRef.current = selectedBillId;

  // Subscribe to discussion updates when connected and bill selected
  useSafeEffect(() => {
    if (isConnected && selectedBillId) {
      subscribeToDiscussion(selectedBillId);
      return () => unsubscribeFromDiscussion(selectedBillId);
    }
  }, [selectedBillId, isConnected, subscribeToDiscussion, unsubscribeFromDiscussion]);

  // Handle typing indicators
  const handleStartTyping = () => {
    if (selectedBillId) {
      sendTypingIndicator(selectedBillId);
    }
  };

  const handleStopTyping = () => {
    if (selectedBillId) {
      stopTypingIndicator(selectedBillId);
    }
  };

  // Demo functions for testing integration
  const testCommentSubmission = async () => {
    if (!selectedBillId || !backendInitialized) return;

    try {
      const commentData = {
        billId: selectedBillId,
        content: `Test comment from integration demo - ${new Date().toISOString()}`,
        parentId: undefined
      };

      const newComment = await communityBackendService.addComment(commentData);
      logger.info('Test comment submitted', { 
        component: 'CommunityDataIntegration',
        commentId: newComment.id 
      });
    } catch (error) {
      logger.error('Failed to submit test comment', { 
        component: 'CommunityDataIntegration' 
      }, error);
    }
  };

  const testExpertInsight = async () => {
    if (!selectedBillId || !backendInitialized) return;

    try {
      const content = `Expert insight from integration demo - ${new Date().toISOString()}`;

      // Build a full ExpertInsight-compatible payload (omit id/timestamps)
      const insight: Omit<import('../../types/community').ExpertInsight, 'id' | 'timestamp' | 'lastUpdated'> = {
        expertId: 'demo-expert',
        expertName: 'Demo Expert',
        expertAvatar: undefined,
        verificationType: 'identity',
        credibilityScore: 0.5,
        specializations: ['demo', 'integration'],

        title: 'Demo Expert Analysis',
        content,
        summary: content.slice(0, 200),
        confidence: 0.7,
        methodology: 'Automated integration demo',
        sources: [],

        billId: selectedBillId,
        billTitle: undefined,
        policyAreas: [],

        likes: 0,
        comments: 0,
        shares: 0,
        communityValidation: { upvotes: 0, downvotes: 0, validationScore: 0 },
      };

      const newInsight = await communityBackendService.submitExpertInsight(insight as any);
      logger.info('Test expert insight submitted', { 
        component: 'CommunityDataIntegration',
        insightId: newInsight.id 
      });
    } catch (error) {
      logger.error('Failed to submit test expert insight', { 
        component: 'CommunityDataIntegration' 
      }, error);
    }
  };

  if (!isInitialized || !backendInitialized) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Initializing community data integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Community Data Integration Demo
        </h2>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${backendInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              Backend: {backendInitialized ? 'Ready' : 'Initializing'}
            </span>
          </div>
        </div>

        {/* Bill Selection */}
        <div className="flex items-center space-x-4">
          <label htmlFor="billSelect" className="text-sm font-medium text-gray-700">
            Selected Bill:
          </label>
          <select
            id="billSelect"
            value={selectedBillId}
            onChange={(e) => setSelectedBillId(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={1}>Bill #1 - Healthcare Reform</option>
            <option value={2}>Bill #2 - Education Funding</option>
            <option value={3}>Bill #3 - Infrastructure Investment</option>
          </select>
        </div>

        {/* Error Display */}
        {(wsError || backendError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {wsError || backendError}
            </p>
          </div>
        )}
      </div>

      {/* Real-time Updates Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Discussion Updates */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Discussion Updates</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {discussionUpdates.length}
            </span>
          </div>
          
          {typingUsers.length > 0 && (
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {discussionUpdates.slice(0, 5).map((update, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{update.type}</div>
                <div className="text-gray-600">Bill #{update.billId}</div>
                <div className="text-gray-500">{new Date(update.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={clearDiscussionUpdates}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Clear Updates
          </button>
        </div>

        {/* Expert Updates */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Expert Updates</h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {expertUpdates.length}
            </span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {expertUpdates.slice(0, 5).map((update, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{update.type}</div>
                <div className="text-gray-600">
                  {update.type === 'insight_added' && `Bill #${update.data.billId}`}
                  {update.type === 'verification_updated' && `User: ${update.data.userId}`}
                </div>
                <div className="text-gray-500">{new Date(update.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={clearExpertUpdates}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Clear Updates
          </button>
        </div>

        {/* Community Analytics */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Community Analytics</h3>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {analytics.length}
            </span>
          </div>
          
          {trendingTopics.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Trending Topics:</div>
              <div className="flex flex-wrap gap-1">
                {trendingTopics.slice(0, 3).map((topic, index) => (
                  <span key={index} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    {topic.title || topic.name || `Topic ${index + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {analytics.slice(0, 3).map((analytic, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{analytic.type}</div>
                <div className="text-gray-500">{new Date(analytic.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={clearAnalytics}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Clear Analytics
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Community Notifications</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Mark All Read
            </button>
          </div>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {notifications.slice(0, 5).map((notification) => (
            <div key={notification.id} className="text-xs p-2 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{notification.title}</div>
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Mark Read
                </button>
              </div>
              <div className="text-gray-600">{notification.message}</div>
              <div className="text-gray-500">{new Date(notification.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Actions */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-3">Demo Actions</h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testCommentSubmission}
            disabled={!isConnected || !backendInitialized}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Test Comment Submission
          </button>
          
          <button
            onClick={testExpertInsight}
            disabled={!isConnected || !backendInitialized}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            Test Expert Insight
          </button>
          
          <button
            onClick={handleStartTyping}
            disabled={!isConnected}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-gray-300"
          >
            Start Typing
          </button>
          
          <button
            onClick={handleStopTyping}
            disabled={!isConnected}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:bg-gray-300"
          >
            Stop Typing
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-3">Debug Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Query State</h4>
              <pre className="bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify({
                  activityFeedCount: activityFeed.data?.length ?? 0,
                  trendingTopicsCount: trendingTopicsQuery.data?.length ?? 0,
                  expertInsightsCount: expertInsights.data?.length ?? 0,
                  statsLoaded: !!stats.stats.data
                }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Real-time Stats</h4>
              <pre className="bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify({
                  discussionUpdatesCount: discussionUpdates.length,
                  expertUpdatesCount: expertUpdates.length,
                  analyticsCount: analytics.length,
                  notificationsCount: notifications.length,
                  unreadCount,
                  typingUsersCount: typingUsers.length
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDataIntegration;