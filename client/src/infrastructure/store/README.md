# Store Module - Redux State Management

## Overview

The Store module provides unified Redux state management for the Chanuka platform. It consolidates all application state including authentication, dashboard, navigation, loading, session, UI, and error handling into a single, well-organized Redux store with persistence capabilities.

## Purpose and Responsibilities

- **Centralized State**: Single source of truth for application state
- **State Persistence**: Automatic state persistence across sessions
- **Redux DevTools**: Integration with Redux DevTools for debugging
- **Middleware**: Custom middleware for logging, analytics, and side effects
- **Type Safety**: Fully typed state and actions with TypeScript
- **Slice Organization**: Modular state slices for different domains

## Public Exports

### Store and Types

- `store` - Configured Redux store instance
- `persistor` - Redux persist persistor instance
- `RootState` - Root state type
- `AppDispatch` - Typed dispatch function
- `StoreData` - Store initialization data

### Functions

- `initializeStore(): StoreData` - Initialize store and persistor
- `getStore(): Store` - Get store instance

## State Slices

### Auth Slice
- User authentication state
- Login/logout actions
- Token management
- Session validation

### Dashboard Slice
- Dashboard configuration
- Widget management
- Layout preferences
- User customizations

### Navigation Slice
- Current route state
- Navigation history
- Breadcrumbs
- Route metadata

### Loading Slice
- Global loading state
- Operation-specific loading
- Progress tracking
- Loading indicators

### Session Slice
- Session information
- Session timeout
- Activity tracking
- Session metadata

### UI Slice
- UI preferences
- Theme settings
- Layout configuration
- Modal/drawer state

### Error Handling Slice
- Error state management
- Error history
- Error recovery state
- Error notifications

## Usage Examples

### Basic Store Setup

```typescript
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/infrastructure/store';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <YourApp />
      </PersistGate>
    </Provider>
  );
}
```

### Using Store in Components

```typescript
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/infrastructure/store';

function UserProfile() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

### Custom Hooks for Store Access

```typescript
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/infrastructure/store';

export const useAppSelector = <T>(selector: (state: RootState) => T): T => {
  return useSelector(selector);
};

export const useAppDispatch = () => useDispatch<AppDispatch>();

// Usage
function Component() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
}
```

### Accessing Store Outside React

```typescript
import { getStore } from '@/infrastructure/store';

function someUtility() {
  const store = getStore();
  const state = store.getState();
  
  console.log('Current user:', state.auth.user);
  
  store.dispatch(someAction());
}
```

## Best Practices

1. **Typed Selectors**: Always use typed selectors with RootState
2. **Memoized Selectors**: Use reselect for complex derived state
3. **Action Creators**: Use Redux Toolkit's createSlice for actions
4. **Immutability**: Redux Toolkit uses Immer for immutable updates
5. **Persistence**: Only persist necessary state slices
6. **DevTools**: Use Redux DevTools for debugging in development

## Sub-Module Organization

```
store/
├── index.ts                    # Store configuration and exports
├── store-types.ts              # Type definitions
├── slices/                     # State slices
│   ├── authSlice.ts           # Auth state (from ../auth/store)
│   ├── userDashboardSlice.ts  # Dashboard state
│   ├── navigationSlice.ts     # Navigation state
│   ├── loadingSlice.ts        # Loading state
│   ├── sessionSlice.ts        # Session state
│   ├── uiSlice.ts             # UI state
│   └── errorHandlingSlice.ts  # Error state
├── middleware/                 # Custom middleware
└── README.md                   # This file
```

## Integration Points

- **Auth Module**: Authentication state management
- **API Module**: API request state and caching
- **Navigation Module**: Route and navigation state
- **Error Module**: Error state and recovery
- **Observability Module**: State change tracking

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports
- **Requirement 12.1-12.5**: State management consolidation

## Related Documentation

- [Auth Module](../auth/README.md) - Authentication integration
- [Navigation Module](../navigation/README.md) - Navigation state
- [Error Module](../error/README.md) - Error state management
