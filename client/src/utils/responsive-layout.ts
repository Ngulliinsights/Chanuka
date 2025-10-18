import { logger } from '@shared/core/src/logging';
import React from 'react';

/**
 * Responsive Layout Utility
 * Provides utilities for responsive design and layout management
 */

export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface ResponsiveState {
  breakpoint: keyof BreakpointConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export const BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export class ResponsiveLayoutManager {
  private listeners: Set<(state: ResponsiveState) => void> = new Set();
  private currentState: ResponsiveState;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.currentState = this.calculateState();
    this.setupEventListeners();
  }

  private calculateState(): ResponsiveState {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';

    let breakpoint: keyof BreakpointConfig = 'xs';
    for (const [bp, minWidth] of Object.entries(BREAKPOINTS)) {
      if (width >= minWidth) {
        breakpoint = bp as keyof BreakpointConfig;
      }
    }

    return {
      breakpoint,
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      width,
      height,
      orientation,
    };
  }

  private setupEventListeners(): void {
    // Use ResizeObserver for better performance
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateState();
      });
      this.resizeObserver.observe(document.documentElement);
    } else {
      // Fallback to window resize event
      (window as Window).addEventListener('resize', this.handleResize.bind(this), { passive: true });
    }

    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this), { passive: true });
  }

  private handleResize(): void {
    // Debounce resize events
    if (this.resizeTimeout !== null) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = window.setTimeout(() => {
      this.updateState();
    }, 100);
  }

  private resizeTimeout: number | null = null;

  private handleOrientationChange(): void {
    // Delay to allow for orientation change to complete
    setTimeout(() => {
      this.updateState();
    }, 100);
  }

  private updateState(): void {
    const newState = this.calculateState();
    const hasChanged = this.hasStateChanged(this.currentState, newState);

    if (hasChanged) {
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  private hasStateChanged(oldState: ResponsiveState, newState: ResponsiveState): boolean {
    return (
      oldState.breakpoint !== newState.breakpoint ||
      oldState.isMobile !== newState.isMobile ||
      oldState.isTablet !== newState.isTablet ||
      oldState.isDesktop !== newState.isDesktop ||
      oldState.orientation !== newState.orientation
    );
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        logger.error('Error in responsive layout listener:', { component: 'Chanuka' }, error);
      }
    });
  }

  public subscribe(listener: (state: ResponsiveState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentState(): ResponsiveState {
    return { ...this.currentState };
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.listeners.clear();
  }
}

// Singleton instance
let responsiveManager: ResponsiveLayoutManager | null = null;

export function getResponsiveManager(): ResponsiveLayoutManager {
  if (!responsiveManager) {
    responsiveManager = new ResponsiveLayoutManager();
  }
  return responsiveManager;
}

/**
 * React hook for responsive layout state
 */
export function useResponsiveLayout() {
  const [state, setState] = React.useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        breakpoint: 'lg' as keyof BreakpointConfig,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
        orientation: 'landscape' as const,
      };
    }
    return getResponsiveManager().getCurrentState();
  });

  React.useEffect(() => {
    const manager = getResponsiveManager();
    return manager.subscribe(setState);
  }, []);

  return state;
}

/**
 * Utility functions for responsive design
 */
export const ResponsiveUtils = {
  /**
   * Get container max width for current breakpoint
   */
  getContainerMaxWidth(breakpoint: keyof BreakpointConfig): string {
    const maxWidths = {
      xs: '100%',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    };
    return maxWidths[breakpoint];
  },

  /**
   * Get grid columns for current breakpoint
   */
  getGridColumns(breakpoint: keyof BreakpointConfig, maxColumns: number = 12): number {
    const columnMap = {
      xs: Math.min(1, maxColumns),
      sm: Math.min(2, maxColumns),
      md: Math.min(3, maxColumns),
      lg: Math.min(4, maxColumns),
      xl: Math.min(6, maxColumns),
      '2xl': Math.min(maxColumns, maxColumns),
    };
    return columnMap[breakpoint];
  },

  /**
   * Get spacing scale for current breakpoint
   */
  getSpacing(breakpoint: keyof BreakpointConfig, scale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    const spacingMap = {
      xs: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem' },
      sm: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
      md: { xs: '0.75rem', sm: '1rem', md: '1.25rem', lg: '1.5rem', xl: '2rem' },
      lg: { xs: '1rem', sm: '1.25rem', md: '1.5rem', lg: '2rem', xl: '2.5rem' },
      xl: { xs: '1.25rem', sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem' },
      '2xl': { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3rem', xl: '4rem' },
    };
    return spacingMap[breakpoint][scale];
  },

  /**
   * Check if current viewport matches media query
   */
  matchesMediaQuery(query: string): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  },

  /**
   * Get optimal font size for current breakpoint
   */
  getFontSize(breakpoint: keyof BreakpointConfig, size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' = 'base'): string {
    const fontSizeMap = {
      xs: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
      sm: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
      md: { xs: '0.875rem', sm: '1rem', base: '1.125rem', lg: '1.25rem', xl: '1.5rem', '2xl': '1.875rem' },
      lg: { xs: '0.875rem', sm: '1rem', base: '1.125rem', lg: '1.25rem', xl: '1.5rem', '2xl': '1.875rem' },
      xl: { xs: '1rem', sm: '1.125rem', base: '1.25rem', lg: '1.5rem', xl: '1.875rem', '2xl': '2.25rem' },
      '2xl': { xs: '1rem', sm: '1.125rem', base: '1.25rem', lg: '1.5rem', xl: '1.875rem', '2xl': '2.25rem' },
    };
    return fontSizeMap[breakpoint][size];
  },

  /**
   * Generate responsive class names
   */
  generateResponsiveClasses(
    baseClass: string,
    responsiveMap: Partial<Record<keyof BreakpointConfig, string>>
  ): string {
    const classes = [baseClass];
    
    Object.entries(responsiveMap).forEach(([breakpoint, className]) => {
      if (breakpoint === 'xs') {
        classes.push(className);
      } else {
        classes.push(`${breakpoint}:${className}`);
      }
    });
    
    return classes.join(' ');
  },
};

/**
 * CSS-in-JS helper for responsive styles
 */
export function createResponsiveStyles(
  styles: Partial<Record<keyof BreakpointConfig, React.CSSProperties>>
): React.CSSProperties {
  const currentState = getResponsiveManager().getCurrentState();
  
  // Find the appropriate style for current breakpoint
  const breakpointOrder: (keyof BreakpointConfig)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  let applicableStyle: React.CSSProperties = {};
  
  for (const bp of breakpointOrder) {
    if (BREAKPOINTS[bp] <= currentState.width && styles[bp]) {
      applicableStyle = { ...applicableStyle, ...styles[bp] };
    }
  }
  
  return applicableStyle;
}
// Import React for hooks

