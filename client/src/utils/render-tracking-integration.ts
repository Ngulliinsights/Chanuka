/**
 * Render Tracking Integration Utilities
 * 
 * Simple utilities to integrate render tracking into existing components
 * without requiring JSX compilation for the examples.
 */

import { logger } from './logger';

// Integration helper for existing components
export class RenderTrackingIntegration {
  private static componentCounters = new Map<string, number>();

  /**
   * Add render tracking to an existing component's useEffect
   */
  static trackComponentRender(
    componentName: string, 
    trigger: string = 'component-render',
    additionalData?: any
  ): void {
    const currentCount = this.componentCounters.get(componentName) || 0;
    const newCount = currentCount + 1;
    this.componentCounters.set(componentName, newCount);

    logger.trackRender({
      component: componentName,
      renderCount: newCount,
      timestamp: Date.now(),
      trigger,
      ...additionalData
    });

    // Check for infinite renders
    logger.detectInfiniteRender(componentName);
  }

  /**
   * Track component lifecycle events
   */
  static trackComponentLifecycle(
    componentName: string,
    action: 'mount' | 'unmount' | 'update',
    additionalData?: any
  ): void {
    logger.trackLifecycle({
      component: componentName,
      action,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  /**
   * Measure and track performance of a function
   */
  static measurePerformance<T>(
    componentName: string,
    operationName: string,
    operation: () => T
  ): T {
    const start = performance.now();
    
    try {
      const result = operation();
      const end = performance.now();
      const duration = end - start;
      
      logger.trackPerformanceImpact({
        component: `${componentName}.${operationName}`,
        renderDuration: duration,
        timestamp: Date.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      });

      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      logger.trackPerformanceImpact({
        component: `${componentName}.${operationName}`,
        renderDuration: duration,
        timestamp: Date.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      });

      throw error;
    }
  }

  /**
   * Measure and track performance of an async function
   */
  static async measureAsyncPerformance<T>(
    componentName: string,
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const end = performance.now();
      const duration = end - start;
      
      logger.trackPerformanceImpact({
        component: `${componentName}.${operationName}`,
        renderDuration: duration,
        timestamp: Date.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      });

      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      logger.trackPerformanceImpact({
        component: `${componentName}.${operationName}`,
        renderDuration: duration,
        timestamp: Date.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      });

      throw error;
    }
  }

  /**
   * Get render statistics for a component
   */
  static getComponentStats(componentName?: string) {
    return logger.getRenderStats(componentName);
  }

  /**
   * Clear render statistics
   */
  static clearStats(componentName?: string): void {
    logger.clearRenderStats(componentName);
    if (componentName) {
      this.componentCounters.delete(componentName);
    } else {
      this.componentCounters.clear();
    }
  }

  /**
   * Setup development monitoring
   */
  static setupDevelopmentMonitoring(): (() => void) | void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Monitor for infinite renders every 5 seconds
    const monitoringInterval = setInterval(() => {
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
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.info('📈 Render stats before tab hidden:', logger.getRenderStats());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function (can be called manually if needed)
    return () => {
      clearInterval(monitoringInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  /**
   * Generate a summary report of render tracking data
   */
  static generateReport(): string {
    const stats = logger.getRenderStats();
    
    const report = `
# Render Tracking Report
Generated: ${new Date().toISOString()}

## Summary
- Total Renders: ${stats.totalRenders}
- Average Render Time: ${stats.averageRenderTime.toFixed(2)}ms
- Infinite Render Alerts: ${stats.infiniteRenderAlerts}
- Component Mounts: ${stats.mountCount}
- Component Unmounts: ${stats.unmountCount}

## Performance Analysis
${stats.averageRenderTime > 16 ? '⚠️ Average render time exceeds 16ms (1 frame at 60fps)' : '✅ Average render time is acceptable'}
${stats.infiniteRenderAlerts > 0 ? '🚨 Infinite render loops detected!' : '✅ No infinite render loops detected'}

## Recommendations
${stats.averageRenderTime > 16 ? '- Optimize slow rendering components\n- Consider memoization for expensive calculations\n- Review useEffect dependencies' : ''}
${stats.infiniteRenderAlerts > 0 ? '- Fix infinite render loops immediately\n- Check useEffect dependency arrays\n- Review state update patterns' : ''}
${stats.totalRenders > 1000 ? '- High render count detected\n- Consider component optimization\n- Review re-render triggers' : ''}
    `.trim();

    return report;
  }
}

// Export convenience functions
export const trackRender = RenderTrackingIntegration.trackComponentRender;
export const trackLifecycle = RenderTrackingIntegration.trackComponentLifecycle;
export const measurePerformance = RenderTrackingIntegration.measurePerformance;
export const measureAsyncPerformance = RenderTrackingIntegration.measureAsyncPerformance;
export const getStats = RenderTrackingIntegration.getComponentStats;
export const clearStats = RenderTrackingIntegration.clearStats;
export const setupMonitoring = RenderTrackingIntegration.setupDevelopmentMonitoring;
export const generateReport = RenderTrackingIntegration.generateReport;

// Example integration patterns (as code comments for easy copy-paste)
export const INTEGRATION_EXAMPLES = {
  // AppLayout component integration
  appLayout: `
// Add to AppLayout component
import { trackRender, trackLifecycle } from '@client/utils/render-tracking-integration';

function AppLayout() {
  useEffect(() => {
    trackLifecycle('AppLayout', 'mount');
    return () => trackLifecycle('AppLayout', 'unmount');
  }, []);

  useEffect(() => {
    trackRender('AppLayout', 'navigation-change', { path: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    trackRender('AppLayout', 'responsive-change', { isMobile, isTablet });
  }, [isMobile, isTablet]);

  // Rest of component...
}`,

  // WebSocket component integration
  webSocket: `
// Add to WebSocket components
import { trackRender, trackLifecycle, measurePerformance } from '@client/utils/render-tracking-integration';

function WebSocketClient() {
  useEffect(() => {
    trackLifecycle('WebSocketClient', 'mount');
    return () => trackLifecycle('WebSocketClient', 'unmount');
  }, []);

  const handleConnect = useCallback(() => {
    trackRender('WebSocketClient', 'websocket-connect');
  }, []);

  const handleMessage = useCallback((message) => {
    measurePerformance('WebSocketClient', 'message-processing', () => {
      // Process message
      processMessage(message);
    });
    trackRender('WebSocketClient', 'websocket-message', { messageType: message.type });
  }, []);

  // Rest of component...
}`,

  // Performance monitoring setup
  monitoring: `
// Add to main App component or index.tsx
import { setupMonitoring } from '@client/utils/render-tracking-integration';

// In development mode
if (process.env.NODE_ENV === 'development') {
  const cleanup = setupMonitoring();
  
  // Optional: cleanup on app unmount
  // cleanup();
}`
};

export default RenderTrackingIntegration;