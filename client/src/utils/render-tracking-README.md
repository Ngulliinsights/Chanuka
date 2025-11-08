# Render Tracking System

This document describes the extended browser-logger render tracking capabilities implemented to diagnose and prevent race conditions and infinite render loops in React components.

## Overview

The render tracking system extends the existing browser-logger with comprehensive monitoring capabilities for:

- **Render Cycle Tracking**: Monitor component render frequency and patterns
- **Infinite Render Detection**: Automatically detect components rendering >50 times per second
- **Component Lifecycle Logging**: Track mount/unmount cycles and state changes
- **Performance Impact Measurement**: Monitor render duration and memory usage

## Features

### 1. Render Cycle Tracking

```typescript
import { logger } from '../utils/browser-logger';

// Track a component render
logger.trackRender({
  component: 'MyComponent',
  renderCount: 1,
  timestamp: Date.now(),
  trigger: 'props-change',
  props: { id: 1 },
  state: { count: 5 }
});
```

### 2. Infinite Render Detection

The system automatically detects when a component renders more than 50 times per second (configurable):

```typescript
// Check for infinite renders (returns true if detected)
const hasInfiniteRender = logger.detectInfiniteRender('MyComponent', 30); // custom threshold

// Automatic detection happens during trackRender calls
// Logs error with details when infinite render is detected
```

### 3. Component Lifecycle Tracking

```typescript
// Track component mount
logger.trackLifecycle({
  component: 'MyComponent',
  action: 'mount',
  timestamp: Date.now(),
  props: { initialData: [] }
});

// Track component unmount
logger.trackLifecycle({
  component: 'MyComponent',
  action: 'unmount',
  timestamp: Date.now()
});
```

### 4. Performance Impact Measurement

```typescript
// Track render performance
logger.trackPerformanceImpact({
  component: 'MyComponent',
  renderDuration: 15.5, // milliseconds
  timestamp: Date.now(),
  memoryUsage: 1024 * 1024 * 10 // bytes
});

// Automatically warns if render duration > 16ms (1 frame at 60fps)
```

### 5. Statistics and Monitoring

```typescript
// Get stats for specific component
const componentStats = logger.getRenderStats('MyComponent');
console.log(componentStats);
// {
//   totalRenders: 25,
//   averageRenderTime: 8.5,
//   lastRenderTime: 1699123456789,
//   infiniteRenderAlerts: 2,
//   mountCount: 1,
//   unmountCount: 0
// }

// Get aggregated stats for all components
const globalStats = logger.getRenderStats();

// Clear stats
logger.clearRenderStats('MyComponent'); // specific component
logger.clearRenderStats(); // all components
```

## React Integration

### Using the Hook

```typescript
import { useRenderTracker } from '../hooks/use-render-tracker';

function MyComponent() {
  const renderTracker = useRenderTracker({
    componentName: 'MyComponent',
    trackProps: true,
    trackState: true,
    performanceThreshold: 16, // warn if render > 16ms
    infiniteRenderThreshold: 50 // alert if > 50 renders/second
  });

  const handleClick = () => {
    renderTracker.trackRender('button-click', { 
      action: 'increment' 
    });
    // ... handle click
  };

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <pre>{JSON.stringify(renderTracker.getRenderStats(), null, 2)}</pre>
    </div>
  );
}
```

### Using the HOC

```typescript
import { withRenderTracking } from '../hooks/use-render-tracker';

const MyComponent = ({ count }) => (
  <div>Count: {count}</div>
);

// Automatically tracks renders with props changes
export default withRenderTracking(MyComponent, 'MyComponent');
```

### Performance Measurement Hook

```typescript
import { usePerformanceMeasurement } from '../hooks/use-render-tracker';

function MyComponent() {
  const measurePerformance = usePerformanceMeasurement('MyComponent');

  const expensiveOperation = () => {
    measurePerformance('data-processing', () => {
      // Expensive operation here
      processLargeDataset();
    });
  };

  const asyncOperation = async () => {
    await measurePerformance('api-call', async () => {
      const data = await fetchData();
      return data;
    });
  };

  return <div>...</div>;
}
```

## Integration with Existing Components

### AppLayout Component

```typescript
// Add to existing AppLayout component
import { useRenderTracker } from '../hooks/use-render-tracker';

function AppLayout() {
  const renderTracker = useRenderTracker({
    componentName: 'AppLayout',
    trackProps: true,
    performanceThreshold: 16
  });

  // Track navigation changes
  useEffect(() => {
    renderTracker.trackRender('navigation-change', { 
      path: location.pathname 
    });
  }, [location.pathname, renderTracker]);

  // Track responsive breakpoint changes
  useEffect(() => {
    renderTracker.trackRender('breakpoint-change', { 
      isMobile, 
      isTablet, 
      isDesktop 
    });
  }, [isMobile, isTablet, isDesktop, renderTracker]);

  // Rest of component...
}
```

### WebSocket Components

```typescript
import { logger } from '../utils/browser-logger';

function WebSocketClient() {
  const renderCountRef = useRef(0);

  useEffect(() => {
    logger.trackLifecycle({
      component: 'WebSocketClient',
      action: 'mount',
      timestamp: Date.now()
    });

    return () => {
      logger.trackLifecycle({
        component: 'WebSocketClient',
        action: 'unmount',
        timestamp: Date.now()
      });
    };
  }, []);

  const handleConnect = useCallback(() => {
    renderCountRef.current++;
    logger.trackRender({
      component: 'WebSocketClient',
      renderCount: renderCountRef.current,
      timestamp: Date.now(),
      trigger: 'websocket-connect'
    });
  }, []);

  const handleMessage = useCallback((message) => {
    renderCountRef.current++;
    logger.trackRender({
      component: 'WebSocketClient',
      renderCount: renderCountRef.current,
      timestamp: Date.now(),
      trigger: 'websocket-message',
      props: { messageType: message.type }
    });
  }, []);

  // Rest of component...
}
```

## Development Monitoring

### Automatic Monitoring Setup

```typescript
// Add to main App component or index.tsx
if (process.env.NODE_ENV === 'development') {
  // Monitor for infinite renders every 5 seconds
  setInterval(() => {
    const stats = logger.getRenderStats();
    if (stats.infiniteRenderAlerts > 0) {
      console.warn('🚨 Infinite render alerts detected:', stats);
    }
    
    // Log components with high render counts
    if (stats.totalRenders > 100) {
      console.info('📊 High render activity:', stats);
    }
  }, 5000);

  // Log render stats on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.info('📈 Render stats before tab hidden:', logger.getRenderStats());
    }
  });
}
```

### Dashboard Component

```typescript
import { RenderTrackingDashboard } from '../examples/render-tracking-usage';

// Add to development tools or admin panel
function DevTools() {
  return (
    <div>
      <h2>Development Tools</h2>
      <RenderTrackingDashboard />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Enable detailed render tracking in development
REACT_APP_ENABLE_RENDER_TRACKING=true

# Set custom thresholds
REACT_APP_INFINITE_RENDER_THRESHOLD=50
REACT_APP_SLOW_RENDER_THRESHOLD=16
```

### Runtime Configuration

```typescript
// Configure global thresholds
const RENDER_CONFIG = {
  infiniteRenderThreshold: process.env.NODE_ENV === 'development' ? 30 : 50,
  performanceThreshold: 16, // 1 frame at 60fps
  enableDetailedLogging: process.env.NODE_ENV === 'development',
  maxHistorySize: 1000 // prevent memory leaks
};
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: The system limits history to 1000 entries per component to prevent memory leaks. Use `clearRenderStats()` periodically in long-running applications.

2. **False Positive Infinite Renders**: Adjust the threshold based on your component's expected behavior. Some components legitimately render frequently.

3. **Performance Impact**: The tracking system is lightweight but adds small overhead. Disable in production or use sampling.

### Debugging Tips

```typescript
// Check if a component is causing issues
const problematicComponents = Object.entries(logger.getRenderStats())
  .filter(([_, stats]) => stats.infiniteRenderAlerts > 0)
  .map(([component]) => component);

console.log('Components with infinite render issues:', problematicComponents);

// Monitor render frequency
const highFrequencyComponents = Object.entries(logger.getRenderStats())
  .filter(([_, stats]) => stats.totalRenders > 50)
  .sort(([_, a], [__, b]) => b.totalRenders - a.totalRenders);

console.log('High frequency components:', highFrequencyComponents);
```

## Best Practices

1. **Use Descriptive Trigger Names**: Make it easy to identify what caused a render
2. **Track Props Selectively**: Only track props in development to avoid performance impact
3. **Set Appropriate Thresholds**: Adjust based on component complexity and expected behavior
4. **Regular Cleanup**: Clear stats periodically to prevent memory buildup
5. **Monitor in Development**: Use the dashboard and automatic monitoring during development
6. **Gradual Rollout**: Start with critical components and expand coverage

## Performance Considerations

- **Development Only**: Consider enabling detailed tracking only in development
- **Sampling**: For high-frequency components, consider sampling (track every Nth render)
- **Memory Management**: The system automatically limits history size to prevent memory leaks
- **Minimal Overhead**: Core tracking adds <1ms overhead per render in most cases

## Integration Checklist

- [ ] Add render tracking to AppLayout component
- [ ] Integrate with WebSocket components
- [ ] Add to navigation-related components
- [ ] Set up development monitoring
- [ ] Configure appropriate thresholds
- [ ] Add dashboard to development tools
- [ ] Test infinite render detection
- [ ] Verify performance impact is acceptable
- [ ] Document component-specific tracking needs
- [ ] Set up automated alerts for production (if enabled)