/**
 * Bills State Management - Optimized Redux Toolkit Slice
 * Manages bills data, filtering, search, pagination, and real-time updates
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { mockDataService } from '../../services/mockDataService';
import { billsRepository } from '../../services';
import { billsWebSocketService } from '../../services/billsWebSocketService';
import { billsDataCache } from '../../services/billsDataCache';
import { billsPaginationService } from '../../services/billsPaginationService';
import type { Bill as ReadonlyBill, EngagementType } from '../../core/api';

export type { EngagementType } from '../../core/api';

// Mutable version of Bill for Redux state
// This strips 'readonly' modifiers to work with Immer's WritableDraft
export type Bill = {
    [K in keyof ReadonlyBill]: ReadonlyBill[K] extends ReadonlyArray<infer U>
    ? U[]
    : ReadonlyBill[K];
};

// Core Types
export interface BillsStats {
    totalBills: number;
    urgentCount: number;
    constitutionalFlags: number;
    trendingCount: number;
    lastUpdated: string;
}

export interface BillsFilter {
    status: string[];
    urgency: string[];
    policyAreas: string[];
    sponsors: string[];
    constitutionalFlags: boolean;
    controversyLevels: string[];
    dateRange: { start: string | null; end: string | null };
}

interface BillsState {
    bills: Bill[];
    stats: BillsStats;
    filters: BillsFilter;
    searchQuery: string;
    sortBy: 'date' | 'title' | 'urgency' | 'engagement';
    sortOrder: 'asc' | 'desc';
    currentPage: number;
    itemsPerPage: number;
    viewMode: 'grid' | 'list';
    lastUpdateTime: string | null;
    loading: boolean;
    error: string | null;
}

// Helper: Convert readonly Bill to mutable Bill for Redux
// This performs a deep copy and converts readonly arrays to mutable arrays
const toMutableBill = (bill: ReadonlyBill): Bill => {
    const mutableBill = { ...bill } as any;

    // Convert readonly arrays to mutable arrays
    if (bill.sponsors) {
        mutableBill.sponsors = [...bill.sponsors];
    }
    if (bill.constitutionalFlags) {
        mutableBill.constitutionalFlags = [...bill.constitutionalFlags];
    }
    if (bill.policyAreas) {
        mutableBill.policyAreas = [...bill.policyAreas];
    }
    if (bill.amendments) {
        mutableBill.amendments = [...bill.amendments];
    }

    return mutableBill as Bill;
};

// Helper: Convert array of readonly Bills to mutable Bills
const toMutableBills = (bills: ReadonlyBill[]): Bill[] => {
    return bills.map(toMutableBill);
};

// Helper: Calculate stats from bills array
const calculateStats = (bills: Bill[]): BillsStats => ({
    totalBills: bills.length,
    urgentCount: bills.filter(b => ['high', 'critical'].includes(b.urgencyLevel)).length,
    constitutionalFlags: bills.reduce((sum, b) => sum + (b.constitutionalFlags?.length || 0), 0),
    trendingCount: 0, // Calculate based on your trending logic
    lastUpdated: new Date().toISOString(),
});

// Initial State
const initialState: BillsState = {
    bills: [],
    stats: {
        totalBills: 0,
        urgentCount: 0,
        constitutionalFlags: 0,
        trendingCount: 0,
        lastUpdated: new Date().toISOString()
    },
    filters: {
        status: [],
        urgency: [],
        policyAreas: [],
        sponsors: [],
        constitutionalFlags: false,
        controversyLevels: [],
        dateRange: { start: null, end: null }
    },
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 12,
    viewMode: 'grid',
    lastUpdateTime: null,
    loading: false,
    error: null,
};


// Async Thunks
export const loadBillsFromAPI = createAsyncThunk<
    { bills: Bill[]; stats: BillsStats },
    any,
    { rejectValue: string }
>(
    'bills/loadBillsFromAPI',
    async (searchParams = {}, { rejectWithValue, signal }) => {
        try {
            // Check if request was cancelled
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            // Check cache first
            const cachedBills = await billsDataCache.getCachedBills(searchParams);
            const cachedStats = await billsDataCache.getCachedBillsStats();

            if (cachedBills && cachedStats && !signal.aborted) {
                return {
                    bills: toMutableBills(cachedBills),
                    stats: cachedStats
                };
            }

            // Check again before API call
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            // Load from API
            const response = await billsPaginationService.loadFirstPage(searchParams);

            // Final cancellation check
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            if (!response || !response.bills) {
                throw new Error('Invalid response from API');
            }

            // Cache the original data
            await billsDataCache.cacheBills(response.bills, searchParams);
            await billsDataCache.cacheBillsStats(response.stats);

            // Return mutable copies for Redux
            return {
                bills: toMutableBills(response.bills),
                stats: response.stats
            };
        } catch (error) {
            // Don't fallback if request was cancelled
            if (signal.aborted || (error instanceof Error && error.message === 'Request cancelled')) {
                return rejectWithValue('Request cancelled');
            }

            // Fallback to mock data
            try {
                const bills = await mockDataService.loadData('bills') as ReadonlyBill[];
                const stats = await mockDataService.loadData('billsStats') as BillsStats;
                return {
                    bills: toMutableBills(bills),
                    stats
                };
            } catch {
                return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bills');
            }
        }
    }
);

export const loadBillById = createAsyncThunk<
    Bill,
    number,
    { rejectValue: string }
>(
    'bills/loadBillById',
    async (id, { rejectWithValue }) => {
        try {
            // Check cache first
            const cachedBill = await billsDataCache.getCachedBill(id);
            if (cachedBill) {
                return toMutableBill(cachedBill);
            }

            // Load from API
            const bill = await billsRepository.getBill();

            if (!bill) {
                return rejectWithValue('Bill not found');
            }

            // Cache the original data
            await billsDataCache.cacheBill(bill);

            // Return mutable copy for Redux
            return toMutableBill(bill);
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bill');
        }
    }
);

export const searchBills = createAsyncThunk<
    { bills: Bill[]; stats: BillsStats },
    any,
    { rejectValue: string }
>(
    'bills/searchBills',
    async (searchParams, { rejectWithValue, signal }) => {
        try {
            // Check if request was cancelled
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            const result = await billsRepository.searchBills();

            // Check again after async operation
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            // Handle both array and object responses
            if (Array.isArray(result)) {
                const bills = result as ReadonlyBill[];
                return {
                    bills: toMutableBills(bills),
                    stats: calculateStats(toMutableBills(bills))
                };
            } else if (result && typeof result === 'object' && 'bills' in result) {
                const response = result as { bills: ReadonlyBill[]; stats: BillsStats };
                return {
                    bills: toMutableBills(response.bills),
                    stats: response.stats
                };
            }

            throw new Error('Invalid search response format');
        } catch (error) {
            // Don't process if request was cancelled
            if (signal.aborted || (error instanceof Error && error.message === 'Request cancelled')) {
                return rejectWithValue('Request cancelled');
            }
            return rejectWithValue(error instanceof Error ? error.message : 'Search failed');
        }
    }
);

export const loadNextPage = createAsyncThunk<
    Bill[],
    void,
    { rejectValue: string }
>(
    'bills/loadNextPage',
    async (_, { rejectWithValue }) => {
        try {
            const bills = await billsPaginationService.loadNextPage();

            if (!bills || bills.length === 0) {
                return rejectWithValue('No more pages available');
            }

            return toMutableBills(bills);
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load next page');
        }
    }
);

export const refreshBillsData = createAsyncThunk(
    'bills/refreshBillsData',
    async (_, { getState, dispatch, signal }) => {
        try {
            // Check if request was cancelled
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            const state = getState() as { bills: BillsState };
            billsDataCache.clear();

            // Check again before dispatching
            if (signal.aborted) {
                throw new Error('Request cancelled');
            }

            return dispatch(loadBillsFromAPI({
                query: state.bills.searchQuery,
                ...state.bills.filters
            })).unwrap();
        } catch (error) {
            if (signal.aborted || (error instanceof Error && error.message === 'Request cancelled')) {
                throw new Error('Request cancelled');
            }
            throw error;
        }
    }
);

export const recordEngagement = createAsyncThunk<
    { billId: number; type: EngagementType },
    { billId: number; type: EngagementType },
    { rejectValue: string }
>(
    'bills/recordEngagement',
    async ({ billId, type }, { rejectWithValue }) => {
        try {
            // Implement actual API call when available
            console.log(`Recording engagement: bill ${billId}, type ${type}`);
            return { billId, type };
        } catch (error) {
            console.warn('Engagement tracking failed:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to record engagement');
        }
    }
);

// Slice
const billsSlice = createSlice({
    name: 'bills',
    initialState,
    reducers: {
        setBills: (state, action: PayloadAction<ReadonlyBill[]>) => {
            // Convert readonly bills to mutable bills
            const mutableBills = toMutableBills(action.payload);
            state.bills = mutableBills as any;
            state.stats = calculateStats(mutableBills);
        },

        addBill: (state, action: PayloadAction<ReadonlyBill>) => {
            // Convert to mutable structure before adding
            const mutableBill = toMutableBill(action.payload);
            state.bills.unshift(mutableBill as any);
            state.stats = calculateStats(state.bills as Bill[]);
        },

        updateBill: (state, action: PayloadAction<{ id: number; updates: Partial<ReadonlyBill> }>) => {
            const index = state.bills.findIndex(b => b.id === action.payload.id);
            if (index !== -1) {
                // Merge updates and convert to mutable structure
                const currentBill = state.bills[index] as Bill;
                const updated = { ...currentBill, ...action.payload.updates };
                const mutableBill = toMutableBill(updated as ReadonlyBill);
                (state.bills[index] as any) = mutableBill;
                state.stats = calculateStats(state.bills as Bill[]);
            }
        },

        removeBill: (state, action: PayloadAction<number>) => {
            const filteredBills = (state.bills as Bill[]).filter(b => b.id !== action.payload);
            state.bills = filteredBills as any;
            state.stats = calculateStats(filteredBills);
        },

        setFilters: (state, action: PayloadAction<Partial<BillsFilter>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.currentPage = 1;
        },

        clearFilters: (state) => {
            state.filters = initialState.filters;
            state.currentPage = 1;
        },

        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
            state.currentPage = 1;
        },

        setSorting: (state, action: PayloadAction<{
            sortBy: BillsState['sortBy'];
            sortOrder: BillsState['sortOrder']
        }>) => {
            state.sortBy = action.payload.sortBy;
            state.sortOrder = action.payload.sortOrder;
        },

        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },

        setItemsPerPage: (state, action: PayloadAction<number>) => {
            state.itemsPerPage = action.payload;
            state.currentPage = 1;
        },

        setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
            state.viewMode = action.payload;
        },

        handleRealTimeUpdate: (state, action: PayloadAction<{ type: string; data: any }>) => {
            const { type, data } = action.payload;
            const billIndex = state.bills.findIndex(b => b.id === data.bill_id);

            if (billIndex === -1) return;

            if (type === 'bill_status_change') {
                state.bills[billIndex].status = data.newStatus;
                state.bills[billIndex].lastUpdated = new Date().toISOString();
            } else if (type === 'bill_engagement_update') {
                const bill = state.bills[billIndex];
                Object.assign(bill, {
                    viewCount: data.viewCount ?? bill.viewCount,
                    saveCount: data.saveCount ?? bill.saveCount,
                    commentCount: data.commentCount ?? bill.commentCount,
                    shareCount: data.shareCount ?? bill.shareCount,
                });
            }

            state.lastUpdateTime = new Date().toISOString();
        },

        subscribeToRealTimeUpdates: (_state, action: PayloadAction<number>) => {
            billsWebSocketService.subscribeToBill(action.payload);
        },

        unsubscribeFromRealTimeUpdates: (_state, action: PayloadAction<number>) => {
            billsWebSocketService.unsubscribeFromBill(action.payload);
        },

        reset: () => {
            billsPaginationService.reset();
            return { ...initialState };
        },

        clearCache: () => {
            billsDataCache.clear();
            billsPaginationService.reset();
        },
    },
    extraReducers: (builder) => {
        // Load bills from API
        builder
            .addCase(loadBillsFromAPI.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadBillsFromAPI.fulfilled, (state, action) => {
                // Bills are already converted to mutable in the thunk
                state.bills = action.payload.bills as any;
                state.stats = action.payload.stats;
                state.loading = false;
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(loadBillsFromAPI.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Load single bill by ID
        builder.addCase(loadBillById.fulfilled, (state, action) => {
            const index = state.bills.findIndex(b => b.id === action.payload.id);
            // Bill is already converted to mutable in the thunk
            if (index !== -1) {
                (state.bills[index] as any) = action.payload;
            } else {
                state.bills.push(action.payload as any);
            }
        });

        // Search bills
        builder
            .addCase(searchBills.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.searchQuery = action.meta.arg.query || '';
            })
            .addCase(searchBills.fulfilled, (state, action) => {
                // Bills are already converted to mutable in the thunk
                state.bills = action.payload.bills as any;
                state.stats = action.payload.stats;
                state.loading = false;
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(searchBills.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Load next page
        builder.addCase(loadNextPage.fulfilled, (state) => {
            state.lastUpdateTime = new Date().toISOString();
        });

        // Refresh data
        builder
            .addCase(refreshBillsData.pending, (state) => {
                state.loading = true;
            })
            .addCase(refreshBillsData.fulfilled, (state) => {
                state.loading = false;
                state.lastUpdateTime = new Date().toISOString();
            });
    },
});

// Selectors
export const selectFilteredBills = (state: { bills: BillsState }) => {
    const { bills, searchQuery, filters } = state.bills;

    return bills.filter(bill => {
        // Search filter - combines all searchable text into one string for efficiency
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const searchable = [
                bill.title,
                bill.summary,
                bill.billNumber,
                ...bill.policyAreas
            ].join(' ').toLowerCase();
            if (!searchable.includes(query)) return false;
        }

        // Multi-select filters
        if (filters.status.length && !filters.status.includes(bill.status)) return false;
        if (filters.urgency.length && !filters.urgency.includes(bill.urgencyLevel)) return false;
        if (filters.policyAreas.length && !filters.policyAreas.some(area => bill.policyAreas.includes(area))) return false;
        if (filters.constitutionalFlags && !bill.constitutionalFlags?.length) return false;
        if (filters.controversyLevels.length && !filters.controversyLevels.includes((bill as any).controversyLevel)) return false;

        // Date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
            const billDate = new Date(bill.introducedDate);
            if (filters.dateRange.start && billDate < new Date(filters.dateRange.start)) return false;
            if (filters.dateRange.end && billDate > new Date(filters.dateRange.end)) return false;
        }

        return true;
    });
};

export const selectSortedBills = (state: { bills: BillsState }) => {
    const bills = selectFilteredBills(state);
    const { sortBy, sortOrder } = state.bills;

    return [...bills].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'date':
                comparison = new Date(a.introducedDate).getTime() - new Date(b.introducedDate).getTime();
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'urgency':
                const urgencyRank = { low: 0, medium: 1, high: 2, critical: 3 };
                comparison = urgencyRank[a.urgencyLevel] - urgencyRank[b.urgencyLevel];
                break;
            case 'engagement':
                const engagementA = a.viewCount + a.saveCount + a.commentCount + a.shareCount;
                const engagementB = b.viewCount + b.saveCount + b.commentCount + b.shareCount;
                comparison = engagementA - engagementB;
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
};

export const selectPaginatedBills = (state: { bills: BillsState }) => {
    const sorted = selectSortedBills(state);
    const { currentPage, itemsPerPage } = state.bills;
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
};

export const selectPaginationInfo = (state: { bills: BillsState }) => {
    const totalItems = selectSortedBills(state).length;
    const { currentPage, itemsPerPage } = state.bills;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
        currentPage,
        totalPages,
        itemsPerPage,
        totalItems,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
    };
};

export const {
    setBills, addBill, updateBill, removeBill,
    setFilters, clearFilters, setSearchQuery, setSorting,
    setCurrentPage, setItemsPerPage, setViewMode,
    handleRealTimeUpdate, subscribeToRealTimeUpdates, unsubscribeFromRealTimeUpdates,
    reset, clearCache,
} = billsSlice.actions;

export default billsSlice.reducer;