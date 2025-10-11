import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Users,
  Shield,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { useAuth } from '@/hooks/use-auth';
import { useNavigationPerformance } from '@/hooks/use-navigation-performance';
import { useNavigationAccessibility } from '@/hooks/use-navigation-accessibility';
import { useKeyboardFocus } from '@/hooks/use-keyboard-focus';
import { NavigationSection } from '@/types/navigation';
import { RoleBasedNavigation, useRoleBasedNavigation } from './RoleBasedNavigation';
import { 
import { logger } from '../utils/logger.js';
  isNavigationPathActive, 
  getActiveStateClasses,
  getActiveIconClasses,
  getActiveTextClasses
} from '@/utils/navigation/active-state';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: NavigationSection;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  badge?: number;
}

const MobileNavigation: React.FC = () => {
  const { 
    currentPath, 
    currentSection,
    userRole,
    navigateTo 
  } = useUnifiedNavigation();
  
  const { user, logout } = useAuth();
  
  // Local state for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);
  
  // Performance and accessibility hooks
  const { 
    useOptimizedCallback, 
    enableGPUAcceleration, 
    disableGPUAcceleration 
  } = useNavigationPerformance();
  
  const { 
    announce, 
    handleKeyboardNavigation, 
    createFocusTrap,
    getAriaAttributes,
    getAriaLabel 
  } = useNavigationAccessibility();
  
  const { getFocusClasses } = useKeyboardFocus();
  
  // Refs for accessibility and performance
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const focusTrapCleanupRef = useRef<(() => void) | null>(null);
  
  // Enhanced keyboard navigation handler for drawer with accessibility
  const handleDrawerKeyDown = useOptimizedCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      toggleMobileMenu();
      menuButtonRef.current?.focus();
      announce('Navigation menu closed');
      return;
    }
    
    // Use enhanced keyboard navigation from accessibility hook
    if (navigationRef.current) {
      handleKeyboardNavigation(event, navigationRef.current, {
        orientation: 'vertical',
        wrap: true,
        homeEndKeys: true,
        typeAhead: true
      });
    }
  }, [toggleMobileMenu, handleKeyboardNavigation, announce]);
  
  // Enhanced keyboard navigation handler for bottom navigation
  const handleBottomNavKeyDown = useOptimizedCallback((event: React.KeyboardEvent) => {
    if (bottomNavRef.current) {
      handleKeyboardNavigation(event, bottomNavRef.current, {
        orientation: 'horizontal',
        wrap: true,
        homeEndKeys: false,
        typeAhead: false
      });
    }
  }, [handleKeyboardNavigation]);
  
  // Performance optimization: Memoize filtered navigation items
  const memoizedNavigationItems = React.useMemo(() => {
    return navigationItems.filter(item => {
      if (item.adminOnly && userRole !== 'admin') return false;
      if (item.requiresAuth && !user) return false;
      return true;
    });
  }, [userRole, user]);
  
  // Enhanced accessibility: Focus management and GPU acceleration for drawer
  useEffect(() => {
    if (mobileMenuOpen && drawerRef.current) {
      // Enable GPU acceleration for smooth drawer animation
      enableGPUAcceleration(drawerRef.current);
      
      // Create focus trap for drawer
      focusTrapCleanupRef.current = createFocusTrap(drawerRef.current);
      
      // Announce drawer opening
      announce('Navigation menu opened');
    } else if (!mobileMenuOpen && drawerRef.current) {
      // Disable GPU acceleration after drawer closes
      disableGPUAcceleration(drawerRef.current);
      
      // Clean up focus trap
      if (focusTrapCleanupRef.current) {
        focusTrapCleanupRef.current();
        focusTrapCleanupRef.current = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (focusTrapCleanupRef.current) {
        focusTrapCleanupRef.current();
      }
    };
  }, [mobileMenuOpen, enableGPUAcceleration, disableGPUAcceleration, createFocusTrap, announce]);

  const navigationItems: NavigationItem[] = [
    // Legislative section
    {
      label: 'Home',
      href: '/',
      icon: <Home className="h-5 w-5" />,
      section: 'legislative'
    },
    {
      label: 'Bills',
      href: '/bills',
      icon: <FileText className="h-5 w-5" />,
      section: 'legislative'
    },
    {
      label: 'Bill Analysis',
      href: '/bill-sponsorship-analysis',
      icon: <BarChart3 className="h-5 w-5" />,
      section: 'legislative'
    },
    
    // Community section
    {
      label: 'Community Input',
      href: '/community',
      icon: <Users className="h-5 w-5" />,
      section: 'community'
    },
    {
      label: 'Expert Verification',
      href: '/expert-verification',
      icon: <Shield className="h-5 w-5" />,
      section: 'community',
      requiresAuth: true
    },
    
    // Tools section
    {
      label: 'Search',
      href: '/search',
      icon: <Search className="h-5 w-5" />,
      section: 'tools'
    },
    
    // User section
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <User className="h-5 w-5" />,
      section: 'user',
      requiresAuth: true
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: <User className="h-5 w-5" />,
      section: 'user',
      requiresAuth: true
    },
    
    // Admin section
    {
      label: 'Admin Panel',
      href: '/admin',
      icon: <Settings className="h-5 w-5" />,
      section: 'admin',
      adminOnly: true
    }
  ];

  const handleNavigation = (href: string) => {
    navigateTo(href);
    toggleMobileMenu();
  };

  const handleLogout = () => {
    logout();
    toggleMobileMenu();
  };

  const isActivePath = (path: string) => {
    return isNavigationPathActive(path, currentPath);
  };

  const getFilteredNavigationItems = () => {
    return navigationItems.filter(item => {
      // Filter admin-only items
      if (item.adminOnly && userRole !== 'admin') {
        return false;
      }
      
      // Filter auth-required items for public users
      if (item.requiresAuth && !user) {
        return false;
      }
      
      return true;
    });
  };

  const getSectionItems = (section: NavigationSection) => {
    return getFilteredNavigationItems().filter(item => item.section === section);
  };

  const getBottomNavigationItems = () => {
    const filteredItems = getFilteredNavigationItems();
    
    // Priority items for bottom navigation
    const priorityItems = [
      'Home',
      'Bills', 
      'Dashboard',
      'Search'
    ];
    
    // If user is not authenticated, show different items
    if (!user) {
      return filteredItems.filter(item => 
        ['Home', 'Bills', 'Search', 'Community Input'].includes(item.label)
      ).slice(0, 4);
    }
    
    // For authenticated users, prioritize dashboard access
    const bottomItems: NavigationItem[] = [];
    
    // Add priority items first
    priorityItems.forEach(label => {
      const item = filteredItems.find(item => item.label === label);
      if (item && bottomItems.length < 4) {
        bottomItems.push(item);
      }
    });
    
    // Fill remaining slots with other important items
    if (bottomItems.length < 4) {
      const remainingItems = filteredItems.filter(item => 
        !bottomItems.some(bottomItem => bottomItem.href === item.href) &&
        !item.adminOnly
      );
      
      bottomItems.push(...remainingItems.slice(0, 4 - bottomItems.length));
    }
    
    return bottomItems.slice(0, 4);
  };

  const getSectionTitle = (section: NavigationSection) => {
    const titles: Record<NavigationSection, string> = {
      legislative: 'Legislative Data',
      community: 'Community',
      user: 'User Account',
      admin: 'Administration',
      tools: 'Tools'
    };
    return titles[section];
  };

  const renderNavigationSection = (section: NavigationSection) => {
    const items = getSectionItems(section);
    if (items.length === 0) return null;

    return (
      <div key={section} className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          {getSectionTitle(section)}
        </h3>
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left ${
                getActiveStateClasses(isActivePath(item.href), 'mobile-drawer')
              }`}
              aria-label={`Navigate to ${item.label}`}
            >
              <div className={getActiveIconClasses(isActivePath(item.href))}>
                {item.icon}
              </div>
              <span className={`flex-1 ${getActiveTextClasses(isActivePath(item.href))}`}>
                {item.label}
              </span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <header 
        className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-40 safe-area-inset-top"
        role="banner"
      >
        <div className="flex items-center space-x-3">
          <Button 
            ref={menuButtonRef}
            variant="ghost" 
            size="sm" 
            onClick={toggleMobileMenu} 
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            className="p-2 touch-manipulation hover:bg-gray-100 active:bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">Chanuka</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {user && (
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2 touch-manipulation hover:bg-gray-100 active:bg-gray-200 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {/* Optional notification badge */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </Button>
          )}
          {!user && (
            <Button 
              size="sm" 
              onClick={() => navigateTo('/auth')}
              className="px-4 py-2 touch-manipulation hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={toggleMobileMenu}>
        <SheetContent 
          side="left" 
          className="w-80 p-0 safe-area-inset-left"
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          onKeyDown={handleDrawerKeyDown}
        >
          <div ref={drawerRef} className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm" aria-hidden="true">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span id="drawer-title" className="font-semibold text-lg text-gray-900">Chanuka Navigation</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleMobileMenu}
                className="p-2 touch-manipulation hover:bg-gray-200 active:bg-gray-300 transition-colors rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-gray-900">{user.name || user.email}</p>
                    <p className="text-xs text-gray-600 truncate">{user.email}</p>
                    <Badge variant="outline" className="text-xs mt-2 bg-white">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Sections */}
            <nav 
              ref={navigationRef}
              className="flex-1 overflow-y-auto px-4 py-2"
              role="navigation"
              aria-label="Main navigation sections"
            >
              {renderNavigationSection('legislative')}
              {renderNavigationSection('community')}
              {renderNavigationSection('tools')}
              {renderNavigationSection('user')}
              {renderNavigationSection('admin')}
            </nav>

            {/* Footer Actions */}
            {user && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors p-3 touch-manipulation rounded-lg"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation for Mobile */}
      <nav 
        ref={bottomNavRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom"
        role="navigation"
        aria-label="Bottom navigation"
        onKeyDown={handleBottomNavKeyDown}
      >
        <div className="flex items-center justify-around px-2 py-3">
          {getBottomNavigationItems().map((item, index) => (
            <button
              key={item.href}
              type="button"
              onClick={() => navigateTo(item.href)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl min-w-[60px] touch-manipulation focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                getActiveStateClasses(isActivePath(item.href), 'mobile-bottom')
              }`}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActivePath(item.href) ? 'page' : undefined}
              tabIndex={0}
            >
              <div className="relative">
                <div className={getActiveIconClasses(isActivePath(item.href))}>
                  {React.cloneElement(item.icon as React.ReactElement, { 'aria-hidden': true })}
                </div>
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs ${getActiveTextClasses(isActivePath(item.href))}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;