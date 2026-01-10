/**
 * Render Tracking Usage Examples
 *
 * This file demonstrates how to integrate the extended logger
 * render tracking capabilities into React components.
 */

import { useState, useEffect, useCallback } from 'react';
import React from 'react';

import { logger } from '@client/shared/utils/logger';

import {
  useRenderTracker,
  withRenderTracking,
  usePerformanceMeasurement,
} from '../features/analytics/hooks/use-render-tracker';

// Example 1: Manual render tracking in a component
export function ManualRenderTrackingExample() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any[]>([]);

  const renderTracker = useRenderTracker({
    componentName: 'ManualRenderTrackingExample',
    trackProps: true,
    trackState: true,
    performanceThreshold: 10, // Warn if render takes > 10ms
    infiniteRenderThreshold: 30, // Alert if > 30 renders/second
  });

  const measurePerformance = usePerformanceMeasurement('ManualRenderTrackingExample');

  // Track specific render triggers
  const handleIncrement = useCallback(() => {
    renderTracker.trackRender('button-click', {
      action: 'increment',
      previousCount: count,
    });
    setCount(prev => prev + 1);
  }, [count, renderTracker]);

  const handleDataLoad = useCallback(() => {
    measurePerformance('data-load', async () => {
      // Simulate expensive data loading
      const newData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: Math.random(),
      }));

      setData(newData);
      renderTracker.trackRender('data-loaded', {
        dataLength: newData.length,
      });
    });
  }, [measurePerformance, renderTracker]);

  // Example of tracking performance for expensive operations
  const expensiveCalculation = useCallback(() => {
    measurePerformance('expensive-calculation', () => {
      // Simulate expensive calculation
      let result = 0;
      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i);
      }
      console.log('Calculation result:', result);
    });
  }, [measurePerformance]);

  return (
    <div>
      <h3>Manual Render Tracking Example</h3>
      <p>Count: {count}</p>
      <p>Data items: {data.length}</p>

      <button type="button" onClick={handleIncrement}>
        Increment Count
      </button>

      <button type="button" onClick={handleDataLoad}>
        Load Data
      </button>

      <button
        onClick={() => {
          const result = expensiveCalculation();
          console.log('Calculation result:', result);
        }}
      >
        Run Expensive Calculation
      </button>

      <div>
        <h4>Render Stats:</h4>
        <pre>{JSON.stringify(renderTracker.getRenderStats(), null, 2)}</pre>

        <button type="button" onClick={renderTracker.clearStats}>
          Clear Stats
        </button>
      </div>
    </div>
  );
}

// Example 2: Component with HOC render tracking
const SimpleCounter = ({ initialValue = 0 }: { initialValue?: number }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <h3>HOC Tracked Counter</h3>
      <p>Value: {value}</p>
      <button type="button" onClick={() => setValue(v => v + 1)}>
        Increment
      </button>
      <button type="button" onClick={() => setValue(v => v - 1)}>
        Decrement
      </button>
    </div>
  );
};

// Wrap with render tracking HOC
export const TrackedCounter = withRenderTracking(SimpleCounter, 'TrackedCounter');

// Example 3: Component that demonstrates infinite render detection
export function InfiniteRenderExample() {
  const [triggerInfinite, setTriggerInfinite] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  const renderTracker = useRenderTracker({
    componentName: 'InfiniteRenderExample',
    infiniteRenderThreshold: 10, // Low threshold for demo
  });

  // This will cause infinite renders when triggerInfinite is true
  useEffect(() => {
    if (triggerInfinite) {
      setRenderCount(prev => prev + 1);
      renderTracker.trackRender('infinite-loop-trigger', { renderCount });
    }
  }, [renderCount, triggerInfinite, renderTracker]);

  return (
    <div>
      <h3>Infinite Render Detection Example</h3>
      <p>Render Count: {renderCount}</p>
      <p>Trigger Infinite: {triggerInfinite ? 'ON' : 'OFF'}</p>

      <button
        onClick={() => setTriggerInfinite(!triggerInfinite)}
        style={{
          backgroundColor: triggerInfinite ? 'red' : 'green',
          color: 'white',
        }}
      >
        {triggerInfinite ? 'Stop' : 'Start'} Infinite Renders
      </button>

      <div>
        <h4>Render Stats:</h4>
        <pre>{JSON.stringify(renderTracker.getRenderStats(), null, 2)}</pre>
      </div>
    </div>
  );
}

// Example 4: Performance monitoring dashboard
export function RenderTrackingDashboard() {
  const [allStats, setAllStats] = useState<any>({});
  const [selectedComponent, setSelectedComponent] = useState<string>('');

  const refreshStats = useCallback(() => {
    // Get stats for all components
    const globalStats = logger.getRenderStats();
    setAllStats(globalStats);
  }, []);

  const clearAllStats = useCallback(() => {
    logger.clearRenderStats();
    setAllStats({});
  }, []);

  const clearComponentStats = useCallback(() => {
    if (selectedComponent) {
      logger.clearRenderStats(selectedComponent);
      refreshStats();
    }
  }, [selectedComponent, refreshStats]);

  useEffect(() => {
    // Refresh stats every 2 seconds
    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return (
    <div>
      <h3>Render Tracking Dashboard</h3>

      <div style={{ marginBottom: '20px' }}>
        <button type="button" onClick={refreshStats}>
          Refresh Stats
        </button>
        <button type="button" onClick={clearAllStats} style={{ marginLeft: '10px' }}>
          Clear All Stats
        </button>
      </div>

      <div>
        <h4>Global Statistics:</h4>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px' }}>
          {JSON.stringify(allStats, null, 2)}
        </pre>
      </div>

      <div>
        <h4>Component-Specific Stats:</h4>
        <input
          type="text"
          placeholder="Enter component name"
          value={selectedComponent}
          onChange={e => setSelectedComponent(e.target.value)}
        />
        <button type="button" onClick={clearComponentStats} style={{ marginLeft: '10px' }}>
          Clear Component Stats
        </button>

        {selectedComponent && (
          <pre style={{ backgroundColor: '#f0f8ff', padding: '10px' }}>
            {JSON.stringify(logger.getRenderStats(selectedComponent), null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// Example 5: Integration with existing AppLayout component
export function IntegrateWithAppLayout() {
  return (
    <div>
      <h3>Integration Instructions</h3>
      <div
        style={{
          backgroundColor: '#f9f9f9',
          padding: '15px',
          borderRadius: '5px',
        }}
      >
        <h4>To integrate render tracking with existing components:</h4>

        <h5>1. Add to AppLayout component:</h5>
        <pre style={{ backgroundColor: '#fff', padding: '10px' }}>
          {`import { useRenderTracker } from '@client/features/analytics/hooks/use-render-tracker';

function AppLayout() {
  const renderTracker = useRenderTracker({
    componentName: 'AppLayout',
    trackProps: true,
    performanceThreshold: 16
  });

  // Track specific render triggers
  useEffect(() => {
    renderTracker.trackRender('navigation-change', { path: location.pathname });
  }, [location.pathname]);

  // Rest of component...
}`}
        </pre>

        <h5>2. Add to WebSocket components:</h5>
        <pre style={{ backgroundColor: '#fff', padding: '10px' }}>
          {`import { logger } from '@client/shared/utils/logger';

function WebSocketClient() {
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

  // Track connection events
  const handleConnect = () => {
    logger.trackRender({
      component: 'WebSocketClient',
      renderCount: renderCountRef.current++,
      timestamp: Date.now(),
      trigger: 'websocket-connect'
    });
  };
}`}
        </pre>

        <h5>3. Monitor for infinite renders:</h5>
        <pre style={{ backgroundColor: '#fff', padding: '10px' }}>
          {`// In development, check for infinite renders periodically
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = logger.getRenderStats();
    if (stats.infiniteRenderAlerts > 0) {
      console.warn('Infinite render alerts detected:', stats);
    }
  }, 5000);
}`}
        </pre>
      </div>
    </div>
  );
}

// Main demo component
export function RenderTrackingDemo() {
  const [activeExample, setActiveExample] = useState<string>('manual');

  const examples = {
    manual: ManualRenderTrackingExample,
    hoc: TrackedCounter,
    infinite: InfiniteRenderExample,
    dashboard: RenderTrackingDashboard,
    integration: IntegrateWithAppLayout,
  };

  const ActiveComponent = examples[activeExample as keyof typeof examples];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Render Tracking Examples</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Select Example:</h3>
        {Object.keys(examples).map(key => (
          <button
            key={key}
            onClick={() => setActiveExample(key)}
            style={{
              margin: '5px',
              padding: '10px',
              backgroundColor: activeExample === key ? '#007bff' : '#f8f9fa',
              color: activeExample === key ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '5px',
        }}
      >
        <ActiveComponent />
      </div>
    </div>
  );
}
