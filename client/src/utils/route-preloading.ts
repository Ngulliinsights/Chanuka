import { LazyExoticComponent, ComponentType, useMemo } from 'react';

// Navigator Connection API interface
interface NavigatorConnection extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
}

// Route preloading configuration
export interface RoutePreloadConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<unknown>> | null;
  priority: 'high' | 'medium' | 'low';
  preloadConditions?: {
    onHover?: boolean;
    onVisible?: boolean;
    onIdle?: boolean;
    immediate?: boolean;
  };
}

// Critical navigation paths that should be preloaded
export const CRITICAL_ROUTES: RoutePreloadConfig[] = [
  {
    path: '/',
    component: null,
    priority: 'high',
    preloadConditions: { immediate: true }
  },
  {
    path: '/bills',
    component: null,
    priority: 'high',
    preloadConditions: { onHover: true, onIdle: true }
  },
  {
    path: '/dashboard',
    component: null,
    priority: 'medium',
    preloadConditions: { onHover: true }
  },
  {
    path: '/community',
    component: null,
    priority: 'medium',
    preloadConditions: { onIdle: true }
  },
  {
    path: '/search',
    component: null,
    priority: 'low',
    preloadConditions: { onHover: true }
  }
];

// Preloader class for managing route preloading
export class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<void>>();
  private idleCallback?: number | NodeJS.Timeout;
  private eventListeners: Array<{ event: string; handler: EventListener }> = [];
  private isDestroyed = false;

  constructor() {
    this.setupIdleDetection();
  }

  private setupIdleDetection() {
    // Use requestIdleCallback if available, otherwise fallback to setTimeout
    const scheduleIdleCallback = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        return requestIdleCallback(callback, { timeout: 5000 });
      } else {
        return setTimeout(callback, 100);
      }
    };

    const handleIdle = () => {
      if (this.isDestroyed) return;
      this.preloadIdleRoutes();
    };

    const handleActive = () => {
      if (this.isDestroyed) return;
      if (this.idleCallback) {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(this.idleCallback as number);
        } else {
          clearTimeout(this.idleCallback as NodeJS.Timeout);
        }
        this.idleCallback = undefined;
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const resetIdleTimer = () => {
      handleActive();
      this.idleCallback = scheduleIdleCallback(handleIdle);
    };

    // Store listeners for cleanup
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
      this.eventListeners.push({ event, handler: resetIdleTimer });
    });

    // Initial idle timer
    this.idleCallback = scheduleIdleCallback(handleIdle);
  }

  // Preload a specific component
  async preloadComponent(
    component: LazyExoticComponent<ComponentType<unknown>>,
    routePath: string
  ): Promise<void> {
    // Early exit if destroyed
    if (this.isDestroyed) {
      return;
    }

    // Route already preloaded
    if (this.preloadedRoutes.has(routePath)) {
      return;
    }

    // Preload already in progress - return existing promise
    if (this.preloadPromises.has(routePath)) {
      return this.preloadPromises.get(routePath);
    }

    // Create and store the preload promise
    const preloadPromise = this.performPreload(component);
    this.preloadPromises.set(routePath, preloadPromise);

    try {
      await preloadPromise;
      // Double-check we're not destroyed before updating state
      if (!this.isDestroyed) {
        this.preloadedRoutes.add(routePath);
      }
    } catch (error) {
      console.warn(`Failed to preload route ${routePath}:`, error);
      // Remove failed promise so it can be retried
      this.preloadPromises.delete(routePath);
    }
  }

  private async performPreload(
    component: LazyExoticComponent<ComponentType<unknown>>
  ): Promise<void> {
    // Use the component's preload method if available (Vite, webpack 5)
    const comp = component as unknown as { preload?: () => Promise<void>; _payload?: unknown };
    if (typeof comp.preload === 'function') {
      await comp.preload();
      return;
    }

    // Fallback: Access the internal _payload to trigger preloading
    // Note: This uses React internals and may break in future versions
    const payload = comp._payload as unknown as { _result?: unknown; _init?: (p: unknown) => Promise<void>; _payload?: unknown };

    if (payload && typeof payload._result === 'undefined') {
      await payload._init!(payload._payload);
    }
  }

  // Preload routes when hovering over links
  preloadOnHover(component: LazyExoticComponent<ComponentType<unknown>>, routePath: string) {
    return (element: HTMLElement) => {
      // Check if already destroyed
      if (this.isDestroyed) {
        return () => {};
      }

      const handleMouseEnter = () => {
        this.preloadComponent(component, routePath);
      };

      element.addEventListener('mouseenter', handleMouseEnter, { once: true });
      
      // Return cleanup function
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
      };
    };
  }

  // Preload routes when they become visible
  preloadOnVisible(component: LazyExoticComponent<ComponentType<unknown>>, routePath: string) {
    return (element: HTMLElement) => {
      // Check if already destroyed
      if (this.isDestroyed) {
        return () => {};
      }

      if (!('IntersectionObserver' in window)) {
        // Fallback for browsers without IntersectionObserver
        this.preloadComponent(component, routePath);
        return () => {};
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.isDestroyed) {
              this.preloadComponent(component, routePath);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(element);

      // Return cleanup function
      return () => {
        observer.disconnect();
      };
    };
  }

  // Preload routes during idle time
  private preloadIdleRoutes() {
    if (this.isDestroyed) return;

    CRITICAL_ROUTES.forEach((route) => {
      if (route.preloadConditions?.onIdle && route.component && !this.isDestroyed) {
        this.preloadComponent(route.component, route.path);
      }
    });
  }

  // Preload immediate priority routes
  preloadImmediateRoutes(routes: RoutePreloadConfig[]) {
    if (this.isDestroyed) return;

    routes.forEach((route) => {
      if (route.preloadConditions?.immediate && route.component && !this.isDestroyed) {
        this.preloadComponent(route.component, route.path);
      }
    });
  }

  // Get preload status
  getPreloadStatus(routePath: string): 'not-started' | 'loading' | 'loaded' | 'error' {
    if (this.preloadedRoutes.has(routePath)) {
      return 'loaded';
    }
    if (this.preloadPromises.has(routePath)) {
      return 'loading';
    }
    return 'not-started';
  }

  // Clear preload cache
  clearCache() {
    this.preloadedRoutes.clear();
    this.preloadPromises.clear();
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    this.isDestroyed = true;

    // Clear idle callback
    if (this.idleCallback) {
      if ('cancelIdleCallback' in window) {
        cancelIdleCallback(this.idleCallback as number);
      } else {
        clearTimeout(this.idleCallback as NodeJS.Timeout);
      }
      this.idleCallback = undefined;
    }

    // Remove all event listeners
    this.eventListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Clear caches
    this.clearCache();
  }
}

// Global preloader instance
export const routePreloader = new RoutePreloader();

// Hook for using route preloading in components
// Uses useMemo to prevent creating new function references on each render
export function useRoutePreloader() {
  return useMemo(() => ({
    preloadRoute: (component: LazyExoticComponent<ComponentType<unknown>>, path: string) =>
      routePreloader.preloadComponent(component, path),
    preloadOnHover: (component: LazyExoticComponent<ComponentType<unknown>>, path: string) =>
      routePreloader.preloadOnHover(component, path),
    preloadOnVisible: (component: LazyExoticComponent<ComponentType<unknown>>, path: string) =>
      routePreloader.preloadOnVisible(component, path),
    getPreloadStatus: (path: string) => routePreloader.getPreloadStatus(path),
  }), []); // Empty dependency array since we're using the global instance
}

// Connection-aware preloading
export class ConnectionAwarePreloader extends RoutePreloader {
  private connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  private isOnline = navigator.onLine;
  private connectionHandler?: () => void;

  constructor() {
    super();
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor online/offline status
    const onlineHandler = () => {
      this.isOnline = true;
    };

    const offlineHandler = () => {
      this.isOnline = false;
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    // Store handlers for cleanup
    const originalDestroy = this.destroy.bind(this);
    this.destroy = () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);

      // Remove connection change listener if it exists
      if (this.connectionHandler && 'connection' in navigator) {
        const connection = (navigator as Navigator & { connection: NavigatorConnection }).connection;
        connection.removeEventListener('change', this.connectionHandler);
      }

      originalDestroy();
    };

    // Monitor connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection: NavigatorConnection }).connection;

      const updateConnectionType = () => {
        const effectiveType = connection.effectiveType;
        this.connectionType = effectiveType === '4g' ? 'fast' : 'slow';
      };

      updateConnectionType();
      this.connectionHandler = updateConnectionType;
      connection.addEventListener('change', this.connectionHandler);
    }
  }

  // Override preload to consider connection
  override async preloadComponent(
    component: LazyExoticComponent<ComponentType<unknown>>,
    routePath: string
  ): Promise<void> {
    // Skip preloading if offline
    if (!this.isOnline) {
      return;
    }

    // Skip low priority routes on slow connections
    const route = CRITICAL_ROUTES.find(r => r.path === routePath);
    if (route && route.priority === 'low' && this.connectionType === 'slow') {
      return;
    }

    return super.preloadComponent(component, routePath);
  }
}

// Enhanced preloader with connection awareness
export const connectionAwarePreloader = new ConnectionAwarePreloader();

// Utility function to setup preloading for navigation links
export function setupLinkPreloading(
  linkElement: HTMLElement,
  component: LazyExoticComponent<ComponentType<unknown>>,
  routePath: string,
  options: {
    onHover?: boolean;
    onVisible?: boolean;
    immediate?: boolean;
  } = {}
) {
  const cleanupFunctions: (() => void)[] = [];

  if (options.immediate) {
    routePreloader.preloadComponent(component, routePath);
  }

  if (options.onHover) {
    const cleanup = routePreloader.preloadOnHover(component, routePath)(linkElement);
    cleanupFunctions.push(cleanup);
  }

  if (options.onVisible) {
    const cleanup = routePreloader.preloadOnVisible(component, routePath)(linkElement);
    cleanupFunctions.push(cleanup);
  }

  // Return cleanup function that calls all individual cleanup functions
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}