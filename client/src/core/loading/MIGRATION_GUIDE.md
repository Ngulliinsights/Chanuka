# Migration Guide: Unified Loading States Management System

This guide helps you migrate from fragmented loading implementations to the unified loading states management system.

## Overview

The unified system consolidates multiple loading implementations into a single, cohesive system with:
- Connection-aware loading strategies
- Integrated error management
- Timeout and retry handling
- Performance monitoring
- Accessible UI components

## Migration Steps

### 1. Provider Setup

**Before:**
```tsx
// No centralized loading provider
```

**After:**
```tsx
import { LoadingProvider } from '@core/loading';
import { useErrorAnalytics } from '@hooks/useErrorAnalytics';

function App() {
  const errorAnalytics = useErrorAnalytics();

  return (
    <LoadingProvider errorAnalytics={errorAnalytics}>
      <GlobalLoadingIndicator />
      {/* App content */}
    </LoadingProvider>
  );
}
```

### 2. Replace Loading Hooks

#### useApiLoading → useLoadingOperation

**Before:**
```tsx
import { useApiLoading } from '../hooks/useApiLoading';

function MyComponent() {
  const { data, loading, error, refetch } = useApiLoading('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.map(user => <User key={user.id} user={user} />)}</div>;
}
```

**After:**
```tsx
import { useLoadingOperation } from '@core/loading';

function MyComponent() {
  const { data, isLoading, error, execute } = useLoadingOperation('fetch-users', {
    type: 'api',
    timeout: 10000,
    retryLimit: 3,
  });

  const loadUsers = async () => {
    const result = await execute(async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    });
    return result;
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  if (isLoading) return <LoadingSpinner message="Loading users..." />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.map(user => <User key={user.id} user={user} />)}</div>;
}
```

#### useComponentLoading → useComponentLoading

**Before:**
```tsx
import { useComponentLoading } from '../hooks/useComponentLoading';

function DataTable({ data }) {
  const loading = useComponentLoading();

  if (loading) return <div>Loading table...</div>;

  return (
    <table>
      {data.map(row => <tr key={row.id}>{/* row content */}</tr>)}
    </table>
  );
}
```

**After:**
```tsx
import { useComponentLoading } from '@core/loading';

function DataTable({ data }) {
  const { startLoading, completeLoading } = useComponentLoading('data-table');

  const loadData = async () => {
    startLoading('Loading table data...');
    try {
      // Load data logic
      await fetchData();
      completeLoading(true);
    } catch (error) {
      completeLoading(false, error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <table>
      {data.map(row => <tr key={row.id}>{/* row content */}</tr>)}
    </table>
  );
}
```

#### useProgressiveLoading → useProgressiveLoading

**Before:**
```tsx
import { useProgressiveLoading } from '../hooks/useProgressiveLoading';

function FileUpload() {
  const { stages, currentStage, progress } = useProgressiveLoading([
    { id: 'validate', message: 'Validating file...' },
    { id: 'upload', message: 'Uploading...' },
    { id: 'process', message: 'Processing...' },
  ]);

  // Implementation
}
```

**After:**
```tsx
import { useProgressiveLoading } from '@core/loading';

function FileUpload() {
  const {
    currentStage,
    progress,
    start,
    completeCurrentStage,
    failCurrentStage
  } = useProgressiveLoading([
    { id: 'validate', message: 'Validating file...', duration: 2000 },
    { id: 'upload', message: 'Uploading...', duration: 10000 },
    { id: 'process', message: 'Processing...', duration: 5000 },
  ]);

  const handleUpload = async (file) => {
    start();

    try {
      // Validate
      await validateFile(file);
      completeCurrentStage();

      // Upload
      await uploadFile(file);
      completeCurrentStage();

      // Process
      await processFile(file);
      completeCurrentStage();

    } catch (error) {
      failCurrentStage(error);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {currentStage && (
        <div>
          <p>{currentStage.message}</p>
          <LoadingProgress progress={progress} />
        </div>
      )}
    </div>
  );
}
```

### 3. Replace Loading Components

#### Spinner Components

**Before:**
```tsx
import { Spinner } from '../components/Spinner';

function LoadingState() {
  return <Spinner size="large" />;
}
```

**After:**
```tsx
import { LoadingSpinner } from '@core/loading';

function LoadingState() {
  return <LoadingSpinner size="lg" message="Loading..." />;
}
```

#### Skeleton Components

**Before:**
```tsx
import { Skeleton } from '../components/Skeleton';

function UserCard({ loading }) {
  if (loading) {
    return (
      <div className="user-card">
        <div className="avatar skeleton"></div>
        <div className="name skeleton"></div>
        <div className="bio skeleton"></div>
      </div>
    );
  }

  return <UserCardContent />;
}
```

**After:**
```tsx
import { CardSkeleton } from '@core/loading';

function UserCard({ loading }) {
  if (loading) {
    return <CardSkeleton showAvatar showTitle showSubtitle lines={2} />;
  }

  return <UserCardContent />;
}
```

#### Progress Components

**Before:**
```tsx
import { ProgressBar } from '../components/ProgressBar';

function UploadProgress({ progress }) {
  return <ProgressBar value={progress} />;
}
```

**After:**
```tsx
import { LoadingProgress } from '@core/loading';

function UploadProgress({ progress }) {
  return <LoadingProgress progress={progress} showPercentage />;
}
```

### 4. Replace Loading State Management

#### Redux/Zustand Loading States

**Before:**
```tsx
// Redux slice
const loadingSlice = createSlice({
  name: 'loading',
  initialState: { global: false, operations: {} },
  reducers: {
    setLoading: (state, action) => {
      state.operations[action.payload.key] = action.payload.loading;
    },
  },
});

// Component
function MyComponent() {
  const dispatch = useDispatch();
  const loading = useSelector(state => state.loading.operations['my-operation']);

  const handleAction = async () => {
    dispatch(setLoading({ key: 'my-operation', loading: true }));
    try {
      await apiCall();
    } finally {
      dispatch(setLoading({ key: 'my-operation', loading: false }));
    }
  };
}
```

**After:**
```tsx
import { useLoadingOperation } from '@core/loading';

function MyComponent() {
  const { isLoading, execute } = useLoadingOperation('my-operation');

  const handleAction = async () => {
    await execute(async () => {
      await apiCall();
    });
  };
}
```

### 5. Update Error Handling

#### Error Boundaries

**Before:**
```tsx
class LoadingErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Handle loading error
  }

  render() {
    if (this.state.hasError) {
      return <div>Loading failed. <button onClick={this.handleRetry}>Retry</button></div>;
    }

    return this.props.children;
  }
}
```

**After:**
```tsx
import { useLoadingOperation } from '@core/loading';

function LoadingWrapper({ children }) {
  const { error, retry, isLoading } = useLoadingOperation('wrapper-operation');

  if (error) {
    return (
      <div>
        Loading failed: {error.message}
        <button onClick={retry} disabled={isLoading}>
          {isLoading ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  return children;
}
```

### 6. Update Configuration

#### Loading Configuration

**Before:**
```tsx
// Scattered configuration
const API_TIMEOUT = 10000;
const RETRY_ATTEMPTS = 3;
const CONNECTION_AWARE = true;
```

**After:**
```tsx
import { LOADING_SCENARIOS } from '@core/loading';

// Use predefined scenarios
const apiScenario = LOADING_SCENARIOS.API_REQUEST;

// Or create custom configuration
const customConfig = {
  timeout: 15000,
  retryLimit: 5,
  retryStrategy: 'exponential',
  connectionAware: true,
  priority: 'high',
};
```

### 7. Update Testing

#### Component Tests

**Before:**
```tsx
import { render, screen } from '@testing-library/react';

test('shows loading state', () => {
  render(<MyComponent loading={true} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

**After:**
```tsx
import { render, screen } from '@testing-library/react';
import { LoadingProvider } from '@core/loading';

const renderWithLoading = (component) => {
  return render(
    <LoadingProvider>
      {component}
    </LoadingProvider>
  );
};

test('shows loading state', async () => {
  renderWithLoading(<MyComponent />);

  // Trigger loading operation
  fireEvent.click(screen.getByRole('button', { name: /load/i }));

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

#### Hook Tests

**Before:**
```tsx
import { renderHook } from '@testing-library/react-hooks';
import { useApiLoading } from '../hooks/useApiLoading';

test('handles loading states', async () => {
  const { result } = renderHook(() => useApiLoading('/api/test'));

  expect(result.current.loading).toBe(true);
  // ... more assertions
});
```

**After:**
```tsx
import { renderHook } from '@testing-library/react-hooks';
import { useLoadingOperation } from '@core/loading';

const wrapper = ({ children }) => (
  <LoadingProvider>{children}</LoadingProvider>
);

test('handles loading states', async () => {
  const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

  expect(result.current.isLoading).toBe(false);

  // Execute operation
  act(() => {
    result.current.execute(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'data';
    });
  });

  expect(result.current.isLoading).toBe(true);
  // ... more assertions
});
```

### 8. Performance Optimizations

#### Connection-Aware Loading

**Before:**
```tsx
// No connection awareness
const loadData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
```

**After:**
```tsx
import { useLoadingOperation } from '@core/loading';

function MyComponent() {
  const { execute } = useLoadingOperation('data-load', {
    connectionAware: true,
    priority: 'medium',
  });

  const loadData = async () => {
    return await execute(async () => {
      const response = await fetch('/api/data');
      return response.json();
    });
  };

  // System automatically adapts based on connection quality
}
```

#### Progressive Loading

**Before:**
```tsx
// All-or-nothing loading
const loadHeavyData = async () => {
  setLoading(true);
  const data = await fetch('/api/heavy-data');
  setLoading(false);
  return data;
};
```

**After:**
```tsx
import { useProgressiveLoading } from '@core/loading';

function HeavyDataLoader() {
  const { currentStage, progress, start, completeCurrentStage } = useProgressiveLoading([
    { id: 'fetch', message: 'Fetching data...', duration: 2000 },
    { id: 'parse', message: 'Parsing data...', duration: 3000 },
    { id: 'render', message: 'Rendering...', duration: 1000 },
  ]);

  const loadData = async () => {
    start();

    // Fetch phase
    const rawData = await fetch('/api/heavy-data');
    completeCurrentStage();

    // Parse phase
    const parsedData = await parseData(rawData);
    completeCurrentStage();

    // Render phase
    await renderData(parsedData);
    completeCurrentStage();
  };

  return (
    <div>
      <button onClick={loadData}>Load Heavy Data</button>
      {currentStage && (
        <div>
          <p>{currentStage.message}</p>
          <LoadingProgress progress={progress} />
        </div>
      )}
    </div>
  );
}
```

## Breaking Changes

### Removed APIs

1. **Legacy Hook Signatures**: All legacy loading hooks have been consolidated
2. **Direct State Manipulation**: No more direct loading state manipulation
3. **Custom Loading Managers**: Use the unified provider instead

### Behavioral Changes

1. **Automatic Timeouts**: Operations now have automatic timeout handling
2. **Connection Awareness**: Loading adapts to network conditions by default
3. **Error Integration**: Errors are automatically tracked and reported
4. **Priority-Based Queuing**: Operations are queued based on priority and connection

## Best Practices for Migration

### Phase 1: Provider Setup
- Add `LoadingProvider` to your app root
- Include `GlobalLoadingIndicator` for global loading states

### Phase 2: Component Migration
- Start with leaf components (no dependencies)
- Migrate one component at a time
- Test thoroughly after each migration

### Phase 3: Hook Migration
- Replace custom loading hooks with unified hooks
- Update component logic to use new hook APIs
- Remove old hook implementations

### Phase 4: State Management
- Remove loading states from Redux/Zustand slices
- Use unified loading system for all loading operations
- Update selectors and actions

### Phase 5: Testing & Optimization
- Update all tests to use new APIs
- Add connection-aware testing
- Optimize based on performance metrics

## Troubleshooting

### Common Migration Issues

**"LoadingProvider not found"**
```tsx
// Make sure to import from the correct path
import { LoadingProvider } from '@core/loading';
```

**"Hook must be used within LoadingProvider"**
```tsx
// Wrap your component tree with LoadingProvider
<LoadingProvider>
  <App />
</LoadingProvider>
```

**"Operation ID conflicts"**
```tsx
// Use unique operation IDs
const { execute: execute1 } = useLoadingOperation('user-list');
const { execute: execute2 } = useLoadingOperation('user-details');
```

**"Timeout errors"**
```tsx
// Adjust timeout settings
const { execute } = useLoadingOperation('slow-operation', {
  timeout: 30000, // 30 seconds
});
```

## Rollback Strategy

If you need to rollback:

1. Remove `LoadingProvider` wrapper
2. Restore original loading implementations
3. Update imports to use old hooks/components
4. Remove unified loading dependencies

## Support

For migration assistance:
- Check the README.md for detailed API documentation
- Review the examples in the `/examples` directory
- Create issues for specific migration problems

## Next Steps

After migration:
- Monitor performance improvements
- Review error analytics for loading-related issues
- Optimize connection-aware strategies for your use case
- Consider contributing improvements back to the unified system