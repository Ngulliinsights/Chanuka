/**
 * Comparison Cart Hook
 * 
 * Manages persistent state for bill comparison selections.
 * Uses Zustand with localStorage persistence for cross-session state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ComparisonCartState {
  billIds: string[];
  maxBills: number;
  addBill: (id: string) => void;
  removeBill: (id: string) => void;
  clearCart: () => void;
  toggleBill: (id: string) => void;
  hasBill: (id: string) => boolean;
  canAddMore: () => boolean;
  setBills: (ids: string[]) => void;
}

export const useComparisonCart = create<ComparisonCartState>()(
  persist(
    (set, get) => ({
      billIds: [],
      maxBills: 4,

      addBill: (id: string) => {
        const { billIds, maxBills } = get();
        if (billIds.length < maxBills && !billIds.includes(id)) {
          set({ billIds: [...billIds, id] });
        }
      },

      removeBill: (id: string) => {
        set({ billIds: get().billIds.filter(bid => bid !== id) });
      },

      clearCart: () => {
        set({ billIds: [] });
      },

      toggleBill: (id: string) => {
        const { billIds } = get();
        if (billIds.includes(id)) {
          get().removeBill(id);
        } else {
          get().addBill(id);
        }
      },

      hasBill: (id: string) => {
        return get().billIds.includes(id);
      },

      canAddMore: () => {
        return get().billIds.length < get().maxBills;
      },

      setBills: (ids: string[]) => {
        const { maxBills } = get();
        set({ billIds: ids.slice(0, maxBills) });
      },
    }),
    {
      name: 'comparison-cart',
      version: 1,
    }
  )
);
