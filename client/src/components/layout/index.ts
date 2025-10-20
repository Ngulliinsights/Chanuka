/**
 * Layout component barrel exports
 * Following navigation component patterns for consistency
 */

// Type exports
export type {
  LayoutType,
  LayoutBreakpoint,
  SidebarState,
  HeaderStyle,
  FooterStyle,
  LayoutConfig,
  AppLayoutProps,
  MobileHeaderProps,
  HeaderAction,
  MobileNavigationProps,
  NavigationItem,
  SidebarProps,
  User,
  UserPreferences,
  LayoutState,
  LayoutPerformanceMetrics,
  LayoutAccessibilityFeatures,
  ResponsiveLayoutConfig,
  LayoutValidationResult,
  LayoutRecoveryOptions,
  TouchGestureConfig,
  LayoutAnimationConfig,
  LayoutThemeConfig
} from './types';

// Error exports
export {
  LayoutErrorType,
  LayoutError,
  LayoutConfigurationError,
  LayoutValidationError,
  LayoutRenderError,
  LayoutResponsiveError,
  LayoutAccessibilityError,
  LayoutPerformanceError,
  LayoutNavigationError,
  LayoutUserError,
  LayoutBreakpointError,
  createLayoutConfigError,
  createLayoutValidationError,
  createLayoutRenderError,
  createLayoutResponsiveError,
  createLayoutAccessibilityError,
  createLayoutPerformanceError,
  createLayoutNavigationError,
  createLayoutUserError,
  createLayoutBreakpointError,
  isLayoutError,
  isLayoutConfigurationError,
  isLayoutValidationError,
  isLayoutRenderError,
  isLayoutResponsiveError,
  isLayoutAccessibilityError,
  isLayoutPerformanceError,
  isLayoutNavigationError,
  isLayoutUserError,
  isLayoutBreakpointError
} from './errors';

// Validation exports
export {
  LayoutTypeSchema,
  LayoutBreakpointSchema,
  SidebarStateSchema,
  HeaderStyleSchema,
  FooterStyleSchema,
  UserRoleSchema,
  LayoutConfigSchema,
  HeaderActionSchema,
  NavigationItemSchema,
  UserPreferencesSchema,
  UserSchema,
  ResponsiveLayoutConfigSchema,
  TouchGestureConfigSchema,
  LayoutAnimationConfigSchema,
  validateLayoutConfig,
  validateNavigationItem,
  validateUser,
  validateHeaderAction,
  validateResponsiveLayoutConfig,
  validateTouchGestureConfig,
  validateLayoutAnimationConfig,
  safeValidateLayoutConfig,
  safeValidateNavigationItem,
  safeValidateUser,
  validateBreakpointOrder,
  validateLayoutConsistency,
  validateAccessibilityRequirements
} from './validation';

// Component exports
export { default as AppLayout } from './app-layout';
export { MobileHeader } from './mobile-header';
export { default as MobileNavigation } from './mobile-navigation';
export { Sidebar } from './sidebar';