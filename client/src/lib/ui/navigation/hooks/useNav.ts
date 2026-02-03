import { useAuth } from '@client/core/auth';
import { useUnifiedNavigation } from '@client/core/navigation/hooks/use-unified-navigation';
import type { NavigationSection } from '@client/lib/types/navigation';

import { DEFAULT_NAVIGATION_MAP } from '../constants';
import { canViewItem } from '../core/roleGuard';

export const useNav = (section?: NavigationSection) => {
  const { user } = useAuth();
  const { userRole } = useUnifiedNavigation();

  const items = DEFAULT_NAVIGATION_MAP.filter(it => {
    if (section && it.section !== section) return false;
    return canViewItem(it, userRole, user);
  });

  return { items, userRole, isAuthenticated: !!user };
};
