/**
 * Services Index - Legacy Services & FSD Migration Exports
 *
 * ⚠️  MIGRATION IN PROGRESS ⚠️
 *
 * This directory contains legacy services that are being migrated to FSD structure.
 * Most services have been successfully integrated into their appropriate locations:
 *
 * - Analytics services → features/analytics/model/
 * - Monitoring services → features/monitoring/model/ & shared/infrastructure/monitoring/
 * - Core services → core/
 * - Feature services → features/[feature]/services/
 * - Shared services → shared/services/
 *
 * COMPLETED MIGRATIONS:
 * ✅ errorAnalyticsBridge → features/analytics/model/error-analytics-bridge.ts
 * ✅ privacyAnalyticsService → features/analytics/model/privacy-analytics.ts
 * ✅ performance-benchmarking → features/monitoring/model/performance-benchmarking.ts
 * ✅ render-tracker → features/monitoring/model/render-tracker.ts
 * ✅ enhanced-error-monitoring → shared/infrastructure/monitoring/error-monitor.ts
 * ✅ enhanced-performance-monitoring → shared/infrastructure/monitoring/performance-monitor.ts
 * ✅ enhanced-monitoring-integration → shared/infrastructure/monitoring/monitoring-integration.ts
 * ✅ dataRetentionService → shared/infrastructure/data/data-retention-service.ts
 * ✅ navigation → core/navigation/navigation-service.ts
 * ✅ userService → features/users/model/user-service.ts
 * ✅ PageRelationshipService → features/navigation/model/page-relationship-service.ts
 */

// ============================================================================
// FSD MIGRATION EXPORTS (Backward Compatibility)
// ============================================================================

// Re-export migrated services from their new FSD locations
export {
  dataRetentionService,
  retentionUtils,
} from '@client/infrastructure/analytics/data-retention-service';
export {
  navigationService,
  BrowserNavigationService,
  type NavigationService,
} from '@client/infrastructure/navigation/navigation-service';
export { userService } from '@client/features/users/model/user-service';
export { PageRelationshipService } from '@client/infrastructure/navigation/page-relationship-service';

// ============================================================================
// REMAINING LEGACY SERVICES (Kept for compatibility)
// ============================================================================

// Services that remain in this directory for legacy/compatibility reasons
export * from './auth-service-init';
export * from './mockUserData';
export * from './realistic-demo-data';

// Export types that were in repositories
export interface DashboardFilters {
  timeRange?: {
    start: number;
    end: number;
    preset: string;
  };
  severity?: string[];
  component?: string[];
  domain?: string[];
}

export interface OverviewMetrics {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  resolvedErrors: number;
  averageResolutionTime: number;
  uptime: number;
}

export interface TrendDataPoint {
  timestamp: string;
  errorCount: number;
  errorRate: number;
  severity: string;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  impact: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface RecoveryAnalytics {
  averageRecoveryTime: number;
  successRate: number;
  commonRecoveryActions: string[];
  failureReasons: string[];
}

export interface RealTimeMetrics {
  currentErrors: number;
  activeIncidents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
  liveStream: ErrorEntry[];
  currentErrorRate: number;
  activeAlerts: Alert[];
}

export interface ErrorEntry {
  timestamp: string;
  message: string;
  severity: string;
  component: string;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

// Mock error analytics repository
export const errorAnalyticsRepository = {
  async getOverviewMetrics(_filters?: DashboardFilters): Promise<OverviewMetrics> {
    return {
      totalErrors: 1250,
      errorRate: 2.3,
      criticalErrors: 15,
      resolvedErrors: 1180,
      averageResolutionTime: 45,
      uptime: 99.7,
    };
  },

  async getTrendData(_params?: {
    period: string;
    filters: DashboardFilters;
  }): Promise<TrendDataPoint[]> {
    return [
      { timestamp: '2024-01-01', errorCount: 45, errorRate: 2.1, severity: 'medium' },
      { timestamp: '2024-01-02', errorCount: 52, errorRate: 2.4, severity: 'high' },
    ];
  },

  async getPatterns(_filters?: DashboardFilters): Promise<ErrorPattern[]> {
    return [
      { pattern: 'Authentication timeout', frequency: 125, impact: 'high', trend: 'increasing' },
      { pattern: 'Database connection error', frequency: 89, impact: 'critical', trend: 'stable' },
    ];
  },

  async getRecoveryAnalytics(_filters?: DashboardFilters): Promise<RecoveryAnalytics> {
    return {
      averageRecoveryTime: 45,
      successRate: 94.5,
      commonRecoveryActions: ['Restart service', 'Clear cache', 'Rollback deployment'],
      failureReasons: ['Network timeout', 'Resource exhaustion', 'Configuration error'],
    };
  },

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return {
      currentErrors: 3,
      activeIncidents: 1,
      systemHealth: 'healthy',
      lastUpdated: new Date().toISOString(),
      liveStream: [],
      currentErrorRate: 0,
      activeAlerts: [],
    };
  },
};

// Mock community repository
export const communityRepository = {
  async getDiscussions() {
    return [];
  },
  async createDiscussion(data: Record<string, unknown>) {
    return { id: Date.now().toString(), ...data };
  },
  async updateDiscussion(id: string, data: Record<string, unknown>) {
    return { id, ...data };
  },
  async deleteDiscussion() {
    return true;
  },
};

// Mock bills repository
export const billsRepository = {
  async getBills() {
    return [];
  },
  async getBill() {
    // Return null if bill not found, let the cache/mock service handle it
    return null;
  },
  async searchBills() {
    return [];
  },
};
