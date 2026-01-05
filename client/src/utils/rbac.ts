/**
 * Role-Based Access Control (RBAC) Utilities
 * Comprehensive permission management system
 */

import { User } from '@/core/auth';
// import { authService } from '@/services/AuthService';

export interface RBACContext {
  user: User;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}
import { logger } from './logger';

// Permission definitions
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  level: number;
  permissions: Permission[];
  inherits?: string[]; // Role inheritance
}

// Built-in roles and permissions
export const ROLES: Record<string, Role> = {
  GUEST: {
    id: 'guest',
    name: 'Guest',
    level: 0,
    permissions: [
      { resource: 'bills', action: 'read' },
      { resource: 'public_comments', action: 'read' },
      { resource: 'public_analysis', action: 'read' }
    ]
  },
  CITIZEN: {
    id: 'citizen',
    name: 'Citizen',
    level: 1,
    inherits: ['guest'],
    permissions: [
      { resource: 'bills', action: 'read' },
      { resource: 'bills', action: 'save' },
      { resource: 'comments', action: 'create' },
      { resource: 'comments', action: 'read' },
      { resource: 'comments', action: 'update', conditions: { owner: true } },
      { resource: 'comments', action: 'delete', conditions: { owner: true } },
      { resource: 'profile', action: 'read', conditions: { owner: true } },
      { resource: 'profile', action: 'update', conditions: { owner: true } },
      { resource: 'notifications', action: 'read', conditions: { owner: true } },
      { resource: 'engagement', action: 'track' }
    ]
  },
  EXPERT: {
    id: 'expert',
    name: 'Expert',
    level: 2,
    inherits: ['citizen'],
    permissions: [
      { resource: 'analysis', action: 'create' },
      { resource: 'analysis', action: 'update', conditions: { owner: true } },
      { resource: 'expert_insights', action: 'create' },
      { resource: 'verification', action: 'request' },
      { resource: 'comments', action: 'moderate', conditions: { expertise_area: true } }
    ]
  },
  MODERATOR: {
    id: 'moderator',
    name: 'Moderator',
    level: 3,
    inherits: ['expert'],
    permissions: [
      { resource: 'comments', action: 'moderate' },
      { resource: 'comments', action: 'delete' },
      { resource: 'users', action: 'warn' },
      { resource: 'content', action: 'flag' },
      { resource: 'reports', action: 'review' }
    ]
  },
  ADMIN: {
    id: 'admin',
    name: 'Administrator',
    level: 4,
    inherits: ['moderator'],
    permissions: [
      { resource: '*', action: '*' }, // Full access
      { resource: 'users', action: 'manage' },
      { resource: 'system', action: 'configure' },
      { resource: 'analytics', action: 'access' },
      { resource: 'audit', action: 'access' }
    ]
  }
};

// Resource definitions
export const RESOURCES = {
  BILLS: 'bills',
  COMMENTS: 'comments',
  ANALYSIS: 'analysis',
  PROFILE: 'profile',
  USERS: 'users',
  SYSTEM: 'system',
  NOTIFICATIONS: 'notifications',
  ENGAGEMENT: 'engagement',
  EXPERT_INSIGHTS: 'expert_insights',
  VERIFICATION: 'verification',
  CONTENT: 'content',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  AUDIT: 'audit'
} as const;

// Actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SAVE: 'save',
  MODERATE: 'moderate',
  MANAGE: 'manage',
  CONFIGURE: 'configure',
  ACCESS: 'access',
  TRACK: 'track',
  FLAG: 'flag',
  WARN: 'warn',
  REVIEW: 'review',
  REQUEST: 'request'
} as const;

class RBACManager {
  private permissionCache = new Map<string, boolean>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheClean = Date.now();

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user has permission for a specific action
   */
  async hasPermission(
    user: User | null,
    resource: string,
    action: string,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Guest access for public resources
      if (!user) {
        return this.checkGuestPermission(resource, action);
      }

      // Check cache first
      const cacheKey = this.getCacheKey(user.id, resource, action, conditions);
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Check local permissions first (faster)
      const localResult = this.checkLocalPermission(user, resource, action, conditions);
      if (localResult !== null) {
        this.setCache(cacheKey, localResult);
        return localResult;
      }

      // Fall back to backend check for complex permissions
      // TODO: Implement backend permission checking when available
      // const context: RBACContext = { user, resource, action, conditions };

      // For now, use local permission checking since the backend service doesn't have this method
      // In a full implementation, you would call the backend here
      const result = this.checkLocalPermission(user, resource, action, conditions) ?? false;
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Permission check failed:', {
        component: 'RBACManager',
        user: user?.id,
        resource,
        action
      }, error);

      // Fail securely - deny access on error
      return false;
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    user: User | null,
    permissions: Array<{ resource: string; action: string; conditions?: Record<string, any> }>
  ): Promise<boolean[]> {
    const results = await Promise.all(
      permissions.map(p => this.hasPermission(user, p.resource, p.action, p.conditions))
    );
    return results;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    user: User | null,
    permissions: Array<{ resource: string; action: string; conditions?: Record<string, any> }>
  ): Promise<boolean> {
    const results = await this.hasPermissions(user, permissions);
    return results.some(result => result);
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    user: User | null,
    permissions: Array<{ resource: string; action: string; conditions?: Record<string, any> }>
  ): Promise<boolean> {
    const results = await this.hasPermissions(user, permissions);
    return results.every(result => result);
  }

  // ============================================================================
  // Local Permission Checking
  // ============================================================================

  /**
   * Check permissions locally without backend call
   */
  private checkLocalPermission(
    user: User,
    resource: string,
    action: string,
    conditions?: Record<string, any>
  ): boolean | null {
    try {
      const userRole = ROLES[user.role.toUpperCase()];
      if (!userRole) {
        return null; // Unknown role, defer to backend
      }

      // Admin has full access
      if (userRole.id === 'admin') {
        return true;
      }

      // Get all permissions including inherited ones
      const allPermissions = this.getAllPermissions(userRole);

      // Check for exact match
      const exactMatch = allPermissions.find(p =>
        (p.resource === resource || p.resource === '*') &&
        (p.action === action || p.action === '*')
      );

      if (!exactMatch) {
        return false;
      }

      // Check conditions if present
      if (exactMatch.conditions && conditions) {
        return this.checkConditions(exactMatch.conditions, conditions, user);
      }

      return true;
    } catch (error) {
      logger.error('Local permission check failed:', { component: 'RBACManager' }, error);
      return null;
    }
  }

  /**
   * Check guest permissions for public resources
   */
  private checkGuestPermission(resource: string, action: string): boolean {
    const guestRole = ROLES.GUEST;
    return guestRole.permissions.some(p =>
      p.resource === resource && p.action === action
    );
  }

  /**
   * Get all permissions for a role including inherited ones
   */
  private getAllPermissions(role: Role): Permission[] {
    const permissions = [...role.permissions];

    if (role.inherits) {
      for (const inheritedRoleId of role.inherits) {
        const inheritedRole = ROLES[inheritedRoleId.toUpperCase()];
        if (inheritedRole) {
          permissions.push(...this.getAllPermissions(inheritedRole));
        }
      }
    }

    return permissions;
  }

  /**
   * Check permission conditions
   */
  private checkConditions(
    permissionConditions: Record<string, any>,
    requestConditions: Record<string, any>,
    user: User
  ): boolean {
    for (const [key, value] of Object.entries(permissionConditions)) {
      switch (key) {
        case 'owner':
          if (value && requestConditions.userId !== user.id) {
            return false;
          }
          break;
        case 'expertise_area':
          if (value && !this.hasExpertiseInArea(user, requestConditions.area)) {
            return false;
          }
          break;
        case 'verification_level':
          if (user.verification_status !== value) {
            return false;
          }
          break;
        default:
          // Custom condition check
          if (requestConditions[key] !== value) {
            return false;
          }
      }
    }
    return true;
  }

  /**
   * Check if user has expertise in specific area
   */
  private hasExpertiseInArea(user: User, area: string): boolean {
    if (!user.expertise) return false;

    const expertiseAreas = Array.isArray(user.expertise)
      ? user.expertise
      : user.expertise.split(',').map((s: string) => s.trim());

    return expertiseAreas.includes(area);
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * Get user role information
   */
  getUserRole(user: User): Role | null {
    return ROLES[user.role.toUpperCase()] || null;
  }

  /**
   * Check if user has minimum role level
   */
  hasMinimumRole(user: User | null, minimumRole: string): boolean {
    if (!user) return false;

    const userRole = this.getUserRole(user);
    const minRole = ROLES[minimumRole.toUpperCase()];

    if (!userRole || !minRole) return false;

    return userRole.level >= minRole.level;
  }

  /**
   * Get available actions for user on resource
   */
  async getAvailableActions(user: User | null, resource: string): Promise<string[]> {
    if (!user) {
      const guestRole = ROLES.GUEST;
      return guestRole.permissions
        .filter(p => p.resource === resource)
        .map(p => p.action);
    }

    try {
      // For now, return local permissions since the backend service doesn't have this method
      // In a full implementation, you would call the backend here
      const permissions = this.getLocalResourcePermissions(user, resource);
      return permissions;
    } catch (error) {
      logger.error('Failed to get available actions:', { component: 'RBACManager' }, error);

      // Fallback to local check
      const userRole = this.getUserRole(user);
      if (userRole) {
        const allPermissions = this.getAllPermissions(userRole);
        return allPermissions
          .filter(p => p.resource === resource || p.resource === '*')
          .map(p => p.action);
      }

      return [];
    }
  }

  // ============================================================================
  // Caching
  // ============================================================================

  private getCacheKey(
    userId: string,
    resource: string,
    action: string,
    conditions?: Record<string, any>
  ): string {
    const conditionsStr = conditions ? JSON.stringify(conditions) : '';
    return `${userId}:${resource}:${action}:${conditionsStr}`;
  }

  private getFromCache(key: string): boolean | null {
    this.cleanExpiredCache();

    const cached = this.permissionCache.get(key);
    return cached !== undefined ? cached : null;
  }

  private setCache(key: string, value: boolean): void {
    this.permissionCache.set(key, value);

    // Auto-expire cache entries
    setTimeout(() => {
      this.permissionCache.delete(key);
    }, this.cacheTimeout);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    if (now - this.lastCacheClean > this.cacheTimeout) {
      this.permissionCache.clear();
      this.lastCacheClean = now;
    }
  }

  /**
   * Get local resource permissions for a user
   */
  private getLocalResourcePermissions(user: User, resource: string): string[] {
    const userRole = this.getUserRole(user);
    if (!userRole) return [];

    const allPermissions = this.getAllPermissions(userRole);
    return allPermissions
      .filter(p => p.resource === resource || p.resource === '*')
      .map(p => p.action);
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.lastCacheClean = Date.now();
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }
}

// Export singleton instance
export const rbacManager = new RBACManager();

// ============================================================================
// React Hooks for RBAC
// ============================================================================

import { useState, useEffect } from 'react';

import { useAuth } from '@/core/auth';

/**
 * Hook to check if user has permission
 */
export function usePermission(
  resource: string,
  action: string,
  conditions?: Record<string, any>
) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await rbacManager.hasPermission(user, resource, action, conditions);
        if (mounted) {
          setHasPermission(result);
        }
      } catch (error) {
        if (mounted) {
          setHasPermission(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkPermission();

    return () => {
      mounted = false;
    };
  }, [user, resource, action, conditions]);

  return { hasPermission, loading };
}

/**
 * Hook to check multiple permissions
 */
export function usePermissions(
  permissions: Array<{ resource: string; action: string; conditions?: Record<string, any> }>
) {
  const { user } = useAuth();
  const [results, setResults] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const checkPermissions = async () => {
      try {
        setLoading(true);
        const results = await rbacManager.hasPermissions(user, permissions);
        if (mounted) {
          setResults(results);
        }
      } catch (error) {
        if (mounted) {
          setResults(permissions.map(() => false));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkPermissions();

    return () => {
      mounted = false;
    };
  }, [user, permissions]);

  return { results, loading };
}

/**
 * Hook to check if user has minimum role
 */
export function useMinimumRole(minimumRole: string) {
  const { user } = useAuth();
  return rbacManager.hasMinimumRole(user, minimumRole);
}
