import { LazyExoticComponent, ComponentType } from 'react';

// Route preloading configuration
export interface RoutePreloadConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
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
    component: null as any, // Will be set by the preloader
    priority: 'high',
    preloadConditions: { immediate: true }
  },
  {
    path: '/bills',
    component: null as any,
    priority: 'high',
    preloadConditions: { onHover: true, onIdle: true }
  },
  {
    path: '/dashboard',
    component: null as any,
    priority: 'medium',
    preloadConditions: { onHover: true }
  },
  {
    path: '/community',
    component: null as any,
    priority: 'medium',
    preloadConditions: { onIdle: true }
  },
  {
    path: '/search',
    component: null as any,
    priority: 'low',
    preloadConditions: { onHover: true }
  }
];

// Preloader class for managing route preloading
export class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();
  // idle state flag removed — we trigger idle preloads via the idle callback directly
  private idleCallback?: number;

  constructor() {
    this.setupIdleDetection();
  }

  private setupIdleDetection() {
    // Use requestIdleCallback if available, otherwise fallback to setTimeout
    const scheduleIdleCallback = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        return requestIdleCallback(callback, { timeout: 5000 });
      } else {
        return setTimeout(callback, 100) as any;
      }
    };

    const handleIdle = () => {
      this.preloadIdleRoutes();
    };

    const handleActive = () => {
      if (this.idleCallback) {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(this.idleCallback);
        } else {
          clearTimeout(this.idleCallback);
        }
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const resetIdleTimer = () => {
      handleActive();
      this.idleCallback = scheduleIdleCallback(handleIdle);
    };

    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Initial idle timer
    this.idleCallback = scheduleIdleCallback(handleIdle);
  }

  // Preload a specific component
  async preloadComponent(
    component: LazyExoticComponent<ComponentType<any>>,
    routePath: string
  ): Promise<void> {
    if (this.preloadedRoutes.has(routePath)) {
      return;
    }

    if (this.preloadPromises.has(routePath)) {
      return this.preloadPromises.get(routePath);
    }

  const preloadPromise = this.performPreload(component);
    this.preloadPromises.set(routePath, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(routePath);
    } catch (error) {
      console.warn(`Failed to preload route ${routePath}:`, error);
      this.preloadPromises.delete(routePath);
    }
  }

  private async performPreload(
    component: LazyExoticComponent<ComponentType<any>>
  ): Promise<void> {
    // Access the internal _payload to trigger preloading
    const payload = (component as any)._payload;
    
    if (payload && typeof payload._result === 'undefined') {
      await payload._init(payload._payload);
    }
  }

  // Preload routes based on conditions
  preloadOnHover(component: LazyExoticComponent<ComponentType<any>>, routePath: string) {
    return (element: HTMLElement) => {
      const handleMouseEnter = () => {
        this.preloadComponent(component, routePath);
      };

      element.addEventListener('mouseenter', handleMouseEnter, { once: true });
      
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
      };
    };
  }

  // Preload routes when they become visible
  preloadOnVisible(component: LazyExoticComponent<ComponentType<any>>, routePath: string) {
    return (element: HTMLElement) => {
      if (!('IntersectionObserver' in window)) {
        // Fallback for browsers without IntersectionObserver
        this.preloadComponent(component, routePath);
        return () => {};
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.preloadComponent(component, routePath);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    };
  }

  // Preload routes during idle time
  private preloadIdleRoutes() {
    CRITICAL_ROUTES.forEach((route) => {
      if (route.preloadConditions?.onIdle && route.component) {
        this.preloadComponent(route.component, route.path);
      }
    });
  }

  // Preload immediate priority routes
  preloadImmediateRoutes(routes: RoutePreloadConfig[]) {
    routes.forEach((route) => {
      if (route.preloadConditions?.immediate && route.component) {
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
}

// Global preloader instance
export const routePreloader = new RoutePreloader();

// Hook for using route preloading in components
export function useRoutePreloader() {
  return {
    preloadRoute: (component: LazyExoticComponent<ComponentType<any>>, path: string) => 
      routePreloader.preloadComponent(component, path),
    preloadOnHover: (component: LazyExoticComponent<ComponentType<any>>, path: string) =>
      routePreloader.preloadOnHover(component, path),
    preloadOnVisible: (component: LazyExoticComponent<ComponentType<any>>, path: string) =>
      routePreloader.preloadOnVisible(component, path),
    getPreloadStatus: (path: string) => routePreloader.getPreloadStatus(path),
  };
}

// Connection-aware preloading
export class ConnectionAwarePreloader extends RoutePreloader {
  private connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  private isOnline = navigator.onLine;

  constructor() {
    super();
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Monitor connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionType = () => {
        const effectiveType = connection.effectiveType;
        this.connectionType = effectiveType === '4g' ? 'fast' : 'slow';
      };

      updateConnectionType();
      connection.addEventListener('change', updateConnectionType);
    }
  }

  // Override preload to consider connection
  override async preloadComponent(
    component: LazyExoticComponent<ComponentType<any>>,
    routePath: string
  ): Promise<void> {
    // Skip preloading if offline or on slow connection for low priority routes
    if (!this.isOnline) {
      return;
    }

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
  component: LazyExoticComponent<ComponentType<any>>,
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

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}












































