# Global Loading Indicator System

A comprehensive loading state management system that integrates with Redux and provides global loading indicators for your React application.

## Overview

The system consists of several key components:

- **Redux Store Integration**: Uses `loadingSlice` for centralized state management
- **Global Loading Provider**: React context for accessing loading state
- **Global Loading Indicator**: Visual component that shows loading states
- **Hooks**: Simple interfaces for controlling loading states

## Quick Start

### 1. Setup the Provider

Wrap your app with the necessary providers:

```tsx
import { Provider } from 'react-redux';
import { GlobalLoadingProvider, GlobalLoadingIndicator } from '@client/lib/ui/loading';
import { store } from '@client/lib/infrastructure/store';

function App() {
  return (
    <Provider store={store}>
      <GlobalLoadingProvider>
        <YourApp />

        {/* Global loading indicator - shows automatically */}
        <GlobalLoadingIndicator
          position="top-right"
          showOperationDetails={true}
          maxVisibleOperations={3}
        />
      </GlobalLoadingProvider>
    </Provider>
  );
}
```

### 2. Use the Hook

Control loading states in your components:

```tsx
import { useGlobalLoadingIndicator } from '@client/lib/ui/loading';

function MyComponent() {
  const { show, hide, isLoading } = useGlobalLoadingIndicator();

  const handleAsyncAction = async () => {
    const operationId = await show({
      message: 'Saving data...',
      priority: 'high',
    });

    try {
      await saveData();
    } finally {
      await hide(operationId);
    }
  };

  return (
    <button onClick={handleAsyncAction} disabled={isLoading}>
      {isLoading ? 'Saving...' : 'Save Data'}
    </button>
  );
}
```

## Components

### GlobalLoadingIndicator

The main visual component that displays loading states.

**Props:**

- `position`: Where to show the indicator (`'top-right'`, `'center'`, etc.)
- `showOperationDetails`: Whether to show detailed operation info
- `maxVisibleOperations`: Maximum operations to display
- `autoHide`: Whether to auto-hide when complete
- `autoHideDelay`: Delay before auto-hiding (ms)
- `customMessage`: Override the default loading message

### MinimalGlobalLoadingIndicator

A compact version showing just a spinner.

**Props:**

- `className`: Additional CSS classes

## Hooks

### useGlobalLoadingIndicator

Main hook for controlling loading states.

**Returns:**

- `show(options)`: Start a loading operation
- `hide(operationId)`: Complete a loading operation
- `isLoading`: Whether any operations are active
- `activeCount`: Number of active operations
- `shouldShow`: Whether the global loader should be visible

**Show Options:**

- `message`: Loading message to display
- `priority`: Operation priority (`'high'`, `'medium'`, `'low'`)
- `type`: Loading type (`'progressive'`, `'data'`, etc.)
- `timeout`: Operation timeout in milliseconds
- `maxRetries`: Maximum retry attempts

### useGlobalLoading

Lower-level hook for direct access to the loading context.

**Returns:**

- `operations`: All active operations
- `isOnline`: Network status
- `shouldShowGlobalLoader`: Whether to show the global loader
- `activeOperationsCount`: Number of active operations
- `startOperation(operation)`: Start a new operation
- `completeOperation(id, success, error)`: Complete an operation
- `getOperation(id)`: Get a specific operation
- `getOperationsByPriority(priority)`: Get operations by priority

## Integration with Existing Hooks

The system works seamlessly with your existing loading hooks:

```tsx
import { useLoadingState, useGlobalLoadingIndicator } from '@client/lib/ui/loading';

function MyComponent() {
  const { withLoading } = useLoadingState();
  const { show, hide } = useGlobalLoadingIndicator();

  const handleAction = withLoading(async () => {
    const opId = await show({ message: 'Processing...' });
    try {
      return await apiCall();
    } finally {
      await hide(opId);
    }
  });

  return <button onClick={handleAction}>Process</button>;
}
```

## Advanced Usage

### Multiple Operations

```tsx
const handleBulkOperation = async () => {
  const operations = await Promise.all([
    show({ message: 'Loading users...', priority: 'high' }),
    show({ message: 'Loading settings...', priority: 'medium' }),
    show({ message: 'Loading preferences...', priority: 'low' }),
  ]);

  // Process each operation
  for (const [index, opId] of operations.entries()) {
    try {
      await processOperation(index);
      await hide(opId);
    } catch (error) {
      // Operation will be marked as failed automatically
      console.error(`Operation ${index} failed:`, error);
    }
  }
};
```

### Custom Error Handling

```tsx
const { startOperation, completeOperation } = useGlobalLoading();

const handleWithErrorHandling = async () => {
  const opId = await startOperation({
    id: 'custom-operation',
    type: 'data',
    message: 'Loading critical data...',
    priority: 'high',
    timeout: 10000,
    maxRetries: 3,
  });

  try {
    await criticalOperation();
    await completeOperation(opId, true);
  } catch (error) {
    await completeOperation(opId, false, error.message);
  }
};
```

## Styling

The components use Tailwind CSS classes and can be customized:

```tsx
<GlobalLoadingIndicator
  className="custom-loading-styles"
  position="center"
  customMessage="Please wait while we process your request..."
/>
```

## Migration from Old Hook

If you were using the old `useGlobalLoadingIndicator` hook, here's how to migrate:

**Old way:**

```tsx
const { show, hide, config, isEnabled } = useGlobalLoadingIndicator();
show({ position: 'center', customMessage: 'Loading...' });
```

**New way:**

```tsx
const { show, hide, isLoading } = useGlobalLoadingIndicator();
const opId = await show({ message: 'Loading...' });
// Position and styling are now handled by the GlobalLoadingIndicator component
```

## Performance Considerations

- Operations are automatically cleaned up after completion
- The context uses memoization to prevent unnecessary re-renders
- Redux state is normalized for efficient updates
- Debounced state updates prevent UI thrashing

## Troubleshooting

**Loading indicator not showing:**

- Ensure `GlobalLoadingProvider` wraps your app
- Check that `GlobalLoadingIndicator` is rendered
- Verify Redux store includes the `loadingSlice`

**Operations not completing:**

- Always call `hide()` in a `finally` block
- Check for unhandled promise rejections
- Verify operation IDs match between `show()` and `hide()`

**Performance issues:**

- Limit `maxVisibleOperations` for better performance
- Use appropriate priorities to avoid showing too many operations
- Consider using `MinimalGlobalLoadingIndicator` for simple cases
