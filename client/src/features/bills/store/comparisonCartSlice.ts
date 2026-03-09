/**
 * Comparison Cart Slice
 *
 * Manages state for bill comparison selections with localStorage persistence.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ComparisonCartState {
  billIds: string[];
  maxBills: number;
}

const STORAGE_KEY = 'comparison-cart';

// Load initial state from localStorage
const loadFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed.billIds) ? parsed.billIds : [];
    }
  } catch (error) {
    console.error('Failed to load comparison cart from storage:', error);
  }
  return [];
};

const initialState: ComparisonCartState = {
  billIds: loadFromStorage(),
  maxBills: 4,
};

const comparisonCartSlice = createSlice({
  name: 'comparisonCart',
  initialState,
  reducers: {
    addBill: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.billIds.length < state.maxBills && !state.billIds.includes(id)) {
        state.billIds.push(id);
        saveToStorage(state.billIds);
      }
    },

    removeBill: (state, action: PayloadAction<string>) => {
      state.billIds = state.billIds.filter(id => id !== action.payload);
      saveToStorage(state.billIds);
    },

    toggleBill: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.billIds.indexOf(id);
      
      if (index !== -1) {
        state.billIds.splice(index, 1);
      } else if (state.billIds.length < state.maxBills) {
        state.billIds.push(id);
      }
      saveToStorage(state.billIds);
    },

    clearCart: (state) => {
      state.billIds = [];
      saveToStorage([]);
    },

    setBills: (state, action: PayloadAction<string[]>) => {
      state.billIds = action.payload.slice(0, state.maxBills);
      saveToStorage(state.billIds);
    },
  },
});

// Helper function to save to localStorage
function saveToStorage(billIds: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ billIds, version: 1 }));
  } catch (error) {
    console.error('Failed to save comparison cart to storage:', error);
  }
}

// Export actions
export const { addBill, removeBill, toggleBill, clearCart, setBills } = comparisonCartSlice.actions;

// Export selectors
export const selectComparisonBillIds = (state: { comparisonCart: ComparisonCartState }) => 
  state.comparisonCart.billIds;

export const selectComparisonMaxBills = (state: { comparisonCart: ComparisonCartState }) => 
  state.comparisonCart.maxBills;

export const selectComparisonCount = (state: { comparisonCart: ComparisonCartState }) => 
  state.comparisonCart.billIds.length;

export const selectCanAddMore = (state: { comparisonCart: ComparisonCartState }) => 
  state.comparisonCart.billIds.length < state.comparisonCart.maxBills;

export const selectHasBill = (billId: string) => (state: { comparisonCart: ComparisonCartState }) =>
  state.comparisonCart.billIds.includes(billId);

// Export reducer
export default comparisonCartSlice.reducer;
