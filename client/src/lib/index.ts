/**
 * Shared Module - UI Components, Design System, and Infrastructure
 *
 * Centralized export for shared UI components, design system primitives,
 * reusable interface elements, and technical infrastructure.
 *
 * This module now consolidates both UI concerns and infrastructure
 * following the architectural principle from SHARED_VS_CORE_ANALYSIS.md:
 * "shared/ handles UI concerns and infrastructure, core/ handles business logic"
 */

// ============================================================================
// Design System and UI Components
// ============================================================================

// Design System - Primary source for design tokens and components
export * from './design-system';

// Shared UI Components - Export only existing items
export {
  // Navigation components
  Navigation,
  DesktopSidebar,

  // Loading components
  LoadingIndicator,

  // Dashboard components
  UserDashboard,

  // Notification components
  NotificationCenter,
  NotificationItem,

  // Mobile components
  InfiniteScroll,
  AutoHideHeader,

  // Privacy components
  PrivacyManager,

  // Realtime components
  RealTimeDashboard,
  RealTimeNotifications,

  // Education components
  EducationalFramework,
  ConstitutionalContext,
} from './ui';

// ============================================================================
// Technical Infrastructure
// ============================================================================

// Infrastructure services (performance, error handling, browser compatibility, etc.)
export * from './infrastructure';

// Shared Hooks - Export only existing hooks
export { useProgressiveDisclosure } from './hooks';

// Shared Libraries - Export only non-conflicting items
// export {
//   ProtectedRoute,
//   queryClient,
//   queryKeys,
//   invalidateQueries,
//   prefetchQueries,
//   cacheUtils,
// } from './lib';

// Cross-cutting services - Export only existing services
// export {
//   notificationService,
// } from './services';

// Testing infrastructure
export * from './testing';

// ============================================================================
// Shared Utilities and Validation
// ============================================================================

// Validation utilities - Export specific items to avoid conflicts
export type { ValidationResult as SharedValidationResult } from './validation';

// Interface definitions - Export specific items to avoid conflicts
export type { UnifiedInterfaces } from './interfaces';

// Component templates
export * from './templates';
