import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@client/shared/design-system/feedback/Badge';
import { Separator } from '@client/shared/design-system/feedback/separator';
import { Button } from '@client/shared/design-system/interactive/Button';

interface QuickAccessItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number;
  priority?: number;
}

interface QuickAccessNavProps {
  showTitle?: boolean;
  maxItems?: number;
  className?: string;
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: 'recent-bills',
    label: 'Recent Bills',
    href: '/bills',
    priority: 1,
  },
  {
    id: 'sponsorship-analysis',
    label: 'Sponsorship Analysis',
    href: '/bill-sponsorship-analysis',
    priority: 2,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    priority: 3,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    priority: 4,
  },
];

export const QuickAccessNav = React.memo<QuickAccessNavProps>(
  ({ showTitle = true, maxItems = 5, className = '' }) => {
    const location = useLocation();

    const sortedItems = React.useMemo(() => {
      return QUICK_ACCESS_ITEMS.sort((a, b) => (a.priority || 0) - (b.priority || 0)).slice(
        0,
        maxItems
      );
    }, [maxItems]);

    return (
      <div className={className}>
        {showTitle && (
          <>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Access</h3>
            <Separator className="mb-3" />
          </>
        )}
        <div className="space-y-1">
          {sortedItems.map(item => {
            const is_active =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <Link key={item.id} to={item.href}>
                <Button
                  variant={is_active ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  size="sm"
                >
                  <span className="text-sm">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }
);

export default QuickAccessNav;
