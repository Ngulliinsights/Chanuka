import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationBreadcrumbsProps {
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
}

const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({ 
  className = '',
  showHomeIcon = true,
  maxItems = 5
}) => {
  const { breadcrumbs, navigateTo } = useNavigation();

  if (breadcrumbs.length === 0) {
    return null;
  }

  // Truncate breadcrumbs if they exceed maxItems
  const displayBreadcrumbs = breadcrumbs.length > maxItems 
    ? [
        breadcrumbs[0], // Always show home
        { label: '...', path: '', isActive: false }, // Ellipsis
        ...breadcrumbs.slice(-(maxItems - 2)) // Show last few items
      ]
    : breadcrumbs;

  const handleBreadcrumbClick = (path: string) => {
    if (path && path !== '...') {
      navigateTo(path);
    }
  };

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {displayBreadcrumbs.map((breadcrumb, index) => {
          const isLast = index === displayBreadcrumbs.length - 1;
          const isEllipsis = breadcrumb.label === '...';
          const isHome = breadcrumb.path === '/';

          return (
            <li key={`${breadcrumb.path}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
              
              {isEllipsis ? (
                <span className="text-gray-500 px-2">...</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                  disabled={isLast}
                  className={`h-auto p-1 font-medium ${
                    isLast 
                      ? 'text-gray-900 cursor-default hover:bg-transparent' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  <div className="flex items-center space-x-1">
                    {isHome && showHomeIcon && (
                      <Home className="h-4 w-4" />
                    )}
                    <span className="truncate max-w-[150px]">
                      {breadcrumb.label}
                    </span>
                  </div>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default NavigationBreadcrumbs;