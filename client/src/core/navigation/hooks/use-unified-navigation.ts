import { useKeyboardFocus } from '@/hooks/use-keyboard-focus';
import { logger } from '@/utils/logger';

import { useNavigation } from '../context';

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
    user_role: navigation.user_role,
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
    is_active: navigation.is_active,

    // Accessibility actions
    getFocusClasses,
  };
}













































