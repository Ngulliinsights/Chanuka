/**
 * Dashboard Types - Simplified Export
 * 
 * This replaces the complex 440+ line types.ts file with a clean,
 * maintainable type system focused on essential functionality.
 */

// Core types
export type {
  WidgetConfig,
  DashboardConfig,
  DashboardState,
  DashboardProps,
  WidgetProps,
  DashboardStats,
  ActivityRecord,
  ActionItem,
  UseDashboardResult,
} from './core';

// Legacy compatibility - gradually migrate away from these
export type {
  // Keep only essential legacy types for backward compatibility
  DashboardComponentProps,
} from '../types';

// Type guards and utilities
export const isDashboardConfig = (obj: any): obj is DashboardConfig => {
  return obj && typeof obj.id === 'string' && Array.isArray(obj.widgets);
};

export const isWidgetConfig = (obj: any): obj is WidgetConfig => {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string';
};