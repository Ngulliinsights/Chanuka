export type PermissionAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'moderate'
  | 'create'
  | 'update';
export type PermissionEffect = 'allow' | 'deny';

export interface Permission {
  resource: string;
  action: string;
  effect?: PermissionEffect;
  conditions?: PermissionCondition[];
  priority?: number;
}

export interface PermissionCondition {
  type: 'ownership' | 'time' | 'attribute' | 'custom';
  evaluate: (context: PermissionContext) => boolean;
}

export interface Role {
  id: string;
  name: string;
  level: number;
  permissions: Permission[];
  inherits?: string[];
  metadata?: Record<string, unknown>;
}

export interface PermissionContext {
  userId: string;
  userRole: UserRole;
  resource: string;
  resourceId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface AuditLog {
  timestamp: number;
  userId: string;
  userRole: UserRole;
  resource: string;
  action: string;
  granted: boolean;
  reason?: string;
}

// ============================================================================
// Built-in Roles Configuration
// ============================================================================

const ROLE_DEFINITIONS: Record<string, Role> = {
  GUEST: {
    id: 'guest',
    name: 'Guest',
    level: 0,
    permissions: [
      { resource: 'bills', action: 'read', effect: 'allow' },
      { resource: 'public_comments', action: 'read', effect: 'allow' },
      { resource: 'public_analysis', action: 'read', effect: 'allow' },
    ],
  },
  CITIZEN: {
    id: 'citizen',
    name: 'Citizen',
    level: 1,
    inherits: ['guest'],
    permissions: [
      { resource: 'comments', action: 'read', effect: 'allow' },
      { resource: 'comments', action: 'write', effect: 'allow' },
      {
        resource: 'comments',
        action: 'delete',
        effect: 'allow',
        conditions: [
          {
            type: 'ownership',
            evaluate: ctx => ctx.metadata?.ownerId === ctx.userId,
          },
        ],
      },
      { resource: 'profile', action: 'read', effect: 'allow' },
      {
        resource: 'profile',
        action: 'update',
        effect: 'allow',
        conditions: [
          {
            type: 'ownership',
            evaluate: ctx => ctx.resourceId === ctx.userId,
          },
        ],
      },
    ],
  },
  EXPERT: {
    id: 'expert',
    name: 'Expert',
    level: 2,
    inherits: ['citizen'],
    permissions: [
      { resource: 'bills', action: 'write', effect: 'allow' },
      { resource: 'bills', action: 'update', effect: 'allow' },
      { resource: 'comments', action: 'moderate', effect: 'allow' },
      { resource: 'analysis', action: 'write', effect: 'allow' },
      { resource: 'analysis', action: 'create', effect: 'allow' },
      { resource: 'verification', action: 'write', effect: 'allow' },
    ],
  },
  ADMIN: {
    id: 'admin',
    name: 'Administrator',
    level: 3,
    inherits: ['expert'],
    permissions: [
      { resource: '*', action: '*', effect: 'allow', priority: 100 },
      { resource: 'users', action: 'admin', effect: 'allow' },
      { resource: 'system', action: 'admin', effect: 'allow' },
      { resource: 'analytics', action: '*', effect: 'allow' },
    ],
  },
};

// ============================================================================
// RBAC Manager Class
// ============================================================================

class RBACManager {
  private roles = new Map<string, Role>();
  private effectivePermissionsCache = new Map<string, Permission[]>();
  private permissionCheckCache = new Map<string, PermissionCheckResult>();
  private auditLogs: AuditLog[] = [];
  private enableAudit = false;
  private enableCache = true;
  private maxAuditLogs = 1000;

  constructor(config?: { enableAudit?: boolean; enableCache?: boolean; maxAuditLogs?: number }) {
    this.enableAudit = config?.enableAudit ?? false;
    this.enableCache = config?.enableCache ?? true;
    this.maxAuditLogs = config?.maxAuditLogs ?? 1000;

    // Initialize with built-in roles
    this.loadRoles(ROLE_DEFINITIONS);
  }

  /**
   * Load roles into the system
   */
  private loadRoles(roleDefinitions: Record<string, Role>): void {
    for (const roleKey of Object.keys(roleDefinitions)) {
      const role = roleDefinitions[roleKey];
      this.roles.set(role.id, role);
    }
    this.validateRoleInheritance();
  }

  /**
   * Validate role inheritance to prevent cycles
   */
  private validateRoleInheritance(): void {
    for (const [roleId, role] of this.roles.entries()) {
      if (role.inherits) {
        this.detectInheritanceCycle(roleId, new Set());
      }
    }
  }

  /**
   * Detect circular inheritance
   */
  private detectInheritanceCycle(roleId: string, visited: Set<string>): void {
    if (visited.has(roleId)) {
      throw new Error(`Circular inheritance detected for role: ${roleId}`);
    }

    visited.add(roleId);
    const role = this.roles.get(roleId);

    if (role?.inherits) {
      for (const inheritedRoleId of role.inherits) {
        this.detectInheritanceCycle(inheritedRoleId, new Set(visited));
      }
    }
  }

  /**
   * Get effective permissions for a role (including inherited)
   */
  getEffectivePermissions(roleId: string): Permission[] {
    // Check cache first
    if (this.enableCache && this.effectivePermissionsCache.has(roleId)) {
      return this.effectivePermissionsCache.get(roleId)!;
    }

    const role = this.roles.get(roleId);
    if (!role) return [];

    const permissionsMap = new Map<string, Permission>();

    // Collect permissions with priority handling
    const collectPermissions = (currentRoleId: string, depth = 0) => {
      const currentRole = this.roles.get(currentRoleId);
      if (!currentRole) return;

      // Add inherited permissions first (lower priority)
      if (currentRole.inherits) {
        for (const inheritedRoleId of currentRole.inherits) {
          collectPermissions(inheritedRoleId, depth + 1);
        }
      }

      // Add current role permissions (higher priority)
      for (const permission of currentRole.permissions) {
        const key = `${permission.resource}:${permission.action}`;
        const existing = permissionsMap.get(key);

        // Replace if new permission has higher priority or no existing permission
        if (!existing || (permission.priority ?? 0) > (existing.priority ?? 0)) {
          permissionsMap.set(key, { ...permission, priority: permission.priority ?? depth });
        }
      }
    };

    collectPermissions(roleId);

    const permissions = Array.from(permissionsMap.values());

    // Cache the result
    if (this.enableCache) {
      this.effectivePermissionsCache.set(roleId, permissions);
    }

    return permissions;
  }

  /**
   * Check if user has permission with full context evaluation
   */
  checkPermission(context: PermissionContext): PermissionCheckResult {
    const cacheKey = this.getCacheKey(context);

    // Check cache (only for requests without conditions)
    if (this.enableCache && !context.metadata && this.permissionCheckCache.has(cacheKey)) {
      return this.permissionCheckCache.get(cacheKey)!;
    }

    const permissions = this.getEffectivePermissions(context.userRole);
    let result: PermissionCheckResult = { granted: false, reason: 'No matching permission' };

    // Sort permissions by priority (higher first)
    const sortedPermissions = [...permissions].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    for (const permission of sortedPermissions) {
      if (this.matchesPermission(permission, context)) {
        // Evaluate conditions if present
        if (permission.conditions && permission.conditions.length > 0) {
          const conditionsMet = permission.conditions.every(condition =>
            condition.evaluate(context)
          );

          if (!conditionsMet) {
            continue; // Try next permission
          }
        }

        // Check effect
        const granted = permission.effect !== 'deny';
        result = {
          granted,
          reason: granted ? 'Permission granted' : 'Explicitly denied',
          matchedPermission: permission,
        };

        // If explicitly denied, stop checking
        if (!granted) {
          break;
        }

        // If granted, we found a match
        if (granted) {
          break;
        }
      }
    }

    // Cache the result (only for requests without conditions)
    if (this.enableCache && !context.metadata) {
      this.permissionCheckCache.set(cacheKey, result);
    }

    // Audit log
    if (this.enableAudit) {
      this.addAuditLog({
        timestamp: Date.now(),
        userId: context.userId,
        userRole: context.userRole,
        resource: context.resource,
        action: context.action,
        granted: result.granted,
        reason: result.reason,
      });
    }

    return result;
  }

  /**
   * Check if permission matches the context (with wildcard support)
   */
  private matchesPermission(permission: Permission, context: PermissionContext): boolean {
    const resourceMatch = this.matchesWildcard(permission.resource, context.resource);
    const actionMatch = this.matchesWildcard(permission.action, context.action);

    return resourceMatch && actionMatch;
  }

  /**
   * Wildcard matching for resources and actions
   */
  private matchesWildcard(pattern: string, value: string): boolean {
    if (pattern === '*') return true;
    if (pattern === value) return true;

    // Support for prefix matching (e.g., "bills:*" matches "bills:123")
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return value.startsWith(prefix);
    }

    return false;
  }

  /**
   * Generate cache key for permission check
   */
  private getCacheKey(context: PermissionContext): string {
    return `${context.userRole}:${context.resource}:${context.action}`;
  }

  /**
   * Simple permission check (backward compatibility)
   */
  hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    const result = this.checkPermission({
      userId: 'unknown',
      userRole,
      resource,
      action,
    });
    return result.granted;
  }

  /**
   * Check if user can access a specific route
   */
  canAccessRoute(userRole: UserRole, route: string): boolean {
    // Admin routes
    if (route.startsWith('/admin')) {
      return this.hasPermission(userRole, 'system', 'admin');
    }

    // Expert verification routes
    if (route.startsWith('/expert-verification')) {
      const role = this.roles.get(userRole);
      return role ? role.level >= 2 : false;
    }

    // Analytics routes
    if (route.startsWith('/analytics')) {
      return this.hasPermission(userRole, 'analytics', 'read');
    }

    // Bill editing routes
    if (route.includes('/bills/') && route.includes('/edit')) {
      return this.hasPermission(userRole, 'bills', 'write');
    }

    // Default: allow read access
    return true;
  }

  /**
   * Get role level
   */
  getRoleLevel(userRole: UserRole): number {
    const role = this.roles.get(userRole);
    return role?.level ?? -1;
  }

  /**
   * Check if user role meets minimum level requirement
   */
  hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
    const userLevel = this.getRoleLevel(userRole);
    const requiredLevel = this.getRoleLevel(requiredRole);
    return userLevel >= requiredLevel;
  }

  /**
   * Filter data based on visibility and user permissions
   */
  filterByPermissions<T extends { visibility?: 'public' | 'expert' | 'admin' }>(
    items: T[],
    userRole: UserRole
  ): T[] {
    const userLevel = this.getRoleLevel(userRole);

    return items.filter(item => {
      if (!item.visibility || item.visibility === 'public') return true;

      const requiredLevel = this.getRoleLevel(item.visibility as UserRole);
      return userLevel >= requiredLevel;
    });
  }

  /**
   * Register a new role dynamically
   */
  registerRole(role: Role): void {
    this.roles.set(role.id, role);
    this.clearCache();
    this.validateRoleInheritance();
  }

  /**
   * Add permission to existing role
   */
  addPermissionToRole(roleId: string, permission: Permission): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    role.permissions.push(permission);
    this.clearCache();
    return true;
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(roleId: string, resource: string, action: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    const initialLength = role.permissions.length;
    role.permissions = role.permissions.filter(
      p => !(p.resource === resource && p.action === action)
    );

    if (role.permissions.length < initialLength) {
      this.clearCache();
      return true;
    }

    return false;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.effectivePermissionsCache.clear();
    this.permissionCheckCache.clear();
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Add audit log entry
   */
  private addAuditLog(log: AuditLog): void {
    this.auditLogs.push(log);

    // Trim logs if exceeds max
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filter?: {
    userId?: string;
    resource?: string;
    startTime?: number;
    endTime?: number;
  }): AuditLog[] {
    if (!filter) return [...this.auditLogs];

    return this.auditLogs.filter(log => {
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.resource && log.resource !== filter.resource) return false;
      if (filter.startTime && log.timestamp < filter.startTime) return false;
      if (filter.endTime && log.timestamp > filter.endTime) return false;
      return true;
    });
  }

  /**
   * Clear audit logs
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  /**
   * Export permissions matrix for debugging
   */
  exportPermissionsMatrix(): Record<string, Permission[]> {
    const matrix: Record<string, Permission[]> = {};

    for (const [roleId] of this.roles.entries()) {
      matrix[roleId] = this.getEffectivePermissions(roleId);
    }

    return matrix;
  }
}

// ============================================================================
// Singleton Instance and Exports
// ============================================================================

export const rbacManager = new RBACManager({
  enableAudit: false,
  enableCache: true,
});

// Convenience functions
export function hasPermission(userRole: UserRole, resource: string, action: string): boolean {
  return rbacManager.hasPermission(userRole, resource, action);
}

export function checkPermission(context: PermissionContext): PermissionCheckResult {
  return rbacManager.checkPermission(context);
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  return rbacManager.canAccessRoute(userRole, route);
}

export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return rbacManager.hasRoleLevel(userRole, requiredRole);
}

export function filterByPermissions<T extends { visibility?: 'public' | 'expert' | 'admin' }>(
  items: T[],
  userRole: UserRole
): T[] {
  return rbacManager.filterByPermissions(items, userRole);
}

export function getEffectivePermissions(roleId: string): Permission[] {
  return rbacManager.getEffectivePermissions(roleId);
}

// Utility functions for common conditions
export const PermissionConditions = {
  ownership: (ownerIdKey = 'ownerId'): PermissionCondition => ({
    type: 'ownership',
    evaluate: ctx => ctx.metadata?.[ownerIdKey] === ctx.userId,
  }),

  timeWindow: (startTime: number, endTime: number): PermissionCondition => ({
    type: 'time',
    evaluate: ctx => {
      const now = ctx.timestamp ?? Date.now();
      return now >= startTime && now <= endTime;
    },
  }),

  attribute: (attributeKey: string, expectedValue: unknown): PermissionCondition => ({
    type: 'attribute',
    evaluate: ctx => ctx.metadata?.[attributeKey] === expectedValue,
  }),

  custom: (evaluator: (ctx: PermissionContext) => boolean): PermissionCondition => ({
    type: 'custom',
    evaluate: evaluator,
  }),
};

// Export the manager for advanced usage
export { RBACManager, ROLE_DEFINITIONS };

// Export utilities object
export const rbacUtils = {
  hasPermission,
  checkPermission,
  canAccessRoute,
  hasRoleLevel,
  filterByPermissions,
  getEffectivePermissions,
  manager: rbacManager,
  conditions: PermissionConditions,
};
