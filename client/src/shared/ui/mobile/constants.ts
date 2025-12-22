/**
 * Mobile UI Constants
 * 
 * Shared constants for mobile components to comply with react-refresh rules.
 */

// Interaction constants
export const INFINITE_SCROLL_DEFAULTS = {
  isLoading: false,
  hasMore: true,
  threshold: 100,
} as const;

// Fallback constants
export const MOBILE_FALLBACK_PROPS = {
  columns: 1,
  gap: 'sm',
} as const;

// Type definitions
export type MobileTab = { 
  id: string; 
  label: string; 
  icon?: React.ReactNode; 
  badge?: string; 
};

export type ChartData = Record<string, string | number>;