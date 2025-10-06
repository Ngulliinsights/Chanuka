import { useNavigation } from '@/contexts/NavigationContext';
import { useResponsiveNavigation } from '@/contexts/ResponsiveNavigationContext';

/**
 * Unified navigation hook that combines both navigation contexts
 * Provides a single interface for all navigation-related functionality
 */
export function useUnifiedNavigation() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();

  return {
    // Navigation state
    currentPath: navigation.currentPath,
    previousPath: navigation.previousPath,
    breadcrumbs: navigation.breadcrumbs,
    relatedPages: navigation.relatedPages,
    currentSection: navigation.currentSection,
    userRole: navigation.userRole,
    preferences: navigation.preferences,
    
    // Responsive state
    isMobile: responsiveNavigation.isMobile,
    sidebarCollapsed: responsiveNavigation.sidebarCollapsed,
    mounted: responsiveNavigation.mounted,
    
    // Legacy state (for backward compatibility)
    sidebarOpen: navigation.sidebarOpen,
    mobileMenuOpen: navigation.mobileMenuOpen,
    
    // Navigation actions
    navigateTo: navigation.navigateTo,
    updateBreadcrumbs: navigation.updateBreadcrumbs,
    updateRelatedPages: navigation.updateRelatedPages,
    updateUserRole: navigation.updateUserRole,
    updatePreferences: navigation.updatePreferences,
    addToRecentPages: navigation.addToRecentPages,
    
    // Responsive actions
    toggleSidebar: responsiveNavigation.toggleSidebar,
    setSidebarCollapsed: responsiveNavigation.setSidebarCollapsed,
    isActive: responsiveNavigation.isActive,
    
    // Legacy actions (for backward compatibility)
    toggleMobileMenu: navigation.toggleMobileMenu,
  };
}

/**
 * Hook specifically for responsive navigation features
 * Use this when you only need responsive functionality
 */
export function useResponsiveNavigationOnly() {
  return useResponsiveNavigation();
}

/**
 * Hook specifically for core navigation features
 * Use this when you only need core navigation functionality
 */
export function useNavigationOnly() {
  return useNavigation();
}