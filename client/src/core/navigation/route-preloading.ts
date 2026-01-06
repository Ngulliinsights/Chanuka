/**
 * Route Preloading System - Core Navigation
 *
 * Strategic performance optimization for navigation routes
 */

import { LazyExoticComponent, ComponentType } from 'react';

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
  }
];

class RoutePreloader {
  private static instance: RoutePreloader;
  private preloadedRoutes = new Set<string>();
  private connection: NavigatorConnection | null = null;

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader();
    }
    return RoutePreloader.instance;
  }

  constructor() {
    this.connection = (navigator as any).connection || null;
    this.initializePreloading();
  }

  private initializePreloading(): void {
    // Preload critical routes immediately
    CRITICAL_ROUTES
      .filter(route => route.preloadConditions?.immediate)
      .forEach(route => this.preloadRoute(route.path));
  }

  preloadRoute(path: string): void {
    if (this.preloadedRoutes.has(path)) return;
    if (this.shouldSkipPreload()) return;

    this.preloadedRoutes.add(path);

    // Create link element for preloading
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
  }

  private shouldSkipPreload(): boolean {
    // Skip on slow connections or data saver mode
    if (this.connection?.saveData) return true;
    if (this.connection?.effectiveType === 'slow-2g' || this.connection?.effectiveType === '2g') return true;
    return false;
  }

  setupHoverPreloading(): void {
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (link && link.href) {
        const path = new URL(link.href).pathname;
        const routeConfig = CRITICAL_ROUTES.find(r => r.path === path);

        if (routeConfig?.preloadConditions?.onHover) {
          this.preloadRoute(path);
        }
      }
    });
  }

  getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }
}

export const routePreloader = RoutePreloader.getInstance();
