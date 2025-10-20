# Loading Component Configuration

## Overview

This document describes the configuration options for the loading component system, following the standardized patterns established by the navigation component.

## Configuration Structure

### Validation Settings

```typescript
validation: {
  enabled: boolean;        // Enable/disable validation
  strict: boolean;         // Use strict validation mode
  validateProgress: boolean; // Validate progress values
}
```

**Default Values:**
- `enabled`: `true`
- `strict`: `false`
- `validateProgress`: `true`

**Description:**
- `enabled`: When true, all loading operations will be validated against their schemas
- `strict`: When true, validation errors will throw exceptions instead of logging warnings
- `validateProgress`: When true, progress values will be validated to ensure they're within 0-100 range

### Error Handling Settings

```typescript
errorHandling: {
  enableRecovery: boolean;     // Enable automatic error recovery
  maxRetries: number;          // Maximum retry attempts (0-10)
  retryDelay: number;          // Base delay between retries in ms (100-30000)
  fallbackComponent?: React.ComponentType; // Fallback component for errors
}
```

**Default Values:**
- `enableRecovery`: `true`
- `maxRetries`: `3`
- `retryDelay`: `3000`
- `fallbackComponent`: `undefined`

**Description:**
- `enableRecovery`: Enables automatic recovery strategies for failed operations
- `maxRetries`: Maximum number of retry attempts before giving up
- `retryDelay`: Base delay in milliseconds between retry attempts (uses exponential backoff)
- `fallbackComponent`: Optional React component to render when loading fails

### Performance Settings

```typescript
performance: {
  enableMemoization: boolean;      // Enable React.memo optimizations
  debounceMs: number;              // Debounce delay for rapid updates (0-5000)
  maxConcurrentOperations: number; // Maximum concurrent loading operations (1-20)
}
```

**Default Values:**
- `enableMemoization`: `true`
- `debounceMs`: `300`
- `maxConcurrentOperations`: `5`

**Description:**
- `enableMemoization`: Enables React.memo for loading components to prevent unnecessary re-renders
- `debounceMs`: Debounce delay for rapid state updates to improve performance
- `maxConcurrentOperations`: Maximum number of loading operations that can run simultaneously

### Display Settings

```typescript
display: {
  autoHide: boolean;           // Auto-hide loading indicators when complete
  autoHideDelay: number;       // Delay before auto-hiding (1000-60000)
  showProgress: boolean;       // Show progress bars/indicators
  showDetails: boolean;        // Show detailed loading information
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}
```

**Default Values:**
- `autoHide`: `true`
- `autoHideDelay`: `3000`
- `showProgress`: `true`
- `showDetails`: `false`
- `position`: `'top-right'`

**Description:**
- `autoHide`: Automatically hide loading indicators after successful completion
- `autoHideDelay`: Time in milliseconds to wait before auto-hiding
- `showProgress`: Display progress bars and percentage indicators
- `showDetails`: Show detailed information like operation IDs, retry counts, etc.
- `position`: Default position for global loading indicators

## Usage Examples

### Basic Configuration

```typescript
import { LoadingConfig } from '@/components/loading/types';

const basicConfig: LoadingConfig = {
  validation: {
    enabled: true,
    strict: false,
    validateProgress: true,
  },
  errorHandling: {
    enableRecovery: true,
    maxRetries: 3,
    retryDelay: 3000,
  },
  performance: {
    enableMemoization: true,
    debounceMs: 300,
    maxConcurrentOperations: 5,
  },
  display: {
    autoHide: true,
    autoHideDelay: 3000,
    showProgress: true,
    showDetails: false,
    position: 'top-right',
  },
};
```

### Development Configuration

```typescript
const devConfig: LoadingConfig = {
  validation: {
    enabled: true,
    strict: true,  // Strict validation in development
    validateProgress: true,
  },
  errorHandling: {
    enableRecovery: true,
    maxRetries: 1,  // Fewer retries for faster feedback
    retryDelay: 1000,
  },
  performance: {
    enableMemoization: false,  // Disable for easier debugging
    debounceMs: 0,  // No debouncing for immediate feedback
    maxConcurrentOperations: 10,
  },
  display: {
    autoHide: false,  // Keep indicators visible for debugging
    autoHideDelay: 10000,
    showProgress: true,
    showDetails: true,  // Show detailed information
    position: 'top-right',
  },
};
```

### Production Configuration

```typescript
const prodConfig: LoadingConfig = {
  validation: {
    enabled: true,
    strict: false,  // Non-strict for better user experience
    validateProgress: true,
  },
  errorHandling: {
    enableRecovery: true,
    maxRetries: 5,  // More retries for reliability
    retryDelay: 2000,
  },
  performance: {
    enableMemoization: true,  // Optimize performance
    debounceMs: 500,  // Higher debounce for better performance
    maxConcurrentOperations: 3,  // Conservative limit
  },
  display: {
    autoHide: true,
    autoHideDelay: 2000,  // Faster auto-hide
    showProgress: true,
    showDetails: false,  // Hide details for cleaner UI
    position: 'top-right',
  },
};
```

### Mobile Configuration

```typescript
const mobileConfig: LoadingConfig = {
  validation: {
    enabled: true,
    strict: false,
    validateProgress: true,
  },
  errorHandling: {
    enableRecovery: true,
    maxRetries: 3,
    retryDelay: 5000,  // Longer delays for mobile networks
  },
  performance: {
    enableMemoization: true,
    debounceMs: 500,  // Higher debounce for touch interactions
    maxConcurrentOperations: 2,  // Lower limit for mobile
  },
  display: {
    autoHide: true,
    autoHideDelay: 4000,  // Longer display time
    showProgress: true,
    showDetails: false,
    position: 'center',  // Center position for mobile
  },
};
```

## Environment-Specific Configuration

The loading system can automatically adapt its configuration based on the environment:

```typescript
import { DEFAULT_LOADING_CONFIG } from '@/components/loading/constants';

function getEnvironmentConfig(): LoadingConfig {
  const baseConfig = { ...DEFAULT_LOADING_CONFIG };
  
  if (process.env.NODE_ENV === 'development') {
    return {
      ...baseConfig,
      validation: { ...baseConfig.validation, strict: true },
      display: { ...baseConfig.display, showDetails: true, autoHide: false },
    };
  }
  
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseConfig,
      performance: { ...baseConfig.performance, maxConcurrentOperations: 3 },
      display: { ...baseConfig.display, autoHideDelay: 2000 },
    };
  }
  
  return baseConfig;
}
```

## Configuration Validation

All configuration objects are validated using Zod schemas to ensure type safety and prevent runtime errors:

```typescript
import { validateLoadingConfig } from '@/components/loading/validation';

try {
  const validConfig = validateLoadingConfig(userConfig);
  // Use validConfig
} catch (error) {
  console.error('Invalid loading configuration:', error.message);
  // Fall back to default configuration
}
```

## Best Practices

1. **Environment-Specific Settings**: Use different configurations for development, testing, and production
2. **Performance Tuning**: Adjust `maxConcurrentOperations` and `debounceMs` based on your application's needs
3. **User Experience**: Set appropriate `autoHideDelay` values based on your loading times
4. **Error Handling**: Enable recovery in production but consider disabling it during development for easier debugging
5. **Validation**: Use strict validation during development and testing, but consider relaxing it in production
6. **Mobile Optimization**: Use mobile-specific configurations for better performance on mobile devices

## Configuration Updates

Configuration can be updated at runtime using the loading context:

```typescript
import { useLoadingContext } from '@/components/loading/hooks';

function MyComponent() {
  const { updateConfig } = useLoadingContext();
  
  const handleConfigUpdate = () => {
    updateConfig({
      display: {
        showDetails: true,
        position: 'center',
      },
    });
  };
  
  return <button onClick={handleConfigUpdate}>Show Details</button>;
}
```