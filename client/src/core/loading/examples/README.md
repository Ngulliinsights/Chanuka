# Loading System Examples

This directory contains practical examples of using the unified loading states management system.

## Basic Usage Examples

### 1. Simple API Loading

```tsx
import { useLoadingOperation } from '@core/loading';

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error, execute } = useLoadingOperation('fetch-user', {
    timeout: 10000,
    retryLimit: 2,
  });

  const loadUser = async () => {
    return await execute(async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to load user');
      return response.json();
    });
  };

  React.useEffect(() => {
    loadUser();
  }, [userId]);

  if (isLoading) return <LoadingSpinner message="Loading user..." />;
  if (error) return <div>Error: {error.message}</div>;

  return <UserCard user={user} />;
}
```

### 2. Progressive File Upload

```tsx
import { useProgressiveLoading } from '@core/loading';

function FileUploadComponent() {
  const {
    currentStage,
    progress,
    start,
    completeCurrentStage,
    failCurrentStage
  } = useProgressiveLoading([
    { id: 'validate', message: 'Validating file...', duration: 2000 },
    { id: 'upload', message: 'Uploading...', duration: 30000 },
    { id: 'process', message: 'Processing...', duration: 10000 },
  ]);

  const handleUpload = async (file: File) => {
    start();

    try {
      // Validation stage
      await validateFile(file);
      completeCurrentStage();

      // Upload stage with progress
      const result = await uploadFile(file, (progress) => {
        // Update progress if needed
      });
      completeCurrentStage();

      // Processing stage
      await processFile(result.id);
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

### 3. Component-Level Loading

```tsx
import { useComponentLoading } from '@core/loading';

function DataTable({ data }: { data: any[] }) {
  const { startLoading, completeLoading } = useComponentLoading('data-table', {
    priority: 'medium',
    connectionAware: true,
  });

  const refreshData = async () => {
    startLoading('Refreshing data...');
    try {
      const newData = await fetchData();
      setData(newData);
      completeLoading(true);
    } catch (error) {
      completeLoading(false, error);
    }
  };

  return (
    <div>
      <button onClick={refreshData}>Refresh</button>
      <table>{/* table content */}</table>
    </div>
  );
}
```

### 4. Global Loading States

```tsx
import { GlobalLoadingIndicator, useGlobalLoading } from '@core/loading';

function App() {
  const { isLoading, operationCount } = useGlobalLoading();

  return (
    <div>
      <GlobalLoadingIndicator />
      {isLoading && (
        <div className="loading-banner">
          {operationCount} operations in progress...
        </div>
      )}
      {/* App content */}
    </div>
  );
}
```

## Advanced Examples

### 5. Connection-Aware Loading

```tsx
import { useLoadingOperation } from '@core/loading';

function AdaptiveComponent() {
  const { execute } = useLoadingOperation('adaptive-load', {
    connectionAware: true,
    priority: 'medium',
    // System automatically adjusts timeouts and retry strategies
    // based on connection quality
  });

  const loadData = async () => {
    return await execute(async () => {
      const response = await fetch('/api/data');
      return response.json();
    });
  };

  return <button onClick={loadData}>Load Data</button>;
}
```

### 6. Timeout-Aware Operations

```tsx
import { useTimeoutAwareLoading } from '@core/loading';

function TimeoutExample() {
  const {
    isLoading,
    isTimeout,
    elapsedTime,
    remainingTime,
    start,
    extendTimeout
  } = useTimeoutAwareLoading({
    timeout: 10000,
    onTimeout: () => console.log('Operation timed out'),
  });

  const handleLongOperation = () => {
    start(async () => {
      // Long running operation
      await new Promise(resolve => setTimeout(resolve, 15000));
      return 'completed';
    });
  };

  return (
    <div>
      <button onClick={handleLongOperation} disabled={isLoading}>
        Start Long Operation
      </button>

      {isLoading && (
        <div>
          <p>Elapsed: {elapsedTime}ms</p>
          <p>Remaining: {remainingTime}ms</p>
          {remainingTime < 2000 && (
            <button onClick={() => extendTimeout(5000)}>
              Extend Timeout
            </button>
          )}
        </div>
      )}

      {isTimeout && <p>Operation timed out!</p>}
    </div>
  );
}
```

### 7. Error Recovery

```tsx
import { useLoadingOperation } from '@core/loading';

function ResilientComponent() {
  const { error, retry, recover, recovery } = useLoadingOperation('resilient-op', {
    retryLimit: 3,
    connectionAware: true,
  });

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <div>
          <button onClick={retry}>Retry</button>
          {recovery.canRecover && (
            <button onClick={recover}>Auto Recover</button>
          )}
        </div>
        {recovery.suggestions.length > 0 && (
          <ul>
            {recovery.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return <div>Content loaded successfully</div>;
}
```

### 8. Skeleton Loading

```tsx
import { CardSkeleton, TextSkeleton, ListSkeleton } from '@core/loading';

function LoadingStates() {
  const [loadingState, setLoadingState] = React.useState('loading');

  return (
    <div>
      {loadingState === 'loading' && (
        <div className="space-y-4">
          <CardSkeleton showAvatar showTitle showSubtitle lines={2} />
          <TextSkeleton lines={3} />
          <ListSkeleton items={5} />
        </div>
      )}

      {loadingState === 'loaded' && (
        <div>Actual content here</div>
      )}
    </div>
  );
}
```

## Provider Setup Examples

### Basic Provider Setup

```tsx
import { LoadingProvider } from '@core/loading';
import { useErrorAnalytics } from '@hooks/useErrorAnalytics';

function App() {
  const errorAnalytics = useErrorAnalytics();

  return (
    <LoadingProvider errorAnalytics={errorAnalytics}>
      <GlobalLoadingIndicator />
      <AppContent />
    </LoadingProvider>
  );
}
```

### Advanced Provider Configuration

```tsx
import { LoadingProvider } from '@core/loading';

const loadingConfig = {
  validation: {
    enabled: true,
    strict: false,
  },
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
  },
  connection: {
    adaptiveTimeouts: true,
    connectionMultiplier: 2,
  },
  performance: {
    enableMonitoring: true,
    logSlowOperations: true,
  },
};

function App() {
  return (
    <LoadingProvider config={loadingConfig}>
      <AppContent />
    </LoadingProvider>
  );
}
```

## Custom Scenarios

### Creating Custom Loading Scenarios

```tsx
import { LoadingScenarioBuilder, LOADING_SCENARIOS } from '@core/loading';

// Create a custom scenario
const customScenario = LoadingScenarioBuilder.create('data-export')
  .name('Data Export')
  .description('Exporting data to file')
  .timeout(120000) // 2 minutes
  .retryStrategy('linear')
  .maxRetries(1)
  .priority('high')
  .connectionAware(true)
  .progressTracking(true)
  .stages([
    { id: 'prepare', message: 'Preparing data...', duration: 5000 },
    { id: 'export', message: 'Exporting...', duration: 60000 },
    { id: 'download', message: 'Preparing download...', duration: 10000 },
  ])
  .build();

// Use in component
function DataExportComponent() {
  const { execute } = useLoadingOperation('data-export', {
    scenario: customScenario,
  });

  const handleExport = async () => {
    return await execute(async () => {
      // Export logic here
      return await exportData();
    });
  };

  return <button onClick={handleExport}>Export Data</button>;
}
```

## Testing Examples

### Hook Testing

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { LoadingProvider } from '@core/loading';

const wrapper = ({ children }) => (
  <LoadingProvider>{children}</LoadingProvider>
);

test('handles loading states', async () => {
  const { result } = renderHook(() => useLoadingOperation('test'), { wrapper });

  const mockOperation = vi.fn().mockResolvedValue('success');

  act(() => {
    result.current.execute(mockOperation);
  });

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBe('success');
});
```

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { LoadingProvider } from '@core/loading';

test('shows loading spinner', () => {
  render(
    <LoadingProvider>
      <LoadingSpinner message="Loading..." />
    </LoadingProvider>
  );

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

## Performance Optimization Examples

### Lazy Loading with Preloading

```tsx
import { useLoadingOperation } from '@core/loading';

function LazyComponent({ componentId }: { componentId: string }) {
  const { isLoading, execute } = useLoadingOperation(`lazy-${componentId}`, {
    type: 'component',
    priority: 'medium',
  });

  const loadComponent = async () => {
    return await execute(async () => {
      const module = await import(`./components/${componentId}`);
      return module.default;
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return <LazyLoadedComponent onLoad={loadComponent} />;
}
```

### Batch Operations

```tsx
import { useLoadingOperation } from '@core/loading';

function BatchOperations() {
  const { execute: executeBatch } = useLoadingOperation('batch-ops', {
    type: 'api',
    priority: 'high',
  });

  const handleBatchUpdate = async (operations: any[]) => {
    return await executeBatch(async () => {
      const results = await Promise.allSettled(
        operations.map(op => performOperation(op))
      );
      return results;
    });
  };

  return <button onClick={() => handleBatchUpdate(operations)}>Batch Update</button>;
}
```

## Error Handling Examples

### Graceful Degradation

```tsx
import { useLoadingOperation } from '@core/loading';

function ResilientComponent() {
  const { data, error, execute, recovery } = useLoadingOperation('resilient', {
    retryLimit: 3,
    connectionAware: true,
  });

  const loadWithFallback = async () => {
    try {
      return await execute(async () => {
        return await fetchPrimaryData();
      });
    } catch {
      // Try fallback data source
      return await execute(async () => {
        return await fetchFallbackData();
      });
    }
  };

  if (error && !recovery.canRecover) {
    return <FallbackComponent />;
  }

  return <DataComponent data={data} />;
}
```

### User-Friendly Error Messages

```tsx
import { useLoadingOperation } from '@core/loading';

function UserFriendlyErrors() {
  const { error, isTimeout } = useLoadingOperation('user-friendly');

  const getErrorMessage = (error: Error) => {
    if (isTimeout) {
      return 'The request is taking longer than expected. Please check your connection and try again.';
    }

    if (error.message.includes('network')) {
      return 'Unable to connect. Please check your internet connection.';
    }

    if (error.message.includes('unauthorized')) {
      return 'You need to log in to access this content.';
    }

    return 'Something went wrong. Please try again.';
  };

  if (error) {
    return (
      <div className="error-message">
        <p>{getErrorMessage(error)}</p>
        <button onClick={retry}>Try Again</button>
      </div>
    );
  }

  return <div>Content loaded</div>;
}
```

These examples demonstrate the flexibility and power of the unified loading states management system. The system handles complex loading scenarios while maintaining simplicity for common use cases.