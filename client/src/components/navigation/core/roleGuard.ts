import type { NavigationItem, UserRole } from '../types';

export const canViewItem = (item: NavigationItem, role: UserRole, user: any | null): boolean => {
  if (item.adminOnly && role !== 'admin') return false;
  if (item.requiresAuth && !user) return false;
  if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
  if (item.condition && !item.condition(role, user)) return false;
  return true;
};

