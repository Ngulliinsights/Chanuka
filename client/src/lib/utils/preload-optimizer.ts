interface PreloadConfig {
  href: string;
  as: string;
  type?: string;
  crossorigin?: string;
  priority?: 'high' | 'low';
  condition?: () => boolean;
}

class PreloadOptimizer {
  private preloadedResources = new Set<string>();
  private usedResources = new Set<string>();
  private preloadTimeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.setupResourceUsageTracking();
  }

  private setupResourceUsageTracking() {
    // Track when resources are actually used
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.markResourceAsUsed(entry.name);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  public optimizePreloads(preloads: PreloadConfig[]) {
    // Remove existing preload links that haven't been used
    this.cleanupUnusedPreloads();

    // Add new optimized preloads
    preloads.forEach(config => {
      if (config.condition && !config.condition()) {
        return; // Skip if condition not met
      }

      this.addOptimizedPreload(config);
    });
  }

  private addOptimizedPreload(config: PreloadConfig) {
    if (this.preloadedResources.has(config.href)) {
      return; // Already preloaded
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = config.href;
    link.as = config.as;

    if (config.type) link.type = config.type;
    if (config.crossorigin) link.crossOrigin = config.crossorigin;

    // Set priority if supported
    if (config.priority && 'fetchPriority' in link) {
      (link as any).fetchPriority = config.priority;
    }

    document.head.appendChild(link);
    this.preloadedResources.add(config.href);

    // Set timeout to remove unused preloads
    const timeout = setTimeout(() => {
      if (!this.usedResources.has(config.href)) {
        this.removePreload(config.href);
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Removed unused preload: ${config.href}`);
        }
      }
    }, 10000); // 10 second timeout

    this.preloadTimeouts.set(config.href, timeout);
  }

  private markResourceAsUsed(resourceUrl: string) {
    this.usedResources.add(resourceUrl);

    // Clear timeout for this resource
    const timeout = this.preloadTimeouts.get(resourceUrl);
    if (timeout) {
      clearTimeout(timeout);
      this.preloadTimeouts.delete(resourceUrl);
    }
  }

  private removePreload(href: string) {
    const links = document.querySelectorAll(`link[rel="preload"][href="${href}"]`);
    links.forEach(link => link.remove());
    this.preloadedResources.delete(href);
  }

  private cleanupUnusedPreloads() {
    // Remove preloads that haven't been used after their timeout
    this.preloadTimeouts.forEach((timeout, href) => {
      if (!this.usedResources.has(href)) {
        clearTimeout(timeout);
        this.removePreload(href);
        this.preloadTimeouts.delete(href);
      }
    });
  }

  public getStats() {
    return {
      preloaded: this.preloadedResources.size,
      used: this.usedResources.size,
      pending: this.preloadTimeouts.size,
      efficiency:
        this.preloadedResources.size > 0
          ? (this.usedResources.size / this.preloadedResources.size) * 100
          : 0,
    };
  }
}

export const preloadOptimizer = new PreloadOptimizer();

// Smart preload configurations
export const smartPreloads: PreloadConfig[] = [
  // Critical CSS - always preload
  {
    href: '/src/index.css',
    as: 'style',
    priority: 'high',
  },

  // Main app modules - preload only if not already loaded
  {
    href: '/src/main.tsx',
    as: 'script',
    type: 'module',
    priority: 'high',
    condition: () => !document.querySelector('script[src="/src/main.tsx"]'),
  },

  // App component - preload only if on home page
  {
    href: '/src/App.tsx',
    as: 'script',
    type: 'module',
    condition: () => window.location.pathname === '/' || window.location.pathname === '/home',
  },

  // Dashboard - preload only if user is authenticated
  {
    href: '/src/pages/bills-dashboard-page.tsx',
    as: 'script',
    type: 'module',
    condition: () => {
      // Check if user is likely to navigate to dashboard
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      return !!token;
    },
  },

  // Critical images - preload only if visible
  {
    href: '/symbol.svg',
    as: 'image',
    type: 'image/svg+xml',
    priority: 'low',
  },
];

// Initialize smart preloading
let routeCheckInterval: NodeJS.Timeout | null = null;

export function initializeSmartPreloading() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      preloadOptimizer.optimizePreloads(smartPreloads);
    });
  } else {
    preloadOptimizer.optimizePreloads(smartPreloads);
  }

  // Re-optimize on route changes
  let lastPath = window.location.pathname;
  routeCheckInterval = setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      preloadOptimizer.optimizePreloads(smartPreloads);
    }
  }, 1000);
}

// Cleanup function to prevent memory leaks
export function cleanupSmartPreloading() {
  if (routeCheckInterval) {
    clearInterval(routeCheckInterval);
    routeCheckInterval = null;
  }
}
