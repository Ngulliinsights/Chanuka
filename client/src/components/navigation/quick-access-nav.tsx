import React from 'react';
import { Star, Clock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigationPreferences } from '@/hooks/use-navigation-preferences';
import { Link, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger.js';

interface QuickAccessNavProps {
  className?: string;
  showTitle?: boolean;
  maxItems?: number;
}

const QuickAccessNav: React.FC<QuickAccessNavProps> = ({
  className = '',
  showTitle = true,
  maxItems = 5,
}) => {
  const { preferences } = useNavigationPreferences();
  const location = useLocation();

  const favoritePages = preferences.favoritePages.slice(0, maxItems);
  const recentPages = preferences.recentlyVisited
    .filter(page => page.path !== location.pathname) // Don't show current page
    .slice(0, maxItems);

  const getPageDisplayName = (path: string) => {
    const pathMap: Record<string, string> = {
      '/': 'Home',
      '/dashboard': 'Dashboard',
      '/bills': 'Bills',
      '/search': 'Search',
      '/profile': 'Profile',
      '/admin': 'Admin',
      '/community': 'Community',
      '/expert-verification': 'Expert Verification',
    };
    
    return pathMap[path] || path.split('/').pop() || path;
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  if (favoritePages.length === 0 && recentPages.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Favorite Pages */}
        {favoritePages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Favorites</span>
              <Badge variant="secondary" className="text-xs">
                {favoritePages.length}
              </Badge>
            </div>
            <div className="grid gap-1">
              {favoritePages.map((path) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isCurrentPath(path) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start h-8"
                  >
                    <Star className="h-3 w-3 mr-2 text-yellow-500 fill-current" />
                    {getPageDisplayName(path)}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Pages */}
        {recentPages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Recent</span>
              <Badge variant="secondary" className="text-xs">
                {recentPages.length}
              </Badge>
            </div>
            <div className="grid gap-1">
              {recentPages.map((page, index) => (
                <Link key={`${page.path}-${index}`} to={page.path}>
                  <Button
                    variant={isCurrentPath(page.path) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start h-8"
                  >
                    <Clock className="h-3 w-3 mr-2 text-blue-500" />
                    <span className="flex-1 text-left truncate">
                      {page.title || getPageDisplayName(page.path)}
                    </span>
                    {page.visitCount > 1 && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {page.visitCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickAccessNav;