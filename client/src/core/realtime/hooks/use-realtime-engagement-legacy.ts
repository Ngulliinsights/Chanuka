/**
 * Legacy Real-time Engagement Hook
 * 
 * This is a legacy hook maintained for backward compatibility.
 * Use useBillTracking and useCommunityRealTime hooks for new implementations.
 */

import { useState, useEffect, useCallback } from 'react';
import { realTimeService } from '../services/realtime-service';
import { logger } from '@client/utils/logger';

export interface RealTimeEngagementHookReturn {
  isConnected: boolean;
  subscribedBills: Set<number>;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
  getRecentUpdates: (billId: number, limit?: number) => any[];
  getEngagementMetrics: (billId: number) => any;
  getTypingIndicators: (billId: number, parentId?: string) => any[];
  sendTypingIndicator: (billId: number, parentId?: string) => void;
  stopTypingIndicator: (billId: number, parentId?: string) => void;
}

/**
 * @deprecated Use useBillTracking and useCommunityRealTime hooks instead
 */
export function useRealTimeEngagement(): RealTimeEngagementHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedBills, setSubscribedBills] = useState<Set<number>>(new Set());
  const [billData, setBillData] = useState<Map<number, any>>(new Map());

  const billTrackingService = realTimeService.getBillTrackingService();
  const communityService = realTimeService.getCommunityService();

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
  // Bill Subscription Management
  // ============================================================================

  const subscribeToBill = useCallback((billId: number) => {
    if (subscribedBills.has(billId)) {
      logger.debug('Already subscribed to bill (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      });
      return;
    }

    try {
      billTrackingService.subscribeToBill(billId);
      setSubscribedBills(prev => new Set([...prev, billId]));

      logger.info('Subscribed to bill (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      });
    } catch (error) {
      logger.error('Failed to subscribe to bill (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
    }
  }, [subscribedBills]);

  const unsubscribeFromBill = useCallback((billId: number) => {
    if (!subscribedBills.has(billId)) {
      return;
    }

    try {
      billTrackingService.unsubscribeFromBill(billId);
      setSubscribedBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });

      // Clear cached data
      setBillData(prev => {
        const newMap = new Map(prev);
        newMap.delete(billId);
        return newMap;
      });

      logger.info('Unsubscribed from bill (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from bill (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
    }
  }, [subscribedBills]);

  // ============================================================================
  // Data Access Methods
  // ============================================================================

  const getRecentUpdates = useCallback((billId: number, limit: number = 10): unknown[] => {
    try {
      const updates = billTrackingService.getBillUpdates(billId);
      return updates.slice(-limit);
    } catch (error) {
      logger.error('Failed to get recent updates (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
      return [];
    }
  }, []);

  const getEngagementMetrics = useCallback((billId: number): any => {
    try {
      return billTrackingService.getEngagementMetrics(billId);
    } catch (error) {
      logger.error('Failed to get engagement metrics (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
      return null;
    }
  }, []);

  const getTypingIndicators = useCallback((billId: number, parentId?: string): unknown[] => {
    try {
      return communityService.getTypingIndicators(billId, parentId);
    } catch (error) {
      logger.error('Failed to get typing indicators (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
      return [];
    }
  }, []);

  const sendTypingIndicator = useCallback((billId: number, parentId?: string) => {
    try {
      communityService.sendTypingIndicator(billId, parentId);
      logger.debug('Sent typing indicator (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      });
    } catch (error) {
      logger.error('Failed to send typing indicator (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
    }
  }, []);

  const stopTypingIndicator = useCallback((billId: number, parentId?: string) => {
    try {
      communityService.stopTypingIndicator(billId, parentId);
      logger.debug('Stopped typing indicator (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      });
    } catch (error) {
      logger.error('Failed to stop typing indicator (legacy)', {
        component: 'useRealTimeEngagement',
        billId
      }, error);
    }
  }, []);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Unsubscribe from all bills on unmount
      for (const billId of subscribedBills) {
        try {
          billTrackingService.unsubscribeFromBill(billId);
        } catch (error) {
          logger.error('Error unsubscribing from bill on unmount (legacy)', {
            component: 'useRealTimeEngagement',
            billId
          }, error);
        }
      }
    };
  }, [subscribedBills]);

  // Log deprecation warning
  useEffect(() => {
    logger.warn('useRealTimeEngagement is deprecated. Use useBillTracking and useCommunityRealTime hooks instead.', {
      component: 'useRealTimeEngagement'
    });
  }, []);

  return {
    isConnected,
    subscribedBills,
    subscribeToBill,
    unsubscribeFromBill,
    getRecentUpdates,
    getEngagementMetrics,
    getTypingIndicators,
    sendTypingIndicator,
    stopTypingIndicator
  };
}