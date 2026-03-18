import type { NavigationItem, UserRole } from '@client/lib/types';

export   if (item.requiresAuth && !user) return false;
  if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
  if (item.condition && !item.condition(role, user)) return false;
  return true;
};
