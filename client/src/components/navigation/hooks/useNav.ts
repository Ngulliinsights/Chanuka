import { useAuth } from '../../../hooks/use-auth';
import { useUnifiedNavigation } from '../../../hooks/use-unified-navigation';
import { DEFAULT_NAVIGATION_MAP } from '../constants';
import { canViewItem } from '../core/roleGuard';
import type { NavigationSection } from '../types';

export const useNav = (section?: NavigationSection) => {
  const { user } = useAuth();
  const { userRole } = useUnifiedNavigation();

  const items = DEFAULT_NAVIGATION_MAP.filter((it) => {
    if (section && it.section !== section) return false;
    return canViewItem(it, userRole, user);
  });

  return { items, userRole, isAuthenticated: !!user };
};
