# Migration Plan: Fix Redux vs React Query Overlap

## Current Issues Identified

Based on the console errors and code analysis, here are the specific problems:

1. **Module Loading Failures**: `billsSlice.ts` and related files are failing to load
2. **Type Conflicts**: Bills data types are incompatible between Redux and React Query
3. **Duplicate State Management**: Bills data is managed in both Redux and React Query
4. **Connection Errors**: Backend server not running (localhost:3000)

## Phase 1: Immediate Fixes (High Priority)

### 1.1 Fix Module Loading Issues

The lazy loading failures suggest circular dependencies or missing files. Let's fix the bills dashboard loading:

```typescript
// client/src/pages/bills-dashboard-page.tsx - Create this file if missing
import React from 'react';
import { BillsDashboard } from '../components/bills/bills-dashboard';

export default function BillsDashboardPage() {
  return <BillsDashboard />;
}
```

### 1.2 Remove Redux Bills State Dependencies

The `billsApiService.ts` is trying to update Redux state, which is causing type conflicts. We need to remove these Redux dependencies:

```typescript
// Remove these lines from billsApiService.ts:
// import { stateManagementService } from './stateManagementService';
// stateManagementService.setBills(response.bills);
// stateManagementService.updateBill(bill.id, bill);
```

### 1.3 Fix Type Conflicts

The Bill types are incompatible between different parts of the system. We need to standardize on the React Query types.

## Phase 2: Clean Architecture Implementation

### 2.1 Enhanced React Query Bills Hook

Create a comprehensive bills hook that replaces all Redux functionality:

```typescript
// client/src/features/bills/hooks/useBillsWithFilters.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { billsApiService } from '../../../core/api/bills';

export function useBillsWithFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract filters from URL
  const filters = {
    query: searchParams.get('q') || '',
    status: searchParams.getAll('status'),
    urgency: searchParams.getAll('urgency'),
    policyAreas: searchParams.getAll('policyArea'),
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  // Main bills query with filters
  const billsQuery = useQuery({
    queryKey: ['bills', filters],
    queryFn: () => billsApiService.getBills(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  // Update URL when filters change
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        newParams.delete(key);
        value.forEach(v => newParams.append(key, v));
      } else if (value) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    
    setSearchParams(newParams);
  };

  return {
    bills: billsQuery.data?.bills || [],
    stats: billsQuery.data?.stats,
    pagination: billsQuery.data?.pagination,
    isLoading: billsQuery.isLoading,
    error: billsQuery.error,
    filters,
    updateFilters,
    refetch: billsQuery.refetch,
  };
}
```

### 2.2 Infinite Scroll Hook

Replace the pagination service with a React Query infinite query:

```typescript
// client/src/features/bills/hooks/useBillsInfinite.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { billsApiService } from '../../../core/api/bills';

export function useBillsInfinite(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['bills', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      billsApiService.getBills({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

### 2.3 UI State Management (Keep in Redux)

Keep UI-related state in Redux, but remove server data:

```typescript
// client/src/store/slices/billsUISlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BillsUIState {
  viewMode: 'grid' | 'list';
  selectedBills: number[];
  sortBy: 'date' | 'title' | 'urgency' | 'engagement';
  sortOrder: 'asc' | 'desc';
  showFilters: boolean;
  compactMode: boolean;
}

const initialState: BillsUIState = {
  viewMode: 'grid',
  selectedBills: [],
  sortBy: 'date',
  sortOrder: 'desc',
  showFilters: false,
  compactMode: false,
};

const billsUISlice = createSlice({
  name: 'billsUI',
  initialState,
  reducers: {
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    toggleBillSelection: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      const index = state.selectedBills.indexOf(billId);
      if (index > -1) {
        state.selectedBills.splice(index, 1);
      } else {
        state.selectedBills.push(billId);
      }
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy as any;
      state.sortOrder = action.payload.sortOrder;
    },
    toggleFilters: (state) => {
      state.showFilters = !state.showFilters;
    },
    clearSelection: (state) => {
      state.selectedBills = [];
    },
  },
});

export const {
  setViewMode,
  toggleBillSelection,
  setSorting,
  toggleFilters,
  clearSelection,
} = billsUISlice.actions;

export default billsUISlice.reducer;
```

## Phase 3: Component Updates

### 3.1 Update Bills Dashboard Component

```typescript
// client/src/components/bills/bills-dashboard.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useBillsWithFilters } from '../../features/bills/hooks/useBillsWithFilters';
import { setViewMode, toggleFilters } from '../../store/slices/billsUISlice';

export function BillsDashboard() {
  const dispatch = useDispatch();
  const { viewMode, showFilters } = useSelector((state: any) => state.billsUI);
  
  const {
    bills,
    stats,
    isLoading,
    error,
    filters,
    updateFilters,
  } = useBillsWithFilters();

  if (isLoading) return <div>Loading bills...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bills-dashboard">
      <div className="dashboard-header">
        <h1>Bills Dashboard</h1>
        <div className="dashboard-controls">
          <button 
            onClick={() => dispatch(toggleFilters())}
            className={showFilters ? 'active' : ''}
          >
            Filters
          </button>
          <button 
            onClick={() => dispatch(setViewMode(viewMode === 'grid' ? 'list' : 'grid'))}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <input
            type="text"
            placeholder="Search bills..."
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value, page: 1 })}
          />
          {/* Add more filter controls */}
        </div>
      )}

      <div className={`bills-grid ${viewMode}`}>
        {bills.map((bill) => (
          <div key={bill.id} className="bill-card">
            <h3>{bill.title}</h3>
            <p>{bill.summary}</p>
            <span className={`status ${bill.status}`}>{bill.status}</span>
          </div>
        ))}
      </div>

      {stats && (
        <div className="dashboard-stats">
          <span>Total: {stats.totalBills}</span>
          <span>Urgent: {stats.urgentCount}</span>
        </div>
      )}
    </div>
  );
}
```

## Phase 4: Remove Redux Bills State

### 4.1 Delete Obsolete Files

```bash
# Remove these files:
rm client/src/store/slices/billsSlice.ts
rm client/src/services/billsPaginationService.ts
rm client/src/services/billsDataCache.ts
rm client/src/services/stateManagementService.ts
```

### 4.2 Update Store Configuration

```typescript
// client/src/store/index.ts - Remove bills slice
const rootReducer = combineReducers({
  auth: authSlice,
  session: sessionSlice,
  navigation: navigationSlice,
  ui: uiSlice,
  billsUI: billsUISlice, // New UI-only slice
  realTime: realTimeSlice,
  errorAnalytics: errorAnalyticsSlice,
  loading: loadingSlice,
  errorHandling: errorHandlingSlice,
  discussion: discussionSlice,
  userDashboard: userDashboardSlice,
});
```

### 4.3 Clean Up API Service

```typescript
// client/src/services/billsApiService.ts - Simplified version
class BillsApiService {
  // Remove all Redux state management
  // Keep only API calls and caching
  
  async getBills(params: BillsSearchParams = {}): Promise<PaginatedBillsResponse> {
    try {
      const response = await coreBillsApi.getBills(params);
      
      // No Redux updates - React Query handles caching
      logger.info('Bills data loaded successfully', {
        component: 'BillsApiService',
        page: params.page || 1,
        count: response.bills.length,
        total: response.pagination.total
      });

      return response;
    } catch (error) {
      logger.error('Failed to load bills', {
        component: 'BillsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }
}
```

## Phase 5: Testing and Validation

### 5.1 Update Tests

```typescript
// client/src/features/bills/hooks/__tests__/useBillsWithFilters.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useBillsWithFilters } from '../useBillsWithFilters';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

test('useBillsWithFilters loads bills data', async () => {
  const { result } = renderHook(() => useBillsWithFilters(), {
    wrapper: createWrapper()
  });

  await waitFor(() => {
    expect(result.current.bills).toBeDefined();
  });
});
```

## Implementation Order

1. **Start Backend Server** - Fix connection errors first
2. **Create UI-only Redux slice** - Replace billsSlice with billsUISlice
3. **Enhance React Query hooks** - Add filtering and pagination
4. **Update components** - Use new hooks instead of Redux selectors
5. **Remove old Redux state** - Delete billsSlice and related services
6. **Clean up API service** - Remove Redux dependencies
7. **Update tests** - Test new React Query patterns

## Benefits After Migration

- **Single Source of Truth**: React Query manages all server state
- **Better Performance**: Automatic caching and background updates
- **Simpler Code**: No more state synchronization issues
- **Better UX**: Optimistic updates and error handling
- **Easier Testing**: Mock API responses instead of Redux state

This migration will resolve the module loading errors, type conflicts, and duplicate state management issues you're experiencing.