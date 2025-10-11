import { useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useResponsiveNavigation } from '@/contexts/ResponsiveNavigationContext';
import { logger } from '../utils/logger.js';

/**
 * Hook to synchronize state between NavigationContext and ResponsiveNavigationContext
 * This ensures consistent navigation state across all components
 */
export function useNavigationSync() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();

  // Sync sidebar state between contexts
  useEffect(() => {
    // When main navigation sidebar state changes, update responsive navigation
    const shouldBeCollapsed = !navigation.sidebarOpen;
    if (responsiveNavigation.sidebarCollapsed !== shouldBeCollapsed) {
      responsiveNavigation.setSidebarCollapsed(shouldBeCollapsed);
    }
  }, [navigation.sidebarOpen, responsiveNavigation.sidebarCollapsed, responsiveNavigation.setSidebarCollapsed]);

  // Sync responsive navigation changes back to main navigation
  useEffect(() => {
    // When responsive navigation sidebar state changes, update main navigation
    const shouldBeOpen = !responsiveNavigation.sidebarCollapsed;
    if (navigation.sidebarOpen !== shouldBeOpen && responsiveNavigation.mounted) {
      // Only sync if the change is significant and we're mounted
      if (Math.abs(Date.now() - (window as any).lastSidebarToggle || 0) > 100) {
        navigation.toggleSidebar();
        (window as any).lastSidebarToggle = Date.now();
      }
    }
  }, [responsiveNavigation.sidebarCollapsed, navigation.sidebarOpen, navigation.toggleSidebar, responsiveNavigation.mounted]);

  return {
    // Unified toggle function that updates both contexts
    toggleSidebar: () => {
      (window as any).lastSidebarToggle = Date.now();
      navigation.toggleSidebar();
      responsiveNavigation.toggleSidebar();
    },
    
    // Unified active state checker
    isActive: responsiveNavigation.isActive,
    
    // Combined state
    isMobile: responsiveNavigation.isMobile,
    sidebarCollapsed: responsiveNavigation.sidebarCollapsed,
    sidebarOpen: navigation.sidebarOpen,
    mounted: responsiveNavigation.mounted,
    currentPath: navigation.currentPath,
    userRole: navigation.userRole,
  };
}