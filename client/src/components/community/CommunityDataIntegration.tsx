/**
 * Community Data Integration Component
 * 
 * Demonstrates the integration of community features with backend services
 * and real-time WebSocket updates. This component serves as a comprehensive
 * example of how community data flows through the system.
 */

import React, { useEffect, useState } from 'react';
import { 
  useCommunityWebSocket, 
  useDiscussionUpdates, 
  useExpertUpdates, 
  useCommunityAnalytics,
  useCommunityNotifications,
  useCommunityBackend 
} from '../../hooks/useCommunityWebSocket';
import { useCommunityStore } from '../../store/slices/communitySlice';
import { useDiscussionStore } from '../../store/slices/discussionSlice';
import { logger } from '../../utils/logger';

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

  // Store integration
  const {
    activityFeed,
    trendingTopics: storeTrendingTopics,
    expertInsights,
    stats,
    initializeRealTime: initializeCommunityRealTime,
    cleanupRealTime: cleanupCommunityRealTime,
    loadActivityFeed,
    loadTrendingTopics,
    loadExpertInsights
  } = useCommunityStore();

  const {
    threads,
    comments,
    typingIndicators,
    initializeRealTime: initializeDiscussionRealTime,
    cleanupRealTime: cleanupDiscussionRealTime,
    loadThread,
    loadComments
  } = useDiscussionStore();

  // Initialize real-time features
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize community real-time features
        await initializeCommunityRealTime();
        
        // Initialize discussion real-time features
        await initializeDiscussionRealTime();

        logger.info('Community data integration initialized', { 
          component: 'CommunityDataIntegration',
          billId: selectedBillId 
        });
      } catch (error) {
        logger.error('Failed to initialize community data integration', { 
          component: 'CommunityDataIntegration' 
        }, error);
      }
    };

    initialize();

    return () => {
      cleanupCommunityRealTime();
      cleanupDiscussionRealTime();
    };
  }, [initializeCommunityRealTime, initializeDiscussionRealTime, cleanupCommunityRealTime, cleanupDiscussionRealTime]);

  // Subscribe to discussion updates for selected bill
  useEffect(() => {
    if (isConnected && selectedBillId) {
      subscribeToDiscussion(selectedBillId);
      
      return () => {
        unsubscribeFromDiscussion(selectedBillId);
      };
    }
  }, [isConnected, selectedBillId, subscribeToDiscussion, unsubscribeFromDiscussion]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!backendInitialized) return;

      try {
        // Load community data
        await Promise.all([
          loadActivityFeed(),
          loadTrendingTopics(),
          loadExpertInsights()
        ]);

        // Load discussion data for selected bill
        if (selectedBillId) {
          await Promise.all([
            loadThread(selectedBillId),
            loadComments(selectedBillId)
          ]);
        }

        logger.info('Community data loaded', { 
          component: 'CommunityDataIntegration',
          billId: selectedBillId 
        });
      } catch (error) {
        logger.error('Failed to load community data', { 
          component: 'CommunityDataIntegration' 
        }, error);
      }
    };

    loadData();
  }, [backendInitialized, selectedBillId, loadActivityFeed, loadTrendingTopics, loadExpertInsights, loadThread, loadComments]);

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
      const insight = {
        billId: selectedBillId,
        expertId: 'demo-expert',
        title: 'Demo Expert Analysis',
        content: `Expert insight from integration demo - ${new Date().toISOString()}`,
        category: 'constitutional' as const,
        severity: 'medium' as const,
        tags: ['demo', 'integration']
      };

      const newInsight = await communityBackendService.submitExpertInsight(insight);
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
              <h4 className="font-medium text-gray-700 mb-2">Store State</h4>
              <pre className="bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify({
                  activityFeedCount: activityFeed.length,
                  trendingTopicsCount: storeTrendingTopics.length,
                  expertInsightsCount: expertInsights.length,
                  threadsCount: Object.keys(threads).length,
                  commentsCount: Object.keys(comments).length,
                  typingIndicatorsCount: typingIndicators.length
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