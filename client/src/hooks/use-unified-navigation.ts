import { useNavigation } from '@/contexts/NavigationContext';
import { useResponsiveNavigation } from '@/contexts/ResponsiveNavigationContext';
import { useKeyboardFocus } from './use-keyboard-focus';
import { logger } from '../../../shared/core/src/observability/logging';

/**
 * Unified navigation hook that combines both navigation contexts
 * Provides a single interface for all navigation-related functionality
 */
export function useUnifiedNavigation() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();
  const { isKeyboardUser, getFocusClasses } = useKeyboardFocus();

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
    
    // Accessibility state
    isKeyboardUser,
    
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

    // Accessibility actions
    getFocusClasses,
  };
}







