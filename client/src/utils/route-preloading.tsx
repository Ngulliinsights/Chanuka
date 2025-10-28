import { LazyExoticComponent, ComponentType } from 'react';
import { logger } from '@shared/core';

export interface RouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
  priority: 'high' | 'medium' | 'low';
  preloadCondition?: () => boolean;
}

export const CRITICAL_ROUTES: RouteConfig[] = [
  {
    path: '/',
    component: null as any, // Will be set dynamically
    priority: 'high',
  },
  {
    path: '/bills',
    component: null as any,
    priority: 'high',
  },
  {
    path: '/dashboard',
    component: null as any,
    priority: 'high',
  },
  {
    path: '/community',
    component: null as any,
    priority: 'medium',
  },
  {
    path: '/search',
    component: null as any,
    priority: 'medium',
  },
];

class RoutePreloader {
  private preloadedComponents = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  async preloadComponent(
    component: LazyExoticComponent<ComponentType<any>>,
    path: string
  ): Promise<void> {
    if (this.preloadedComponents.has(path)) {
      return;
    }

    if (this.preloadPromises.has(path)) {
      return this.preloadPromises.get(path);
    }

    const preloadPromise = this.loadComponent(component, path);
    this.preloadPromises.set(path, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedComponents.add(path);
    } catch (error) {
      this.preloadPromises.delete(path);
      throw error;
    }
  }

  private async loadComponent(
    component: LazyExoticComponent<ComponentType<any>>,
    path: string
  ): Promise<void> {
    try {
      // Access the internal _payload to trigger preloading
      const payload = (component as any)._payload;
      
      if (payload && typeof payload._result === 'undefined') {
        await payload._init(payload._payload);
      }
    } catch (error) {
      console.warn(`Failed to preload component for ${path}:`, error);
      throw error;
    }
  }

  async preloadImmediateRoutes(routes: RouteConfig[]): Promise<void> {
    const highPriorityRoutes = routes.filter(route => route.priority === 'high');
    
    const preloadPromises = highPriorityRoutes.map(route => {
      if (route.component && (!route.preloadCondition || route.preloadCondition())) {
        return this.preloadComponent(route.component, route.path);
      }
      return Promise.resolve();
    });

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some high-priority routes failed to preload:', error);
    }
  }

  async preloadOnHover(path: string, component: LazyExoticComponent<ComponentType<any>>): Promise<void> {
    if (this.preloadedComponents.has(path)) {
      return;
    }

    // Delay preloading slightly to avoid preloading on accidental hovers
    setTimeout(() => {
      this.preloadComponent(component, path).catch(error => {
        console.warn(`Failed to preload on hover for ${path}:`, error);
      });
    }, 100);
  }

  isPreloaded(path: string): boolean {
    return this.preloadedComponents.has(path);
  }

  getPreloadStatus(): { preloaded: string[]; pending: string[] } {
    return {
      preloaded: Array.from(this.preloadedComponents),
      pending: Array.from(this.preloadPromises.keys()),
    };
  }
}

export const routePreloader = new RoutePreloader();

// Hook for using route preloader in components
export function useRoutePreloader() {
  const preloadOnHover = (path: string, component: LazyExoticComponent<ComponentType<any>>) => {
    routePreloader.preloadOnHover(path, component);
  };

  const preloadComponent = (path: string, component: LazyExoticComponent<ComponentType<any>>) => {
    return routePreloader.preloadComponent(component, path);
  };

  const isPreloaded = (path: string) => {
    return routePreloader.isPreloaded(path);
  };

  return {
    preloadOnHover,
    preloadComponent,
    isPreloaded,
    getStatus: () => routePreloader.getPreloadStatus(),
  };
}
