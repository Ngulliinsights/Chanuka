import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Search, 
  Users, 
  BarChart3, 
  Shield, 
  Settings 
} from 'lucide-react';

import { cn } from '../../design-system/utils/cn';
import { Badge } from '../../design-system/primitives/Badge';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
}

interface NavigationProps {
  className?: string;
  items?: NavigationItem[];
  collapsed?: boolean;
}

const defaultItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: FileText,
    badge: 'New'
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: Search
  },
  {
    id: 'community',
    label: 'Community',
    href: '/community',
    icon: Users,
    badge: 12
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    id: 'security',
    label: 'Security',
    href: '/security',
    icon: Shield
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

/**
 * Main navigation component
 * Provides primary navigation for the application
 */
export default function Navigation({ 
  className, 
  items = defaultItems,
  collapsed = false 
}: NavigationProps) {
  const location = useLocation();

  return (
    <nav className={cn("flex flex-col space-y-1 p-2", className)}>
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground",
              item.disabled && "opacity-50 cursor-not-allowed",
              collapsed && "justify-center"
            )}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <Icon className={cn("h-4 w-4", collapsed ? "h-5 w-5" : "")} />
            
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}