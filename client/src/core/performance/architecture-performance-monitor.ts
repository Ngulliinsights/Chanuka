/**
 * Architecture Performance Monitor
 *
 * Enhanced performance monitoring specifically for client architecture refinement.
 * Tracks metrics related to route transitions, component loading, and user journeys.
 */

import { isFeatureEnabledForUser, getCurrentUserGroup } from '../../config/feature-flags';
import { logger } from '../../utils/logger';

export interface ArchitectureMetrics {
  routeTransitions: RouteTransitionMetric[];
  componentLoadTimes: ComponentLoadMetric[];
  userJourneyMetrics: UserJourneyMetric[];
  searchPerformance: SearchPerformanceMetric[];
  dashboardMetrics: DashboardMetric[];
  navigationMetrics: NavigationMetric[];
}

export interface RouteTransitionMetric {
  fromRoute: string;
  toRoute: string;
  duration: number;
  timestamp: number;
  userGroup: string;
  featureFlags: Record<string, boolean>;
}

export interface ComponentLoadMetric {
  componentName: string;
  loadTime: number;
  renderTime: number;
  bundleSize?: number;
  timestamp: number;
  route: string;
}

export interface UserJourneyMetric {
  journeyId: string;
  steps: JourneyStep[];
  totalTime: number;
  completionRate: number;
  dropOffPoint?: string;
  userPersona?: 'novice' | 'intermediate' | 'expert';
}

export interface JourneyStep {
  stepName: string;
  route: string;
  timestamp: number;
  duration: number;
  success: boolean;
}

export interface SearchPerformanceMetric {
  query: string;
  responseTime: number;
  resultCount: number;
  searchType: 'unified' | 'intelligent' | 'legacy';
  timestamp: number;
  userPersona?: string;
}

export interface DashboardMetric {
  dashboardType: 'adaptive' | 'legacy';
  loadTime: number;
  widgetCount: number;
  personaDetected?: 'novice' | 'intermediate' | 'expert';
  customizationLevel: number;
  timestamp: number;
}

export interface NavigationMetric {
  navigationType: 'breadcrumb' | 'menu' | 'command-palette' | 'direct';
  clicksToDestination: number;
  timeToDestination: number;
  destinationReached: boolean;
  timestamp: number;
}

export interface PerformanceThresholds {
  routeTransition: number; // 200ms
  componentLoad: number; // 100ms
  searchResponse: number; // 500ms
  dashboardLoad: number; // 3000ms
  homePageLoad: number; // 2000ms
}

class ArchitecturePerformanceMonitor {
  private static instance: ArchitecturePerformanceMonitor;
  private metrics: ArchitectureMetrics;
  private thresholds: PerformanceThresholds;
  private currentJourney: UserJourneyMetric | null = null;
  private routeStartTime: number = 0;
  private componentLoadTimes: Map<string, number> = new Map();

  static getInstance(): ArchitecturePerformanceMonitor {
    if (!ArchitecturePerformanceMonitor.instance) {
      ArchitecturePerformanceMonitor.instance = new ArchitecturePerformanceMonitor();
    }
    return ArchitecturePerformanceMonitor.instance;
  }

  constructor() {
    this.metrics = {
      routeTransitions: [],
      componentLoadTimes: [],
      userJourneyMetrics: [],
      searchPerformance: [],
      dashboardMetrics: [],
      navigationMetrics: [],
    };

    this.thresholds = {
      routeTransition: 200,
      componentLoad: 100,
      searchResponse: 500,
      dashboardLoad: 3000,
      homePageLoad: 2000,
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor route changes
    this.setupRouteMonitoring();

    // Monitor component lifecycle
    this.setupComponentMonitoring();

    // Monitor user interactions
    this.setupInteractionMonitoring();

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  private setupRouteMonitoring(): void {
    // Listen for route changes (assuming React Router)
    let currentRoute = window.location.pathname;

    const handleRouteChange = () => {
      const newRoute = window.location.pathname;
      if (newRoute !== currentRoute) {
        this.trackRouteTransition(currentRoute, newRoute);
        currentRoute = newRoute;
      }
    };

    // Use MutationObserver to detect route changes
    const observer = new MutationObserver(handleRouteChange);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also listen for popstate events
    window.addEventListener('popstate', handleRouteChange);
  }

  private setupComponentMonitoring(): void {
    // Monitor component mount/unmount times
    // This would integrate with React DevTools or custom hooks

    // For now, provide methods that components can call
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.processPerformanceMeasure(entry);
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
    }
  }

  private processPerformanceMeasure(entry: PerformanceEntry): void {
    // Process custom performance measures
    if (entry.name.startsWith('component-')) {
      const componentName = entry.name.replace('component-', '');
      this.recordComponentLoad(componentName, entry.duration);
    } else if (entry.name.startsWith('search-')) {
      // For search measures, we need to extract query and result count from the name
      // This is a simplified implementation - in practice, you'd store this data differently
      const query = entry.name.replace('search-', '');
      this.recordSearchPerformance(query, entry.duration, 0, 'unified'); // Default values
    }
  }

  private setupInteractionMonitoring(): void {
    // Monitor clicks and navigation patterns
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      this.trackNavigation(target);
    });

    // Monitor keyboard shortcuts (for command palette)
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        this.trackCommandPaletteUsage();
      }
    });
  }

  private startPeriodicReporting(): void {
    // Send metrics every 30 seconds
    setInterval(() => {
      this.reportMetrics();
    }, 30000);

    // Send metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  // Public API Methods

  /**
   * Track route transition performance
   */
  trackRouteTransition(fromRoute: string, toRoute: string): void {
    const duration = this.routeStartTime ? performance.now() - this.routeStartTime : 0;

    const metric: RouteTransitionMetric = {
      fromRoute,
      toRoute,
      duration,
      timestamp: Date.now(),
      userGroup: getCurrentUserGroup(),
      featureFlags: this.getCurrentFeatureFlags(),
    };

    this.metrics.routeTransitions.push(metric);

    // Check against threshold
    if (duration > this.thresholds.routeTransition) {
      logger.warn('Slow route transition detected', {
        fromRoute,
        toRoute,
        duration,
        threshold: this.thresholds.routeTransition,
      });
    }

    // Start timing for next transition
    this.routeStartTime = performance.now();

    // Limit array size
    if (this.metrics.routeTransitions.length > 100) {
      this.metrics.routeTransitions = this.metrics.routeTransitions.slice(-50);
    }
  }

  /**
   * Record component load performance
   */
  recordComponentLoad(componentName: string, loadTime: number, renderTime?: number): void {
    const metric: ComponentLoadMetric = {
      componentName,
      loadTime,
      renderTime: renderTime || 0,
      timestamp: Date.now(),
      route: window.location.pathname,
    };

    this.metrics.componentLoadTimes.push(metric);

    // Check against threshold
    if (loadTime > this.thresholds.componentLoad) {
      logger.warn('Slow component load detected', {
        componentName,
        loadTime,
        threshold: this.thresholds.componentLoad,
      });
    }

    // Limit array size
    if (this.metrics.componentLoadTimes.length > 100) {
      this.metrics.componentLoadTimes = this.metrics.componentLoadTimes.slice(-50);
    }
  }

  /**
   * Start tracking a user journey
   */
  startUserJourney(journeyId: string, userPersona?: 'novice' | 'intermediate' | 'expert'): void {
    this.currentJourney = {
      journeyId,
      steps: [],
      totalTime: 0,
      completionRate: 0,
      userPersona,
    };
  }

  /**
   * Add step to current user journey
   */
  addJourneyStep(stepName: string, success: boolean = true): void {
    if (!this.currentJourney) return;

    const now = performance.now();
    const lastStep = this.currentJourney.steps[this.currentJourney.steps.length - 1];
    const duration = lastStep ? now - lastStep.timestamp : 0;

    const step: JourneyStep = {
      stepName,
      route: window.location.pathname,
      timestamp: now,
      duration,
      success,
    };

    this.currentJourney.steps.push(step);

    if (!success) {
      this.currentJourney.dropOffPoint = stepName;
    }
  }

  /**
   * Complete current user journey
   */
  completeUserJourney(): void {
    if (!this.currentJourney) return;

    const totalTime = this.currentJourney.steps.reduce((sum, step) => sum + step.duration, 0);
    const successfulSteps = this.currentJourney.steps.filter(step => step.success).length;
    const completionRate = successfulSteps / this.currentJourney.steps.length;

    this.currentJourney.totalTime = totalTime;
    this.currentJourney.completionRate = completionRate;

    this.metrics.userJourneyMetrics.push({ ...this.currentJourney });
    this.currentJourney = null;

    // Limit array size
    if (this.metrics.userJourneyMetrics.length > 50) {
      this.metrics.userJourneyMetrics = this.metrics.userJourneyMetrics.slice(-25);
    }
  }

  /**
   * Record search performance
   */
  recordSearchPerformance(
    query: string,
    responseTime: number,
    resultCount: number,
    searchType: 'unified' | 'intelligent' | 'legacy' = 'unified',
    userPersona?: string
  ): void {
    const metric: SearchPerformanceMetric = {
      query,
      responseTime,
      resultCount,
      searchType,
      timestamp: Date.now(),
      userPersona,
    };

    this.metrics.searchPerformance.push(metric);

    // Check against threshold
    if (responseTime > this.thresholds.searchResponse) {
      logger.warn('Slow search response detected', {
        query,
        responseTime,
        threshold: this.thresholds.searchResponse,
      });
    }

    // Limit array size
    if (this.metrics.searchPerformance.length > 100) {
      this.metrics.searchPerformance = this.metrics.searchPerformance.slice(-50);
    }
  }

  /**
   * Record dashboard performance
   */
  recordDashboardPerformance(
    dashboardType: 'adaptive' | 'legacy',
    loadTime: number,
    widgetCount: number,
    personaDetected?: 'novice' | 'intermediate' | 'expert',
    customizationLevel: number = 0
  ): void {
    const metric: DashboardMetric = {
      dashboardType,
      loadTime,
      widgetCount,
      personaDetected,
      customizationLevel,
      timestamp: Date.now(),
    };

    this.metrics.dashboardMetrics.push(metric);

    // Check against threshold
    if (loadTime > this.thresholds.dashboardLoad) {
      logger.warn('Slow dashboard load detected', {
        dashboardType,
        loadTime,
        threshold: this.thresholds.dashboardLoad,
      });
    }

    // Limit array size
    if (this.metrics.dashboardMetrics.length > 50) {
      this.metrics.dashboardMetrics = this.metrics.dashboardMetrics.slice(-25);
    }
  }

  /**
   * Track navigation patterns
   */
  private trackNavigation(target: HTMLElement): void {
    const navigationType = this.getNavigationType(target);
    if (!navigationType) return;

    // This would need more sophisticated tracking
    // For now, just record the navigation type
    const metric: NavigationMetric = {
      navigationType,
      clicksToDestination: 1, // Would need journey tracking
      timeToDestination: 0, // Would need journey tracking
      destinationReached: true,
      timestamp: Date.now(),
    };

    this.metrics.navigationMetrics.push(metric);

    // Limit array size
    if (this.metrics.navigationMetrics.length > 100) {
      this.metrics.navigationMetrics = this.metrics.navigationMetrics.slice(-50);
    }
  }

  private getNavigationType(target: HTMLElement): NavigationMetric['navigationType'] | null {
    if (target.closest('[data-breadcrumb]')) return 'breadcrumb';
    if (target.closest('[data-menu]')) return 'menu';
    if (target.closest('[data-command-palette]')) return 'command-palette';
    if (target.tagName === 'A' || target.closest('a')) return 'direct';
    return null;
  }

  private trackCommandPaletteUsage(): void {
    const metric: NavigationMetric = {
      navigationType: 'command-palette',
      clicksToDestination: 0, // Keyboard shortcut
      timeToDestination: 0,
      destinationReached: true,
      timestamp: Date.now(),
    };

    this.metrics.navigationMetrics.push(metric);
  }

  private getCurrentFeatureFlags(): Record<string, boolean> {
    // Get current feature flag status
    const userGroup = getCurrentUserGroup();
    return {
      unifiedSearch: isFeatureEnabledForUser('UNIFIED_SEARCH_ENABLED', userGroup),
      adaptiveDashboard: isFeatureEnabledForUser('ADAPTIVE_DASHBOARD_ENABLED', userGroup),
      commandPalette: isFeatureEnabledForUser('COMMAND_PALETTE_ENABLED', userGroup),
      strategicHome: isFeatureEnabledForUser('STRATEGIC_HOME_ENABLED', userGroup),
      personaDetection: isFeatureEnabledForUser('PERSONA_DETECTION_ENABLED', userGroup),
      routeConsolidation: isFeatureEnabledForUser('ROUTE_CONSOLIDATION_ENABLED', userGroup),
    };
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): ArchitectureMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const routeTransitions = this.metrics.routeTransitions;
    const componentLoads = this.metrics.componentLoadTimes;
    const searches = this.metrics.searchPerformance;
    const dashboards = this.metrics.dashboardMetrics;

    return {
      averageRouteTransition: this.calculateAverage(routeTransitions.map(r => r.duration)),
      averageComponentLoad: this.calculateAverage(componentLoads.map(c => c.loadTime)),
      averageSearchResponse: this.calculateAverage(searches.map(s => s.responseTime)),
      averageDashboardLoad: this.calculateAverage(dashboards.map(d => d.loadTime)),
      slowRouteTransitions: routeTransitions.filter(
        r => r.duration > this.thresholds.routeTransition
      ).length,
      slowComponentLoads: componentLoads.filter(c => c.loadTime > this.thresholds.componentLoad)
        .length,
      slowSearches: searches.filter(s => s.responseTime > this.thresholds.searchResponse).length,
      slowDashboards: dashboards.filter(d => d.loadTime > this.thresholds.dashboardLoad).length,
      totalMetrics:
        routeTransitions.length + componentLoads.length + searches.length + dashboards.length,
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Report metrics to analytics service
   */
  private reportMetrics(): void {
    const metricsPayload = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userGroup: getCurrentUserGroup(),
      featureFlags: this.getCurrentFeatureFlags(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
    };

    // Send to analytics service
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/architecture-metrics', JSON.stringify(metricsPayload));
    } else {
      fetch('/api/architecture-metrics', {
        method: 'POST',
        body: JSON.stringify(metricsPayload),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(error => {
        logger.warn('Failed to send architecture metrics', { error });
      });
    }
  }

  /**
   * Create performance marks for component lifecycle
   */
  markComponentStart(componentName: string): void {
    performance.mark(`component-${componentName}-start`);
    this.componentLoadTimes.set(componentName, performance.now());
  }

  /**
   * Create performance measures for component lifecycle
   */
  markComponentEnd(componentName: string): void {
    const startTime = this.componentLoadTimes.get(componentName);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      performance.mark(`component-${componentName}-end`);
      performance.measure(
        `component-${componentName}`,
        `component-${componentName}-start`,
        `component-${componentName}-end`
      );

      this.recordComponentLoad(componentName, loadTime);
      this.componentLoadTimes.delete(componentName);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all stored metrics
    this.metrics = {
      routeTransitions: [],
      componentLoadTimes: [],
      userJourneyMetrics: [],
      searchPerformance: [],
      dashboardMetrics: [],
      navigationMetrics: [],
    };

    this.componentLoadTimes.clear();
    this.currentJourney = null;
  }
}

export default ArchitecturePerformanceMonitor;

// Export singleton instance
export const architecturePerformanceMonitor = ArchitecturePerformanceMonitor.getInstance();
