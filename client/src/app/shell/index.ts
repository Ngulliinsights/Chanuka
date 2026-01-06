// Shell components for application infrastructure
export { AppShell } from './AppShell';
export { NavigationBar } from './NavigationBar';
export { AppRouter } from './AppRouter';
export {
  ProtectedRoute,
  AdminRoute,
  ModeratorRoute,
  VerifiedUserRoute,
  AuthenticatedRoute,
  createProtectedRoute,
} from './ProtectedRoute';
export { SkipLinks, SkipLink, useSkipLinkTargets, withSkipLinks } from './SkipLinks';

// Types
export type { default as AppShellProps } from './AppShell';
export type { default as NavigationBarProps } from './NavigationBar';
export type { default as ProtectedRouteProps } from './ProtectedRoute';
export type { default as SkipLinksProps } from './SkipLinks';
