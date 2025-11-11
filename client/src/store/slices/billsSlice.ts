/**
 * Bills State Management with Redux Toolkit
 *
 * Manages bills data, filtering, search, and real-time updates
 * for the enhanced Bills Dashboard component.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { mockDataService } from '../../services/mockDataService';
import { billsRepository } from '../../repositories';
import { billsWebSocketService } from '../../services/billsWebSocketService';
import { billsDataCache } from '../../services/billsDataCache';
import { billsPaginationService } from '../../services/billsPaginationService';
import { Bill, BillsSearchParams, PaginatedResponse, EngagementType } from '../../core/api';

// Use unified types from core API
export type { Bill, BillsSearchParams, PaginatedResponse, EngagementType } from '../../core/api';

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
    dateRange: {
        start: string | null;
        end: string | null;
    };
}

interface BillsState {
    // Data
    bills: Bill[];
    stats: BillsStats;

    // Filtering and Search
    filters: BillsFilter;
    searchQuery: string;
    sortBy: 'date' | 'title' | 'urgency' | 'engagement';
    sortOrder: 'asc' | 'desc';

    // Pagination
    currentPage: number;
    itemsPerPage: number;

    // View preferences
    viewMode: 'grid' | 'list';

    // Real-time updates
    lastUpdateTime: string | null;

    // Loading states (will be moved to loadingSlice)
    loading: boolean;
    error: string | null;
}

const initialFilters: BillsFilter = {
    status: [],
    urgency: [],
    policyAreas: [],
    sponsors: [],
    constitutionalFlags: false,
    controversyLevels: [],
    dateRange: {
        start: null,
        end: null,
    },
};

const initialStats: BillsStats = {
    totalBills: 0,
    urgentCount: 0,
    constitutionalFlags: 0,
    trendingCount: 0,
    lastUpdated: new Date().toISOString(),
};

const initialState: BillsState = {
    // Data
    bills: [],
    stats: initialStats,

    // Filtering and Search
    filters: initialFilters,
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',

    // Pagination
    currentPage: 1,
    itemsPerPage: 12,

    // View preferences
    viewMode: 'grid',

    // Real-time updates
    lastUpdateTime: null,

    // Loading states
    loading: false,
    error: null,
};

// Async thunks for API operations
export const loadBillsFromAPI = createAsyncThunk(
    'bills/loadBillsFromAPI',
    async (searchParams: any = {}, { rejectWithValue }) => {
        try {
            // Try to load from cache first
            const cachedBills = await billsDataCache.getCachedBills(searchParams);
            const cachedStats = await billsDataCache.getCachedBillsStats();

            if (cachedBills && cachedStats) {
                return { bills: cachedBills, stats: cachedStats };
            }

            // Load from API using pagination service
            const response = await billsPaginationService.loadFirstPage(searchParams);

            if (response) {
                // Cache the results
                await billsDataCache.cacheBills(response.bills, searchParams);
                await billsDataCache.cacheBillsStats(response.stats);

                return response;
            }

            throw new Error('Failed to load bills data');
        } catch (error) {
            // Fallback to mock data if API fails
            try {
                const [bills, stats] = await Promise.all([
                    mockDataService.loadData('bills'),
                    mockDataService.loadData('billsStats')
                ]);
                return { bills, stats };
            } catch (mockError) {
                return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bills data');
            }
        }
    }
);

export const loadBillById = createAsyncThunk(
    'bills/loadBillById',
    async (id: number, { rejectWithValue }) => {
        try {
            // Check cache first
            const cachedBill = await billsDataCache.getCachedBill(id);
            if (cachedBill) {
                return cachedBill;
            }

            // Load from API
            const bill = await billsRepository.getBillById(id);
            if (bill) {
                // Cache the bill
                await billsDataCache.cacheBill(bill);
                return bill;
            }
            return rejectWithValue('Bill not found');
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bill');
        }
    }
);

export const searchBills = createAsyncThunk(
    'bills/searchBills',
    async (searchParams: any, { rejectWithValue }) => {
        try {
            const result = await billsRepository.searchBills(searchParams);
            return result.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Search failed');
        }
    }
);

export const loadNextPage = createAsyncThunk(
    'bills/loadNextPage',
    async (_, { rejectWithValue }) => {
        try {
            const bills = await billsPaginationService.loadNextPage();
            if (bills && bills.length > 0) {
                return bills;
            }
            throw new Error('No more pages available');
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load next page');
        }
    }
);

export const refreshBillsData = createAsyncThunk(
    'bills/refreshBillsData',
    async (_, { getState, dispatch }) => {
        const state = getState() as { bills: BillsState };
        const searchParams = {
            query: state.bills.searchQuery,
            ...state.bills.filters
        };

        // Clear cache and reload
        billsDataCache.clear();
        return dispatch(loadBillsFromAPI(searchParams)).unwrap();
    }
);

export const recordEngagement = createAsyncThunk(
    'bills/recordEngagement',
    async ({ billId, type }: { billId: number; type: EngagementType }, { rejectWithValue }) => {
        try {
            await billsRepository.recordEngagement(billId, type);
            return { billId, type };
        } catch (error) {
            // Silently fail engagement tracking to not disrupt user experience
            console.warn('Failed to record engagement:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to record engagement');
        }
    }
);

const billsSlice = createSlice({
    name: 'bills',
    initialState,
    reducers: {
        // Data actions
        setBills: (state, action: PayloadAction<Bill[]>) => {
            state.bills = action.payload;
            state.stats.totalBills = action.payload.length;
            state.stats.urgentCount = action.payload.filter(b => b.urgencyLevel === 'high' || b.urgencyLevel === 'critical').length;
            state.stats.constitutionalFlags = action.payload.reduce((sum, b) => sum + b.constitutionalFlags.length, 0);
            state.stats.lastUpdated = new Date().toISOString();
        },

        addBill: (state, action: PayloadAction<Bill>) => {
            state.bills.unshift(action.payload);
            state.stats.totalBills += 1;
            if (action.payload.urgencyLevel === 'high' || action.payload.urgencyLevel === 'critical') {
                state.stats.urgentCount += 1;
            }
            state.stats.constitutionalFlags += action.payload.constitutionalFlags.length;
            state.stats.lastUpdated = new Date().toISOString();
        },

        updateBill: (state, action: PayloadAction<{ id: number; updates: Partial<Bill> }>) => {
            const { id, updates } = action.payload;
            const index = state.bills.findIndex(b => b.id === id);
            if (index !== -1) {
                const oldBill = state.bills[index];
                state.bills[index] = { ...oldBill, ...updates };

                // Update stats if urgency changed
                if (updates.urgencyLevel) {
                    const wasUrgent = oldBill.urgencyLevel === 'high' || oldBill.urgencyLevel === 'critical';
                    const isUrgent = updates.urgencyLevel === 'high' || updates.urgencyLevel === 'critical';

                    if (wasUrgent && !isUrgent) {
                        state.stats.urgentCount -= 1;
                    } else if (!wasUrgent && isUrgent) {
                        state.stats.urgentCount += 1;
                    }
                }

                state.stats.lastUpdated = new Date().toISOString();
            }
        },

        removeBill: (state, action: PayloadAction<number>) => {
            const index = state.bills.findIndex(b => b.id === action.payload);
            if (index !== -1) {
                const bill = state.bills[index];
                state.bills.splice(index, 1);
                state.stats.totalBills -= 1;

                if (bill.urgencyLevel === 'high' || bill.urgencyLevel === 'critical') {
                    state.stats.urgentCount -= 1;
                }
                state.stats.constitutionalFlags -= bill.constitutionalFlags.length;
                state.stats.lastUpdated = new Date().toISOString();
            }
        },

        setStats: (state, action: PayloadAction<BillsStats>) => {
            state.stats = action.payload;
        },

        // Filtering and search
        setFilters: (state, action: PayloadAction<Partial<BillsFilter>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.currentPage = 1; // Reset to first page when filters change
        },

        clearFilters: (state) => {
            state.filters = initialFilters;
            state.currentPage = 1;
        },

        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
            state.currentPage = 1; // Reset to first page when search changes
        },

        setSorting: (state, action: PayloadAction<{ sortBy: BillsState['sortBy']; sortOrder: BillsState['sortOrder'] }>) => {
            state.sortBy = action.payload.sortBy;
            state.sortOrder = action.payload.sortOrder;
        },

        // Pagination
        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },

        setItemsPerPage: (state, action: PayloadAction<number>) => {
            state.itemsPerPage = action.payload;
            state.currentPage = 1; // Reset to first page when page size changes
        },

        // View preferences
        setViewMode: (state, action: PayloadAction<BillsState['viewMode']>) => {
            state.viewMode = action.payload;
        },

        // Real-time updates
        handleRealTimeUpdate: (state, action: PayloadAction<{ type: string; data: any }>) => {
            switch (action.payload.type) {
                case 'bill_status_change':
                    const billIndex = state.bills.findIndex(b => b.id === action.payload.data.bill_id);
                    if (billIndex !== -1) {
                        state.bills[billIndex].status = action.payload.data.newStatus;
                        state.bills[billIndex].lastUpdated = new Date().toISOString();
                    }
                    break;

                case 'bill_engagement_update':
                    const engagementIndex = state.bills.findIndex(b => b.id === action.payload.data.bill_id);
                    if (engagementIndex !== -1) {
                        const bill = state.bills[engagementIndex];
                        bill.viewCount = action.payload.data.viewCount || bill.viewCount;
                        bill.saveCount = action.payload.data.saveCount || bill.saveCount;
                        bill.commentCount = action.payload.data.commentCount || bill.commentCount;
                        bill.shareCount = action.payload.data.shareCount || bill.shareCount;
                    }
                    break;
            }

            state.lastUpdateTime = new Date().toISOString();
        },

        // Real-time subscriptions
        subscribeToRealTimeUpdates: (state, action: PayloadAction<number>) => {
            billsWebSocketService.subscribeToBill(action.payload);
        },

        unsubscribeFromRealTimeUpdates: (state, action: PayloadAction<number>) => {
            billsWebSocketService.unsubscribeFromBill(action.payload);
        },

        // Utility actions
        reset: (state) => {
            billsPaginationService.reset();
            return { ...initialState };
        },

        clearCache: (state) => {
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
                state.bills = action.payload.bills as Bill[];
                state.stats = action.payload.stats as BillsStats;
                state.loading = false;
                state.error = null;
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(loadBillsFromAPI.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Load bill by ID
        builder
            .addCase(loadBillById.fulfilled, (state, action) => {
                const index = state.bills.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.bills[index] = action.payload;
                } else {
                    state.bills.push(action.payload);
                }
            })
            .addCase(loadBillById.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Search bills
        builder
            .addCase(searchBills.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.searchQuery = action.meta.arg.query || '';
            })
            .addCase(searchBills.fulfilled, (state, action) => {
                state.bills = action.payload.bills;
                state.stats = action.payload.stats;
                state.loading = false;
                state.error = null;
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(searchBills.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Load next page
        builder
            .addCase(loadNextPage.fulfilled, (state, action) => {
                // Bills are already added to store by pagination service
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(loadNextPage.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Refresh data
        builder
            .addCase(refreshBillsData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(refreshBillsData.fulfilled, (state) => {
                state.loading = false;
                state.lastUpdateTime = new Date().toISOString();
            })
            .addCase(refreshBillsData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Record engagement (silent operation)
        builder
            .addCase(recordEngagement.rejected, (state, action) => {
                // Silently fail engagement tracking to not disrupt user experience
                console.warn('Failed to record engagement:', action.payload);
            });
    },
});

// Export actions
export const {
    setBills,
    addBill,
    updateBill,
    removeBill,
    setStats,
    setFilters,
    clearFilters,
    setSearchQuery,
    setSorting,
    setCurrentPage,
    setItemsPerPage,
    setViewMode,
    handleRealTimeUpdate,
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
    reset,
    clearCache,
} = billsSlice.actions;

// Selectors for computed values
export const selectFilteredBills = (state: { bills: BillsState }) => {
    const { bills, searchQuery, filters } = state.bills;

    return bills.filter(bill => {
        // Search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                bill.title.toLowerCase().includes(query) ||
                bill.summary.toLowerCase().includes(query) ||
                bill.billNumber.toLowerCase().includes(query) ||
                bill.policyAreas.some(area => area.toLowerCase().includes(query));

            if (!matchesSearch) return false;
        }

        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
            return false;
        }

        // Urgency filter
        if (filters.urgency.length > 0 && !filters.urgency.includes(bill.urgencyLevel)) {
            return false;
        }

        // Policy areas filter
        if (filters.policyAreas.length > 0) {
            const hasMatchingArea = filters.policyAreas.some(area =>
                bill.policyAreas.includes(area)
            );
            if (!hasMatchingArea) return false;
        }

        // Constitutional flags filter
        if (filters.constitutionalFlags && bill.constitutionalFlags.length === 0) {
            return false;
        }

        // Controversy levels filter
        if (filters.controversyLevels.length > 0) {
            const billControversy = bill.conflict_level;
            if (!billControversy || !filters.controversyLevels.includes(billControversy)) {
                return false;
            }
        }

        // Date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
            const billDate = new Date(bill.introducedDate);

            if (filters.dateRange.start) {
                const startDate = new Date(filters.dateRange.start);
                if (billDate < startDate) return false;
            }

            if (filters.dateRange.end) {
                const endDate = new Date(filters.dateRange.end);
                if (billDate > endDate) return false;
            }
        }

        return true;
    });
};

export const selectSortedBills = (state: { bills: BillsState }) => {
    const filteredBills = selectFilteredBills(state);
    const { sortBy, sortOrder } = state.bills;

    return [...filteredBills].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'date':
                comparison = new Date(a.introducedDate).getTime() - new Date(b.introducedDate).getTime();
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'urgency':
                const urgencyOrder = { low: 0, medium: 1, high: 2, critical: 3 };
                comparison = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
                break;
            case 'engagement':
                const aEngagement = a.viewCount + a.saveCount + a.commentCount + a.shareCount;
                const bEngagement = b.viewCount + b.saveCount + b.commentCount + b.shareCount;
                comparison = aEngagement - bEngagement;
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
};

export const selectPaginatedBills = (state: { bills: BillsState }) => {
    const sortedBills = selectSortedBills(state);
    const { currentPage, itemsPerPage } = state.bills;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return sortedBills.slice(startIndex, endIndex);
};

export const selectPaginationInfo = (state: { bills: BillsState }) => {
    const sortedBills = selectSortedBills(state);
    const { currentPage, itemsPerPage } = state.bills;

    const totalPages = Math.ceil(sortedBills.length / itemsPerPage);

    return {
        currentPage,
        totalPages,
        itemsPerPage,
        totalItems: sortedBills.length,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
    };
};

export { billsSlice };
export default billsSlice.reducer;