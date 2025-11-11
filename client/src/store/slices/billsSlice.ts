/**
 * Bills State Management with Zustand
 * 
 * Manages bills data, filtering, search, and real-time updates
 * for the enhanced Bills Dashboard component.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { mockDataService } from '../../services/mockDataService';

// Types for bills data
export interface Bill {
    id: number;
    billNumber: string;
    title: string;
    summary: string;
    status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed' | 'vetoed';
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    introducedDate: string;
    lastUpdated: string;

    // Sponsors and relationships
    sponsors: Array<{
        id: number;
        name: string;
        party: string;
        role: 'primary' | 'cosponsor';
    }>;

    // Analysis data
    constitutionalFlags: Array<{
        id: string;
        severity: 'critical' | 'high' | 'moderate' | 'low';
        category: string;
        description: string;
    }>;

    // Engagement metrics
    viewCount: number;
    saveCount: number;
    commentCount: number;
    shareCount: number;

    // Metadata
    policyAreas: string[];
    complexity: 'low' | 'medium' | 'high';
    readingTime: number; // in minutes
    category?: string;
    conflict_level?: 'low' | 'medium' | 'high';
    sponsor_count?: number;
}

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

    // UI State - DEPRECATED: Use @core/loading instead
    loading: boolean;
    error: string | null;

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
}

interface BillsActions {
    // Data actions
    setBills: (bills: Bill[]) => void;
    addBill: (bill: Bill) => void;
    updateBill: (id: number, updates: Partial<Bill>) => void;
    removeBill: (id: number) => void;
    setStats: (stats: BillsStats) => void;
    
    // Mock data integration
    loadMockData: () => Promise<void>;
    refreshData: () => Promise<void>;

    // Loading and error states - DEPRECATED: Use @core/loading instead
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Filtering and search
    setFilters: (filters: Partial<BillsFilter>) => void;
    clearFilters: () => void;
    setSearchQuery: (query: string) => void;
    setSorting: (sortBy: BillsState['sortBy'], sortOrder: BillsState['sortOrder']) => void;

    // Pagination
    setCurrentPage: (page: number) => void;
    setItemsPerPage: (count: number) => void;

    // View preferences
    setViewMode: (mode: BillsState['viewMode']) => void;

    // Real-time updates
    handleRealTimeUpdate: (update: { type: string; data: any }) => void;

    // Utility actions
    reset: () => void;
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

    // UI State
    loading: false,
    error: null,

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
};

export const useBillsStore = create<BillsState & BillsActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,

            // Data actions
            setBills: (bills) => set((state) => {
                state.bills = bills;
                state.stats.totalBills = bills.length;
                state.stats.urgentCount = bills.filter(b => b.urgencyLevel === 'high' || b.urgencyLevel === 'critical').length;
                state.stats.constitutionalFlags = bills.reduce((sum, b) => sum + b.constitutionalFlags.length, 0);
                state.stats.lastUpdated = new Date().toISOString();
            }),

            addBill: (bill) => set((state) => {
                state.bills.unshift(bill);
                state.stats.totalBills += 1;
                if (bill.urgencyLevel === 'high' || bill.urgencyLevel === 'critical') {
                    state.stats.urgentCount += 1;
                }
                state.stats.constitutionalFlags += bill.constitutionalFlags.length;
                state.stats.lastUpdated = new Date().toISOString();
            }),

            updateBill: (id, updates) => set((state) => {
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
            }),

            removeBill: (id) => set((state) => {
                const index = state.bills.findIndex(b => b.id === id);
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
            }),

            setStats: (stats) => set((state) => {
                state.stats = stats;
            }),

            // Loading and error states
            setLoading: (loading) => set((state) => {
                state.loading = loading;
            }),

            setError: (error) => set((state) => {
                state.error = error;
            }),

            // Filtering and search
            setFilters: (newFilters) => set((state) => {
                state.filters = { ...state.filters, ...newFilters };
                state.currentPage = 1; // Reset to first page when filters change
            }),

            clearFilters: () => set((state) => {
                state.filters = initialFilters;
                state.currentPage = 1;
            }),

            setSearchQuery: (query) => set((state) => {
                state.searchQuery = query;
                state.currentPage = 1; // Reset to first page when search changes
            }),

            setSorting: (sortBy, sortOrder) => set((state) => {
                state.sortBy = sortBy;
                state.sortOrder = sortOrder;
            }),

            // Pagination
            setCurrentPage: (page) => set((state) => {
                state.currentPage = page;
            }),

            setItemsPerPage: (count) => set((state) => {
                state.itemsPerPage = count;
                state.currentPage = 1; // Reset to first page when page size changes
            }),

            // View preferences
            setViewMode: (mode) => set((state) => {
                state.viewMode = mode;
            }),

            // Real-time updates
            handleRealTimeUpdate: (update) => set((state) => {
                switch (update.type) {
                    case 'bill_status_change':
                        const billIndex = state.bills.findIndex(b => b.id === update.data.bill_id);
                        if (billIndex !== -1) {
                            state.bills[billIndex].status = update.data.newStatus;
                            state.bills[billIndex].lastUpdated = new Date().toISOString();
                        }
                        break;

                    case 'bill_engagement_update':
                        const engagementIndex = state.bills.findIndex(b => b.id === update.data.bill_id);
                        if (engagementIndex !== -1) {
                            const bill = state.bills[engagementIndex];
                            bill.viewCount = update.data.viewCount || bill.viewCount;
                            bill.saveCount = update.data.saveCount || bill.saveCount;
                            bill.commentCount = update.data.commentCount || bill.commentCount;
                            bill.shareCount = update.data.shareCount || bill.shareCount;
                        }
                        break;
                }

                state.lastUpdateTime = new Date().toISOString();
            }),

            // Mock data integration
            loadMockData: async () => {
                set((state) => {
                    state.loading = true;
                    state.error = null;
                });

                try {
                    const [bills, stats] = await Promise.all([
                        mockDataService.loadData('bills'),
                        mockDataService.loadData('billsStats')
                    ]);

                    set((state) => {
                        state.bills = bills as Bill[];
                        state.stats = stats as BillsStats;
                        state.loading = false;
                        state.error = null;
                        state.lastUpdateTime = new Date().toISOString();
                    });
                } catch (error) {
                    set((state) => {
                        state.loading = false;
                        state.error = error instanceof Error ? error.message : 'Failed to load bills data';
                    });
                }
            },

            refreshData: async () => {
                const { loadMockData } = get();
                await loadMockData();
            },

            // Utility actions
            reset: () => set(() => ({ ...initialState })),
        })),
        {
            name: 'bills-store',
        }
    )
);

// Selectors for computed values
export const useBillsSelectors = () => {
    const state = useBillsStore();

    // Filter and search bills
    const filteredBills = state.bills.filter(bill => {
        // Search query filter
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            const matchesSearch =
                bill.title.toLowerCase().includes(query) ||
                bill.summary.toLowerCase().includes(query) ||
                bill.billNumber.toLowerCase().includes(query) ||
                bill.policyAreas.some(area => area.toLowerCase().includes(query));

            if (!matchesSearch) return false;
        }

        // Status filter
        if (state.filters.status.length > 0 && !state.filters.status.includes(bill.status)) {
            return false;
        }

        // Urgency filter
        if (state.filters.urgency.length > 0 && !state.filters.urgency.includes(bill.urgencyLevel)) {
            return false;
        }

        // Policy areas filter
        if (state.filters.policyAreas.length > 0) {
            const hasMatchingArea = state.filters.policyAreas.some(area =>
                bill.policyAreas.includes(area)
            );
            if (!hasMatchingArea) return false;
        }

        // Constitutional flags filter
        if (state.filters.constitutionalFlags && bill.constitutionalFlags.length === 0) {
            return false;
        }

        // Controversy levels filter
        if (state.filters.controversyLevels.length > 0) {
            const billControversy = bill.conflict_level;
            if (!billControversy || !state.filters.controversyLevels.includes(billControversy)) {
                return false;
            }
        }

        // Date range filter
        if (state.filters.dateRange.start || state.filters.dateRange.end) {
            const billDate = new Date(bill.introducedDate);

            if (state.filters.dateRange.start) {
                const startDate = new Date(state.filters.dateRange.start);
                if (billDate < startDate) return false;
            }

            if (state.filters.dateRange.end) {
                const endDate = new Date(state.filters.dateRange.end);
                if (billDate > endDate) return false;
            }
        }

        return true;
    });

    // Sort bills
    const sortedBills = [...filteredBills].sort((a, b) => {
        let comparison = 0;

        switch (state.sortBy) {
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

        return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate bills
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedBills = sortedBills.slice(startIndex, endIndex);

    const totalPages = Math.ceil(sortedBills.length / state.itemsPerPage);

    return {
        ...state,
        filteredBills: sortedBills,
        paginatedBills,
        totalPages,
        hasNextPage: state.currentPage < totalPages,
        hasPreviousPage: state.currentPage > 1,
    };
};