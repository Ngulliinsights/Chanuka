import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';
import { useToast } from '@/hooks/use-toast';
import type {
  AnalyticsFilters
} from '@client/types';

/**
 * Hook for analytics dashboard data
 */
export function useAnalyticsDashboard(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', filters],
    queryFn: () => analyticsService.getDashboard(filters),
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
    queryFn: () => analyticsService.getSummary(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for individual bill analytics
 */
export function useBillAnalytics(bill_id: string | undefined, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'bill', bill_id, filters],
    queryFn: () => analyticsService.getBillAnalytics(bill_id!, filters),
    enabled: !!bill_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for bill engagement reports
 */
export function useEngagementReport(bill_id: string | undefined, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'engagement', bill_id, filters],
    queryFn: () => analyticsService.getEngagementReport(bill_id!, filters),
    enabled: !!bill_id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for conflict analysis reports
 */
export function useConflictReport(bill_id: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'conflicts', bill_id],
    queryFn: () => analyticsService.getConflictReport(bill_id!),
    enabled: !!bill_id,
    staleTime: 30 * 60 * 1000, // 30 minutes - conflicts don't change often
  });
}

/**
 * Hook for top bills by engagement
 */
export function useTopBills(limit = 10, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'top-bills', limit, filters],
    queryFn: () => analyticsService.getTopBills(limit, filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for user activity analytics
 */
export function useUserActivity(user_id?: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'user-activity', user_id, filters],
    queryFn: () => analyticsService.getUserActivity(user_id, filters),
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
    queryFn: () => analyticsService.getAlerts(acknowledged),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: acknowledged ? false : 60 * 1000, // Poll unacknowledged alerts every minute
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => analyticsService.acknowledgeAlert(alertId),
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
    queryFn: () => analyticsService.getTrendingTopics(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for stakeholder analysis
 */
export function useStakeholderAnalysis(bill_id?: string) {
  return useQuery({
    queryKey: ['analytics', 'stakeholders', bill_id],
    queryFn: () => analyticsService.getStakeholderAnalysis(bill_id),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for real-time analytics metrics
 */
export function useRealtimeAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => analyticsService.getRealtimeMetrics(),
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
      analyticsService.exportAnalytics(filters, format),
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






































