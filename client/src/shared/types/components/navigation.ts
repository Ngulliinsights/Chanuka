/**
 * Navigation Component Types - STANDARDIZED
 *
 * Standardized navigation component types following the exemplary patterns
 * Key improvements:
 * - Consistent naming and structure
 * - Proper type safety
 * - Comprehensive documentation
 */

import type { NavigationItem, BreadcrumbItem, UserRole } from '../navigation';

// ============================================================================
// Navigation Component Props
// ============================================================================

export type NavigationVariant = 'vertical' | 'horizontal' | 'mobile' | 'compact';
export type NavigationTheme = 'light' | 'dark' | 'system';

/**
 * Base navigation component props
 * Standardized pattern for all navigation components
 */
export interface NavigationComponentProps {
  items: NavigationItem[];
  currentPath?: string;
  userRole?: UserRole;
  variant?: NavigationVariant;
  theme?: NavigationTheme;
  className?: string;
  'aria-label'?: string;
}

/**
 * Sidebar navigation props
 * Extended navigation with sidebar-specific features
 */
export interface SidebarNavigationProps extends NavigationComponentProps {
  isCollapsed?: boolean;
  showToggle?: boolean;
  onToggle?: (collapsed: boolean) => void;
  footerContent?: React.ReactNode;
}

/**
 * Mobile navigation props
 * Specialized for mobile devices
 */
export interface MobileNavigationProps extends NavigationComponentProps {
  isOpen?: boolean;
  onClose?: () => void;
  showHamburger?: boolean;
  hamburgerAriaLabel?: string;
}

/**
 * Breadcrumb navigation props
 * Standardized breadcrumb component
 */
export interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Navigation bar props
 * Main application navigation bar
 */
export interface NavigationBarProps extends NavigationComponentProps {
  logo?: React.ReactNode;
  logoHref?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  userMenu?: React.ReactNode;
  notifications?: React.ReactNode;
}

/**
 * Navigation menu props
 * Dropdown/expandable navigation menu
 */
export interface NavigationMenuProps {
  items: NavigationItem[];
  trigger?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  'aria-label'?: string;
}