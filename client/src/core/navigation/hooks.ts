/**
 * Navigation Hooks - Consolidated navigation hook functionality
 */

import { useNavigation } from './context';

/**
 * Main navigation hook - provides all navigation functionality
 * Replaces useUnifiedNavigation, useNavigationSync, etc.
 */
export function useNavigationSystem() {
  return useNavigation();
}

/**
 * Hook for keyboard navigation support
 */
export function useKeyboardNavigation() {
  const navigation = useNavigation();
  
  const handleKeyDown = (event: KeyboardEvent) => {
    // Handle keyboard shortcuts for navigation
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          navigation.toggleSidebar();
          break;
        case 'm':
          event.preventDefault();
          navigation.toggleMobileMenu();
          break;
      }
    }
    
    // Handle escape key
    if (event.key === 'Escape') {
      if (navigation.mobileMenuOpen) {
        navigation.toggleMobileMenu();
      }
    }
  };
  
  return {
    handleKeyDown,
    ...navigation,
  };
}

/**
 * Hook for breadcrumb navigation
 */
export function useBreadcrumbs() {
  const { breadcrumbs, updateBreadcrumbs } = useNavigation();
  
  return {
    breadcrumbs,
    updateBreadcrumbs,
  };
}

/**
 * Hook for related pages functionality
 */
export function useRelatedPages() {
  const { relatedPages, updateRelatedPages } = useNavigation();
  
  return {
    relatedPages,
    updateRelatedPages,
  };
}

/**
 * Hook for navigation preferences
 */
export function useNavigationPreferences() {
  const { preferences, updatePreferences } = useNavigation();
  
  return {
    preferences,
    updatePreferences,
  };
}

/**
 * Hook for sidebar state management
 */
export function useSidebar() {
  const { 
    sidebarOpen, 
    sidebarCollapsed, 
    isMobile, 
    toggleSidebar, 
    setSidebarCollapsed 
  } = useNavigation();
  
  return {
    isOpen: sidebarOpen,
    isCollapsed: sidebarCollapsed,
    isMobile,
    toggle: toggleSidebar,
    setCollapsed: setSidebarCollapsed,
  };
}

/**
 * Hook for mobile menu state management
 */
export function useMobileMenu() {
  const { mobileMenuOpen, toggleMobileMenu, isMobile } = useNavigation();
  
  return {
    isOpen: mobileMenuOpen,
    toggle: toggleMobileMenu,
    isMobile,
  };
}