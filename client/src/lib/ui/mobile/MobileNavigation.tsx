import React from 'react';
import { Home, Search, FileText, User, Scale } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@client/lib/design-system/utils/cn';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: <Home className="h-5 w-5" />, label: 'Home', path: '/' },
  { icon: <Search className="h-5 w-5" />, label: 'Search', path: '/search' },
  { icon: <FileText className="h-5 w-5" />, label: 'Bills', path: '/bills' },
  { icon: <Scale className="h-5 w-5" />, label: 'Accountability', path: '/accountability' },
  { icon: <User className="h-5 w-5" />, label: 'Profile', path: '/profile' },
];

export function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
