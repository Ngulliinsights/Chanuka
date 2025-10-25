import { AssetLoadConfig } from './asset-loading';

/**
 * Asset fallback configuration system
 * Provides prioritized fallback strategies for different asset types
 */

export interface AssetFallbackStrategy {
  primary: string;
  fallbacks: string[];
  offlineFallback?: string;
  degradedMode?: string;
}

export interface AssetFallbackConfig {
  images: Record<string, AssetFallbackStrategy>;
  fonts: Record<string, AssetFallbackStrategy>;
  scripts: Record<string, AssetFallbackStrategy>;
  styles: Record<string, AssetFallbackStrategy>;
  priorities: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  offlineStrategy: 'cache-first' | 'network-first' | 'fastest';
}

/**
 * Default fallback configurations for common assets
 */
export const DEFAULT_ASSET_FALLBACKS: AssetFallbackConfig = {
  images: {
    logo: {
      primary: '/logo.svg',
      fallbacks: ['/logo.png', '/logo.jpg'],
      offlineFallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjIwQzE0IDIxLjEgMTMuMSAyMiAxMiAyMkMxMC45IDIyIDEwIDIxLjEgMTAgMjBWNEMxMCAyLjkgMTAuOSAyIDEyIDJaTTEyIDhDMTMuNjYgOCA5LjYgOS42IDkuNiAxMUM5LjYgMTIuNCAxMC4zNCAxMyAxMiAxM0MxMy42NiAxMyAxNC40IDEyLjQgMTQuNCAxMUMxNC40IDkuNiAxMy42NiA4IDEyIDhaIiBmaWxsPSIjNkI3MjgwIi8+Cjwvc3ZnPgo=',
    },
    avatar: {
      primary: '/avatar.jpg',
      fallbacks: ['/avatar.png', '/default-avatar.svg'],
      offlineFallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcuNzYxNCAyMCAyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTMwIDI4QzMwIDI0LjY4NjMgMjYuNDI3MSAyMiAyMiAyMkgxOEMxMy41NzI5IDIyIDEwIDI0LjY4NjMgMTAgMjhWMzBIMzBWMjhaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=',
    },
    icon: {
      primary: '/icon.svg',
      fallbacks: ['/icon.png'],
      offlineFallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjIwQzE0IDIxLjEgMTMuMSAyMiAxMiAyMkMxMC45IDIyIDEwIDIxLjEgMTAgMjBWNEMxMCAyLjkgMTAuOSAyIDEyIDJaTTEyIDhDMTMuNjYgOCA5LjYgOS42IDkuNiAxMUM5LjYgMTIuNCAxMC4zNCAxMyAxMiAxM0MxMy42NiAxMyAxNC40IDEyLjQgMTQuNCAxMUMxNC40IDkuNiAxMy42NiA4IDEyIDhaIiBmaWxsPSIjNkI3MjgwIi8+Cjwvc3ZnPgo=',
    },
  },
  fonts: {
    primary: {
      primary: 'Inter',
      fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto'],
      offlineFallback: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    },
    heading: {
      primary: 'Cal Sans',
      fallbacks: ['Inter', 'system-ui', 'Arial'],
      offlineFallback: 'system-ui, Arial, sans-serif',
    },
    mono: {
      primary: 'JetBrains Mono',
      fallbacks: ['Fira Code', 'SF Mono', 'Monaco', 'Consolas'],
      offlineFallback: 'SF Mono, Monaco, Consolas, monospace',
    },
  },
  scripts: {
    analytics: {
      primary: '/js/analytics.js',
      fallbacks: ['/js/analytics.min.js'],
      offlineFallback: '/js/analytics-offline.js',
      degradedMode: 'no-analytics',
    },
    charts: {
      primary: '/js/chart-lib.js',
      fallbacks: ['/js/chart-fallback.js'],
      offlineFallback: '/js/chart-static.js',
      degradedMode: 'no-charts',
    },
    maps: {
      primary: '/js/maps.js',
      fallbacks: ['/js/maps-basic.js'],
      offlineFallback: '/js/maps-static.js',
      degradedMode: 'no-maps',
    },
  },
  styles: {
    theme: {
      primary: '/css/theme.css',
      fallbacks: ['/css/theme-fallback.css'],
      offlineFallback: '/css/theme-basic.css',
    },
    components: {
      primary: '/css/components.css',
      fallbacks: ['/css/components-fallback.css'],
      offlineFallback: '/css/components-basic.css',
    },
  },
  priorities: {
    critical: [
      'logo',
      'primary-font',
      'theme',
      'core-components',
    ],
    high: [
      'heading-font',
      'analytics',
      'icons',
    ],
    medium: [
      'charts',
      'maps',
      'avatars',
    ],
    low: [
      'background-images',
      'decorative-assets',
    ],
  },
  offlineStrategy: 'cache-first',
};

/**
 * Asset loading configuration with fallback priorities
 */
export const ASSET_LOAD_CONFIGS: Record<string, AssetLoadConfig> = {
  critical: {
    maxRetries: 3,
    retryDelay: 500,
    timeout: 5000,
    priority: 'high',
    connectionAware: true,
  },
  high: {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 8000,
    priority: 'high',
    connectionAware: true,
  },
  medium: {
    maxRetries: 2,
    retryDelay: 1500,
    timeout: 12000,
    priority: 'medium',
    connectionAware: true,
  },
  low: {
    maxRetries: 1,
    retryDelay: 2000,
    timeout: 15000,
    priority: 'low',
    connectionAware: true,
  },
};

/**
 * Progressive enhancement levels
 */
export enum EnhancementLevel {
  FULL = 'full',
  REDUCED = 'reduced',
  BASIC = 'basic',
  MINIMAL = 'minimal',
}

/**
 * Feature availability based on loaded assets
 */
export interface FeatureAvailability {
  charts: boolean;
  maps: boolean;
  analytics: boolean;
  animations: boolean;
  images: boolean;
  fonts: boolean;
}

/**
 * Get fallback strategy for an asset
 */
export function getAssetFallback(assetType: keyof AssetFallbackConfig, assetKey: string): AssetFallbackStrategy | null {
  const config = DEFAULT_ASSET_FALLBACKS[assetType];
  if (!config || typeof config !== 'object') return null;

  return (config as any)[assetKey] || null;
}

/**
 * Get loading priority for an asset
 */
export function getAssetPriority(assetKey: string): keyof AssetFallbackConfig['priorities'] {
  const priorities = DEFAULT_ASSET_FALLBACKS.priorities;

  if (priorities.critical.includes(assetKey)) return 'critical';
  if (priorities.high.includes(assetKey)) return 'high';
  if (priorities.medium.includes(assetKey)) return 'medium';
  return 'low';
}

/**
 * Determine enhancement level based on loaded assets
 */
export function determineEnhancementLevel(loadedAssets: string[], failedAssets: string[]): EnhancementLevel {
  const criticalAssets = DEFAULT_ASSET_FALLBACKS.priorities.critical;
  const highAssets = DEFAULT_ASSET_FALLBACKS.priorities.high;

  const criticalLoaded = criticalAssets.every(asset => loadedAssets.includes(asset));
  const criticalFailed = criticalAssets.some(asset => failedAssets.includes(asset));
  const highLoaded = highAssets.every(asset => loadedAssets.includes(asset));

  if (criticalLoaded && highLoaded) return EnhancementLevel.FULL;
  if (criticalLoaded) return EnhancementLevel.REDUCED;
  if (!criticalFailed) return EnhancementLevel.BASIC;
  return EnhancementLevel.MINIMAL;
}

/**
 * Get feature availability based on loaded assets
 */
export function getFeatureAvailability(loadedAssets: string[], failedAssets: string[]): FeatureAvailability {
  return {
    charts: loadedAssets.includes('charts') && !failedAssets.includes('charts'),
    maps: loadedAssets.includes('maps') && !failedAssets.includes('maps'),
    analytics: loadedAssets.includes('analytics') && !failedAssets.includes('analytics'),
    animations: loadedAssets.includes('animations') && !failedAssets.includes('animations'),
    images: loadedAssets.some(asset => asset.includes('image') || asset.includes('icon')),
    fonts: loadedAssets.some(asset => asset.includes('font')),
  };
}

/**
 * Apply degraded mode styling
 */
export function applyDegradedMode(level: EnhancementLevel): void {
  const body = document.body;

  // Remove existing degradation classes
  body.classList.remove('degraded-full', 'degraded-reduced', 'degraded-basic', 'degraded-minimal');

  // Add appropriate degradation class
  body.classList.add(`degraded-${level}`);

  // Apply specific styles based on level
  switch (level) {
    case EnhancementLevel.MINIMAL:
      body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      // Disable animations
      document.documentElement.style.setProperty('--animation-duration', '0s');
      break;

    case EnhancementLevel.BASIC:
      // Keep basic fonts and disable complex features
      break;

    case EnhancementLevel.REDUCED:
      // Allow some enhancements but disable non-critical ones
      break;

    case EnhancementLevel.FULL:
      // Full functionality
      break;
  }
}

/**
 * Initialize asset fallback system
 */
export function initializeAssetFallbacks(): void {
  // Add CSS classes for degradation levels
  const style = document.createElement('style');
  style.textContent = `
    .degraded-minimal * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }

    .degraded-minimal .complex-feature {
      display: none !important;
    }

    .degraded-basic .advanced-feature {
      display: none !important;
    }

    .degraded-reduced .non-essential {
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);

  // Mark as initialized
  document.documentElement.setAttribute('data-asset-fallbacks', 'initialized');
}

export default DEFAULT_ASSET_FALLBACKS;