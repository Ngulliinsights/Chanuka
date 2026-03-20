# Hooks Architecture Documentation

## Overview

This document provides comprehensive documentation for the standardized hooks architecture in the SimpleTool project. The architecture follows Feature-Sliced Design (FSD) principles with backward compatibility and includes comprehensive error handling, performance optimization, and testing.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Hooks](#core-hooks)
3. [Error Handling](#error-handling)
4. [Performance Optimization](#performance-optimization)
5. [Hook Patterns](#hook-patterns)
6. [Usage Examples](#usage-examples)
7. [Migration Guide](#migration-guide)
8. [Best Practices](#best-practices)
9. [Testing](#testing)

## Architecture Overview

### Directory Structure
```
client/src/hooks/
├── index.ts                    # Main exports
├── utils/                      # Shared utilities
│   ├── error-handling.ts      # Error handling utilities
│   ├── performance.ts         # Performance utilities
│   └── validation.ts          # Input validation utilities
├── patterns/                   # Pattern templates
│   ├── reducer-template.ts    # Reducer pattern example
│   ├── callback-template.ts   # Callback pattern example
│   ├── effect-template.ts     # Effect pattern example
│   └── strategy-template.ts   # Strategy pattern example
├── use-toast.ts               # Toast notifications
├── useErrorRecovery.ts        # Error recovery system
├── use-offline-detection.ts   # Offline detection
├── use-system.ts              # System monitoring
├── use-cleanup.ts             # Resource cleanup
├── use-mobile.ts              # Mobile detection
├── use-performance-monitor.ts # Performance monitoring
└── __tests__/                 # Test files
```

### Design Principles

1. **Consistency**: All hooks follow standardized patterns
2. **Performance**: Built-in optimization and memoization
3. **Error Handling**: Unified error handling across all hooks
4. **Type Safety**: Full TypeScript support with strict typing
5. **Backward Compatibility**: Legacy support during migration
6. **Testability**: Comprehensive test coverage

## Core Hooks

### useToast
Toast notification system with reducer pattern.

```typescript
import { useToast } from '@client/hooks';

function MyComponent() {
  const { toast, dismiss, toasts } = useToast();

  const handleClick = () => {
    toast({
      title: 'Success',
      description: 'Operation completed successfully',
      variant: 'success',
    });
  };

  return (
    <div>
      <button onClick={handleClick}>Show Toast</button>
      {toasts.map(t => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}
```

### useErrorRecovery
Intelligent error recovery with configurable strategies.

```typescript
import { useErrorRecovery } from '@client/hooks';

function DataComponent() {
  const { recover, recoveryState } = useErrorRecovery('data-fetch');

  const fetchData = async () => {
    try {
      const data = await api.getData();
      return data;
    } catch (error) {
      const recovered = await recover();
      if (!recovered) {
        throw error;
      }
    }
  };

  return <div>...</div>;
}
```

### useOfflineDetection
Comprehensive offline detection with connection quality assessment.

```typescript
import { useOfflineDetection } from '@client/hooks';

function NetworkStatus() {
  const { isOnline, connectionQuality, checkConnection } = useOfflineDetection();

  return (
    <div>
      <span>Status: {isOnline ? 'Online' : 'Offline'}</span>
      <span>Quality: {connectionQuality.type}</span>
      <button onClick={checkConnection}>Check Connection</button>
    </div>
  );
}
```

### useSystem
System-level information and health monitoring.

```typescript
import { useSystem } from '@client/hooks';

function SystemMonitor() {
  const { health, stats, checkHealth } = useSystem();

  useEffect(() => {
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div>
      <span>Health: {health.isHealthy ? 'Good' : 'Warning'}</span>
      <span>Memory: {stats.memory.percentage.toFixed(2)}%</span>
    </div>
  );
}
```

## Error Handling

### useErrorHandler
Unified error handling across all hooks.

```typescript
import { useErrorHandler } from '@client/hooks';

function ErrorHandlingExample() {
  const { handle, retry, recover } = useErrorHandler();

  const riskyOperation = async () => {
    try {
      const result = await retry(async () => {
        return await api.riskyCall();
      }, 3);
      return result;
    } catch (error) {
      handle(error, 'riskyOperation');
      const recovered = await recover(error, 'riskyOperation');
      if (!recovered) {
        throw error;
      }
    }
  };

  return <div>...</div>;
}
```

### Error Recovery Strategies
Customizable recovery strategies for different error types.

```typescript
const customStrategy: ErrorRecoveryStrategy = {
  id: 'custom-recovery',
  condition: (error) => error.message.includes('timeout'),
  action: async () => {
    // Custom recovery logic
    return true;
  },
  description: 'Custom timeout recovery',
  priority: 1,
  maxAttempts: 2,
};

const { addStrategy } = useErrorHandler([customStrategy]);
```

## Performance Optimization

### usePerformanceMonitor
Built-in performance monitoring for hooks.

```typescript
import { usePerformanceMonitor } from '@client/hooks';

function PerformanceExample() {
  const { start, end, getMetrics } = usePerformanceMonitor('expensive-operation');

  const expensiveOperation = async () => {
    start();
    // Expensive computation
    const result = await heavyComputation();
    end();
    
    const metrics = getMetrics();
    console.log(`Operation took ${metrics.duration}ms`);
    
    return result;
  };

  return <div>...</div>;
}
```

### useDebouncedCallback
Debounced callbacks for performance optimization.

```typescript
import { useDebouncedCallback } from '@client/hooks';

function SearchComponent() {
  const debouncedSearch = useDebouncedCallback(
    async (query: string) => {
      const results = await searchAPI(query);
      setResults(results);
    },
    300 // 300ms delay
  );

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### useCachedValue
Intelligent caching with TTL and size limits.

```typescript
import { useCachedValue } from '@client/hooks';

function DataComponent() {
  const { value: expensiveData } = useCachedValue(
    'expensive-computation',
    () => {
      return heavyComputation();
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 50,        // Max 50 cached items
    }
  );

  return <div>{expensiveData}</div>;
}
```

## Hook Patterns

### Reducer Pattern
For complex state management with predictable transitions.

```typescript
import { useExampleReducer } from '@client/hooks/patterns';

function ReducerExample() {
  const { state, actions } = useExampleReducer();

  return (
    <div>
      <button onClick={() => actions.setLoading(true)}>Load</button>
      <button onClick={() => actions.setData([])}>Clear</button>
      {state.loading && <Spinner />}
    </div>
  );
}
```

### Callback Pattern
For performance optimization through memoization.

```typescript
import { useExampleCallback } from '@client/hooks/patterns';

function CallbackExample() {
  const { result, callbacks } = useExampleCallback({
    data: [],
    filters: {},
    options: { debounce: 300 },
  });

  return <div>{result.processedData.length}</div>;
}
```

### Effect Pattern
For side effects and resource management.

```typescript
import { useExampleEffect } from '@client/hooks/patterns';

function EffectExample() {
  const { state, utilities } = useExampleEffect({
    enabled: true,
    dependencies: [],
  });

  return <div>Status: {state.isRunning ? 'Running' : 'Idle'}</div>;
}
```

### Strategy Pattern
For configurable behavior through multiple algorithms.

```typescript
import { useStrategyManager } from '@client/hooks/patterns';

function StrategyExample() {
  const strategies = [
    {
      id: 'fast',
      condition: (context) => context.data.length < 1000,
      action: async (context) => fastAlgorithm(context),
      priority: 1,
      maxAttempts: 1,
    },
    {
      id: 'slow',
      condition: () => true,
      action: async (context) => slowAlgorithm(context),
      priority: 2,
      maxAttempts: 1,
    },
  ];

  const { executeStrategy } = useStrategyManager(strategies);

  const handleProcess = async () => {
    const result = await executeStrategy({ data: [], metadata: {} });
    return result;
  };

  return <button onClick={handleProcess}>Process</button>;
}
```

## Usage Examples

### Basic Hook Usage
```typescript
import { useToast, useErrorHandler } from '@client/hooks';

function BasicExample() {
  const { toast } = useToast();
  const { handle } = useErrorHandler();

  const handleClick = async () => {
    try {
      await someOperation();
      toast({ title: 'Success', description: 'Operation completed' });
    } catch (error) {
      handle(error, 'handleClick');
      toast({ title: 'Error', description: 'Operation failed', variant: 'error' });
    }
  };

  return <button onClick={handleClick}>Execute</button>;
}
```

### Advanced Error Recovery
```typescript
import { useErrorRecovery, useErrorHandler } from '@client/hooks';

function AdvancedExample() {
  const { recover } = useErrorRecovery('data-sync');
  const { retry } = useErrorHandler();

  const syncData = async () => {
    try {
      await retry(async () => {
        return await api.syncData();
      }, 3);
    } catch (error) {
      const recovered = await recover();
      if (!recovered) {
        // Fallback to local data
        return getLocalData();
      }
    }
  };

  return <button onClick={syncData}>Sync Data</button>;
}
```

### Performance Monitoring
```typescript
import { usePerformanceMonitor, useDebouncedCallback } from '@client/hooks';

function PerformanceExample() {
  const { start, end } = usePerformanceMonitor('search-operation');

  const debouncedSearch = useDebouncedCallback(
    async (query: string) => {
      start();
      const results = await searchAPI(query);
      end();
      return results;
    },
    300
  );

  return <SearchInput onSearch={debouncedSearch} />;
}
```

## Migration Guide

### From Legacy Hooks
```typescript
// Before (legacy)
import { useToast } from '../shared/hooks';

// After (standardized)
import { useToast } from '@client/hooks';

// Or for backward compatibility during migration
import { useToastShared } from '@client/hooks';
```

### From Custom Error Handling
```typescript
// Before (custom error handling)
try {
  await operation();
} catch (error) {
  console.error(error);
  // Custom recovery logic
}

// After (unified error handling)
const { handle, retry } = useErrorHandler();
const result = await retry(operation, 3);
```

### From Manual Performance Optimization
```typescript
// Before (manual optimization)
let timeoutId: NodeJS.Timeout;
const debouncedFn = (callback: () => void) => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(callback, 300);
};

// After (built-in optimization)
const debouncedFn = useDebouncedCallback(callback, 300);
```

## Best Practices

### 1. Error Handling
- Always use `useErrorHandler` for consistent error handling
- Implement appropriate recovery strategies
- Log errors with context for debugging
- Provide user-friendly error messages

### 2. Performance Optimization
- Use `useDebouncedCallback` for user input handling
- Implement caching with `useCachedValue` for expensive computations
- Monitor performance with `usePerformanceMonitor`
- Clean up resources in effects

### 3. State Management
- Use reducer pattern for complex state
- Keep state minimal and focused
- Use memoization for expensive calculations
- Avoid state mutations

### 4. Testing
- Test all error scenarios
- Include performance tests for critical paths
- Test memory management and cleanup
- Verify backward compatibility

### 5. TypeScript Usage
- Always provide explicit types
- Use utility types for complex interfaces
- Leverage type inference where appropriate
- Document all public APIs

## Testing

### Test Structure
```
client/src/hooks/__tests__/
├── unit/                    # Unit tests for individual hooks
│   ├── use-toast.test.ts
│   ├── use-error-recovery.test.ts
│   └── ...
├── integration/             # Integration tests for hook interactions
│   ├── error-handling.test.ts
│   └── performance.test.ts
└── performance/             # Performance and memory tests
    ├── memory-leaks.test.ts
    └── render-performance.test.ts
```

### Running Tests
```bash
# Run all hook tests
npm test -- hooks

# Run specific hook tests
npm test -- hooks/__tests__/unit/use-toast.test.ts

# Run with coverage
npm test -- --coverage

# Run performance tests
npm test -- hooks/__tests__/performance/
```

### Test Coverage Requirements
- **Minimum Coverage**: 90%
- **Critical Paths**: 100%
- **Error Scenarios**: 100%
- **Performance Tests**: Required for performance-critical hooks

## Support

For questions, issues, or contributions:

1. Check the [migration guide](#migration-guide) for common issues
2. Review [best practices](#best-practices) for implementation guidance
3. Refer to [usage examples](#usage-examples) for common patterns
4. Create an issue for bugs or feature requests

## Contributing

When contributing to the hooks architecture:

1. Follow the established patterns and conventions
2. Add comprehensive tests for new functionality
3. Update documentation for any API changes
4. Ensure backward compatibility is maintained
5. Run the full test suite before submitting changes

---

**Last Updated**: January 7, 2026  
**Version**: 1.0.0  
**Maintainer**: Kilo Code Architecture Team
