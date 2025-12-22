/**
 * Navigation Service - Shared Services
 * 
 * Migrated from client/src/services/navigation.ts
 * Handles programmatic navigation, route management, and navigation state
 * for the civic engagement platform.
 */

import { logger } from '@client/utils/logger';

interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
}

interface NavigationOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
  preserveQuery?: boolean;
  preserveHash?: boolean;
}

interface RouteDefinition {
  path: string;
  name: string;
  component?: string;
  title?: string;
  meta?: Record<string, unknown>;
  children?: RouteDefinition[];
}

type NavigationListener = (state: NavigationState) => void;

class NavigationService {
  private listeners: NavigationListener[] = [];
  private currentState: NavigationState;
  private routes = new Map<string, RouteDefinition>();
  private isInitialized = false;

  constructor() {
    this.currentState = this.getCurrentNavigationState();
    this.initializeRoutes();
  }

  /**
   * Initialize the navigation service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Listen for browser navigation events
    window.addEventListener('popstate', this.handlePopState.bind(this));

    // Listen for hash changes
    window.addEventListener('hashchange', this.handleHashChange.bind(this));

    this.isInitialized = true;

    logger.info('Navigation service initialized', {
      component: 'NavigationService',
      currentPath: this.currentState.currentPath
    });
  }

  /**
   * Navigate to a specific path
   */
  navigate(path: string, options: NavigationOptions = {}): void {
    try {
      const previousPath = this.currentState.currentPath;

      // Build the full URL
      let fullPath = path;

      if (options.preserveQuery && Object.keys(this.currentState.query).length > 0) {
        const queryString = new URLSearchParams(this.currentState.query).toString();
        fullPath += (fullPath.includes('?') ? '&' : '?') + queryString;
      }

      if (options.preserveHash && this.currentState.hash) {
        fullPath += this.currentState.hash;
      }

      // Update browser history
      if (options.replace) {
        window.history.replaceState(options.state || null, '', fullPath);
      } else {
        window.history.pushState(options.state || null, '', fullPath);
      }

      // Update internal state
      this.updateNavigationState(previousPath);

      logger.debug('Navigation completed', {
        component: 'NavigationService',
        from: previousPath,
        to: path,
        options
      });

    } catch (error) {
      logger.error('Navigation failed', {
        component: 'NavigationService',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Navigate back in history
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * Navigate forward in history
   */
  goForward(): void {
    window.history.forward();
  }

  /**
   * Replace current route
   */
  replace(path: string, options: Omit<NavigationOptions, 'replace'> = {}): void {
    this.navigate(path, { ...options, replace: true });
  }

  /**
   * Reload current page
   */
  reload(): void {
    window.location.reload();
  }

  /**
   * Get current navigation state
   */
  getCurrentState(): NavigationState {
    return { ...this.currentState };
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentState.currentPath;
  }

  /**
   * Get current query parameters
   */
  getQuery(): Record<string, string> {
    return { ...this.currentState.query };
  }

  /**
   * Get specific query parameter
   */
  getQueryParam(key: string): string | null {
    return this.currentState.query[key] || null;
  }

  /**
   * Update query parameters
   */
  updateQuery(params: Record<string, string | null>, options: NavigationOptions = {}): void {
    const currentQuery = { ...this.currentState.query };

    // Update or remove parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        delete currentQuery[key];
      } else {
        currentQuery[key] = value;
      }
    });

    const queryString = new URLSearchParams(currentQuery).toString();
    const newPath = this.currentState.currentPath + (queryString ? `?${queryString}` : '');

    this.navigate(newPath, { ...options, preserveHash: true });
  }

  /**
   * Add navigation listener
   */
  addListener(listener: NavigationListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove navigation listener
   */
  removeListener(listener: NavigationListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Register a route definition
   */
  registerRoute(route: RouteDefinition): void {
    this.routes.set(route.path, route);

    logger.debug('Route registered', {
      component: 'NavigationService',
      path: route.path,
      name: route.name
    });
  }

  /**
   * Get route definition by path
   */
  getRoute(path: string): RouteDefinition | null {
    return this.routes.get(path) || null;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  /**
   * Navigate to a named route
   */
  navigateToRoute(routeName: string, params: Record<string, string> = {}, options: NavigationOptions = {}): void {
    const route = Array.from(this.routes.values()).find(r => r.name === routeName);

    if (!route) {
      throw new Error(`Route not found: ${routeName}`);
    }

    // Replace path parameters
    let path = route.path;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });

    this.navigate(path, options);
  }

  /**
   * Check if current path matches a pattern
   */
  matchesPath(pattern: string): boolean {
    const currentPath = this.currentState.currentPath;

    // Convert pattern to regex (simple implementation)
    const regexPattern = pattern
      .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
      .replace(/\*/g, '.*'); // Replace * with wildcard

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(currentPath);
  }

  /**
   * Extract parameters from current path using a pattern
   */
  extractParams(pattern: string): Record<string, string> {
    const currentPath = this.currentState.currentPath;
    const params: Record<string, string> = {};

    const patternParts = pattern.split('/');
    const pathParts = currentPath.split('/');

    if (patternParts.length !== pathParts.length) {
      return params;
    }

    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[index];
      }
    });

    return params;
  }

  /**
   * Build URL with parameters
   */
  buildUrl(path: string, params?: Record<string, string>, query?: Record<string, string>): string {
    let url = path;

    // Replace path parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      });
    }

    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getCurrentNavigationState(): NavigationState {
    const url = new URL(window.location.href);

    return {
      currentPath: url.pathname,
      previousPath: null,
      params: {},
      query: Object.fromEntries(url.searchParams.entries()),
      hash: url.hash
    };
  }

  private updateNavigationState(previousPath: string): void {
    const newState = this.getCurrentNavigationState();
    newState.previousPath = previousPath;

    this.currentState = newState;

    // Notify listeners
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        logger.error('Navigation listener error', {
          component: 'NavigationService',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private handlePopState(event: PopStateEvent): void {
    const previousPath = this.currentState.currentPath;
    this.updateNavigationState(previousPath);

    logger.debug('Browser navigation detected', {
      component: 'NavigationService',
      from: previousPath,
      to: this.currentState.currentPath,
      state: event.state
    });
  }

  private handleHashChange(event: HashChangeEvent): void {
    const previousPath = this.currentState.currentPath;
    this.updateNavigationState(previousPath);

    logger.debug('Hash change detected', {
      component: 'NavigationService',
      oldHash: new URL(event.oldURL).hash,
      newHash: new URL(event.newURL).hash
    });
  }

  private initializeRoutes(): void {
    // Register common routes for the civic engagement platform
    const commonRoutes: RouteDefinition[] = [
      {
        path: '/',
        name: 'home',
        title: 'Home - Civic Engagement Platform'
      },
      {
        path: '/bills',
        name: 'bills',
        title: 'Bills - Legislative Content'
      },
      {
        path: '/bills/:id',
        name: 'bill-detail',
        title: 'Bill Details'
      },
      {
        path: '/discussions',
        name: 'discussions',
        title: 'Community Discussions'
      },
      {
        path: '/discussions/:id',
        name: 'discussion-detail',
        title: 'Discussion Details'
      },
      {
        path: '/profile',
        name: 'profile',
        title: 'User Profile'
      },
      {
        path: '/settings',
        name: 'settings',
        title: 'Settings'
      },
      {
        path: '/about',
        name: 'about',
        title: 'About Us'
      }
    ];

    commonRoutes.forEach(route => {
      this.registerRoute(route);
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.isInitialized) {
      window.removeEventListener('popstate', this.handlePopState.bind(this));
      window.removeEventListener('hashchange', this.handleHashChange.bind(this));
    }

    this.listeners = [];
    this.routes.clear();
    this.isInitialized = false;

    logger.info('Navigation service cleaned up', {
      component: 'NavigationService'
    });
  }
}

// Export singleton instance
export const navigationService = new NavigationService();

// Export utility functions
export const navigationUtils = {
  isExternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  },

  joinPaths(...paths: string[]): string {
    return paths
      .map(path => path.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
      .filter(path => path.length > 0)
      .join('/');
  },

  parseQuery(queryString: string): Record<string, string> {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
    return Object.fromEntries(params.entries());
  },

  stringifyQuery(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.set(key, value);
      }
    });
    return searchParams.toString();
  },

  isSamePath(path1: string, path2: string): boolean {
    const normalize = (path: string) => path.replace(/\/+$/, '') || '/';
    return normalize(path1) === normalize(path2);
  }
};

export default navigationService;