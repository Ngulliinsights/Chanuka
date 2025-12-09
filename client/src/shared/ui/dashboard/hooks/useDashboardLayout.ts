/**
 * useDashboardLayout Hook
 *
 * Custom hook for managing dashboard layout state and responsive behavior
 */

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayoutConfig, UseDashboardLayoutReturn } from '../types';

interface UseDashboardLayoutOptions {
  /** Initial layout configuration */
  initialLayout?: Partial<DashboardLayoutConfig>;
  /** Breakpoints for responsive behavior */
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * useDashboardLayout Hook
 */
export const useDashboardLayout = (
  initialConfig: DashboardLayoutConfig,
  options: UseDashboardLayoutOptions = {}
): UseDashboardLayoutReturn => {
  const {
    initialLayout,
    breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
    },
  } = options;

  // Layout state
  const [layout, setLayout] = useState<DashboardLayoutConfig>({
    ...initialConfig,
    ...initialLayout,
  });

  // Responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [windowWidth, setWindowWidth] = useState<number>(0);

  // Determine current breakpoint
  const getBreakpoint = useCallback((width: number): 'mobile' | 'tablet' | 'desktop' => {
    if (width < breakpoints.mobile) return 'mobile';
    if (width < breakpoints.tablet) return 'tablet';
    return 'desktop';
  }, [breakpoints]);

  // Update responsive state
  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      const breakpoint = getBreakpoint(width);
      setCurrentBreakpoint(breakpoint);

      // Auto-close sidebar on mobile when switching breakpoints
      if (breakpoint === 'mobile' && currentBreakpoint !== 'mobile') {
        setSidebarOpen(false);
      }
    };

    // Initial update
    updateResponsiveState();

    // Listen for resize events
    window.addEventListener('resize', updateResponsiveState);
    return () => window.removeEventListener('resize', updateResponsiveState);
  }, [getBreakpoint, currentBreakpoint]);

  // Layout update handler
  const updateLayout = useCallback((updates: Partial<DashboardLayoutConfig>) => {
    setLayout(prev => ({ ...prev, ...updates }));
  }, []);

  // Sidebar toggle handler
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Computed values
  const isMobile = currentBreakpoint === 'mobile';

  return {
    layout,
    updateLayout,
    sidebarOpen,
    toggleSidebar,
    isMobile,
    breakpoint: currentBreakpoint,
  };
};