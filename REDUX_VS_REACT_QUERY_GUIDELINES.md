# Redux vs React Query: Clear Delineation Guidelines

## Executive Summary

After analyzing the Chanuka client codebase, this document provides definitive guidelines on when to use Redux vs React Query for state management. The current architecture shows a mixed approach that needs clarification to prevent confusion and ensure optimal performance.

## Current State Analysis

### Redux Usage (What's Currently There)
- **Authentication state** (`authSlice.ts`) - User sessions, login status, 2FA
- **UI state** (`uiSlice.ts`) - Theme, sidebar, modals, notifications
- **Navigation state** (`navigationSlice.ts`) - Current path, breadcrumbs, menu state
- **User dashboard state** (`userDashboardSlice.ts`) - Dashboard preferences, tracked bills
- **Real-time state** (`realTimeSlice.ts`) - WebSocket connections, live updates
- **Error handling** (`errorHandlingSlice.ts`) - Global error state

### React Query Usage (What's Currently There)
- **Bills API hooks** (`useBills.ts`) - Server data fetching with caching
- **User API hooks** (`useUserAPI.ts`) - User profile and dashboard data
- **API connection monitoring** (`useApiConnection.ts`) - Health checks and connectivity
- **Search API hooks** (`useSearch.ts`) - Intelligent search functionality

## Migration Complete: Clean Separation Achieved

The previous architecture had **significant overlap** between Redux and React Query for bills data, which has now been resolved:

1. **Bills data is now managed exclusively by React Query (`useBills.ts`)**
2. **Redux focuses on client-side state** (auth, UI, navigation, real-time connections)
3. **Clear separation of concerns** eliminates synchronization issues
4. **Optimized performance** with single caching layer for server data

## Clear Delineation Rules

### Use Redux For: Client-Side Application State

Redux should manage state that is:
- **Generated and owned by the client**
- **Persisted across sessions**
- **Shared across many components**
- **Not directly tied to server data**

#### Specific Redux Use Cases:

1. **Authentication & Session State**
   ```typescript
   // ✅ Redux - Client manages auth state
   const { user, isAuthenticated } = useSelector(selectAuth);
   ```

2. **UI State & Preferences**
   ```typescript
   // ✅ Redux - Client-side UI state
   const { theme, sidebarCollapsed } = useSelector(selectUI);
   ```

3. **Navigation State**
   ```typescript
   // ✅ Redux - Client routing state
   const { currentPath, breadcrumbs } = useSelector(selectNavigation);
   ```

4. **Form State (Complex Multi-Step)**
   ```typescript
   // ✅ Redux - Complex form state that persists
   const { formData, currentStep } = useSelector(selectMultiStepForm);
   ```

5. **Real-Time Connection State**
   ```typescript
   // ✅ Redux - WebSocket connection management
   const { isConnected, subscriptions } = useSelector(selectRealTime);
   ```

6. **Global Error State**
   ```typescript
   // ✅ Redux - Application-wide error handling
   const { errors, notifications } = useSelector(selectErrors);
   ```

### Use React Query For: Server State

React Query should manage:
- **Data fetched from APIs**
- **Server-side state synchronization**
- **Caching and background updates**
- **Loading and error states for server data**

#### Specific React Query Use Cases:

1. **Bills Data (Primary Use Case)**
   ```typescript
   // ✅ React Query - Server data with caching
   const { data: bills, isLoading, error } = useBills(params);
   ```

2. **User Profile Data**
   ```typescript
   // ✅ React Query - Server user data
   const { data: profile } = useUserProfile(userId);
   ```

3. **Comments and Discussions**
   ```typescript
   // ✅ React Query - Dynamic server content
   const { data: comments } = useBillComments(billId);
   ```

4. **Search Results**
   ```typescript
   // ✅ React Query - Server search with caching
   const { data: searchResults } = useQuery({
     queryKey: ['search', query],
     queryFn: () => searchAPI(query)
   });
   ```

5. **Analytics and Metrics**
   ```typescript
   // ✅ React Query - Server analytics data
   const { data: metrics } = useCivicMetrics(timeRange);
   ```

## Migration Complete: Redux Bills State Removed

### Migration Accomplished
The `billsSlice.ts` has been successfully removed from the Redux store. Bills data is now managed exclusively by React Query:

```typescript
// ✅ CORRECT - Server data via React Query only
const { data: bills, isLoading } = useBills(filters);
const viewMode = useSelector(selectViewMode); // UI state only
```

### Architecture Now Clean

1. **Bills data handled by React Query** - Server state with caching and synchronization
2. **Filtering logic in React Query** - URL-based filters with bookmarkable state
3. **UI state in Redux** - View modes, preferences, and client-side state
4. **Clear separation maintained** - No duplication or synchronization issues

### Recommended Architecture

```typescript
// ✅ CORRECT - Server data via React Query only
function BillsList() {
  // URL state for filters (shareable, bookmarkable)
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(searchParams);
  
  // Server data via React Query
  const { data: bills, isLoading } = useBills(filters);
  
  // UI state via Redux
  const { viewMode } = useSelector(selectUI);
  const dispatch = useDispatch();
  
  return (
    <div>
      <FilterBar 
        filters={filters}
        onFiltersChange={setSearchParams}
      />
      <BillsGrid 
        bills={bills}
        viewMode={viewMode}
        onViewModeChange={(mode) => dispatch(setViewMode(mode))}
      />
    </div>
  );
}
```

## Specific Guidelines by Data Type

### Bills Data: React Query Only
```typescript
// ✅ DO: Use React Query for all bills data
const { data: bills } = useBills({ status: 'active', page: 1 });
const { data: bill } = useBill(billId);
const { data: comments } = useBillComments(billId);

// ❌ DON'T: Store bills in Redux
// dispatch(setBills(bills)); // Remove this pattern
```

### User Preferences: Mixed Approach
```typescript
// ✅ Redux for UI preferences (client-side)
const { dashboardLayout } = useSelector(selectUserPreferences);

// ✅ React Query for server-stored preferences
const { data: serverPreferences } = useUserPreferences(userId);
```

### Real-Time Updates: Redux for Connection, React Query for Data
```typescript
// ✅ Redux for WebSocket connection state
const { isConnected } = useSelector(selectRealTime);

// ✅ React Query for the actual data updates
const queryClient = useQueryClient();
useEffect(() => {
  if (realTimeUpdate) {
    queryClient.invalidateQueries(['bills']);
  }
}, [realTimeUpdate]);
```

## Performance Considerations

### React Query Optimizations
```typescript
// ✅ Proper stale times for different data types
export function useBills(params) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billsAPI.getBills(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - bills change moderately
    gcTime: 10 * 60 * 1000,   // Keep in cache longer
  });
}

export function useBillCategories() {
  return useQuery({
    queryKey: ['bills', 'categories'],
    queryFn: () => billsAPI.getCategories(),
    staleTime: 60 * 60 * 1000, // 1 hour - categories rarely change
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache much longer
  });
}
```

### Redux Optimizations
```typescript
// ✅ Memoized selectors for derived state
export const selectFilteredNavigation = createSelector(
  [selectNavigation, selectUserRole],
  (navigation, userRole) => {
    return navigation.items.filter(item => 
      item.roles.includes(userRole)
    );
  }
);
```

## Error Handling Patterns

### React Query Error Handling
```typescript
// ✅ Component-level error handling for server data
const { data: bills, error, isError } = useBills();

if (isError) {
  return <ErrorBoundary error={error} />;
}
```

### Redux Error Handling
```typescript
// ✅ Global error handling for application errors
const { globalError } = useSelector(selectErrors);

useEffect(() => {
  if (globalError) {
    showNotification(globalError);
  }
}, [globalError]);
```

## Testing Strategies

### Testing React Query Hooks
```typescript
// ✅ Mock server responses
const server = setupServer(
  rest.get('/api/bills', (req, res, ctx) => {
    return res(ctx.json({ bills: mockBills }));
  })
);

test('useBills returns bills data', async () => {
  const { result } = renderHook(() => useBills(), {
    wrapper: createQueryWrapper()
  });
  
  await waitFor(() => {
    expect(result.current.data).toEqual(mockBills);
  });
});
```

### Testing Redux State
```typescript
// ✅ Test pure state transitions
test('setTheme updates theme state', () => {
  const initialState = { theme: 'light' };
  const action = setTheme('dark');
  const newState = uiSlice.reducer(initialState, action);
  
  expect(newState.theme).toBe('dark');
});
```

## Migration Complete ✅

### Phase 1: Audit Current Usage ✅
- [x] Identified all components using `billsSlice`
- [x] Mapped Redux bills state to React Query equivalents
- [x] Documented current filter and pagination logic

### Phase 2: Implement React Query Patterns ✅
- [x] Enhanced `useBills` hook with all filtering options
- [x] Added URL state management for filters
- [x] Implemented optimistic updates for mutations

### Phase 3: Remove Redux Bills State ✅
- [x] Deleted `billsSlice.ts`
- [x] Removed bills state from store configuration
- [x] Updated all components to use React Query hooks

### Phase 4: Optimize Performance
- [ ] Fine-tune stale times and cache times
- [ ] Implement proper query key strategies
- [ ] Add background refetching where appropriate

## Conclusion

The key principle is simple:

- **Redux = Client State** (UI, navigation, auth, preferences)
- **React Query = Server State** (bills, users, comments, analytics)

This separation provides:
- **Clear ownership** of different state types
- **Optimal performance** through specialized tools
- **Easier testing** with focused responsibilities
- **Better developer experience** with less confusion

The current bills data duplication should be resolved by removing Redux bills state entirely and relying solely on React Query for all server data management.