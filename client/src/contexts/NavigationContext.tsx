/**
 * ADAPTER: NavigationContext - Maintains backward compatibility
 * This file provides a React-specific adapter for the shared navigation system
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createNavigationProvider, useNavigation } from '../core/navigation';
import { useAuth } from '../hooks/use-auth';
import { useMediaQuery } from '../hooks/use-mobile';

// Create the React-specific provider
const NavigationProvider = createNavigationProvider(
  useLocation,
  useNavigate,
  useAuth,
  useMediaQuery
);

// Export with original name for backward compatibility
export { NavigationProvider };

// Export hook with original name
export { useNavigation };

// Re-export types for backward compatibility
export type {
  NavigationSection,
  UserRole,
  BreadcrumbItem,
  RelatedPage,
  RecentPage,
  NavigationPreferences,
  NavigationState,
  NavigationContextValue
} from '../core/navigation/types';

// Re-export hooks for backward compatibility
export {
  useNavigationSystem,
  useKeyboardNavigation,
  useBreadcrumbs,
  useRelatedPages,
  useNavigationPreferences,
  useSidebar,
  useMobileMenu
} from '../core/navigation/hooks';

// Backward compatibility for old hook names
export const useUnifiedNavigation = () => {
  const navigation = useNavigation();
  
  return {
    // Navigation state
    currentPath: navigation.currentPath,
    previousPath: navigation.previousPath,
    breadcrumbs: navigation.breadcrumbs,
    relatedPages: navigation.relatedPages,
    currentSection: navigation.currentSection,
    userRole: navigation.userRole,
    preferences: navigation.preferences,
    
    // Responsive state (merged from ResponsiveNavigationContext)
    isMobile: navigation.isMobile,
    sidebarCollapsed: navigation.sidebarCollapsed,
    mounted: navigation.mounted,
    
    // Navigation actions
    navigateTo: navigation.navigateTo,
    updateBreadcrumbs: navigation.updateBreadcrumbs,
    updateRelatedPages: navigation.updateRelatedPages,
    updateUserRole: navigation.updateUserRole,
    updatePreferences: navigation.updatePreferences,
    addToRecentPages: navigation.addToRecentPages,
    
    // Responsive actions
    toggleSidebar: navigation.toggleSidebar,
    setSidebarCollapsed: navigation.setSidebarCollapsed,
    isActive: navigation.isActive,
  };
};

// Deprecated - use useNavigation instead
export const useResponsiveNavigation = () => {
  console.warn('useResponsiveNavigation is deprecated. Use useNavigation instead.');
  const navigation = useNavigation();
  
  return {
    isMobile: navigation.isMobile,
    sidebarCollapsed: navigation.sidebarCollapsed,
    mounted: navigation.mounted,
    toggleSidebar: navigation.toggleSidebar,
    isActive: navigation.isActive,
    setSidebarCollapsed: navigation.setSidebarCollapsed,
  };
};

