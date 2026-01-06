/**
 * Community Real-time Hook - Core Real-time Module
 *
 * Consolidated hook for managing community real-time features including
 * discussions, typing indicators, comments, and votes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';

import { realTimeService } from '../services/realtime-service';
import { CommunityRealTimeHookReturn, TypingIndicator, CommentUpdate } from '../types';

export function useCommunityRealTime(): CommunityRealTimeHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedDiscussions, setSubscribedDiscussions] = useState<Set<string>>(new Set());
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator[]>>(
    new Map()
  );
  const [recentComments, setRecentComments] = useState<CommentUpdate[]>([]);

  const communityService = useRef(realTimeService.getCommunityService());
  const subscriptionIds = useRef<Map<string, string>>(new Map());

  // ============================================================================
  // Connection Status
  // ============================================================================

  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(realTimeService.isConnected());
    };

    // Set initial status
    updateConnectionStatus();

    // Listen for connection changes
    const unsubscribeConnection = realTimeService.on('connectionChange', updateConnectionStatus);

    return () => {
      unsubscribeConnection();
    };
  }, []);

  // ============================================================================
  // Discussion Subscription Management
  // ============================================================================

  const subscribeToDiscussion = useCallback(
    (billId: number) => {
      const discussionId = `bill_${billId}`;

      if (subscribedDiscussions.has(discussionId)) {
        logger.debug('Already subscribed to discussion', {
          component: 'useCommunityRealTime',
          discussionId,
          billId,
        });
        return;
      }

      try {
        const subscriptionId = communityService.current.subscribeToDiscussion(billId);
        subscriptionIds.current.set(discussionId, subscriptionId);

        setSubscribedDiscussions(prev => new Set([...prev, discussionId]));

        logger.info('Subscribed to discussion', {
          component: 'useCommunityRealTime',
          discussionId,
          billId,
          subscriptionId,
        });
      } catch (error) {
        logger.error(
          'Failed to subscribe to discussion',
          {
            component: 'useCommunityRealTime',
            discussionId,
            billId,
          },
          error
        );
      }
    },
    [subscribedDiscussions]
  );

  const unsubscribeFromDiscussion = useCallback(
    (billId: number) => {
      const discussionId = `bill_${billId}`;

      if (!subscribedDiscussions.has(discussionId)) {
        return;
      }

      try {
        communityService.current.unsubscribeFromDiscussion(discussionId);
        subscriptionIds.current.delete(discussionId);

        setSubscribedDiscussions(prev => {
          const newSet = new Set(prev);
          newSet.delete(discussionId);
          return newSet;
        });

        // Clear typing indicators for this discussion
        setTypingIndicators(prev => {
          const newMap = new Map(prev);
          newMap.delete(`${billId}_root`);
          // Clear all typing indicators for this bill (including threaded comments)
          for (const key of newMap.keys()) {
            if (key.startsWith(`${billId}_`)) {
              newMap.delete(key);
            }
          }
          return newMap;
        });

        logger.info('Unsubscribed from discussion', {
          component: 'useCommunityRealTime',
          discussionId,
          billId,
        });
      } catch (error) {
        logger.error(
          'Failed to unsubscribe from discussion',
          {
            component: 'useCommunityRealTime',
            discussionId,
            billId,
          },
          error
        );
      }
    },
    [subscribedDiscussions]
  );

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  const sendTypingIndicator = useCallback((billId: number, parentId?: string) => {
    try {
      communityService.current.sendTypingIndicator(billId, parentId);

      logger.debug('Sent typing indicator', {
        component: 'useCommunityRealTime',
        billId,
        parentId,
      });
    } catch (error) {
      logger.error(
        'Failed to send typing indicator',
        {
          component: 'useCommunityRealTime',
          billId,
          parentId,
        },
        error
      );
    }
  }, []);

  const stopTypingIndicator = useCallback((billId: number, parentId?: string) => {
    try {
      communityService.current.stopTypingIndicator(billId, parentId);

      logger.debug('Stopped typing indicator', {
        component: 'useCommunityRealTime',
        billId,
        parentId,
      });
    } catch (error) {
      logger.error(
        'Failed to stop typing indicator',
        {
          component: 'useCommunityRealTime',
          billId,
          parentId,
        },
        error
      );
    }
  }, []);

  // ============================================================================
  // Comment and Vote Updates
  // ============================================================================

  const sendCommentUpdate = useCallback((billId: number, commentData: Record<string, unknown>) => {
    try {
      communityService.current.sendCommentUpdate(billId, commentData);

      logger.debug('Sent comment update', {
        component: 'useCommunityRealTime',
        billId,
        commentData,
      });
    } catch (error) {
      logger.error(
        'Failed to send comment update',
        {
          component: 'useCommunityRealTime',
          billId,
          commentData,
        },
        error
      );
    }
  }, []);

  const sendVoteUpdate = useCallback((billId: number, voteData: Record<string, unknown>) => {
    try {
      communityService.current.sendVoteUpdate(billId, voteData);

      logger.debug('Sent vote update', {
        component: 'useCommunityRealTime',
        billId,
        voteData,
      });
    } catch (error) {
      logger.error(
        'Failed to send vote update',
        {
          component: 'useCommunityRealTime',
          billId,
          voteData,
        },
        error
      );
    }
  }, []);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  useEffect(() => {
    // Set up listeners for community updates
    const handleTypingIndicator = (indicator: TypingIndicator) => {
      const key = `${indicator.billId}_${indicator.parentId || 'root'}`;

      setTypingIndicators(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(key) || [];

        if (indicator.isTyping) {
          // Add or update typing indicator
          const filtered = existing.filter(t => t.userId !== indicator.userId);
          newMap.set(key, [...filtered, indicator]);
        } else {
          // Remove typing indicator
          const filtered = existing.filter(t => t.userId !== indicator.userId);
          if (filtered.length > 0) {
            newMap.set(key, filtered);
          } else {
            newMap.delete(key);
          }
        }

        return newMap;
      });
    };

    const handleCommentUpdate = (update: CommentUpdate) => {
      setRecentComments(prev => [update, ...prev].slice(0, 100)); // Keep last 100 comments
    };

    // Subscribe to real-time updates
    const unsubscribeTyping = realTimeService.on('typingIndicator', handleTypingIndicator);
    const unsubscribeComment = realTimeService.on('commentUpdate', handleCommentUpdate);

    return () => {
      unsubscribeTyping();
      unsubscribeComment();
    };
  }, []);

  // ============================================================================
  // Sync with Service State
  // ============================================================================

  useEffect(() => {
    // Periodically sync with service state
    const syncInterval = setInterval(() => {
      try {
        // Update typing indicators from service
        subscribedDiscussions.forEach(discussionId => {
          const billId = parseInt(discussionId.replace('bill_', ''));
          if (!isNaN(billId)) {
            const indicators = communityService.current.getTypingIndicators(billId);
            if (indicators.length > 0) {
              const key = `${billId}_root`;
              setTypingIndicators(prev => {
                const newMap = new Map(prev);
                newMap.set(key, indicators);
                return newMap;
              });
            }
          }
        });

        // Update recent comments from service
        const serviceComments = communityService.current.getRecentComments(20);
        if (serviceComments.length > 0) {
          setRecentComments(serviceComments);
        }
      } catch (error) {
        logger.error(
          'Error syncing with community service',
          {
            component: 'useCommunityRealTime',
          },
          error
        );
      }
    }, 3000); // Sync every 3 seconds

    return () => {
      clearInterval(syncInterval);
    };
  }, [subscribedDiscussions]);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Unsubscribe from all discussions on unmount
      for (const discussionId of subscribedDiscussions) {
        try {
          communityService.current.unsubscribeFromDiscussion(discussionId);
        } catch (error) {
          logger.error(
            'Error unsubscribing from discussion on unmount',
            {
              component: 'useCommunityRealTime',
              discussionId,
            },
            error
          );
        }
      }
    };
  }, [subscribedDiscussions]);

  return {
    isConnected,
    subscribedDiscussions,
    typingIndicators,
    recentComments,
    subscribeToDiscussion,
    unsubscribeFromDiscussion,
    sendTypingIndicator,
    stopTypingIndicator,
    sendCommentUpdate,
    sendVoteUpdate,
  };
}
