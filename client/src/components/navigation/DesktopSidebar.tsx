import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Home, 
  FileText, 
  Search, 
  User, 
  Settings, 
  LogOut,
  Users,
  Shield,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { useAuth } from '@/hooks/use-auth';
import { useNavigationPerformance } from '@/hooks/use-navigation-performance';
import { useNavigationAccessibility } from '@/hooks/use-navigation-accessibility';
import { useKeyboardFocus } from '@/hooks/use-keyboard-focus';
import { NavigationSection } from '@/types/navigation';
import { RoleBasedNavigation, useRoleBasedNavigation } from './RoleBasedNavigation';
import { logger } from '../utils/logger.js';

// Enhanced type definitions for better type safety
interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly section: NavigationSection;
  readonly requiresAuth?: boolean;
  readonly adminOnly?: boolean;
  readonly badge?: number;
}

interface DesktopSidebarProps {
  readonly className?: string;
}

// Type-safe section configuration with readonly properties
interface SectionConfig {
  readonly section: NavigationSection;
  readonly items: NavigationItem[];
  readonly title: string;
}

// Enhanced user type with proper typing for displayName property
interface ExtendedUser {
  email: string;
  role: string;
  displayName?: string;
  [key: string]: any; // Allow for additional properties while maintaining type safety
}

// Constants moved outside component to prevent recreation on each render
const SECTION_TITLES: Record<NavigationSection, string> = {
  legislative: 'Legislative Data',
  community: 'Community',
  user: 'User Account',
  admin: 'Administration',
  tools: 'Tools'
} as const;

const SECTION_ORDER: readonly NavigationSection[] = [
  'legislative', 
  'community', 
  'tools', 
  'user', 
  'admin'
] as const;

const TRANSITION_CLASSES = {
  sidebar: 'chanuka-sidebar-transition',
  layout: 'chanuka-layout-transition',
  collapsed: 'chanuka-desktop-sidebar-collapsed',
  expanded: 'chanuka-desktop-sidebar-expanded'
} as const;

/**
 * Enhanced desktop sidebar component with comprehensive accessibility,
 * performance optimizations, and type safety improvements
 */
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ className = '' }) => {
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    currentPath, 
    currentSection,
    userRole,
    navigateTo,
    preferences 
  } = useUnifiedNavigation();
  
  const { user, logout } = useAuth();
  const { getItemsBySection } = useRoleBasedNavigation();
  
  // Performance and accessibility hooks with proper typing
  const { 
    useOptimizedCallback, 
    enableGPUAcceleration, 
    disableGPUAcceleration 
  } = useNavigationPerformance();
  
  const { 
    announce, 
    handleKeyboardNavigation, 
    getAriaAttributes,
    getAriaLabel 
  } = useNavigationAccessibility();
  
  const { getFocusClasses } = useKeyboardFocus();
  
  // Refs with proper typing for accessibility and performance
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  
  // Memoized helper function to get section title
  const getSectionTitle = useCallback((section: NavigationSection): string => {
    return SECTION_TITLES[section];
  }, []);

  // Performance optimization: Memoize section configuration with stable dependencies
  const memoizedSections = useMemo<SectionConfig[]>(() => {
    return SECTION_ORDER
      .map(section => ({
        section,
        items: getItemsBySection(section),
        title: getSectionTitle(section)
      }))
      .filter(({ items }) => items.length > 0);
  }, [getItemsBySection, getSectionTitle, userRole, user?.role]);
  
  // Enhanced keyboard navigation handler with proper dependency array
  const handleKeyDown = useOptimizedCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle escape key for sidebar collapse
    if (event.key === 'Escape' && !sidebarCollapsed) {
      event.preventDefault();
      toggleSidebar();
      toggleButtonRef.current?.focus();
      announce('Sidebar collapsed');
      return;
    }
    
    // Enhanced keyboard navigation with proper null checking
    if (navigationRef.current) {
      handleKeyboardNavigation(event, navigationRef.current, {
        orientation: 'vertical',
        wrap: true,
        homeEndKeys: true,
        typeAhead: true
      });
    }
  }, [sidebarCollapsed, toggleSidebar, handleKeyboardNavigation, announce]);
  
  // Accessibility: Screen reader announcements for sidebar state changes
  useEffect(() => {
    if (!sidebarRef.current) return;
    
    const announcement = sidebarCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded';
    
    // Create temporary announcement element with proper cleanup
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    
    document.body.appendChild(announcer);
    
    // Cleanup function with timeout ID for proper cleanup
    const timeoutId = setTimeout(() => {
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer);
      }
    }, 1000);
    
    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer);
      }
    };
  }, [sidebarCollapsed]);

  // Memoized navigation section renderer for performance
  const renderNavigationSection = useCallback((section: NavigationSection) => {
    const items = getItemsBySection(section);
    
    if (items.length === 0) {
      return null;
    }

    const sectionTitle = getSectionTitle(section);
    const transitionClasses = `transition-all duration-300 ${sidebarCollapsed ? 'mb-4' : 'mb-6'}`;

    return (
      <div key={section} className={transitionClasses}>
        {/* Section title - only shown when sidebar is expanded */}
        {!sidebarCollapsed && (
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3 transition-opacity duration-300">
            {sectionTitle}
          </h3>
        )}
        
        {/* Visual separator for collapsed state */}
        {sidebarCollapsed && items.length > 0 && (
          <div className="w-full h-px bg-gray-200 mb-2 mx-auto" />
        )}
        
        {/* Role-based navigation component */}
        <RoleBasedNavigation
          section={section}
          layout="vertical"
          showBadges={!sidebarCollapsed}
          showDescriptions={false}
          className={`space-y-1 transition-all duration-300 ${sidebarCollapsed ? 'px-1' : ''}`}
          collapsed={sidebarCollapsed}
        />
      </div>
    );
  }, [getItemsBySection, getSectionTitle, sidebarCollapsed]);

  // Memoized computed values for better performance
  const computedClasses = useMemo(() => {
    const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
    const collapseState = sidebarCollapsed ? TRANSITION_CLASSES.collapsed : TRANSITION_CLASSES.expanded;
    
    return {
      sidebar: [
        'hidden lg:flex flex-col bg-white border-r border-gray-200',
        TRANSITION_CLASSES.sidebar,
        collapseState,
        sidebarWidth,
        className
      ].filter(Boolean).join(' '),
      
      header: `relative p-4 border-b ${TRANSITION_CLASSES.layout}`,
      
      userSection: `border-b ${TRANSITION_CLASSES.layout} ${sidebarCollapsed ? 'p-2' : 'p-4'}`,
      
      footer: `p-4 border-t ${TRANSITION_CLASSES.layout}`,
      
      toggleButton: `
        transition-all duration-300 hover:bg-gray-100 rounded-md p-1 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${sidebarCollapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm' : ''}
      `.trim(),
      
      logoutButton: `
        w-full text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${sidebarCollapsed ? 'p-2 justify-center' : 'justify-start'}
      `.trim()
    };
  }, [sidebarCollapsed, className]);

  // Memoized ARIA attributes for better performance and type safety
  const ariaAttributes = useMemo(() => ({
    'aria-label': 'Main navigation',
    'aria-expanded': !sidebarCollapsed, // Boolean value instead of string
    'aria-hidden': false // Boolean value instead of string
  }), [sidebarCollapsed]);

  // Enhanced user info section with proper type safety
  const userInfoSection = useMemo(() => {
    if (!user) return null;

    // Type-safe property access with proper typing
    const typedUser = user as ExtendedUser;
    const displayName = typedUser.displayName ?? typedUser.email;

    return (
      <div className={computedClasses.userSection}>
        <div className={`
          flex items-center transition-all duration-300 rounded-lg
          ${sidebarCollapsed ? 'justify-center p-2' : 'space-x-3 p-3 bg-gray-50'}
        `}>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 transition-opacity duration-300 opacity-100">
              <p className="font-medium text-sm truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {typedUser.email}
              </p>
              <Badge variant="outline" className="text-xs mt-1">
                {typedUser.role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }, [user, sidebarCollapsed, computedClasses.userSection]);

  return (
    <aside 
      ref={sidebarRef}
      className={computedClasses.sidebar}
      onKeyDown={handleKeyDown}
      role="navigation"
      {...ariaAttributes} // Spread properly typed ARIA attributes
    >
      {/* Header Section */}
      <div className={computedClasses.header}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Logo Section */}
          <div className={`transition-all duration-300 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Logo 
              size="md" 
              showText={!sidebarCollapsed}
              className="flex-shrink-0"
              textClassName="font-semibold text-lg transition-opacity duration-300 opacity-100"
            />
          </div>
          
          {/* Toggle Button with enhanced accessibility and proper boolean type */}
          <Button 
            ref={toggleButtonRef}
            variant="ghost" 
            size="sm" 
            onClick={toggleSidebar}
            className={computedClasses.toggleButton}
            aria-label={sidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            aria-expanded={!sidebarCollapsed} // Proper boolean value
            aria-controls="sidebar-navigation"
            type="button"
          >
            <div className="transition-transform duration-300">
              {!sidebarCollapsed ? (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
          </Button>
        </div>
      </div>

      {/* User Information Section */}
      {userInfoSection}

      {/* Navigation Section */}
      <ScrollArea className="flex-1 p-4">
        <nav 
          ref={navigationRef}
          id="sidebar-navigation"
          className={preferences.compactMode ? 'space-y-2' : 'space-y-4'}
          role="navigation"
          aria-label="Main navigation menu"
        >
          {memoizedSections.map(({ section }) => renderNavigationSection(section))}
        </nav>
      </ScrollArea>

      {/* Footer Section */}
      {user && (
        <div className={computedClasses.footer}>
          <Button
            variant="ghost"
            onClick={logout}
            className={computedClasses.logoutButton}
            aria-label="Sign out of your account"
            type="button"
          >
            <LogOut className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} aria-hidden="true" />
            {!sidebarCollapsed && (
              <span className="transition-opacity duration-300 opacity-100">
                Sign Out
              </span>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
};

export default DesktopSidebar;