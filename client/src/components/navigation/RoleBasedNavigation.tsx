import React from 'react';
import { 
  Home, 
  FileText, 
  Search, 
  User, 
  Settings, 
  Users,
  Shield,
  BarChart3,
  MessageSquare,
  Bell,
  Database,
  Eye,
  BookOpen,
  Gavel,
  TrendingUp,
  UserCheck,
  Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { useAuth } from '@/hooks/use-auth';
import { NavigationSection, UserRole } from '@/types/navigation';
import { 
  isNavigationPathActive, 
  getRoleBasedActiveClasses,
  getActiveIconClasses,
  getActiveTextClasses
} from '@/utils/navigation/active-state';
import { logger } from '../utils/logger';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  section: NavigationSection;
  description?: string;
  badge?: number;
  // Role-based access control
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
  adminOnly?: boolean;
  // Feature flags
  featureFlag?: string;
  // Conditional display
  condition?: (userRole: UserRole, user: any) => boolean;
  // Priority for ordering
  priority?: number;
}

interface RoleBasedNavigationProps {
  items?: NavigationItem[];
  section?: NavigationSection;
  layout?: 'vertical' | 'horizontal' | 'grid';
  showDescriptions?: boolean;
  showBadges?: boolean;
  className?: string;
  onNavigate?: (item: NavigationItem) => void;
  collapsed?: boolean;
}

// Default navigation items with comprehensive role-based configuration
const defaultNavigationItems: NavigationItem[] = [
  // Legislative section - Available to all users
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: <Home className="h-5 w-5" />,
    section: 'legislative',
    description: 'Main dashboard and overview',
    priority: 1
  },
  {
    id: 'bills',
    label: 'Bills Dashboard',
    href: '/bills',
    icon: <FileText className="h-5 w-5" />,
    section: 'legislative',
    description: 'Browse and search legislative bills',
    priority: 2
  },
  {
    id: 'bill-analysis',
    label: 'Bill Analysis',
    href: '/bill-sponsorship-analysis',
    icon: <BarChart3 className="h-5 w-5" />,
    section: 'legislative',
    description: 'Detailed analysis of bill sponsorship and impact',
    allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'],
    priority: 3
  },
  {
    id: 'bill-tracking',
    label: 'Bill Tracking',
    href: '/bill-tracking',
    icon: <TrendingUp className="h-5 w-5" />,
    section: 'legislative',
    description: 'Track bill progress and updates',
    requiresAuth: true,
    priority: 4
  },

  // Community section
  {
    id: 'community',
    label: 'Community Input',
    href: '/community',
    icon: <Users className="h-5 w-5" />,
    section: 'community',
    description: 'Community discussions and feedback',
    priority: 1
  },
  {
    id: 'expert-verification',
    label: 'Expert Verification',
    href: '/expert-verification',
    icon: <Shield className="h-5 w-5" />,
    section: 'community',
    description: 'Expert analysis and verification',
    allowedRoles: ['expert', 'admin'],
    priority: 2
  },
  {
    id: 'comments',
    label: 'Comments & Discussions',
    href: '/comments',
    icon: <MessageSquare className="h-5 w-5" />,
    section: 'community',
    description: 'Public comments and discussions',
    requiresAuth: true,
    priority: 3
  },

  // Tools section
  {
    id: 'search',
    label: 'Advanced Search',
    href: '/search',
    icon: <Search className="h-5 w-5" />,
    section: 'tools',
    description: 'Search bills, legislators, and content',
    priority: 1
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: <Bell className="h-5 w-5" />,
    section: 'tools',
    description: 'Your alerts and notifications',
    requiresAuth: true,
    priority: 2
  },

  // User section
  {
    id: 'dashboard',
    label: 'Personal Dashboard',
    href: '/dashboard',
    icon: <User className="h-5 w-5" />,
    section: 'user',
    description: 'Your personalized dashboard',
    requiresAuth: true,
    priority: 1
  },
  {
    id: 'profile',
    label: 'Profile Settings',
    href: '/profile',
    icon: <UserCheck className="h-5 w-5" />,
    section: 'user',
    description: 'Manage your profile and preferences',
    requiresAuth: true,
    priority: 2
  },
  {
    id: 'user-profile',
    label: 'Public Profile',
    href: '/user-profile',
    icon: <Eye className="h-5 w-5" />,
    section: 'user',
    description: 'Your public profile page',
    allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'],
    priority: 3
  },

  // Admin section
  {
    id: 'admin',
    label: 'Admin Panel',
    href: '/admin',
    icon: <Settings className="h-5 w-5" />,
    section: 'admin',
    description: 'System administration',
    adminOnly: true,
    priority: 1
  },
  {
    id: 'database-manager',
    label: 'Database Manager',
    href: '/database-manager',
    icon: <Database className="h-5 w-5" />,
    section: 'admin',
    description: 'Manage database and data imports',
    adminOnly: true,
    priority: 2
  },
  {
    id: 'user-management',
    label: 'User Management',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    section: 'admin',
    description: 'Manage user accounts and permissions',
    adminOnly: true,
    priority: 3
  }
];

/**
 * Role-based navigation component that filters and displays navigation items
 * based on user roles, authentication status, and other conditions
 */
export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  items = defaultNavigationItems,
  section,
  layout = 'vertical',
  showDescriptions = false,
  showBadges = true,
  className = '',
  onNavigate,
  collapsed = false
}) => {
  const { userRole, currentPath, navigateTo } = useUnifiedNavigation();
  const { user } = useAuth();

  /**
   * Check if a navigation item should be visible for the current user
   */
  const isItemVisible = (item: NavigationItem): boolean => {
    // Check admin-only items
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }

    // Check authentication requirement
    if (item.requiresAuth && !user) {
      return false;
    }

    // Check allowed roles
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
      return false;
    }

    // Check custom condition
    if (item.condition && !item.condition(userRole, user)) {
      return false;
    }

    // TODO: Add feature flag checking when feature flag system is implemented
    // if (item.featureFlag && !isFeatureEnabled(item.featureFlag)) {
    //   return false;
    // }

    return true;
  };

  /**
   * Check if a path is currently active using centralized logic
   */
  const isActivePath = (path: string): boolean => {
    return isNavigationPathActive(path, currentPath);
  };

  /**
   * Handle navigation item click
   */
  const handleItemClick = (item: NavigationItem) => {
    if (onNavigate) {
      onNavigate(item);
    } else {
      navigateTo(item.href);
    }
  };

  /**
   * Get filtered and sorted navigation items
   */
  const getFilteredItems = (): NavigationItem[] => {
    let filteredItems = items.filter(isItemVisible);

    // Filter by section if specified
    if (section) {
      filteredItems = filteredItems.filter(item => item.section === section);
    }

    // Sort by priority
    return filteredItems.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  };

  /**
   * Get consistent styling for items with enhanced active states using centralized utility
   */
  const getItemStyling = (item: NavigationItem): string => {
    const isActive = isActivePath(item.href);
    const isExpertItem = item.allowedRoles && item.allowedRoles.includes('expert');
    
    return getRoleBasedActiveClasses(isActive, item.adminOnly, isExpertItem);
  };

  /**
   * Render navigation item based on layout
   */
  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = isActivePath(item.href);
    const itemClasses = getItemStyling(item);

    // Collapsed state content - only show icon with tooltip
    if (collapsed) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleItemClick(item)}
          className={`
            w-full flex items-center justify-center p-2 rounded-lg relative group
            transition-all duration-300 ${itemClasses}
          `}
          title={`${item.label}${item.description ? ` - ${item.description}` : ''}`}
        >
          <div className="flex-shrink-0 relative">
            {item.icon}
            {showBadges && item.badge && item.badge > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 text-xs min-w-[16px] h-4 flex items-center justify-center p-0"
              >
                {item.badge > 9 ? '9+' : item.badge}
              </Badge>
            )}
          </div>
          
          {/* Tooltip for collapsed state */}
          <div className="
            absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-200 whitespace-nowrap z-50 pointer-events-none
          ">
            {item.label}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </button>
      );
    }

    // Expanded state content
    const content = (
      <>
        <div className="flex-shrink-0">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">{item.label}</span>
            {showBadges && item.badge && item.badge > 0 && (
              <Badge variant="destructive" className="flex-shrink-0 ml-2">
                {item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
          </div>
          {showDescriptions && item.description && (
            <p className="text-xs text-gray-500 mt-1 truncate">{item.description}</p>
          )}
        </div>
      </>
    );

    if (layout === 'horizontal') {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleItemClick(item)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${itemClasses}`}
          title={item.description}
        >
          {content}
        </button>
      );
    }

    if (layout === 'grid') {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleItemClick(item)}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-all duration-300 ${itemClasses}`}
          title={item.description}
        >
          <div className="flex-shrink-0">
            {item.icon}
          </div>
          <span className="font-medium text-sm text-center">{item.label}</span>
          {showBadges && item.badge && item.badge > 0 && (
            <Badge variant="destructive" className="text-xs">
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </button>
      );
    }

    // Default vertical layout
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item)}
        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 ${itemClasses}`}
        title={item.description}
      >
        {content}
      </button>
    );
  };

  const filteredItems = getFilteredItems();

  if (filteredItems.length === 0) {
    return null;
  }

  const containerClasses = {
    vertical: 'space-y-1',
    horizontal: 'flex flex-wrap gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
  };

  return (
    <nav className={`${containerClasses[layout]} ${className}`}>
      {filteredItems.map(renderNavigationItem)}
    </nav>
  );
};

/**
 * Hook to get role-based navigation items
 */
export const useRoleBasedNavigation = (section?: NavigationSection) => {
  const { userRole } = useUnifiedNavigation();
  const { user } = useAuth();

  const getNavigationItems = (items: NavigationItem[] = defaultNavigationItems): NavigationItem[] => {
    let filteredItems = items.filter(item => {
      // Check admin-only items
      if (item.adminOnly && userRole !== 'admin') {
        return false;
      }

      // Check authentication requirement
      if (item.requiresAuth && !user) {
        return false;
      }

      // Check allowed roles
      if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
        return false;
      }

      // Check custom condition
      if (item.condition && !item.condition(userRole, user)) {
        return false;
      }

      return true;
    });

    // Filter by section if specified
    if (section) {
      filteredItems = filteredItems.filter(item => item.section === section);
    }

    // Sort by priority
    return filteredItems.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  };

  const getItemsBySection = (targetSection: NavigationSection): NavigationItem[] => {
    return getNavigationItems().filter(item => item.section === targetSection);
  };

  const getAvailableSections = (): NavigationSection[] => {
    const sections = new Set<NavigationSection>();
    getNavigationItems().forEach(item => sections.add(item.section));
    return Array.from(sections);
  };

  return {
    getNavigationItems,
    getItemsBySection,
    getAvailableSections,
    userRole,
    isAuthenticated: !!user
  };
};

export default RoleBasedNavigation;