/**
 * Bills API Hook - Redux Integration
 * 
 * Provides React hooks for interacting with the bills API and managing
 * bills state through Redux. This is a simplified version that works
 * with Redux Toolkit instead of Zustand.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setBills, updateBill, Bill } from '../store/slices/billsSlice';
import { billsApiService, BillsSearchParams } from '../services/billsApiService';
import { billsWebSocketService } from '../services/billsWebSocketService';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface UseBillsAPIOptions {
  enableRealTime?: boolean;
  enablePagination?: boolean;
  enableCaching?: boolean;
  onLoadComplete?: (bills: Bill[]) => void;
}

export interface UseBillsAPIReturn {
  // Data
  bills: Bill[];
  stats: any;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  loadBills: (params?: BillsSearchParams) => Promise<void>;
  loadBillById: (id: number) => Promise<Bill | null>;
  searchBills: (params: BillsSearchParams) => Promise<void>;
  refreshData: () => Promise<void>;
  recordEngagement: (billId: number, type: 'view' | 'save' | 'share') => Promise<void>;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useBillsAPI(options: UseBillsAPIOptions = {}): UseBillsAPIReturn {
  const {
    enableRealTime = false,
    onLoadComplete
  } = options;

  // Redux integration
  const dispatch = useDispatch();
  const billsState = useSelector((state: RootState) => state.bills);
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  // ============================================================================
  // API Functions
  // ============================================================================

  const loadBills = useCallback(async (params: BillsSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await billsApiService.getBills(params);
      if (response.success) {
        dispatch(setBills(response.data.bills));
        
        if (onLoadCompleteRef.current) {
          onLoadCompleteRef.current(response.data.bills);
        }
        
        logger.info('Bills loaded successfully', {
          component: 'useBillsAPI',
          count: response.data.bills.length,
          params
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to load bills', {
        component: 'useBillsAPI',
        error: errorMessage,
        params
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch, onLoadCompleteRef]);

  const loadBillById = useCallback(async (id: number): Promise<Bill | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await billsApiService.getBillById(id);
      if (response.success) {
        const bill = response.data;
        dispatch(updateBill({ id, updates: bill }));
        
        if (enableRealTime) {
          // Subscribe to real-time updates for this bill
          await billsWebSocketService.subscribeToBill(id);
        }
        
        logger.info('Bill loaded successfully', {
          component: 'useBillsAPI',
          billId: id
        });
        
        return bill;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to load bill', {
        component: 'useBillsAPI',
        billId: id,
        error: errorMessage
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch, enableRealTime]);

  const searchBills = useCallback(async (params: BillsSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await billsApiService.searchBills(params);
      if (response.success) {
        dispatch(setBills(response.data.bills));
        
        if (onLoadCompleteRef.current) {
          onLoadCompleteRef.current(response.data.bills);
        }
        
        logger.info('Bills search completed', {
          component: 'useBillsAPI',
          count: response.data.bills.length,
          params
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to search bills', {
        component: 'useBillsAPI',
        error: errorMessage,
        params
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dispatch, onLoadCompleteRef]);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reload current bills with default params
      await loadBills({});
      
      logger.info('Data refreshed successfully', {
        component: 'useBillsAPI'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to refresh data', {
        component: 'useBillsAPI',
        error: errorMessage
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadBills]);

  const recordEngagement = useCallback(async (billId: number, type: 'view' | 'save' | 'share') => {
    try {
      await billsApiService.recordEngagement(billId, type);
      
      logger.debug('Engagement recorded', {
        component: 'useBillsAPI',
        billId,
        type
      });
    } catch (error) {
      logger.error('Failed to record engagement', {
        component: 'useBillsAPI',
        billId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw for engagement errors - they're not critical
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize WebSocket service if real-time is enabled
  useEffect(() => {
    if (enableRealTime) {
      billsWebSocketService.initialize().catch(error => {
        logger.error('Failed to initialize WebSocket service', {
          component: 'useBillsAPI',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }
  }, [enableRealTime]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Data
    bills: billsState.bills,
    stats: billsState.stats,
    
    // State
    loading: loading || billsState.loading,
    error: error || billsState.error,
    
    // Actions
    loadBills,
    loadBillById,
    searchBills,
    refreshData,
    recordEngagement
  };
}

// ============================================================================
// Individual Bill Hook
// ============================================================================

export interface UseBillOptions {
  enableRealTime?: boolean;
}

export interface UseBillReturn {
  bill: Bill | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBill(billId: number, options: UseBillOptions = {}): UseBillReturn {
  const { enableRealTime = false } = options;
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useDispatch();
  const billsState = useSelector((state: RootState) => state.bills);

  const loadBill = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await billsApiService.getBillById(billId);
      if (response.success) {
        const loadedBill = response.data;
        setBill(loadedBill);
        dispatch(updateBill({ id: billId, updates: loadedBill }));
        
        if (enableRealTime) {
          await billsWebSocketService.subscribeToBill(billId);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to load bill', {
        component: 'useBill',
        billId,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [billId, enableRealTime, dispatch]);

  // Load bill on mount
  useEffect(() => {
    loadBill();
    
    return () => {
      if (enableRealTime) {
        billsWebSocketService.unsubscribeFromBill(billId).catch(error => {
          logger.error('Failed to unsubscribe from bill', {
            component: 'useBill',
            billId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    };
  }, [loadBill, billId, enableRealTime]);

  // Update bill when store changes
  useEffect(() => {
    const storeBill = billsState.bills.find(b => b.id === billId);
    if (storeBill) {
      setBill(storeBill);
    }
  }, [billsState.bills, billId]);

  return {
    bill,
    loading,
    error,
    refresh: loadBill
  };
}

// ============================================================================
// Export
// ============================================================================

export default useBillsAPI;

// ============================================================================
// Infinite Scroll Hook
// ============================================================================

export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export interface UseInfiniteScrollReturn {
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useInfiniteScroll(threshold: number = 0.8): UseInfiniteScrollReturn {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      // This would typically load more data
      // For now, we'll just simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info('Loaded more bills', {
        component: 'useInfiniteScroll'
      });
    } catch (error) {
      logger.error('Failed to load more bills', {
        component: 'useInfiniteScroll',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      if (scrollPercentage >= threshold && !isLoadingMore && hasMore) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, isLoadingMore, hasMore, loadMore]);

  return {
    isLoadingMore,
    hasMore,
    loadMore
  };
}