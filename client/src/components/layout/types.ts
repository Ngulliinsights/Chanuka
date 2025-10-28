/**
 * Layout component type definitions
 * Following navigation component patterns for consistency
 */

import { ReactNode } from 'react';

export type LayoutType = 'app' | 'auth' | 'landing' | 'admin' | 'mobile';
export type LayoutBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';
export type HeaderStyle = 'default' | 'minimal' | 'transparent' | 'fixed';
export type FooterStyle = 'default' | 'minimal' | 'hidden' | 'sticky';

export interface LayoutConfig {
  type: LayoutType;
  showSidebar: boolean;
  showHeader: boolean;
  showFooter: boolean;
  sidebarState: SidebarState;
  headerStyle: HeaderStyle;
  footerStyle: FooterStyle;
  enableMobileOptimization: boolean;
  enableAccessibility: boolean;
  enablePerformanceOptimization: boolean;
}

export interface AppLayoutProps {
  children: ReactNode;
  config?: Partial<LayoutConfig>;
  className?: string;
  onLayoutChange?: (layout: LayoutConfig) => void;
  onError?: (error: Error) => void;
}

export interface MobileHeaderProps {
  title?: string;
  showLogo?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  onMenuToggle?: () => void;
  onSearchClick?: () => void;
  className?: string;
  leftActions?: HeaderAction[];
  rightActions?: HeaderAction[];
}

export interface HeaderAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  disabled?: boolean;
  className?: string;
}

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems?: NavigationItem[];
  user?: User | null;
  onLogout?: () => void;
  className?: string;
  enableSwipeGestures?: boolean;
  enableTouchOptimization?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  disabled?: boolean;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  section?: string;
  priority?: number;
}

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  navigationItems?: NavigationItem[];
  user?: User | null;
  className?: string;
  showSearch?: boolean;
  onSearchChange?: (query: string) => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  enableAnimations: boolean;
  enableNotifications: boolean;
  language: string;
}

export interface LayoutState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentBreakpoint: LayoutBreakpoint;
  sidebarState: SidebarState;
  isMenuOpen: boolean;
  isTransitioning: boolean;
  mounted: boolean;
}

export interface LayoutPerformanceMetrics {
  layoutShifts: number;
  renderTime: number;
  transitionDuration: number;
  memoryUsage: number;
  interactionDelay: number;
}

export interface LayoutAccessibilityFeatures {
  skipLinks: boolean;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  focusManagement: boolean;
}

export interface ResponsiveLayoutConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
  };
  sidebarBehavior: {
    mobile: SidebarState;
    tablet: SidebarState;
    desktop: SidebarState;
    wide: SidebarState;
  };
  headerBehavior: {
    mobile: HeaderStyle;
    tablet: HeaderStyle;
    desktop: HeaderStyle;
    wide: HeaderStyle;
  };
}

export interface LayoutValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: LayoutConfig;
}

export interface LayoutRecoveryOptions {
  fallbackLayout: LayoutType;
  enableGracefulDegradation: boolean;
  retryAttempts: number;
  resetToDefaults: boolean;
}

export interface TouchGestureConfig {
  enableSwipe: boolean;
  enablePinch: boolean;
  enableTap: boolean;
  swipeThreshold: number;
  tapTimeout: number;
  preventZoom: boolean;
}

export interface LayoutAnimationConfig {
  enableTransitions: boolean;
  transitionDuration: number;
  easing: string;
  enableGPUAcceleration: boolean;
  respectReducedMotion: boolean;
}

export interface LayoutThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
  borderRadius: string;
  fontFamily: string;
}

