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
export const isDashboardConfig = (obj: unknown): obj is import('./core').DashboardConfig => {
  return obj && typeof obj === 'object' && obj !== null && 'id' in obj && typeof (obj as Record<string, unknown>).id === 'string' && 'widgets' in obj && Array.isArray((obj as Record<string, unknown>).widgets);
};

export const isWidgetConfig = (obj: unknown): obj is import('./core').WidgetConfig => {
  return obj && typeof obj === 'object' && obj !== null && 'id' in obj && typeof (obj as Record<string, unknown>).id === 'string' && 'type' in obj && typeof (obj as Record<string, unknown>).type === 'string';
};