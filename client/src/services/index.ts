/**
 * Services Index
 * Exports all services and types that were previously in repositories
 */

// Export services
export { authService } from './AuthService';
export { userService } from './userService';
export { mockDataService } from './mockDataService';
export { api } from './api';

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
  liveStream: any[];
  currentErrorRate: number;
  activeAlerts: any[];
}

// Mock error analytics repository
export const errorAnalyticsRepository = {
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    return {
      totalErrors: 1250,
      errorRate: 2.3,
      criticalErrors: 15,
      resolvedErrors: 1180,
      averageResolutionTime: 45,
      uptime: 99.7
    };
  },

  async getTrendData(): Promise<TrendDataPoint[]> {
    return [
      { timestamp: '2024-01-01', errorCount: 45, errorRate: 2.1, severity: 'medium' },
      { timestamp: '2024-01-02', errorCount: 52, errorRate: 2.4, severity: 'high' },
    ];
  },

  async getPatterns(): Promise<ErrorPattern[]> {
    return [
      { pattern: 'Authentication timeout', frequency: 125, impact: 'high', trend: 'increasing' },
      { pattern: 'Database connection error', frequency: 89, impact: 'critical', trend: 'stable' },
    ];
  },

  async getRecoveryAnalytics(): Promise<RecoveryAnalytics> {
    return {
      averageRecoveryTime: 45,
      successRate: 94.5,
      commonRecoveryActions: ['Restart service', 'Clear cache', 'Rollback deployment'],
      failureReasons: ['Network timeout', 'Resource exhaustion', 'Configuration error']
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
      activeAlerts: []
    };
  }
};

// Mock community repository
export const communityRepository = {
  async getDiscussions() {
    return [];
  },
  async createDiscussion(data: any) {
    return { id: Date.now().toString(), ...data };
  },
  async updateDiscussion(id: string, data: any) {
    return { id, ...data };
  },
  async deleteDiscussion() {
    return true;
  }
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
  }
};