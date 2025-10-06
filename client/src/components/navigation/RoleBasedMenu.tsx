import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Crown,
  Shield,
  Eye,
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigation } from '@/contexts/NavigationContext';
import { UserRole } from '@/types/navigation';
import { NavigationItem, useRoleBasedNavigation } from './RoleBasedNavigation';

interface RoleBasedMenuProps {
  trigger?: React.ReactNode;
  section?: 'user' | 'admin' | 'all';
  showRoleBadge?: boolean;
  showUserInfo?: boolean;
  className?: string;
}

/**
 * Get role display information
 */
const getRoleInfo = (role: UserRole) => {
  const roleConfig = {
    public: {
      label: 'Public User',
      icon: <Eye className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800',
      description: 'General public access'
    },
    citizen: {
      label: 'Citizen',
      icon: <User className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800',
      description: 'Registered citizen'
    },
    expert: {
      label: 'Expert',
      icon: <Shield className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800',
      description: 'Subject matter expert'
    },
    admin: {
      label: 'Administrator',
      icon: <Crown className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800',
      description: 'System administrator'
    },
    journalist: {
      label: 'Journalist',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800',
      description: 'Media professional'
    },
    advocate: {
      label: 'Advocate',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Policy advocate'
    }
  };

  return roleConfig[role] || roleConfig.public;
};

/**
 * Role-based dropdown menu component
 */
export const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({
  trigger,
  section = 'all',
  showRoleBadge = true,
  showUserInfo = true,
  className = ''
}) => {
  const { user, logout } = useAuth();
  const { userRole, navigateTo } = useNavigation();
  const { getNavigationItems, getItemsBySection } = useRoleBasedNavigation();

  const roleInfo = getRoleInfo(userRole);

  /**
   * Get menu items based on section filter
   */
  const getMenuItems = (): NavigationItem[] => {
    switch (section) {
      case 'user':
        return getItemsBySection('user');
      case 'admin':
        return getItemsBySection('admin');
      case 'all':
      default:
        return getNavigationItems();
    }
  };

  /**
   * Group items by section
   */
  const getGroupedItems = () => {
    const items = getMenuItems();
    const grouped: Record<string, NavigationItem[]> = {};

    items.forEach(item => {
      if (!grouped[item.section]) {
        grouped[item.section] = [];
      }
      grouped[item.section].push(item);
    });

    return grouped;
  };

  /**
   * Handle menu item click
   */
  const handleItemClick = (item: NavigationItem) => {
    navigateTo(item.href);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    logout();
  };

  /**
   * Default trigger if none provided
   */
  const defaultTrigger = (
    <Button variant="ghost" className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        {roleInfo.icon}
        <span className="hidden md:inline">{user?.displayName || user?.email || 'Menu'}</span>
      </div>
      <ChevronDown className="h-4 w-4" />
    </Button>
  );

  const menuTrigger = trigger || defaultTrigger;
  const groupedItems = getGroupedItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        {menuTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        {/* User Info Section */}
        {showUserInfo && user && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                {showRoleBadge && (
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${roleInfo.color}`}>
                      <span className="flex items-center space-x-1">
                        {roleInfo.icon}
                        <span>{roleInfo.label}</span>
                      </span>
                    </Badge>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Role Badge for non-authenticated users */}
        {showRoleBadge && !user && (
          <>
            <DropdownMenuLabel>
              <Badge className={`text-xs ${roleInfo.color}`}>
                <span className="flex items-center space-x-1">
                  {roleInfo.icon}
                  <span>{roleInfo.label}</span>
                </span>
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Navigation Items by Section */}
        {Object.entries(groupedItems).map(([sectionName, items], index) => (
          <React.Fragment key={sectionName}>
            {items.length > 0 && (
              <DropdownMenuGroup>
                {items.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.badge && item.badge > 0 && (
                      <DropdownMenuShortcut>
                        <Badge variant="destructive" className="text-xs">
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      </DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}
            {index < Object.entries(groupedItems).length - 1 && items.length > 0 && (
              <DropdownMenuSeparator />
            )}
          </React.Fragment>
        ))}

        {/* Logout Option */}
        {user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </>
        )}

        {/* Sign In Option for non-authenticated users */}
        {!user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigateTo('/auth')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Quick access menu for specific user roles
 */
export const AdminQuickMenu: React.FC<{ className?: string }> = ({ className }) => (
  <RoleBasedMenu
    section="admin"
    showUserInfo={false}
    className={className}
    trigger={
      <Button variant="outline" size="sm">
        <Crown className="h-4 w-4 mr-2" />
        Admin
      </Button>
    }
  />
);

/**
 * User account menu
 */
export const UserAccountMenu: React.FC<{ className?: string }> = ({ className }) => (
  <RoleBasedMenu
    section="user"
    showRoleBadge={false}
    className={className}
    trigger={
      <Button variant="ghost" size="sm">
        <User className="h-4 w-4 mr-2" />
        Account
      </Button>
    }
  />
);

/**
 * Role switcher component (for development/testing)
 */
export const RoleSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { userRole, updateUserRole } = useNavigation();

  const roles: UserRole[] = ['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'];

  const handleRoleChange = (role: UserRole) => {
    updateUserRole(role);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          {getRoleInfo(userRole).label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Switch Role (Dev Mode)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const roleInfo = getRoleInfo(role);
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleChange(role)}
              className={`flex items-center space-x-2 ${
                role === userRole ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              {roleInfo.icon}
              <span>{roleInfo.label}</span>
              {role === userRole && (
                <Badge variant="outline" className="ml-auto">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleBasedMenu;