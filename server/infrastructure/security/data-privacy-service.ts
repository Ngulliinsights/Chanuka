import { z } from 'zod';
import { logger  } from '@shared/core/src/index.js';
import { securityAuditService } from '@server/features/security/security-audit-service.ts';

/**
 * Data Privacy Service
 * Handles data sanitization, access controls, and privacy compliance for analytics
 */

export interface UserData {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  preferences?: any;
  [key: string]: any;
}

export interface SanitizedUserData {
  id: string;
  hashedId?: string;
  role?: string;
  generalLocation?: string;
  activityLevel?: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
}

export interface DataAggregationOptions {
  anonymize: boolean;
  minGroupSize: number;
  excludeFields: string[];
  timeWindow?: string;
}

export class DataPrivacyService {
  private static instance: DataPrivacyService;
  private readonly MIN_AGGREGATION_SIZE = 5; // Minimum group size for k-anonymity
  private readonly SENSITIVE_FIELDS = [
    'email',
    'phone',
    'address',
    'ip_address',
    'user_agent',
    'session_id',
    'device_id',
    'location_precise'
  ];

  private constructor() {}

  public static getInstance(): DataPrivacyService {
    if (!DataPrivacyService.instance) {
      DataPrivacyService.instance = new DataPrivacyService();
    }
    return DataPrivacyService.instance;
  }

  /**
   * Sanitize user data for analytics while preserving utility
   */
  public sanitizeUserData(data: UserData): SanitizedUserData {
    try {
      const sanitized: SanitizedUserData = {
        id: this.hashUserId(data.id)
      };

      // Include non-sensitive fields
      if (data.role) {
        sanitized.role = data.role;
      }

      // Generalize location data if present
      if (data.location) {
        sanitized.generalLocation = this.generalizeLocation(data.location);
      }

      // Calculate activity level without exposing specific metrics
      if (data.lastActive) {
        sanitized.activityLevel = this.calculateActivityLevel(data.lastActive);
      }

      // Include aggregated preferences without personal details
      if (data.preferences) {
        sanitized.preferences = this.sanitizePreferences(data.preferences);
      }

      logger.debug('User data sanitized for analytics', {
        component: 'data-privacy',
        originalFields: Object.keys(data).length,
        sanitizedFields: Object.keys(sanitized).length
      });

      return sanitized;
    } catch (error) {
      logger.error('Error sanitizing user data', {
        component: 'data-privacy',
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return minimal safe data on error
      return {
        id: this.hashUserId(data.id),
        role: data.role || 'unknown'
      };
    }
  }

  /**
   * Check if user has access to specific data types
   */
  public checkDataAccess(user_id: string, dataType: string, requestContext?: any): AccessResult { try {
      // Define access rules based on data type and user context
      const accessRules = this.getAccessRules(dataType);
      
      // Check if user meets access requirements
      const user_role = requestContext?.user?.role || 'citizen';
      const isDataOwner = requestContext?.targetUserId === user_id;
      
      // Apply access rules
      if (accessRules.requiresOwnership && !isDataOwner) {
        return {
          allowed: false,
          reason: 'Data access requires ownership',
          restrictions: ['owner_only']
         };
      }

      if (accessRules.minimumRole && !this.hasMinimumRole(user_role, accessRules.minimumRole)) {
        return {
          allowed: false,
          reason: `Insufficient role. Required: ${accessRules.minimumRole}`,
          restrictions: ['role_insufficient']
        };
      }

      if (accessRules.requiresConsent && !this.hasUserConsent(user_id, dataType)) {
        return {
          allowed: false,
          reason: 'User consent required for this data type',
          restrictions: ['consent_required']
        };
      }

      // Access granted with potential restrictions
      const restrictions: string[] = [];
      if (accessRules.anonymizeRequired) {
        restrictions.push('anonymize_required');
      }
      if (accessRules.aggregateOnly) {
        restrictions.push('aggregate_only');
      }

      return {
        allowed: true,
        restrictions: restrictions.length > 0 ? restrictions : undefined
      };
    } catch (error) { logger.error('Error checking data access', {
        component: 'data-privacy',
        user_id,
        dataType,
        error: error instanceof Error ? error.message : String(error)
       });

      // Deny access on error for security
      return {
        allowed: false,
        reason: 'Access check failed'
      };
    }
  }

  /**
   * Audit data access for compliance
   */
  public async auditDataAccess(
    user_id: string,
    action: string,
    resource: string,
    metadata?: any
  ): Promise<void> { try {
      await securityAuditService.logDataAccess(
        user_id,
        action,
        resource,
        {
          timestamp: new Date().toISOString(),
          dataType: this.extractDataType(resource),
          accessLevel: this.determineAccessLevel(action),
          ...metadata
         }
      );

      logger.debug('Data access audited', { component: 'data-privacy',
        user_id,
        action,
        resource
       });
    } catch (error) { logger.error('Error auditing data access', {
        component: 'data-privacy',
        user_id,
        action,
        resource,
        error: error instanceof Error ? error.message : String(error)
       });
    }
  }

  /**
   * Create privacy-compliant data aggregation
   */
  public aggregateDataPrivately<T>(
    data: T[],
    groupByField: keyof T,
    options: DataAggregationOptions
  ): any[] {
    try {
      // Group data by the specified field
      const groups = this.groupBy(data, groupByField);
      
      // Filter out groups that are too small (k-anonymity)
      const minSize = Math.max(options.minGroupSize, this.MIN_AGGREGATION_SIZE);
      const validGroups = Object.entries(groups).filter(([_, items]) => 
        (items as T[]).length >= minSize
      );

      // Aggregate each valid group
      const aggregatedResults = validGroups.map(([groupKey, items]) => {
        const groupItems = items as T[];
        
        let aggregated: any = {
          groupKey,
          count: groupItems.length
        };

        // Add aggregated metrics while excluding sensitive fields
        if (options.anonymize) {
          aggregated = this.anonymizeAggregation(aggregated, groupItems, options.excludeFields);
        } else {
          aggregated.items = groupItems.map(item => 
            this.removeSensitiveFields(item, options.excludeFields)
          );
        }

        return aggregated;
      });

      logger.debug('Data aggregated with privacy compliance', {
        component: 'data-privacy',
        originalGroups: Object.keys(groups).length,
        validGroups: validGroups.length,
        totalItems: data.length
      });

      return aggregatedResults;
    } catch (error) {
      logger.error('Error in privacy-compliant aggregation', {
        component: 'data-privacy',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Hash user ID for analytics while maintaining consistency
   */
  private hashUserId(user_id: string): string { // Use a consistent hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < user_id.length; i++) {
      const char = user_id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
     }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generalize location data to protect privacy
   */
  private generalizeLocation(location: string): string {
    // Extract general region/state/country without specific address
    const parts = location.split(',').map(part => part.trim());
    
    // Return only the last 1-2 parts (typically state/country)
    if (parts.length >= 2) {
      return parts.slice(-2).join(', ');
    }
    
    return parts[0] || 'Unknown';
  }

  /**
   * Calculate activity level without exposing specific timestamps
   */
  private calculateActivityLevel(lastActive: Date | string): 'low' | 'medium' | 'high' {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const daysSinceActive = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActive <= 1) return 'high';
    if (daysSinceActive <= 7) return 'medium';
    return 'low';
  }

  /**
   * Sanitize user preferences for analytics
   */
  private sanitizePreferences(preferences: any): any {
    if (!preferences || typeof preferences !== 'object') {
      return {};
    }

    const sanitized: any = {};
    
    // Include only non-sensitive preference categories
    const allowedPreferences = [
      'theme',
      'language',
      'notifications_enabled',
      'public_profile',
      'expertise_areas'
    ];

    allowedPreferences.forEach(key => {
      if (preferences[key] !== undefined) {
        sanitized[key] = preferences[key];
      }
    });

    return sanitized;
  }

  /**
   * Get access rules for different data types
   */
  private getAccessRules(dataType: string): any {
    const rules: Record<string, any> = {
      'user_profile': {
        requiresOwnership: true,
        minimumRole: 'citizen',
        requiresConsent: false,
        anonymizeRequired: false,
        aggregateOnly: false
      },
      'engagement_analytics': {
        requiresOwnership: false,
        minimumRole: 'citizen',
        requiresConsent: false,
        anonymizeRequired: true,
        aggregateOnly: true
      },
      'personal_data': {
        requiresOwnership: true,
        minimumRole: 'citizen',
        requiresConsent: true,
        anonymizeRequired: false,
        aggregateOnly: false
      },
      'admin_analytics': {
        requiresOwnership: false,
        minimumRole: 'admin',
        requiresConsent: false,
        anonymizeRequired: false,
        aggregateOnly: false
      }
    };

    return rules[dataType] || {
      requiresOwnership: true,
      minimumRole: 'admin',
      requiresConsent: true,
      anonymizeRequired: true,
      aggregateOnly: true
    };
  }

  /**
   * Check if user has minimum required role
   */
  private hasMinimumRole(user_role: string, requiredRole: string): boolean {
    const roleHierarchy = ['citizen', 'expert', 'journalist', 'advocate', 'admin'];
    const userLevel = roleHierarchy.indexOf(user_role);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has given consent for data type
   */
  private hasUserConsent(user_id: string, dataType: string): boolean {
    // In a real implementation, this would check a consent database
    // For now, assume consent is given for non-sensitive analytics
    const consentRequiredTypes = ['personal_data', 'location_tracking', 'behavioral_analytics'];
    return !consentRequiredTypes.includes(dataType);
  }

  /**
   * Group array by field
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Anonymize aggregation results
   */
  private anonymizeAggregation<T>(aggregated: any, items: T[], excludeFields: string[]): any {
    // Add statistical measures without exposing individual records
    const numericFields = this.getNumericFields(items[0]);
    
    numericFields.forEach(field => {
      if (!excludeFields.includes(field)) {
        const values = items.map(item => (item as any)[field]).filter(v => typeof v === 'number');
        if (values.length > 0) {
          aggregated[`${field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
          aggregated[`${field}_min`] = Math.min(...values);
          aggregated[`${field}_max`] = Math.max(...values);
        }
      }
    });

    return aggregated;
  }

  /**
   * Remove sensitive fields from data
   */
  private removeSensitiveFields<T>(item: T, additionalExcludes: string[] = []): Partial<T> {
    const result: any = {};
    const excludeFields = [...this.SENSITIVE_FIELDS, ...additionalExcludes];
    
    Object.entries(item as any).forEach(([key, value]) => {
      if (!excludeFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Get numeric fields from an object
   */
  private getNumericFields(item: any): string[] {
    if (!item) return [];
    
    return Object.entries(item)
      .filter(([_, value]) => typeof value === 'number')
      .map(([key, _]) => key);
  }

  /**
   * Extract data type from resource string
   */
  private extractDataType(resource: string): string {
    if (resource.includes('user')) return 'user_data';
    if (resource.includes('engagement')) return 'engagement_analytics';
    if (resource.includes('admin')) return 'admin_analytics';
    return 'general';
  }

  /**
   * Determine access level from action
   */
  private determineAccessLevel(action: string): string {
    if (action.includes('read') || action.includes('view')) return 'read';
    if (action.includes('update') || action.includes('modify')) return 'write';
    if (action.includes('delete')) return 'delete';
    if (action.includes('admin')) return 'admin';
    return 'unknown';
  }
}

// Export singleton instance
export const dataPrivacyService = DataPrivacyService.getInstance();
