/**
 * Bill Tracking Hook - Core Real-time Module
 * 
 * Consolidated hook for managing bill tracking subscriptions and real-time updates.
 * Replaces scattered bill tracking hooks with a unified implementation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeService } from '../services/realtime-service';
import { 
  BillTrackingHookReturn, 
  BillUpdate, 
  BillEngagementUpdate 
} from '../types';
import { logger } from '@client/utils/logger';

export function useBillTracking(): BillTrackingHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedBills, setSubscribedBills] = useState<Set<number>>(new Set());
  const [billUpdates, setBillUpdates] = useState<Map<number, BillUpdate[]>>(new Map());
  const [engagementMetrics, setEngagementMetrics] = useState<Map<number, BillEngagementUpdate>>(new Map());

  const billTrackingService = useRef(realTimeService.getBillTrackingService());
  const subscriptionIds = useRef<Map<number, string>>(new Map());

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
      logger.debug('Already subscribed to bill', {
        component: 'useBillTracking',
        billId
      });
      return;
    }

    try {
      const subscriptionId = billTrackingService.current.subscribeToBill(billId);
      subscriptionIds.current.set(billId, subscriptionId);
      
      setSubscribedBills(prev => new Set([...prev, billId]));

      logger.info('Subscribed to bill tracking', {
        component: 'useBillTracking',
        billId,
        subscriptionId
      });
    } catch (error) {
      logger.error('Failed to subscribe to bill', {
        component: 'useBillTracking',
        billId
      }, error);
    }
  }, [subscribedBills]);

  const unsubscribeFromBill = useCallback((billId: number) => {
    if (!subscribedBills.has(billId)) {
      return;
    }

    try {
      billTrackingService.current.unsubscribeFromBill(billId);
      subscriptionIds.current.delete(billId);
      
      setSubscribedBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });

      // Clear cached data for this bill
      setBillUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(billId);
        return newMap;
      });

      setEngagementMetrics(prev => {
        const newMap = new Map(prev);
        newMap.delete(billId);
        return newMap;
      });

      logger.info('Unsubscribed from bill tracking', {
        component: 'useBillTracking',
        billId
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from bill', {
        component: 'useBillTracking',
        billId
      }, error);
    }
  }, [subscribedBills]);

  // ============================================================================
  // Data Access
  // ============================================================================

  const getBillUpdates = useCallback((billId: number): BillUpdate[] => {
    return billUpdates.get(billId) || billTrackingService.current.getBillUpdates(billId);
  }, [billUpdates]);

  const getEngagementMetrics = useCallback((billId: number): BillEngagementUpdate | null => {
    return engagementMetrics.get(billId) || billTrackingService.current.getEngagementMetrics(billId);
  }, [engagementMetrics]);

  // ============================================================================
  // Real-time Updates
  // ============================================================================

  useEffect(() => {
    // Set up listeners for bill updates
    const handleBillUpdate = (update: BillUpdate) => {
      const billId = update.data.billId;
      
      setBillUpdates(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(billId) || [];
        const updates = [...existing, update].slice(-50); // Keep last 50 updates
        newMap.set(billId, updates);
        return newMap;
      });
    };

    const handleEngagementUpdate = (metrics: BillEngagementUpdate) => {
      const billId = metrics.bill_id;
      
      setEngagementMetrics(prev => {
        const newMap = new Map(prev);
        newMap.set(billId, metrics);
        return newMap;
      });
    };

    // Subscribe to real-time updates
    const unsubscribeBillUpdate = realTimeService.on('billUpdate', handleBillUpdate);
    const unsubscribeEngagementUpdate = realTimeService.on('engagementUpdate', handleEngagementUpdate);

    return () => {
      unsubscribeBillUpdate();
      unsubscribeEngagementUpdate();
    };
  }, []);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Unsubscribe from all bills on unmount
      for (const billId of subscribedBills) {
        try {
          billTrackingService.current.unsubscribeFromBill(billId);
        } catch (error) {
          logger.error('Error unsubscribing from bill on unmount', {
            component: 'useBillTracking',
            billId
          }, error);
        }
      }
    };
  }, [subscribedBills]);

  // ============================================================================
  // Sync with Service State
  // ============================================================================

  useEffect(() => {
    // Periodically sync with service state
    const syncInterval = setInterval(() => {
      try {
        const serviceStats = billTrackingService.current.getStats();
        const serviceBills = billTrackingService.current.getSubscribedBills();
        
        // Update subscribed bills if they differ
        const currentBills = Array.from(subscribedBills);
        if (JSON.stringify(currentBills.sort()) !== JSON.stringify(serviceBills.sort())) {
          setSubscribedBills(new Set(serviceBills));
        }

        // Update engagement metrics
        const allMetrics = billTrackingService.current.getAllEngagementMetrics();
        setEngagementMetrics(new Map(allMetrics));

        // Update bill updates for subscribed bills
        serviceBills.forEach(billId => {
          const updates = billTrackingService.current.getBillUpdates(billId);
          if (updates.length > 0) {
            setBillUpdates(prev => {
              const newMap = new Map(prev);
              newMap.set(billId, updates);
              return newMap;
            });
          }
        });
      } catch (error) {
        logger.error('Error syncing with bill tracking service', {
          component: 'useBillTracking'
        }, error);
      }
    }, 5000); // Sync every 5 seconds

    return () => {
      clearInterval(syncInterval);
    };
  }, [subscribedBills]);

  return {
    isConnected,
    subscribedBills,
    billUpdates,
    engagementMetrics,
    subscribeToBill,
    unsubscribeFromBill,
    getBillUpdates,
    getEngagementMetrics
  };
}