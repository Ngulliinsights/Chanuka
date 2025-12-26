/**
 * Example usage of the Global Loading Indicator system
 * 
 * This example demonstrates how to integrate and use the global loading
 * indicator with your existing Redux store and React application.
 */

import React from 'react';
import { Provider } from 'react-redux';

import { 
  GlobalLoadingProvider, 
  GlobalLoadingIndicator,
  useGlobalLoadingIndicator 
} from '../index';

// Mock store - replace with your actual store
const mockStore = {
  getState: () => ({
    loading: {
      operations: {},
      isOnline: true,
      globalLoading: false,
      highPriorityLoading: false,
    }
  }),
  dispatch: () => {},
  subscribe: () => () => {},
};

// ============================================================================
// Example Component Using the Hook
// ============================================================================

const LoadingControlExample: React.FC = () => {
  const { show, hide, isLoading, activeCount, shouldShow } = useGlobalLoadingIndicator();

  const handleStartLoading = async () => {
    const operationId = await show({
      message: 'Processing your request...',
      priority: 'high',
      type: 'progressive',
    });

    // Simulate some async work
    setTimeout(async () => {
      await hide(operationId);
    }, 3000);
  };

  const handleMultipleOperations = async () => {
    // Start multiple operations
    const operations = await Promise.all([
      show({ message: 'Loading user data...', priority: 'high' }),
      show({ message: 'Fetching preferences...', priority: 'medium' }),
      show({ message: 'Syncing settings...', priority: 'low' }),
    ]);

    // Complete them one by one with delays
    operations.forEach((opId, index) => {
      setTimeout(async () => {
        await hide(opId);
      }, (index + 1) * 1000);
    });
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Global Loading Indicator Example</h2>
      
      <div className="space-y-2">
        <p>Loading Status: {isLoading ? 'Active' : 'Idle'}</p>
        <p>Active Operations: {activeCount}</p>
        <p>Should Show Global Loader: {shouldShow ? 'Yes' : 'No'}</p>
      </div>

      <div className="space-x-2">
        <button
          onClick={handleStartLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isLoading}
        >
          Start Single Operation
        </button>
        
        <button
          onClick={handleMultipleOperations}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={isLoading}
        >
          Start Multiple Operations
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Complete App Example
// ============================================================================

const AppExample: React.FC = () => {
  return (
    <Provider store={mockStore as any}>
      <GlobalLoadingProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Your app content */}
          <LoadingControlExample />
          
          {/* Global loading indicator - automatically shows/hides */}
          <GlobalLoadingIndicator
            position="top-right"
            showOperationDetails={true}
            maxVisibleOperations={3}
            autoHide={true}
            autoHideDelay={2000}
          />
        </div>
      </GlobalLoadingProvider>
    </Provider>
  );
};

// ============================================================================
// Integration Guide
// ============================================================================

/**
 * INTEGRATION STEPS:
 * 
 * 1. Wrap your app with the providers:
 * ```tsx
 * function App() {
 *   return (
 *     <Provider store={store}>
 *       <GlobalLoadingProvider>
 *         <YourApp />
 *         <GlobalLoadingIndicator />
 *       </GlobalLoadingProvider>
 *     </Provider>
 *   );
 * }
 * ```
 * 
 * 2. Use the hook in components:
 * ```tsx
 * const { show, hide } = useGlobalLoadingIndicator();
 * 
 * const handleAsyncAction = async () => {
 *   const opId = await show({ message: 'Loading...' });
 *   try {
 *     await someAsyncOperation();
 *   } finally {
 *     await hide(opId);
 *   }
 * };
 * ```
 * 
 * 3. Or use with existing loading hooks:
 * ```tsx
 * const { withLoading } = useLoadingState();
 * const { show, hide } = useGlobalLoadingIndicator();
 * 
 * const handleAction = withLoading(async () => {
 *   const opId = await show({ message: 'Processing...' });
 *   try {
 *     return await apiCall();
 *   } finally {
 *     await hide(opId);
 *   }
 * });
 * ```
 */

export default AppExample;