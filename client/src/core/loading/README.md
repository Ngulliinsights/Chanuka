# Unified Loading States Management System

A comprehensive, consolidated loading states management system following the error management consolidation pattern. This system provides unified handling of loading states across the entire application with connection awareness, timeout management, and seamless error integration.

## Architecture Overview

The system is built around several key components:

- **Types & Interfaces**: Platform-agnostic types for cross-cutting loading concerns
- **Context & Provider**: React context for global loading state management
- **Hooks**: Specialized hooks for different loading patterns
- **Components**: Reusable loading UI components
- **Utilities**: Connection-aware strategies and performance monitoring
- **Validation**: Comprehensive validation for loading operations

## Key Features

### 🔄 Connection-Aware Loading

- Automatic adaptation based on network conditions
- Smart operation prioritization for slow/offline connections
- Adaptive timeouts and retry strategies

### ⏱️ Timeout & Retry Management

- Configurable timeouts with warning thresholds
- Exponential and linear backoff strategies
- Automatic retry with connection-aware delays

### 🎯 Error Integration

- Seamless integration with existing error management system
- Automatic error reporting and analytics
- Recovery suggestions and retry logic

### 📊 Performance Monitoring

- Global loading performance tracking
- Success rate and retry rate analytics
- Connection impact assessment

### 🎨 Unified Components

- Accessible loading spinners and skeletons
- Progress bars and indicators
- Global loading overlay

## Usage Examples

### Basic Loading Hook

```tsx
import { useLoadingOperation } from '@core/loading';

function MyComponent() {
  const { data, isLoading, error, execute } = useLoadingOperation('fetch-user-data');

  const handleLoadData = async () => {
    const result = await execute(async () => {
      const response = await fetch('/api/user');
      return response.json();
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Data: {JSON.stringify(data)}</div>;
}
```

### Progressive Loading

```tsx
import { useProgressiveLoading } from '@core/loading';

function FileUploadComponent() {
  const { currentStage, progress, start, completeCurrentStage } = useProgressiveLoading([
    { id: 'prepare', message: 'Preparing file...' },
    { id: 'upload', message: 'Uploading...' },
    { id: 'process', message: 'Processing...' },
  ]);

  return (
    <div>
      <button onClick={start}>Upload File</button>
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

### Connection-Aware Component

```tsx
import { useComponentLoading } from '@core/loading';

function DataTable() {
  const { startLoading, completeLoading } = useComponentLoading('data-table', {
    connectionAware: true,
    priority: 'medium',
  });

  // Component automatically adapts to connection quality
}
```

### Global Loading Indicator

```tsx
import { GlobalLoadingIndicator } from '@core/loading';

function App() {
  return (
    <div>
      <GlobalLoadingIndicator />
      {/* App content */}
    </div>
  );
}
```

## Configuration

### Provider Setup

```tsx
import { LoadingProvider } from '@core/loading';
import { useErrorAnalytics } from '@hooks/useErrorAnalytics';

function App() {
  const errorAnalytics = useErrorAnalytics();

  return <LoadingProvider errorAnalytics={errorAnalytics}>{/* App content */}</LoadingProvider>;
}
```

### Custom Scenarios

```tsx
import { LoadingScenarioBuilder, LOADING_SCENARIOS } from '@core/loading';

// Create custom scenario
const customScenario = LoadingScenarioBuilder.create('custom-api')
  .name('Custom API Call')
  .description('Special API operation with custom settings')
  .timeout(10000)
  .retryStrategy('exponential')
  .maxRetries(5)
  .priority('high')
  .connectionAware(true)
  .progressTracking(false)
  .build();

// Use predefined scenarios
const apiScenario = LOADING_SCENARIOS.API_REQUEST;
```

## Migration Guide

### From Legacy Loading Hooks

**Before:**

```tsx
const { loading, error } = useApi('/api/data');
```

**After:**

```tsx
const { isLoading, error, execute } = useLoadingOperation('api-data');
const result = await execute(() => fetch('/api/data').then(r => r.json()));
```

### From Component-Level Loading

**Before:**

```tsx
const [loading, setLoading] = useState(false);
```

**After:**

```tsx
const { startLoading, completeLoading } = useComponentLoading('my-component');
```

## Performance Considerations

- Operations are automatically prioritized based on connection quality
- Low-priority operations are skipped on slow connections
- Global loading state is optimized to prevent unnecessary re-renders
- Connection changes trigger adaptive settings updates

## Accessibility

All loading components include proper ARIA attributes:

- `role="status"` for loading states
- `aria-label` for screen reader announcements
- `aria-live` regions for dynamic updates
- Focus management during loading transitions

## Error Handling

The system integrates with the error management system:

- Automatic error tracking and analytics
- Recovery suggestions based on error patterns
- Connection-aware retry strategies
- Timeout warnings and graceful degradation

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { LoadingProvider } from '@core/loading';

const renderWithLoading = (component: React.ReactElement) => {
  return render(<LoadingProvider>{component}</LoadingProvider>);
};
```

## API Reference

### Hooks

- `useLoadingOperation()` - Basic loading operations
- `usePageLoading()` - Page-level loading
- `useComponentLoading()` - Component-level loading
- `useApiLoading()` - API-specific loading
- `useProgressiveLoading()` - Multi-stage operations
- `useTimeoutAwareLoading()` - Timeout-aware operations

### Components

- `LoadingSpinner` - Animated spinner
- `LoadingSkeleton` - Skeleton screens
- `LoadingProgress` - Progress bars/circles
- `GlobalLoadingIndicator` - App-wide loading overlay

### Utilities

- `detectConnectionType()` - Network detection
- `calculateRetryDelay()` - Retry timing
- `LoadingPerformanceMonitor` - Performance tracking
- `LoadingScenarioBuilder` - Scenario creation

## Best Practices

1. **Use appropriate priorities**: High for critical operations, low for background tasks
2. **Enable connection awareness**: Let the system adapt to network conditions
3. **Provide meaningful messages**: Help users understand what's happening
4. **Handle errors gracefully**: Use the integrated error management system
5. **Test loading states**: Ensure proper behavior across different conditions

## Troubleshooting

### Common Issues

**Operations not starting:**

- Check connection status and priority settings
- Verify provider is properly configured

**Timeouts not working:**

- Ensure timeout values are reasonable for operation type
- Check connection multiplier settings

**Components not updating:**

- Verify hooks are used within LoadingProvider
- Check for proper dependency arrays in useEffect

### Debug Mode

Enable debug logging:

```tsx
const loadingConfig = {
  validation: { enabled: true, strict: false },
  logging: { level: 'debug' },
};
```
