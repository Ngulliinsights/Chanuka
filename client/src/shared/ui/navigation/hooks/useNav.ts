import { useUnifiedNavigation } from '@client/core/navigation/hooks/use-unified-navigation';
import { useAuth } from '@client/core/auth';
import type { NavigationSection } from '@client/types/navigation';

import { DEFAULT_NAVIGATION_MAP } from '../constants';
import { canViewItem } from '../core/roleGuard';


export const useNav = (section?: NavigationSection) => {
  const { user } = useAuth();
  const { user_role } = useUnifiedNavigation();

  const items = DEFAULT_NAVIGATION_MAP.filter((it) => {
    if (section && it.section !== section) return false;
    return canViewItem(it, user_role, user);
  });

  return { items, user_role, isAuthenticated: !!user };
};

