import {
  checkRouteAccess,
  getAccessDenialReason,
  getRequiredRoleForAccess,
} from '../utils/route-access';

describe('route-access', () => {
  describe('checkRouteAccess', () => {
    it('should allow access to public routes', () => {
      const result = checkRouteAccess('/', 'public', null);
      expect(result.canAccess).toBe(true);
      expect(result.denialReason).toBeNull();
    });

    it('should allow access to routes accessible by user role', () => {
      const result = checkRouteAccess('/bills', 'citizen', { id: '1' });
      expect(result.canAccess).toBe(true);
      expect(result.denialReason).toBeNull();
    });

    it('should deny access to admin routes for non-admin users', () => {
      const result = checkRouteAccess('/admin', 'citizen', { id: '1' });
      expect(result.canAccess).toBe(false);
      expect(result.denialReason).toBe('admin_required');
      expect(result.requiredRole).toEqual(['admin']);
    });

    it('should deny access to auth-required routes for unauthenticated users', () => {
      const result = checkRouteAccess('/dashboard', 'public', null);
      expect(result.canAccess).toBe(false);
      expect(result.denialReason).toBe('unauthenticated');
    });

    it('should deny access to role-restricted routes for insufficient roles', () => {
      const result = checkRouteAccess('/expert-verification', 'citizen', { id: '1' });
      expect(result.canAccess).toBe(false);
      expect(result.denialReason).toBe('insufficient_role');
      expect(result.requiredRole).toEqual(['expert', 'admin']);
    });
  });

  describe('getAccessDenialReason', () => {
    it('should return null for accessible routes', () => {
      const reason = getAccessDenialReason(null, 'public', null); // public route
      expect(reason).toBeNull();
    });

    it('should return admin_required for admin-only routes', () => {
      const adminItem = {
        id: 'admin',
        label: 'Admin',
        href: '/admin',
        icon: () => null,
        section: 'admin' as const,
        adminOnly: true,
      };
      const reason = getAccessDenialReason(adminItem, 'citizen', { id: '1' });
      expect(reason).toBe('admin_required');
    });

    it('should return unauthenticated for auth-required routes', () => {
      const authItem = {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: () => null,
        section: 'user' as const,
        requiresAuth: true,
      };
      const reason = getAccessDenialReason(authItem, 'public', null);
      expect(reason).toBe('unauthenticated');
    });
  });

  describe('getRequiredRoleForAccess', () => {
    it('should return null for accessible routes', () => {
      const roles = getRequiredRoleForAccess('/', 'public');
      expect(roles).toBeNull();
    });

    it('should return required roles for restricted routes', () => {
      const roles = getRequiredRoleForAccess('/expert-verification', 'citizen');
      expect(roles).toEqual(['expert', 'admin']);
    });

    it('should return null for non-existent routes', () => {
      const roles = getRequiredRoleForAccess('/non-existent', 'public');
      expect(roles).toBeNull();
    });
  });
});