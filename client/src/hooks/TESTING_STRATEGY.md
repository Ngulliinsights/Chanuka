# Hooks Testing Strategy

## Overview

This document defines the comprehensive testing strategy for all hooks in the SimpleTool project. The goal is to ensure reliability, performance, and maintainability through thorough testing at multiple levels.

## Testing Pyramid

### Unit Tests (Foundation - 70%)
- **Purpose:** Test individual hook functionality
- **Scope:** Each hook in isolation
- **Tools:** Jest, React Testing Library
- **Coverage:** >90% per hook

### Integration Tests (Middle - 20%)
- **Purpose:** Test hook interactions and system integration
- **Scope:** Multiple hooks working together
- **Tools:** Jest, React Testing Library
- **Coverage:** Critical integration paths

### Performance Tests (Top - 10%)
- **Purpose:** Ensure hooks don't cause performance issues
- **Scope:** Memory leaks, render performance, bundle size
- **Tools:** Custom performance testing utilities
- **Coverage:** Performance-critical hooks

## Test Structure

### Directory Organization
```
client/src/hooks/
├── __tests__/
│   ├── unit/                    # Unit tests for individual hooks
│   │   ├── use-toast.test.ts
│   │   ├── use-error-recovery.test.ts
│   │   ├── use-offline-detection.test.ts
│   │   └── ...
│   ├── integration/             # Integration tests
│   │   ├── error-handling.test.ts
│   │   ├── performance.test.ts
│   │   └── hook-interactions.test.ts
│   ├── performance/             # Performance tests
│   │   ├── memory-leaks.test.ts
│   │   ├── render-performance.test.ts
│   │   └── bundle-size.test.ts
│   └── fixtures/                # Test data and mocks
│       ├── mock-data.ts
│       ├── mock-services.ts
│       └── test-helpers.ts
├── utils/
│   └── __tests__/
│       └── error-handling.test.ts
└── patterns/
    └── __tests__/
        └── pattern-templates.test.ts
```

## Unit Testing Strategy

### Test Template Structure
```typescript
// use-example.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExample } from './use-example';

describe('useExample', () => {
  // Test initialization
  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useExample());
      
      expect(result.current.state).toBeDefined();
      expect(result.current.state.isLoading).toBe(false);
    });
    
    it('should accept custom initial options', () => {
      const options = { timeout: 5000 };
      const { result } = renderHook(() => useExample(options));
      
      expect(result.current.options).toEqual(options);
    });
  });
  
  // Test core functionality
  describe('core functionality', () => {
    it('should perform operations correctly', async () => {
      const { result } = renderHook(() => useExample());
      
      await act(async () => {
        await result.current.performOperation();
      });
      
      expect(result.current.data).toBeDefined();
      expect(result.current.error).toBeNull();
    });
    
    it('should handle errors gracefully', async () => {
      const mockError = new Error('Test error');
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);
      
      const { result } = renderHook(() => useExample());
      
      await act(async () => {
        await result.current.performOperation();
      });
      
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isError).toBe(true);
    });
  });
  
  // Test side effects
  describe('side effects', () => {
    it('should cleanup properly on unmount', () => {
      const cleanupSpy = jest.fn();
      
      const { unmount } = renderHook(() => useExample());
      
      unmount();
      
      // Verify cleanup was called
      expect(cleanupSpy).toHaveBeenCalled();
    });
    
    it('should respond to dependency changes', async () => {
      const { result, rerender } = renderHook(
        ({ dependencies }) => useExample(dependencies),
        { initialProps: { dependencies: ['dep1'] } }
      );
      
      rerender({ dependencies: ['dep2'] });
      
      await waitFor(() => {
        expect(result.current.dependencyChangeCount).toBeGreaterThan(0);
      });
    });
  });
  
  // Test error scenarios
  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const { result } = renderHook(() => useExample());
      
      await act(async () => {
        await result.current.performOperation();
      });
      
      expect(result.current.error).toBeDefined();
      expect(result.current.isRecovering).toBe(true);
    });
    
    it('should handle timeout errors', async () => {
      jest.setTimeout(10000);
      
      const { result } = renderHook(() => useExample({ timeout: 100 }));
      
      await act(async () => {
        await result.current.performOperation();
      });
      
      expect(result.current.error?.message).toContain('timeout');
    });
  });
});
```

### Testing Patterns for Each Hook Type

#### 1. State Management Hooks (Reducer Pattern)
```typescript
// use-toast.test.ts
describe('useToast', () => {
  it('should add toast to state', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test', description: 'Toast' });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test');
  });
  
  it('should dismiss toast correctly', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      const toast = result.current.toast({ title: 'Test' });
      result.current.dismiss(toast.id);
    });
    
    expect(result.current.toasts[0].open).toBe(false);
  });
});
```

#### 2. Data Fetching Hooks
```typescript
// use-safe-query.test.ts
describe('useSafeQuery', () => {
  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    
    const { result } = renderHook(() => useSafeQuery('test-key', () => fetch('/api/test')));
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });
  
  it('should retry on failure', async () => {
    const mockData = { id: 1, name: 'Test' };
    jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });
    
    const { result } = renderHook(() => useSafeQuery('test-key', () => fetch('/api/test')));
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });
});
```

#### 3. Effect Hooks
```typescript
// use-offline-detection.test.ts
describe('useOfflineDetection', () => {
  it('should detect online status changes', () => {
    const { result } = renderHook(() => useOfflineDetection());
    
    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOnline).toBe(false);
    
    // Simulate going online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current.isOnline).toBe(true);
  });
  
  it('should check connection quality', async () => {
    const { result } = renderHook(() => useOfflineDetection());
    
    const isOnline = await act(async () => {
      return result.current.checkConnection();
    });
    
    expect(typeof isOnline).toBe('boolean');
  });
});
```

#### 4. Performance Hooks
```typescript
// use-debounce.test.ts
describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'changed', delay: 1000 });
    expect(result.current).toBe('initial'); // Not debounced yet
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current).toBe('changed'); // Debounced value
  });
});
```

## Integration Testing Strategy

### Hook Interaction Tests
```typescript
// hook-interactions.test.ts
describe('Hook Interactions', () => {
  it('should work together correctly', () => {
    const TestComponent = () => {
      const { toast } = useToast();
      const { performOperation } = useExample();
      
      const handleClick = async () => {
        try {
          await performOperation();
          toast({ title: 'Success', description: 'Operation completed' });
        } catch (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      };
      
      return <button onClick={handleClick}>Test</button>;
    };
    
    const { getByText } = render(<TestComponent />);
    
    fireEvent.click(getByText('Test'));
    
    // Verify both hooks work together
    expect(getByText('Success')).toBeInTheDocument();
  });
  
  it('should handle error propagation correctly', () => {
    const TestComponent = () => {
      const { error } = useExample();
      const { toast } = useToast();
      
      useEffect(() => {
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      }, [error, toast]);
      
      return null;
    };
    
    // Test error propagation
    const { rerender } = render(<TestComponent />);
    
    // Simulate error
    rerender(<TestComponent />);
    
    // Verify error is handled
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
```

### System Integration Tests
```typescript
// system-integration.test.ts
describe('System Integration', () => {
  it('should integrate with React Query correctly', async () => {
    const { result } = renderHook(() => useSafeQuery('test', () => fetch('/api/test')));
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    // Verify React Query integration
    expect(result.current.data).toBeDefined();
  });
  
  it('should integrate with error boundaries correctly', () => {
    const TestComponent = () => {
      const { performOperation } = useExample();
      
      useEffect(() => {
        performOperation();
      }, [performOperation]);
      
      return null;
    };
    
    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      try {
        return <>{children}</>;
      } catch (error) {
        return <div>Error caught: {error.message}</div>;
      }
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    // Verify error boundary integration
    expect(screen.queryByText(/Error caught/)).not.toBeInTheDocument();
  });
});
```

## Performance Testing Strategy

### Memory Leak Detection
```typescript
// memory-leaks.test.ts
describe('Memory Leaks', () => {
  it('should not leak memory on unmount', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    const { unmount } = renderHook(() => useExample());
    
    unmount();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (< 1MB)
    expect(memoryIncrease).toBeLessThan(1024 * 1024);
  });
  
  it('should cleanup event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useOfflineDetection());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalled();
  });
});
```

### Render Performance Tests
```typescript
// render-performance.test.ts
describe('Render Performance', () => {
  it('should not cause excessive re-renders', () => {
    const renderCount = { count: 0 };
    
    const TestComponent = () => {
      renderCount.count++;
      const { data } = useExample();
      
      return <div>{data?.toString() || 'No data'}</div>;
    };
    
    const { rerender } = render(<TestComponent />);
    
    // Re-render with same props
    rerender(<TestComponent />);
    
    // Should not cause excessive re-renders
    expect(renderCount.count).toBeLessThan(5);
  });
  
  it('should memoize expensive computations', () => {
    const expensiveComputation = jest.fn().mockImplementation(() => {
      // Simulate expensive computation
      let result = 0;
      for (let i = 0; i < 10000; i++) {
        result += Math.random();
      }
      return result;
    });
    
    const { result, rerender } = renderHook(
      ({ data }) => useExample({ data }),
      { initialProps: { data: [1, 2, 3] } }
    );
    
    // First render should call expensive computation
    expect(expensiveComputation).toHaveBeenCalled();
    
    // Re-render with same data should not call expensive computation
    rerender({ data: [1, 2, 3] });
    
    // Should be memoized
    expect(expensiveComputation.mock.calls.length).toBe(1);
  });
});
```

### Bundle Size Tests
```typescript
// bundle-size.test.ts
describe('Bundle Size', () => {
  it('should not increase bundle size significantly', async () => {
    const bundleSize = await getBundleSize();
    const hookSize = await getHookSize('useExample');
    
    // Hook should not be larger than 5KB
    expect(hookSize).toBeLessThan(5 * 1024);
    
    // Total bundle should not increase by more than 10%
    expect(bundleSize).toBeLessThan(getBaselineBundleSize() * 1.1);
  });
});
```

## Test Utilities and Helpers

### Mock Services
```typescript
// fixtures/mock-services.ts
export const mockApiService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const mockNavigator = {
  onLine: true,
  connection: {
    effectiveType: '4g',
    downlink: 10,
  },
};
```

### Test Helpers
```typescript
// fixtures/test-helpers.ts
export const createMockHook = <T>(mockData: T) => {
  return jest.fn().mockReturnValue({
    data: mockData,
    loading: false,
    error: null,
    refetch: jest.fn(),
  });
};

export const waitForHook = async (hook: () => any) => {
  const { result } = renderHook(hook);
  
  await waitFor(() => {
    expect(result.current).toBeDefined();
  });
  
  return result;
};

export const simulateNetworkError = () => {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(
    new Error('Network error')
  );
};

export const simulateTimeout = (delay: number) => {
  jest.spyOn(global, 'fetch').mockImplementationOnce(
    () => new Promise(resolve => setTimeout(resolve, delay))
  );
};
```

## Testing Best Practices

### 1. Isolation
- Each test should be independent
- No shared state between tests
- Clean up after each test

### 2. Mocking Strategy
- Mock external dependencies
- Use real implementations for internal dependencies
- Mock network requests consistently

### 3. Test Data
- Use realistic test data
- Cover edge cases
- Test with invalid data

### 4. Performance Testing
- Test with large datasets
- Measure render times
- Monitor memory usage

### 5. Error Testing
- Test all error scenarios
- Verify error recovery
- Test error propagation

## Continuous Integration

### Test Execution
```yaml
# .github/workflows/test.yml
name: Test Hooks
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:hooks
      - run: npm run test:performance
      - run: npm run test:coverage
```

### Test Scripts
```json
// package.json
{
  "scripts": {
    "test:hooks": "jest --testPathPattern=hooks",
    "test:performance": "jest --testPathPattern=performance",
    "test:coverage": "jest --coverage --testPathPattern=hooks",
    "test:watch": "jest --watch --testPathPattern=hooks"
  }
}
```

### Coverage Requirements
- **Minimum Coverage:** 90%
- **Critical Paths:** 100%
- **Error Scenarios:** 100%
- **Performance Tests:** Required for performance-critical hooks

## Success Criteria

### Functional Requirements
- [ ] All hooks have comprehensive unit tests
- [ ] Integration tests cover critical paths
- [ ] Performance tests ensure no regressions
- [ ] Error scenarios are thoroughly tested

### Non-Functional Requirements
- [ ] Test execution time < 5 minutes
- [ ] Memory usage during tests < 500MB
- [ ] Coverage reports are generated automatically
- [ ] Tests run on every commit

This comprehensive testing strategy ensures that all hooks are reliable, performant, and maintainable.
