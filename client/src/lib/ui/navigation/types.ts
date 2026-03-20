/**
 * Navigation Types Re-export
 * 
 * This file re-exports types from the canonical types location for legacy imports.
 * The source of truth for navigation types is @client/lib/types/navigation.
 */

export type {
  NavigationItem,
  NavigationSection,
  NavigationPreferences,
  RecentPage,
  BreadcrumbItem,
  UserRole,
  NavigationState,
  PageRelationType,
  PageCategory,
} from '@client/lib/types/navigation';

// Alias for backward compatibility
export type { BreadcrumbItem as Breadcrumb } from '@client/lib/types/navigation';
