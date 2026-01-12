export type {
  NavigationItem,
  NavigationSection,
  UserRole,
  AccessDenialReason,
  RelatedPage,
} from '@client/shared/types/navigation';
export { useNav, useRouteAccess, useRelatedPages } from './hooks';
export { NavLink, NavSection, DesktopSidebar } from './ui';
export { canViewItem } from './core/roleGuard';
export { DEFAULT_NAVIGATION_MAP, SECTION_ORDER, SECTION_TITLES } from './constants';
export * from './utils';

// Main navigation component
export { default as Navigation } from './Navigation';

// Advanced navigation components
export { default as ProgressiveDisclosureNavigation } from './ProgressiveDisclosureNavigation';
export { default as ProgressiveDisclosureSimple } from './ProgressiveDisclosureSimple';
export { default as ProgressiveDisclosureDemo } from './ProgressiveDisclosureDemo';
export { default as QuickAccessNav } from './quick-access-nav';
export { default as NavigationPreferencesDialog } from './navigation-preferences-dialog';
