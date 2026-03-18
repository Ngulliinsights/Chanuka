/**
 * useComparisonCart Hook Tests
 *
 * Unit tests for the comparison cart hook with proper Redux integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useComparisonCart } from '../useComparisonCart';
import { comparisonCartSlice } from '../../store/comparisonCartSlice';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      comparisonCart: comparisonCartSlice.reducer,
    },
    preloadedState: {
      comparisonCart: {
        billIds: [],
        maxBills: 4,
        ...initialState,
      },
    },
  });
};

// Test wrapper component
const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useComparisonCart', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('initial state', () => {
    it('should return empty cart initially', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      expect(result.current.billIds).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(result.current.maxBills).toBe(4);
      expect(result.current.canAddMore).toBe(true);
    });

    it('should return correct initial state with preloaded data', () => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2'],
        maxBills: 3,
      });

      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-2']);
      expect(result.current.count).toBe(2);
      expect(result.current.maxBills).toBe(3);
      expect(result.current.canAddMore).toBe(true);
    });
  });

  describe('addBill', () => {
    it('should add bill to cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.addBill('bill-1');
      });

      expect(result.current.billIds).toEqual(['bill-1']);
      expect(result.current.count).toBe(1);
      expect(result.current.canAddMore).toBe(true);
    });

    it('should add multiple bills', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.addBill('bill-1');
        result.current.addBill('bill-2');
        result.current.addBill('bill-3');
      });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-2', 'bill-3']);
      expect(result.current.count).toBe(3);
      expect(result.current.canAddMore).toBe(true);
    });

    it('should update canAddMore when reaching max capacity', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.addBill('bill-1');
        result.current.addBill('bill-2');
        result.current.addBill('bill-3');
        result.current.addBill('bill-4');
      });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-2', 'bill-3', 'bill-4']);
      expect(result.current.count).toBe(4);
      expect(result.current.canAddMore).toBe(false);
    });
  });

  describe('removeBill', () => {
    beforeEach(() => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2', 'bill-3'],
      });
    });

    it('should remove bill from cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.removeBill('bill-2');
      });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-3']);
      expect(result.current.count).toBe(2);
      expect(result.current.canAddMore).toBe(true);
    });

    it('should handle removing non-existent bill', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.removeBill('non-existent');
      });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-2', 'bill-3']);
      expect(result.current.count).toBe(3);
    });
  });

  describe('toggleBill', () => {
    beforeEach(() => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2'],
      });
    });

    it('should add bill if not in cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.toggleBill('bill-3');
      });

      expect(result.current.billIds).toEqual(['bill-1', 'bill-2', 'bill-3']);
      expect(result.current.count).toBe(3);
    });

    it('should remove bill if already in cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.toggleBill('bill-2');
      });

      expect(result.current.billIds).toEqual(['bill-1']);
      expect(result.current.count).toBe(1);
    });
  });

  describe('clearCart', () => {
    beforeEach(() => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2', 'bill-3'],
      });
    });

    it('should clear all bills from cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.billIds).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(result.current.canAddMore).toBe(true);
    });
  });

  describe('setBills', () => {
    it('should set bills to specific array', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.setBills(['bill-a', 'bill-b', 'bill-c']);
      });

      expect(result.current.billIds).toEqual(['bill-a', 'bill-b', 'bill-c']);
      expect(result.current.count).toBe(3);
    });

    it('should replace existing bills', () => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2'],
      });

      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.setBills(['bill-x', 'bill-y']);
      });

      expect(result.current.billIds).toEqual(['bill-x', 'bill-y']);
      expect(result.current.count).toBe(2);
    });
  });

  describe('hasBill', () => {
    beforeEach(() => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2', 'bill-3'],
      });
    });

    it('should return true for bills in cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      expect(result.current.hasBill('bill-1')).toBe(true);
      expect(result.current.hasBill('bill-2')).toBe(true);
      expect(result.current.hasBill('bill-3')).toBe(true);
    });

    it('should return false for bills not in cart', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      expect(result.current.hasBill('bill-4')).toBe(false);
      expect(result.current.hasBill('non-existent')).toBe(false);
    });
  });

  describe('memoization', () => {
    it('should memoize callback functions', () => {
      const wrapper = createWrapper(store);
      const { result, rerender } = renderHook(() => useComparisonCart(), { wrapper });

      const initialAddBill = result.current.addBill;
      const initialRemoveBill = result.current.removeBill;
      const initialToggleBill = result.current.toggleBill;
      const initialClearCart = result.current.clearCart;
      const initialSetBills = result.current.setBills;
      const initialHasBill = result.current.hasBill;

      // Rerender the hook
      rerender();

      // Functions should be the same reference (memoized)
      expect(result.current.addBill).toBe(initialAddBill);
      expect(result.current.removeBill).toBe(initialRemoveBill);
      expect(result.current.toggleBill).toBe(initialToggleBill);
      expect(result.current.clearCart).toBe(initialClearCart);
      expect(result.current.setBills).toBe(initialSetBills);
      expect(result.current.hasBill).toBe(initialHasBill);
    });

    it('should update hasBill when billIds change', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      // Initially no bills
      expect(result.current.hasBill('bill-1')).toBe(false);

      // Add a bill
      act(() => {
        result.current.addBill('bill-1');
      });

      // Now should have the bill
      expect(result.current.hasBill('bill-1')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined state gracefully', () => {
      // Create store with undefined comparison cart state
      const storeWithUndefinedState = configureStore({
        reducer: {
          comparisonCart: comparisonCartSlice.reducer,
        },
        preloadedState: {
          // No comparisonCart state
        },
      });

      const wrapper = createWrapper(storeWithUndefinedState);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      // Should use default values
      expect(result.current.billIds).toEqual([]);
      expect(result.current.maxBills).toBe(4);
      expect(result.current.count).toBe(0);
      expect(result.current.canAddMore).toBe(true);
    });

    it('should handle custom maxBills setting', () => {
      store = createMockStore({
        billIds: ['bill-1', 'bill-2'],
        maxBills: 2,
      });

      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      expect(result.current.maxBills).toBe(2);
      expect(result.current.canAddMore).toBe(false); // Already at max
    });

    it('should handle empty string bill IDs', () => {
      const wrapper = createWrapper(store);
      const { result } = renderHook(() => useComparisonCart(), { wrapper });

      act(() => {
        result.current.addBill('');
      });

      expect(result.current.billIds).toEqual(['']);
      expect(result.current.count).toBe(1);
      expect(result.current.hasBill('')).toBe(true);
    });
  });
});
