import { useNavigation } from '../core/navigation/context';
import { useKeyboardFocus } from './use-keyboard-focus';
import { logger } from '@shared/core';

/**
 * Unified navigation hook that combines both navigation contexts
 * Provides a single interface for all navigation-related functionality
 */
export function useUnifiedNavigation() {
  const navigation = useNavigation();
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
    
    // Responsive state (now included in navigation)
    isMobile: navigation.isMobile,
    sidebarCollapsed: navigation.sidebarCollapsed,
    mounted: navigation.mounted,
    
    // Accessibility state
    isKeyboardUser,
    
    // Navigation actions
    navigateTo: navigation.navigateTo,
    updateBreadcrumbs: navigation.updateBreadcrumbs,
    updateRelatedPages: navigation.updateRelatedPages,
    updateUserRole: navigation.updateUserRole,
    updatePreferences: navigation.updatePreferences,
    addToRecentPages: navigation.addToRecentPages,
    
    // Responsive actions (now included in navigation)
    toggleSidebar: navigation.toggleSidebar,
    setSidebarCollapsed: navigation.setSidebarCollapsed,
    isActive: navigation.isActive,

    // Accessibility actions
    getFocusClasses,
  };
}













































