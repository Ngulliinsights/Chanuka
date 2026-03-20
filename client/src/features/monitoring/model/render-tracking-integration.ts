/**
 * Render Tracking Integration Utilities
 *
 * Simple utilities to integrate render tracking into existing components
 * without requiring JSX compilation for the examples.
 */

import { logger } from '@client/lib/utils/logger';

// Integration helper for existing components
export class RenderTrackingIntegration {
  private static componentCounters = new Map<string, number>();

  /**
   * Add render tracking to an existing component's useEffect
   */
  static trackComponentRender(
    componentName: string,
    trigger: string = 'component-render',
    additionalData?: unknown
  ): void {
    const currentCount = this.componentCounters.get(componentName) || 0;
    const newCount = currentCount + 1;
    this.componentCounters.set(componentName, newCount);

    logger.trackRender({
      component: componentName,
      renderCount: newCount,
      timestamp: Date.now(),
      trigger,
      props: additionalData,
    });
  }

  /**
   * Track component lifecycle events
   */
  static trackComponentLifecycle(
    componentName: string,
    action: 'mount' | 'unmount' | 'update',
    additionalData?: unknown
  ): void {
    logger.trackLifecycle({
      component: componentName,
      action,
      timestamp: Date.now(),
      props: additionalData,
    });
  }

  /**
   * Track performance impact
   */
  static trackPerformanceImpact(
    componentName: string,
    renderDuration: number,
    memoryUsage?: number
  ): void {
    logger.trackPerformanceImpact({
      component: componentName,
      renderDuration,
      timestamp: Date.now(),
      memoryUsage,
    });
  }

  /**
   * Get render stats for a component
   */
  static getRenderStats(componentName?: string) {
    return logger.getRenderStats(componentName);
  }

  /**
   * Clear render stats
   */
  static clearRenderStats(componentName?: string): void {
    logger.clearRenderStats(componentName);
    if (componentName) {
      this.componentCounters.delete(componentName);
    } else {
      this.componentCounters.clear();
    }
  }
}

export default RenderTrackingIntegration;
