/**
 * Comparison Cart Hook
 * 
 * Manages persistent state for bill comparison selections.
 * Uses Redux with localStorage persistence for cross-session state.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@client/lib/hooks/store';
import type { RootState } from '@client/infrastructure/store';
import {
  addBill,
  removeBill,
  toggleBill,
  clearCart,
  setBills,
} from '../store/comparisonCartSlice';

export interface UseComparisonCartReturn {
  billIds: string[];
  maxBills: number;
  count: number;
  addBill: (id: string) => void;
  removeBill: (id: string) => void;
  clearCart: () => void;
  toggleBill: (id: string) => void;
  hasBill: (id: string) => boolean;
  canAddMore: boolean;
  setBills: (ids: string[]) => void;
}

export const useComparisonCart = (): UseComparisonCartReturn => {
  const dispatch = useAppDispatch();
  
  // Use inline selectors to avoid type issues with redux-persist
  const billIds = useAppSelector((state) => (state as any).comparisonCart?.billIds || []);
  const maxBills = useAppSelector((state) => (state as any).comparisonCart?.maxBills || 4);
  const count = billIds.length;
  const canAddMore = billIds.length < maxBills;

  const handleAddBill = useCallback((id: string) => {
    dispatch(addBill(id));
  }, [dispatch]);

  const handleRemoveBill = useCallback((id: string) => {
    dispatch(removeBill(id));
  }, [dispatch]);

  const handleToggleBill = useCallback((id: string) => {
    dispatch(toggleBill(id));
  }, [dispatch]);

  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const handleSetBills = useCallback((ids: string[]) => {
    dispatch(setBills(ids));
  }, [dispatch]);

  const hasBill = useCallback((id: string) => {
    return billIds.includes(id);
  }, [billIds]);

  return {
    billIds,
    maxBills,
    count,
    addBill: handleAddBill,
    removeBill: handleRemoveBill,
    clearCart: handleClearCart,
    toggleBill: handleToggleBill,
    hasBill,
    canAddMore,
    setBills: handleSetBills,
  };
};
