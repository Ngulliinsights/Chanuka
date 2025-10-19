import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../services/analytics-api';
import { useToast } from '@/hooks/use-toast';
import type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  AnalyticsResponse,
  UserActivity
} from '../types';

/**
 * Hook for analytics dashboard data
 */
export function useAnalyticsDashboard(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', filters],
    queryFn: () => analyticsApi.getDashboard(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for live data
  });
}

/**
 * Hook for analytics summary
 */
export function useAnalyticsSummary(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () => analyticsApi.getSummary(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for individual bill analytics
 */
export function useBillAnalytics(billId: string | undefined, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'bill', billId, filters],
    queryFn: () => analyticsApi.getBillAnalytics(billId!, filters),
    enabled: !!billId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for bill engagement reports
 */
export function useEngagementReport(billId: string | undefined, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'engagement', billId, filters],
    queryFn: () => analyticsApi.getEngagementReport(billId!, filters),
    enabled: !!billId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for conflict analysis reports
 */
export function useConflictReport(billId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'conflicts', billId],
    queryFn: () => analyticsApi.getConflictReport(billId!),
    enabled: !!billId,
    staleTime: 30 * 60 * 1000, // 30 minutes - conflicts don't change often
  });
}

/**
 * Hook for top bills by engagement
 */
export function useTopBills(limit = 10, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'top-bills', limit, filters],
    queryFn: () => analyticsApi.getTopBills(limit, filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for user activity analytics
 */
export function useUserActivity(userId?: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'user-activity', userId, filters],
    queryFn: () => analyticsApi.getUserActivity(userId, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for analytics alerts
 */
export function useAnalyticsAlerts(acknowledged = false) {
  const queryClient = useQueryClient();

  const alerts = useQuery({
    queryKey: ['analytics', 'alerts', acknowledged],
    queryFn: () => analyticsApi.getAlerts(acknowledged),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: acknowledged ? false : 60 * 1000, // Poll unacknowledged alerts every minute
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => analyticsApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
    },
    onError: (error: Error) => {
      console.error('Failed to acknowledge alert:', error);
    },
  });

  return {
    alerts,
    acknowledgeAlert,
  };
}

/**
 * Hook for trending topics
 */
export function useTrendingTopics(limit = 20) {
  return useQuery({
    queryKey: ['analytics', 'trends', limit],
    queryFn: () => analyticsApi.getTrendingTopics(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for stakeholder analysis
 */
export function useStakeholderAnalysis(billId?: string) {
  return useQuery({
    queryKey: ['analytics', 'stakeholders', billId],
    queryFn: () => analyticsApi.getStakeholderAnalysis(billId),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for real-time analytics metrics
 */
export function useRealtimeAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => analyticsApi.getRealtimeMetrics(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook for exporting analytics data
 */
export function useAnalyticsExport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ filters, format }: { filters?: AnalyticsFilters; format?: 'csv' | 'json' }) =>
      analyticsApi.exportAnalytics(filters, format),
    onSuccess: (data, { format }) => {
      // Create download link
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Analytics data exported as ${format?.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for analytics filters management
 */
export function useAnalyticsFilters(initialFilters?: AnalyticsFilters) {
  const queryClient = useQueryClient();

  const updateFilters = (newFilters: Partial<AnalyticsFilters>) => {
    // Invalidate all analytics queries to refetch with new filters
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const clearFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  return {
    updateFilters,
    clearFilters,
  };
}




































