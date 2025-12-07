/**
 * Navigation Hooks - Unified consolidated navigation hook functionality
 * 
 * This module provides all navigation-related hooks, consolidating:
 * - Navigation system state (unified from useUnifiedNavigation)
 * - Keyboard navigation shortcuts
 * - Breadcrumb management
 * - Related pages functionality
 * - Navigation preferences
 * - Sidebar state management
 * - Mobile menu state management
 * 
 * All hooks are built on top of the shared useNavigation context.
 */

import { useNavigation } from './context';

/**
 * Main navigation hook - provides all navigation functionality
 * Replaces useUnifiedNavigation, useNavigationSync, etc.
 * 
 * @returns All navigation system state and methods
 */
export function useNavigationSystem() {
  return useNavigation();
}

// Alias for compatibility
export const useUnifiedNavigation = useNavigationSystem;

/**
 * Hook for keyboard navigation support with shortcut handling
 * 
 * Keyboard shortcuts:
 * - Ctrl/Cmd + B: Toggle sidebar
 * - Ctrl/Cmd + M: Toggle mobile menu
 * - Escape: Close mobile menu if open
 * 
 * @returns Navigation state plus handleKeyDown event handler
 */
export function useKeyboardNavigation() {
  const navigation = useNavigation();
  
  const handleKeyDown = (event: KeyboardEvent) => {
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
    
    if (event.key === 'Escape' && navigation.mobileMenuOpen) {
      navigation.toggleMobileMenu();
    }
  };
  
  return {
    handleKeyDown,
    ...navigation,
  };
}

/**
 * Hook for breadcrumb navigation management
 * 
 * @returns Breadcrumbs state and update function
 */
export function useBreadcrumbs() {
  const { breadcrumbs, updateBreadcrumbs } = useNavigation();
  
  return { breadcrumbs, updateBreadcrumbs };
}

/**
 * Hook for related pages functionality
 * 
 * @returns Related pages state and update function
 */
export function useRelatedPages() {
  const { relatedPages, updateRelatedPages } = useNavigation();
  
  return { relatedPages, updateRelatedPages };
}

/**
 * Hook for navigation preferences management
 * 
 * @returns User preferences state and update function
 */
export function useNavigationPreferences() {
  const { preferences, updatePreferences } = useNavigation();
  
  return { preferences, updatePreferences };
}

/**
 * Hook for sidebar state management with mobile awareness
 * 
 * @returns Sidebar state with convenient naming (isOpen, isCollapsed, isMobile, toggle, setCollapsed)
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
 * 
 * @returns Mobile menu state with convenient naming (isOpen, toggle, isMobile)
 */
export function useMobileMenu() {
  const { mobileMenuOpen, toggleMobileMenu, isMobile } = useNavigation();
  
  return {
    isOpen: mobileMenuOpen,
    toggle: toggleMobileMenu,
    isMobile,
  };
}

