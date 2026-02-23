/**
 * Navigation Types Re-export
 * 
 * Re-exports navigation types from the central types library.
 * This file exists for backwards compatibility with imports from './types'.
 */

export {
  type UserRole,
  type NavigationSection,
  type NavigationItem,
  type BreadcrumbItem,
  type PageRelationType,
  type PageCategory,
  type RelatedPage,
  type PageRelationship,
  type RecentPage,
  type NavigationPreferences,
  type NavigationState,
  type NavigationContextValue,
  type ResponsiveNavigationState,
  type ResponsiveNavigationContextValue,
  type NavigationEventType,
  type NavigationAnalyticsEvent,
  type AccessDenialReason,
  type AccessDenial,
  hasRole,
  requiresAuthentication,
  canAccessItem,
} from '@client/lib/types/navigation';
